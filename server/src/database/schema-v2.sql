-- ========================================
-- Patricia & James Wedding Database Schema v2
-- Enhanced for Guest Relationships and Plus-Ones
-- ========================================

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- Guests Table (Core guest information)
-- ========================================
CREATE TABLE IF NOT EXISTS guests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    
    -- Guest relationship and invitation details
    partner_id UUID REFERENCES guests(id) ON DELETE SET NULL, -- Link to partner if applicable
    is_primary_guest BOOLEAN DEFAULT true, -- True for main guest, false for partner
    plus_one_allowed BOOLEAN DEFAULT false, -- Can this guest bring a plus-one?
    plus_one_name VARCHAR(200), -- Name of plus-one if provided
    plus_one_email VARCHAR(255), -- Email of plus-one if provided
    
    -- Invitation status
    is_invited BOOLEAN DEFAULT true,
    invitation_sent BOOLEAN DEFAULT false,
    invitation_sent_date TIMESTAMP WITH TIME ZONE,
    
    -- Admin notes
    admin_notes TEXT, -- Internal notes for admin use
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- Users Table (for photo uploads and interactions)
-- ========================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- RSVPs Table (Enhanced for relationships)
-- ========================================
CREATE TABLE IF NOT EXISTS rsvps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- RSVP response details
    response_status VARCHAR(20) NOT NULL CHECK (response_status IN ('attending', 'not_attending', 'pending')),
    party_size INTEGER NOT NULL DEFAULT 1,
    
    -- Partner RSVP (if applicable)
    partner_attending BOOLEAN, -- NULL if no partner, true/false if partner exists
    partner_guest_id UUID REFERENCES guests(id) ON DELETE SET NULL, -- Reference to partner guest record
    
    -- Plus-one details (if applicable)
    plus_one_attending BOOLEAN DEFAULT false,
    plus_one_name VARCHAR(200), -- Name provided by guest
    plus_one_email VARCHAR(255), -- Email provided by guest
    
    -- Additional information
    dietary_restrictions TEXT,
    song_requests TEXT,
    message TEXT,
    
    -- RSVP metadata
    responded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- Photos Table (unchanged)
-- ========================================
CREATE TABLE IF NOT EXISTS photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    caption TEXT,
    is_approved BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- Photo Comments Table (unchanged)
-- ========================================
CREATE TABLE IF NOT EXISTS photo_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- Photo Upvotes Table (unchanged)
-- ========================================
CREATE TABLE IF NOT EXISTS photo_upvotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(photo_id, user_id) -- Prevent duplicate upvotes from same user
);

-- ========================================
-- Indexes for Performance
-- ========================================

-- Guests indexes
CREATE INDEX IF NOT EXISTS idx_guests_email ON guests(email);
CREATE INDEX IF NOT EXISTS idx_guests_name ON guests(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_guests_invited ON guests(is_invited);
CREATE INDEX IF NOT EXISTS idx_guests_partner_id ON guests(partner_id);
CREATE INDEX IF NOT EXISTS idx_guests_primary ON guests(is_primary_guest);
CREATE INDEX IF NOT EXISTS idx_guests_plus_one_allowed ON guests(plus_one_allowed);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_guest_id ON users(guest_id);

-- RSVPs indexes
CREATE INDEX IF NOT EXISTS idx_rsvps_guest_id ON rsvps(guest_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_status ON rsvps(response_status);
CREATE INDEX IF NOT EXISTS idx_rsvps_responded_at ON rsvps(responded_at);
CREATE INDEX IF NOT EXISTS idx_rsvps_partner_guest_id ON rsvps(partner_guest_id);

-- Photos indexes
CREATE INDEX IF NOT EXISTS idx_photos_user_id ON photos(user_id);
CREATE INDEX IF NOT EXISTS idx_photos_approved ON photos(is_approved);
CREATE INDEX IF NOT EXISTS idx_photos_featured ON photos(is_featured);
CREATE INDEX IF NOT EXISTS idx_photos_upload_date ON photos(upload_date);

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_photo_comments_photo_id ON photo_comments(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_comments_user_id ON photo_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_photo_comments_created_at ON photo_comments(created_at);

-- Upvotes indexes
CREATE INDEX IF NOT EXISTS idx_photo_upvotes_photo_id ON photo_upvotes(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_upvotes_user_id ON photo_upvotes(user_id);

-- ========================================
-- Functions for Updated At Timestamps
-- ========================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_guests_updated_at BEFORE UPDATE ON guests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rsvps_updated_at BEFORE UPDATE ON rsvps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_photos_updated_at BEFORE UPDATE ON photos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_photo_comments_updated_at BEFORE UPDATE ON photo_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- Sample Data (Enhanced for relationships)
-- ========================================

-- Insert sample guests with relationships
INSERT INTO guests (first_name, last_name, email, is_primary_guest, plus_one_allowed) VALUES
('Patricia', 'Garcia', 'patricia@example.com', true, false),
('James', 'Smith', 'james@example.com', true, false),
('Maria', 'Garcia', 'maria@example.com', true, true),
('John', 'Doe', 'john@example.com', true, false)
ON CONFLICT (email) DO NOTHING;

-- Update partner relationships (example: Maria and John are partners)
UPDATE guests 
SET partner_id = (SELECT id FROM guests WHERE email = 'john@example.com')
WHERE email = 'maria@example.com';

UPDATE guests 
SET partner_id = (SELECT id FROM guests WHERE email = 'maria@example.com')
WHERE email = 'john@example.com';

-- Mark John as not primary (since Maria is the primary guest in this couple)
UPDATE guests 
SET is_primary_guest = false
WHERE email = 'john@example.com';

-- ========================================
-- Views for Common Queries
-- ========================================

-- View for guest pairs (primary guest + partner)
CREATE OR REPLACE VIEW guest_pairs AS
SELECT 
    g1.id as primary_guest_id,
    g1.first_name as primary_first_name,
    g1.last_name as primary_last_name,
    g1.email as primary_email,
    g1.plus_one_allowed as primary_plus_one_allowed,
    g2.id as partner_guest_id,
    g2.first_name as partner_first_name,
    g2.last_name as partner_last_name,
    g2.email as partner_email,
    CASE 
        WHEN g2.id IS NOT NULL THEN 2 
        ELSE 1 
    END as total_invited_count
FROM guests g1
LEFT JOIN guests g2 ON g1.partner_id = g2.id
WHERE g1.is_primary_guest = true;

-- View for RSVP summary
CREATE OR REPLACE VIEW rsvp_summary AS
SELECT 
    g.id as guest_id,
    g.first_name,
    g.last_name,
    g.email,
    r.response_status,
    r.party_size,
    r.partner_attending,
    r.plus_one_attending,
    r.responded_at,
    CASE 
        WHEN r.partner_attending = true AND r.plus_one_attending = true THEN r.party_size + 2
        WHEN r.partner_attending = true OR r.plus_one_attending = true THEN r.party_size + 1
        ELSE r.party_size
    END as total_attending
FROM guests g
LEFT JOIN rsvps r ON g.id = r.guest_id
WHERE g.is_primary_guest = true;
