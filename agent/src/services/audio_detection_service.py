"""
Audio Detection Service - Detecta e processa áudios recebidos via WhatsApp

Este serviço implementa:
- Detecção de mensagens de áudio
- Download de arquivos de áudio via Evolution API
- Validação de formato e duração
- Cache temporário de arquivos
"""

import structlog
from typing import Dict, Optional, Any
import os
import time
import tempfile
import aiohttp
import asyncio
from pathlib import Path

logger = structlog.get_logger(__name__)

# Cache global de arquivos de áudio
_audio_cache: Dict[str, Any] = {
    "files": {},  # message_id -> filepath
    "last_cleanup": time.time(),
    "ttl_seconds": 3600  # 1 hora
}


class AudioDetectionService:
    """
    Serviço de detecção e processamento de áudios
    """
    
    def __init__(self):
        self.timeout_seconds = 30
        self.max_duration_seconds = 300  # 5 minutos
        self.supported_formats = ["ogg", "mp3", "m4a", "wav", "opus"]
        
        # Evolution API config
        self.evolution_api_url = os.getenv("EVOLUTION_API_URL", "http://localhost:8080")
        self.evolution_api_key = os.getenv("EVOLUTION_API_KEY", "")
        self.evolution_instance = os.getenv("EVOLUTION_INSTANCE", "slim_quality")
        
        # Diretório temporário para áudios
        self.temp_dir = Path(tempfile.gettempdir()) / "slim_quality_audio"
        self.temp_dir.mkdir(exist_ok=True)
        
        logger.info("Audio Detection Service inicializado", 
                   temp_dir=str(self.temp_dir),
                   supported_formats=self.supported_formats)
    
    def is_audio_message(self, message: Dict[str, Any]) -> bool:
        """
        Verifica se mensagem contém áudio
        
        Args:
            message: Dados da mensagem do webhook
            
        Returns:
            True se for mensagem de áudio
            
        Example:
            >>> service.is_audio_message({"messageType": "audioMessage"})
            True
        """
        try:
            # Verificar diferentes formatos de webhook
            message_type = message.get("messageType", "").lower()
            
            # Evolution API format
            if message_type in ["audiomessage", "audio"]:
                return True
            
            # Verificar se há dados de áudio
            audio_data = message.get("audioMessage") or message.get("audio")
            if audio_data:
                return True
            
            # Verificar tipo MIME
            mime_type = message.get("mimeType", "").lower()
            if mime_type.startswith("audio/"):
                return True
            
            logger.debug("Mensagem não é áudio", 
                        message_type=message_type, 
                        has_audio_data=bool(audio_data),
                        mime_type=mime_type)
            return False
            
        except Exception as e:
            logger.error("Erro ao verificar se mensagem é áudio", error=str(e))
            return False
    
    async def download_audio(self, message: Dict[str, Any]) -> Optional[str]:
        """
        Download áudio de WhatsApp/Evolution
        
        Args:
            message: Dados da mensagem com áudio
            
        Returns:
            Caminho do arquivo local temporário ou None se falhar
        """
        try:
            # Limpar cache antigo primeiro
            self._cleanup_old_files()
            
            # Extrair informações do áudio
            audio_info = self._extract_audio_info(message)
            if not audio_info:
                logger.warning("Não foi possível extrair informações do áudio")
                return None
            
            message_id = audio_info.get("message_id")
            if not message_id:
                logger.warning("Message ID não encontrado")
                return None
            
            # Verificar cache
            if message_id in _audio_cache["files"]:
                cached_path = _audio_cache["files"][message_id]
                if os.path.exists(cached_path):
                    logger.debug("Usando áudio do cache", message_id=message_id)
                    return cached_path
            
            # Download do áudio
            audio_path = await self._download_from_evolution(audio_info)
            
            if audio_path and self.validate_audio(audio_path):
                # Adicionar ao cache
                _audio_cache["files"][message_id] = audio_path
                logger.info("Áudio baixado com sucesso", 
                           message_id=message_id, 
                           path=audio_path)
                return audio_path
            else:
                logger.warning("Falha na validação do áudio", message_id=message_id)
                return None
                
        except Exception as e:
            logger.error("Erro ao baixar áudio", error=str(e))
            return None
    
    def _extract_audio_info(self, message: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Extrai informações do áudio da mensagem
        
        Args:
            message: Dados da mensagem
            
        Returns:
            Dict com informações do áudio
        """
        try:
            # Evolution API format
            audio_data = message.get("audioMessage") or message.get("audio", {})
            
            # Extrair ID da mensagem
            message_id = (
                message.get("key", {}).get("id") or
                message.get("messageId") or
                message.get("id") or
                f"audio_{int(time.time())}"
            )
            
            # Extrair URL ou dados base64
            media_url = audio_data.get("url") or message.get("mediaUrl")
            base64_data = audio_data.get("base64") or message.get("base64")
            
            # Extrair metadados
            duration = audio_data.get("seconds", 0)
            mime_type = audio_data.get("mimetype") or message.get("mimeType", "audio/ogg")
            
            return {
                "message_id": message_id,
                "media_url": media_url,
                "base64_data": base64_data,
                "duration": duration,
                "mime_type": mime_type
            }
            
        except Exception as e:
            logger.error("Erro ao extrair informações do áudio", error=str(e))
            return None
    
    async def _download_from_evolution(self, audio_info: Dict[str, Any]) -> Optional[str]:
        """
        Download áudio via Evolution API
        
        Args:
            audio_info: Informações do áudio
            
        Returns:
            Caminho do arquivo baixado
        """
        try:
            message_id = audio_info["message_id"]
            
            # Determinar extensão do arquivo
            mime_type = audio_info.get("mime_type", "audio/ogg")
            extension = self._get_extension_from_mime(mime_type)
            
            # Caminho do arquivo temporário
            timestamp = int(time.time())
            filename = f"audio_{message_id}_{timestamp}.{extension}"
            filepath = self.temp_dir / filename
            
            # Tentar download via URL primeiro
            media_url = audio_info.get("media_url")
            if media_url:
                success = await self._download_from_url(media_url, filepath)
                if success:
                    return str(filepath)
            
            # Tentar via Evolution API endpoint
            success = await self._download_via_evolution_api(message_id, filepath)
            if success:
                return str(filepath)
            
            # Tentar decodificar base64
            base64_data = audio_info.get("base64_data")
            if base64_data:
                success = self._decode_base64_audio(base64_data, filepath)
                if success:
                    return str(filepath)
            
            logger.warning("Todas as tentativas de download falharam", message_id=message_id)
            return None
            
        except Exception as e:
            logger.error("Erro no download via Evolution", error=str(e))
            return None
    
    async def _download_from_url(self, url: str, filepath: Path) -> bool:
        """Download áudio de URL direta"""
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=self.timeout_seconds)) as session:
                async with session.get(url) as response:
                    if response.status == 200:
                        with open(filepath, 'wb') as f:
                            async for chunk in response.content.iter_chunked(8192):
                                f.write(chunk)
                        logger.debug("Download via URL concluído", url=url, filepath=str(filepath))
                        return True
                    else:
                        logger.warning("Erro no download via URL", status=response.status, url=url)
                        return False
        except Exception as e:
            logger.warning("Falha no download via URL", url=url, error=str(e))
            return False
    
    async def _download_via_evolution_api(self, message_id: str, filepath: Path) -> bool:
        """Download via endpoint da Evolution API"""
        try:
            url = f"{self.evolution_api_url}/media/{message_id}/{self.evolution_instance}"
            headers = {"apikey": self.evolution_api_key}
            
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=self.timeout_seconds)) as session:
                async with session.get(url, headers=headers) as response:
                    if response.status == 200:
                        with open(filepath, 'wb') as f:
                            async for chunk in response.content.iter_chunked(8192):
                                f.write(chunk)
                        logger.debug("Download via Evolution API concluído", message_id=message_id)
                        return True
                    else:
                        logger.warning("Erro no download via Evolution API", 
                                     status=response.status, message_id=message_id)
                        return False
        except Exception as e:
            logger.warning("Falha no download via Evolution API", message_id=message_id, error=str(e))
            return False
    
    def _decode_base64_audio(self, base64_data: str, filepath: Path) -> bool:
        """Decodifica áudio base64"""
        try:
            import base64
            
            # Remover prefixo data: se houver
            if base64_data.startswith("data:"):
                base64_data = base64_data.split(",", 1)[1]
            
            # Decodificar e salvar
            audio_bytes = base64.b64decode(base64_data)
            with open(filepath, 'wb') as f:
                f.write(audio_bytes)
            
            logger.debug("Decodificação base64 concluída", filepath=str(filepath))
            return True
            
        except Exception as e:
            logger.warning("Falha na decodificação base64", error=str(e))
            return False
    
    def _get_extension_from_mime(self, mime_type: str) -> str:
        """Converte MIME type para extensão"""
        mime_to_ext = {
            "audio/ogg": "ogg",
            "audio/mpeg": "mp3",
            "audio/mp4": "m4a",
            "audio/wav": "wav",
            "audio/opus": "opus"
        }
        return mime_to_ext.get(mime_type.lower(), "ogg")
    
    def validate_audio(self, filepath: str) -> bool:
        """
        Valida formato e duração do áudio
        
        Args:
            filepath: Caminho do arquivo de áudio
            
        Returns:
            True se áudio é válido
        """
        try:
            if not os.path.exists(filepath):
                logger.warning("Arquivo de áudio não existe", filepath=filepath)
                return False
            
            # Verificar tamanho do arquivo (máximo 50MB)
            file_size = os.path.getsize(filepath)
            if file_size > 50 * 1024 * 1024:  # 50MB
                logger.warning("Arquivo de áudio muito grande", 
                             filepath=filepath, size_mb=file_size / (1024*1024))
                return False
            
            # Verificar se arquivo não está vazio
            if file_size < 100:  # Mínimo 100 bytes
                logger.warning("Arquivo de áudio muito pequeno", 
                             filepath=filepath, size=file_size)
                return False
            
            # Verificar extensão
            extension = Path(filepath).suffix.lower().lstrip('.')
            if extension not in self.supported_formats:
                logger.warning("Formato de áudio não suportado", 
                             filepath=filepath, extension=extension)
                return False
            
            logger.debug("Áudio validado com sucesso", 
                        filepath=filepath, 
                        size_mb=round(file_size / (1024*1024), 2))
            return True
            
        except Exception as e:
            logger.error("Erro na validação do áudio", filepath=filepath, error=str(e))
            return False
    
    def _cleanup_old_files(self):
        """Remove arquivos antigos do cache"""
        try:
            current_time = time.time()
            
            # Limpar apenas a cada 10 minutos
            if current_time - _audio_cache["last_cleanup"] < 600:
                return
            
            # Remover arquivos expirados do cache
            expired_keys = []
            for message_id, filepath in _audio_cache["files"].items():
                if os.path.exists(filepath):
                    file_age = current_time - os.path.getctime(filepath)
                    if file_age > _audio_cache["ttl_seconds"]:
                        try:
                            os.remove(filepath)
                            expired_keys.append(message_id)
                            logger.debug("Arquivo de áudio expirado removido", filepath=filepath)
                        except Exception as e:
                            logger.warning("Erro ao remover arquivo expirado", filepath=filepath, error=str(e))
                else:
                    expired_keys.append(message_id)
            
            # Remover do cache
            for key in expired_keys:
                del _audio_cache["files"][key]
            
            _audio_cache["last_cleanup"] = current_time
            
            if expired_keys:
                logger.info("Limpeza de cache concluída", removed_files=len(expired_keys))
                
        except Exception as e:
            logger.error("Erro na limpeza de arquivos antigos", error=str(e))


# Singleton global
_audio_detection_service: Optional[AudioDetectionService] = None


def get_audio_detection_service() -> AudioDetectionService:
    """
    Retorna instância singleton do Audio Detection Service
    
    Returns:
        Instância configurada do serviço
    """
    global _audio_detection_service
    
    if _audio_detection_service is None:
        _audio_detection_service = AudioDetectionService()
        logger.info("Audio Detection Service inicializado")
    
    return _audio_detection_service