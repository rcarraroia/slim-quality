"""
Configurações e variáveis de ambiente
"""
import os
from typing import Optional
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Forçar carregamento do .env
load_dotenv()

class Settings(BaseSettings):
    """Configurações da aplicação"""
    
    # OpenAI (Principal)
    openai_api_key: str
    openai_model: str = "gpt-4o"
    
    # Claude AI (Opcional)
    claude_api_key: Optional[str] = None
    claude_model: str = "claude-3-5-sonnet-20241022"
    
    # Google Gemini (Fallback)
    gemini_api_key: Optional[str] = None
    gemini_model: str = "gemini-1.5-pro"
    
    # Supabase
    supabase_url: str
    supabase_service_key: str
    
    # Redis
    redis_url: str = "redis://localhost:6379"
    
    # MCP Gateway
    mcp_gateway_url: str = "http://mcp-gateway:8080"
    
    # Uazapi
    uazapi_url: Optional[str] = None
    uazapi_instance_id: Optional[str] = None
    uazapi_api_key: Optional[str] = None
    
    # Evolution API
    evolution_url: str = "https://slimquality-evolution-api.wpjtfd.easypanel.host"
    evolution_api_key: Optional[str] = None
    evolution_instance: str = "Slim Quality"
    
    # Google Workspace
    google_client_id: Optional[str] = None
    google_client_secret: Optional[str] = None
    google_credentials_json: Optional[str] = None
    
    # App
    debug: bool = False
    log_level: str = "INFO"
    environment: str = "development"
    
    class Config:
        env_file = ".env.test" if os.getenv("TESTING") else ".env"
        case_sensitive = False
        # Não validar no import
        validate_assignment = False


# Lazy loading - não instanciar no import
_settings: Optional[Settings] = None


def get_settings() -> Settings:
    """
    Retorna instância singleton de Settings.
    
    Lazy loading para evitar erro se .env não existir.
    """
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings

