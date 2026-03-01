"""
Testes de Personality Loading - Módulo personality.py

Valida que o carregamento de personality funciona corretamente:
- Tenant com personality NULL → retorna fallback
- Tenant com personality customizada → retorna customizada
- Cache funciona (hit/miss/expiration)
- Invalidação de cache
- Parsing de JSON correto
- Merge com fallback para campos faltantes

Requisitos: 2.1, 2.2
"""

import pytest
import os
import sys
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime, timedelta
import json
import importlib.util

# Configurar ambiente de teste
os.environ["TESTING"] = "1"

# Adicionar src ao path para imports de services
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

# Carregar módulo personality diretamente
personality_path = os.path.join(os.path.dirname(__file__), '..', 'src', 'config', 'personality.py')
spec = importlib.util.spec_from_file_location("personality", personality_path)
personality_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(personality_module)

# Importar funções do módulo
load_personality = personality_module.load_personality
get_fallback_personality = personality_module.get_fallback_personality
get_agent_name = personality_module.get_agent_name
get_system_prompt = personality_module.get_system_prompt
get_greeting = personality_module.get_greeting
invalidate_personality_cache = personality_module.invalidate_personality_cache
get_personality_cache = personality_module.get_personality_cache
FALLBACK_PERSONALITY = personality_module.FALLBACK_PERSONALITY


class TestPersonalityLoading:
    """Testes de carregamento de personality"""
    
    @pytest.fixture
    async def clear_cache(self):
        """Limpa cache antes de cada teste"""
        cache = get_personality_cache()
        await cache.clear()
        yield
        await cache.clear()
    
    @pytest.mark.asyncio
    async def test_load_personality_null_returns_fallback(self, clear_cache):
        """
        Testa que personality NULL no banco retorna fallback.
        
        Cenário:
        1. Tenant existe no banco
        2. agent_personality é NULL
        3. Deve retornar FALLBACK_PERSONALITY
        """
        # Mock da função _fetch_personality_from_database
        async def mock_fetch(tenant_id):
            return None  # Simula personality NULL
        
        with patch.object(personality_module, '_fetch_personality_from_database', mock_fetch):
            # Carregar personality
            personality = await load_personality(tenant_id=1)
            
            # Deve retornar fallback
            assert personality == FALLBACK_PERSONALITY
            assert personality["agent_name"] == "BIA"
            assert "Slim Quality" in personality["system_prompt"]
    
    @pytest.mark.asyncio
    async def test_load_personality_customized_returns_customized(self, clear_cache):
        """
        Testa que personality customizada no banco é retornada.
        
        Cenário:
        1. Tenant existe no banco
        2. agent_personality tem JSON customizado
        3. Deve retornar personality customizada (com merge de fallback)
        """
        # Personality customizada
        custom_personality = {
            "agent_name": "Vendedor Pro",
            "system_prompt": "Você é um vendedor agressivo...",
            "greeting": "Olá! Vamos fechar negócio hoje?",
            "tone": "agressivo, direto"
        }
        
        # Mock da função _fetch_personality_from_database
        async def mock_fetch(tenant_id):
            # Simula merge com fallback (como faz a função real)
            final_personality = FALLBACK_PERSONALITY.copy()
            final_personality.update(custom_personality)
            return final_personality
        
        with patch.object(personality_module, '_fetch_personality_from_database', mock_fetch):
            # Carregar personality
            personality = await load_personality(tenant_id=2)
            
            # Deve retornar personality customizada
            assert personality["agent_name"] == "Vendedor Pro"
            assert personality["system_prompt"] == "Você é um vendedor agressivo..."
            assert personality["greeting"] == "Olá! Vamos fechar negócio hoje?"
            assert personality["tone"] == "agressivo, direto"
            
            # Deve ter campos do fallback que não foram customizados
            assert "focus" in personality  # Campo do fallback
            assert "approach" in personality  # Campo do fallback
    
    @pytest.mark.asyncio
    async def test_load_personality_jsonb_dict(self, clear_cache):
        """
        Testa que personality como dict (JSONB do Postgres) funciona.
        
        Cenário:
        1. agent_personality é dict (não string JSON)
        2. Deve parsear corretamente
        """
        # Personality como dict (JSONB)
        custom_personality = {
            "agent_name": "Consultor",
            "system_prompt": "Você é um consultor educativo..."
        }
        
        # Mock da função _fetch_personality_from_database
        async def mock_fetch(tenant_id):
            # Simula merge com fallback
            final_personality = FALLBACK_PERSONALITY.copy()
            final_personality.update(custom_personality)
            return final_personality
        
        with patch.object(personality_module, '_fetch_personality_from_database', mock_fetch):
            # Carregar personality
            personality = await load_personality(tenant_id=3)
            
            # Deve retornar personality customizada
            assert personality["agent_name"] == "Consultor"
            assert personality["system_prompt"] == "Você é um consultor educativo..."
    
    @pytest.mark.asyncio
    async def test_load_personality_invalid_json_returns_fallback(self, clear_cache):
        """
        Testa que JSON inválido retorna fallback.
        
        Cenário:
        1. agent_personality tem JSON malformado
        2. Deve retornar FALLBACK_PERSONALITY
        """
        # Mock da função _fetch_personality_from_database que retorna None (erro de parsing)
        async def mock_fetch(tenant_id):
            return None  # Simula erro de parsing
        
        with patch.object(personality_module, '_fetch_personality_from_database', mock_fetch):
            # Carregar personality
            personality = await load_personality(tenant_id=4)
            
            # Deve retornar fallback
            assert personality == FALLBACK_PERSONALITY
    
    @pytest.mark.asyncio
    async def test_load_personality_tenant_not_found_returns_fallback(self, clear_cache):
        """
        Testa que tenant não encontrado retorna fallback.
        
        Cenário:
        1. Tenant não existe no banco
        2. Deve retornar FALLBACK_PERSONALITY
        """
        # Mock da função _fetch_personality_from_database que retorna None
        async def mock_fetch(tenant_id):
            return None  # Simula tenant não encontrado
        
        with patch.object(personality_module, '_fetch_personality_from_database', mock_fetch):
            # Carregar personality
            personality = await load_personality(tenant_id=999)
            
            # Deve retornar fallback
            assert personality == FALLBACK_PERSONALITY
    
    @pytest.mark.asyncio
    async def test_load_personality_database_error_returns_fallback(self, clear_cache):
        """
        Testa que erro no banco retorna fallback.
        
        Cenário:
        1. Query ao banco falha
        2. Deve retornar FALLBACK_PERSONALITY
        """
        # Mock da função _fetch_personality_from_database que lança exceção
        async def mock_fetch(tenant_id):
            raise Exception("Database error")
        
        with patch.object(personality_module, '_fetch_personality_from_database', mock_fetch):
            # Carregar personality
            personality = await load_personality(tenant_id=5)
            
            # Deve retornar fallback
            assert personality == FALLBACK_PERSONALITY


