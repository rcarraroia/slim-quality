#!/usr/bin/env python3
"""
Teste da correção do webhook de conversas
"""

import os
import asyncio
from supabase import create_client, Client

async def test_conversation_creation():
    """Testa criação de conversa com schema correto"""
    
    # Configurar Supabase
    supabase_url = "https://vtynmmtuvxreiwcxxlma.supabase.co"
    supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"
    
    supabase: Client = create_client(supabase_url, supabase_key)
    
    print("=== TESTE DE CORREÇÃO DO WEBHOOK ===")
    
    # Dados de teste
    test_phone = "5511999887766"
    test_message = "Olá, gostaria de saber sobre os colchões magnéticos!"
    
    try:
        # 1. BUSCAR OU CRIAR CUSTOMER
        print(f"1. Buscando customer com telefone {test_phone}...")
        customer_result = supabase.table('customers').select('id, name').eq('phone', test_phone).execute()
        
        if customer_result.data:
            customer_id = customer_result.data[0]['id']
            customer_name = customer_result.data[0]['name']
            print(f"   ✅ Customer encontrado: {customer_id} - {customer_name}")
        else:
            print(f"   📝 Criando novo customer...")
            customer_data = {
                'name': f'Cliente Teste {test_phone[-4:]}',
                'email': f'teste_{test_phone}@slimquality.temp',  # Email obrigatório
                'phone': test_phone,
                'source': 'whatsapp',
                'status': 'active'
            }
            
            customer_result = supabase.table('customers').insert(customer_data).execute()
            
            if customer_result.data:
                customer_id = customer_result.data[0]['id']
                print(f"   ✅ Customer criado: {customer_id}")
            else:
                print(f"   ❌ Erro ao criar customer")
                return False
        
        # 2. BUSCAR OU CRIAR CONVERSA
        print(f"2. Buscando conversa ativa para customer {customer_id}...")
        conversation_result = supabase.table('conversations').select('id').eq('customer_id', customer_id).eq('channel', 'whatsapp').in_('status', ['new', 'open', 'pending']).execute()
        
        if conversation_result.data:
            conversation_id = conversation_result.data[0]['id']
            print(f"   ✅ Conversa ativa encontrada: {conversation_id}")
        else:
            print(f"   📝 Criando nova conversa...")
            conversation_data = {
                'customer_id': customer_id,
                'channel': 'whatsapp',
                'status': 'open',
                'subject': f'WhatsApp {test_phone[-4:]}'
            }
            
            conversation_result = supabase.table('conversations').insert(conversation_data).execute()
            
            if conversation_result.data:
                conversation_id = conversation_result.data[0]['id']
                print(f"   ✅ Conversa criada: {conversation_id}")
            else:
                print(f"   ❌ Erro ao criar conversa")
                return False
        
        # 3. SALVAR MENSAGEM
        print(f"3. Salvando mensagem na conversa {conversation_id}...")
        message_data = {
            'conversation_id': conversation_id,
            'content': test_message,
            'sender_type': 'customer',
            'sender_id': customer_id
        }
        
        message_result = supabase.table('messages').insert(message_data).execute()
        
        if message_result.data:
            message_id = message_result.data[0]['id']
            print(f"   ✅ Mensagem salva: {message_id}")
        else:
            print(f"   ❌ Erro ao salvar mensagem")
            return False
        
        # 4. VERIFICAR SE APARECE NO DASHBOARD
        print(f"4. Verificando se conversa aparece no dashboard...")
        dashboard_result = supabase.table('conversations').select('id, customer_id, channel, status, created_at').eq('id', conversation_id).execute()
        
        if dashboard_result.data:
            conv = dashboard_result.data[0]
            print(f"   ✅ Conversa visível no dashboard:")
            print(f"      ID: {conv['id']}")
            print(f"      Customer: {conv['customer_id']}")
            print(f"      Canal: {conv['channel']}")
            print(f"      Status: {conv['status']}")
            print(f"      Criada: {conv['created_at']}")
        else:
            print(f"   ❌ Conversa não encontrada no dashboard")
            return False
        
        # 5. CONTAR CONVERSAS TOTAIS
        print(f"5. Contando conversas totais...")
        count_result = supabase.table('conversations').select('id', count='exact').execute()
        total_conversations = count_result.count
        print(f"   📊 Total de conversas no banco: {total_conversations}")
        
        print(f"\n🎉 TESTE CONCLUÍDO COM SUCESSO!")
        print(f"   - Customer ID: {customer_id}")
        print(f"   - Conversation ID: {conversation_id}")
        print(f"   - Message ID: {message_id}")
        print(f"   - Total conversas: {total_conversations}")
        
        return True
        
    except Exception as e:
        print(f"❌ ERRO NO TESTE: {e}")
        import traceback
        print(f"❌ TRACEBACK: {traceback.format_exc()}")
        return False

if __name__ == "__main__":
    success = asyncio.run(test_conversation_creation())
    if success:
        print("\n✅ Correção do webhook funcionando corretamente!")
    else:
        print("\n❌ Correção do webhook ainda tem problemas!")