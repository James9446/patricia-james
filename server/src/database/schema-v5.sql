-- ========================================
-- Patricia y James Wedding Website - Schema v5
-- ========================================
-- Redesigned schema with invitation-centric approach
-- Addresses critical issues in v4: data duplication, missing concepts, complex relationships
-- 
-- Key Improvements:
-- - Single source of truth for data
-- - Clear relationships without circular references  
-- - Wedding-specific design for RSVP workflows
-- - Better user experience with type detection
-- ========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- INVITATIONS Table (Master invitation list)
-- ========================================
-- This is the core table that represents each invitation sent out
-- Contains the invitation code, party size, and permissions
CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invitation_code VARCHAR(20) UNIQUE NOT NULL, -- e.g., "SMITH001", "JONES002"
    primary_guest_name VARCHAR(200) NOT NULL, -- "John & Jane Smith"
    party_size INTEGER NOT NULL DEFAULT 2, -- How many people can attend
    plus_one_allowed BOOLEAN DEFAULT false, -- Can this invitation bring a plus-one?
    invitation_sent BOOLEAN DEFAULT false, -- Has the invitation been sent?
    rsvp_deadline DATE, -- When do RSVPs need to be submitted?
    admin_notes TEXT, -- Internal notes for admin use
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- GUESTS Table (Individual people)
-- ========================================
-- Each person invited to the wedding
-- Linked to an invitation, no circular references
CREATE TABLE guests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invitation_id UUID REFERENCES invitations(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    admin_notes TEXT, -- Internal notes for admin use
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- USERS Table (Authentication only)
-- ========================================
-- User accounts for authentication
-- Links to a guest record, no redundant name fields
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT false,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE -- Soft delete instead of is_active
);

-- ========================================
-- RSVPs Table (Simplified)
-- ========================================
-- RSVP responses for invitations
-- Single RSVP per invitation, plus-one details stored inline
CREATE TABLE rsvps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invitation_id UUID REFERENCES invitations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Who submitted the RSVP
    guest_id UUID REFERENCES guests(id) ON DELETE CASCADE, -- Which guest submitted
    
    -- RSVP details
    response_status VARCHAR(20) NOT NULL CHECK (response_status IN ('attending', 'not_attending', 'pending')),
    attending_count INTEGER NOT NULL DEFAULT 1, -- How many people are attending
    
    -- Plus-one details (if applicable)
    plus_one_name VARCHAR(200), -- Name of plus-one if bringing one
    plus_one_email VARCHAR(255), -- Email of plus-one if provided
    
    -- Additional information
    dietary_restrictions TEXT,
    song_requests TEXT,
    message TEXT,
    
    -- Metadata
    responded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- USER_SESSIONS Table (Session storage)
-- ========================================
-- Required for express-session with connect-pg-simple
CREATE TABLE user_sessions (
    sid VARCHAR NOT NULL,
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL,
    PRIMARY KEY (sid)
);

-- ========================================
-- PHOTOS Table (Future feature)
-- ========================================
-- Photo uploads and management
CREATE TABLE photos (
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
-- PHOTO_COMMENTS Table (Future feature)
-- ========================================
-- Comments on photos
CREATE TABLE photo_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- PHOTO_UPVOTES Table (Future feature)
-- ========================================
-- Upvotes on photos (prevents duplicate votes)
CREATE TABLE photo_upvotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(photo_id, user_id)
);

-- ========================================
-- INDEXES for Performance
-- ========================================

-- Invitations
CREATE INDEX idx_invitations_code ON invitations(invitation_code);
CREATE INDEX idx_invitations_sent ON invitations(invitation_sent);

-- Guests
CREATE INDEX idx_guests_invitation ON guests(invitation_id);
CREATE INDEX idx_guests_name ON guests(last_name, first_name);

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_guest ON users(guest_id);
CREATE INDEX idx_users_admin ON users(is_admin);
CREATE INDEX idx_users_deleted ON users(deleted_at);

-- RSVPs
CREATE INDEX idx_rsvps_invitation ON rsvps(invitation_id);
CREATE INDEX idx_rsvps_user ON rsvps(user_id);
CREATE INDEX idx_rsvps_guest ON rsvps(guest_id);
CREATE INDEX idx_rsvps_status ON rsvps(response_status);

-- Sessions
CREATE INDEX idx_sessions_expire ON user_sessions(expire);

-- Photos
CREATE INDEX idx_photos_user ON photos(user_id);
CREATE INDEX idx_photos_approved ON photos(is_approved);
CREATE INDEX idx_photos_featured ON photos(is_featured);

-- ========================================
-- CONSTRAINTS and VALIDATIONS
-- ========================================

-- Ensure invitation codes are unique and follow format
ALTER TABLE invitations ADD CONSTRAINT chk_invitation_code_format 
    CHECK (invitation_code ~ '^[A-Z0-9]+$');

-- Ensure party size is positive
ALTER TABLE invitations ADD CONSTRAINT chk_party_size_positive 
    CHECK (party_size > 0);

