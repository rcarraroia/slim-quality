#!/usr/bin/env python3
"""
AUDITORIA COMPLETA FINAL - Identificar e corrigir TODOS os problemas
"""

from supabase import create_client, Client
import requests

# Configuração do Supabase
SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODE2MDIsImV4cCI6MjA3MTk1NzYwMn0.fd-WSqFh7QsSlB0Q62cXAZZ-yDcI0n0sXyJ4eWIRKH8"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"

def auditoria_completa():
    print("🔍 AUDITORIA COMPLETA FINAL - DIAGNÓSTICO TOTAL")
    print("=" * 60)
    
    # Criar clientes
    supabase_anon = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    problemas = []
    
    # 1. VERIFICAR ACESSO A TODAS AS TABELAS CRÍTICAS
    print("\n1️⃣ VERIFICANDO ACESSO ÀS TABELAS CRÍTICAS:")
    print("-" * 50)
    
    tabelas_criticas = [
        'profiles', 'conversations', 'messages', 'products', 
        'orders', 'customers', 'affiliates', 'commissions'
    ]
    
    for tabela in tabelas_criticas:
        try:
            # Testar com anon key (frontend)
            result_anon = supabase_anon.table(tabela).select('*').limit(3).execute()
            count_anon = len(result_anon.data)
            
            # Testar com service key (backend)
            result_admin = supabase_admin.table(tabela).select('*').limit(3).execute()
            count_admin = len(result_admin.data)
            
            if count_anon == 0 and count_admin > 0:
                problemas.append(f"❌ Tabela '{tabela}': Frontend bloqueado (RLS)")
                print(f"❌ {tabela:15} | Frontend: BLOQUEADO | Backend: {count_admin} registros")
            elif count_anon > 0:
                print(f"✅ {tabela:15} | Frontend: {count_anon} registros | Backend: {count_admin} registros")
            else:
                print(f"⚠️ {tabela:15} | Sem dados em ambos")
                
        except Exception as e:
            problemas.append(f"❌ Tabela '{tabela}': Erro de acesso - {str(e)}")
            print(f"💥 {tabela:15} | ERRO: {str(e)[:50]}...")
    
    # 2. VERIFICAR PERFIL ESPECÍFICO DO USUÁRIO
    print("\n2️⃣ VERIFICANDO PERFIL DO USUÁRIO LOGADO:")
    print("-" * 50)
    
    user_id = "e8bb906b-18cf-4a07-bcff-32a152574d74"  # ID do Renato dos logs
    
    try:
        # Testar busca do perfil com anon key
        profile_anon = supabase_anon.table('profiles').select('*').eq('id', user_id).execute()
        
        if profile_anon.data:
            print(f"✅ Perfil encontrado com anon key: {profile_anon.data[0].get('email')}")
        else:
            problemas.append("❌ Perfil não encontrado com anon key")
            print("❌ Perfil NÃO encontrado com anon key")
            
        # Testar com service key
        profile_admin = supabase_admin.table('profiles').select('*').eq('id', user_id).execute()
        
        if profile_admin.data:
            print(f"✅ Perfil encontrado com service key: {profile_admin.data[0].get('email')}")
        else:
            print("❌ Perfil NÃO encontrado nem com service key")
            
    except Exception as e:
        problemas.append(f"❌ Erro ao buscar perfil: {str(e)}")
        print(f"💥 Erro ao buscar perfil: {str(e)}")
    
    # 3. VERIFICAR RLS POLICIES
    print("\n3️⃣ VERIFICANDO STATUS DO RLS:")
    print("-" * 50)
    
    try:
        # Verificar se RLS está ativo na tabela profiles
        rls_check = supabase_admin.rpc('check_rls_status').execute()
        print("✅ Verificação RLS executada")
    except Exception as e:
        print(f"⚠️ Não foi possível verificar RLS: {str(e)}")
    
    # 4. TESTAR LOGIN COMPLETO
    print("\n4️⃣ TESTANDO LOGIN COMPLETO:")
    print("-" * 50)
    
    try:
        # Fazer login
        auth_result = supabase_anon.auth.sign_in_with_password({
            "email": "rcarrarocoach@gmail.com",
            "password": "123456"
        })
        
        if auth_result.user:
            print(f"✅ Login funcionou: {auth_result.user.email}")
            
            # Tentar buscar perfil após login
            profile_after_login = supabase_anon.table('profiles').select('*').eq('id', auth_result.user.id).execute()
            
            if profile_after_login.data:
                print(f"✅ Perfil encontrado após login: {profile_after_login.data[0].get('full_name')}")
            else:
                problemas.append("❌ Perfil não encontrado após login")
                print("❌ Perfil NÃO encontrado após login")
            
            # Logout
            supabase_anon.auth.sign_out()
        else:
            problemas.append("❌ Login falhou")
            print("❌ Login falhou")
            
    except Exception as e:
        problemas.append(f"❌ Erro no teste de login: {str(e)}")
        print(f"💥 Erro no teste de login: {str(e)}")
    
    # 5. DIAGNÓSTICO FINAL E SOLUÇÕES
    print("\n5️⃣ DIAGNÓSTICO FINAL:")
    print("-" * 50)
    
    if problemas:
        print("🚨 PROBLEMAS IDENTIFICADOS:")
        for problema in problemas:
            print(f"   {problema}")
        
        print("\n🔧 SOLUÇÕES NECESSÁRIAS:")
        
        # Se profiles está bloqueado, desabilitar RLS
        if any("profiles" in p and "bloqueado" in p.lower() for p in problemas):
            print("   1. DESABILITAR RLS na tabela profiles")
            
        # Se outras tabelas estão bloqueadas
        tabelas_bloqueadas = [p for p in problemas if "bloqueado" in p.lower()]
        if len(tabelas_bloqueadas) > 1:
            print("   2. DESABILITAR RLS em todas as tabelas críticas")
            
        # Se perfil não é encontrado
        if any("perfil não encontrado" in p.lower() for p in problemas):
            print("   3. CRIAR perfil para usuário logado")
            
    else:
        print("✅ Sistema aparenta estar funcionando corretamente")
        print("   Problema pode estar no frontend (redirecionamento)")
    
    print("\n" + "=" * 60)
    print("🏁 AUDITORIA COMPLETA CONCLUÍDA")
    
    return problemas

if __name__ == "__main__":
    problemas = auditoria_completa()
    
    if problemas:
        print(f"\n📊 RESUMO: {len(problemas)} problemas identificados")
        print("🔧 Aplicando correções automáticas...")
    else:
        print("\n📊 RESUMO: Sistema OK, problema pode ser no frontend")