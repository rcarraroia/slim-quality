#!/usr/bin/env python3
"""
DIAGNÓSTICO COMPLETO DO SISTEMA SLIM QUALITY - VERSÃO CORRIGIDA
Verificação sistemática de todos os componentes necessários
"""

import os
import json
import requests
from supabase import create_client, Client

def print_section(title):
    print(f"\n{'='*60}")
    print(f"🔍 {title}")
    print(f"{'='*60}")

def print_subsection(title):
    print(f"\n📋 {title}")
    print("-" * 40)

def read_env_file():
    """Lê o arquivo .env com tratamento de encoding"""
    env_vars = {}
    if os.path.exists('.env'):
        try:
            with open('.env', 'r', encoding='utf-8') as f:
                content = f.read()
        except UnicodeDecodeError:
            with open('.env', 'r', encoding='latin-1') as f:
                content = f.read()
        
        for line in content.split('\n'):
            if '=' in line and not line.startswith('#'):
                key, value = line.split('=', 1)
                env_vars[key.strip()] = value.strip()
    
    return env_vars

def check_env_variables():
    print_section("1. VARIÁVEIS DE AMBIENTE")
    
    required_vars = [
        'SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'VITE_SUPABASE_URL',
        'SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY'
    ]
    
    print_subsection("Verificando arquivo .env")
    
    if os.path.exists('.env'):
        print("✅ Arquivo .env existe")
        
        env_vars = read_env_file()
        
        for var in required_vars:
            if var in env_vars:
                value = env_vars[var]
                if value and len(value) > 10:
                    print(f"✅ {var}: {value[:30]}...")
                else:
                    print(f"❌ {var}: VAZIO ou INVÁLIDO")
            else:
                print(f"❌ {var}: NÃO ENCONTRADO")
    else:
        print("❌ Arquivo .env NÃO EXISTE")
        return False
    
    return True

def check_supabase_project():
    print_section("2. PROJETO SUPABASE")
    
    env_vars = read_env_file()
    
    supabase_url = env_vars.get('SUPABASE_URL')
    anon_key = env_vars.get('SUPABASE_ANON_KEY')
    service_key = env_vars.get('SUPABASE_SERVICE_ROLE_KEY')
    
    print_subsection("Conectividade do Projeto")
    
    if not supabase_url:
        print("❌ SUPABASE_URL não encontrada")
        return False
    
    print(f"🌐 URL: {supabase_url}")
    
    # Teste 1: Verificar se projeto responde
    try:
        response = requests.get(f"{supabase_url}/rest/v1/", timeout=10)
        if response.status_code == 401:
            print("✅ Projeto ativo (erro 401 esperado sem auth)")
        elif response.status_code == 404:
            print("❌ Projeto PAUSADO ou INEXISTENTE (404)")
            return False
        else:
            print(f"⚠️ Status inesperado: {response.status_code}")
    except Exception as e:
        print(f"❌ Erro de conectividade: {e}")
        return False
    
    # Teste 2: Service Role Key
    print_subsection("Testando Service Role Key")
    
    if service_key:
        try:
            service_supabase = create_client(supabase_url, service_key)
            result = service_supabase.table('products').select('count').execute()
            print("✅ Service Role Key funcionando")
        except Exception as e:
            print(f"❌ Service Role Key falhou: {e}")
            return False
    else:
        print("❌ Service Role Key não encontrada")
        return False
    
    # Teste 3: Anon Key
    print_subsection("Testando Anon Key")
    
    if anon_key:
        try:
            anon_supabase = create_client(supabase_url, anon_key)
            result = anon_supabase.table('products').select('count').execute()
            print("✅ Anon Key funcionando")
            return True
        except Exception as e:
            print(f"❌ Anon Key falhou: {e}")
            
            # Verificar se é problema de RLS
            if "row-level security" in str(e).lower():
                print("   🔒 Problema: RLS está bloqueando acesso")
                return False
            elif "invalid api key" in str(e).lower():
                print("   🔑 Problema: Chave inválida ou expirada")
                return False
            else:
                print(f"   ❓ Erro desconhecido: {e}")
                return False
    else:
        print("❌ Anon Key não encontrada")
        return False