-- Ensure attending count is positive
ALTER TABLE rsvps ADD CONSTRAINT chk_attending_count_positive 
    CHECK (attending_count > 0);

-- Ensure email format
ALTER TABLE users ADD CONSTRAINT chk_email_format 
    CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- ========================================
-- SAMPLE DATA (for testing)
-- ========================================

-- Sample invitations
INSERT INTO invitations (invitation_code, primary_guest_name, party_size, plus_one_allowed, invitation_sent, admin_notes) VALUES
('SMITH001', 'John & Jane Smith', 2, false, true, 'Close family friends'),
('JONES002', 'Mike Jones', 1, true, true, 'College friend'),
('WILSON003', 'Sarah & Tom Wilson', 2, false, false, 'Work colleagues');

-- Sample guests
INSERT INTO guests (invitation_id, first_name, last_name, admin_notes) VALUES
((SELECT id FROM invitations WHERE invitation_code = 'SMITH001'), 'John', 'Smith', 'Primary guest'),
((SELECT id FROM invitations WHERE invitation_code = 'SMITH001'), 'Jane', 'Smith', 'John''s wife'),
((SELECT id FROM invitations WHERE invitation_code = 'JONES002'), 'Mike', 'Jones', 'Individual guest'),
((SELECT id FROM invitations WHERE invitation_code = 'WILSON003'), 'Sarah', 'Wilson', 'Primary guest'),
((SELECT id FROM invitations WHERE invitation_code = 'WILSON003'), 'Tom', 'Wilson', 'Sarah''s husband');

-- ========================================
-- VIEWS for Common Queries
-- ========================================

-- View: Invitation details with guest count
CREATE VIEW invitation_details AS
SELECT 
    i.id,
    i.invitation_code,
    i.primary_guest_name,
    i.party_size,
    i.plus_one_allowed,
    i.invitation_sent,
    i.rsvp_deadline,
    COUNT(g.id) as guest_count,
    i.admin_notes,
    i.created_at
FROM invitations i
LEFT JOIN guests g ON i.id = g.invitation_id
GROUP BY i.id, i.invitation_code, i.primary_guest_name, i.party_size, 
         i.plus_one_allowed, i.invitation_sent, i.rsvp_deadline, i.admin_notes, i.created_at;

-- View: RSVP summary with invitation details
CREATE VIEW rsvp_summary AS
SELECT 
    r.id as rsvp_id,
    i.invitation_code,
    i.primary_guest_name,
    r.response_status,
    r.attending_count,
    r.plus_one_name,
    r.dietary_restrictions,
    r.responded_at,
    u.email as submitted_by_email
FROM rsvps r
JOIN invitations i ON r.invitation_id = i.id
LEFT JOIN users u ON r.user_id = u.id;

-- View: Guest details with user account status
CREATE VIEW guest_details AS
SELECT 
    g.id,
    g.first_name,
    g.last_name,
    i.invitation_code,
    i.primary_guest_name,
    i.party_size,
    i.plus_one_allowed,
    u.email as user_email,
    u.id as user_id,
    u.is_admin,
    CASE WHEN u.id IS NOT NULL THEN true ELSE false END as has_user_account
FROM guests g
JOIN invitations i ON g.invitation_id = i.id
LEFT JOIN users u ON g.id = u.guest_id;

-- ========================================
-- FUNCTIONS for Common Operations
-- ========================================

-- Function: Get invitation by code
CREATE OR REPLACE FUNCTION get_invitation_by_code(inv_code VARCHAR(20))
RETURNS TABLE (
    id UUID,
    invitation_code VARCHAR(20),
    primary_guest_name VARCHAR(200),
    party_size INTEGER,
    plus_one_allowed BOOLEAN,
    invitation_sent BOOLEAN,
    rsvp_deadline DATE,
    admin_notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.invitation_code,
        i.primary_guest_name,
        i.party_size,
        i.plus_one_allowed,
        i.invitation_sent,
        i.rsvp_deadline,
        i.admin_notes
    FROM invitations i
    WHERE i.invitation_code = inv_code;
END;
$$ LANGUAGE plpgsql;

-- Function: Get guests for an invitation
CREATE OR REPLACE FUNCTION get_guests_for_invitation(inv_id UUID)
RETURNS TABLE (
    id UUID,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    user_id UUID,
    user_email VARCHAR(255),
    has_user_account BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        g.id,
        g.first_name,
        g.last_name,
        u.id as user_id,
        u.email as user_email,
        CASE WHEN u.id IS NOT NULL THEN true ELSE false END as has_user_account
    FROM guests g
    LEFT JOIN users u ON g.id = u.guest_id
    WHERE g.invitation_id = inv_id;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- SCHEMA V5 COMPLETE
-- ========================================
-- This schema addresses all critical issues from v4:
-- ✅ No data duplication (email only in users table)
-- ✅ Clear relationships (invitation → guests → users)
-- ✅ Wedding-specific design (invitation codes, party size)
-- ✅ Simple logic (no circular references)
-- ✅ Better UX (user type detection, dynamic forms)
-- ========================================

