"""Serviço de integração com Evolution API"""
import httpx
from typing import Optional, Dict, Any
from ..core.config import settings


class EvolutionService:
    """Serviço Evolution API"""
    
    def __init__(self):
        self.base_url = settings.evolution_api_url
        self.api_key = settings.evolution_api_key
        self.headers = {
            "apikey": self.api_key,
            "Content-Type": "application/json"
        }
    
    async def create_instance(self, instance_name: str) -> Dict[str, Any]:
        """Cria instância Evolution API"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/instance/create",
                headers=self.headers,
                json={
                    "instanceName": instance_name,
                    "qrcode": True
                }
            )
            response.raise_for_status()
            return response.json()
    
    async def get_qr_code(self, instance_name: str) -> Optional[str]:
        """Busca QR Code da instância"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/instance/connect/{instance_name}",
                headers=self.headers
            )
            response.raise_for_status()
            data = response.json()
            return data.get("qrcode", {}).get("base64")
    
    async def send_text(self, instance_name: str, phone: str, text: str) -> Dict[str, Any]:
        """Envia mensagem de texto"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/message/sendText/{instance_name}",
                headers=self.headers,
                json={
                    "number": phone,
                    "text": text
                }
            )
            response.raise_for_status()
            return response.json()

    
    async def send_audio(self, instance_name: str, phone: str, audio_base64: str) -> Dict[str, Any]:
        """Envia mensagem de áudio"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/message/sendWhatsAppAudio/{instance_name}",
                headers=self.headers,
                json={
                    "number": phone,
                    "audioMessage": {
                        "audio": audio_base64
                    }
                }
            )
            response.raise_for_status()
            return response.json()
    
    async def disconnect_instance(self, instance_name: str) -> Dict[str, Any]:
        """Desconecta instância"""
        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{self.base_url}/instance/logout/{instance_name}",
                headers=self.headers
            )
            response.raise_for_status()
            return response.json()
    
    async def get_instance_status(self, instance_name: str) -> Dict[str, Any]:
        """Busca status da instância"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/instance/connectionState/{instance_name}",
                headers=self.headers
            )
            response.raise_for_status()
            return response.json()


# Instância global
evolution_service = EvolutionService()