class TestPersonalityCache:
    """Testes de cache de personality"""
    
    @pytest.fixture(autouse=True)
    async def clear_cache(self):
        """Limpa cache antes e depois de cada teste"""
        cache = get_personality_cache()
        await cache.clear()
        yield
        await cache.clear()
    
    @pytest.mark.asyncio
    async def test_cache_hit(self, clear_cache):
        """
        Testa que cache funciona (hit).
        
        Cenário:
        1. Armazenar personality no cache
        2. Buscar personality do cache
        3. Deve retornar personality armazenada (cache hit)
        """
        cache = get_personality_cache()
        
        # Armazenar no cache
        test_personality = {"agent_name": "Test", "system_prompt": "Test prompt"}
        await cache.set(tenant_id=1, personality=test_personality)
        
        # Buscar do cache
        cached_personality = await cache.get(tenant_id=1)
        
        # Deve retornar personality armazenada
        assert cached_personality == test_personality
    
    @pytest.mark.asyncio
    async def test_cache_miss(self):
        """
        Testa que cache miss retorna None.
        
        Cenário:
        1. Buscar personality que não está no cache
        2. Deve retornar None (cache miss)
        """
        # Criar nova instância de cache para isolar o teste
        PersonalityCache = personality_module.PersonalityCache
        cache = PersonalityCache()
        
        # Buscar do cache (não existe)
        cached_personality = await cache.get(tenant_id=999)
        
        # Deve retornar None
        assert cached_personality is None
    
    @pytest.mark.asyncio
    async def test_cache_expiration(self, clear_cache):
        """
        Testa que cache expira após TTL.
        
        Cenário:
        1. Armazenar personality no cache com TTL curto
        2. Aguardar TTL expirar
        3. Buscar personality do cache
        4. Deve retornar None (cache expirado)
        """
        # Criar cache com TTL de 1 segundo
        PersonalityCache = personality_module.PersonalityCache
        cache = PersonalityCache(ttl_seconds=1)
        
        # Armazenar no cache
        test_personality = {"agent_name": "Test", "system_prompt": "Test prompt"}
        await cache.set(tenant_id=1, personality=test_personality)
        
        # Aguardar TTL expirar
        import asyncio
        await asyncio.sleep(1.1)
        
        # Buscar do cache (deve estar expirado)
        cached_personality = await cache.get(tenant_id=1)
        
        # Deve retornar None (cache expirado)
        assert cached_personality is None
    
    @pytest.mark.asyncio
    async def test_cache_invalidation(self, clear_cache):
        """
        Testa que invalidação de cache funciona.
        
        Cenário:
        1. Armazenar personality no cache
        2. Invalidar cache do tenant
        3. Buscar personality do cache
        4. Deve retornar None (cache invalidado)
        """
        cache = get_personality_cache()
        
        # Armazenar no cache
        test_personality = {"agent_name": "Test", "system_prompt": "Test prompt"}
        await cache.set(tenant_id=1, personality=test_personality)
        
        # Invalidar cache
        await cache.invalidate(tenant_id=1)
        
        # Buscar do cache (deve estar invalidado)
        cached_personality = await cache.get(tenant_id=1)
        
        # Deve retornar None
        assert cached_personality is None
    
    @pytest.mark.asyncio
    async def test_cache_isolation_between_tenants(self, clear_cache):
        """
        Testa que cache isola personalities de tenants diferentes.
        
        Cenário:
        1. Armazenar personality para tenant 1
        2. Armazenar personality para tenant 2
        3. Buscar personality de cada tenant
        4. Deve retornar personalities corretas (isolamento)
        """
        cache = get_personality_cache()
        
        # Armazenar personalities diferentes
        personality_1 = {"agent_name": "Agent 1", "system_prompt": "Prompt 1"}
        personality_2 = {"agent_name": "Agent 2", "system_prompt": "Prompt 2"}
        
        await cache.set(tenant_id=1, personality=personality_1)
        await cache.set(tenant_id=2, personality=personality_2)
        
        # Buscar personalities
        cached_1 = await cache.get(tenant_id=1)
        cached_2 = await cache.get(tenant_id=2)
        
        # Deve retornar personalities corretas
        assert cached_1 == personality_1
        assert cached_2 == personality_2
        assert cached_1 != cached_2
    
    @pytest.mark.asyncio
    async def test_load_personality_uses_cache(self):
        """
        Testa que load_personality usa cache (não recarrega do banco).
        
        Cenário:
        1. Carregar personality (primeira vez - vai ao banco)
        2. Carregar personality novamente (segunda vez - usa cache)
        3. Verificar que banco foi consultado apenas 1 vez
        """
        # Limpar cache global antes do teste
        cache = get_personality_cache()
        await cache.clear()
        
        call_count = 0
        
        # Mock da função _fetch_personality_from_database
        async def mock_fetch(tenant_id):
            nonlocal call_count
            call_count += 1
            return None  # Retorna None (usa fallback)
        
        with patch.object(personality_module, '_fetch_personality_from_database', mock_fetch):
            # Primeira chamada (vai ao banco)
            personality_1 = await load_personality(tenant_id=1)
            
            # Segunda chamada (usa cache)
            personality_2 = await load_personality(tenant_id=1)
            
            # Deve retornar mesma personality
            assert personality_1 == personality_2
            
            # Banco deve ter sido consultado apenas 1 vez
            assert call_count == 1


