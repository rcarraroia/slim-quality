#!/usr/bin/env python3
"""
INVESTIGAÇÃO COMPLETA DAS RLS - SLIM QUALITY
Analisa todas as políticas RLS e identifica problemas sistemáticos
"""

import os
import json
from supabase import create_client, Client

def main():
    # Configurar Supabase
    url = "https://vtynmmtuvxreiwcxxlma.supabase.co"
    key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"
    
    supabase: Client = create_client(url, key)
    
    print("🔍 INVESTIGAÇÃO COMPLETA DAS RLS - SLIM QUALITY")
    print("=" * 60)
    
    try:
        # 1. Listar todas as políticas RLS
        print("\n📋 1. POLÍTICAS RLS ATIVAS:")
        print("-" * 40)
        
        policies_query = """
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
        
        result = supabase.rpc('execute_sql', {'query': policies_query}).execute()
        
        if result.data:
            policies = result.data
            print(f"Total de políticas encontradas: {len(policies)}")
            
            # Agrupar por tabela
            tables_policies = {}
            for policy in policies:
                table = policy['tablename']
                if table not in tables_policies:
                    tables_policies[table] = []
                tables_policies[table].append(policy)
            
            for table, table_policies in tables_policies.items():
                print(f"\n📊 Tabela: {table}")
                print(f"   Políticas: {len(table_policies)}")
                
                for policy in table_policies:
                    print(f"   - {policy['policyname']}")
                    print(f"     Comando: {policy['cmd']}")
                    print(f"     Roles: {policy['roles']}")
                    if policy['qual']:
                        print(f"     Condição: {policy['qual'][:100]}...")
        
        # 2. Verificar tabelas com RLS habilitado
        print("\n🔒 2. TABELAS COM RLS HABILITADO:")
        print("-" * 40)
        
        rls_query = """
        SELECT 
          schemaname,
          tablename,
          rowsecurity
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename;
        """
        
        result = supabase.rpc('execute_sql', {'query': rls_query}).execute()
        
        if result.data:
            tables = result.data
            rls_enabled = [t for t in tables if t['rowsecurity']]
            rls_disabled = [t for t in tables if not t['rowsecurity']]
            
            print(f"✅ Tabelas com RLS habilitado: {len(rls_enabled)}")
            for table in rls_enabled:
                print(f"   - {table['tablename']}")
            
            print(f"\n❌ Tabelas SEM RLS: {len(rls_disabled)}")
            for table in rls_disabled:
                print(f"   - {table['tablename']}")
        
        # 3. Verificar funções que podem causar recursão
        print("\n🔄 3. FUNÇÕES POTENCIALMENTE PROBLEMÁTICAS:")
        print("-" * 40)
        
        functions_query = """
        SELECT 
          routine_name,
          routine_definition
        FROM information_schema.routines 
        WHERE routine_schema = 'public'
        AND routine_type = 'FUNCTION'
        ORDER BY routine_name;
        """
        
        result = supabase.rpc('execute_sql', {'query': functions_query}).execute()
        
        if result.data:
            functions = result.data
            print(f"Total de funções: {len(functions)}")
            
            # Procurar por funções que podem causar recursão
            problematic_functions = []
            for func in functions:
                name = func['routine_name']
                definition = func['routine_definition'] or ""
                
                # Verificar se a função faz referência a auth.uid() ou outras funções auth
                if 'auth.uid()' in definition or 'has_role' in definition:
                    problematic_functions.append(func)
            
            if problematic_functions:
                print(f"⚠️ Funções que podem causar recursão: {len(problematic_functions)}")
                for func in problematic_functions:
                    print(f"   - {func['routine_name']}")
            else:
                print("✅ Nenhuma função problemática encontrada")
        
        # 4. Verificar roles e permissões
        print("\n👥 4. ROLES E PERMISSÕES:")
        print("-" * 40)
        
        roles_query = """
        SELECT 
          rolname,
          rolsuper,
          rolinherit,
          rolcreaterole,
          rolcreatedb,
          rolcanlogin
        FROM pg_roles 
        WHERE rolname NOT LIKE 'pg_%'
        AND rolname NOT LIKE 'rds_%'
        ORDER BY rolname;
        """
        
        result = supabase.rpc('execute_sql', {'query': roles_query}).execute()
        
        if result.data:
            roles = result.data
            print(f"Total de roles: {len(roles)}")
            
            for role in roles:
                print(f"   - {role['rolname']}")
                if role['rolsuper']:
                    print(f"     ⚠️ SUPERUSER")
                if role['rolcanlogin']:
                    print(f"     🔑 Pode fazer login")
        
        # 5. Testar acesso a tabelas críticas
        print("\n🧪 5. TESTE DE ACESSO A TABELAS CRÍTICAS:")
        print("-" * 40)
        
        critical_tables = [
            'customers', 'orders', 'order_items', 'shipping_addresses',
            'affiliates', 'commissions', 'products', 'product_images'
        ]
        
        for table in critical_tables:
            try:
                # Tentar fazer SELECT simples
                result = supabase.table(table).select("*").limit(1).execute()
                
                if result.data is not None:
                    print(f"   ✅ {table}: Acesso OK ({len(result.data)} registros)")
                else:
                    print(f"   ❌ {table}: Sem dados ou erro de acesso")
                    
            except Exception as e:
                error_msg = str(e)
                if "infinite recursion" in error_msg.lower():
                    print(f"   🔄 {table}: RECURSÃO INFINITA detectada!")
                elif "permission denied" in error_msg.lower():
                    print(f"   🚫 {table}: Permissão negada")
                else:
                    print(f"   ❌ {table}: Erro - {error_msg[:50]}...")
        
        # 6. Análise de dependências entre políticas
        print("\n🔗 6. ANÁLISE DE DEPENDÊNCIAS:")
        print("-" * 40)
        
        # Verificar se há políticas que referenciam outras tabelas
        if 'policies' in locals():
            cross_references = []
            
            for policy in policies:
                qual = policy.get('qual', '') or ''
                with_check = policy.get('with_check', '') or ''
                
                # Procurar por referências a outras tabelas
                for table in critical_tables:
                    if table != policy['tablename']:
                        if table in qual or table in with_check:
                            cross_references.append({
                                'policy_table': policy['tablename'],
                                'policy_name': policy['policyname'],
                                'references': table
                            })
            
            if cross_references:
                print(f"⚠️ Políticas com referências cruzadas: {len(cross_references)}")
                for ref in cross_references:
                    print(f"   - {ref['policy_table']}.{ref['policy_name']} → {ref['references']}")
            else:
                print("✅ Nenhuma referência cruzada problemática encontrada")
        
        print("\n" + "=" * 60)
        print("🎯 INVESTIGAÇÃO CONCLUÍDA")
        print("=" * 60)
        
    except Exception as e:
        print(f"❌ Erro na investigação: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()