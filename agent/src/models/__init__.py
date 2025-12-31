"""
Pydantic models para API
"""
from .webhook import WhatsAppWebhook
from .chat import ChatRequest, ChatResponse

__all__ = [
    "WhatsAppWebhook",
    "ChatRequest",
    "ChatResponse",
]
