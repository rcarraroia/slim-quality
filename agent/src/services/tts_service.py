"""
TTS Service - Text-to-Speech via OpenAI TTS API

Este serviço implementa:
- Conversão de texto para áudio usando OpenAI TTS
- Configuração para português brasileiro (voz nova)
- Rate limiting e timeout
- Cache de áudios gerados
- Fallbacks para falhas de TTS
- Métricas de performance
"""

import structlog
from typing import Optional, Dict, Any
import os
import asyncio
import time
import tempfile
import hashlib
from pathlib import Path
from .metrics_service import get_metrics_service

logger = structlog.get_logger(__name__)

# Rate limiting global
_tts_rate_limit = {
    "active_requests": 0,
    "max_concurrent": 3,
    "last_request": 0,
    "min_interval": 2.0  # 2 segundos entre requests
}

# Cache global de áudios TTS
_tts_cache: Dict[str, Any] = {
    "files": {},  # text_hash -> filepath
    "last_cleanup": time.time(),
    "ttl_seconds": 1800  # 30 minutos
}


class TTSService:
    """
    Serviço de conversão de texto para áudio via OpenAI TTS
    """
    
    def __init__(self):
        self.timeout_seconds = 20
        self.model = "tts-1-hd"  # Qualidade HD
        self.voice = "nova"      # Voz feminina em português
        self.format = "opus"     # Formato otimizado para WhatsApp
        self.max_text_length = 4000  # Limite OpenAI
        self.metrics = get_metrics_service()
        
        # Configurar cliente OpenAI
        self._setup_openai_client()
        
        # Diretório temporário para áudios TTS
        self.temp_dir = Path(tempfile.gettempdir()) / "slim_quality_tts"
        self.temp_dir.mkdir(exist_ok=True)
        
        logger.info("TTS Service inicializado", 
                   model=self.model, 
                   voice=self.voice,
                   format=self.format,
                   timeout=self.timeout_seconds,
                   temp_dir=str(self.temp_dir))
    
    def _setup_openai_client(self):
        """Configura cliente OpenAI"""
        try:
            from openai import AsyncOpenAI
            
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                logger.error("OPENAI_API_KEY não configurada")
                raise ValueError("OPENAI_API_KEY é obrigatória")
            
            self.client = AsyncOpenAI(api_key=api_key)
            logger.info("Cliente OpenAI TTS configurado com sucesso")
            
        except ImportError:
            logger.error("Biblioteca openai não instalada. Execute: pip install openai")
            raise
        except Exception as e:
            logger.error("Erro ao configurar cliente OpenAI TTS", error=str(e))
            raise
    
    async def text_to_speech(self, text: str) -> Optional[str]:
        """
        Converte texto para áudio
        
        Args:
            text: Texto para converter (máximo 4000 caracteres)
            
        Returns:
            Caminho do arquivo de áudio gerado ou None se falhar
            
        Example:
            >>> audio_path = await service.text_to_speech("Olá, como posso ajudar?")
            >>> print(audio_path)  # "/tmp/tts_abc123.opus"
        """
        start_time = time.time()
        success = False
        error_type = None
        
        try:
            if not text or not text.strip():
                logger.warning("Texto vazio fornecido para TTS")
                return None
            
            # Limpar e truncar texto
            clean_text = self._clean_text(text)
            if not clean_text:
                logger.warning("Texto vazio após limpeza")
                return None
            
            # Verificar cache primeiro
            text_hash = self._get_text_hash(clean_text)
            cached_path = self._get_from_cache(text_hash)
            if cached_path:
                logger.debug("Usando áudio TTS do cache", text_preview=clean_text[:50])
                # Registrar cache hit
                cache_duration = (time.time() - start_time) * 1000
                self.metrics.record_cache_metric("tts", "hit", text_hash, cache_duration)
                success = True
                return cached_path
            
            # Cache miss
            cache_duration = (time.time() - start_time) * 1000
            self.metrics.record_cache_metric("tts", "miss", text_hash, cache_duration)
            
            # Verificar rate limiting
            if not await self._check_rate_limit():
                logger.warning("Rate limit TTS atingido, aguardando...")
                await asyncio.sleep(3)
                if not await self._check_rate_limit():
                    logger.error("Rate limit TTS ainda ativo, abortando")
                    error_type = "RateLimitError"
                    return None
            
            # Incrementar contador de requests ativos
            _tts_rate_limit["active_requests"] += 1
            _tts_rate_limit["last_request"] = time.time()
            
            try:
                # Gerar áudio
                audio_path = await self._generate_audio_with_timeout(clean_text, text_hash)
                
                if audio_path:
                    # Adicionar ao cache
                    _tts_cache["files"][text_hash] = audio_path
                    
                    logger.info("TTS gerado com sucesso", 
                               text_length=len(clean_text),
                               audio_path=Path(audio_path).name)
                    success = True
                    return audio_path
                else:
                    logger.warning("TTS retornou vazio", text_preview=clean_text[:50])
                    error_type = "EmptyResponse"
                    return None
                    
            finally:
                # Decrementar contador
                _tts_rate_limit["active_requests"] = max(0, _tts_rate_limit["active_requests"] - 1)
                
        except Exception as e:
            logger.error("Erro na conversão TTS", text_preview=text[:50] if text else "", error=str(e))
            error_type = type(e).__name__
            return None
        finally:
            # Registrar métrica de áudio
            duration_ms = (time.time() - start_time) * 1000
            self.metrics.record_audio_metric(
                operation="tts",
                duration_ms=duration_ms,
                success=success,
                error_type=error_type,
                file_size_bytes=None  # Poderia ser calculado se necessário
            )
    
    def _clean_text(self, text: str) -> str:
        """
        Limpa e prepara texto para TTS
        
        Args:
            text: Texto original
            
        Returns:
            Texto limpo e otimizado para TTS
        """
        try:
            # Remover caracteres especiais que podem causar problemas
            import re
            
            # Remover emojis
            emoji_pattern = re.compile("["
                                     u"\U0001F600-\U0001F64F"  # emoticons
                                     u"\U0001F300-\U0001F5FF"  # symbols & pictographs
                                     u"\U0001F680-\U0001F6FF"  # transport & map
                                     u"\U0001F1E0-\U0001F1FF"  # flags
                                     "]+", flags=re.UNICODE)
            text = emoji_pattern.sub('', text)
            
            # Remover URLs
            url_pattern = re.compile(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+')
            text = url_pattern.sub('', text)
            
            # Remover múltiplas quebras de linha
            text = re.sub(r'\n+', ' ', text)
            
            # Remover múltiplos espaços
            text = re.sub(r'\s+', ' ', text)
            
            # Limpar início e fim
            text = text.strip()
            
            # Truncar se muito longo
            if len(text) > self.max_text_length:
                text = text[:self.max_text_length - 3] + "..."
                logger.warning("Texto truncado para TTS", 
                             original_length=len(text), 
                             max_length=self.max_text_length)
            
            return text
            
        except Exception as e:
            logger.error("Erro na limpeza do texto", error=str(e))
            return text  # Retornar original se limpeza falhar
    
    def _get_text_hash(self, text: str) -> str:
        """Gera hash único para o texto"""
        return hashlib.md5(text.encode('utf-8')).hexdigest()
    
    def _get_from_cache(self, text_hash: str) -> Optional[str]:
        """
        Busca áudio no cache
        
        Args:
            text_hash: Hash do texto
            
        Returns:
            Caminho do arquivo ou None
        """
        try:
            # Limpar cache antigo primeiro
            self._cleanup_old_files()
            
            if text_hash not in _tts_cache["files"]:
                return None
            
            filepath = _tts_cache["files"][text_hash]
            
            # Verificar se arquivo ainda existe
            if os.path.exists(filepath):
                return filepath
            else:
                # Remover do cache se arquivo não existe
                del _tts_cache["files"][text_hash]
                return None
                
        except Exception as e:
            logger.error("Erro ao buscar no cache TTS", text_hash=text_hash, error=str(e))
            return None
    
    async def _check_rate_limit(self) -> bool:
        """
        Verifica se pode fazer nova requisição TTS
        
        Returns:
            True se pode fazer requisição
        """
        current_time = time.time()
        
        # Verificar número de requests simultâneos
        if _tts_rate_limit["active_requests"] >= _tts_rate_limit["max_concurrent"]:
            logger.debug("Máximo de requests TTS simultâneos atingido", 
                        active=_tts_rate_limit["active_requests"],
                        max=_tts_rate_limit["max_concurrent"])
            return False
        
        # Verificar intervalo mínimo entre requests
        time_since_last = current_time - _tts_rate_limit["last_request"]
        if time_since_last < _tts_rate_limit["min_interval"]:
            logger.debug("Intervalo mínimo TTS não respeitado", 
                        time_since_last=time_since_last,
                        min_interval=_tts_rate_limit["min_interval"])
            return False
        
        return True
    
    async def _generate_audio_with_timeout(self, text: str, text_hash: str) -> Optional[str]:
        """
        Gera áudio com timeout
        
        Args:
            text: Texto para converter
            text_hash: Hash do texto
            
        Returns:
            Caminho do arquivo gerado ou None
        """
        try:
            # Executar TTS com timeout
            tts_task = self._call_tts_api(text, text_hash)
            audio_path = await asyncio.wait_for(tts_task, timeout=self.timeout_seconds)
            
            return audio_path
            
        except asyncio.TimeoutError:
            logger.error("Timeout na geração TTS", 
                        text_preview=text[:50], 
                        timeout=self.timeout_seconds)
            return None
        except Exception as e:
            logger.error("Erro na geração TTS com timeout", text_preview=text[:50], error=str(e))
            return None
    
    async def _call_tts_api(self, text: str, text_hash: str) -> Optional[str]:
        """
        Chama API TTS da OpenAI
        
        Args:
            text: Texto para converter
            text_hash: Hash do texto
            
        Returns:
            Caminho do arquivo de áudio gerado
        """
        try:
            # Gerar nome do arquivo
            timestamp = int(time.time())
            filename = f"tts_{text_hash}_{timestamp}.{self.format}"
            filepath = self.temp_dir / filename
            
            # Chamar API TTS
            response = await self.client.audio.speech.create(
                model=self.model,
                voice=self.voice,
                input=text,
                response_format=self.format
            )
            
            # Salvar áudio no arquivo
            with open(filepath, 'wb') as f:
                async for chunk in response.iter_bytes():
                    f.write(chunk)
            
            # Verificar se arquivo foi criado
            if not os.path.exists(filepath) or os.path.getsize(filepath) == 0:
                logger.error("Arquivo TTS não foi criado ou está vazio", filepath=str(filepath))
                return None
            
            logger.debug("API TTS chamada com sucesso", 
                        filepath=filename,
                        file_size=os.path.getsize(filepath))
            
            return str(filepath)
            
        except Exception as e:
            logger.error("Erro na chamada da API TTS", text_preview=text[:50], error=str(e))
            
            # Verificar se é erro de API key
            if "api_key" in str(e).lower() or "authentication" in str(e).lower():
                logger.error("Erro de autenticação OpenAI TTS - verificar OPENAI_API_KEY")
            
            # Verificar se é erro de texto muito longo
            elif "maximum" in str(e).lower() or "limit" in str(e).lower():
                logger.error("Texto muito longo para TTS", text_length=len(text))
            
            return None
    
    def _cleanup_old_files(self):
        """Remove arquivos TTS antigos do cache"""
        try:
            current_time = time.time()
            
            # Limpar apenas a cada 15 minutos
            if current_time - _tts_cache["last_cleanup"] < 900:
                return
            
            # Remover arquivos expirados do cache
            expired_keys = []
            for text_hash, filepath in _tts_cache["files"].items():
                if os.path.exists(filepath):
                    file_age = current_time - os.path.getctime(filepath)
                    if file_age > _tts_cache["ttl_seconds"]:
                        try:
                            os.remove(filepath)
                            expired_keys.append(text_hash)
                            logger.debug("Arquivo TTS expirado removido", filepath=filepath)
                        except Exception as e:
                            logger.warning("Erro ao remover arquivo TTS expirado", filepath=filepath, error=str(e))
                else:
                    expired_keys.append(text_hash)
            
            # Remover do cache
            for key in expired_keys:
                del _tts_cache["files"][key]
            
            _tts_cache["last_cleanup"] = current_time
            
            if expired_keys:
                logger.info("Limpeza de cache TTS concluída", removed_files=len(expired_keys))
                
        except Exception as e:
            logger.error("Erro na limpeza de arquivos TTS antigos", error=str(e))
    
    def get_fallback_message(self) -> str:
        """
        Retorna mensagem de fallback quando TTS falha
        
        Returns:
            Mensagem padrão para o usuário
        """
        return "Desculpe, tive problemas técnicos para gerar o áudio. Aqui está minha resposta em texto:"
    
    async def get_service_status(self) -> Dict[str, Any]:
        """
        Retorna status do serviço TTS
        
        Returns:
            Dict com informações de status
        """
        try:
            api_key_configured = bool(os.getenv("OPENAI_API_KEY"))
            
            status = {
                "service": "tts",
                "model": self.model,
                "voice": self.voice,
                "format": self.format,
                "timeout_seconds": self.timeout_seconds,
                "max_text_length": self.max_text_length,
                "api_key_configured": api_key_configured,
                "rate_limit": {
                    "active_requests": _tts_rate_limit["active_requests"],
                    "max_concurrent": _tts_rate_limit["max_concurrent"],
                    "last_request": _tts_rate_limit["last_request"]
                },
                "cache": {
                    "cached_files": len(_tts_cache["files"]),
                    "ttl_seconds": _tts_cache["ttl_seconds"],
                    "last_cleanup": _tts_cache["last_cleanup"]
                },
                "client_configured": hasattr(self, 'client') and self.client is not None
            }
            
            return status
            
        except Exception as e:
            logger.error("Erro ao obter status do serviço TTS", error=str(e))
            return {"service": "tts", "error": str(e)}


# Singleton global
_tts_service: Optional[TTSService] = None


def get_tts_service() -> TTSService:
    """
    Retorna instância singleton do TTS Service
    
    Returns:
        Instância configurada do serviço
    """
    global _tts_service
    
    if _tts_service is None:
        _tts_service = TTSService()
        logger.info("TTS Service inicializado")
    
    return _tts_service