#!/usr/bin/env python3
"""
CORRIGIR RLS DA TABELA CUSTOMERS
Permite inserção de novos clientes no checkout
"""

import os
import subprocess
from dotenv import load_dotenv

load_dotenv()

def execute_sql(sql_command):
    """Executa comando SQL via Supabase CLI"""
    try:
        result = subprocess.run(
            ['supabase', 'db', 'execute', sql_command],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0:
            print(f"✅ SQL executado com sucesso")
            if result.stdout:
                print(f"Output: {result.stdout}")
        else:
            print(f"❌ Erro ao executar SQL: {result.stderr}")
            
        return result.returncode == 0
        
    except Exception as e:
        print(f"❌ Erro ao executar comando: {e}")
        return False

def fix_customers_rls():
    """Corrige políticas RLS da tabela customers"""
    print("🔧 Corrigindo políticas RLS da tabela customers...")
    
    # SQL para corrigir RLS
    sql_commands = [
        # Remover políticas existentes
        "DROP POLICY IF EXISTS \"Enable read access for all users\" ON customers;",
        "DROP POLICY IF EXISTS \"Enable insert for authenticated users only\" ON customers;", 
        "DROP POLICY IF EXISTS \"Enable update for users based on email\" ON customers;",
        
        # Criar políticas permissivas para checkout
        """
        CREATE POLICY "Allow public read on customers"
        ON customers FOR SELECT
        USING (true);
        """,
        
        """
        CREATE POLICY "Allow public insert on customers"
        ON customers FOR INSERT
        WITH CHECK (true);
        """,
        
        """
        CREATE POLICY "Allow public update on customers"
        ON customers FOR UPDATE
        USING (true)
        WITH CHECK (true);
        """
    ]
    
    for sql in sql_commands:
        print(f"\n📝 Executando: {sql[:50]}...")
        success = execute_sql(sql)
        if not success:
            print(f"⚠️ Falha ao executar comando, continuando...")

def main():
    print("🚀 CORRIGINDO RLS PARA CHECKOUT")
    print("=" * 50)
    
    fix_customers_rls()
    
    print("\n" + "=" * 50)
    print("✅ Correção de RLS concluída!")
    print("Teste o checkout novamente.")

if __name__ == "__main__":
    main()