#!/usr/bin/env python3
"""
Script para testar inserção de conversas na tabela conversations
"""

import os
from supabase import create_client, Client
from datetime import datetime

# Configurações do Supabase
SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"

def main():
    try:
        print("🧪 TESTE DE INSERÇÃO - TABELA CONVERSATIONS")
        print("=" * 50)
        
        # Criar cliente Supabase
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        print("✅ Cliente Supabase criado")
        
        # 1. Verificar estrutura da tabela conversations
        print("\n1. VERIFICANDO ESTRUTURA DA TABELA...")
        try:
            # Tentar inserir um registro de teste simples
            test_data = {
                'customer_phone': '+5533999999999',
                'customer_name': 'Cliente Teste',
                'channel': 'whatsapp',
                'status': 'open'
            }
            
            print(f"📝 Tentando inserir: {test_data}")
            result = supabase.table('conversations').insert(test_data).execute()
            
            if result.data:
                print(f"✅ Inserção bem-sucedida!")
                print(f"   ID criado: {result.data[0].get('id')}")
                
                # Limpar o teste
                conversation_id = result.data[0]['id']
                supabase.table('conversations').delete().eq('id', conversation_id).execute()
                print(f"🧹 Registro de teste removido")
            else:
                print(f"❌ Inserção falhou - sem dados retornados")
                
        except Exception as e:
            print(f"❌ ERRO na inserção: {e}")
            print("   Isso pode indicar problema na estrutura da tabela!")
        
        # 2. Testar inserção como o webhook faz
        print("\n2. TESTANDO INSERÇÃO COMO WEBHOOK...")
        try:
            webhook_data = {
                'customer_phone': '+5533888888888',
                'customer_name': 'Cliente 8888',
                'channel': 'whatsapp',
                'status': 'open',
                'created_at': 'now()',
                'updated_at': 'now()',
                'last_message_at': 'now()'
            }
            
            print(f"📝 Tentando inserir como webhook: {webhook_data}")
            result = supabase.table('conversations').insert(webhook_data).execute()
            
            if result.data:
                print(f"✅ Inserção webhook bem-sucedida!")
                print(f"   ID criado: {result.data[0].get('id')}")
                
                # Limpar o teste
                conversation_id = result.data[0]['id']
                supabase.table('conversations').delete().eq('id', conversation_id).execute()
                print(f"🧹 Registro de teste removido")
            else:
                print(f"❌ Inserção webhook falhou - sem dados retornados")
                
        except Exception as e:
            print(f"❌ ERRO na inserção webhook: {e}")
            print("   Problema específico com campos do webhook!")
        
        # 3. Verificar se precisa de customer_id
        print("\n3. VERIFICANDO SE PRECISA DE CUSTOMER_ID...")
        try:
            # Primeiro, verificar se existe um cliente
            customers = supabase.table('customers').select('*').limit(1).execute()
            
            if customers.data:
                customer_id = customers.data[0]['id']
                print(f"✅ Cliente encontrado: {customer_id}")
                
                # Tentar inserir com customer_id
                data_with_customer = {
                    'customer_id': customer_id,
                    'channel': 'whatsapp',
                    'status': 'open'
                }
                
                print(f"📝 Tentando inserir com customer_id: {data_with_customer}")
                result = supabase.table('conversations').insert(data_with_customer).execute()
                
                if result.data:
                    print(f"✅ Inserção com customer_id bem-sucedida!")
                    print(f"   ID criado: {result.data[0].get('id')}")
                    
                    # Limpar o teste
                    conversation_id = result.data[0]['id']
                    supabase.table('conversations').delete().eq('id', conversation_id).execute()
                    print(f"🧹 Registro de teste removido")
                else:
                    print(f"❌ Inserção com customer_id falhou")
            else:
                print("❌ Nenhum cliente encontrado para testar")
                
        except Exception as e:
            print(f"❌ ERRO no teste com customer_id: {e}")
        
        # 4. Verificar campos obrigatórios
        print("\n4. VERIFICANDO CAMPOS OBRIGATÓRIOS...")
        try:
            # Tentar inserir apenas campos mínimos
            minimal_data = {
                'channel': 'whatsapp',
                'status': 'open'
            }
            
            print(f"📝 Tentando inserir mínimo: {minimal_data}")
            result = supabase.table('conversations').insert(minimal_data).execute()
            
            if result.data:
                print(f"✅ Inserção mínima bem-sucedida!")
                print(f"   Campos criados automaticamente:")
                for key, value in result.data[0].items():
                    print(f"     {key}: {value}")
                
                # Limpar o teste
                conversation_id = result.data[0]['id']
                supabase.table('conversations').delete().eq('id', conversation_id).execute()
                print(f"🧹 Registro de teste removido")
            else:
                print(f"❌ Inserção mínima falhou")
                
        except Exception as e:
            print(f"❌ ERRO na inserção mínima: {e}")
            print("   Campos obrigatórios não fornecidos!")
        
        print("\n" + "=" * 50)
        print("🎯 CONCLUSÃO:")
        print("   Se todos os testes passaram, o problema não é na estrutura da tabela.")
        print("   Se algum teste falhou, isso indica o problema específico.")
        
    except Exception as e:
        print(f"💥 ERRO CRÍTICO: {e}")

if __name__ == "__main__":
    main()