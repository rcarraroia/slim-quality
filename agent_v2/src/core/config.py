"""Configurações do BIA v2 Agent"""
import os
from typing import Optional
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    """Configurações da aplicação"""
    
    # Supabase
    supabase_url: str
    supabase_service_role_key: str
    
    # Redis
    redis_url: str = "redis://bia-redis:6379"
    
    # OpenAI
    openai_api_key: str
    
    # Evolution API
    evolution_api_url: str
    evolution_api_key: str
    
    # Webhook Security
    webhook_secret_token: str
    
    # Environment
    environment: str = "production"
    log_level: str = "INFO"
    
    # CORS
    frontend_url: str = "https://slimquality.com.br"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Instância global de configurações
settings = Settings()


def validate_settings():
    """Valida se todas as variáveis obrigatórias estão configuradas"""
    required_vars = [
        "supabase_url",
        "supabase_service_role_key",
        "openai_api_key",
        "evolution_api_url",
        "evolution_api_key",
        "webhook_secret_token"
    ]
    
    missing = []
    for var in required_vars:
        if not getattr(settings, var, None):
            missing.append(var.upper())
    
    if missing:
        raise ValueError(f"Variáveis de ambiente obrigatórias não configuradas: {', '.join(missing)}")
    
    return True
