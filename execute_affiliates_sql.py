#!/usr/bin/env python3
"""
Executar SQL para criar tabelas de afiliados diretamente
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

def execute_affiliates_sql():
    """Executa SQL para criar tabelas de afiliados"""
    
    # Configurar Supabase
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_ANON_KEY")
    
    if not url or not key:
        print("❌ Erro: Variáveis SUPABASE_URL e SUPABASE_ANON_KEY não encontradas")
        return False
    
    supabase: Client = create_client(url, key)
    
    print("🔧 EXECUTANDO SQL PARA CRIAR TABELAS DE AFILIADOS")
    print("=" * 60)
    
    try:
        # 1. Criar ENUMs
        print("\n1️⃣ Criando ENUMs...")
        
        enums_sql = """
        DO $$ BEGIN
            CREATE TYPE affiliate_status AS ENUM (
                'pending', 'active', 'inactive', 'suspended', 'rejected'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
        
        DO $$ BEGIN
            CREATE TYPE commission_status AS ENUM (
                'calculated', 'pending', 'paid', 'failed', 'cancelled'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
        
        DO $$ BEGIN
            CREATE TYPE withdrawal_status AS ENUM (
                'pending', 'approved', 'rejected', 'completed', 'failed'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
        """
        
        result = supabase.rpc('exec_sql', {'sql': enums_sql}).execute()
        print("   ✅ ENUMs criados")
        
        # 2. Criar tabela affiliates
        print("\n2️⃣ Criando tabela affiliates...")
        
        affiliates_sql = """
        CREATE TABLE IF NOT EXISTS affiliates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            
            name TEXT NOT NULL CHECK (length(name) >= 3 AND length(name) <= 100),
            email TEXT NOT NULL UNIQUE,
            phone TEXT,
            document TEXT,
            
            referral_code TEXT NOT NULL UNIQUE,
            wallet_id TEXT NOT NULL,
            wallet_validated_at TIMESTAMPTZ,
            
            status affiliate_status NOT NULL DEFAULT 'pending',
            approved_by UUID REFERENCES auth.users(id),
            approved_at TIMESTAMPTZ,
            rejection_reason TEXT,
            
            total_clicks INTEGER NOT NULL DEFAULT 0,
            total_conversions INTEGER NOT NULL DEFAULT 0,
            total_commissions_cents INTEGER NOT NULL DEFAULT 0,
            available_balance_cents INTEGER NOT NULL DEFAULT 0,
            
            notification_email BOOLEAN NOT NULL DEFAULT true,
            notification_whatsapp BOOLEAN NOT NULL DEFAULT false,
            
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            deleted_at TIMESTAMPTZ NULL
        );
        """
        
        result = supabase.rpc('exec_sql', {'sql': affiliates_sql}).execute()
        print("   ✅ Tabela affiliates criada")
        
        # 3. Criar tabela commissions
        print("\n3️⃣ Criando tabela commissions...")
        
        commissions_sql = """
        CREATE TABLE IF NOT EXISTS commissions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            order_id UUID NOT NULL,
            
            n1_affiliate_id UUID REFERENCES affiliates(id),
            n2_affiliate_id UUID REFERENCES affiliates(id),
            n3_affiliate_id UUID REFERENCES affiliates(id),
            
            n1_amount_cents INTEGER NOT NULL DEFAULT 0,
            n2_amount_cents INTEGER NOT NULL DEFAULT 0,
            n3_amount_cents INTEGER NOT NULL DEFAULT 0,
            renum_amount_cents INTEGER NOT NULL DEFAULT 0,
            jb_amount_cents INTEGER NOT NULL DEFAULT 0,
            
            total_commission_cents INTEGER NOT NULL,
            order_total_cents INTEGER NOT NULL,
            
            status commission_status NOT NULL DEFAULT 'calculated',
            asaas_split_id TEXT,
            processed_at TIMESTAMPTZ,
            
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            deleted_at TIMESTAMPTZ NULL
        );
        """
        
        result = supabase.rpc('exec_sql', {'sql': commissions_sql}).execute()
        print("   ✅ Tabela commissions criada")
        
        # 4. Criar tabela withdrawals
        print("\n4️⃣ Criando tabela withdrawals...")
        
        withdrawals_sql = """
        CREATE TABLE IF NOT EXISTS withdrawals (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
            
            requested_amount_cents INTEGER NOT NULL,
            fee_cents INTEGER NOT NULL DEFAULT 0,
            net_amount_cents INTEGER NOT NULL,
            
            status withdrawal_status NOT NULL DEFAULT 'pending',
            requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            processed_at TIMESTAMPTZ,
            processed_by UUID REFERENCES auth.users(id),
            rejection_reason TEXT,
            
            asaas_transfer_id TEXT,
            
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            deleted_at TIMESTAMPTZ NULL
        );
        """
        
        result = supabase.rpc('exec_sql', {'sql': withdrawals_sql}).execute()
        print("   ✅ Tabela withdrawals criada")
        
        # 5. Habilitar RLS
        print("\n5️⃣ Habilitando RLS...")
        
        rls_sql = """
        ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
        ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
        ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
        """
        
        result = supabase.rpc('exec_sql', {'sql': rls_sql}).execute()
        print("   ✅ RLS habilitado")
        
        # 6. Testar tabelas
        print("\n6️⃣ Testando tabelas...")
        
        test_tables = ['affiliates', 'commissions', 'withdrawals']
        
        for table in test_tables:
            try:
                result = supabase.table(table).select('*').limit(1).execute()
                print(f"   ✅ {table} - FUNCIONANDO")
            except Exception as e:
                print(f"   ❌ {table} - ERRO: {str(e)[:50]}...")
        
        print(f"\n" + "=" * 60)
        print("🎉 TABELAS DE AFILIADOS CRIADAS COM SUCESSO!")
        
        print(f"\n📋 PRÓXIMOS PASSOS:")
        print(f"1. Corrigir validação de Wallet ID no frontend")
        print(f"2. Testar cadastro de afiliados")
        print(f"3. Implementar cálculo de comissões")
        
        return True
        
    except Exception as e:
        print(f"\n❌ ERRO: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    execute_affiliates_sql()