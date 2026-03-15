"""Serviço de processamento de áudio"""
import base64
from ..core.openai_client import openai_client


class AudioService:
    """Serviço de áudio (Whisper + TTS)"""
    
    async def transcribe_audio(self, audio_base64: str) -> str:
        """Transcreve áudio base64 para texto"""
        audio_bytes = base64.b64decode(audio_base64)
        text = await openai_client.transcribe_audio(audio_bytes)
        return text
    
    async def generate_speech(self, text: str) -> str:
        """Gera áudio a partir de texto (retorna base64)"""
        audio_bytes = await openai_client.generate_speech(text)
        audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
        return audio_base64


# Instância global
audio_service = AudioService()
