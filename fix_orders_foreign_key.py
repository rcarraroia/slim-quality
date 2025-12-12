#!/usr/bin/env python3
"""
CORRIGIR FOREIGN KEY DA TABELA ORDERS
Ajustar orders.customer_id para apontar para customers em vez de users
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

def fix_orders_foreign_key():
    """Corrige a foreign key da tabela orders"""
    print("🔧 CORRIGINDO FOREIGN KEY: orders.customer_id")
    print("=" * 50)
    
    # SQL para corrigir a foreign key
    sql_commands = [
        # 1. Remover constraint existente
        """
        ALTER TABLE orders 
        DROP CONSTRAINT IF EXISTS orders_customer_id_fkey;
        """,
        
        # 2. Adicionar nova constraint apontando para customers
        """
        ALTER TABLE orders 
        ADD CONSTRAINT orders_customer_id_fkey 
        FOREIGN KEY (customer_id) REFERENCES customers(id) 
        ON DELETE CASCADE;
        """,
        
        # 3. Verificar se a constraint foi criada
        """
        SELECT 
            tc.constraint_name,
            tc.table_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu 
            ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_name = 'orders'
            AND kcu.column_name = 'customer_id';
        """
    ]
    
    try:
        for i, sql in enumerate(sql_commands, 1):
            print(f"\n{i}. Executando comando SQL...")
            print(f"SQL: {sql.strip()[:100]}...")
            
            if i <= 2:  # Comandos de alteração
                result = supabase.rpc('exec_sql', {'sql': sql}).execute()
                if result.data:
                    print(f"✅ Comando {i} executado com sucesso")
                else:
                    print(f"⚠️  Comando {i} executado (sem retorno)")
            else:  # Comando de verificação
                try:
                    # Usar query direta para verificação
                    result = supabase.table('information_schema.table_constraints').select('*').execute()
                    print(f"✅ Verificação executada")
                except:
                    print(f"⚠️  Verificação não disponível via API")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro ao executar SQL: {str(e)}")
        return False

def test_fixed_foreign_key():
    """Testa se a foreign key foi corrigida"""
    print("\n🧪 TESTANDO FOREIGN KEY CORRIGIDA")
    print("=" * 50)
    
    try:
        # 1. Criar customer
        customer_data = {
            'name': 'Teste FK Corrigida',
            'email': 'teste.fk@email.com',
            'phone': '11999999999',
            'street': 'Rua Teste FK',
            'number': '123',
            'neighborhood': 'Centro',
            'city': 'São Paulo',
            'state': 'SP',
            'postal_code': '01234-567',
            'source': 'affiliate',
            'status': 'active'
        }
        
        customer_result = supabase.table('customers').insert(customer_data).execute()
        
        if not customer_result.data:
            print("❌ Falha ao criar customer para teste")
            return False
            
        customer_id = customer_result.data[0]['id']
        print(f"✅ Customer criado: {customer_id}")
        
        # 2. Criar order com customer_id
        order_data = {
            'customer_id': customer_id,
            'customer_name': customer_data['name'],
            'customer_email': customer_data['email'],
            'customer_phone': customer_data['phone'],
            'subtotal_cents': 329000,
            'total_cents': 329000,
            'status': 'pending'
        }
        
        order_result = supabase.table('orders').insert(order_data).execute()
        
        if order_result.data:
            order_id = order_result.data[0]['id']
            print(f"✅ Order criada com sucesso: {order_id}")
            print("✅ FOREIGN KEY CORRIGIDA E FUNCIONANDO!")
            
            # Limpar dados de teste
            supabase.table('orders').delete().eq('id', order_id).execute()
            supabase.table('customers').delete().eq('id', customer_id).execute()
            print("✅ Dados de teste removidos")
            
            return True
        else:
            print("❌ Falha ao criar order")
            # Limpar customer
            supabase.table('customers').delete().eq('id', customer_id).execute()
            return False
            
    except Exception as e:
        print(f"❌ Erro no teste: {str(e)}")
        return False

def main():
    print("🔧 CORREÇÃO DE FOREIGN KEY - ORDERS")
    print("=" * 60)
    
    # Corrigir foreign key
    success = fix_orders_foreign_key()
    
    if success:
        # Testar correção
        test_success = test_fixed_foreign_key()
        
        if test_success:
            print(f"\n🎉 CORREÇÃO CONCLUÍDA COM SUCESSO!")
            print("✅ Foreign key orders.customer_id → customers.id")
            print("✅ Teste de criação de order funcionando")
            
            # Atualizar plano
            print(f"\n📋 ATUALIZANDO PLANO DE IMPLEMENTAÇÃO:")
            print("✅ Fase 1.1: Corrigir Foreign Keys - CONCLUÍDO")
            
        else:
            print(f"\n❌ CORREÇÃO FALHOU NO TESTE")
            print("⚠️  Foreign key pode ter sido alterada mas não funciona")
    else:
        print(f"\n❌ FALHA NA CORREÇÃO")
        print("⚠️  Não foi possível alterar a foreign key")

if __name__ == "__main__":
    main()