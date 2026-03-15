"""Cliente OpenAI para GPT, Whisper e TTS"""
from openai import AsyncOpenAI
from typing import Optional, List, Dict, Any
from .config import settings


class OpenAIClient:
    """Cliente OpenAI"""
    
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
    
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: str = "gpt-4o-mini",
        temperature: float = 0.7,
        max_tokens: int = 500
    ) -> str:
        """Gera resposta com GPT"""
        response = await self.client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens
        )
        return response.choices[0].message.content
    
    async def transcribe_audio(self, audio_bytes: bytes, filename: str = "audio.ogg") -> str:
        """Transcreve áudio com Whisper (em memória)"""
        from io import BytesIO
        
        audio_file = BytesIO(audio_bytes)
        audio_file.name = filename
        
        response = await self.client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file
        )
        return response.text
    
    async def generate_speech(
        self,
        text: str,
        voice: str = "nova",
        model: str = "tts-1"
    ) -> bytes:
        """Gera áudio com TTS (retorna bytes em memória)"""
        response = await self.client.audio.speech.create(
            model=model,
            voice=voice,
            input=text
        )
        return response.content


# Instância global
openai_client = OpenAIClient()
