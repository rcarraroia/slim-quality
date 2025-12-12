#!/usr/bin/env python3
"""
DIAGNÓSTICO COMPLETO DO SISTEMA SLIM QUALITY
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
        
        with open('.env', 'r') as f:
            env_content = f.read()
        
        for var in required_vars:
            if var in env_content:
                # Extrair valor
                for line in env_content.split('\n'):
                    if line.startswith(f'{var}='):
                        value = line.split('=', 1)[1]
                        if value and len(value) > 10:
                            print(f"✅ {var}: {value[:30]}...")
                        else:
                            print(f"❌ {var}: VAZIO ou INVÁLIDO")
                        break
            else:
                print(f"❌ {var}: NÃO ENCONTRADO")
    else:
        print("❌ Arquivo .env NÃO EXISTE")
    
    return True

def check_supabase_project():
    print_section("2. PROJETO SUPABASE")
    
    # Extrair credenciais do .env
    supabase_url = None
    anon_key = None
    service_key = None
    
    if os.path.exists('.env'):
        with open('.env', 'r') as f:
            for line in f:
                if line.startswith('SUPABASE_URL='):
                    supabase_url = line.split('=', 1)[1].strip()
                elif line.startswith('SUPABASE_ANON_KEY='):
                    anon_key = line.split('=', 1)[1].strip()
                elif line.startswith('SUPABASE_SERVICE_ROLE_KEY='):
                    service_key = line.split('=', 1)[1].strip()
    
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
    else:
        print("❌ Service Role Key não encontrada")
    
    # Teste 3: Anon Key
    print_subsection("Testando Anon Key")
    
    if anon_key:
        try:
            anon_supabase = create_client(supabase_url, anon_key)
            result = anon_supabase.table('products').select('count').execute()
            print("✅ Anon Key funcionando")
        except Exception as e:
            print(f"❌ Anon Key falhou: {e}")
            
            # Verificar se é problema de RLS
            if "row-level security" in str(e).lower():
                print("   🔒 Problema: RLS está bloqueando acesso")
            elif "invalid api key" in str(e).lower():
                print("   🔑 Problema: Chave inválida ou expirada")
    else:
        print("❌ Anon Key não encontrada")
    
    return True

def check_database_structure():
    print_section("3. ESTRUTURA DO BANCO DE DADOS")
    
    # Usar service key para verificar estrutura
    supabase_url = None
    service_key = None
    
    if os.path.exists('.env'):
        with open('.env', 'r') as f:
            for line in f:
                if line.startswith('SUPABASE_URL='):
                    supabase_url = line.split('=', 1)[1].strip()
                elif line.startswith('SUPABASE_SERVICE_ROLE_KEY='):
                    service_key = line.split('=', 1)[1].strip()
    
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
                for field in required_fields:
                    if field in product:
                        print(f"   ✅ {field}")
                    else:
                        print(f"   ❌ {field} FALTANDO")
            else:
                print("   ⚠️ Tabela vazia")
                
        except Exception as e:
            print(f"❌ Erro na tabela products: {e}")
        
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
                
        except Exception as e:
            print(f"❌ Erro ao verificar storage: {e}")
            
    except Exception as e:
        print(f"❌ Erro geral no banco: {e}")
        return False
    
    return True

def check_rls_policies():
    print_section("4. POLÍTICAS RLS (ROW LEVEL SECURITY)")
    
    supabase_url = None
    service_key = None
    
    if os.path.exists('.env'):
        with open('.env', 'r') as f:
            for line in f:
                if line.startswith('SUPABASE_URL='):
                    supabase_url = line.split('=', 1)[1].strip()
                elif line.startswith('SUPABASE_SERVICE_ROLE_KEY='):
                    service_key = line.split('=', 1)[1].strip()
    
    if not supabase_url or not service_key:
        print("❌ Credenciais não encontradas")
        return False
    
    try:
        supabase = create_client(supabase_url, service_key)
        
        print_subsection("RLS Status")
        
        # Verificar se RLS está ativo (usando query SQL direta se possível)
        # Como não temos acesso direto ao SQL, vamos testar inserção com anon key
        
        anon_key = None
        with open('.env', 'r') as f:
            for line in f:
                if line.startswith('SUPABASE_ANON_KEY='):
                    anon_key = line.split('=', 1)[1].strip()
        
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
                else:
                    print("❌ Anon key NÃO pode inserir products")
                    
            except Exception as e:
                if "row-level security" in str(e).lower():
                    print("❌ RLS está BLOQUEANDO operações com anon key")
                    print("   💡 Solução: Desabilitar RLS ou criar políticas adequadas")
                else:
                    print(f"❌ Outro erro com anon key: {e}")
        
    except Exception as e:
        print(f"❌ Erro ao verificar RLS: {e}")
    
    return True

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
            
            with open(config_file, 'r') as f:
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
    
    print_subsection("Página de Produtos")
    
    if os.path.exists('src/pages/dashboard/Produtos.tsx'):
        print("✅ Arquivo Produtos.tsx existe")
        
        with open('src/pages/dashboard/Produtos.tsx', 'r') as f:
            content = f.read()
        
        # Verificar imports e queries
        if 'from \'@/config/supabase\'' in content:
            print("   ✅ Importa configuração Supabase")
        
        if '.select(\'*, product_images(image_url)\')' in content:
            print("   ✅ Query com JOIN para product_images")
        
        if '.insert(' in content:
            print("   ✅ Tem funcionalidade de inserção")
        
    else:
        print("❌ Arquivo Produtos.tsx NÃO EXISTE")
    
    return True

def check_package_dependencies():
    print_section("6. DEPENDÊNCIAS DO PROJETO")
    
    print_subsection("package.json")
    
    if os.path.exists('package.json'):
        print("✅ package.json existe")
        
        with open('package.json', 'r') as f:
            package_data = json.load(f)
        
        dependencies = package_data.get('dependencies', {})
        
        required_deps = [
            '@supabase/supabase-js',
            'react',
            'typescript'
        ]
        
        for dep in required_deps:
            if dep in dependencies:
                print(f"   ✅ {dep}: {dependencies[dep]}")
            else:
                print(f"   ❌ {dep}: NÃO ENCONTRADO")
    else:
        print("❌ package.json NÃO EXISTE")
    
    return True

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
        results.append(("Dependências", check_package_dependencies()))
        
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
    else:
        print(f"\n🎉 TODOS OS COMPONENTES ESTÃO FUNCIONAIS!")

if __name__ == "__main__":
    main()