def check_database_structure():
    print_section("3. ESTRUTURA DO BANCO DE DADOS")
    
    env_vars = read_env_file()
    supabase_url = env_vars.get('SUPABASE_URL')
    service_key = env_vars.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if not supabase_url or not service_key:
        print("❌ Credenciais não encontradas")
        return False
    
    try:
        supabase = create_client(supabase_url, service_key)
        
        print_subsection("Tabela: products")
        
        # Verificar se tabela products existe
        try:
            products = supabase.table('products').select('*').limit(1).execute()
            print("✅ Tabela 'products' existe")
            
            if products.data:
                product = products.data[0]
                print(f"   Campos encontrados: {list(product.keys())}")
                
                # Verificar campos críticos
                required_fields = ['id', 'name', 'sku', 'price_cents', 'width_cm', 'length_cm', 'height_cm', 'product_type', 'is_active']
                missing_fields = []
                for field in required_fields:
                    if field in product:
                        print(f"   ✅ {field}")
                    else:
                        print(f"   ❌ {field} FALTANDO")
                        missing_fields.append(field)
                
                if missing_fields:
                    print(f"   ⚠️ Campos faltando: {missing_fields}")
            else:
                print("   ⚠️ Tabela vazia")
                
        except Exception as e:
            print(f"❌ Erro na tabela products: {e}")
            return False
        
        print_subsection("Tabela: product_images")
        
        # Verificar se tabela product_images existe
        try:
            images = supabase.table('product_images').select('*').limit(1).execute()
            print("✅ Tabela 'product_images' existe")
            
            if images.data:
                image = images.data[0]
                print(f"   Campos encontrados: {list(image.keys())}")
            else:
                print("   ⚠️ Tabela vazia")
                
        except Exception as e:
            print(f"❌ Erro na tabela product_images: {e}")
            if "does not exist" in str(e):
                print("   📝 Tabela precisa ser criada")
                return False
        
        print_subsection("Storage: product-images")
        
        # Verificar bucket de storage
        try:
            buckets = supabase.storage.list_buckets()
            bucket_names = [b.name for b in buckets]
            
            if 'product-images' in bucket_names:
                print("✅ Bucket 'product-images' existe")
            else:
                print("❌ Bucket 'product-images' NÃO EXISTE")
                print(f"   Buckets encontrados: {bucket_names}")
                return False
                
        except Exception as e:
            print(f"❌ Erro ao verificar storage: {e}")
            return False
            
    except Exception as e:
        print(f"❌ Erro geral no banco: {e}")
        return False
    
    return True

def check_rls_policies():
    print_section("4. POLÍTICAS RLS (ROW LEVEL SECURITY)")
    
    env_vars = read_env_file()
    supabase_url = env_vars.get('SUPABASE_URL')
    service_key = env_vars.get('SUPABASE_SERVICE_ROLE_KEY')
    anon_key = env_vars.get('SUPABASE_ANON_KEY')
    
    if not supabase_url or not service_key:
        print("❌ Credenciais não encontradas")
        return False
    
    try:
        supabase = create_client(supabase_url, service_key)
        
        print_subsection("RLS Status")
        
        if anon_key:
            try:
                anon_supabase = create_client(supabase_url, anon_key)
                
                # Teste de leitura
                result = anon_supabase.table('products').select('id').limit(1).execute()
                print("✅ Anon key pode LER products")
                
                # Teste de inserção
                test_product = {
                    "name": "Teste RLS",
                    "sku": "TEST-RLS",
                    "price_cents": 100000,
                    "width_cm": 100,
                    "length_cm": 200,
                    "height_cm": 30,
                    "is_active": True,
                    "product_type": "mattress"
                }
                
                insert_result = anon_supabase.table('products').insert(test_product).execute()
                
                if insert_result.data:
                    print("✅ Anon key pode INSERIR products (RLS desabilitado ou política permissiva)")
                    # Limpar
                    supabase.table('products').delete().eq('id', insert_result.data[0]['id']).execute()
                    return True
                else:
                    print("❌ Anon key NÃO pode inserir products")
                    return False
                    
            except Exception as e:
                if "row-level security" in str(e).lower():
                    print("❌ RLS está BLOQUEANDO operações com anon key")
                    print("   💡 Solução: Desabilitar RLS ou criar políticas adequadas")
                    return False
                else:
                    print(f"❌ Outro erro com anon key: {e}")
                    return False
        else:
            print("❌ Anon key não encontrada")
            return False
        
    except Exception as e:
        print(f"❌ Erro ao verificar RLS: {e}")
        return False

