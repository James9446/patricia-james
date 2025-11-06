-- ========================================
-- Migration 007: Add upload_source column
-- ========================================
-- Adds upload_source column to distinguish between bulk-imported photos
-- and photos uploaded by guests via the website
-- ========================================

-- Add upload_source column to photos table
ALTER TABLE photos ADD COLUMN IF NOT EXISTS upload_source VARCHAR(20) DEFAULT 'website';

-- Create index for filtering by upload source
CREATE INDEX IF NOT EXISTS idx_photos_upload_source ON photos(upload_source);

-- Add comment to document the column
COMMENT ON COLUMN photos.upload_source IS 'Source of photo upload: "website" for guest uploads, "bulk_import" for admin-curated photos';

-- ========================================
-- Migration 007 Complete
-- ========================================
