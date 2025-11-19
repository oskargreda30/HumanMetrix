-- ========================================
-- DATABASE NORMALIZATION FIX
-- Converts ALL hyphenated assessment types to underscored format
-- Run this in PRODUCTION database to fix existing data
-- ========================================

-- 1. Fix assessment_results table
UPDATE assessment_results
SET assessment_type = REPLACE(assessment_type, '-', '_')
WHERE assessment_type LIKE '%-%';

-- 2. Fix purchase_items table  
UPDATE purchase_items
SET assessment_type = REPLACE(assessment_type, '-', '_')
WHERE assessment_type LIKE '%-%';

-- 3. Fix invitations table (assessment_types is an array, so we need to update each element)
UPDATE invitations
SET assessment_types = ARRAY(
  SELECT REPLACE(unnest(assessment_types), '-', '_')
)
WHERE EXISTS (
  SELECT 1 FROM unnest(assessment_types) AS t WHERE t LIKE '%-%'
);

-- 4. Fix prompt_architecture_evaluations (if assessment type is stored there)
-- This table references assessment_results, so fixing assessment_results handles it

-- ========================================
-- VERIFICATION QUERIES
-- Run these after the updates to confirm no hyphens remain
-- ========================================

-- Check assessment_results
SELECT DISTINCT assessment_type 
FROM assessment_results 
WHERE assessment_type LIKE '%-%';
-- Should return 0 rows

-- Check purchase_items
SELECT DISTINCT assessment_type 
FROM purchase_items 
WHERE assessment_type LIKE '%-%';
-- Should return 0 rows

-- Check invitations
SELECT id, assessment_types 
FROM invitations 
WHERE EXISTS (
  SELECT 1 FROM unnest(assessment_types) AS t WHERE t LIKE '%-%'
);
-- Should return 0 rows

-- ========================================
-- SUMMARY OF EXPECTED VALUES
-- ========================================
-- Valid assessment types (after normalization):
-- - fit
-- - ai_readiness
-- - prompt_architecture
-- - aiq
