"""
Customer History Service - Reconhecimento e personalização para clientes retornando

Este serviço implementa:
- Verificação de histórico do cliente por telefone
- Saudações personalizadas para clientes existentes
- Cache de dados do cliente para performance
- Fallback para comportamento padrão se BD falhar
"""

import structlog
from typing import Dict, Optional, Any
import time
from datetime import datetime

from .supabase_client import get_supabase_client

logger = structlog.get_logger(__name__)

# Cache global de clientes
_customer_cache: Dict[str, Any] = {
    "data": {},  # phone -> customer_data
    "last_update": {},  # phone -> timestamp
    "ttl_seconds": 300  # 5 minutos
}


class CustomerHistoryService:
    """
    Serviço de histórico de clientes com cache e fallbacks
    """
    
    def __init__(self):
        self.cache_ttl_seconds = 300  # 5 minutos
        self.timeout_seconds = 2
        
    async def check_customer_history(self, phone: str) -> Optional[Dict[str, Any]]:
        """
        Verifica se cliente já existe no banco de dados
        
        Args:
            phone: Número de telefone do cliente (formato: 5511999999999)
            
        Returns:
            Dados do cliente se existir, None se novo cliente
            
        Example:
            >>> customer = await service.check_customer_history("5511999999999")
            >>> if customer:
            ...     print(f"Cliente: {customer['name']}")
        """
        try:
            # Normalizar telefone (remover caracteres especiais)
            normalized_phone = self._normalize_phone(phone)
            
            # Verificar cache primeiro
            if self._is_cache_valid(normalized_phone):
                logger.debug("Usando dados do cliente do cache", phone=normalized_phone)
                return _customer_cache["data"].get(normalized_phone)
            
            # Cache expirado, buscar do banco
            logger.info("Buscando histórico do cliente no banco", phone=normalized_phone)
            customer_data = await self._fetch_customer_from_database(normalized_phone)
            
            # Atualizar cache (mesmo se None)
            _customer_cache["data"][normalized_phone] = customer_data
            _customer_cache["last_update"][normalized_phone] = time.time()
            
            if customer_data:
                logger.info("Cliente encontrado", phone=normalized_phone, name=customer_data.get("name"))
            else:
                logger.info("Cliente novo", phone=normalized_phone)
            
            return customer_data
            
        except Exception as e:
            logger.error("Erro ao verificar histórico do cliente", phone=phone, error=str(e))
            # Fallback: assumir cliente novo
            return None
    
    async def get_personalized_greeting(self, phone: str) -> str:
        """
        Gera saudação personalizada baseada no histórico do cliente
        
        Args:
            phone: Número de telefone do cliente
            
        Returns:
            Saudação personalizada ou padrão
        """
        try:
            customer_data = await self.check_customer_history(phone)
            
            if customer_data:
                # Cliente existente - saudação personalizada
                name = customer_data.get("name", "").split()[0]  # Primeiro nome
                
                # Verificar se tem compra anterior (calcular via created_at como proxy)
                created_at = customer_data.get("created_at")
                if created_at:
                    # Cliente tem histórico
                    greeting = f"Olá {name}! Que bom ter você de volta! 😊"
                    
                    # Adicionar menção a produto anterior se possível
                    # (Como não temos last_purchase_at, usar lógica simples)
                    source = customer_data.get("source", "")
                    if source == "affiliate":
                        greeting += " Como está seu colchão? Espero que esteja dormindo muito melhor!"
                    
                    return greeting
                else:
                    # Cliente cadastrado mas sem histórico claro
                    return f"Olá {name}! Como posso ajudá-lo hoje? 😊"
            else:
                # Cliente novo - saudação padrão
                return self._get_default_greeting()
                
        except Exception as e:
            logger.error("Erro ao gerar saudação personalizada", phone=phone, error=str(e))
            # Fallback: saudação padrão
            return self._get_default_greeting()
    
    def _normalize_phone(self, phone: str) -> str:
        """
        Normaliza número de telefone removendo caracteres especiais
        
        Args:
            phone: Telefone original
            
        Returns:
            Telefone normalizado (apenas números)
        """
        # Remover todos os caracteres não numéricos
        normalized = ''.join(filter(str.isdigit, phone))
        
        # Garantir formato brasileiro (55 + DDD + número)
        if len(normalized) == 11 and normalized.startswith('11'):
            # Adicionar código do país se não tiver
            normalized = '55' + normalized
        elif len(normalized) == 10:
            # Formato antigo sem 9 extra
            normalized = '5511' + normalized
        
        return normalized
    
    def _is_cache_valid(self, phone: str) -> bool:
        """Verifica se cache do cliente ainda é válido"""
        if phone not in _customer_cache["last_update"]:
            return False
            
        elapsed = time.time() - _customer_cache["last_update"][phone]
        return elapsed < self.cache_ttl_seconds
    
    async def _fetch_customer_from_database(self, phone: str) -> Optional[Dict[str, Any]]:
        """
        Busca dados do cliente no banco de dados
        
        Args:
            phone: Telefone normalizado
            
        Returns:
            Dados do cliente ou None se não encontrado
        """
        try:
            client = get_supabase_client()
            
            # Query na tabela customers
            # Buscar por phone exato ou variações comuns
            phone_variations = [
                phone,
                phone[-11:] if len(phone) > 11 else phone,  # Sem código país
                phone[-10:] if len(phone) > 10 else phone,  # Formato antigo
            ]
            
            for phone_variant in phone_variations:
                response = client.table("customers").select(
                    "id,name,email,phone,source,created_at,updated_at"
                ).eq("phone", phone_variant).eq("deleted_at", None).limit(1).execute()
                
                if response.data:
                    customer = response.data[0]
                    logger.debug("Cliente encontrado no banco", phone=phone_variant, customer_id=customer.get("id"))
                    return customer
            
            # Não encontrado
            logger.debug("Cliente não encontrado no banco", phone=phone)
            return None
            
        except Exception as e:
            logger.error("Erro ao buscar cliente no banco", phone=phone, error=str(e))
            raise
    
    def _get_default_greeting(self) -> str:
        """
        Retorna saudação padrão para clientes novos
        
        Returns:
            Saudação padrão da BIA
        """
        return """Olá! Sou a BIA, consultora especializada em colchões magnéticos terapêuticos da Slim Quality! 😊

Como posso ajudá-lo hoje? Tem alguma dor, problema de sono ou circulação que gostaria de resolver?"""
    
    async def get_customer_context(self, phone: str) -> Dict[str, Any]:
        """
        Retorna contexto completo do cliente para uso no SICC
        
        Args:
            phone: Telefone do cliente
            
        Returns:
            Contexto do cliente com flags e dados relevantes
        """
        try:
            customer_data = await self.check_customer_history(phone)
            
            context = {
                "is_returning_customer": customer_data is not None,
                "customer_name": customer_data.get("name") if customer_data else None,
                "customer_source": customer_data.get("source") if customer_data else "organic",
                "has_purchase_history": customer_data is not None,  # Simplificado
                "personalized_greeting": await self.get_personalized_greeting(phone)
            }
            
            return context
            
        except Exception as e:
            logger.error("Erro ao obter contexto do cliente", phone=phone, error=str(e))
            # Fallback: contexto de cliente novo
            return {
                "is_returning_customer": False,
                "customer_name": None,
                "customer_source": "organic",
                "has_purchase_history": False,
                "personalized_greeting": self._get_default_greeting()
            }


# Singleton global
_customer_history_service: Optional[CustomerHistoryService] = None


def get_customer_history_service() -> CustomerHistoryService:
    """
    Retorna instância singleton do Customer History Service
    
    Returns:
        Instância configurada do serviço
    """
    global _customer_history_service
    
    if _customer_history_service is None:
        _customer_history_service = CustomerHistoryService()
        logger.info("Customer History Service inicializado")
    
    return _customer_history_service