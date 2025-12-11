#!/usr/bin/env python3
"""
Script para configurar políticas RLS adequadas para desenvolvimento
"""

import requests
import json

# Configurações
SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"

def execute_sql(sql_command):
    """Executa comando SQL via API REST do Supabase"""
    headers = {
        'apikey': SERVICE_KEY,
        'Authorization': f'Bearer {SERVICE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }
    
    # Usar endpoint direto do PostgREST para SQL
    url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
    
    try:
        response = requests.post(url, headers=headers, json={"query": sql_command})
        return response.status_code == 200, response.text
    except Exception as e:
        # Tentar método alternativo - executar via query direta
        try:
            # Usar endpoint SQL direto (se disponível)
            sql_url = f"{SUPABASE_URL}/rest/v1/"
            
            # Para comandos DDL, usar método POST com SQL raw
            response = requests.post(
                sql_url,
                headers=headers,
                data=sql_command
            )
            return response.status_code in [200, 201, 204], response.text
        except Exception as e2:
            return False, str(e2)

def main():
    print("🔐 CONFIGURANDO POLÍTICAS RLS PARA DESENVOLVIMENTO")
    print("=" * 55)
    
    # Lista de comandos SQL para configurar RLS adequadamente
    sql_commands = [
        # 1. Desabilitar RLS temporariamente para desenvolvimento
        {
            "name": "Desabilitar RLS na tabela products",
            "sql": "ALTER TABLE products DISABLE ROW LEVEL SECURITY;"
        },
        
        # 2. Alternativa: Criar política permissiva para desenvolvimento
        {
            "name": "Criar política permissiva para products",
            "sql": """
            DROP POLICY IF EXISTS "Allow all operations for development" ON products;
            CREATE POLICY "Allow all operations for development" 
            ON products FOR ALL 
            USING (true) 
            WITH CHECK (true);
            """
        },
        
        # 3. Habilitar RLS novamente (se necessário)
        {
            "name": "Habilitar RLS na tabela products",
            "sql": "ALTER TABLE products ENABLE ROW LEVEL SECURITY;"
        }
    ]
    
    print("\n🔧 Método 1: Desabilitando RLS temporariamente...")
    success, result = execute_sql(sql_commands[0]["sql"])
    if success:
        print("✅ RLS desabilitado com sucesso!")
        
        # Testar inserção
        print("\n🧪 Testando inserção após desabilitar RLS...")
        from supabase import create_client
        
        anon_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODE2MDIsImV4cCI6MjA3MVk1NzYwMn0.fd-WSqFh7QsSlB0Q62cXAZZ-yDcI0n0sXyJ4eWIRKH8"
        anon_supabase = create_client(SUPABASE_URL, anon_key)
        
        try:
            test_product = {
                "name": "Teste RLS Desabilitado",
                "price_cents": 100000,
                "width_cm": 100,
                "length_cm": 200,
                "height_cm": 30,
                "is_active": True
            }
            
            result = anon_supabase.table('products').insert(test_product).execute()
            print("✅ Inserção funcionando com chave anônima!")
            
            # Limpar teste
            service_supabase = create_client(SUPABASE_URL, SERVICE_KEY)
            service_supabase.table('products').delete().eq('id', result.data[0]['id']).execute()
            print("   (Produto de teste removido)")
            
        except Exception as e:
            print(f"❌ Ainda há problemas: {e}")
            
            # Tentar método 2: Política permissiva
            print(f"\n🔧 Método 2: Criando política permissiva...")
            success2, result2 = execute_sql(sql_commands[1]["sql"])
            if success2:
                print("✅ Política permissiva criada!")
                
                # Habilitar RLS novamente
                success3, result3 = execute_sql(sql_commands[2]["sql"])
                if success3:
                    print("✅ RLS habilitado com política permissiva!")
                else:
                    print(f"⚠️ Erro ao habilitar RLS: {result3}")
            else:
                print(f"❌ Erro ao criar política: {result2}")
    else:
        print(f"❌ Erro ao desabilitar RLS: {result}")
        
        # Tentar diretamente a política permissiva
        print(f"\n🔧 Tentando criar política permissiva diretamente...")
        success2, result2 = execute_sql(sql_commands[1]["sql"])
        if success2:
            print("✅ Política permissiva criada!")
        else:
            print(f"❌ Erro: {result2}")
    
    print(f"\n📋 INSTRUÇÕES MANUAIS (se scripts falharam):")
    print(f"1. Acesse: https://supabase.com/dashboard/project/vtynmmtuvxreiwcxxlma/sql/new")
    print(f"2. Execute este SQL:")
    print(f"   ALTER TABLE products DISABLE ROW LEVEL SECURITY;")
    print(f"3. Ou crie uma política permissiva:")
    print(f"   CREATE POLICY \"dev_policy\" ON products FOR ALL USING (true) WITH CHECK (true);")

if __name__ == "__main__":
    main()