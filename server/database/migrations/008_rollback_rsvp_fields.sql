-- ========================================
-- Rollback RSVP Fields Migration
-- ========================================
-- Removes party_size and song_requests fields from rsvps table
-- These fields are not needed for the application
-- ========================================

-- Drop party_size column
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_name = 'rsvps' AND column_name = 'party_size') THEN
        ALTER TABLE rsvps DROP COLUMN party_size;
    END IF;
END $$;

-- Drop song_requests column
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_name = 'rsvps' AND column_name = 'song_requests') THEN
        ALTER TABLE rsvps DROP COLUMN song_requests;
    END IF;
END $$;

-- ========================================
-- Rollback Complete
-- ========================================
