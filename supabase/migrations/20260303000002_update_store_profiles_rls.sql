-- Migration: Update RLS policies for store_profiles
-- Created: 03/03/2026
-- Author: Kiro AI
-- Purpose: Allow both Individual Premium and Logista to access store_profiles

BEGIN;

-- ============================================
-- STEP 1: Drop existing policies
-- ============================================

DROP POLICY IF EXISTS "Logistas can view own profile" ON store_profiles;
DROP POLICY IF EXISTS "Logistas can update own profile" ON store_profiles;
DROP POLICY IF EXISTS "Logistas can insert own profile" ON store_profiles;

-- ============================================
-- STEP 2: Create new policies (both types with subscription)
-- ============================================

-- Policy 1: SELECT (view own profile)
CREATE POLICY "Affiliates can view own profile"
  ON store_profiles FOR SELECT
  USING (
    affiliate_id IN (
      SELECT id FROM affiliates 
      WHERE user_id = auth.uid() 
      AND affiliate_type IN ('individual', 'logista')
      AND has_subscription = true
      AND deleted_at IS NULL
    )
  );

-- Policy 2: UPDATE (edit own profile)
CREATE POLICY "Affiliates can update own profile"
  ON store_profiles FOR UPDATE
  USING (
    affiliate_id IN (
      SELECT id FROM affiliates 
      WHERE user_id = auth.uid() 
      AND affiliate_type IN ('individual', 'logista')
      AND has_subscription = true
      AND deleted_at IS NULL
    )
  );

-- Policy 3: INSERT (create own profile)
CREATE POLICY "Affiliates can insert own profile"
  ON store_profiles FOR INSERT
  WITH CHECK (
    affiliate_id IN (
      SELECT id FROM affiliates 
      WHERE user_id = auth.uid() 
      AND affiliate_type IN ('individual', 'logista')
      AND has_subscription = true
      AND deleted_at IS NULL
    )
  );

-- ============================================
-- STEP 3: Add comments
-- ============================================

COMMENT ON POLICY "Affiliates can view own profile" ON store_profiles IS 
  'Allows both individual premium and logista affiliates (with subscription) to view their own store profile';

COMMENT ON POLICY "Affiliates can update own profile" ON store_profiles IS 
  'Allows both individual premium and logista affiliates (with subscription) to update their own store profile';

COMMENT ON POLICY "Affiliates can insert own profile" ON store_profiles IS 
  'Allows both individual premium and logista affiliates (with subscription) to create their own store profile';

COMMIT;
