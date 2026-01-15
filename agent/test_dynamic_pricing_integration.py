"""
Teste de Integração: Preços Dinâmicos no Prompt do Agente

Este teste valida que:
1. Cache de preços é atualizado com valores do banco
2. Função _build_sicc_prompt usa preços do cache
3. Prompt final contém preços atualizados (não fallback antigo)
"""

import asyncio
import sys
import os

# Adicionar path do projeto
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from services.dynamic_pricing_service import get_pricing_service, _price_cache
from services.sicc.sicc_service import get_sicc_service


async def test_dynamic_pricing_integration():
    """
    Testa integração completa de preços dinâmicos
    """
    print("=" * 80)
    print("TESTE DE INTEGRAÇÃO: PREÇOS DINÂMICOS NO PROMPT")
    print("=" * 80)
    
    # FASE 1: Buscar preços do banco e atualizar cache
    print("\n[FASE 1] Buscando preços do banco...")
    pricing_service = get_pricing_service()
    
    try:
        prices = await pricing_service.get_current_prices()
        print(f"✅ Preços obtidos: {prices}")
        
        # Validar que são os preços NOVOS (não antigos)
        expected_prices = {
            "solteiro": 425900,  # R$ 4.259,00
            "padrao": 440000,    # R$ 4.400,00
            "queen": 489000,     # R$ 4.890,00
            "king": 589900       # R$ 5.899,00
        }
        
        all_correct = True
        for product_type, expected_price in expected_prices.items():
            actual_price = prices.get(product_type)
            if actual_price == expected_price:
                print(f"   ✅ {product_type}: R$ {actual_price/100:.2f} (CORRETO)")
            else:
                print(f"   ❌ {product_type}: R$ {actual_price/100:.2f} (ESPERADO: R$ {expected_price/100:.2f})")
                all_correct = False
        
        if not all_correct:
            print("\n❌ FALHA: Preços do banco não estão atualizados!")
            return False
            
    except Exception as e:
        print(f"❌ ERRO ao buscar preços: {e}")
        return False
    
    # FASE 2: Verificar cache
    print("\n[FASE 2] Verificando cache de preços...")
    cache_data = _price_cache.get("data", {})
    
    if not cache_data:
        print("❌ FALHA: Cache está vazio!")
        return False
    
    print(f"✅ Cache contém {len(cache_data)} produtos")
    for product_type, price_cents in cache_data.items():
        print(f"   - {product_type}: R$ {price_cents/100:.2f}")
    
    # FASE 3: Construir prompt e verificar preços
    print("\n[FASE 3] Construindo prompt do agente...")
    sicc_service = get_sicc_service()
    
    try:
        # Simular contexto de mensagem
        test_message = "Quanto custa o colchão Queen?"
        test_context = {
            "message": test_message,
            "user_id": "test_user",
            "platform": "test",
            "customer_context": {
                "is_returning_customer": False
            }
        }
        
        # Construir prompt (função privada, mas podemos acessar)
        prompt = sicc_service._build_sicc_prompt(
            message=test_message,
            user_context=test_context,
            memories=[],
            patterns=[]
        )
        
        print("✅ Prompt construído com sucesso")
        print("\n[VERIFICANDO PREÇOS NO PROMPT]")
        
        # Verificar se prompt contém preços NOVOS
        new_prices_check = {
            "4.259": "Solteiro",
            "4.400": "Padrão",
            "4.890": "Queen",
            "5.899": "King"
        }
        
        old_prices_check = {
            "3.190": "Solteiro (ANTIGO)",
            "3.290": "Padrão (ANTIGO)",
            "3.490": "Queen (ANTIGO)",
            "4.890": "King (pode ser antigo ou novo)"  # King não mudou
        }
        
        has_new_prices = False
        has_old_prices = False
        
        for price, label in new_prices_check.items():
            if price in prompt:
                print(f"   ✅ Encontrado preço NOVO: R$ {price} ({label})")
                has_new_prices = True
        
        for price, label in old_prices_check.items():
            if price in prompt and price not in ["4.890"]:  # Ignorar King que não mudou
                print(f"   ❌ Encontrado preço ANTIGO: R$ {price} ({label})")
                has_old_prices = True
        
        # Mostrar trecho do prompt com preços
        print("\n[TRECHO DO PROMPT COM PREÇOS]")
        lines = prompt.split("\n")
        for i, line in enumerate(lines):
            if "R$" in line and any(p in line for p in ["Solteiro", "Padrão", "Queen", "King"]):
                print(f"   {line.strip()}")
        
        # VALIDAÇÃO FINAL
        print("\n" + "=" * 80)
        if has_new_prices and not has_old_prices:
            print("✅ SUCESSO: Prompt contém preços ATUALIZADOS do banco!")
            print("=" * 80)
            return True
        elif has_old_prices:
            print("❌ FALHA: Prompt ainda contém preços ANTIGOS!")
            print("=" * 80)
            return False
        else:
            print("⚠️  AVISO: Não foi possível identificar preços no prompt")
            print("=" * 80)
            return False
            
    except Exception as e:
        print(f"❌ ERRO ao construir prompt: {e}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    """
    Executa teste e retorna código de saída
    """
    try:
        success = await test_dynamic_pricing_integration()
        
        if success:
            print("\n🎉 TESTE PASSOU! Sistema está usando preços dinâmicos corretamente.")
            sys.exit(0)
        else:
            print("\n❌ TESTE FALHOU! Sistema ainda usa preços antigos.")
            sys.exit(1)
            
    except Exception as e:
        print(f"\n💥 ERRO CRÍTICO NO TESTE: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(2)


if __name__ == "__main__":
    asyncio.run(main())
