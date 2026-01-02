#!/usr/bin/env python3
"""
Script para testar conexão com Supabase e verificar tabela conversations
"""

import os
from supabase import create_client, Client

# Configurações do Supabase
SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"

def main():
    try:
        print("🔍 AUDITORIA SUPABASE - TABELA CONVERSATIONS")
        print("=" * 50)
        
        # Criar cliente Supabase
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        print("✅ Cliente Supabase criado com sucesso")
        
        # 1. Verificar se tabela conversations existe
        print("\n1. VERIFICANDO SE TABELA 'conversations' EXISTE...")
        try:
            response = supabase.table('conversations').select('*').limit(1).execute()
            print(f"✅ Tabela 'conversations' existe")
            print(f"   Estrutura da resposta: {type(response.data)}")
        except Exception as e:
            print(f"❌ Erro ao acessar tabela 'conversations': {e}")
            return
        
        # 2. Contar total de conversas
        print("\n2. CONTANDO TOTAL DE CONVERSAS...")
        try:
            response = supabase.table('conversations').select('*', count='exact').execute()
            total_conversations = response.count
            print(f"📊 Total de conversas: {total_conversations}")
        except Exception as e:
            print(f"❌ Erro ao contar conversas: {e}")
        
        # 3. Verificar estrutura da tabela
        print("\n3. VERIFICANDO ESTRUTURA DA TABELA...")
        try:
            response = supabase.table('conversations').select('*').limit(1).execute()
            if response.data:
                print("📋 Campos encontrados:")
                for field in response.data[0].keys():
                    print(f"   - {field}")
            else:
                print("📋 Tabela vazia, não é possível verificar estrutura")
        except Exception as e:
            print(f"❌ Erro ao verificar estrutura: {e}")
        
        # 4. Verificar conversas recentes (últimos 7 dias)
        print("\n4. VERIFICANDO CONVERSAS RECENTES...")
        try:
            response = supabase.table('conversations').select('*').gte('created_at', '2025-12-26').execute()
            recent_conversations = len(response.data) if response.data else 0
            print(f"📅 Conversas dos últimos 7 dias: {recent_conversations}")
            
            if response.data:
                print("📝 Últimas conversas:")
                for conv in response.data[:3]:  # Mostrar apenas 3 primeiras
                    print(f"   - ID: {conv.get('id', 'N/A')}")
                    print(f"     Canal: {conv.get('channel', 'N/A')}")
                    print(f"     Status: {conv.get('status', 'N/A')}")
                    print(f"     Criado: {conv.get('created_at', 'N/A')}")
                    print()
        except Exception as e:
            print(f"❌ Erro ao verificar conversas recentes: {e}")
        
        # 5. Verificar se tabela customers existe (relacionamento)
        print("\n5. VERIFICANDO TABELA 'customers'...")
        try:
            response = supabase.table('customers').select('*', count='exact').limit(1).execute()
            total_customers = response.count
            print(f"✅ Tabela 'customers' existe")
            print(f"👥 Total de clientes: {total_customers}")
        except Exception as e:
            print(f"❌ Erro ao acessar tabela 'customers': {e}")
        
        # 6. Testar query com JOIN (como o frontend faz)
        print("\n6. TESTANDO QUERY COM JOIN (COMO FRONTEND)...")
        try:
            response = supabase.table('conversations').select('''
                *,
                customers!inner(
                    id,
                    name,
                    email,
                    phone
                )
            ''').limit(5).execute()
            
            join_results = len(response.data) if response.data else 0
            print(f"🔗 Conversas com JOIN customers: {join_results}")
            
            if response.data:
                print("📋 Exemplo de dados com JOIN:")
                for conv in response.data[:2]:
                    print(f"   - Conversa ID: {conv.get('id', 'N/A')}")
                    print(f"     Cliente: {conv.get('customers', {}).get('name', 'N/A')}")
                    print(f"     Telefone: {conv.get('customers', {}).get('phone', 'N/A')}")
                    print()
        except Exception as e:
            print(f"❌ Erro no JOIN com customers: {e}")
            print("   Isso pode explicar por que o frontend não carrega conversas!")
        
        print("\n" + "=" * 50)
        print("🎯 RESUMO DA AUDITORIA:")
        print(f"   - Conexão Supabase: ✅ OK")
        print(f"   - Tabela conversations: {'✅ Existe' if 'conversations' in str(response) else '❌ Problema'}")
        print(f"   - Total conversas: {total_conversations if 'total_conversations' in locals() else 'N/A'}")
        print(f"   - Conversas recentes: {recent_conversations if 'recent_conversations' in locals() else 'N/A'}")
        print(f"   - JOIN com customers: {'✅ OK' if join_results > 0 else '❌ Problema'}")
        
    except Exception as e:
        print(f"💥 ERRO CRÍTICO: {e}")
        print("   Verifique as credenciais do Supabase!")

if __name__ == "__main__":
    main()