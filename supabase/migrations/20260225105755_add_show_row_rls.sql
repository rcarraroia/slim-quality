-- Migration: Add RLS Policy for Show Row Products (ETAPA 3)
-- Created: 2026-02-25
-- Author: Kiro AI
-- 
-- Purpose: Implement Row Level Security policy to control access to Show Row products.
--          Only Logista affiliates can query products with category='show_row'.
--          This is the first layer of a 3-layer security control (RLS, Page, Layout).

-- ============================================
-- STEP 1: Verify and Enable RLS on products table
-- ============================================

DO $$
BEGIN
  -- Check if RLS is already enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_class 
    WHERE relname = 'products' 
    AND relrowsecurity = true
  ) THEN
    -- Enable RLS if not already enabled
    ALTER TABLE products ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on products table';
  ELSE
    RAISE NOTICE 'RLS was already enabled on products table';
  END IF;
END $$;

-- ============================================
-- STEP 2: Create RLS Policy for Show Row Access Control
-- ============================================

CREATE POLICY "show_row_access_control"
ON products
FOR SELECT
USING (
  -- Allow access to products that are NOT show_row (all users)
  category != 'show_row'
  OR
  -- OR allow access to show_row ONLY for Logista affiliates
  (
    category = 'show_row'
    AND
    EXISTS (
      SELECT 1
      FROM affiliates
      WHERE affiliates.user_id = auth.uid()
      AND affiliates.affiliate_type = 'logista'
    )
  )
);

-- ============================================
-- POLICY BEHAVIOR EXPLANATION
-- ============================================
-- 
-- For Individual Affiliates:
--   - Can query all products EXCEPT show_row
--   - Queries for show_row will return empty result
--   - No error is thrown, just empty result set
-- 
-- For Logista Affiliates:
--   - Can query ALL products (including show_row)
--   - Full access to show_row category
-- 
-- For Unauthenticated Users:
--   - Depends on other policies (not affected by this one)
--   - This policy only controls authenticated users
-- 
-- ============================================

-- ============================================
-- STEP 3: Validation Query (for testing)
-- ============================================

-- To validate RLS is enabled, run:
-- SELECT relrowsecurity FROM pg_class WHERE relname = 'products';
-- Expected result: true

-- To test policy as Logista:
-- 1. Login as Logista affiliate
-- 2. Run: SELECT * FROM products WHERE category = 'show_row';
-- Expected: Returns show_row products

-- To test policy as Individual:
-- 1. Login as Individual affiliate
-- 2. Run: SELECT * FROM products WHERE category = 'show_row';
-- Expected: Returns empty result (no error)

