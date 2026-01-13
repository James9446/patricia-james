-- Migration: Add address field to users table
-- Purpose: Allow admins to track guest addresses (admin-only field)
-- Date: 2026-01-10

-- Add address column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS address TEXT;

-- Add comment to document admin-only usage
COMMENT ON COLUMN users.address IS 'Guest mailing address - admin-only field, never exposed to regular users';
