#!/usr/bin/env python3
"""
Verificar schema REAL do banco de dados Supabase
"""

import os
from supabase import create_client, Client

def check_real_database():
    """Verifica o schema real das tabelas no banco"""
    
    # Configurar Supabase
    supabase_url = "https://vtynmmtuvxreiwcxxlma.supabase.co"
    supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"
    
    supabase: Client = create_client(supabase_url, supabase_key)
    
    print("=== VERIFICAÇÃO DO BANCO DE DADOS REAL ===")
    
    try:
        # 1. VERIFICAR SE TABELA CONVERSATIONS EXISTE
        print("\n1. VERIFICANDO TABELA CONVERSATIONS...")
        conversations_schema = supabase.rpc('get_table_schema', {'table_name': 'conversations'}).execute()
        
        if conversations_schema.data:
            print("   ✅ Tabela conversations EXISTE")
            print("   📋 Schema da tabela conversations:")
            for column in conversations_schema.data:
                print(f"      - {column['column_name']}: {column['data_type']} {'(NOT NULL)' if not column['is_nullable'] else '(NULL)'}")
        else:
            # Tentar método alternativo
            print("   🔍 Tentando método alternativo...")
            result = supabase.table('conversations').select('*').limit(1).execute()
            if result.data is not None:
                print("   ✅ Tabela conversations EXISTE (método alternativo)")
                if result.data:
                    print("   📋 Campos encontrados na primeira linha:")
                    for key in result.data[0].keys():
                        print(f"      - {key}")
                else:
                    print("   📋 Tabela existe mas está vazia")
            else:
                print("   ❌ Tabela conversations NÃO EXISTE")
        
        # 2. VERIFICAR SE TABELA CUSTOMERS EXISTE
        print("\n2. VERIFICANDO TABELA CUSTOMERS...")
        customers_result = supabase.table('customers').select('*').limit(1).execute()
        
        if customers_result.data is not None:
            print("   ✅ Tabela customers EXISTE")
            if customers_result.data:
                print("   📋 Campos encontrados:")
                for key in customers_result.data[0].keys():
                    print(f"      - {key}")
                print(f"   📊 Total de customers: {len(customers_result.data)}")
            else:
                print("   📋 Tabela customers existe mas está vazia")
        else:
            print("   ❌ Tabela customers NÃO EXISTE")
        
        # 3. VERIFICAR SE TABELA MESSAGES EXISTE
        print("\n3. VERIFICANDO TABELA MESSAGES...")
        messages_result = supabase.table('messages').select('*').limit(1).execute()
        
        if messages_result.data is not None:
            print("   ✅ Tabela messages EXISTE")
            if messages_result.data:
                print("   📋 Campos encontrados:")
                for key in messages_result.data[0].keys():
                    print(f"      - {key}")
                print(f"   📊 Total de messages: {len(messages_result.data)}")
            else:
                print("   📋 Tabela messages existe mas está vazia")
        else:
            print("   ❌ Tabela messages NÃO EXISTE")
        
        # 4. CONTAR REGISTROS EM CADA TABELA
        print("\n4. CONTANDO REGISTROS...")
        
        # Conversations
        try:
            conv_count = supabase.table('conversations').select('id', count='exact').execute()
            print(f"   📊 Conversations: {conv_count.count} registros")
        except Exception as e:
            print(f"   ❌ Erro ao contar conversations: {e}")
        
        # Customers
        try:
            cust_count = supabase.table('customers').select('id', count='exact').execute()
            print(f"   📊 Customers: {cust_count.count} registros")
        except Exception as e:
            print(f"   ❌ Erro ao contar customers: {e}")
        
        # Messages
        try:
            msg_count = supabase.table('messages').select('id', count='exact').execute()
            print(f"   📊 Messages: {msg_count.count} registros")
        except Exception as e:
            print(f"   ❌ Erro ao contar messages: {e}")
        
        # 5. LISTAR TODAS AS TABELAS EXISTENTES
        print("\n5. LISTANDO TODAS AS TABELAS...")
        try:
            # Usar query SQL direta para listar tabelas
            tables_result = supabase.rpc('exec_sql', {
                'query': "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
            }).execute()
            
            if tables_result.data:
                print("   📋 Tabelas encontradas no banco:")
                for table in tables_result.data:
                    print(f"      - {table['table_name']}")
            else:
                print("   ❌ Não foi possível listar tabelas")
        except Exception as e:
            print(f"   ❌ Erro ao listar tabelas: {e}")
        
        # 6. VERIFICAR ÚLTIMAS CONVERSAS (se existirem)
        print("\n6. VERIFICANDO ÚLTIMAS CONVERSAS...")
        try:
            recent_conversations = supabase.table('conversations').select('*').order('created_at', desc=True).limit(5).execute()
            
            if recent_conversations.data:
                print(f"   📋 Últimas {len(recent_conversations.data)} conversas:")
                for conv in recent_conversations.data:
                    print(f"      - ID: {conv['id']}")
                    print(f"        Customer: {conv.get('customer_id', 'N/A')}")
                    print(f"        Canal: {conv.get('channel', 'N/A')}")
                    print(f"        Status: {conv.get('status', 'N/A')}")
                    print(f"        Criada: {conv.get('created_at', 'N/A')}")
                    print()
            else:
                print("   📋 Nenhuma conversa encontrada")
        except Exception as e:
            print(f"   ❌ Erro ao buscar conversas: {e}")
        
        print("\n🎉 VERIFICAÇÃO CONCLUÍDA!")
        
    except Exception as e:
        print(f"❌ ERRO GERAL: {e}")
        import traceback
        print(f"❌ TRACEBACK: {traceback.format_exc()}")

if __name__ == "__main__":
    check_real_database()