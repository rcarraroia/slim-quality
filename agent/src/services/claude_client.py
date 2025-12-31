"""
Cliente Claude AI com retry logic
"""
from typing import Optional
import structlog
from langchain_anthropic import ChatAnthropic

try:
    from ..config import get_settings
except ImportError:
    # Fallback para importação direta quando executado como script
    import sys
    import os
    sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
    from config import get_settings

logger = structlog.get_logger(__name__)

# Cliente singleton
_claude_client: Optional[ChatAnthropic] = None


def get_claude_client() -> ChatAnthropic:
    """
    Retorna cliente Claude singleton.
    
    Returns:
        ChatAnthropic configurado
    """
    global _claude_client
    
    if _claude_client is None:
        logger.info("Inicializando cliente Claude AI")
        settings = get_settings()
        _claude_client = ChatAnthropic(
            model=settings.claude_model,
            api_key=settings.claude_api_key,
            temperature=0.7,
            max_retries=3,  # Retry automático
            timeout=30.0
        )
    
    return _claude_client

