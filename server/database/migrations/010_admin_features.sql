-- Migration 010: Admin Features
-- Adds soft delete support for photos and admin user setup

-- Add deleted_at column to photos table for soft delete
ALTER TABLE photos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Add index for soft delete queries
CREATE INDEX IF NOT EXISTS idx_photos_deleted ON photos(deleted_at);

-- Set admin user (UPDATE THIS WITH YOUR EMAIL)
-- Replace 'your-email@example.com' with your actual email address
UPDATE users
SET is_admin = true
WHERE email = 'jameshreynolds@gmail.com'
AND deleted_at IS NULL;

-- Verify admin was set (should show 1 row)
SELECT
    id,
    email,
    full_name,
    is_admin
FROM users
WHERE is_admin = true;
