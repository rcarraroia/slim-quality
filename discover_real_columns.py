#!/usr/bin/env python3
"""
DESCOBRIR ESTRUTURA REAL DAS COLUNAS
Testa inserção com diferentes nomes de campos para descobrir a estrutura real
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

# Configurar cliente Supabase
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

def discover_customers_structure():
    """Descobre estrutura real da tabela customers"""
    print("🔍 DESCOBRINDO ESTRUTURA REAL: CUSTOMERS")
    print("=" * 50)
    
    # Campos básicos que provavelmente existem
    basic_fields = {
        'name': 'João Silva Teste',
        'email': 'joao.teste@email.com',
        'phone': '11999999999'
    }
    
    # Possíveis variações de campos de endereço
    address_variations = [
        'address',
        'street_address', 
        'address_line_1',
        'street',
        'endereco'
    ]
    
    # Possíveis variações de outros campos
    other_variations = {
        'cpf': ['cpf', 'document', 'tax_id'],
        'number': ['number', 'address_number', 'numero'],
        'complement': ['complement', 'address_complement', 'complemento'],
        'neighborhood': ['neighborhood', 'district', 'bairro'],
        'city': ['city', 'cidade'],
        'state': ['state', 'uf', 'estado'],
        'zip_code': ['zip_code', 'postal_code', 'cep'],
        'source': ['source', 'origem', 'channel'],
        'status': ['status', 'active', 'is_active']
    }
    
    print("🧪 TESTANDO CAMPOS BÁSICOS...")
    
    # Testar apenas campos básicos primeiro
    try:
        result = supabase.table('customers').insert(basic_fields).execute()
        if result.data:
            print("✅ Campos básicos funcionam!")
            customer_id = result.data[0]['id']
            # Limpar
            supabase.table('customers').delete().eq('id', customer_id).execute()
            
            # Agora testar outros campos um por um
            print("\n🔍 TESTANDO CAMPOS ADICIONAIS...")
            
            valid_fields = basic_fields.copy()
            
            # Testar endereço
            for addr_field in address_variations:
                test_data = valid_fields.copy()
                test_data[addr_field] = 'Rua Teste, 123'
                test_data['email'] = f'teste.{addr_field}@email.com'
                
                try:
                    result = supabase.table('customers').insert(test_data).execute()
                    if result.data:
                        print(f"✅ Campo de endereço: '{addr_field}' FUNCIONA")
                        valid_fields[addr_field] = 'Rua Teste, 123'
                        # Limpar
                        supabase.table('customers').delete().eq('id', result.data[0]['id']).execute()
                        break
                except Exception as e:
                    print(f"❌ Campo '{addr_field}': {str(e)[:100]}...")
            
            # Testar outros campos
            for field_group, variations in other_variations.items():
                for field_name in variations:
                    test_data = valid_fields.copy()
                    
                    # Valores de teste apropriados
                    test_values = {
                        'cpf': '12345678901',
                        'number': '123',
                        'complement': 'Apto 1',
                        'neighborhood': 'Centro',
                        'city': 'São Paulo',
                        'state': 'SP',
                        'zip_code': '01234-567',
                        'source': 'website',
                        'status': 'active'
                    }
                    
                    test_data[field_name] = test_values.get(field_group, 'teste')
                    test_data['email'] = f'teste.{field_name}@email.com'
                    
                    try:
                        result = supabase.table('customers').insert(test_data).execute()
                        if result.data:
                            print(f"✅ Campo '{field_name}' ({field_group}): FUNCIONA")
                            valid_fields[field_name] = test_values.get(field_group, 'teste')
                            # Limpar
                            supabase.table('customers').delete().eq('id', result.data[0]['id']).execute()
                            break
                    except Exception as e:
                        if 'source_valid' in str(e):
                            print(f"⚠️  Campo '{field_name}': Constraint de validação")
                        else:
                            print(f"❌ Campo '{field_name}': {str(e)[:50]}...")
            
            print(f"\n✅ ESTRUTURA DESCOBERTA:")
            for field, value in valid_fields.items():
                print(f"   • {field}: {type(value).__name__}")
            
            return valid_fields
            
    except Exception as e:
        print(f"❌ Erro com campos básicos: {str(e)}")
        return None

def discover_orders_structure():
    """Descobre estrutura real da tabela orders"""
    print("\n🔍 DESCOBRINDO ESTRUTURA REAL: ORDERS")
    print("=" * 50)
    
    # Campos básicos que provavelmente existem
    basic_fields = {
        'customer_id': None,  # Vamos descobrir se precisa
        'total': 100.00,
        'status': 'pending'
    }
    
    # Variações possíveis
    field_variations = {
        'customer': ['customer_id', 'customer_uuid', 'user_id'],
        'total': ['total', 'total_amount', 'total_cents', 'amount'],
        'status': ['status', 'order_status', 'state'],
        'customer_name': ['customer_name', 'name', 'buyer_name'],
        'customer_email': ['customer_email', 'email', 'buyer_email'],
        'customer_phone': ['customer_phone', 'phone', 'buyer_phone']
    }
    
    print("🧪 TESTANDO ESTRUTURA DE ORDERS...")
    
    # Testar sem customer_id primeiro
    test_data = {
        'customer_name': 'João Silva',
        'customer_email': 'joao@email.com',
        'customer_phone': '11999999999',
        'total_cents': 10000,  # R$ 100,00 em centavos
        'status': 'pending'
    }
    
    try:
        result = supabase.table('orders').insert(test_data).execute()
        if result.data:
            print("✅ Estrutura básica de orders funciona!")
            order_id = result.data[0]['id']
            print(f"   Campos que funcionaram: {list(test_data.keys())}")
            
            # Limpar
            supabase.table('orders').delete().eq('id', order_id).execute()
            return test_data
            
    except Exception as e:
        print(f"❌ Erro: {str(e)}")
        
        # Testar campo por campo
        print("\n🔍 TESTANDO CAMPOS INDIVIDUAIS...")
        
        valid_fields = {}
        
        for field_group, variations in field_variations.items():
            for field_name in variations:
                test_single = {field_name: test_data.get(field_group, 'teste')}
                
                try:
                    # Adicionar ID temporário para teste
                    test_single['id'] = 'temp-test-id'
                    result = supabase.table('orders').insert(test_single).execute()
                    
                    if result.data:
                        print(f"✅ Campo '{field_name}': FUNCIONA")
                        valid_fields[field_name] = test_data.get(field_group, 'teste')
                        # Limpar
                        supabase.table('orders').delete().eq('id', 'temp-test-id').execute()
                        break
                        
                except Exception as e:
                    print(f"❌ Campo '{field_name}': {str(e)[:50]}...")
        
        return valid_fields

def main():
    print("🔍 DESCOBRINDO ESTRUTURAS REAIS DAS TABELAS")
    print("=" * 60)
    
    # Descobrir customers
    customers_structure = discover_customers_structure()
    
    # Descobrir orders  
    orders_structure = discover_orders_structure()
    
    # Resumo
    print(f"\n📊 RESUMO DAS DESCOBERTAS")
    print("=" * 40)
    
    if customers_structure:
        print(f"✅ CUSTOMERS - Campos válidos ({len(customers_structure)}):")
        for field in customers_structure.keys():
            print(f"   • {field}")
    
    if orders_structure:
        print(f"\n✅ ORDERS - Campos válidos ({len(orders_structure)}):")
        for field in orders_structure.keys():
            print(f"   • {field}")
    
    # Salvar descobertas
    discoveries = {
        'customers': customers_structure,
        'orders': orders_structure
    }
    
    import json
    with open('discovered_structures.json', 'w', encoding='utf-8') as f:
        json.dump(discoveries, f, indent=2, ensure_ascii=False, default=str)
    
    print(f"\n💾 Estruturas descobertas salvas em: discovered_structures.json")

if __name__ == "__main__":
    main()