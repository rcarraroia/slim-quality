"""
AI Service - Gerenciamento de múltiplos modelos de IA

Suporta OpenAI (principal), Claude (opcional) e Gemini (fallback)
com sistema de fallback automático em caso de falha.
"""

import logging
from typing import Optional, Dict, Any, List
from enum import Enum
import openai
from langchain_anthropic import ChatAnthropic

try:
    # Usar biblioteca disponível (deprecated mas funcional)
    import google.generativeai as genai
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False
    genai = None

try:
    from ..config import get_settings
except ImportError:
    # Fallback para importação direta quando executado como script
    import sys
    import os
    sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
    from config import get_settings

logger = logging.getLogger(__name__)

class AIProvider(Enum):
    """Provedores de IA disponíveis"""
    OPENAI = "openai"
    CLAUDE = "claude"
    GEMINI = "gemini"

class AIService:
    """
    Serviço de IA com suporte a múltiplos provedores e fallback automático
    
    Ordem de prioridade:
    1. OpenAI (principal)
    2. Claude (opcional, se configurado)
    3. Gemini (fallback)
    """
    
    def __init__(self):
        """Inicializa o serviço de IA"""
        self.settings = get_settings()
        self._clients = {}
        self._initialize_clients()
        
    def _initialize_clients(self):
        """Inicializa os clientes de IA disponíveis"""
        
        # OpenAI (obrigatório)
        try:
            self._clients[AIProvider.OPENAI] = openai.OpenAI(
                api_key=self.settings.openai_api_key
            )
            logger.info("Cliente OpenAI inicializado")
        except Exception as e:
            logger.error(f"Erro ao inicializar OpenAI: {e}")
            
        # Claude (opcional)
        if self.settings.claude_api_key:
            try:
                self._clients[AIProvider.CLAUDE] = ChatAnthropic(
                    model=self.settings.claude_model,
                    api_key=self.settings.claude_api_key,
                    temperature=0.7,
                    max_retries=3,
                    timeout=30.0
                )
                logger.info("Cliente Claude inicializado")
            except Exception as e:
                logger.error(f"Erro ao inicializar Claude: {e}")
        
        # Gemini (fallback) - usando biblioteca disponível
        if GENAI_AVAILABLE and self.settings.gemini_api_key:
            try:
                # Usar API atual disponível (deprecated mas funcional)
                genai.configure(api_key=self.settings.gemini_api_key)
                self._clients[AIProvider.GEMINI] = genai.GenerativeModel(
                    self.settings.gemini_model
                )
                logger.info("Cliente Gemini inicializado (biblioteca deprecated)")
            except Exception as e:
                logger.error(f"Erro ao inicializar Gemini: {e}")
        elif not GENAI_AVAILABLE:
            logger.warning("Google Generative AI não disponível - Gemini desabilitado")
    
    def get_available_providers(self) -> List[AIProvider]:
        """Retorna lista de provedores disponíveis em ordem de prioridade"""
        providers = []
        
        # Ordem de prioridade
        if AIProvider.OPENAI in self._clients:
            providers.append(AIProvider.OPENAI)
        if AIProvider.CLAUDE in self._clients:
            providers.append(AIProvider.CLAUDE)
        if AIProvider.GEMINI in self._clients:
            providers.append(AIProvider.GEMINI)
            
        return providers
    
    async def generate_text(self, 
                          prompt: str, 
                          max_tokens: int = 1000,
                          temperature: float = 0.7,
                          preferred_provider: Optional[AIProvider] = None) -> Dict[str, Any]:
        """
        Gera texto usando IA com fallback automático
        
        Args:
            prompt: Prompt para geração
            max_tokens: Número máximo de tokens
            temperature: Temperatura para geração
            preferred_provider: Provedor preferido (opcional)
            
        Returns:
            Dict com 'text', 'provider' e 'usage'
            
        Raises:
            RuntimeError: Se nenhum provedor estiver disponível
        """
        providers = self.get_available_providers()
        
        # Se provedor preferido especificado, tentar primeiro
        if preferred_provider and preferred_provider in providers:
            providers.remove(preferred_provider)
            providers.insert(0, preferred_provider)
        
        if not providers:
            raise RuntimeError("Nenhum provedor de IA disponível")
        
        last_error = None
        
        for provider in providers:
            try:
                logger.info(f"Tentando gerar texto com {provider.value}")
                
                if provider == AIProvider.OPENAI:
                    result = await self._generate_openai(prompt, max_tokens, temperature)
                elif provider == AIProvider.CLAUDE:
                    result = await self._generate_claude(prompt, max_tokens, temperature)
                elif provider == AIProvider.GEMINI:
                    result = await self._generate_gemini(prompt, max_tokens, temperature)
                else:
                    continue
                
                result['provider'] = provider.value
                logger.info(f"Texto gerado com sucesso usando {provider.value}")
                return result
                
            except Exception as e:
                logger.warning(f"Falha ao gerar com {provider.value}: {e}")
                last_error = e
                continue
        
        # Se chegou aqui, todos os provedores falharam
        raise RuntimeError(f"Todos os provedores falharam. Último erro: {last_error}")
    
    async def _generate_openai(self, prompt: str, max_tokens: int, temperature: float) -> Dict[str, Any]:
        """Gera texto usando OpenAI"""
        client = self._clients[AIProvider.OPENAI]
        
        response = client.chat.completions.create(
            model=self.settings.openai_model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens,
            temperature=temperature
        )
        
        return {
            'text': response.choices[0].message.content,
            'usage': {
                'prompt_tokens': response.usage.prompt_tokens,
                'completion_tokens': response.usage.completion_tokens,
                'total_tokens': response.usage.total_tokens
            }
        }
    
    async def _generate_claude(self, prompt: str, max_tokens: int, temperature: float) -> Dict[str, Any]:
        """Gera texto usando Claude via LangChain"""
        client = self._clients[AIProvider.CLAUDE]
        
        # ChatAnthropic usa interface LangChain
        from langchain_core.messages import HumanMessage
        
        response = await client.ainvoke([HumanMessage(content=prompt)])
        
        return {
            'text': response.content,
            'usage': {
                'prompt_tokens': 0,  # LangChain não expõe usage diretamente
                'completion_tokens': 0,
                'total_tokens': 0
            }
        }
    
    async def _generate_gemini(self, prompt: str, max_tokens: int, temperature: float) -> Dict[str, Any]:
        """Gera texto usando Gemini com biblioteca disponível"""
        if not GENAI_AVAILABLE:
            raise RuntimeError("Google Generative AI não está disponível")
            
        client = self._clients[AIProvider.GEMINI]
        
        try:
            # API atual disponível (deprecated mas funcional)
            generation_config = genai.types.GenerationConfig(
                max_output_tokens=max_tokens,
                temperature=temperature
            )
            
            response = client.generate_content(
                prompt,
                generation_config=generation_config
            )
            
            return {
                'text': response.text,
                'usage': {
                    'prompt_tokens': response.usage_metadata.prompt_token_count if hasattr(response, 'usage_metadata') else 0,
                    'completion_tokens': response.usage_metadata.candidates_token_count if hasattr(response, 'usage_metadata') else 0,
                    'total_tokens': response.usage_metadata.total_token_count if hasattr(response, 'usage_metadata') else 0
                }
            }
        except Exception as e:
            logger.error(f"Erro na API Gemini: {e}")
            raise
    
    def get_provider_status(self) -> Dict[str, bool]:
        """Retorna status de cada provedor"""
        return {
            'openai': AIProvider.OPENAI in self._clients,
            'claude': AIProvider.CLAUDE in self._clients,
            'gemini': AIProvider.GEMINI in self._clients
        }


# Instância singleton
_ai_service: Optional[AIService] = None

def get_ai_service() -> AIService:
    """Retorna instância singleton do AIService"""
    global _ai_service
    if _ai_service is None:
        _ai_service = AIService()
    return _ai_service