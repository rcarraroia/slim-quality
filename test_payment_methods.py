#!/usr/bin/env python3
"""
Teste das opções de pagamento PIX e Cartão de Crédito
"""

import requests
import json
import os
from datetime import datetime

# Configurações
BASE_URL = "https://slim-quality.vercel.app"
PRODUCT_ID = "550e8400-e29b-41d4-a716-446655440000"  # ID de um produto existente

def test_payment_methods():
    """Testa se as opções de pagamento estão funcionando"""
    
    print("🧪 TESTANDO OPÇÕES DE PAGAMENTO")
    print("=" * 50)
    
    # 1. Verificar se a página de produto carrega
    print("\n1. Verificando página de produto...")
    try:
        response = requests.get(f"{BASE_URL}/produtos/slim-quality-padrao", timeout=10)
        if response.status_code == 200:
            print("✅ Página de produto carrega")
            
            # Verificar se contém o componente de checkout
            if "PaymentMethodSelector" in response.text or "Comprar Agora" in response.text:
                print("✅ Botão 'Comprar Agora' encontrado")
            else:
                print("❌ Botão 'Comprar Agora' não encontrado")
                
        else:
            print(f"❌ Erro ao carregar página: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Erro de conexão: {e}")
    
    # 2. Testar se o componente PaymentMethodSelector existe
    print("\n2. Verificando componente PaymentMethodSelector...")
    
    # Verificar se o arquivo existe
    component_path = "src/components/checkout/PaymentMethodSelector.tsx"
    if os.path.exists(component_path):
        print("✅ Componente PaymentMethodSelector.tsx existe")
        
        # Verificar conteúdo do componente
        with open(component_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Verificar funcionalidades essenciais
        checks = [
            ("PIX", "PIX" in content),
            ("Cartão de Crédito", "CREDIT_CARD" in content or "credit_card" in content),
            ("Parcelamento", "installment" in content.lower()),
            ("12 parcelas", "12" in content),
            ("Interface PaymentMethod", "interface PaymentMethod" in content)
        ]
        
        for check_name, check_result in checks:
            if check_result:
                print(f"✅ {check_name} implementado")
            else:
                print(f"❌ {check_name} não encontrado")
                
    else:
        print("❌ Componente PaymentMethodSelector.tsx não existe")
    
    # 3. Verificar integração no AffiliateAwareCheckout
    print("\n3. Verificando integração no checkout...")
    
    checkout_path = "src/components/checkout/AffiliateAwareCheckout.tsx"
    if os.path.exists(checkout_path):
        print("✅ Componente AffiliateAwareCheckout.tsx existe")
        
        with open(checkout_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Verificar integrações
        integrations = [
            ("Import PaymentMethodSelector", "PaymentMethodSelector" in content),
            ("selectedPaymentMethod state", "selectedPaymentMethod" in content),
            ("PaymentMethod type", "PaymentMethod" in content),
            ("Método de pagamento no checkout", "payment.method" in content),
            ("Parcelamento no checkout", "installments" in content)
        ]
        
        for integration_name, integration_result in integrations:
            if integration_result:
                print(f"✅ {integration_name}")
            else:
                print(f"❌ {integration_name} não encontrado")
                
    else:
        print("❌ Componente AffiliateAwareCheckout.tsx não existe")
    
    # 4. Verificar serviço Asaas
    print("\n4. Verificando serviço Asaas...")
    
    asaas_path = "src/services/asaas.service.ts"
    if os.path.exists(asaas_path):
        print("✅ Serviço Asaas existe")
        
        with open(asaas_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Verificar funcionalidades do Asaas
        asaas_features = [
            ("billingType PIX", "PIX" in content),
            ("billingType CREDIT_CARD", "CREDIT_CARD" in content),
            ("installmentCount", "installmentCount" in content),
            ("installmentValue", "installmentValue" in content),
            ("processCheckout com installments", "installments" in content)
        ]
        
        for feature_name, feature_result in asaas_features:
            if feature_result:
                print(f"✅ {feature_name}")
            else:
                print(f"❌ {feature_name} não encontrado")
                
    else:
        print("❌ Serviço Asaas não existe")
    
    # 5. Verificar tipos TypeScript
    print("\n5. Verificando tipos TypeScript...")
    
    types_path = "src/types/database.types.ts"
    if os.path.exists(types_path):
        print("✅ Arquivo de tipos existe")
        
        with open(types_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Verificar tipos
        type_checks = [
            ("CheckoutData interface", "interface CheckoutData" in content),
            ("payment method type", "'pix' | 'credit_card'" in content),
            ("installments optional", "installments?" in content)
        ]
        
        for type_name, type_result in type_checks:
            if type_result:
                print(f"✅ {type_name}")
            else:
                print(f"❌ {type_name} não encontrado")
                
    else:
        print("❌ Arquivo de tipos não existe")
    
    print("\n" + "=" * 50)
    print("🏁 TESTE CONCLUÍDO")
    print(f"⏰ {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == "__main__":
    test_payment_methods()