-- ========================================
-- Migration 008: Update photo categories
-- ========================================
-- Standardizes photo_categories table to include only:
-- 1. Patricia & James
-- 2. Engagement
-- 3. Friends & Family
-- 4. Childhood
-- 5. Wedding Day
-- ========================================

-- Delete categories that we don't want (that don't have photos)
DELETE FROM photo_categories
WHERE slug NOT IN ('timeline', 'engagement', 'friends-family', 'childhood', 'wedding-day')
  AND NOT EXISTS (SELECT 1 FROM photos WHERE category_id = photo_categories.id);

-- Deactivate categories with photos that we don't want (preserve data)
UPDATE photo_categories
SET is_active = false
WHERE slug NOT IN ('timeline', 'engagement', 'friends-family', 'childhood', 'wedding-day')
  AND EXISTS (SELECT 1 FROM photos WHERE category_id = photo_categories.id);

-- Update existing categories to ensure correct names and display order
UPDATE photo_categories SET name = 'Patricia & James', display_order = 1, description = 'Photos of Patricia and James throughout their relationship', is_active = true WHERE slug = 'timeline';
UPDATE photo_categories SET name = 'Engagement', display_order = 2, description = 'Professional and candid engagement moments', is_active = true WHERE slug = 'engagement';

-- Insert new categories if they don't exist
INSERT INTO photo_categories (name, slug, description, display_order, is_active)
VALUES
    ('Friends & Family', 'friends-family', 'Photos with friends and family members', 3, true),
    ('Childhood', 'childhood', 'Early photos of Patricia and James', 4, true),
    ('Wedding Day', 'wedding-day', 'Ceremony and reception photos', 5, true)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active;

-- ========================================
-- Migration 008 Complete
-- ========================================
