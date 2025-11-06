// Photo Gallery System - Connected to Backend API
// Displays photos from the database with categories, likes, and comments

class PhotoSystem {
  constructor() {
    this.currentCategory = 'all';
    this.currentPage = 1;
    this.photosPerPage = 50; // Initial load: 50 photos
    this.photosPerScroll = 25; // Load 25 more on scroll
    this.selectedPhotoIndex = 0;
    this.photos = [];
    this.categories = [];
    this.loading = false;
    this.hasMore = true;
    this.isInitialLoad = true;

    this.init();
  }

  async init() {
    console.log('📸 Initializing Photo Gallery...');
    await this.loadCategories();
    this.setupEventListeners();
    await this.loadPhotos();
  }

  async loadCategories() {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();

      if (data.success) {
        this.categories = data.categories;
        console.log(`📸 Loaded ${this.categories.length} categories`);
        this.renderCategoryButtons();
      } else {
        console.error('Failed to load categories:', data.message);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }

  renderCategoryButtons() {
    // Check if category navigation exists in HTML
    const categoryNav = document.querySelector('.category-navigation');
    if (!categoryNav) {
      console.log('📸 Category navigation not found in HTML - skipping');
      return;
    }

    const categoryBtnsContainer = categoryNav.querySelector('.category-nav');
    if (!categoryBtnsContainer) return;

    // Clear existing buttons
    categoryBtnsContainer.innerHTML = '';

    // Add "All" button
    const allBtn = document.createElement('button');
    allBtn.className = 'category-btn active';
    allBtn.setAttribute('data-category', 'all');
    allBtn.textContent = 'All Photos';
    categoryBtnsContainer.appendChild(allBtn);

    // Add category buttons (only active categories)
    this.categories.forEach(category => {
      if (category.is_active) {
        const btn = document.createElement('button');
        btn.className = 'category-btn';
        btn.setAttribute('data-category', category.slug);
        btn.textContent = category.name;
        categoryBtnsContainer.appendChild(btn);
      }
    });

    // Show the category navigation
    categoryNav.style.display = 'block';
  }

  setupEventListeners() {
    // Category navigation (delegated event listener)
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('category-btn')) {
        this.handleCategoryClick(e);
      }
    });

    // Infinite scroll
    window.addEventListener('scroll', () => {
      // Check if user is near bottom of page
      const scrollPosition = window.innerHeight + window.scrollY;
      const pageHeight = document.documentElement.scrollHeight;
      const threshold = 300; // Load more when 300px from bottom

      if (scrollPosition >= pageHeight - threshold) {
        this.loadMorePhotos();
      }
    });

    // Load more button (fallback)
    const loadMoreBtn = document.getElementById('load-more-photos');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => this.loadMorePhotos());
    }
  }

  async loadPhotos(reset = false) {
    if (this.loading) return;

    if (reset) {
      this.currentPage = 1;
      this.photos = [];
      this.hasMore = true;
      this.isInitialLoad = true;
    }

    this.loading = true;
    this.showLoading();

    try {
      // Use 50 for initial load, 25 for subsequent loads
      const limit = this.isInitialLoad ? this.photosPerPage : this.photosPerScroll;
      const offset = this.isInitialLoad ? 0 : this.photos.length;

      const params = new URLSearchParams({
        limit: limit,
        offset: offset,
        sort: 'oldest'
      });

      if (this.currentCategory && this.currentCategory !== 'all') {
        params.append('category', this.currentCategory);
      }

      const response = await fetch(`/api/photos?${params}`);
      const data = await response.json();

      if (data.success) {
        if (reset) {
          this.photos = data.photos;
        } else {
          this.photos = [...this.photos, ...data.photos];
        }

        this.hasMore = data.pagination.hasMore;
        this.isInitialLoad = false; // After first load, all subsequent loads are scroll loads

        console.log(`📸 Loaded ${data.photos.length} photos (Total: ${this.photos.length})`);

        this.renderPhotos();
        this.updateLoadMoreButton();
      } else {
        console.error('Failed to load photos:', data.message);
        this.showError('Failed to load photos');
      }
    } catch (error) {
      console.error('Error loading photos:', error);
      this.showError('Error loading photos. Please try again.');
    } finally {
      this.loading = false;
      this.hideLoading();
    }
  }

  handleCategoryClick(e) {
    e.preventDefault();
    const category = e.target.getAttribute('data-category');

    // Update active button
    document.querySelectorAll('.category-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    e.target.classList.add('active');

    // Load photos for this category
    this.currentCategory = category;
    this.loadPhotos(true);
  }

  showLoading() {
    const gallery = document.getElementById('photo-gallery');
    if (!gallery) return;

    if (this.photos.length === 0) {
      gallery.innerHTML = '<div class="loading-spinner">Loading photos...</div>';
    }
  }

  hideLoading() {
    const spinner = document.querySelector('.loading-spinner');
    if (spinner) {
      spinner.remove();
    }
  }

  showError(message) {
    const gallery = document.getElementById('photo-gallery');
    if (!gallery) return;

    gallery.innerHTML = `<div class="error-message">${message}</div>`;
  }

  renderPhotos() {
    const gallery = document.getElementById('photo-gallery');
    if (!gallery) {
      console.error('Photo gallery element not found');
      return;
    }

    // Clear gallery if this is the first page
    if (this.currentPage === 1) {
      gallery.innerHTML = '';
    }

    if (this.photos.length === 0) {
      gallery.innerHTML = '<div class="no-photos-message">No photos available yet. Check back soon!</div>';
      return;
    }

    console.log(`📸 Rendering ${this.photos.length} photos`);

    // Create photo elements
    this.photos.forEach((photo, index) => {
      // Skip if this photo is already rendered
      if (gallery.querySelector(`[data-photo-id="${photo.id}"]`)) {
        return;
      }

      const photoElement = this.createPhotoElement(photo, index);
      gallery.appendChild(photoElement);
    });
  }

  createPhotoElement(photo, index) {
    const photoDiv = document.createElement('div');
    photoDiv.className = 'photo-item';
    photoDiv.dataset.photoId = photo.id;
    photoDiv.dataset.photoIndex = index;

    // Use thumbnail for gallery grid (small, fast loading)
    const imageUrl = `/api/photos/uploads/${photo.thumbnail_filename || photo.optimized_filename || photo.filename}`;

    photoDiv.innerHTML = `
      <img src="${imageUrl}" alt="${photo.caption || 'Wedding photo'}" loading="lazy" class="photo-image">
      <div class="photo-overlay">
        <div class="photo-caption">${photo.caption || ''}</div>
        <div class="photo-meta">
          ${photo.upload_source === 'website' ? `<span class="photo-uploader">by ${photo.full_name || 'Anonymous'}</span>` : ''}
          ${photo.like_count > 0 ? `<span class="photo-likes">❤️ ${photo.like_count}</span>` : ''}
          ${photo.comment_count > 0 ? `<span class="photo-comments">💬 ${photo.comment_count}</span>` : ''}
        </div>
      </div>
    `;

    // Add click event to open lightbox
    photoDiv.addEventListener('click', () => {
      this.openLightbox(index);
    });

    return photoDiv;
  }

  openLightbox(index) {
    this.selectedPhotoIndex = index;
    const photo = this.photos[index];

    // Create lightbox if it doesn't exist
    let lightbox = document.getElementById('photo-lightbox');
    if (!lightbox) {
      lightbox = this.createLightbox();
      document.body.appendChild(lightbox);
    }

    // Update lightbox content
    const imageUrl = `/api/photos/uploads/${photo.optimized_filename || photo.filename}`;
    lightbox.querySelector('.lightbox-image').src = imageUrl;
    lightbox.querySelector('.lightbox-caption').textContent = photo.caption || '';
    lightbox.querySelector('.lightbox-counter').textContent = `${index + 1} / ${this.photos.length}`;

    // Update uploader info (only show for website uploads)
    const uploaderInfo = lightbox.querySelector('.lightbox-uploader');
    if (uploaderInfo) {
      if (photo.upload_source === 'website') {
        uploaderInfo.textContent = `Uploaded by ${photo.full_name || 'Anonymous'}`;
        uploaderInfo.style.display = 'block';
      } else {
        uploaderInfo.style.display = 'none';
      }
    }

    // Show lightbox
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  createLightbox() {
    const lightbox = document.createElement('div');
    lightbox.id = 'photo-lightbox';
    lightbox.className = 'photo-lightbox';

    lightbox.innerHTML = `
      <div class="lightbox-backdrop"></div>
      <div class="lightbox-content">
        <button class="lightbox-close" aria-label="Close">×</button>
        <button class="lightbox-prev" aria-label="Previous">‹</button>
        <button class="lightbox-next" aria-label="Next">›</button>
        <img src="" alt="" class="lightbox-image">
        <div class="lightbox-info">
          <div class="lightbox-caption"></div>
          <div class="lightbox-uploader"></div>
          <div class="lightbox-counter"></div>
        </div>
      </div>
    `;

    // Add event listeners
    lightbox.querySelector('.lightbox-close').addEventListener('click', () => this.closeLightbox());
    lightbox.querySelector('.lightbox-backdrop').addEventListener('click', () => this.closeLightbox());
    lightbox.querySelector('.lightbox-prev').addEventListener('click', () => this.navigateLightbox(-1));
    lightbox.querySelector('.lightbox-next').addEventListener('click', () => this.navigateLightbox(1));

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (lightbox.classList.contains('active')) {
        if (e.key === 'Escape') this.closeLightbox();
        if (e.key === 'ArrowLeft') this.navigateLightbox(-1);
        if (e.key === 'ArrowRight') this.navigateLightbox(1);
      }
    });

    // Touch/swipe navigation for mobile
    let touchStartX = 0;
    let touchEndX = 0;
    const minSwipeDistance = 50; // Minimum distance for a swipe

    const lightboxContent = lightbox.querySelector('.lightbox-content');

    lightboxContent.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    lightboxContent.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    }, { passive: true });

    const handleSwipe = () => {
      const swipeDistance = touchEndX - touchStartX;

      // Swipe left (next photo)
      if (swipeDistance < -minSwipeDistance) {
        this.navigateLightbox(1);
      }

      // Swipe right (previous photo)
      if (swipeDistance > minSwipeDistance) {
        this.navigateLightbox(-1);
      }
    };

    return lightbox;
  }

  closeLightbox() {
    // Scroll to the currently viewed photo before closing
    const currentPhotoElement = document.querySelector(`.photo-item[data-photo-index="${this.selectedPhotoIndex}"]`);
    if (currentPhotoElement) {
      currentPhotoElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    const lightbox = document.getElementById('photo-lightbox');
    if (lightbox) {
      lightbox.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  navigateLightbox(direction) {
    this.selectedPhotoIndex += direction;

    // Wrap around
    if (this.selectedPhotoIndex < 0) {
      this.selectedPhotoIndex = this.photos.length - 1;
    } else if (this.selectedPhotoIndex >= this.photos.length) {
      this.selectedPhotoIndex = 0;
    }

    // Load more photos if we're within 10 photos of the end
    const photosFromEnd = this.photos.length - this.selectedPhotoIndex;
    if (photosFromEnd <= 10 && this.hasMore && !this.loading) {
      this.loadMorePhotos();
    }

    this.openLightbox(this.selectedPhotoIndex);
  }

  loadMorePhotos() {
    if (this.hasMore && !this.loading) {
      this.loadPhotos(false);
    }
  }

  updateLoadMoreButton() {
    const loadMoreBtn = document.getElementById('load-more-photos');
    if (!loadMoreBtn) return;

    // Hide button with infinite scroll (it's now a fallback)
    loadMoreBtn.style.display = 'none';
  }
}

// Initialize photo system when page loads
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('photo-gallery')) {
    window.photoSystem = new PhotoSystem();
  }
});
