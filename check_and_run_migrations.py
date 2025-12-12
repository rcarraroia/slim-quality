#!/usr/bin/env python3
"""
Verificar e executar migrations do módulo de afiliados
"""

import os
import subprocess
from supabase import create_client, Client
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

def check_and_run_migrations():
    """Verifica e executa migrations necessárias"""
    
    print("🔍 VERIFICANDO E EXECUTANDO MIGRATIONS DE AFILIADOS")
    print("=" * 60)
    
    try:
        # 1. Verificar se Supabase CLI está disponível
        print("\n1️⃣ Verificando Supabase CLI...")
        
        try:
            result = subprocess.run(['supabase', '--version'], 
                                  capture_output=True, text=True, check=True)
            print(f"   ✅ Supabase CLI: {result.stdout.strip()}")
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("   ❌ Supabase CLI não encontrado")
            print("   💡 Instale com: npm install -g supabase")
            return False
        
        # 2. Verificar status das migrations
        print("\n2️⃣ Verificando status das migrations...")
        
        try:
            result = subprocess.run(['supabase', 'migration', 'list'], 
                                  capture_output=True, text=True, check=True)
            print("   📋 Status das migrations:")
            print(result.stdout)
        except subprocess.CalledProcessError as e:
            print(f"   ⚠️ Erro ao verificar migrations: {e}")
        
        # 3. Executar migrations pendentes
        print("\n3️⃣ Executando migrations pendentes...")
        
        try:
            result = subprocess.run(['supabase', 'db', 'push'], 
                                  capture_output=True, text=True, check=True)
            print("   ✅ Migrations executadas com sucesso!")
            print(result.stdout)
        except subprocess.CalledProcessError as e:
            print(f"   ❌ Erro ao executar migrations: {e}")
            print(f"   Stderr: {e.stderr}")
            return False
        
        # 4. Verificar se tabelas foram criadas
        print("\n4️⃣ Verificando tabelas criadas...")
        
        # Configurar Supabase
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_ANON_KEY")
        
        if not url or not key:
            print("   ❌ Variáveis SUPABASE_URL e SUPABASE_ANON_KEY não encontradas")
            return False
        
        supabase: Client = create_client(url, key)
        
        # Testar tabelas principais
        test_tables = ['affiliates', 'commissions', 'withdrawals']
        
        for table in test_tables:
            try:
                result = supabase.table(table).select('*').limit(1).execute()
                print(f"   ✅ {table} - CRIADA")
            except Exception as e:
                print(f"   ❌ {table} - ERRO: {str(e)[:50]}...")
        
        print(f"\n✅ VERIFICAÇÃO CONCLUÍDA!")
        return True
        
    except Exception as e:
        print(f"\n❌ ERRO: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    check_and_run_migrations()