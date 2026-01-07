-- Migration: Tornar wallet_id nullable e adicionar campos de controle de onboarding
-- Task 1.6: Permitir cadastro sem wallet_id inicialmente
-- Requirements: 1.5, 2.7

BEGIN;

-- 1. Tornar wallet_id nullable
ALTER TABLE affiliates 
ALTER COLUMN wallet_id DROP NOT NULL;

-- 2. Adicionar campos de controle de onboarding
ALTER TABLE affiliates 
ADD COLUMN IF NOT EXISTS wallet_configured_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- 3. Para registros existentes com wallet_id, marcar como configurado
UPDATE affiliates 
SET wallet_configured_at = updated_at,
    onboarding_completed = TRUE
WHERE wallet_id IS NOT NULL;

COMMIT;;
