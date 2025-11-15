// Photo Gallery System - Connected to Backend API
// Displays photos from the database with categories, likes, and comments

class PhotoSystem {
  constructor() {
    this.currentCategory = 'all';
    this.currentSort = 'oldest'; // Default sort order
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

    // Add category buttons (only active categories with photos)
    this.categories.forEach(category => {
      if (category.is_active && parseInt(category.photo_count) > 0) {
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
        sort: this.currentSort
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
    window.photoUpload = new PhotoUpload(window.photoSystem);
  }
});

// ========================================
// Photo Upload System
// ========================================
class PhotoUpload {
  constructor(photoSystem) {
    this.photoSystem = photoSystem;
    this.selectedFiles = [];
    this.modal = document.getElementById('photo-upload-modal');
    this.fileInput = document.getElementById('photo-upload-input');
    this.dropzone = document.getElementById('upload-dropzone');
    this.previewsContainer = document.getElementById('photo-previews');
    this.categorySelect = document.getElementById('upload-category');
    this.submitButton = document.getElementById('submit-upload');
    this.uploadStatus = document.getElementById('upload-status');

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadCategories();
  }

  setupEventListeners() {
    // Open modal
    document.getElementById('open-upload-modal')?.addEventListener('click', () => {
      this.openModal();
    });

    // Close modal
    this.modal.querySelector('.upload-modal-close')?.addEventListener('click', () => {
      this.closeModal();
    });

    this.modal.querySelector('.upload-modal-backdrop')?.addEventListener('click', () => {
      this.closeModal();
    });

    document.getElementById('cancel-upload')?.addEventListener('click', () => {
      this.closeModal();
    });

    // File selection
    this.dropzone?.addEventListener('click', () => {
      this.fileInput.click();
    });

    this.fileInput?.addEventListener('change', (e) => {
      this.handleFileSelect(e.target.files);
    });

    // Drag and drop
    this.dropzone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dropzone.classList.add('drag-over');
    });

    this.dropzone?.addEventListener('dragleave', () => {
      this.dropzone.classList.remove('drag-over');
    });

    this.dropzone?.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropzone.classList.remove('drag-over');
      this.handleFileSelect(e.dataTransfer.files);
    });

    // Category selection
    this.categorySelect?.addEventListener('change', () => {
      this.updateSubmitButton();
    });

    // Submit upload
    this.submitButton?.addEventListener('click', () => {
      this.uploadPhotos();
    });
  }

  async loadCategories() {
    if (!this.categorySelect) return;

    // Use categories from photoSystem
    // Only allow "Friends & Family" and "Wedding Day" for user uploads
    const allowedCategories = ['friends-family', 'wedding-day'];

    if (this.photoSystem && this.photoSystem.categories) {
      this.categorySelect.innerHTML = '<option value="">Select a category...</option>';

      this.photoSystem.categories.forEach(category => {
        if (category.is_active && allowedCategories.includes(category.slug)) {
          const option = document.createElement('option');
          option.value = category.id;
          option.textContent = category.name;
          this.categorySelect.appendChild(option);
        }
      });
    }
  }

  openModal() {
    this.resetModal();
    this.modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    this.loadCategories(); // Refresh categories when opening
  }

  closeModal() {
    this.modal.classList.remove('active');
    document.body.style.overflow = '';
    this.resetModal();
  }

  resetModal() {
    this.selectedFiles = [];
    this.fileInput.value = '';
    this.previewsContainer.style.display = 'none';
    this.previewsContainer.innerHTML = '';
    this.categorySelect.value = '';
    this.uploadStatus.style.display = 'none';
    this.uploadStatus.innerHTML = '';
    this.hideProgress();
    this.updateSubmitButton();
  }

  async handleFileSelect(files) {
    const fileArray = Array.from(files);

    // Filter for image files only
    const imageFiles = fileArray.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      this.showStatus('Please select image files only', 'error');
      return;
    }

    if (imageFiles.length > 20) {
      this.showStatus('You can upload a maximum of 20 photos at once', 'warning');
      imageFiles.splice(20); // Keep only first 20
    }

    // Show compression message
    this.showStatus('Preparing photos for upload...', 'info');

    // Compress images for faster mobile upload
    const compressedFiles = await Promise.all(
      imageFiles.map(file => this.compressImage(file))
    );

    this.selectedFiles = compressedFiles;
    this.uploadStatus.style.display = 'none'; // Hide compression message
    this.showPreviews();
    this.updateSubmitButton();
  }

  // Compress image for faster mobile upload
  async compressImage(file) {
    // Skip compression for small files (< 500KB)
    if (file.size < 500 * 1024) {
      return file;
    }

    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        const img = new Image();

        img.onload = async () => {
          // Get EXIF orientation first
          const orientation = await this.getImageOrientation(file);

          // Create canvas
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // Calculate new dimensions (max 2048px on longest side)
          let width = img.width;
          let height = img.height;
          const maxDimension = 2048;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height / width) * maxDimension;
              width = maxDimension;
            } else {
              width = (width / height) * maxDimension;
              height = maxDimension;
            }
          }

          // Handle EXIF orientation (swap dimensions if rotated 90/270)
          if (orientation >= 5 && orientation <= 8) {
            // Orientation 5, 6, 7, 8 are rotated 90 or 270 degrees
            canvas.width = height;
            canvas.height = width;
          } else {
            canvas.width = width;
            canvas.height = height;
          }

          // Apply EXIF orientation transforms
          switch (orientation) {
            case 2:
              ctx.transform(-1, 0, 0, 1, width, 0); // Flip horizontal
              break;
            case 3:
              ctx.transform(-1, 0, 0, -1, width, height); // Rotate 180°
              break;
            case 4:
              ctx.transform(1, 0, 0, -1, 0, height); // Flip vertical
              break;
            case 5:
              ctx.transform(0, 1, 1, 0, 0, 0); // Rotate 90° CW and flip
              break;
            case 6:
              ctx.transform(0, 1, -1, 0, height, 0); // Rotate 90° CW
              break;
            case 7:
              ctx.transform(0, -1, -1, 0, height, width); // Rotate 270° CW and flip
              break;
            case 8:
              ctx.transform(0, -1, 1, 0, 0, width); // Rotate 270° CW
              break;
          }

          // Draw image
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to blob with quality compression
          canvas.toBlob(
            (blob) => {
              // Create new file with compressed data
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });

              console.log(`Compressed ${file.name}: ${this.formatFileSize(file.size)} → ${this.formatFileSize(compressedFile.size)}`);
              resolve(compressedFile);
            },
            'image/jpeg',
            0.85 // 85% quality
          );
        };

        img.onerror = () => {
          console.warn(`Failed to compress ${file.name}, using original`);
          resolve(file);
        };

        img.src = e.target.result;
      };

      reader.onerror = () => {
        console.warn(`Failed to read ${file.name}, using original`);
        resolve(file);
      };

      reader.readAsDataURL(file);
    });
  }

  showPreviews() {
    this.previewsContainer.innerHTML = '';
    this.previewsContainer.style.display = 'grid';

    this.selectedFiles.forEach((file, index) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        // Get EXIF orientation
        const orientation = await this.getImageOrientation(file);
        const transform = this.getOrientationTransform(orientation);

        const previewItem = document.createElement('div');
        previewItem.className = 'photo-preview-item';
        previewItem.dataset.index = index;

        previewItem.innerHTML = `
          <img src="${e.target.result}" alt="${file.name}" style="${transform}">
          <button class="photo-preview-remove" data-index="${index}">×</button>
          <div class="photo-preview-info">${this.formatFileSize(file.size)}</div>
        `;

        // Remove button handler
        previewItem.querySelector('.photo-preview-remove').addEventListener('click', (e) => {
          e.stopPropagation();
          this.removeFile(index);
        });

        this.previewsContainer.appendChild(previewItem);
      };

      reader.readAsDataURL(file);
    });
  }

  // Read EXIF orientation from image file
  async getImageOrientation(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const view = new DataView(e.target.result);

        // Check if it's a JPEG
        if (view.getUint16(0, false) !== 0xFFD8) {
          resolve(1); // Not a JPEG, return default orientation
          return;
        }

        const length = view.byteLength;
        let offset = 2;

        while (offset < length) {
          const marker = view.getUint16(offset, false);
          offset += 2;

          // Check for APP1 marker (0xFFE1) which contains EXIF data
          if (marker === 0xFFE1) {
            const exifOffset = offset + 2;

            // Check for "Exif" string
            if (view.getUint32(exifOffset, false) !== 0x45786966) {
              resolve(1);
              return;
            }

            // Get byte alignment (big or little endian)
            const tiffOffset = exifOffset + 6;
            const littleEndian = view.getUint16(tiffOffset, false) === 0x4949;

            // Get offset to first IFD
            const ifdOffset = view.getUint32(tiffOffset + 4, littleEndian);
            const tagCount = view.getUint16(tiffOffset + ifdOffset, littleEndian);

            // Loop through IFD tags to find orientation (tag 0x0112)
            for (let i = 0; i < tagCount; i++) {
              const tagOffset = tiffOffset + ifdOffset + 2 + (i * 12);
              const tag = view.getUint16(tagOffset, littleEndian);

              if (tag === 0x0112) { // Orientation tag
                const orientation = view.getUint16(tagOffset + 8, littleEndian);
                resolve(orientation);
                return;
              }
            }

            resolve(1); // No orientation tag found
            return;
          } else {
            // Skip to next marker
            const segmentLength = view.getUint16(offset, false);
            offset += segmentLength;
          }
        }

        resolve(1); // Default orientation
      };

      reader.onerror = () => resolve(1);
      reader.readAsArrayBuffer(file.slice(0, 64 * 1024)); // Read first 64KB
    });
  }

  // Get CSS transform based on EXIF orientation
  getOrientationTransform(orientation) {
    switch (orientation) {
      case 2:
        return 'transform: scaleX(-1);'; // Flip horizontal
      case 3:
        return 'transform: rotate(180deg);'; // Rotate 180°
      case 4:
        return 'transform: scaleY(-1);'; // Flip vertical
      case 5:
        return 'transform: rotate(90deg) scaleX(-1);'; // Rotate 90° CW and flip
      case 6:
        return 'transform: rotate(90deg);'; // Rotate 90° CW
      case 7:
        return 'transform: rotate(270deg) scaleX(-1);'; // Rotate 270° CW and flip
      case 8:
        return 'transform: rotate(270deg);'; // Rotate 270° CW
      default:
        return ''; // Normal orientation
    }
  }

  removeFile(index) {
    this.selectedFiles.splice(index, 1);

    if (this.selectedFiles.length === 0) {
      this.previewsContainer.style.display = 'none';
      this.previewsContainer.innerHTML = '';
    } else {
      this.showPreviews();
    }

    this.updateSubmitButton();
  }

  updateSubmitButton() {
    const hasFiles = this.selectedFiles.length > 0;
    const hasCategory = this.categorySelect.value !== '';

    this.submitButton.disabled = !(hasFiles && hasCategory);
  }

  showProgress(percent, text) {
    const progressSection = document.getElementById('upload-progress-section');
    const progressFill = document.getElementById('upload-progress-fill');
    const progressText = document.getElementById('upload-progress-text');

    progressSection.style.display = 'block';
    progressFill.style.width = `${percent}%`;
    progressText.textContent = text;
  }

  hideProgress() {
    const progressSection = document.getElementById('upload-progress-section');
    progressSection.style.display = 'none';
  }

  showStatus(message, type = 'success') {
    this.uploadStatus.innerHTML = message;
    this.uploadStatus.className = `upload-status ${type}`;
    this.uploadStatus.style.display = 'block';

    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
      setTimeout(() => {
        this.uploadStatus.style.display = 'none';
      }, 5000);
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  async uploadPhotos() {
    if (this.selectedFiles.length === 0) return;

    const categoryId = this.categorySelect.value;
    if (!categoryId) {
      this.showStatus('Please select a category', 'error');
      return;
    }

    // Get the selected category slug for switching view after upload
    // Category IDs are UUIDs (strings), so compare as strings
    const selectedCategory = this.photoSystem.categories.find(cat => String(cat.id) === String(categoryId));
    const categorySlug = selectedCategory?.slug;

    // Disable submit button during upload
    this.submitButton.disabled = true;
    this.uploadStatus.style.display = 'none';

    try {
      const formData = new FormData();
      formData.append('category_id', categoryId);

      // Add all files to FormData
      this.selectedFiles.forEach((file) => {
        formData.append('photos', file);
      });

      // Show initial progress
      this.showProgress(10, 'Uploading to server...');

      // Upload to server with timeout handling
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

      let response;
      try {
        response = await fetch('/api/photos/batch', {
          method: 'POST',
          body: formData,
          credentials: 'include',
          signal: controller.signal
        });
        clearTimeout(timeout);
      } catch (fetchError) {
        clearTimeout(timeout);
        if (fetchError.name === 'AbortError') {
          throw new Error('Upload timed out. Please check your connection and try again with fewer photos.');
        }
        throw new Error('Network error. Please check your connection and try again.');
      }

      this.showProgress(90, 'Processing photos...');

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Upload failed');
      }

      this.showProgress(100, 'Upload complete!');

      // Show results
      const { results } = data;
      const succeeded = results.summary.succeeded;
      const failed = results.summary.failed;

      let statusMessage = '';
      if (succeeded > 0 && failed === 0) {
        statusMessage = `✓ Successfully uploaded ${succeeded} photo${succeeded > 1 ? 's' : ''}!`;
        this.showStatus(statusMessage, 'success');
      } else if (succeeded > 0 && failed > 0) {
        statusMessage = `Uploaded ${succeeded} photo${succeeded > 1 ? 's' : ''}, but ${failed} failed. `;
        const duplicates = results.failed.filter(f => f.duplicate).length;
        if (duplicates > 0) {
          statusMessage += `${duplicates} ${duplicates > 1 ? 'were' : 'was'} duplicate${duplicates > 1 ? 's' : ''}.`;
        }
        this.showStatus(statusMessage, 'warning');
      } else {
        statusMessage = `Failed to upload photos. ${results.failed[0]?.error || 'Please try again.'}`;
        this.showStatus(statusMessage, 'error');
      }

      // If any photos were uploaded successfully, switch to category and scroll to first photo
      if (succeeded > 0) {
        const firstUploadedPhotoId = results.successful[0]?.id;

        setTimeout(async () => {
          this.closeModal();

          // Switch to the uploaded category
          if (categorySlug) {
            // Manually switch category
            this.photoSystem.currentCategory = categorySlug;

            // Update active category button
            document.querySelectorAll('.category-btn').forEach(btn => {
              btn.classList.remove('active');
              if (btn.getAttribute('data-category') === categorySlug) {
                btn.classList.add('active');
              }
            });

            // Switch to 'newest' sort to ensure uploaded photo is in first batch
            // This prevents issues when there are hundreds of photos in the category
            this.photoSystem.currentSort = 'newest';

            // Load photos for the new category with newest sort
            await this.photoSystem.loadPhotos(true);

            // Scroll to the first uploaded photo
            setTimeout(() => {
              const photoElement = document.querySelector(`[data-photo-id="${firstUploadedPhotoId}"]`);
              if (photoElement) {
                photoElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 800); // Longer delay to ensure gallery is fully rendered
          } else {
            // No category slug, just reload all photos
            await this.photoSystem.loadPhotos(true);
          }

          // Reload categories to update counts and buttons (non-blocking)
          this.photoSystem.loadCategories();
        }, 2000);
      }

    } catch (error) {
      console.error('Upload error:', error);
      this.showStatus(`Upload failed: ${error.message}`, 'error');
      this.hideProgress();
      this.submitButton.disabled = false;
    }
  }
}
