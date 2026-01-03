#!/usr/bin/env python3
"""
Script para criar tabelas de configuração no Supabase
"""

import os
from supabase import create_client, Client

# Configurações do Supabase
SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"

def main():
    print("🔧 CRIANDO TABELAS DE CONFIGURAÇÃO NO SUPABASE")
    print("=" * 60)
    
    try:
        # Conectar ao Supabase
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        print("✅ Conectado ao Supabase com sucesso!")
        
        # 1. CRIAR TABELA AGENT_CONFIG
        print("\n📋 Criando tabela agent_config...")
        
        agent_config_sql = """
        CREATE TABLE IF NOT EXISTS agent_config (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            model VARCHAR(50) NOT NULL DEFAULT 'gpt-4o',
            temperature DECIMAL(3,2) NOT NULL DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
            max_tokens INTEGER NOT NULL DEFAULT 2000 CHECK (max_tokens >= 100 AND max_tokens <= 4000),
            system_prompt TEXT,
            sicc_enabled BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        """
        
        result = supabase.rpc('exec_sql', {'sql': agent_config_sql}).execute()
        print("✅ Tabela agent_config criada!")
        
        # 2. CRIAR TRIGGER PARA AGENT_CONFIG
        print("📋 Criando trigger para agent_config...")
        
        agent_trigger_sql = """
        CREATE OR REPLACE TRIGGER update_agent_config_updated_at
            BEFORE UPDATE ON agent_config
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        """
        
        try:
            result = supabase.rpc('exec_sql', {'sql': agent_trigger_sql}).execute()
            print("✅ Trigger agent_config criado!")
        except Exception as e:
            print(f"⚠️ Trigger agent_config: {e} (pode ser que a função update_updated_at_column não exista)")
        
        # 3. INSERIR DADOS PADRÃO AGENT_CONFIG
        print("📋 Inserindo configuração padrão do agente...")
        
        # Verificar se já existe configuração
        existing = supabase.table('agent_config').select('id').execute()
        
        if not existing.data:
            agent_data = {
                'model': 'gpt-4o',
                'temperature': 0.7,
                'max_tokens': 2000,
                'system_prompt': 'Você é a BIA, consultora especializada em colchões magnéticos terapêuticos da Slim Quality. Seja consultiva, empática e focada em resolver problemas de saúde e sono dos clientes. Apresente os produtos de forma educativa, não apenas vendedora.',
                'sicc_enabled': False
            }
            
            result = supabase.table('agent_config').insert(agent_data).execute()
            print("✅ Configuração padrão do agente inserida!")
        else:
            print("ℹ️ Configuração do agente já existe, pulando inserção")
        
        # 4. CRIAR TABELA SICC_CONFIG
        print("\n📋 Criando tabela sicc_config...")
        
        sicc_config_sql = """
        CREATE TABLE IF NOT EXISTS sicc_config (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            sicc_enabled BOOLEAN NOT NULL DEFAULT false,
            auto_approval_threshold INTEGER NOT NULL DEFAULT 75 CHECK (auto_approval_threshold >= 0 AND auto_approval_threshold <= 100),
            embedding_model VARCHAR(100) NOT NULL DEFAULT 'sentence-transformers/all-MiniLM-L6-v2',
            memory_quota INTEGER NOT NULL DEFAULT 500 CHECK (memory_quota >= 100 AND memory_quota <= 2000),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        """
        
        result = supabase.rpc('exec_sql', {'sql': sicc_config_sql}).execute()
        print("✅ Tabela sicc_config criada!")
        
        # 5. CRIAR TRIGGER PARA SICC_CONFIG
        print("📋 Criando trigger para sicc_config...")
        
        sicc_trigger_sql = """
        CREATE OR REPLACE TRIGGER update_sicc_config_updated_at
            BEFORE UPDATE ON sicc_config
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        """
        
        try:
            result = supabase.rpc('exec_sql', {'sql': sicc_trigger_sql}).execute()
            print("✅ Trigger sicc_config criado!")
        except Exception as e:
            print(f"⚠️ Trigger sicc_config: {e} (pode ser que a função update_updated_at_column não exista)")
        
        # 6. INSERIR DADOS PADRÃO SICC_CONFIG
        print("📋 Inserindo configuração padrão do SICC...")
        
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
            print("ℹ️ Configuração do SICC já existe, pulando inserção")
        
        # 7. VERIFICAR TABELAS CRIADAS
        print("\n🔍 VERIFICANDO TABELAS CRIADAS:")
        
        # Verificar agent_config
        agent_result = supabase.table('agent_config').select('*').execute()
        print(f"📊 agent_config: {len(agent_result.data)} registros")
        if agent_result.data:
            config = agent_result.data[0]
            print(f"   - Model: {config['model']}")
            print(f"   - Temperature: {config['temperature']}")
            print(f"   - Max Tokens: {config['max_tokens']}")
            print(f"   - SICC Enabled: {config['sicc_enabled']}")
        
        # Verificar sicc_config
        sicc_result = supabase.table('sicc_config').select('*').execute()
        print(f"📊 sicc_config: {len(sicc_result.data)} registros")
        if sicc_result.data:
            config = sicc_result.data[0]
            print(f"   - SICC Enabled: {config['sicc_enabled']}")
            print(f"   - Threshold: {config['auto_approval_threshold']}%")
            print(f"   - Embedding Model: {config['embedding_model']}")
            print(f"   - Memory Quota: {config['memory_quota']}")
        
        print("\n🎉 TABELAS DE CONFIGURAÇÃO CRIADAS COM SUCESSO!")
        print("✅ agent_config: Configurações do agente")
        print("✅ sicc_config: Configurações do SICC")
        print("\n📋 PRÓXIMO PASSO: Modificar APIs do backend para usar essas tabelas")
        
    except Exception as e:
        print(f"❌ Erro ao criar tabelas: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()