def check_frontend_config():
    print_section("5. CONFIGURAÇÃO DO FRONTEND")
    
    print_subsection("Arquivo de configuração Supabase")
    
    config_files = [
        'src/config/supabase.ts',
        'src/lib/supabase.ts',
        'src/utils/supabase.ts'
    ]
    
    config_found = False
    for config_file in config_files:
        if os.path.exists(config_file):
            print(f"✅ Encontrado: {config_file}")
            config_found = True
            
            with open(config_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Verificar se usa as variáveis corretas
            if 'VITE_SUPABASE_URL' in content:
                print("   ✅ Usa VITE_SUPABASE_URL")
            elif 'NEXT_PUBLIC_SUPABASE_URL' in content:
                print("   ✅ Usa NEXT_PUBLIC_SUPABASE_URL")
            else:
                print("   ❌ Não encontrou variável de URL")
            
            if 'VITE_SUPABASE_ANON_KEY' in content:
                print("   ✅ Usa VITE_SUPABASE_ANON_KEY")
            elif 'NEXT_PUBLIC_SUPABASE_ANON_KEY' in content:
                print("   ✅ Usa NEXT_PUBLIC_SUPABASE_ANON_KEY")
            else:
                print("   ❌ Não encontrou variável de chave")
            
            break
    
    if not config_found:
        print("❌ Nenhum arquivo de configuração Supabase encontrado")
        return False
    
    print_subsection("Página de Produtos")
    
    if os.path.exists('src/pages/dashboard/Produtos.tsx'):
        print("✅ Arquivo Produtos.tsx existe")
        
        with open('src/pages/dashboard/Produtos.tsx', 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Verificar imports e queries
        if 'from \'@/config/supabase\'' in content:
            print("   ✅ Importa configuração Supabase")
        
        if '.select(\'*, product_images(image_url)\')' in content:
            print("   ✅ Query com JOIN para product_images")
        
        if '.insert(' in content:
            print("   ✅ Tem funcionalidade de inserção")
        
        return True
    else:
        print("❌ Arquivo Produtos.tsx NÃO EXISTE")
        return False

def main():
    print("🚀 DIAGNÓSTICO COMPLETO - SISTEMA SLIM QUALITY")
    print("Verificação sistemática de todos os componentes")
    
    results = []
    
    try:
        results.append(("Variáveis de Ambiente", check_env_variables()))
        results.append(("Projeto Supabase", check_supabase_project()))
        results.append(("Estrutura do Banco", check_database_structure()))
        results.append(("Políticas RLS", check_rls_policies()))
        results.append(("Configuração Frontend", check_frontend_config()))
        
    except Exception as e:
        print(f"❌ Erro durante diagnóstico: {e}")
    
    # Resumo final
    print_section("RESUMO DO DIAGNÓSTICO")
    
    for component, status in results:
        status_icon = "✅" if status else "❌"
        print(f"{status_icon} {component}")
    
    failed_components = [comp for comp, status in results if not status]
    
    if failed_components:
        print(f"\n🔧 COMPONENTES COM PROBLEMAS:")
        for comp in failed_components:
            print(f"   - {comp}")
        print(f"\n💡 FOQUE NA CORREÇÃO DESTES COMPONENTES PRIMEIRO")
        
        # Sugestões específicas
        if "Projeto Supabase" in failed_components:
            print(f"\n🔑 PROBLEMA CRÍTICO: Projeto Supabase não está funcionando")
            print(f"   1. Verifique se o projeto está pausado no dashboard")
            print(f"   2. Verifique se as chaves API estão corretas")
            print(f"   3. Regenere as chaves se necessário")
        
        if "Políticas RLS" in failed_components:
            print(f"\n🔒 PROBLEMA RLS: Row Level Security está bloqueando operações")
            print(f"   1. Desabilite RLS temporariamente: ALTER TABLE products DISABLE ROW LEVEL SECURITY;")
            print(f"   2. Ou crie políticas adequadas para permitir operações anônimas")
        
    else:
        print(f"\n🎉 TODOS OS COMPONENTES ESTÃO FUNCIONAIS!")

if __name__ == "__main__":
    main()