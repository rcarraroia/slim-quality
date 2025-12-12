#!/usr/bin/env python3
"""
Corrigir módulo de afiliados e validação de Wallet ID
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

def fix_affiliates_module():
    """Corrige módulo de afiliados e validação de Wallet ID"""
    
    # Configurar Supabase
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")  # Usar service key para operações admin
    
    if not url or not key:
        print("❌ Erro: Variáveis SUPABASE_URL e SUPABASE_SERVICE_KEY não encontradas")
        return False
    
    supabase: Client = create_client(url, key)
    
    print("🔧 CORRIGINDO MÓDULO DE AFILIADOS")
    print("=" * 60)
    
    try:
        # 1. Criar tabela affiliates com validação corrigida
        print("\n1️⃣ Criando tabela affiliates...")
        
        create_affiliates_sql = """
        -- Criar ENUMs se não existirem
        DO $$ BEGIN
            CREATE TYPE affiliate_status AS ENUM (
                'pending', 'active', 'inactive', 'suspended', 'rejected'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
        
        -- Criar tabela affiliates
        CREATE TABLE IF NOT EXISTS affiliates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            
            -- Dados pessoais
            name TEXT NOT NULL CHECK (length(name) >= 3 AND length(name) <= 100),
            email TEXT NOT NULL UNIQUE CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'),
            phone TEXT CHECK (phone IS NULL OR phone ~ '^\\+?[1-9]\\d{1,14}$'),
            document TEXT CHECK (document IS NULL OR document ~ '^\\d{11}$|^\\d{14}$'),
            
            -- Dados de afiliado
            referral_code TEXT NOT NULL UNIQUE CHECK (referral_code ~ '^[A-Z0-9]{6}$'),
            wallet_id TEXT NOT NULL, -- CORRIGIDO: Removida validação de prefixo 'wal_'
            wallet_validated_at TIMESTAMPTZ,
            
            -- Status e controle
            status affiliate_status NOT NULL DEFAULT 'pending',
            approved_by UUID REFERENCES auth.users(id),
            approved_at TIMESTAMPTZ,
            rejection_reason TEXT,
            
            -- Métricas
            total_clicks INTEGER NOT NULL DEFAULT 0 CHECK (total_clicks >= 0),
            total_conversions INTEGER NOT NULL DEFAULT 0 CHECK (total_conversions >= 0),
            total_commissions_cents INTEGER NOT NULL DEFAULT 0 CHECK (total_commissions_cents >= 0),
            available_balance_cents INTEGER NOT NULL DEFAULT 0 CHECK (available_balance_cents >= 0),
            
            -- Configurações
            notification_email BOOLEAN NOT NULL DEFAULT true,
            notification_whatsapp BOOLEAN NOT NULL DEFAULT false,
            
            -- Timestamps
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            deleted_at TIMESTAMPTZ NULL
        );
        """
        
        supabase.postgrest.rpc('exec_sql', {'sql': create_affiliates_sql}).execute()
        print("   ✅ Tabela affiliates criada")
        
        # 2. Criar tabela commissions
        print("\n2️⃣ Criando tabela commissions...")
        
        create_commissions_sql = """
        DO $$ BEGIN
            CREATE TYPE commission_status AS ENUM (
                'calculated', 'pending', 'paid', 'failed', 'cancelled'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
        
        CREATE TABLE IF NOT EXISTS commissions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
            
            -- Afiliados envolvidos
            n1_affiliate_id UUID REFERENCES affiliates(id),
            n2_affiliate_id UUID REFERENCES affiliates(id),
            n3_affiliate_id UUID REFERENCES affiliates(id),
            
            -- Valores das comissões (em centavos)
            n1_amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (n1_amount_cents >= 0),
            n2_amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (n2_amount_cents >= 0),
            n3_amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (n3_amount_cents >= 0),
            renum_amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (renum_amount_cents >= 0),
            jb_amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (jb_amount_cents >= 0),
            
            -- Total e validação
            total_commission_cents INTEGER NOT NULL CHECK (total_commission_cents >= 0),
            order_total_cents INTEGER NOT NULL CHECK (order_total_cents > 0),
            
            -- Status e controle
            status commission_status NOT NULL DEFAULT 'calculated',
            asaas_split_id TEXT, -- ID do split no Asaas
            processed_at TIMESTAMPTZ,
            
            -- Timestamps
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            deleted_at TIMESTAMPTZ NULL
        );
        """
        
        supabase.postgrest.rpc('exec_sql', {'sql': create_commissions_sql}).execute()
        print("   ✅ Tabela commissions criada")
        
        # 3. Criar tabela withdrawals
        print("\n3️⃣ Criando tabela withdrawals...")
        
        create_withdrawals_sql = """
        DO $$ BEGIN
            CREATE TYPE withdrawal_status AS ENUM (
                'pending', 'approved', 'rejected', 'completed', 'failed'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
        
        CREATE TABLE IF NOT EXISTS withdrawals (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
            
            -- Valores financeiros
            requested_amount_cents INTEGER NOT NULL CHECK (requested_amount_cents > 0),
            fee_cents INTEGER NOT NULL DEFAULT 0 CHECK (fee_cents >= 0),
            net_amount_cents INTEGER NOT NULL CHECK (net_amount_cents > 0),
            
            -- Status e controle
            status withdrawal_status NOT NULL DEFAULT 'pending',
            requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            processed_at TIMESTAMPTZ,
            processed_by UUID REFERENCES auth.users(id),
            rejection_reason TEXT,
            
            -- Integração Asaas
            asaas_transfer_id TEXT,
            
            -- Timestamps
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            deleted_at TIMESTAMPTZ NULL
        );
        """
        
        supabase.postgrest.rpc('exec_sql', {'sql': create_withdrawals_sql}).execute()
        print("   ✅ Tabela withdrawals criada")
        
        # 4. Criar índices importantes
        print("\n4️⃣ Criando índices...")
        
        create_indexes_sql = """
        -- Índices para affiliates
        CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliates_referral_code 
            ON affiliates(referral_code) WHERE deleted_at IS NULL;
        CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliates_wallet_id 
            ON affiliates(wallet_id) WHERE deleted_at IS NULL;
        CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliates_email 
            ON affiliates(email) WHERE deleted_at IS NULL;
        
        -- Índices para commissions
        CREATE INDEX IF NOT EXISTS idx_commissions_order_id 
            ON commissions(order_id);
        CREATE INDEX IF NOT EXISTS idx_commissions_n1_affiliate 
            ON commissions(n1_affiliate_id) WHERE n1_affiliate_id IS NOT NULL;
        
        -- Índices para withdrawals
        CREATE INDEX IF NOT EXISTS idx_withdrawals_affiliate_id 
            ON withdrawals(affiliate_id);
        CREATE INDEX IF NOT EXISTS idx_withdrawals_status 
            ON withdrawals(status);
        """
        
        supabase.postgrest.rpc('exec_sql', {'sql': create_indexes_sql}).execute()
        print("   ✅ Índices criados")
        
        # 5. Habilitar RLS
        print("\n5️⃣ Configurando RLS...")
        
        enable_rls_sql = """
        -- Habilitar RLS
        ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
        ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
        ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
        
        -- Políticas básicas para affiliates
        DROP POLICY IF EXISTS "Affiliates can view own data" ON affiliates;
        CREATE POLICY "Affiliates can view own data"
            ON affiliates FOR SELECT
            USING (auth.uid() = user_id AND deleted_at IS NULL);
        
        -- Políticas básicas para commissions
        DROP POLICY IF EXISTS "Affiliates can view own commissions" ON commissions;
        CREATE POLICY "Affiliates can view own commissions"
            ON commissions FOR SELECT
            USING (
                n1_affiliate_id IN (
                    SELECT id FROM affiliates WHERE user_id = auth.uid() AND deleted_at IS NULL
                ) AND deleted_at IS NULL
            );
        
        -- Políticas básicas para withdrawals
        DROP POLICY IF EXISTS "Affiliates can view own withdrawals" ON withdrawals;
        CREATE POLICY "Affiliates can view own withdrawals"
            ON withdrawals FOR SELECT
            USING (
                affiliate_id IN (
                    SELECT id FROM affiliates WHERE user_id = auth.uid() AND deleted_at IS NULL
                ) AND deleted_at IS NULL
            );
        """
        
        supabase.postgrest.rpc('exec_sql', {'sql': enable_rls_sql}).execute()
        print("   ✅ RLS configurado")
        
        # 6. Testar se tabelas foram criadas
        print("\n6️⃣ Testando tabelas criadas...")
        
        test_tables = ['affiliates', 'commissions', 'withdrawals']
        
        for table in test_tables:
            try:
                result = supabase.table(table).select('*').limit(1).execute()
                print(f"   ✅ {table} - FUNCIONANDO")
            except Exception as e:
                print(f"   ❌ {table} - ERRO: {str(e)[:50]}...")
        
        print(f"\n" + "=" * 60)
        print("🎉 MÓDULO DE AFILIADOS CORRIGIDO!")
        
        print(f"\n📋 RESUMO DAS CORREÇÕES:")
        print(f"✅ Tabela affiliates criada (Wallet ID sem prefixo obrigatório)")
        print(f"✅ Tabela commissions criada (sistema multinível)")
        print(f"✅ Tabela withdrawals criada (saques)")
        print(f"✅ Índices otimizados criados")
        print(f"✅ RLS configurado para segurança")
        
        print(f"\n🔧 PRÓXIMOS PASSOS:")
        print(f"1. Corrigir validação no frontend (remover prefixo 'wal_')")
        print(f"2. Implementar sistema de cálculo de comissões")
        print(f"3. Integrar com split automático do Asaas")
        print(f"4. Testar cadastro de afiliados")
        
        return True
        
    except Exception as e:
        print(f"\n❌ ERRO: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    fix_affiliates_module()