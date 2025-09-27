-- ========================================
-- Patricia y James Wedding Website - Schema v5 (Simplified)
-- ========================================
-- Fixes the actual problems in v4 without unnecessary complexity
-- 
-- Key Fixes:
-- - Remove guests.email (email only in users table)
-- - Remove is_primary column (not needed)
-- - Add party_size to guests table
-- - Simplify partner relationships
-- ========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- GUESTS Table (Simplified)
-- ========================================
CREATE TABLE guests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    full_name VARCHAR(200) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
    partner_id UUID REFERENCES guests(id) ON DELETE SET NULL, -- Link to partner if applicable
    plus_one_allowed BOOLEAN DEFAULT false, -- Can this guest bring a plus-one?
    admin_notes TEXT, -- Internal notes for admin use
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- USERS Table (Authentication only)
-- ========================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL, -- Email serves as username
    password_hash VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT false, -- Admin privileges
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE -- Soft delete instead of is_active
);

-- ========================================
-- RSVPs Table (Simplified)
-- ========================================
CREATE TABLE rsvps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
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
CREATE TABLE user_sessions (
    sid VARCHAR NOT NULL,
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL,
    PRIMARY KEY (sid)
);

-- ========================================
-- PHOTOS Table (Future feature)
-- ========================================
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

-- Guests
CREATE INDEX idx_guests_partner ON guests(partner_id);
CREATE INDEX idx_guests_name ON guests(last_name, first_name);

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_guest ON users(guest_id);
CREATE INDEX idx_users_admin ON users(is_admin);
CREATE INDEX idx_users_deleted ON users(deleted_at);

-- RSVPs
CREATE INDEX idx_rsvps_guest ON rsvps(guest_id);
CREATE INDEX idx_rsvps_user ON rsvps(user_id);
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

-- No party_size constraints needed

-- Ensure attending count is positive
ALTER TABLE rsvps ADD CONSTRAINT chk_attending_count_positive 
    CHECK (attending_count > 0);

-- Ensure email format
ALTER TABLE users ADD CONSTRAINT chk_email_format 
    CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- ========================================
-- SAMPLE DATA (for testing)
-- ========================================

-- Sample guests
INSERT INTO guests (first_name, last_name, plus_one_allowed, admin_notes) VALUES
('John', 'Smith', false, 'Primary guest in couple'),
('Jane', 'Smith', false, 'John''s wife'),
('Mike', 'Jones', true, 'Individual guest with plus-one'),
('Sarah', 'Wilson', false, 'Individual guest no plus-one');

-- Link partners
UPDATE guests SET partner_id = (SELECT id FROM guests WHERE first_name = 'Jane' AND last_name = 'Smith') 
WHERE first_name = 'John' AND last_name = 'Smith';

UPDATE guests SET partner_id = (SELECT id FROM guests WHERE first_name = 'John' AND last_name = 'Smith') 
WHERE first_name = 'Jane' AND last_name = 'Smith';

-- ========================================
-- VIEWS for Common Queries
-- ========================================

-- View: Guest details with user account status
CREATE VIEW guest_details AS
SELECT 
    g.id,
    g.first_name,
    g.last_name,
    g.full_name,
    g.plus_one_allowed,
    g.partner_id,
    p.first_name as partner_first_name,
    p.last_name as partner_last_name,
    u.email as user_email,
    u.id as user_id,
    u.is_admin,
    CASE WHEN u.id IS NOT NULL THEN true ELSE false END as has_user_account
FROM guests g
LEFT JOIN guests p ON g.partner_id = p.id
LEFT JOIN users u ON g.id = u.guest_id;

-- View: RSVP summary with guest details
CREATE VIEW rsvp_summary AS
SELECT 
    r.id as rsvp_id,
    g.first_name,
    g.last_name,
    g.full_name,
    r.response_status,
    r.attending_count,
    r.plus_one_name,
    r.dietary_restrictions,
    r.responded_at,
    u.email as submitted_by_email
FROM rsvps r
JOIN guests g ON r.guest_id = g.id
LEFT JOIN users u ON r.user_id = u.id;

-- ========================================
-- SCHEMA V5 SIMPLIFIED - COMPLETE
-- ========================================
-- This schema fixes the actual problems from v4:
-- ✅ No data duplication (email only in users table)
-- ✅ No unnecessary is_primary column
-- ✅ Simplified partner relationships
-- ✅ Clean user authentication
-- ✅ Soft delete instead of is_active
-- ========================================