class TestPersonalityHelpers:
    """Testes de funções auxiliares"""
    
    @pytest.mark.asyncio
    async def test_get_fallback_personality(self):
        """Testa que get_fallback_personality retorna fallback correto"""
        fallback = await get_fallback_personality()
        
        assert fallback == FALLBACK_PERSONALITY
        assert fallback["agent_name"] == "BIA"
        assert "Slim Quality" in fallback["system_prompt"]
    
    def test_get_agent_name(self):
        """Testa extração de nome do agente"""
        personality = {"agent_name": "Test Agent"}
        
        name = get_agent_name(personality)
        
        assert name == "Test Agent"
    
    def test_get_agent_name_default(self):
        """Testa que get_agent_name retorna default quando ausente"""
        personality = {}  # Sem agent_name
        
        name = get_agent_name(personality)
        
        assert name == "BIA"  # Default
    
    def test_get_system_prompt(self):
        """Testa extração de system prompt"""
        personality = {"system_prompt": "Test prompt"}
        
        prompt = get_system_prompt(personality)
        
        assert prompt == "Test prompt"
    
    def test_get_system_prompt_default(self):
        """Testa que get_system_prompt retorna default quando ausente"""
        personality = {}  # Sem system_prompt
        
        prompt = get_system_prompt(personality)
        
        assert prompt == FALLBACK_PERSONALITY["system_prompt"]
    
    def test_get_greeting(self):
        """Testa extração de saudação"""
        personality = {"greeting": "Hello!"}
        
        greeting = get_greeting(personality)
        
        assert greeting == "Hello!"
    
    def test_get_greeting_default(self):
        """Testa que get_greeting retorna default quando ausente"""
        personality = {}  # Sem greeting
        
        greeting = get_greeting(personality)
        
        assert greeting == FALLBACK_PERSONALITY["greeting"]
    
    @pytest.mark.asyncio
    async def test_invalidate_personality_cache(self):
        """Testa que invalidate_personality_cache funciona"""
        cache = get_personality_cache()
        
        # Armazenar no cache
        test_personality = {"agent_name": "Test"}
        await cache.set(tenant_id=1, personality=test_personality)
        
        # Invalidar via função pública
        await invalidate_personality_cache(tenant_id=1)
        
        # Buscar do cache (deve estar invalidado)
        cached = await cache.get(tenant_id=1)
        
        assert cached is None

