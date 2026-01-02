"""
Whisper Service - Transcrição de áudio via OpenAI Whisper API

Este serviço implementa:
- Transcrição de áudio para texto usando Whisper
- Configuração para português brasileiro
- Rate limiting e timeout
- Fallbacks para falhas de transcrição
- Métricas de performance
"""

import structlog
from typing import Optional, Dict, Any
import os
import asyncio
import time
from pathlib import Path
from .metrics_service import get_metrics_service

logger = structlog.get_logger(__name__)

# Rate limiting global
_whisper_rate_limit = {
    "active_requests": 0,
    "max_concurrent": 5,
    "last_request": 0,
    "min_interval": 1.0  # 1 segundo entre requests
}


class WhisperService:
    """
    Serviço de transcrição de áudio via OpenAI Whisper
    """
    
    def __init__(self):
        self.timeout_seconds = 30
        self.model = "whisper-1"
        self.language = "pt"  # Português
        self.metrics = get_metrics_service()
        
        # Configurar cliente OpenAI
        self._setup_openai_client()
        
        logger.info("Whisper Service inicializado", 
                   model=self.model, 
                   language=self.language,
                   timeout=self.timeout_seconds)
    
    def _setup_openai_client(self):
        """Configura cliente OpenAI"""
        try:
            from openai import AsyncOpenAI
            
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                logger.error("OPENAI_API_KEY não configurada")
                raise ValueError("OPENAI_API_KEY é obrigatória")
            
            self.client = AsyncOpenAI(api_key=api_key)
            logger.info("Cliente OpenAI configurado com sucesso")
            
        except ImportError:
            logger.error("Biblioteca openai não instalada. Execute: pip install openai")
            raise
        except Exception as e:
            logger.error("Erro ao configurar cliente OpenAI", error=str(e))
            raise
    
    async def transcribe_audio(self, filepath: str) -> Optional[str]:
        """
        Transcreve áudio para texto
        
        Args:
            filepath: Caminho do arquivo de áudio local
            
        Returns:
            Texto transcrito em português ou None se falhar
            
        Example:
            >>> text = await service.transcribe_audio("/tmp/audio.ogg")
            >>> print(text)  # "Olá, como você está?"
        """
        start_time = time.time()
        success = False
        error_type = None
        file_size = None
        
        try:
            if not os.path.exists(filepath):
                logger.error("Arquivo de áudio não encontrado", filepath=filepath)
                error_type = "FileNotFound"
                return None
            
            # Obter tamanho do arquivo
            try:
                file_size = os.path.getsize(filepath)
            except:
                pass
            
            # Verificar rate limiting
            if not await self._check_rate_limit():
                logger.warning("Rate limit atingido, aguardando...")
                await asyncio.sleep(2)
                if not await self._check_rate_limit():
                    logger.error("Rate limit ainda ativo, abortando transcrição")
                    error_type = "RateLimitError"
                    return None
            
            # Incrementar contador de requests ativos
            _whisper_rate_limit["active_requests"] += 1
            _whisper_rate_limit["last_request"] = time.time()
            
            try:
                # Transcrever áudio
                transcription = await self._transcribe_with_timeout(filepath)
                
                if transcription:
                    logger.info("Transcrição concluída com sucesso", 
                               filepath=Path(filepath).name,
                               text_length=len(transcription))
                    success = True
                    return transcription
                else:
                    logger.warning("Transcrição retornou vazia", filepath=filepath)
                    error_type = "EmptyResponse"
                    return None
                    
            finally:
                # Decrementar contador
                _whisper_rate_limit["active_requests"] = max(0, _whisper_rate_limit["active_requests"] - 1)
                
        except Exception as e:
            logger.error("Erro na transcrição de áudio", filepath=filepath, error=str(e))
            error_type = type(e).__name__
            return None
        finally:
            # Registrar métrica de áudio
            duration_ms = (time.time() - start_time) * 1000
            self.metrics.record_audio_metric(
                operation="transcription",
                duration_ms=duration_ms,
                success=success,
                error_type=error_type,
                file_size_bytes=file_size
            )
    
    async def _check_rate_limit(self) -> bool:
        """
        Verifica se pode fazer nova requisição
        
        Returns:
            True se pode fazer requisição
        """
        current_time = time.time()
        
        # Verificar número de requests simultâneos
        if _whisper_rate_limit["active_requests"] >= _whisper_rate_limit["max_concurrent"]:
            logger.debug("Máximo de requests simultâneos atingido", 
                        active=_whisper_rate_limit["active_requests"],
                        max=_whisper_rate_limit["max_concurrent"])
            return False
        
        # Verificar intervalo mínimo entre requests
        time_since_last = current_time - _whisper_rate_limit["last_request"]
        if time_since_last < _whisper_rate_limit["min_interval"]:
            logger.debug("Intervalo mínimo não respeitado", 
                        time_since_last=time_since_last,
                        min_interval=_whisper_rate_limit["min_interval"])
            return False
        
        return True
    
    async def _transcribe_with_timeout(self, filepath: str) -> Optional[str]:
        """
        Transcreve áudio com timeout
        
        Args:
            filepath: Caminho do arquivo
            
        Returns:
            Texto transcrito ou None
        """
        try:
            # Executar transcrição com timeout
            transcription_task = self._call_whisper_api(filepath)
            transcription = await asyncio.wait_for(transcription_task, timeout=self.timeout_seconds)
            
            return transcription
            
        except asyncio.TimeoutError:
            logger.error("Timeout na transcrição Whisper", 
                        filepath=filepath, 
                        timeout=self.timeout_seconds)
            return None
        except Exception as e:
            logger.error("Erro na transcrição com timeout", filepath=filepath, error=str(e))
            return None
    
    async def _call_whisper_api(self, filepath: str) -> Optional[str]:
        """
        Chama API Whisper da OpenAI
        
        Args:
            filepath: Caminho do arquivo de áudio
            
        Returns:
            Texto transcrito
        """
        try:
            # Abrir arquivo de áudio
            with open(filepath, "rb") as audio_file:
                # Chamar API Whisper
                response = await self.client.audio.transcriptions.create(
                    model=self.model,
                    file=audio_file,
                    language=self.language,
                    response_format="text"
                )
                
                # Extrair texto da resposta
                if hasattr(response, 'text'):
                    transcription = response.text.strip()
                elif isinstance(response, str):
                    transcription = response.strip()
                else:
                    logger.warning("Formato de resposta inesperado", response_type=type(response))
                    transcription = str(response).strip()
                
                if not transcription:
                    logger.warning("Transcrição vazia retornada pela API")
                    return None
                
                logger.debug("API Whisper chamada com sucesso", 
                           text_preview=transcription[:50] + "..." if len(transcription) > 50 else transcription)
                
                return transcription
                
        except Exception as e:
            logger.error("Erro na chamada da API Whisper", filepath=filepath, error=str(e))
            
            # Verificar se é erro de API key
            if "api_key" in str(e).lower() or "authentication" in str(e).lower():
                logger.error("Erro de autenticação OpenAI - verificar OPENAI_API_KEY")
            
            # Verificar se é erro de formato de arquivo
            elif "format" in str(e).lower() or "unsupported" in str(e).lower():
                logger.error("Formato de arquivo não suportado pelo Whisper")
            
            return None
    
    def get_fallback_message(self) -> str:
        """
        Retorna mensagem de fallback quando transcrição falha
        
        Returns:
            Mensagem padrão para o usuário
        """
        return "Desculpe, tive dificuldade para entender o áudio. Pode digitar sua mensagem?"
    
    async def get_service_status(self) -> Dict[str, Any]:
        """
        Retorna status do serviço Whisper
        
        Returns:
            Dict com informações de status
        """
        try:
            api_key_configured = bool(os.getenv("OPENAI_API_KEY"))
            
            status = {
                "service": "whisper",
                "model": self.model,
                "language": self.language,
                "timeout_seconds": self.timeout_seconds,
                "api_key_configured": api_key_configured,
                "rate_limit": {
                    "active_requests": _whisper_rate_limit["active_requests"],
                    "max_concurrent": _whisper_rate_limit["max_concurrent"],
                    "last_request": _whisper_rate_limit["last_request"]
                },
                "client_configured": hasattr(self, 'client') and self.client is not None
            }
            
            return status
            
        except Exception as e:
            logger.error("Erro ao obter status do serviço", error=str(e))
            return {"service": "whisper", "error": str(e)}


# Singleton global
_whisper_service: Optional[WhisperService] = None


def get_whisper_service() -> WhisperService:
    """
    Retorna instância singleton do Whisper Service
    
    Returns:
        Instância configurada do serviço
    """
    global _whisper_service
    
    if _whisper_service is None:
        _whisper_service = WhisperService()
        logger.info("Whisper Service inicializado")
    
    return _whisper_service