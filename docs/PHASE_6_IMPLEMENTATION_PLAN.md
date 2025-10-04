# Phase 6: Photo System - Technical Implementation Plan

## 📋 Implementation Overview
**Based on:** PHASE_6_PRD.md  
**Timeline:** 4 weeks  
**Priority:** High  
**Dependencies:** Authentication system, Database schema  

---

## 🎯 Implementation Phases

### **Phase 6A: Foundation & Database (Week 1)**

#### **Database Schema Updates**
```sql
-- Add photo categories table
CREATE TABLE photo_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Update photos table with categories
ALTER TABLE photos ADD COLUMN category_id UUID REFERENCES photo_categories(id);
ALTER TABLE photos ADD COLUMN is_featured BOOLEAN DEFAULT false;
ALTER TABLE photos ADD COLUMN display_order INTEGER DEFAULT 0;

-- Rename photo_upvotes to photo_likes for better UX
ALTER TABLE photo_upvotes RENAME TO photo_likes;

-- Add indexes for performance
CREATE INDEX idx_photos_category ON photos(category_id);
CREATE INDEX idx_photos_featured ON photos(is_featured);
CREATE INDEX idx_photos_display_order ON photos(display_order);
CREATE INDEX idx_photo_likes_photo ON photo_likes(photo_id);
CREATE INDEX idx_photo_likes_user ON photo_likes(user_id);
```

#### **Seed Initial Categories**
```sql
INSERT INTO photo_categories (name, slug, description, display_order) VALUES
('Engagement', 'engagement', 'Professional and candid engagement moments', 1),
('Relationship Timeline', 'timeline', 'Photos from throughout their relationship', 2),
('Childhood', 'childhood', 'Early photos of Patricia and James', 3),
('Family', 'family', 'Extended family moments', 4),
('Adventures', 'adventures', 'Travel and experiences together', 5),
('Wedding Prep', 'prep', 'Behind-the-scenes wedding preparation', 6),
('Wedding Day', 'wedding', 'Ceremony and reception photos', 7),
('Guest Memories', 'memories', 'Photos with the couple from over the years', 8);
```

#### **Backend API Foundation**
- [ ] Create photo categories API endpoints
- [ ] Update photos API with category support
- [ ] Implement file upload with category assignment
- [ ] Add photo metadata extraction
- [ ] Create photo seeding scripts

---

### **Phase 6B: Core Photo System (Week 2)**

#### **Enhanced Photo Upload**
```javascript
// Photo upload with categories and metadata
const uploadPhoto = async (file, categoryId, caption, metadata) => {
  const formData = new FormData();
  formData.append('photo', file);
  formData.append('category_id', categoryId);
  formData.append('caption', caption);
  formData.append('metadata', JSON.stringify(metadata));
  
  const response = await fetch('/api/photos', {
    method: 'POST',
    body: formData
  });
  
  return response.json();
};
```

#### **Photo Gallery with Categories**
```javascript
// Category-based photo loading
const loadPhotosByCategory = async (categorySlug, page = 1) => {
  const response = await fetch(`/api/photos/categories/${categorySlug}?page=${page}`);
  return response.json();
};

// Featured photos for homepage
const loadFeaturedPhotos = async () => {
  const response = await fetch('/api/photos/featured');
  return response.json();
};
```

#### **Mobile-First Gallery Interface**
- [ ] Responsive grid layout with masonry
- [ ] Touch-friendly interactions
- [ ] Swipe navigation between photos
- [ ] Pull-to-refresh functionality
- [ ] Infinite scroll loading

#### **Photo Detail Modal**
- [ ] Full-screen photo viewing
- [ ] Zoom and pan functionality
- [ ] Previous/next navigation
- [ ] Like and comment interactions
- [ ] Photo metadata display

---

### **Phase 6C: Social Features (Week 3)**

