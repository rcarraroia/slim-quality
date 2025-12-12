-- Criar tabelas do módulo de afiliados com validação corrigida
-- Executar via: supabase db push --include-all=false

BEGIN;

-- ============================================
-- ENUMS PARA SISTEMA DE AFILIADOS
-- ============================================

-- Status do afiliado
DO $$ BEGIN
    CREATE TYPE affiliate_status AS ENUM (
        'pending',    -- Aguardando aprovação
        'active',     -- Ativo e pode receber comissões
        'inactive',   -- Inativo temporariamente
        'suspended',  -- Suspenso por violação
        'rejected'    -- Cadastro rejeitado
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Status de comissão
DO $$ BEGIN
    CREATE TYPE commission_status AS ENUM (
        'calculated',  -- Calculada mas não paga
        'pending',     -- Enviada para Asaas
        'paid',        -- Paga com sucesso
        'failed',      -- Falha no pagamento
        'cancelled'    -- Cancelada
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Status de saque
DO $$ BEGIN
    CREATE TYPE withdrawal_status AS ENUM (
        'pending',     -- Aguardando aprovação
        'approved',    -- Aprovado
        'rejected',    -- Rejeitado
        'completed',   -- Concluído
        'failed'       -- Falhou
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- TABELA: affiliates
-- ============================================

CREATE TABLE IF NOT EXISTS affiliates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Dados pessoais
    name TEXT NOT NULL CHECK (length(name) >= 3 AND length(name) <= 100),
    email TEXT NOT NULL UNIQUE CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    phone TEXT CHECK (phone IS NULL OR phone ~ '^\+?[1-9]\d{1,14}$'),
    document TEXT CHECK (document IS NULL OR document ~ '^\d{11}$|^\d{14}$'), -- CPF ou CNPJ
    
    -- Dados de afiliado
    referral_code TEXT NOT NULL UNIQUE CHECK (referral_code ~ '^[A-Z0-9]{6}$'),
    wallet_id TEXT NOT NULL, -- CORRIGIDO: Aceita qualquer formato (UUID do Asaas)
    wallet_validated_at TIMESTAMPTZ,
    
    -- Status e controle
    status affiliate_status NOT NULL DEFAULT 'pending',
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    -- Métricas (desnormalizadas para performance)
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

-- ============================================
-- TABELA: commissions
-- ============================================

CREATE TABLE IF NOT EXISTS commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    
    -- Afiliados envolvidos (árvore genealógica)
    n1_affiliate_id UUID REFERENCES affiliates(id), -- Vendedor direto
    n2_affiliate_id UUID REFERENCES affiliates(id), -- Indicado do N1
    n3_affiliate_id UUID REFERENCES affiliates(id), -- Indicado do N2
    
    -- Valores das comissões (em centavos)
    n1_amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (n1_amount_cents >= 0), -- 15%
    n2_amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (n2_amount_cents >= 0), -- 3%
    n3_amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (n3_amount_cents >= 0), -- 2%
    renum_amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (renum_amount_cents >= 0), -- 5% + redistribuição
    jb_amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (jb_amount_cents >= 0), -- 5% + redistribuição
    
    -- Total e validação (deve ser 30% do pedido)
    total_commission_cents INTEGER NOT NULL CHECK (total_commission_cents >= 0),
    order_total_cents INTEGER NOT NULL CHECK (order_total_cents > 0),
    
    -- Status e controle
    status commission_status NOT NULL DEFAULT 'calculated',
    asaas_split_id TEXT, -- ID do split no Asaas
    processed_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    
    -- Constraint: total deve ser 30% do pedido
    CONSTRAINT check_commission_total 
        CHECK (total_commission_cents = (order_total_cents * 30 / 100))
);

-- ============================================
-- TABELA: withdrawals
-- ============================================

CREATE TABLE IF NOT EXISTS withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
    
    -- Valores financeiros (em centavos)
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

-- ============================================
-- ÍNDICES CRÍTICOS PARA PERFORMANCE
-- ============================================

-- Índices para affiliates
CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliates_referral_code 
    ON affiliates(referral_code) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliates_wallet_id 
    ON affiliates(wallet_id) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_affiliates_email 
    ON affiliates(email) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_affiliates_user_id 
    ON affiliates(user_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_affiliates_status 
    ON affiliates(status) WHERE deleted_at IS NULL;

-- Índices para commissions
CREATE INDEX IF NOT EXISTS idx_commissions_order_id 
    ON commissions(order_id);

CREATE INDEX IF NOT EXISTS idx_commissions_n1_affiliate 
    ON commissions(n1_affiliate_id) WHERE n1_affiliate_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_commissions_status 
    ON commissions(status);

-- Índices para withdrawals
CREATE INDEX IF NOT EXISTS idx_withdrawals_affiliate_id 
    ON withdrawals(affiliate_id);

CREATE INDEX IF NOT EXISTS idx_withdrawals_status 
    ON withdrawals(status);

-- ============================================
-- FUNÇÃO: generate_referral_code()
-- ============================================

CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER;
    attempts INTEGER := 0;
    max_attempts INTEGER := 100;
BEGIN
    LOOP
        result := '';
        
        -- Gerar código de 6 caracteres
        FOR i IN 1..6 LOOP
            result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
        END LOOP;
        
        -- Verificar se já existe
        IF NOT EXISTS (
            SELECT 1 FROM affiliates 
            WHERE referral_code = result 
            AND deleted_at IS NULL
        ) THEN
            RETURN result;
        END IF;
        
        attempts := attempts + 1;
        IF attempts >= max_attempts THEN
            RAISE EXCEPTION 'Unable to generate unique referral code after % attempts', max_attempts;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: auto_generate_referral_code
-- ============================================

CREATE OR REPLACE FUNCTION trigger_generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
    -- Gerar código se não fornecido
    IF NEW.referral_code IS NULL OR NEW.referral_code = '' THEN
        NEW.referral_code := generate_referral_code();
    END IF;
    
    -- Validar formato do código
    IF NEW.referral_code !~ '^[A-Z0-9]{6}$' THEN
        RAISE EXCEPTION 'Referral code must be 6 alphanumeric characters: %', NEW.referral_code;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_generate_referral_code
    BEFORE INSERT ON affiliates
    FOR EACH ROW
    EXECUTE FUNCTION trigger_generate_referral_code();

-- ============================================
-- TRIGGER: update_updated_at
-- ============================================

CREATE TRIGGER update_affiliates_updated_at
    BEFORE UPDATE ON affiliates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_commissions_updated_at
    BEFORE UPDATE ON commissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_withdrawals_updated_at
    BEFORE UPDATE ON withdrawals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

-- Políticas para affiliates
DROP POLICY IF EXISTS "Affiliates can view own data" ON affiliates;
CREATE POLICY "Affiliates can view own data"
    ON affiliates FOR SELECT
    USING (auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can register as affiliates" ON affiliates;
CREATE POLICY "Users can register as affiliates"
    ON affiliates FOR INSERT
    WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Políticas para commissions
DROP POLICY IF EXISTS "Affiliates can view own commissions" ON commissions;
CREATE POLICY "Affiliates can view own commissions"
    ON commissions FOR SELECT
    USING (
        n1_affiliate_id IN (
            SELECT id FROM affiliates WHERE user_id = auth.uid() AND deleted_at IS NULL
        ) AND deleted_at IS NULL
    );

-- Políticas para withdrawals
DROP POLICY IF EXISTS "Affiliates can view own withdrawals" ON withdrawals;
CREATE POLICY "Affiliates can view own withdrawals"
    ON withdrawals FOR SELECT
    USING (
        affiliate_id IN (
            SELECT id FROM affiliates WHERE user_id = auth.uid() AND deleted_at IS NULL
        ) AND deleted_at IS NULL
    );

DROP POLICY IF EXISTS "Affiliates can create withdrawals" ON withdrawals;
CREATE POLICY "Affiliates can create withdrawals"
    ON withdrawals FOR INSERT
    WITH CHECK (
        affiliate_id IN (
            SELECT id FROM affiliates WHERE user_id = auth.uid() AND deleted_at IS NULL
        )
    );

COMMIT;