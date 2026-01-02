"""
Hybrid Image Service - Envio de imagens de produtos + links para galeria via WhatsApp

Este serviço implementa:
- Envio de imagem do produto via Evolution API
- Envio de link para galeria completa
- Fallback para descrição textual se imagem falhar
- Cache de URLs de imagens para performance
"""

import structlog
from typing import Dict, Optional, Any
import time
import asyncio
import aiohttp

from .supabase_client import get_supabase_client

logger = structlog.get_logger(__name__)

# Cache global de URLs de imagens
_image_cache: Dict[str, Any] = {
    "data": {},  # product_type -> {image_url, product_page_url}
    "last_update": None,
    "ttl_seconds": 300  # 5 minutos
}


class HybridImageService:
    """
    Serviço de envio híbrido de imagens de produtos
    """
    
    def __init__(self):
        self.cache_ttl_seconds = 300  # 5 minutos
        self.timeout_seconds = 2
        
        # URLs base do Supabase Storage
        self.storage_base_url = "https://vtynmmtuvxreiwcxxlma.supabase.co/storage/v1/object/public"
        
        # Evolution API config (será obtido do ambiente)
        self.evolution_api_url = None
        self.evolution_api_key = None
        self._load_evolution_config()
    
    def _load_evolution_config(self):
        """Carrega configuração da Evolution API"""
        import os
        self.evolution_api_url = os.getenv("EVOLUTION_API_URL", "http://localhost:8080")
        self.evolution_api_key = os.getenv("EVOLUTION_API_KEY", "")
        self.evolution_instance = os.getenv("EVOLUTION_INSTANCE", "slim_quality")
    
    async def send_product_visual(
        self, 
        phone: str, 
        product_type: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Envia imagem do produto + link para galeria
        
        Args:
            phone: Número do telefone (formato: 5511999999999)
            product_type: Tipo do produto (solteiro, padrao, queen, king)
            context: Contexto adicional da conversa
            
        Returns:
            Resultado do envio (sucesso/falha + detalhes)
        """
        try:
            # Normalizar tipo do produto
            normalized_type = self._normalize_product_type(product_type)
            
            # Buscar URLs do produto
            product_urls = await self._get_product_urls(normalized_type)
            
            if not product_urls:
                logger.warning("URLs do produto não encontradas", product_type=normalized_type)
                return await self._send_text_fallback(phone, normalized_type)
            
            # Tentar enviar imagem primeiro
            image_result = await self._send_product_image(
                phone=phone,
                product_type=normalized_type,
                image_url=product_urls.get("image_url"),
                context=context
            )
            
            # Enviar link da galeria separadamente (sempre)
            gallery_result = await self._send_gallery_link(
                phone=phone,
                product_type=normalized_type,
                gallery_url=product_urls.get("product_page_url")
            )
            
            return {
                "success": image_result.get("success", False) or gallery_result.get("success", False),
                "product_type": normalized_type,
                "image_sent": image_result.get("success", False),
                "gallery_sent": gallery_result.get("success", False),
                "fallback_used": image_result.get("fallback_used", False),
                "details": {
                    "image_result": image_result,
                    "gallery_result": gallery_result
                }
            }
            
        except Exception as e:
            logger.error("Erro ao enviar visual do produto", 
                        phone=phone, product_type=product_type, error=str(e))
            
            # Fallback final - apenas texto
            return await self._send_text_fallback(phone, product_type)
    
    def _normalize_product_type(self, product_type: str) -> str:
        """
        Normaliza tipo do produto para padrões conhecidos
        
        Args:
            product_type: Tipo original
            
        Returns:
            Tipo normalizado
        """
        product_type = product_type.lower().strip()
        
        # Mapeamento de variações
        type_mapping = {
            "solteiro": "solteiro",
            "single": "solteiro",
            "padrao": "padrao",
            "padrão": "padrao", 
            "standard": "padrao",
            "casal": "padrao",
            "queen": "queen",
            "king": "king"
        }
        
        return type_mapping.get(product_type, product_type)
    
    async def _get_product_urls(self, product_type: str) -> Optional[Dict[str, str]]:
        """
        Busca URLs do produto (imagem + galeria) com cache
        
        Args:
            product_type: Tipo normalizado do produto
            
        Returns:
            Dict com image_url e product_page_url ou None
        """
        try:
            # Verificar cache primeiro
            if self._is_cache_valid() and product_type in _image_cache["data"]:
                logger.debug("Usando URLs do cache", product_type=product_type)
                return _image_cache["data"][product_type]
            
            # Cache expirado, buscar do banco
            logger.info("Buscando URLs do produto no banco", product_type=product_type)
            
            client = get_supabase_client()
            
            # Mapear tipo para largura (para buscar no banco)
            width_mapping = {
                "solteiro": 88,
                "padrao": 138,
                "queen": 158,
                "king": 193
            }
            
            width = width_mapping.get(product_type)
            if not width:
                logger.warning("Tipo de produto desconhecido", product_type=product_type)
                return None
            
            # Query no banco
            response = client.table("products").select(
                "image_url,product_page_url,name"
            ).eq("width_cm", width).eq("product_type", "mattress").limit(1).execute()
            
            if not response.data:
                logger.warning("Produto não encontrado no banco", 
                             product_type=product_type, width=width)
                return None
            
            product = response.data[0]
            
            # Construir URLs se não estiverem no banco
            urls = {
                "image_url": product.get("image_url") or self._build_default_image_url(product_type),
                "product_page_url": product.get("product_page_url") or self._build_default_gallery_url(product_type)
            }
            
            # Atualizar cache
            if not _image_cache["data"]:
                _image_cache["data"] = {}
            
            _image_cache["data"][product_type] = urls
            _image_cache["last_update"] = time.time()
            
            logger.debug("URLs do produto obtidas", product_type=product_type, urls=urls)
            return urls
            
        except Exception as e:
            logger.error("Erro ao buscar URLs do produto", product_type=product_type, error=str(e))
            return None
    
    def _build_default_image_url(self, product_type: str) -> str:
        """Constrói URL padrão da imagem no Storage"""
        return f"{self.storage_base_url}/product-images/{product_type}/main.jpg"
    
    def _build_default_gallery_url(self, product_type: str) -> str:
        """Constrói URL padrão da galeria no site"""
        return f"https://slimquality.com.br/produtos/{product_type}"
    
    def _is_cache_valid(self) -> bool:
        """Verifica se cache ainda é válido"""
        if not _image_cache["last_update"]:
            return False
            
        elapsed = time.time() - _image_cache["last_update"]
        return elapsed < self.cache_ttl_seconds
    
    async def _send_product_image(
        self,
        phone: str,
        product_type: str,
        image_url: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Envia imagem do produto via Evolution API
        
        Args:
            phone: Telefone do destinatário
            product_type: Tipo do produto
            image_url: URL da imagem
            context: Contexto da conversa
            
        Returns:
            Resultado do envio
        """
        try:
            if not image_url:
                return {"success": False, "error": "URL da imagem não fornecida"}
            
            # Preparar caption descritiva
            caption = self._build_image_caption(product_type, context)
            
            # Payload para Evolution API
            payload = {
                "number": phone,
                "mediaMessage": {
                    "mediatype": "image",
                    "media": image_url,
                    "caption": caption
                }
            }
            
            # Enviar via Evolution API
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=self.timeout_seconds)) as session:
                headers = {
                    "Content-Type": "application/json",
                    "apikey": self.evolution_api_key
                }
                
                url = f"{self.evolution_api_url}/message/sendMedia/{self.evolution_instance}"
                
                async with session.post(url, json=payload, headers=headers) as response:
                    if response.status == 200:
                        result = await response.json()
                        logger.info("Imagem enviada com sucesso", 
                                   phone=phone, product_type=product_type)
                        return {
                            "success": True,
                            "message_id": result.get("key", {}).get("id"),
                            "caption": caption
                        }
                    else:
                        error_text = await response.text()
                        logger.error("Erro ao enviar imagem", 
                                   status=response.status, error=error_text)
                        return {"success": False, "error": f"HTTP {response.status}: {error_text}"}
            
        except asyncio.TimeoutError:
            logger.error("Timeout ao enviar imagem", phone=phone, product_type=product_type)
            return {"success": False, "error": "Timeout na Evolution API"}
        except Exception as e:
            logger.error("Erro ao enviar imagem", phone=phone, product_type=product_type, error=str(e))
            return {"success": False, "error": str(e)}
    
    def _build_image_caption(self, product_type: str, context: Optional[Dict[str, Any]] = None) -> str:
        """
        Constrói caption descritiva para a imagem
        
        Args:
            product_type: Tipo do produto
            context: Contexto da conversa
            
        Returns:
            Caption formatada
        """
        # Nomes amigáveis dos produtos
        product_names = {
            "solteiro": "Colchão Magnético Solteiro (88x188x28cm)",
            "padrao": "Colchão Magnético Padrão (138x188x28cm) - MAIS VENDIDO",
            "queen": "Colchão Magnético Queen (158x198x30cm)",
            "king": "Colchão Magnético King (193x203x30cm)"
        }
        
        product_name = product_names.get(product_type, f"Colchão Magnético {product_type.title()}")
        
        caption = f"""🛏️ {product_name}

✨ 8 Tecnologias Terapêuticas:
• Sistema Magnético (240 ímãs)
• Infravermelho Longo
• Vibromassagem (8 motores)
• Cromoterapia
• E muito mais!

💤 Ideal para: dores nas costas, insônia, má circulação, estresse

📱 Vou enviar o link da galeria completa logo abaixo! 👇"""
        
        return caption
    
    async def _send_gallery_link(
        self,
        phone: str,
        product_type: str,
        gallery_url: str
    ) -> Dict[str, Any]:
        """
        Envia link da galeria completa
        
        Args:
            phone: Telefone do destinatário
            product_type: Tipo do produto
            gallery_url: URL da galeria
            
        Returns:
            Resultado do envio
        """
        try:
            if not gallery_url:
                gallery_url = self._build_default_gallery_url(product_type)
            
            # Mensagem com link
            message = f"""🖼️ **Galeria Completa do Produto**

Veja mais fotos, detalhes técnicos e depoimentos de clientes:
👉 {gallery_url}

💬 Tem alguma dúvida sobre o colchão? Estou aqui para ajudar!"""
            
            # Payload para Evolution API
            payload = {
                "number": phone,
                "textMessage": {
                    "text": message
                }
            }
            
            # Enviar via Evolution API
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=self.timeout_seconds)) as session:
                headers = {
                    "Content-Type": "application/json",
                    "apikey": self.evolution_api_key
                }
                
                url = f"{self.evolution_api_url}/message/sendText/{self.evolution_instance}"
                
                async with session.post(url, json=payload, headers=headers) as response:
                    if response.status == 200:
                        result = await response.json()
                        logger.info("Link da galeria enviado", 
                                   phone=phone, product_type=product_type)
                        return {
                            "success": True,
                            "message_id": result.get("key", {}).get("id"),
                            "gallery_url": gallery_url
                        }
                    else:
                        error_text = await response.text()
                        logger.error("Erro ao enviar link da galeria", 
                                   status=response.status, error=error_text)
                        return {"success": False, "error": f"HTTP {response.status}: {error_text}"}
            
        except Exception as e:
            logger.error("Erro ao enviar link da galeria", 
                        phone=phone, product_type=product_type, error=str(e))
            return {"success": False, "error": str(e)}
    
    async def _send_text_fallback(self, phone: str, product_type: str) -> Dict[str, Any]:
        """
        Envia descrição textual como fallback quando imagem falha
        
        Args:
            phone: Telefone do destinatário
            product_type: Tipo do produto
            
        Returns:
            Resultado do envio
        """
        try:
            # Descrição textual detalhada
            descriptions = {
                "solteiro": """🛏️ **Colchão Magnético Solteiro (88x188x28cm)**

✨ **8 Tecnologias Terapêuticas:**
• Sistema Magnético - 240 ímãs de 800 Gauss
• Infravermelho Longo - melhora circulação
• Vibromassagem - 8 motores relaxantes
• Cromoterapia - equilíbrio energético
• Densidade Progressiva - suporte ideal
• Energia Bioquântica - revitalização celular
• Perfilado High-Tech - ergonomia perfeita
• Tratamento Sanitário - higiene garantida

💤 **Ideal para:** dores nas costas, insônia, má circulação, estresse
💰 **Investimento:** R$ 3.190,00 (menos que uma pizza por dia!)""",

                "padrao": """🛏️ **Colchão Magnético Padrão (138x188x28cm) - MAIS VENDIDO** ⭐

✨ **8 Tecnologias Terapêuticas:**
• Sistema Magnético - 240 ímãs de 800 Gauss
• Infravermelho Longo - melhora circulação
• Vibromassagem - 8 motores relaxantes
• Cromoterapia - equilíbrio energético
• Densidade Progressiva - suporte ideal
• Energia Bioquântica - revitalização celular
• Perfilado High-Tech - ergonomia perfeita
• Tratamento Sanitário - higiene garantida

💤 **Ideal para:** dores nas costas, insônia, má circulação, estresse
💰 **Investimento:** R$ 3.290,00 (menos que uma pizza por dia!)""",

                "queen": """🛏️ **Colchão Magnético Queen (158x198x30cm)**

✨ **8 Tecnologias Terapêuticas:**
• Sistema Magnético - 240 ímãs de 800 Gauss
• Infravermelho Longo - melhora circulação
• Vibromassagem - 8 motores relaxantes
• Cromoterapia - equilíbrio energético
• Densidade Progressiva - suporte ideal
• Energia Bioquântica - revitalização celular
• Perfilado High-Tech - ergonomia perfeita
• Tratamento Sanitário - higiene garantida

💤 **Ideal para:** dores nas costas, insônia, má circulação, estresse
💰 **Investimento:** R$ 3.490,00 (menos que uma pizza por dia!)""",

                "king": """🛏️ **Colchão Magnético King (193x203x30cm) - PREMIUM**

✨ **8 Tecnologias Terapêuticas:**
• Sistema Magnético - 240 ímãs de 800 Gauss
• Infravermelho Longo - melhora circulação
• Vibromassagem - 8 motores relaxantes
• Cromoterapia - equilíbrio energético
• Densidade Progressiva - suporte ideal
• Energia Bioquântica - revitalização celular
• Perfilado High-Tech - ergonomia perfeita
• Tratamento Sanitário - higiene garantida

💤 **Ideal para:** dores nas costas, insônia, má circulação, estresse
💰 **Investimento:** R$ 4.890,00 (menos que uma pizza por dia!)"""
            }
            
            description = descriptions.get(product_type, f"Colchão Magnético {product_type.title()} com 8 tecnologias terapêuticas.")
            
            # Payload para Evolution API
            payload = {
                "number": phone,
                "textMessage": {
                    "text": description
                }
            }
            
            # Enviar via Evolution API
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=self.timeout_seconds)) as session:
                headers = {
                    "Content-Type": "application/json",
                    "apikey": self.evolution_api_key
                }
                
                url = f"{self.evolution_api_url}/message/sendText/{self.evolution_instance}"
                
                async with session.post(url, json=payload, headers=headers) as response:
                    if response.status == 200:
                        result = await response.json()
                        logger.info("Fallback textual enviado", 
                                   phone=phone, product_type=product_type)
                        return {
                            "success": True,
                            "fallback_used": True,
                            "message_id": result.get("key", {}).get("id")
                        }
                    else:
                        error_text = await response.text()
                        logger.error("Erro ao enviar fallback textual", 
                                   status=response.status, error=error_text)
                        return {"success": False, "error": f"HTTP {response.status}: {error_text}"}
            
        except Exception as e:
            logger.error("Erro ao enviar fallback textual", 
                        phone=phone, product_type=product_type, error=str(e))
            return {"success": False, "error": str(e), "fallback_used": True}


# Singleton global
_hybrid_image_service: Optional[HybridImageService] = None


def get_hybrid_image_service() -> HybridImageService:
    """
    Retorna instância singleton do Hybrid Image Service
    
    Returns:
        Instância configurada do serviço
    """
    global _hybrid_image_service
    
    if _hybrid_image_service is None:
        _hybrid_image_service = HybridImageService()
        logger.info("Hybrid Image Service inicializado")
    
    return _hybrid_image_service