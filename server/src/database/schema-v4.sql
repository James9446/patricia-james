-- ========================================
-- Patricia & James Wedding Database Schema v4
-- Streamlined and Clean
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
    full_name VARCHAR(200) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
    email VARCHAR(255) UNIQUE, -- May be NULL initially, added during RSVP
    
    -- Guest relationship and invitation details
    partner_id UUID REFERENCES guests(id) ON DELETE SET NULL, -- Link to partner if applicable
    plus_one_allowed BOOLEAN DEFAULT false, -- Can this guest bring a plus-one?
    
    -- Admin notes
    admin_notes TEXT, -- Internal notes for admin use
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique full names for authentication
    UNIQUE(first_name, last_name)
);

-- ========================================
-- Users Table (for photo uploads and interactions)
-- ========================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL, -- Email serves as username
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    is_admin BOOLEAN DEFAULT false, -- Admin privileges
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- RSVPs Table (Enhanced for flexible couple RSVPs)
-- ========================================
CREATE TABLE IF NOT EXISTS rsvps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- RSVP response details
    response_status VARCHAR(20) NOT NULL CHECK (response_status IN ('attending', 'not_attending', 'pending')),
    
    -- For couples: who is this RSVP for?
    rsvp_for_self BOOLEAN DEFAULT true, -- Is this RSVP for the guest themselves?
    rsvp_for_partner BOOLEAN DEFAULT false, -- Is this RSVP also for their partner?
    
    -- Partner details (if RSVPing for partner)
    partner_attending BOOLEAN, -- Is partner attending? (NULL if not RSVPing for partner)
    partner_guest_id UUID REFERENCES guests(id) ON DELETE SET NULL, -- Reference to partner
    
    -- Plus-one details (if applicable)
    plus_one_attending BOOLEAN DEFAULT false,
    
    -- Additional information
    dietary_restrictions TEXT, -- Moved from guests table
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
CREATE INDEX IF NOT EXISTS idx_guests_full_name ON guests(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_guests_email ON guests(email);
CREATE INDEX IF NOT EXISTS idx_guests_partner_id ON guests(partner_id);
CREATE INDEX IF NOT EXISTS idx_guests_plus_one_allowed ON guests(plus_one_allowed);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
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
-- Sample Data (Based on your examples)
-- ========================================

-- Insert sample guests based on your examples
INSERT INTO guests (first_name, last_name, plus_one_allowed, admin_notes) VALUES
('Cordelia', 'Reynolds', false, 'Individual guest, no plus-one'),
('Tara', 'Folenta', false, 'Partner of Brenda Bedell'),
('Brenda', 'Bedell', false, 'Partner of Tara Folenta'),
('Alfredo', 'Lopez', true, 'Individual guest, plus-one allowed')
ON CONFLICT (first_name, last_name) DO NOTHING;

-- Update partner relationships
UPDATE guests 
SET partner_id = (SELECT id FROM guests WHERE first_name = 'Brenda' AND last_name = 'Bedell')
WHERE first_name = 'Tara' AND last_name = 'Folenta';

UPDATE guests 
SET partner_id = (SELECT id FROM guests WHERE first_name = 'Tara' AND last_name = 'Folenta')
WHERE first_name = 'Brenda' AND last_name = 'Bedell';

-- ========================================
-- Views for Common Queries
-- ========================================

-- View for guest pairs (primary guest + partner)
CREATE OR REPLACE VIEW guest_pairs AS
SELECT 
    g1.id as primary_guest_id,
    g1.first_name as primary_first_name,
    g1.last_name as primary_last_name,
    g1.full_name as primary_full_name,
    g1.email as primary_email,
    g1.plus_one_allowed as primary_plus_one_allowed,
    g2.id as partner_guest_id,
    g2.first_name as partner_first_name,
    g2.last_name as partner_last_name,
    g2.full_name as partner_full_name,
    g2.email as partner_email,
    CASE 
        WHEN g2.id IS NOT NULL THEN 2 
        ELSE 1 
    END as total_invited_count
FROM guests g1
LEFT JOIN guests g2 ON g1.partner_id = g2.id
WHERE g1.partner_id IS NULL OR g1.id < g2.id; -- Only show each pair once

-- View for RSVP summary (admin view)
CREATE OR REPLACE VIEW rsvp_summary AS
SELECT 
    g.id as guest_id,
    g.first_name,
    g.last_name,
    g.full_name,
    g.email,
    g.plus_one_allowed,
    r.response_status,
    r.rsvp_for_self,
    r.rsvp_for_partner,
    r.partner_attending,
    r.plus_one_attending,
    r.dietary_restrictions,
    r.responded_at,
    CASE 
        WHEN r.rsvp_for_self = true AND r.rsvp_for_partner = true AND r.partner_attending = true AND r.plus_one_attending = true THEN 3
        WHEN r.rsvp_for_self = true AND r.rsvp_for_partner = true AND r.partner_attending = true THEN 2
        WHEN r.rsvp_for_self = true AND r.plus_one_attending = true THEN 2
        WHEN r.rsvp_for_self = true THEN 1
        ELSE 0
    END as total_attending
FROM guests g
LEFT JOIN rsvps r ON g.id = r.guest_id
WHERE g.partner_id IS NULL OR g.id < g.partner_id; -- Only show each pair once

-- View for authentication (name-based lookup)
CREATE OR REPLACE VIEW guest_auth AS
SELECT 
    g.id,
    g.first_name,
    g.last_name,
    g.full_name,
    g.email,
    g.partner_id,
    g.plus_one_allowed,
    p.first_name as partner_first_name,
    p.last_name as partner_last_name,
    p.full_name as partner_full_name,
    p.email as partner_email
FROM guests g
LEFT JOIN guests p ON g.partner_id = p.id;
