-- ========================================
-- Photo System v6 Migration (Safe Version)
-- ========================================
-- Updates schema for comprehensive photo system with categories and optimization
-- Checks for existing objects before creating them
-- ========================================

-- ========================================
-- PHOTO CATEGORIES Table
-- ========================================
CREATE TABLE IF NOT EXISTS photo_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- UPDATE PHOTOS Table
-- ========================================

-- Add category support (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'photos' AND column_name = 'category_id') THEN
        ALTER TABLE photos ADD COLUMN category_id UUID REFERENCES photo_categories(id);
    END IF;
END $$;

-- Add optimization tracking (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'photos' AND column_name = 'is_optimized') THEN
        ALTER TABLE photos ADD COLUMN is_optimized BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'photos' AND column_name = 'optimized_filename') THEN
        ALTER TABLE photos ADD COLUMN optimized_filename VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'photos' AND column_name = 'thumbnail_filename') THEN
        ALTER TABLE photos ADD COLUMN thumbnail_filename VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'photos' AND column_name = 'optimized_at') THEN
        ALTER TABLE photos ADD COLUMN optimized_at TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'photos' AND column_name = 'original_file_size') THEN
        ALTER TABLE photos ADD COLUMN original_file_size INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'photos' AND column_name = 'optimized_file_size') THEN
        ALTER TABLE photos ADD COLUMN optimized_file_size INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'photos' AND column_name = 'display_order') THEN
        ALTER TABLE photos ADD COLUMN display_order INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'photos' AND column_name = 'file_hash') THEN
        ALTER TABLE photos ADD COLUMN file_hash VARCHAR(64) UNIQUE;
    END IF;
END $$;

-- Update is_approved default to true (auto-approve for now)
ALTER TABLE photos ALTER COLUMN is_approved SET DEFAULT true;

-- ========================================
-- RENAME PHOTO_UPVOTES TO PHOTO_LIKES (if exists)
-- ========================================
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'photo_upvotes') THEN
        ALTER TABLE photo_upvotes RENAME TO photo_likes;
    END IF;
END $$;

-- ========================================
-- ADD PERFORMANCE INDEXES (if not exist)
-- ========================================

-- Photo categories indexes
CREATE INDEX IF NOT EXISTS idx_photo_categories_slug ON photo_categories(slug);
CREATE INDEX IF NOT EXISTS idx_photo_categories_active ON photo_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_photo_categories_display_order ON photo_categories(display_order);

-- Photos indexes
CREATE INDEX IF NOT EXISTS idx_photos_category ON photos(category_id);
CREATE INDEX IF NOT EXISTS idx_photos_featured ON photos(is_featured);
CREATE INDEX IF NOT EXISTS idx_photos_display_order ON photos(display_order);
CREATE INDEX IF NOT EXISTS idx_photos_optimized ON photos(is_optimized);
CREATE INDEX IF NOT EXISTS idx_photos_approved ON photos(is_approved);
CREATE INDEX IF NOT EXISTS idx_photos_upload_date ON photos(upload_date);
CREATE INDEX IF NOT EXISTS idx_photos_user_category ON photos(user_id, category_id);

