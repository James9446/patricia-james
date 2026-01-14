-- Migration 007: Password Reset Fields
-- Adds fields to support password reset flow

-- Add password reset fields to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS reset_token VARCHAR(64),
  ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP WITH TIME ZONE;

-- Create index on reset_token for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_reset_token
  ON users(reset_token)
  WHERE reset_token IS NOT NULL;

-- Add comments explaining the fields
COMMENT ON COLUMN users.reset_token IS 'Token sent via email for password reset (NULL when not resetting)';
COMMENT ON COLUMN users.reset_token_expires IS 'When the reset token expires (1 hour from creation)';
