-- =====================================================
-- PRODUCTION MIGRATION: Admin Features
-- Run this on Render production database
-- =====================================================
-- This combines migrations 010 and 011 for production deployment
--
-- Features:
-- - Adds soft delete support for photos (deleted_at column)
-- - Creates admin user (jameshreynolds@gmail.com)
-- - Adds index for soft delete queries
-- =====================================================

-- Step 1: Add deleted_at column to photos table for soft delete
ALTER TABLE photos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Step 2: Add index for soft delete queries (improves performance)
CREATE INDEX IF NOT EXISTS idx_photos_deleted ON photos(deleted_at);

-- Step 3: Create admin user if not exists
-- This inserts James Reynolds as admin with email
-- Password will be set via registration on first login
INSERT INTO users (
    first_name,
    last_name,
    email,
    is_admin
)
VALUES (
    'James',
    'Reynolds',
    'jameshreynolds@gmail.com',
    true
)
ON CONFLICT (email) DO UPDATE
SET is_admin = true;

-- Step 4: Verify migration completed successfully
-- This will show the admin user details
SELECT
    id,
    email,
    full_name,
    is_admin,
    password_hash IS NOT NULL as has_password,
    created_at
FROM users
WHERE email = 'jameshreynolds@gmail.com';

-- Step 5: Verify photos table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'photos' AND column_name = 'deleted_at';

-- =====================================================
-- MIGRATION COMPLETE
-- Next steps:
-- 1. Deploy updated code to Render from develop branch
-- 2. Register admin account at /register with your email
-- 3. Login to access admin dashboard at /admin
-- =====================================================
