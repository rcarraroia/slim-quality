#!/usr/bin/env python3
"""
Verificação HONESTA do banco de dados real - Slim Quality
Seguindo protocolo de verificação obrigatória
"""
import os
from supabase import create_client, Client

# Credenciais reais do projeto (conforme steering files)
SUPABASE_URL = "https://vtynmmtuvxreiwcxxlma.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0eW5tbXR1dnhyZWl3Y3h4bG1hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjM4MTYwMiwiZXhwIjoyMDcxOTU3NjAyfQ.-vh-TMWwltqy8--3Ka9Fb9ToYwRw8nkdP49QtKZ77e0"

def verificar_banco_real():
    """
    Verificação completa e honesta do banco de dados
    IMPORTANTE: Usando service_role key para bypass RLS
    """
    print("🔍 VERIFICAÇÃO DO BANCO DE DADOS REAL - 12/12/2025")
    print("=" * 60)
    
    try:
        # Conectar ao Supabase
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        print("✅ Conectado ao Supabase com sucesso")
        
        # Lista de tabelas relacionadas a afiliados para verificar
        tabelas_afiliados = [
            'affiliates',
            'affiliate_network', 
            'commissions',
            'referral_clicks',
            'referral_conversions',
            'asaas_wallets',
            'webhook_logs'
        ]
        
        print(f"\n📋 VERIFICANDO {len(tabelas_afiliados)} TABELAS DE AFILIADOS:")
        print("-" * 60)
        
        tabelas_existentes = []
        total_registros = 0
        
        for tabela in tabelas_afiliados:
            try:
                # Tentar fazer uma query simples para verificar se existe
                result = supabase.table(tabela).select("*").limit(1).execute()
                
                # Se chegou até aqui, tabela existe
                count_result = supabase.table(tabela).select("*", count='exact').execute()
                count = count_result.count or 0
                
                print(f"✅ {tabela:<20} | EXISTE | {count:>6} registros")
                tabelas_existentes.append(tabela)
                total_registros += count
                
                # Se tem dados, mostrar amostra
                if count > 0:
                    sample = supabase.table(tabela).select("*").limit(2).execute()
                    if sample.data:
                        print(f"   📄 Amostra: {list(sample.data[0].keys())}")
                
            except Exception as e:
                print(f"❌ {tabela:<20} | NÃO EXISTE | Erro: {str(e)[:50]}...")
        
        # Verificar outras tabelas importantes do sistema
        print(f"\n📋 VERIFICANDO OUTRAS TABELAS IMPORTANTES:")
        print("-" * 60)
        
        outras_tabelas = [
            'products',
            'orders', 
            'customers',
            'profiles',
            'conversations',
            'appointments'
        ]
        
        for tabela in outras_tabelas:
            try:
                count_result = supabase.table(tabela).select("*", count='exact').execute()
                count = count_result.count or 0
                print(f"✅ {tabela:<20} | EXISTE | {count:>6} registros")
            except Exception as e:
                print(f"❌ {tabela:<20} | NÃO EXISTE | Erro: {str(e)[:50]}...")
        
        # Resumo final
        print(f"\n📊 RESUMO DA VERIFICAÇÃO:")
        print("=" * 60)
        print(f"Tabelas de afiliados verificadas: {len(tabelas_afiliados)}")
        print(f"Tabelas de afiliados existentes: {len(tabelas_existentes)}")
        print(f"Total de registros em afiliados: {total_registros}")
        print(f"Tabelas encontradas: {tabelas_existentes}")
        
        # Conclusão honesta
        if len(tabelas_existentes) == 0:
            print(f"\n🚨 CONCLUSÃO CRÍTICA:")
            print("❌ NENHUMA tabela de afiliados existe no banco!")
            print("❌ Sistema de afiliados NÃO está implementado no banco")
            print("❌ Todas as páginas frontend falharão ao tentar acessar dados")
            print("\n✅ AÇÃO NECESSÁRIA:")
            print("1. Criar migrations para tabelas de afiliados")
            print("2. Aplicar migrations no banco")
            print("3. Testar integração real")
        else:
            print(f"\n✅ SISTEMA PARCIALMENTE IMPLEMENTADO:")
            print(f"Algumas tabelas existem, verificar se estrutura está completa")
        
        return {
            'tabelas_existentes': tabelas_existentes,
            'total_registros': total_registros,
            'status': 'parcial' if tabelas_existentes else 'nao_implementado'
        }
        
    except Exception as e:
        print(f"🚨 ERRO CRÍTICO na verificação: {e}")
        return {
            'erro': str(e),
            'status': 'erro_conexao'
        }

if __name__ == "__main__":
    resultado = verificar_banco_real()
    print(f"\n🔒 Verificação concluída: {resultado}")