-- Migration: Add has_subscription field to affiliates
-- Created: 03/03/2026
-- Author: Kiro AI
-- Purpose: Enable 3-plan model (Individual Basic, Individual Premium, Logista)

BEGIN;

-- ============================================
-- STEP 1: Add has_subscription field
-- ============================================

ALTER TABLE affiliates 
ADD COLUMN has_subscription BOOLEAN DEFAULT false;

-- ============================================
-- STEP 2: Update existing logistas
-- ============================================

UPDATE affiliates 
SET has_subscription = true 
WHERE affiliate_type = 'logista' 
AND deleted_at IS NULL;

-- ============================================
-- STEP 3: Create index for performance
-- ============================================

CREATE INDEX idx_affiliates_has_subscription 
ON affiliates(has_subscription) 
WHERE deleted_at IS NULL;

-- ============================================
-- STEP 4: Add comment
-- ============================================

COMMENT ON COLUMN affiliates.has_subscription IS 
  'Indicates if affiliate pays monthly subscription (vitrine + agent IA). False = Individual Basic, True = Individual Premium or Logista';

COMMIT;