#### **Like/Heart System**
```javascript
// Like a photo (no "voting" language)
const likePhoto = async (photoId) => {
  const response = await fetch(`/api/photos/${photoId}/likes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  return response.json();
};

// Get photo likes count
const getPhotoLikes = async (photoId) => {
  const response = await fetch(`/api/photos/${photoId}/likes`);
  return response.json();
};
```

#### **Comment System**
```javascript
// Add comment to photo
const addComment = async (photoId, comment) => {
  const response = await fetch(`/api/photos/${photoId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ comment })
  });
  return response.json();
};

// Get photo comments
const getPhotoComments = async (photoId) => {
  const response = await fetch(`/api/photos/${photoId}/comments`);
  return response.json();
};
```

#### **Advanced Filtering & Sorting**
```javascript
// Sort options
const SORT_OPTIONS = {
  NEWEST: 'newest',
  OLDEST: 'oldest',
  MOST_LIKED: 'most_liked',
  MOST_COMMENTED: 'most_commented',
  FEATURED: 'featured'
};

// Filter by category and sort
const loadFilteredPhotos = async (categoryId, sortBy, page = 1) => {
  const params = new URLSearchParams({
    category_id: categoryId,
    sort: sortBy,
    page: page
  });
  
  const response = await fetch(`/api/photos?${params}`);
  return response.json();
};
```

---

### **Phase 6D: Content & Polish (Week 4)**

#### **Photo Seeding System**
```javascript
// Admin script to seed initial photos
const seedPhotos = async () => {
  const categories = await getCategories();
  const photos = await loadPhotoFiles();
  
  for (const photo of photos) {
    const category = categories.find(c => c.slug === photo.category);
    await uploadPhoto(photo.file, category.id, photo.caption, photo.metadata);
  }
};
```

#### **Content Management**
- [ ] Admin interface for photo management
- [ ] Bulk photo upload for initial seeding
- [ ] Photo approval workflow
- [ ] Featured photo selection
- [ ] Category management

#### **Performance Optimization**
- [ ] Image optimization and compression
- [ ] Lazy loading for photo galleries
- [ ] CDN integration for photo serving
- [ ] Caching strategy for API responses
- [ ] Mobile performance optimization

---

## 🛠 Technical Implementation Details

### **Backend API Endpoints**

#### **Photo Categories**
```javascript
// GET /api/categories - Get all active categories
// GET /api/categories/:slug - Get specific category
// POST /api/categories - Create category (admin only)
// PUT /api/categories/:id - Update category (admin only)
// DELETE /api/categories/:id - Delete category (admin only)
```

#### **Photos**
```javascript
// GET /api/photos - List photos with filtering
// POST /api/photos - Upload new photo
// GET /api/photos/:id - Get specific photo
// PUT /api/photos/:id - Update photo (admin only)
// DELETE /api/photos/:id - Delete photo (admin only)
// GET /api/photos/categories/:slug - Get photos by category
// GET /api/photos/featured - Get featured photos
```

#### **Photo Interactions**
```javascript
// GET /api/photos/:id/likes - Get photo likes
// POST /api/photos/:id/likes - Like a photo
// DELETE /api/photos/:id/likes - Unlike a photo
// GET /api/photos/:id/comments - Get photo comments
// POST /api/photos/:id/comments - Add comment
// PUT /api/comments/:id - Update comment
// DELETE /api/comments/:id - Delete comment
```

### **Frontend Components**

#### **Photo Gallery Component**
```javascript
class PhotoGallery {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      category: null,
      sortBy: 'newest',
      pageSize: 20,
      ...options
    };
    this.photos = [];
    this.currentPage = 1;
    this.loading = false;
  }
  
  async loadPhotos() {
    // Implementation for loading photos
  }
  
  render() {
    // Implementation for rendering gallery
  }
}
```

#### **Photo Upload Component**
```javascript
class PhotoUpload {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      multiple: true,
      maxFiles: 10,
      categories: [],
      ...options
    };
  }
  
  async uploadPhotos(files, categoryId, captions) {
    // Implementation for photo upload
  }
}
```

#### **Photo Modal Component**
```javascript
class PhotoModal {
  constructor(photo, options = {}) {
    this.photo = photo;
    this.options = {
      showComments: true,
      showLikes: true,
      allowNavigation: true,
      ...options
    };
  }
  
  show() {
    // Implementation for modal display
  }
}
```

### **Mobile Optimization**

#### **Touch Interactions**
```javascript
// Swipe navigation for photo modal
const setupSwipeNavigation = (modal) => {
  let startX = 0;
  let startY = 0;
  
  modal.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  });
  
  modal.addEventListener('touchend', (e) => {
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const diffX = startX - endX;
    const diffY = startY - endY;
    
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
      if (diffX > 0) {
        // Swipe left - next photo
        modal.nextPhoto();
      } else {
        // Swipe right - previous photo
        modal.previousPhoto();
      }
    }
  });
};
```

#### **Mobile Upload**
```javascript
// Mobile camera integration
const setupMobileUpload = () => {
  const fileInput = document.getElementById('photo-upload');
  
  // Add camera capture attribute for mobile
  fileInput.setAttribute('capture', 'environment');
  fileInput.setAttribute('accept', 'image/*');
  
  fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    handlePhotoUpload(files);
  });
};
```

---

## 📊 Testing Strategy

### **Unit Tests**
```javascript
// Photo API tests
describe('Photo API', () => {
  test('should upload photo successfully', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const response = await uploadPhoto(mockFile, 'engagement', 'Test caption');
    expect(response.success).toBe(true);
  });
  
  test('should like photo successfully', async () => {
    const response = await likePhoto('photo-id');
    expect(response.success).toBe(true);
  });
});
```

### **Integration Tests**
```javascript
// Photo gallery integration tests
describe('Photo Gallery', () => {
  test('should load photos by category', async () => {
    const gallery = new PhotoGallery(container, { category: 'engagement' });
    await gallery.loadPhotos();
    expect(gallery.photos.length).toBeGreaterThan(0);
  });
});
```

### **End-to-End Tests**
```javascript
// Complete user flow tests
describe('Photo Upload Flow', () => {
  test('should upload photo and display in gallery', async () => {
    // Login user
    await login('test@example.com', 'password');
    
    // Navigate to photos page
    await page.goto('/photos');
    
    // Upload photo
    await uploadPhoto('test-image.jpg', 'engagement', 'Test caption');
    
    // Verify photo appears in gallery
    const photo = await page.$('.photo-item');
    expect(photo).toBeTruthy();
  });
});
```

---

## 🚀 Deployment Strategy

### **Development Environment**
- [ ] Local file storage for development
- [ ] Database seeding with test photos
- [ ] Mock photo categories and metadata
- [ ] Development API endpoints

### **Staging Environment**
- [ ] Cloud storage integration
- [ ] Production-like database
- [ ] Real photo upload testing
- [ ] Performance testing

### **Production Environment**
- [ ] CDN integration for photo serving
- [ ] Optimized image processing
- [ ] Monitoring and analytics
- [ ] Backup and recovery procedures

---

## 📈 Success Metrics

### **Technical Metrics**
- [ ] Photo upload success rate > 95%
- [ ] Gallery load time < 2 seconds
- [ ] Mobile performance score > 90
- [ ] API response time < 500ms

### **User Experience Metrics**
- [ ] User engagement rate > 80%
- [ ] Photo upload rate > 60%
- [ ] Mobile usage > 90%
- [ ] User satisfaction score > 4.5/5

### **Content Metrics**
- [ ] Initial photo seeding: 200+ photos
- [ ] Category distribution: 8 categories
- [ ] Featured photos: 20+ highlighted
- [ ] Guest uploads: 100+ photos

---

*This implementation plan will be updated as development progresses and requirements evolve.*
