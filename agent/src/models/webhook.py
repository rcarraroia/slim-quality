"""
Models para webhook WhatsApp
"""
from typing import Optional
from pydantic import BaseModel, Field


class WhatsAppWebhook(BaseModel):
    """
    Payload de webhook do WhatsApp (Evolution ou Uazapi).
    
    Formato unificado para ambos provedores.
    """
    from_number: str = Field(..., alias="from", description="Número do remetente")
    body: str = Field(..., description="Conteúdo da mensagem")
    message_id: Optional[str] = Field(None, description="ID da mensagem")
    timestamp: Optional[int] = Field(None, description="Timestamp da mensagem")
    
    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "from": "5511999999999",
                "body": "Olá, quero comprar um colchão",
                "message_id": "msg_123",
                "timestamp": 1640000000
            }
        }
