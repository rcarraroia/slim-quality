#!/usr/bin/env python3
"""
Script CORRETO para criar configurações no Supabase
SEM usar exec_sql que não existe!
"""

from supabase import create_client, Client

# Configurações do Supabase
SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"

def main():
    print("🔧 INSERINDO CONFIGURAÇÕES NO SUPABASE (MÉTODO CORRETO)")
    print("=" * 60)
    print("⚠️ NOTA: As tabelas devem ser criadas manualmente no Dashboard")
    print("Este script apenas insere os dados de configuração padrão")
    print()
    
    try:
        # Conectar ao Supabase
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        print("✅ Conectado ao Supabase com sucesso!")
        
        # 1. VERIFICAR SE TABELAS EXISTEM
        print("\n🔍 Verificando se as tabelas existem...")
        
        try:
            # Tentar acessar agent_config
            agent_test = supabase.table('agent_config').select('id').limit(1).execute()
            print("✅ Tabela agent_config existe!")
            agent_exists = True
        except Exception as e:
            print("❌ Tabela agent_config NÃO existe!")
            print(f"   Erro: {e}")
            agent_exists = False
        
        try:
            # Tentar acessar sicc_config
            sicc_test = supabase.table('sicc_config').select('id').limit(1).execute()
            print("✅ Tabela sicc_config existe!")
            sicc_exists = True
        except Exception as e:
            print("❌ Tabela sicc_config NÃO existe!")
            print(f"   Erro: {e}")
            sicc_exists = False
        
        # 2. INSERIR DADOS SE TABELAS EXISTEM
        if agent_exists:
            print("\n📋 Inserindo configuração padrão do agente...")
            
            # Verificar se já existe configuração
            existing = supabase.table('agent_config').select('id').execute()
            
            if not existing.data:
                agent_data = {
                    'model': 'gpt-4o',
                    'temperature': 0.7,
                    'max_tokens': 2000,
                    'system_prompt': 'Você é a BIA, consultora especializada em colchões magnéticos terapêuticos da Slim Quality. Seja consultiva, empática e focada em resolver problemas de saúde e sono dos clientes.',
                    'sicc_enabled': False
                }
                
                result = supabase.table('agent_config').insert(agent_data).execute()
                print("✅ Configuração padrão do agente inserida!")
            else:
                print("ℹ️ Configuração do agente já existe")
        
        if sicc_exists:
            print("\n📋 Inserindo configuração padrão do SICC...")
            
            # Verificar se já existe configuração
            existing_sicc = supabase.table('sicc_config').select('id').execute()
            
            if not existing_sicc.data:
                sicc_data = {
                    'sicc_enabled': False,
                    'auto_approval_threshold': 75,
                    'embedding_model': 'sentence-transformers/all-MiniLM-L6-v2',
                    'memory_quota': 500
                }
                
                result = supabase.table('sicc_config').insert(sicc_data).execute()
                print("✅ Configuração padrão do SICC inserida!")
            else:
                print("ℹ️ Configuração do SICC já existe")
        
        # 3. INSTRUÇÕES PARA CRIAR TABELAS MANUALMENTE
        if not agent_exists or not sicc_exists:
            print("\n🚨 AÇÃO NECESSÁRIA:")
            print("As tabelas precisam ser criadas MANUALMENTE no Dashboard do Supabase")
            print()
            print("📋 PASSOS:")
            print("1. Acesse: https://supabase.com/dashboard/project/vtynmmtuvxreiwcxxlma")
            print("2. Vá em 'Table Editor'")
            print("3. Clique em 'New Table'")
            print()
            
            if not agent_exists:
                print("🔧 CRIAR TABELA: agent_config")
                print("Colunas:")
                print("- id: uuid, primary key, default: gen_random_uuid()")
                print("- model: varchar(50), default: 'gpt-4o'")
                print("- temperature: numeric(3,2), default: 0.7")
                print("- max_tokens: integer, default: 2000")
                print("- system_prompt: text")
                print("- sicc_enabled: boolean, default: false")
                print("- created_at: timestamptz, default: now()")
                print("- updated_at: timestamptz, default: now()")
                print()
            
            if not sicc_exists:
                print("🔧 CRIAR TABELA: sicc_config")
                print("Colunas:")
                print("- id: uuid, primary key, default: gen_random_uuid()")
                print("- sicc_enabled: boolean, default: false")
                print("- auto_approval_threshold: integer, default: 75")
                print("- embedding_model: varchar(100), default: 'sentence-transformers/all-MiniLM-L6-v2'")
                print("- memory_quota: integer, default: 500")
                print("- created_at: timestamptz, default: now()")
                print("- updated_at: timestamptz, default: now()")
                print()
            
            print("4. Após criar as tabelas, execute este script novamente")
        
        print("\n🎉 PROCESSO CONCLUÍDO!")
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()