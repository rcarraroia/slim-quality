#!/usr/bin/env python3
"""
Verificar banco de dados REAL usando método simples
"""

from supabase import create_client, Client

def verify_real_database():
    """Verifica o banco real usando métodos diretos"""
    
    # Configurar Supabase
    supabase_url = "https://vtynmmtuvxreiwcxxlma.supabase.co"
    supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"
    
    supabase: Client = create_client(supabase_url, supabase_key)
    
    print("=== VERIFICAÇÃO DO BANCO REAL ===")
    
    # Lista de tabelas para verificar
    tables_to_check = [
        'conversations',
        'customers', 
        'messages',
        'products',
        'orders',
        'affiliates'
    ]
    
    for table_name in tables_to_check:
        print(f"\n📋 VERIFICANDO TABELA: {table_name}")
        
        try:
            # Tentar buscar 1 registro para ver se tabela existe e quais campos tem
            result = supabase.table(table_name).select('*').limit(1).execute()
            
            if result.data is not None:
                print(f"   ✅ Tabela {table_name} EXISTE")
                
                # Contar registros
                count_result = supabase.table(table_name).select('id', count='exact').execute()
                total_records = count_result.count if count_result.count is not None else 0
                print(f"   📊 Total de registros: {total_records}")
                
                # Mostrar campos se houver dados
                if result.data and len(result.data) > 0:
                    print(f"   📋 Campos encontrados:")
                    for field in result.data[0].keys():
                        print(f"      - {field}")
                    
                    # Mostrar primeiro registro como exemplo
                    print(f"   📄 Exemplo de registro:")
                    for key, value in result.data[0].items():
                        # Truncar valores longos
                        display_value = str(value)[:50] + "..." if len(str(value)) > 50 else str(value)
                        print(f"      {key}: {display_value}")
                        
                elif total_records == 0:
                    print(f"   📋 Tabela existe mas está VAZIA")
                    
            else:
                print(f"   ❌ Tabela {table_name} NÃO EXISTE ou sem acesso")
                
        except Exception as e:
            print(f"   ❌ ERRO ao verificar {table_name}: {e}")
    
    # Verificação específica para conversations
    print(f"\n🔍 VERIFICAÇÃO ESPECÍFICA - CONVERSATIONS")
    try:
        # Buscar conversas recentes
        recent_conversations = supabase.table('conversations').select('*').order('created_at', desc=True).limit(3).execute()
        
        if recent_conversations.data:
            print(f"   📋 Últimas {len(recent_conversations.data)} conversas:")
            for i, conv in enumerate(recent_conversations.data, 1):
                print(f"      {i}. ID: {conv.get('id', 'N/A')}")
                print(f"         Customer ID: {conv.get('customer_id', 'N/A')}")
                print(f"         Canal: {conv.get('channel', 'N/A')}")
                print(f"         Status: {conv.get('status', 'N/A')}")
                print(f"         Criada: {conv.get('created_at', 'N/A')}")
                print()
        else:
            print(f"   📋 Nenhuma conversa encontrada")
            
    except Exception as e:
        print(f"   ❌ ERRO ao buscar conversas: {e}")
    
    # Verificação específica para customers
    print(f"\n🔍 VERIFICAÇÃO ESPECÍFICA - CUSTOMERS")
    try:
        # Buscar customers recentes
        recent_customers = supabase.table('customers').select('id, name, email, phone, created_at').order('created_at', desc=True).limit(3).execute()
        
        if recent_customers.data:
            print(f"   📋 Últimos {len(recent_customers.data)} customers:")
            for i, cust in enumerate(recent_customers.data, 1):
                print(f"      {i}. ID: {cust.get('id', 'N/A')}")
                print(f"         Nome: {cust.get('name', 'N/A')}")
                print(f"         Email: {cust.get('email', 'N/A')}")
                print(f"         Telefone: {cust.get('phone', 'N/A')}")
                print(f"         Criado: {cust.get('created_at', 'N/A')}")
                print()
        else:
            print(f"   📋 Nenhum customer encontrado")
            
    except Exception as e:
        print(f"   ❌ ERRO ao buscar customers: {e}")
    
    print(f"\n🎉 VERIFICAÇÃO CONCLUÍDA!")

if __name__ == "__main__":
    verify_real_database()