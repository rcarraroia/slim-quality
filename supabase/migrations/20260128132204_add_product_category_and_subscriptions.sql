-- Migration: Módulo de Pagamento e Split Independente (Agente IA)
-- Created: 2026-01-28
-- Phase: 1.1 - Schema Base

BEGIN;

-- 1. ENUMS para Segmentação
DO $$ BEGIN
    CREATE TYPE product_category AS ENUM ('colchao', 'ferramenta_ia', 'servico_digital');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE service_status AS ENUM ('active', 'inactive', 'trial', 'pending');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Alterações na tabela products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS category product_category DEFAULT 'colchao',
ADD COLUMN IF NOT EXISTS is_subscription BOOLEAN DEFAULT FALSE;

-- 3. Tabela de Configurações Globais (Feature Flags)
CREATE TABLE IF NOT EXISTS public.app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir Toggle Global (Inativo por padrão)
INSERT INTO public.app_settings (key, value, description)
VALUES ('enable_agent_sales', 'false', 'Habilita a exibição e venda do Agente IA para afiliados')
ON CONFLICT (key) DO NOTHING;

-- 4. Tabela de Serviços Ativos por Afiliado
CREATE TABLE IF NOT EXISTS public.affiliate_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
    service_type TEXT NOT NULL, -- Ex: 'agente_ia'
    status service_status NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMPTZ,
    auto_renew BOOLEAN DEFAULT TRUE,
    last_payment_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(affiliate_id, service_type)
);

-- 5. RLS (Segurança)
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_services ENABLE ROW LEVEL SECURITY;

-- Políticas app_settings: Todos lêem, apenas admins alteram
CREATE POLICY "Anyone can view app settings" ON public.app_settings
FOR SELECT USING (true);

-- Políticas affiliate_services: Afiliado vê o seu, admin vê tudo
CREATE POLICY "Afiliados can view own services" ON public.affiliate_services
FOR SELECT USING (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
);

-- COMENTÁRIOS
COMMENT ON COLUMN public.products.category IS 'Categoria para distinguir Split e Frete (colchao vs digital)';
COMMENT ON TABLE public.affiliate_services IS 'Controle de acesso aos serviços digitais (Agente IA, etc)';

COMMIT;
