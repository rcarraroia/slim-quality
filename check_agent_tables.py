#!/usr/bin/env python3
"""
Script para verificar tabelas relacionadas ao agente no banco real
"""

import os
import psycopg2
from psycopg2.extras import RealDictCursor
import json

# Configurações do Supabase
SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"

# String de conexão PostgreSQL
DB_URL = "postgresql://postgres.vtynmmtuvxreiwcxxlma:Renum@2025@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"

def main():
    print("🔍 VERIFICAÇÃO DO BANCO REAL - TABELAS DO AGENTE")
    print("=" * 60)
    
    try:
        # Conectar ao banco
        conn = psycopg2.connect(DB_URL)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        print("✅ Conectado ao banco com sucesso!")
        print()
        
        # 1. Listar TODAS as tabelas
        print("📋 TODAS AS TABELAS NO BANCO:")
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        """)
        
        all_tables = cursor.fetchall()
        for table in all_tables:
            print(f"  - {table['table_name']}")
        
        print(f"\n📊 Total de tabelas: {len(all_tables)}")
        print()
        
        # 2. Buscar tabelas relacionadas ao agente
        print("🤖 TABELAS RELACIONADAS AO AGENTE:")
        agent_keywords = ['agent', 'sicc', 'memory', 'learning', 'behavior', 'automation', 'sub_agent']
        
        agent_tables = []
        for table in all_tables:
            table_name = table['table_name']
            for keyword in agent_keywords:
                if keyword in table_name.lower():
                    agent_tables.append(table_name)
                    break
        
        if agent_tables:
            for table in agent_tables:
                print(f"  ✅ {table}")
        else:
            print("  ❌ Nenhuma tabela relacionada ao agente encontrada!")
        
        print()
        
        # 3. Verificar estrutura das tabelas do agente
        for table_name in agent_tables:
            print(f"📋 ESTRUTURA DA TABELA: {table_name}")
            print("-" * 40)
            
            # Obter colunas
            cursor.execute("""
                SELECT 
                    column_name,
                    data_type,
                    is_nullable,
                    column_default
                FROM information_schema.columns 
                WHERE table_name = %s 
                ORDER BY ordinal_position;
            """, (table_name,))
            
            columns = cursor.fetchall()
            for col in columns:
                nullable = "NULL" if col['is_nullable'] == 'YES' else "NOT NULL"
                default = f" DEFAULT {col['column_default']}" if col['column_default'] else ""
                print(f"  - {col['column_name']}: {col['data_type']} {nullable}{default}")
            
            # Contar registros
            cursor.execute(f"SELECT COUNT(*) as count FROM {table_name};")
            count = cursor.fetchone()['count']
            print(f"  📊 Registros: {count}")
            print()
        
        # 4. Verificar se existem tabelas de configuração
        print("⚙️ VERIFICANDO TABELAS DE CONFIGURAÇÃO:")
        config_tables = ['agent_config', 'agent_configuration', 'sicc_config', 'sicc_configuration', 'system_config', 'app_config']
        
        found_config = False
        for config_table in config_tables:
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = %s
                );
            """, (config_table,))
            
            exists = cursor.fetchone()[0]
            if exists:
                print(f"  ✅ {config_table} - EXISTE")
                found_config = True
            else:
                print(f"  ❌ {config_table} - NÃO EXISTE")
        
        if not found_config:
            print("\n🚨 NENHUMA TABELA DE CONFIGURAÇÃO ENCONTRADA!")
        
        print()
        
        # 5. Verificar tabelas que podem armazenar configurações JSON
        print("🔍 TABELAS COM CAMPOS JSON (possíveis configurações):")
        cursor.execute("""
            SELECT 
                table_name,
                column_name,
                data_type
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND (data_type = 'json' OR data_type = 'jsonb')
            ORDER BY table_name, column_name;
        """)
        
        json_columns = cursor.fetchall()
        if json_columns:
            for col in json_columns:
                print(f"  - {col['table_name']}.{col['column_name']} ({col['data_type']})")
        else:
            print("  ❌ Nenhuma coluna JSON encontrada")
        
        print()
        
        # 6. Resumo final
        print("📊 RESUMO DA ANÁLISE:")
        print(f"  - Total de tabelas no banco: {len(all_tables)}")
        print(f"  - Tabelas relacionadas ao agente: {len(agent_tables)}")
        print(f"  - Tabelas de configuração específicas: {'SIM' if found_config else 'NÃO'}")
        print(f"  - Colunas JSON (config possível): {len(json_columns)}")
        
        print()
        print("🎯 CONCLUSÃO:")
        if not agent_tables and not found_config:
            print("❌ CRÍTICO: Não há tabelas específicas para configuração do agente!")
            print("   As configurações provavelmente estão sendo armazenadas em:")
            print("   1. Variáveis de ambiente")
            print("   2. Arquivos de configuração")
            print("   3. Ou não estão sendo persistidas")
        else:
            print("✅ Encontradas tabelas relacionadas ao agente.")
            print("   Verificar se essas tabelas armazenam as configurações necessárias.")
        
    except Exception as e:
        print(f"❌ Erro ao conectar ao banco: {e}")
        print("\nTentando com credenciais alternativas...")
        
        # Tentar com URL alternativa
        try:
            alt_url = "postgresql://postgres:Renum@2025@db.vtynmmtuvxreiwcxxlma.supabase.co:5432/postgres"
            conn = psycopg2.connect(alt_url)
            print("✅ Conectado com URL alternativa!")
            # Repetir análise...
        except Exception as e2:
            print(f"❌ Erro com URL alternativa: {e2}")
    
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    main()