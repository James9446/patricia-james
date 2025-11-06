# Phase 6: Photo System

## 🎯 Overview

Add a photo gallery system to the wedding website where guests can view curated photos of Patricia and James' relationship journey and share their own wedding memories.

## ✨ Key Features

### Core Functionality
- **Photo Gallery**: Display photos in organized categories
- **Photo Upload**: Guests can upload photos (no size limits)
- **Batch Upload**: Upload multiple photos at once with progress tracking
- **Duplicate Prevention**: Prevent uploading the same photo twice
- **Categories**: Organize photos by type (Engagement, Timeline, etc.)
- **Photo Interactions**: Like and comment on photos
- **Mobile-First**: Touch-friendly interface for phones

### Photo Categories
1. **Engagement** - Proposal and engagement photos
2. **Timeline** - Relationship milestones
3. **Childhood** - Early life photos
4. **Family** - Family gatherings and events
5. **Adventures** - Travel and experiences
6. **Wedding Prep** - Planning and preparation
7. **Wedding Day** - Ceremony and reception
8. **Guest Memories** - Photos shared by guests

## 🛠 Technical Requirements

### Database Schema
```sql
-- Photo categories
CREATE TABLE photo_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Photos table (extends existing)
ALTER TABLE photos ADD COLUMN category_id UUID REFERENCES photo_categories(id);
ALTER TABLE photos ADD COLUMN is_featured BOOLEAN DEFAULT false;
ALTER TABLE photos ADD COLUMN is_optimized BOOLEAN DEFAULT false;
ALTER TABLE photos ADD COLUMN optimized_filename VARCHAR(255);
ALTER TABLE photos ADD COLUMN thumbnail_filename VARCHAR(255);
ALTER TABLE photos ADD COLUMN file_hash VARCHAR(64) UNIQUE; -- For duplicate prevention

-- Photo interactions
CREATE TABLE photo_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(photo_id, user_id)
);

CREATE TABLE photo_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### API Endpoints
- `GET /api/categories` - List all photo categories
- `GET /api/photos` - List photos (with category filtering)
- `POST /api/photos` - Upload single photo
- `POST /api/photos/batch` - Upload multiple photos at once
- `POST /api/photos/:id/like` - Like/unlike photo
- `POST /api/photos/:id/comments` - Add comment
- `GET /api/photos/:id/comments` - Get photo comments

### Frontend Components
- **Photo Gallery**: Grid layout with category filtering
- **Photo Upload**: Drag & drop interface with category selection
- **Batch Upload**: Multi-file selection with progress tracking
- **Photo Modal**: Full-screen photo view with interactions
- **Category Navigation**: Filter photos by category

## 📋 Implementation Tasks

### 1. Database Setup (4 hours)
- [ ] Create photo categories table
- [ ] Update photos table with new columns
- [ ] Create photo_likes and photo_comments tables
- [ ] Seed initial categories
- [ ] Add database indexes for performance

### 2. Photo Upload API (8 hours)
- [ ] Create single photo upload endpoint (no size limits)
- [ ] Create batch photo upload endpoint
- [ ] Add file hash generation for duplicate prevention
- [ ] Implement duplicate detection logic
- [ ] Add category selection to upload
- [ ] Implement background image optimization
- [ ] Add file validation and error handling
- [ ] Create photo metadata extraction

### 3. Photo Gallery API (4 hours)
- [ ] Create photo listing endpoint with pagination
- [ ] Add category filtering
- [ ] Implement photo search functionality
- [ ] Add featured photos support
- [ ] Optimize database queries

### 4. Photo Interactions API (3 hours)
- [ ] Create like/unlike endpoint
- [ ] Add comment system
- [ ] Implement photo interaction counts
- [ ] Add user interaction tracking

### 5. Frontend Gallery (11 hours)
- [ ] Create photo grid component
- [ ] Add category navigation
- [ ] Implement photo modal with interactions
- [ ] Add mobile touch gestures
- [ ] Create single photo upload interface
- [ ] Create batch photo upload interface
- [ ] Add progress tracking for batch uploads
- [ ] Implement retry mechanism for failed uploads

### 6. Photo Seeding (3 hours)
- [ ] Create photo seeding script
- [ ] Add 200+ initial photos across categories
- [ ] Set featured photos
- [ ] Test photo loading performance

## 🎨 Content Strategy

### Initial Photo Seeding
- **Engagement**: 20+ proposal and ring photos
- **Timeline**: 30+ relationship milestone photos
- **Childhood**: 25+ early life photos
- **Family**: 20+ family gathering photos
- **Adventures**: 25+ travel and experience photos
- **Wedding Prep**: 15+ planning photos
- **Wedding Day**: 20+ ceremony and reception photos
- **Guest Memories**: 10+ placeholder photos for guest uploads

### Photo Requirements
- **Formats**: JPEG, PNG, WebP, HEIC (iPhone)
- **Sizes**: No upload limits (optimize after upload)
- **Quality**: Auto-resize to max 2048px, 85% JPEG quality
- **Thumbnails**: Generate 300px thumbnails for gallery

## 🚀 Upload Strategy

### No Size Limits Approach
1. **Accept any size** photo during upload
2. **Store original** file immediately
3. **Background optimization** after upload
4. **Generate thumbnails** for gallery display
5. **Update database** when optimization complete

### Batch Upload with Partial Failure Handling
1. **Process each photo individually** to prevent total failure
2. **Generate file hash** for duplicate detection
3. **Check for existing photos** before upload
4. **Return detailed results** for each photo
5. **Allow retry** for failed uploads

### Duplicate Prevention
1. **Generate SHA-256 hash** of each photo file
2. **Check database** for existing file hash
3. **Prevent duplicate uploads** with user-friendly message
4. **Maintain file integrity** and storage efficiency

### Benefits
- **Better UX**: No "file too large" errors
- **Faster uploads**: Immediate success response
- **Quality preservation**: Keep original files
- **Performance**: Optimized versions for display
- **No duplicates**: Prevent storage waste and confusion
- **Batch efficiency**: Upload multiple photos at once

## 📱 Mobile Experience

### Touch Interactions
- **Swipe navigation** between photos
- **Pinch to zoom** on photo details
- **Pull to refresh** photo gallery
- **Touch-friendly** like and comment buttons

### Responsive Design
- **Mobile-first** grid layout
- **Touch targets** minimum 44px
- **Fast loading** on mobile networks
- **Offline support** for viewed photos

## 🔧 Development Notes

### File Structure
```
server/
├── src/routes/
│   ├── photos.js          # Photo API endpoints
│   └── categories.js      # Category API endpoints
├── scripts/
│   └── seed-photos.js     # Photo seeding script
└── uploads/
    └── photos/            # Photo storage directory

client/src/js/
└── photos.js              # Frontend photo functionality
```

### Dependencies
- **Sharp**: Image processing and optimization
- **Multer**: File upload handling
- **UUID**: Generate unique identifiers
- **GSAP**: Smooth animations (optional)

## ✅ Success Criteria

- [ ] Guests can view photos in organized categories
- [ ] Photo upload works without size restrictions
- [ ] Batch upload works with partial failure handling
- [ ] Duplicate photos are prevented automatically
- [ ] Mobile experience is smooth and intuitive
- [ ] Photo interactions (likes/comments) work
- [ ] Initial content is seeded and ready
- [ ] Performance is fast on mobile devices

---

**Total Estimated Time**: 37 hours (4-5 weeks part-time)
**Priority**: High
**Dependencies**: Authentication system, Database schema
