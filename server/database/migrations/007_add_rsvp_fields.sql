-- ========================================
-- Add Missing RSVP Fields Migration
-- ========================================
-- Adds party_size and song_requests fields to the rsvps table
-- to match the frontend RSVP form
-- ========================================

-- Add party_size column (number of guests attending)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_name = 'rsvps' AND column_name = 'party_size') THEN
        ALTER TABLE rsvps ADD COLUMN party_size INTEGER DEFAULT 1;
        COMMENT ON COLUMN rsvps.party_size IS 'Number of guests attending (including the user)';
    END IF;
END $$;

-- Add song_requests column (songs requested for reception)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_name = 'rsvps' AND column_name = 'song_requests') THEN
        ALTER TABLE rsvps ADD COLUMN song_requests TEXT;
        COMMENT ON COLUMN rsvps.song_requests IS 'Songs the guest would like to hear at the reception';
    END IF;
END $$;

-- Add constraint to ensure party_size is reasonable (1-10 guests)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage
                  WHERE constraint_name = 'chk_party_size_range') THEN
        ALTER TABLE rsvps ADD CONSTRAINT chk_party_size_range
            CHECK (party_size IS NULL OR (party_size >= 1 AND party_size <= 10));
    END IF;
END $$;

-- ========================================
-- Migration Complete
-- ========================================
