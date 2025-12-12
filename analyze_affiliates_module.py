#!/usr/bin/env python3
"""
Análise completa do módulo de afiliados
Verificar tabelas, estrutura e integração
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

def analyze_affiliates_module():
    """Análise completa do módulo de afiliados"""
    
    # Configurar Supabase
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_ANON_KEY")
    
    if not url or not key:
        print("❌ Erro: Variáveis SUPABASE_URL e SUPABASE_ANON_KEY não encontradas")
        return False
    
    supabase: Client = create_client(url, key)
    
    print("🔍 ANÁLISE COMPLETA: MÓDULO DE AFILIADOS")
    print("=" * 60)
    
    try:
        # 1. Verificar tabelas necessárias para afiliados
        print("\n1️⃣ VERIFICANDO TABELAS NECESSÁRIAS...")
        
        required_tables = [
            'affiliates',
            'commissions', 
            'withdrawals',
            'affiliate_network',
            'referral_codes',
            'referral_clicks',
            'referral_conversions',
            'asaas_wallets'
        ]
        
        existing_tables = []
        missing_tables = []
        
        for table in required_tables:
            try:
                result = supabase.table(table).select('*').limit(1).execute()
                existing_tables.append(table)
                print(f"   ✅ {table} - EXISTE")
            except Exception as e:
                missing_tables.append(table)
                print(f"   ❌ {table} - NÃO EXISTE ({str(e)[:50]}...)")
        
        # 2. Verificar estrutura das tabelas existentes
        print(f"\n2️⃣ ESTRUTURA DAS TABELAS EXISTENTES...")
        
        for table in existing_tables:
            try:
                result = supabase.table(table).select('*').limit(1).execute()
                if result.data:
                    fields = list(result.data[0].keys())
                    print(f"   📋 {table}: {', '.join(fields[:5])}{'...' if len(fields) > 5 else ''}")
                else:
                    print(f"   📋 {table}: (vazia)")
            except Exception as e:
                print(f"   ❌ {table}: Erro ao verificar estrutura")
        
        # 3. Verificar se há dados de afiliados
        print(f"\n3️⃣ DADOS EXISTENTES...")
        
        if 'affiliates' in existing_tables:
            affiliates = supabase.table('affiliates').select('*').execute()
            print(f"   👥 Afiliados cadastrados: {len(affiliates.data) if affiliates.data else 0}")
        
        if 'commissions' in existing_tables:
            commissions = supabase.table('commissions').select('*').execute()
            print(f"   💰 Comissões registradas: {len(commissions.data) if commissions.data else 0}")
        
        # 4. Verificar configuração de níveis e percentuais
        print(f"\n4️⃣ CONFIGURAÇÃO DE NÍVEIS E PERCENTUAIS...")
        
        # Baseado na documentação do projeto
        commission_structure = {
            "N1 (Vendedor Direto)": "15%",
            "N2 (Indicado do N1)": "3%", 
            "N3 (Indicado do N2)": "2%",
            "Renum (Gestor)": "5% + redistribuição",
            "JB (Gestor)": "5% + redistribuição",
            "Fábrica": "70%"
        }
        
        print("   📊 ESTRUTURA DE COMISSÕES CONFIGURADA:")
        for level, percentage in commission_structure.items():
            print(f"      {level}: {percentage}")
        
        print(f"\n   🔄 REGRA DE REDISTRIBUIÇÃO:")
        print(f"      - Sem N2 e N3: +2,5% para cada gestor")
        print(f"      - Sem N3: +1% para cada gestor")
        print(f"      - Total sempre = 30% do valor da venda")
        
        # 5. Verificar integração com Asaas
        print(f"\n5️⃣ INTEGRAÇÃO COM ASAAS...")
        
        asaas_config = {
            "ASAAS_API_KEY": os.getenv("ASAAS_API_KEY"),
            "ASAAS_WALLET_FABRICA": os.getenv("ASAAS_WALLET_FABRICA"),
            "ASAAS_WALLET_RENUM": os.getenv("ASAAS_WALLET_RENUM"),
            "ASAAS_WALLET_JB": os.getenv("ASAAS_WALLET_JB")
        }
        
        for key, value in asaas_config.items():
            status = "✅ CONFIGURADO" if value else "❌ FALTANDO"
            print(f"   {key}: {status}")
        
        # 6. Verificar formato de Wallet ID
        print(f"\n6️⃣ FORMATO DE WALLET ID...")
        
        print(f"   🔍 PROBLEMA IDENTIFICADO:")
        print(f"      - Sistema espera: 'wal_xxxxx' (com prefixo)")
        print(f"      - Asaas fornece: números apenas (ex: 2481-4d3f-d5c6-91c3ff844f1f)")
        print(f"   ⚠️ CORREÇÃO NECESSÁRIA: Remover validação de prefixo 'wal_'")
        
        # 7. Verificar páginas do módulo
        print(f"\n7️⃣ PÁGINAS DO MÓDULO DE AFILIADOS...")
        
        affiliate_pages = [
            "/afiliados - Landing page",
            "/afiliados/cadastro - Formulário de cadastro", 
            "/dashboard/afiliados - Lista de afiliados (admin)",
            "/dashboard/afiliados/comissoes - Gestão de comissões (admin)",
            "/afiliados/dashboard - Dashboard do afiliado",
            "/afiliados/dashboard/rede - Rede do afiliado",
            "/afiliados/dashboard/comissoes - Comissões do afiliado"
        ]
        
        for page in affiliate_pages:
            print(f"   📄 {page}")
        
        # 8. Resumo dos problemas
        print(f"\n" + "=" * 60)
        print("🚨 PROBLEMAS IDENTIFICADOS:")
        
        if missing_tables:
            print(f"\n❌ TABELAS FALTANDO ({len(missing_tables)}):")
            for table in missing_tables:
                print(f"   - {table}")
        
        print(f"\n❌ VALIDAÇÃO DE WALLET ID:")
        print(f"   - Formato esperado: 'wal_xxxxx'")
        print(f"   - Formato real Asaas: números/UUID")
        
        print(f"\n❌ INTEGRAÇÃO INCOMPLETA:")
        print(f"   - Tabelas de afiliados não existem")
        print(f"   - Sistema de comissões não implementado")
        print(f"   - Split automático não funcional")
        
        # 9. Plano de correção
        print(f"\n" + "=" * 60)
        print("🔧 PLANO DE CORREÇÃO:")
        
        print(f"\n1. CRIAR TABELAS FALTANDO:")
        for table in missing_tables:
            print(f"   - {table}")
        
        print(f"\n2. CORRIGIR VALIDAÇÃO WALLET ID:")
        print(f"   - Remover prefixo 'wal_' obrigatório")
        print(f"   - Aceitar formato UUID do Asaas")
        
        print(f"\n3. IMPLEMENTAR SISTEMA DE COMISSÕES:")
        print(f"   - Cálculo automático (15%, 3%, 2%)")
        print(f"   - Redistribuição para gestores")
        print(f"   - Split automático via Asaas")
        
        print(f"\n4. INTEGRAR COM VENDAS:")
        print(f"   - Rastreamento de referral codes")
        print(f"   - Trigger após confirmação de pagamento")
        print(f"   - Notificações para afiliados")
        
        return True
        
    except Exception as e:
        print(f"\n❌ ERRO NA ANÁLISE: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    analyze_affiliates_module()