-- Photo likes indexes
CREATE INDEX IF NOT EXISTS idx_photo_likes_photo ON photo_likes(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_likes_user ON photo_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_photo_likes_created ON photo_likes(created_at);

-- Photo comments indexes
CREATE INDEX IF NOT EXISTS idx_photo_comments_photo ON photo_comments(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_comments_user ON photo_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_photo_comments_approved ON photo_comments(is_approved);
CREATE INDEX IF NOT EXISTS idx_photo_comments_created ON photo_comments(created_at);

-- ========================================
-- SEED INITIAL CATEGORIES (if not exist)
-- ========================================
INSERT INTO photo_categories (name, slug, description, display_order) 
SELECT * FROM (VALUES
    ('Engagement', 'engagement', 'Professional and candid engagement moments', 1),
    ('Relationship Timeline', 'timeline', 'Photos from throughout their relationship', 2),
    ('Childhood', 'childhood', 'Early photos of Patricia and James', 3),
    ('Family', 'family', 'Extended family moments', 4),
    ('Adventures', 'adventures', 'Travel and experiences together', 5),
    ('Wedding Preparation', 'prep', 'Behind-the-scenes wedding preparation', 6),
    ('Wedding Day', 'wedding', 'Ceremony and reception photos', 7),
    ('Guest Memories', 'memories', 'Photos with the couple from over the years', 8)
) AS v(name, slug, description, display_order)
WHERE NOT EXISTS (SELECT 1 FROM photo_categories WHERE slug = v.slug);

-- ========================================
-- UPDATE EXISTING PHOTOS (if any)
-- ========================================
-- Set default category for existing photos (if any exist)
UPDATE photos 
SET category_id = (SELECT id FROM photo_categories WHERE slug = 'memories' LIMIT 1)
WHERE category_id IS NULL;

-- ========================================
-- ADD CONSTRAINTS (if not exist)
-- ========================================

-- Ensure display_order is non-negative
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'chk_photos_display_order_positive') THEN
        ALTER TABLE photos ADD CONSTRAINT chk_photos_display_order_positive 
            CHECK (display_order >= 0);
    END IF;
END $$;

-- Ensure file sizes are positive
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'chk_photos_file_size_positive') THEN
        ALTER TABLE photos ADD CONSTRAINT chk_photos_file_size_positive 
            CHECK (file_size > 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'chk_photos_original_file_size_positive') THEN
        ALTER TABLE photos ADD CONSTRAINT chk_photos_original_file_size_positive 
            CHECK (original_file_size IS NULL OR original_file_size > 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'chk_photos_optimized_file_size_positive') THEN
        ALTER TABLE photos ADD CONSTRAINT chk_photos_optimized_file_size_positive 
            CHECK (optimized_file_size IS NULL OR optimized_file_size > 0);
    END IF;
END $$;

-- ========================================
-- CREATE VIEWS FOR COMMON QUERIES (if not exist)
-- ========================================

-- View: Photos with category and user information
CREATE OR REPLACE VIEW photo_details AS
SELECT 
    p.id,
    p.filename,
    p.original_filename,
    p.optimized_filename,
    p.thumbnail_filename,
    p.caption,
    p.is_featured,
    p.is_approved,
    p.is_optimized,
    p.upload_date,
    p.display_order,
    p.file_size,
    p.original_file_size,
    p.optimized_file_size,
    p.mime_type,
    p.category_id,
    c.name as category_name,
    c.slug as category_slug,
    u.first_name,
    u.last_name,
    u.full_name,
    COALESCE(like_stats.like_count, 0) as like_count,
    COALESCE(comment_stats.comment_count, 0) as comment_count
FROM photos p
JOIN photo_categories c ON p.category_id = c.id
JOIN users u ON p.user_id = u.id
LEFT JOIN (
    SELECT photo_id, COUNT(*) as like_count
    FROM photo_likes
    GROUP BY photo_id
) like_stats ON p.id = like_stats.photo_id
LEFT JOIN (
    SELECT photo_id, COUNT(*) as comment_count
    FROM photo_comments
    WHERE is_approved = true
    GROUP BY photo_id
) comment_stats ON p.id = comment_stats.photo_id
WHERE u.deleted_at IS NULL;

-- View: Featured photos
CREATE OR REPLACE VIEW featured_photos AS
SELECT *
FROM photo_details
WHERE is_featured = true
ORDER BY display_order ASC, upload_date DESC;

-- View: Photos by category
CREATE OR REPLACE VIEW photos_by_category AS
SELECT 
    c.id as category_id,
    c.name as category_name,
    c.slug as category_slug,
    c.description as category_description,
    COUNT(p.id) as photo_count,
    MAX(p.upload_date) as latest_photo_date
