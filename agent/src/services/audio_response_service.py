"""
Audio Response Service - Envio de respostas em áudio via WhatsApp

Este serviço implementa:
- Envio de áudio via Evolution API
- Configuração como push-to-talk (ptt: true)
- Presença "recording" durante geração
- Fallback para texto se envio falhar
- Integração com TTS Service
"""

import structlog
from typing import Dict, Optional, Any
import os
import asyncio
import aiohttp
import time
from pathlib import Path

logger = structlog.get_logger(__name__)


class AudioResponseService:
    """
    Serviço de envio de respostas em áudio via WhatsApp
    """
    
    def __init__(self):
        self.timeout_seconds = 30
        
        # Evolution API config
        self.evolution_api_url = os.getenv("EVOLUTION_API_URL", "http://localhost:8080")
        self.evolution_api_key = os.getenv("EVOLUTION_API_KEY", "")
        self.evolution_instance = os.getenv("EVOLUTION_INSTANCE", "slim_quality")
        
        logger.info("Audio Response Service inicializado", 
                   evolution_url=self.evolution_api_url,
                   instance=self.evolution_instance)
    
    async def send_audio_response(
        self, 
        phone: str, 
        text: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Envia resposta em áudio via WhatsApp
        
        Args:
            phone: Número do telefone (formato: 5511999999999)
            text: Texto para converter em áudio e enviar
            context: Contexto adicional da conversa
            
        Returns:
            Resultado do envio (sucesso/falha + detalhes)
        """
        try:
            # Gerar áudio via TTS
            from .tts_service import get_tts_service
            tts_service = get_tts_service()
            
            logger.info("Gerando áudio TTS", phone=phone, text_length=len(text))
            
            # Mostrar presença "recording" enquanto gera áudio
            await self._set_presence(phone, "recording")
            
            # Gerar áudio
            audio_path = await tts_service.text_to_speech(text)
            
            if not audio_path:
                logger.warning("Falha na geração TTS, usando fallback textual", phone=phone)
                return await self._send_text_fallback(phone, text, tts_service.get_fallback_message())
            
            # Enviar áudio via WhatsApp
            logger.info("Enviando áudio via WhatsApp", phone=phone, audio_file=Path(audio_path).name)
            
            audio_result = await self._send_audio_whatsapp(phone, audio_path, context)
            
            # Limpar presença
            await self._set_presence(phone, "available")
            
            return {
                "success": audio_result.get("success", False),
                "response_type": "audio",
                "audio_sent": audio_result.get("success", False),
                "text_fallback_used": False,
                "audio_path": audio_path,
                "details": audio_result
            }
            
        except Exception as e:
            logger.error("Erro ao enviar resposta em áudio", phone=phone, error=str(e))
            
            # Fallback final - enviar texto
            return await self._send_text_fallback(phone, text, "Desculpe, tive problemas técnicos com o áudio.")
    
    async def _send_audio_whatsapp(
        self, 
        phone: str, 
        audio_path: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Envia arquivo de áudio via Evolution API
        
        Args:
            phone: Telefone do destinatário
            audio_path: Caminho do arquivo de áudio
            context: Contexto da conversa
            
        Returns:
            Resultado do envio
        """
        try:
            if not os.path.exists(audio_path):
                logger.error("Arquivo de áudio não encontrado", audio_path=audio_path)
                return {"success": False, "error": "Audio file not found"}
            
            # Preparar payload para Evolution API
            # Usar base64 para envio do áudio
            import base64
            
            with open(audio_path, 'rb') as audio_file:
                audio_base64 = base64.b64encode(audio_file.read()).decode('utf-8')
            
            # Determinar MIME type baseado na extensão
            file_extension = Path(audio_path).suffix.lower().lstrip('.')
            mime_types = {
                "opus": "audio/opus",
                "ogg": "audio/ogg",
                "mp3": "audio/mpeg",
                "m4a": "audio/mp4",
                "wav": "audio/wav"
            }
            mime_type = mime_types.get(file_extension, "audio/opus")
            
            payload = {
                "number": phone,
                "mediaMessage": {
                    "mediatype": "audio",
                    "media": f"data:{mime_type};base64,{audio_base64}",
                    "fileName": f"audio_{int(time.time())}.{file_extension}",
                    "ptt": True  # Push-to-talk (aparece como mensagem de voz)
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
                        logger.info("Áudio enviado com sucesso via WhatsApp", 
                                   phone=phone, 
                                   file_size=len(audio_base64))
                        return {
                            "success": True,
                            "message_id": result.get("key", {}).get("id"),
                            "file_size": len(audio_base64),
                            "mime_type": mime_type
                        }
                    else:
                        error_text = await response.text()
                        logger.error("Erro ao enviar áudio via WhatsApp", 
                                   status=response.status, 
                                   error=error_text)
                        return {"success": False, "error": f"HTTP {response.status}: {error_text}"}
            
        except Exception as e:
            logger.error("Erro no envio de áudio via WhatsApp", phone=phone, error=str(e))
            return {"success": False, "error": str(e)}
    
    async def _set_presence(self, phone: str, presence: str):
        """
        Define presença no WhatsApp (recording, available, etc.)
        
        Args:
            phone: Telefone do destinatário
            presence: Tipo de presença (recording, available, typing)
        """
        try:
            payload = {
                "number": phone,
                "presence": presence
            }
            
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=5)) as session:
                headers = {
                    "Content-Type": "application/json",
                    "apikey": self.evolution_api_key
                }
                
                url = f"{self.evolution_api_url}/chat/presence/{self.evolution_instance}"
                
                async with session.post(url, json=payload, headers=headers) as response:
                    if response.status == 200:
                        logger.debug("Presença definida", phone=phone, presence=presence)
                    else:
                        logger.warning("Erro ao definir presença", 
                                     phone=phone, 
                                     presence=presence,
                                     status=response.status)
            
        except Exception as e:
            logger.warning("Erro ao definir presença", phone=phone, presence=presence, error=str(e))
    
    async def _send_text_fallback(
        self, 
        phone: str, 
        original_text: str, 
        fallback_message: str
    ) -> Dict[str, Any]:
        """
        Envia resposta em texto como fallback quando áudio falha
        
        Args:
            phone: Telefone do destinatário
            original_text: Texto original da resposta
            fallback_message: Mensagem explicando o fallback
            
        Returns:
            Resultado do envio
        """
        try:
            # Combinar mensagem de fallback com texto original
            full_message = f"{fallback_message}\n\n{original_text}"
            
            payload = {
                "number": phone,
                "textMessage": {
                    "text": full_message
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
                        logger.info("Fallback textual enviado", phone=phone)
                        return {
                            "success": True,
                            "response_type": "text",
                            "audio_sent": False,
                            "text_fallback_used": True,
                            "message_id": result.get("key", {}).get("id"),
                            "fallback_reason": "audio_generation_failed"
                        }
                    else:
                        error_text = await response.text()
                        logger.error("Erro ao enviar fallback textual", 
                                   status=response.status, 
                                   error=error_text)
                        return {
                            "success": False, 
                            "error": f"HTTP {response.status}: {error_text}",
                            "text_fallback_used": True
                        }
            
        except Exception as e:
            logger.error("Erro ao enviar fallback textual", phone=phone, error=str(e))
            return {
                "success": False, 
                "error": str(e),
                "text_fallback_used": True
            }
    
    async def get_service_status(self) -> Dict[str, Any]:
        """
        Retorna status do serviço de resposta em áudio
        
        Returns:
            Dict com informações de status
        """
        try:
            # Verificar configurações
            api_key_configured = bool(self.evolution_api_key)
            
            status = {
                "service": "audio_response",
                "evolution_api_url": self.evolution_api_url,
                "evolution_instance": self.evolution_instance,
                "api_key_configured": api_key_configured,
                "timeout_seconds": self.timeout_seconds
            }
            
            return status
            
        except Exception as e:
            logger.error("Erro ao obter status do serviço de resposta em áudio", error=str(e))
            return {"service": "audio_response", "error": str(e)}


# Singleton global
_audio_response_service: Optional[AudioResponseService] = None


def get_audio_response_service() -> AudioResponseService:
    """
    Retorna instância singleton do Audio Response Service
    
    Returns:
        Instância configurada do serviço
    """
    global _audio_response_service
    
    if _audio_response_service is None:
        _audio_response_service = AudioResponseService()
        logger.info("Audio Response Service inicializado")
    
    return _audio_response_service