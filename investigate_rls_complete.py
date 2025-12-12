#!/usr/bin/env python3
"""
INVESTIGAÇÃO COMPLETA DAS POLÍTICAS RLS
Analisa todas as tabelas, suas políticas RLS e dependências
"""

import os
import subprocess
import json
from dotenv import load_dotenv

load_dotenv()

class RLSInvestigator:
    def __init__(self):
        print("🔍 INVESTIGAÇÃO COMPLETA DAS POLÍTICAS RLS")
        print("=" * 60)
    
    def execute_sql_query(self, query):
        """Executa query SQL e retorna resultado"""
        try:
            # Usar psql diretamente via supabase
            cmd = f'supabase db execute "{query}"'
            result = subprocess.run(
                cmd,
                shell=True,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                return result.stdout
            else:
                print(f"❌ Erro SQL: {result.stderr}")
                return None
                
        except Exception as e:
            print(f"❌ Erro ao executar query: {e}")
            return None
    
    def get_all_tables_with_rls(self):
        """Lista todas as tabelas com RLS ativo"""
        print("\n📋 TABELAS COM RLS ATIVO:")
        print("-" * 40)
        
        query = """
        SELECT 
            schemaname,
            tablename,
            rowsecurity as rls_enabled
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename;
        """
        
        result = self.execute_sql_query(query)
        if result:
            print(result)
        
        # Query mais específica para RLS
        rls_query = """
        SELECT 
            t.table_name,
            CASE WHEN c.relrowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
        FROM information_schema.tables t
        JOIN pg_class c ON c.relname = t.table_name
        WHERE t.table_schema = 'public' 
        AND t.table_type = 'BASE TABLE'
        ORDER BY t.table_name;
        """
        
        print("\n🔒 STATUS RLS DETALHADO:")
        print("-" * 40)
        result = self.execute_sql_query(rls_query)
        if result:
            print(result)
    
    def get_all_rls_policies(self):
        """Lista todas as políticas RLS existentes"""
        print("\n📜 TODAS AS POLÍTICAS RLS:")
        print("-" * 40)
        
        query = """
        SELECT 
            schemaname,
            tablename,
            policyname,
            permissive,
            roles,
            cmd,
            qual,
            with_check
        FROM pg_policies 
        WHERE schemaname = 'public'
        ORDER BY tablename, policyname;
        """
        
        result = self.execute_sql_query(query)
        if result:
            print(result)
    
    def analyze_checkout_tables(self):
        """Analisa especificamente as tabelas do checkout"""
        print("\n🛒 ANÁLISE DAS TABELAS DO CHECKOUT:")
        print("-" * 40)
        
        checkout_tables = [
            'customers',
            'customer_timeline', 
            'orders',
            'order_items',
            'shipping_addresses',
            'referral_conversions',
            'products',
            'affiliates'
        ]
        
        for table in checkout_tables:
            print(f"\n📊 TABELA: {table}")
            print("=" * 30)
            
            # Verificar se tabela existe
            exists_query = f"""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = '{table}'
            );
            """
            
            exists_result = self.execute_sql_query(exists_query)
            if exists_result and 't' in exists_result:
                print(f"✅ Tabela existe")
                
                # Verificar RLS
                rls_query = f"""
                SELECT 
                    c.relname as table_name,
                    c.relrowsecurity as rls_enabled
                FROM pg_class c
                WHERE c.relname = '{table}';
                """
                
                rls_result = self.execute_sql_query(rls_query)
                print(f"🔒 RLS Status: {rls_result}")
                
                # Listar políticas desta tabela
                policies_query = f"""
                SELECT 
                    policyname,
                    cmd,
                    permissive,
                    roles,
                    qual,
                    with_check
                FROM pg_policies 
                WHERE schemaname = 'public' 
                AND tablename = '{table}'
                ORDER BY policyname;
                """
                
                policies_result = self.execute_sql_query(policies_query)
                if policies_result and policies_result.strip():
                    print(f"📜 Políticas:")
                    print(policies_result)
                else:
                    print("📜 Nenhuma política encontrada")
                    
            else:
                print(f"❌ Tabela não existe")
    
    def check_table_dependencies(self):
        """Verifica dependências entre tabelas (foreign keys)"""
        print("\n🔗 DEPENDÊNCIAS ENTRE TABELAS (FOREIGN KEYS):")
        print("-" * 50)
        
        fk_query = """
        SELECT 
            tc.table_name as source_table,
            kcu.column_name as source_column,
            ccu.table_name AS target_table,
            ccu.column_name AS target_column,
            tc.constraint_name
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_schema = 'public'
        ORDER BY tc.table_name, kcu.column_name;
        """
        
        result = self.execute_sql_query(fk_query)
        if result:
            print(result)
    
    def check_triggers(self):
        """Verifica triggers que podem estar criando registros automáticos"""
        print("\n⚡ TRIGGERS ATIVOS:")
        print("-" * 30)
        
        triggers_query = """
        SELECT 
            trigger_name,
            event_manipulation,
            event_object_table,
            action_timing,
            action_statement
        FROM information_schema.triggers
        WHERE trigger_schema = 'public'
        ORDER BY event_object_table, trigger_name;
        """
        
        result = self.execute_sql_query(triggers_query)
        if result:
            print(result)
    
    def test_insert_permissions(self):
        """Testa permissões de inserção em cada tabela crítica"""
        print("\n🧪 TESTE DE PERMISSÕES DE INSERÇÃO:")
        print("-" * 40)
        
        # Dados de teste mínimos para cada tabela
        test_data = {
            'customers': {
                'name': 'Teste RLS',
                'email': 'teste.rls@test.com',
                'phone': '11999999999',
                'street': 'Rua Teste',
                'number': '123',
                'neighborhood': 'Centro',
                'city': 'São Paulo',
                'state': 'SP',
                'postal_code': '01000-000',
                'source': 'website',
                'status': 'active'
            }
        }
        
        for table, data in test_data.items():
            print(f"\n🧪 Testando inserção em {table}...")
            
            # Montar query de inserção
            columns = ', '.join(data.keys())
            values = ', '.join([f"'{v}'" for v in data.values()])
            
            insert_query = f"""
            INSERT INTO {table} ({columns}) 
            VALUES ({values})
            RETURNING id;
            """
            
            result = self.execute_sql_query(insert_query)
            if result and result.strip():
                print(f"✅ Inserção bem-sucedida em {table}")
                
                # Limpar o registro de teste
                cleanup_query = f"DELETE FROM {table} WHERE email = 'teste.rls@test.com';"
                self.execute_sql_query(cleanup_query)
            else:
                print(f"❌ Falha na inserção em {table}")
    
    def generate_rls_report(self):
        """Gera relatório completo das políticas RLS"""
        print("\n📊 GERANDO RELATÓRIO COMPLETO...")
        
        report = []
        report.append("# RELATÓRIO DE INVESTIGAÇÃO RLS")
        report.append("=" * 50)
        report.append(f"Data: {os.popen('date').read().strip()}")
        report.append("")
        
        # Executar todas as análises
        self.get_all_tables_with_rls()
        self.get_all_rls_policies()
        self.analyze_checkout_tables()
        self.check_table_dependencies()
        self.check_triggers()
        self.test_insert_permissions()
        
        print("\n" + "=" * 60)
        print("✅ INVESTIGAÇÃO RLS COMPLETA!")
        print("📋 Analise os resultados acima para identificar problemas")
        print("=" * 60)
    
    def run_investigation(self):
        """Executa investigação completa"""
        self.generate_rls_report()

def main():
    try:
        investigator = RLSInvestigator()
        investigator.run_investigation()
        
    except Exception as e:
        print(f"\n💥 Erro na investigação: {e}")

if __name__ == "__main__":
    main()