FROM photo_categories c
LEFT JOIN photos p ON c.id = p.category_id
WHERE c.is_active = true
GROUP BY c.id, c.name, c.slug, c.description, c.display_order
ORDER BY c.display_order ASC;

-- ========================================
-- CREATE FUNCTIONS FOR COMMON OPERATIONS
-- ========================================

-- Function: Get photos by category with pagination
CREATE OR REPLACE FUNCTION get_photos_by_category(
    category_slug VARCHAR(100),
    page_size INTEGER DEFAULT 20,
    page_offset INTEGER DEFAULT 0,
    sort_by VARCHAR(20) DEFAULT 'newest'
)
RETURNS TABLE (
    id UUID,
    filename VARCHAR(255),
    optimized_filename VARCHAR(255),
    thumbnail_filename VARCHAR(255),
    caption TEXT,
    is_featured BOOLEAN,
    upload_date TIMESTAMP WITH TIME ZONE,
    like_count BIGINT,
    comment_count BIGINT,
    user_name VARCHAR(200),
    category_name VARCHAR(100)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pd.id,
        pd.filename,
        pd.optimized_filename,
        pd.thumbnail_filename,
        pd.caption,
        pd.is_featured,
        pd.upload_date,
        pd.like_count,
        pd.comment_count,
        pd.full_name,
        pd.category_name
    FROM photo_details pd
    WHERE pd.category_slug = category_slug
    AND pd.is_approved = true
    ORDER BY 
        CASE WHEN sort_by = 'oldest' THEN pd.upload_date END ASC,
        CASE WHEN sort_by = 'newest' THEN pd.upload_date END DESC,
        CASE WHEN sort_by = 'most_liked' THEN pd.like_count END DESC,
        CASE WHEN sort_by = 'most_commented' THEN pd.comment_count END DESC,
        CASE WHEN sort_by = 'featured' THEN pd.is_featured END DESC,
        pd.upload_date DESC
    LIMIT page_size OFFSET page_offset;
END;
$$ LANGUAGE plpgsql;

-- Function: Get photo with interactions
CREATE OR REPLACE FUNCTION get_photo_with_interactions(
    photo_uuid UUID,
    user_uuid UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    filename VARCHAR(255),
    optimized_filename VARCHAR(255),
    caption TEXT,
    is_featured BOOLEAN,
    upload_date TIMESTAMP WITH TIME ZONE,
    like_count BIGINT,
    comment_count BIGINT,
    user_has_liked BOOLEAN,
    user_name VARCHAR(200),
    category_name VARCHAR(100),
    comments JSON
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pd.id,
        pd.filename,
        pd.optimized_filename,
        pd.caption,
        pd.is_featured,
        pd.upload_date,
        pd.like_count,
        pd.comment_count,
        CASE WHEN user_uuid IS NOT NULL AND pl.id IS NOT NULL THEN true ELSE false END as user_has_liked,
        pd.full_name,
        pd.category_name,
        COALESCE(
            (SELECT json_agg(
                json_build_object(
                    'id', pc.id,
                    'comment', pc.comment,
                    'created_at', pc.created_at,
                    'user_name', u.first_name || ' ' || u.last_name
                )
            )
            FROM photo_comments pc
            JOIN users u ON pc.user_id = u.id
            WHERE pc.photo_id = photo_uuid 
            AND pc.is_approved = true
            ORDER BY pc.created_at ASC
            ), '[]'::json
        ) as comments
    FROM photo_details pd
    LEFT JOIN photo_likes pl ON pd.id = pl.photo_id AND pl.user_id = user_uuid
    WHERE pd.id = photo_uuid
    AND pd.is_approved = true;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- Photo System v6 is now ready with:
-- ✅ Photo categories for organization
-- ✅ Background optimization tracking
-- ✅ Enhanced photo metadata
-- ✅ Like system (user-friendly)
-- ✅ Performance indexes
-- ✅ Common query functions
-- ✅ Seeded categories
-- ========================================
