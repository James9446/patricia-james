-- ========================================
-- Patricia y James Wedding Website - Schema v5 (Combined Table Approach)
-- ========================================
-- Combined table approach with single users table for both guest and user data
-- 
-- Key Features:
-- - Single users table for all guest and user data
-- - Seeding workflow: names first, email on registration
-- - Individual RSVP records with specific dietary restrictions
-- - Partner RSVP logic: either partner can RSVP for both
-- - Plus-one handling: plus-ones become real users
-- ========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- USERS Table (Combined guest and user data)
-- ========================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    full_name VARCHAR(200) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
    partner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    plus_one_allowed BOOLEAN DEFAULT false,
    email VARCHAR(255) UNIQUE, -- NULL until registered
    password_hash VARCHAR(255), -- NULL until registered
    is_admin BOOLEAN DEFAULT false,
    account_status VARCHAR(20) DEFAULT 'guest' CHECK (account_status IN ('guest', 'registered', 'deleted')),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- ========================================
-- RSVPs Table (Individual RSVP records)
-- ========================================
CREATE TABLE rsvps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Who this RSVP is for
    partner_id UUID REFERENCES users(id) ON DELETE SET NULL, -- If RSVPing for partner
    response_status VARCHAR(20) NOT NULL CHECK (response_status IN ('attending', 'not_attending', 'pending')),
    dietary_restrictions TEXT, -- Specific to this user
    message TEXT, -- Specific to this user
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

-- Users
CREATE INDEX idx_users_partner ON users(partner_id);
CREATE INDEX idx_users_name ON users(last_name, first_name);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_admin ON users(is_admin);
CREATE INDEX idx_users_status ON users(account_status);
CREATE INDEX idx_users_deleted ON users(deleted_at);

-- RSVPs
CREATE INDEX idx_rsvps_user ON rsvps(user_id);
CREATE INDEX idx_rsvps_partner ON rsvps(partner_id);
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

-- Ensure email format when provided
ALTER TABLE users ADD CONSTRAINT chk_email_format 
    CHECK (email IS NULL OR email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Ensure account status is valid
ALTER TABLE users ADD CONSTRAINT chk_account_status 
    CHECK (account_status IN ('guest', 'registered', 'deleted'));

-- Ensure response status is valid
ALTER TABLE rsvps ADD CONSTRAINT chk_response_status 
    CHECK (response_status IN ('attending', 'not_attending', 'pending'));

-- ========================================
-- SAMPLE DATA (for testing)
-- ========================================

-- Sample users (seeding process)
INSERT INTO users (first_name, last_name, plus_one_allowed, admin_notes) VALUES
('John', 'Smith', false, 'Primary guest in couple'),
('Jane', 'Smith', false, 'John''s wife'),
('Mike', 'Jones', true, 'Individual guest with plus-one'),
('Sarah', 'Wilson', false, 'Individual guest no plus-one');

-- Link partners
UPDATE users SET partner_id = (SELECT id FROM users WHERE first_name = 'Jane' AND last_name = 'Smith') 
WHERE first_name = 'John' AND last_name = 'Smith';

UPDATE users SET partner_id = (SELECT id FROM users WHERE first_name = 'John' AND last_name = 'Smith') 
WHERE first_name = 'Jane' AND last_name = 'Smith';

-- ========================================
-- VIEWS for Common Queries
-- ========================================

-- View: User details with partner information
CREATE VIEW user_details AS
SELECT 
    u.id,
    u.first_name,
    u.last_name,
    u.full_name,
    u.email,
    u.account_status,
    u.plus_one_allowed,
    u.partner_id,
    p.first_name as partner_first_name,
    p.last_name as partner_last_name,
    p.email as partner_email,
    u.admin_notes,
    u.created_at,
    u.updated_at
FROM users u
LEFT JOIN users p ON u.partner_id = p.id
WHERE u.deleted_at IS NULL;

-- View: RSVP summary with user details
CREATE VIEW rsvp_summary AS
SELECT 
    r.id as rsvp_id,
    u.first_name,
    u.last_name,
    u.full_name,
    u.email,
    r.response_status,
    r.dietary_restrictions,
    r.message,
    r.responded_at,
    p.first_name as partner_first_name,
    p.last_name as partner_last_name
FROM rsvps r
JOIN users u ON r.user_id = u.id
LEFT JOIN users p ON r.partner_id = p.id
WHERE u.deleted_at IS NULL;

-- View: Users with RSVP status
CREATE VIEW users_with_rsvp AS
SELECT 
    u.id,
    u.first_name,
    u.last_name,
    u.full_name,
    u.email,
    u.account_status,
    u.plus_one_allowed,
    r.response_status,
    r.dietary_restrictions,
    r.responded_at,
    CASE WHEN r.id IS NOT NULL THEN true ELSE false END as has_rsvp
FROM users u
LEFT JOIN rsvps r ON u.id = r.user_id
WHERE u.deleted_at IS NULL;

-- ========================================
-- FUNCTIONS for Common Operations
-- ========================================

-- Function: Get user by name (for registration lookup)
CREATE OR REPLACE FUNCTION get_user_by_name(f_name VARCHAR(100), l_name VARCHAR(100))
RETURNS TABLE (
    id UUID,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    full_name VARCHAR(200),
    email VARCHAR(255),
    account_status VARCHAR(20),
    plus_one_allowed BOOLEAN,
    partner_id UUID,
    has_user_account BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.full_name,
        u.email,
        u.account_status,
        u.plus_one_allowed,
        u.partner_id,
        CASE WHEN u.email IS NOT NULL THEN true ELSE false END as has_user_account
    FROM users u
    WHERE u.first_name = f_name 
    AND u.last_name = l_name 
    AND u.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Function: Get partner for a user
CREATE OR REPLACE FUNCTION get_partner_for_user(user_id UUID)
RETURNS TABLE (
    id UUID,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    full_name VARCHAR(200),
    email VARCHAR(255),
    account_status VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.first_name,
        p.last_name,
        p.full_name,
        p.email,
        p.account_status
    FROM users u
    JOIN users p ON u.partner_id = p.id
    WHERE u.id = user_id 
    AND u.deleted_at IS NULL 
    AND p.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Function: Get RSVPs for user (including partner RSVPs)
CREATE OR REPLACE FUNCTION get_rsvps_for_user(user_uuid UUID)
RETURNS TABLE (
    rsvp_id UUID,
    rsvp_user_id UUID,
    rsvp_partner_id UUID,
    response_status VARCHAR(20),
    dietary_restrictions TEXT,
    message TEXT,
    responded_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id as rsvp_id,
        r.user_id as rsvp_user_id,
        r.partner_id as rsvp_partner_id,
        r.response_status,
        r.dietary_restrictions,
        r.message,
        r.responded_at
    FROM rsvps r
    WHERE (r.user_id = user_uuid OR r.partner_id = user_uuid)
    ORDER BY r.responded_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- SCHEMA V5 COMBINED - COMPLETE
-- ========================================
-- This schema implements the combined table approach:
-- ✅ Single users table for all guest and user data
-- ✅ Seeding workflow: names first, email on registration
-- ✅ Individual RSVP records with specific dietary restrictions
-- ✅ Partner RSVP logic: either partner can RSVP for both
-- ✅ Plus-one handling: plus-ones become real users
-- ✅ No data duplication: email only stored once
-- ✅ Soft delete: deleted_at instead of is_active
-- ========================================
