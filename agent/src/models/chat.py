"""
Models para chat endpoint
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """Request para endpoint de chat"""
    lead_id: str = Field(..., description="ID do lead (phone number)")
    message: str = Field(..., description="Mensagem do usuário")
    
    class Config:
        json_schema_extra = {
            "example": {
                "lead_id": "5511999999999",
                "message": "Olá, quero comprar um colchão"
            }
        }


class ChatResponse(BaseModel):
    """Response do endpoint de chat"""
    response: str = Field(..., description="Resposta do agente")
    intent: str = Field(..., description="Intenção detectada")
    lead_data: Optional[Dict[str, Any]] = Field(None, description="Dados capturados do lead")
    products_recommended: Optional[List[Dict[str, Any]]] = Field(None, description="Produtos recomendados")
    
    class Config:
        json_schema_extra = {
            "example": {
                "response": "Olá! Sou a BIA, assistente da Slim Quality 😊",
                "intent": "discovery",
                "lead_data": {"nome": "João"},
                "products_recommended": []
            }
        }
