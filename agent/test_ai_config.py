#!/usr/bin/env python3
"""
Teste de configuração de IA - Validar múltiplos provedores

Testa se OpenAI (principal), Claude (opcional) e Gemini (fallback) 
estão configurados corretamente.
"""

import asyncio
import sys
import os

# Adicionar diretório src ao path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from src.config import get_settings
from src.services.ai_service import get_ai_service, AIProvider

async def test_ai_configuration():
    """Testa configuração dos provedores de IA"""
    
    print("🤖 TESTE DE CONFIGURAÇÃO DE IA")
    print("=" * 50)
    
    try:
        # Testar configurações
        settings = get_settings()
        print(f"✅ Configurações carregadas")
        
        # Verificar variáveis de ambiente
        print(f"\n📋 VARIÁVEIS DE AMBIENTE:")
        print(f"OpenAI API Key: {'✅ Configurada' if settings.openai_api_key else '❌ Não configurada'}")
        print(f"Claude API Key: {'✅ Configurada' if settings.claude_api_key else '⚠️ Opcional (não configurada)'}")
        print(f"Gemini API Key: {'✅ Configurada' if settings.gemini_api_key else '⚠️ Fallback (não configurado)'}")
        
        # Testar serviço de IA
        ai_service = get_ai_service()
        print(f"\n🔧 SERVIÇO DE IA:")
        
        # Status dos provedores
        status = ai_service.get_provider_status()
        print(f"OpenAI: {'✅ Ativo' if status['openai'] else '❌ Inativo'}")
        print(f"Claude: {'✅ Ativo' if status['claude'] else '⚠️ Inativo (opcional)'}")
        print(f"Gemini: {'✅ Ativo' if status['gemini'] else '⚠️ Inativo (fallback)'}")
        
        # Provedores disponíveis
        available = ai_service.get_available_providers()
        print(f"\n📡 PROVEDORES DISPONÍVEIS:")
        for i, provider in enumerate(available, 1):
            print(f"{i}. {provider.value.upper()}")
        
        if not available:
            print("❌ NENHUM PROVEDOR DISPONÍVEL!")
            return False
        
        # Teste simples de geração
        print(f"\n🧪 TESTE DE GERAÇÃO:")
        try:
            result = await ai_service.generate_text(
                "Responda apenas 'OK' se você está funcionando.",
                max_tokens=10,
                temperature=0.1
            )
            
            print(f"✅ Geração bem-sucedida!")
            print(f"Provedor usado: {result['provider'].upper()}")
            print(f"Resposta: {result['text'][:50]}...")
            print(f"Tokens: {result['usage']['total_tokens']}")
            
        except Exception as e:
            print(f"❌ Erro na geração: {e}")
            return False
        
        print(f"\n🎉 CONFIGURAÇÃO VÁLIDA!")
        return True
        
    except Exception as e:
        print(f"❌ ERRO NA CONFIGURAÇÃO: {e}")
        return False

if __name__ == "__main__":
    success = asyncio.run(test_ai_configuration())
    sys.exit(0 if success else 1)