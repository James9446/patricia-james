// Photo Gallery System - Static Engagement Photos
// Displays engagement photos from the filesystem

class PhotoSystem {
  constructor() {
    this.currentCategory = 'all';
    this.currentPage = 1;
    this.photosPerPage = 12;
    this.selectedPhotoIndex = 0;

    // Static engagement photos list
    this.allPhotos = [
      { id: 1, filename: '01_picnic_only.jpg', category: 'engagement', caption: 'Picnic Setup' },
      { id: 2, filename: '02_picnic_only.jpg', category: 'engagement', caption: 'Picnic Moments' },
      { id: 3, filename: '03_proposal.jpg', category: 'engagement', caption: 'The Proposal' },
      { id: 4, filename: '04_proposal.jpg', category: 'engagement', caption: 'The Proposal' },
      { id: 5, filename: '05_proposal.jpg', category: 'engagement', caption: 'The Proposal' },
      { id: 6, filename: '06_ring.jpg', category: 'engagement', caption: 'The Ring' },
      { id: 7, filename: '07_ring.jpg', category: 'engagement', caption: 'The Ring' },
      { id: 8, filename: '08_champaigne.jpg', category: 'engagement', caption: 'Celebration' },
      { id: 9, filename: '09_ring_champaign_glass.jpg', category: 'engagement', caption: 'Ring and Champagne' },
      { id: 10, filename: '10_A_picnic.jpg', category: 'engagement', caption: 'Picnic Together' },
      { id: 11, filename: '10_B_picnic.jpg', category: 'engagement', caption: 'Picnic Together' },
      { id: 12, filename: '10_C_picnic.jpg', category: 'engagement', caption: 'Picnic Together' },
      { id: 13, filename: '11_engagement.jpg', category: 'engagement', caption: 'Engagement Photos' },
      { id: 14, filename: '12_engagement.jpg', category: 'engagement', caption: 'Engagement Photos' },
      { id: 15, filename: '13_engagement.jpg', category: 'engagement', caption: 'Engagement Photos' },
      { id: 16, filename: '14_engagement.jpg', category: 'engagement', caption: 'Engagement Photos' },
      { id: 17, filename: '15_engagement.jpg', category: 'engagement', caption: 'Engagement Photos' },
      { id: 18, filename: '16__engagement.jpg', category: 'engagement', caption: 'Engagement Photos' },
      { id: 19, filename: '17_engagement.jpg', category: 'engagement', caption: 'Engagement Photos' },
      { id: 20, filename: '18_engagement.jpg', category: 'engagement', caption: 'Engagement Photos' },
      { id: 21, filename: '19_engagement.jpg', category: 'engagement', caption: 'Engagement Photos' },
      { id: 22, filename: '20_engagement.jpg', category: 'engagement', caption: 'Engagement Photos' },
      { id: 23, filename: '21_engagement.jpg', category: 'engagement', caption: 'Engagement Photos' },
      { id: 24, filename: '22_engagement.jpg', category: 'engagement', caption: 'Engagement Photos' },
      { id: 25, filename: '23_engagement.jpg', category: 'engagement', caption: 'Engagement Photos' },
      { id: 26, filename: '24_engagement.jpg', category: 'engagement', caption: 'Engagement Photos' },
      { id: 27, filename: '25_engagement.jpg', category: 'engagement', caption: 'Engagement Photos' }
    ];

    this.init();
  }

  init() {
    console.log('📸 Initializing Photo Gallery...');
    this.setupEventListeners();
    this.renderPhotos();
  }

  setupEventListeners() {
    // Category navigation
    const categoryBtns = document.querySelectorAll('.category-btn');
    categoryBtns.forEach(btn => {
      btn.addEventListener('click', (e) => this.handleCategoryClick(e));
    });

    // Load more button
    const loadMoreBtn = document.getElementById('load-more-photos');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => this.loadMorePhotos());
    }
  }

  getFilteredPhotos() {
    if (this.currentCategory === 'all') {
      return this.allPhotos;
    }
    return this.allPhotos.filter(photo => photo.category === this.currentCategory);
  }

  getCurrentPagePhotos() {
    const filtered = this.getFilteredPhotos();
    const startIndex = 0;
    const endIndex = this.currentPage * this.photosPerPage;
    return filtered.slice(startIndex, endIndex);
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
    this.currentPage = 1;
    this.renderPhotos();
  }

  renderPhotos() {
    const gallery = document.getElementById('photo-gallery');
    if (!gallery) {
      console.error('Photo gallery element not found');
      return;
    }

    // Clear gallery
    gallery.innerHTML = '';

    // Get photos to display
    const photosToDisplay = this.getCurrentPagePhotos();

    console.log(`📸 Rendering ${photosToDisplay.length} photos`);

    // Create photo elements
    photosToDisplay.forEach((photo, index) => {
      const photoElement = this.createPhotoElement(photo, index);
      gallery.appendChild(photoElement);
    });

    // Update load more button
    this.updateLoadMoreButton();
  }

  createPhotoElement(photo, index) {
    const photoDiv = document.createElement('div');
    photoDiv.className = 'photo-item';
    photoDiv.dataset.photoId = photo.id;
    photoDiv.dataset.photoIndex = index;

    // Use optimized photos for faster loading
    const imageUrl = `/images/engagement-photos-optimized/${photo.filename}`;

    photoDiv.innerHTML = `
      <img src="${imageUrl}" alt="${photo.caption}" loading="lazy" class="photo-image">
      <div class="photo-overlay">
        <div class="photo-caption">${photo.caption}</div>
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
    const photos = this.getCurrentPagePhotos();
    const photo = photos[index];

    // Create lightbox if it doesn't exist
    let lightbox = document.getElementById('photo-lightbox');
    if (!lightbox) {
      lightbox = this.createLightbox();
      document.body.appendChild(lightbox);
    }

    // Update lightbox content (use optimized photos)
    const imageUrl = `/images/engagement-photos-optimized/${photo.filename}`;
    lightbox.querySelector('.lightbox-image').src = imageUrl;
    lightbox.querySelector('.lightbox-caption').textContent = photo.caption;
    lightbox.querySelector('.lightbox-counter').textContent = `${index + 1} / ${photos.length}`;

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
        <div class="lightbox-caption"></div>
        <div class="lightbox-counter"></div>
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

    return lightbox;
  }

  closeLightbox() {
    const lightbox = document.getElementById('photo-lightbox');
    if (lightbox) {
      lightbox.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  navigateLightbox(direction) {
    const photos = this.getCurrentPagePhotos();
    this.selectedPhotoIndex += direction;

    // Wrap around
    if (this.selectedPhotoIndex < 0) {
      this.selectedPhotoIndex = photos.length - 1;
    } else if (this.selectedPhotoIndex >= photos.length) {
      this.selectedPhotoIndex = 0;
    }

    this.openLightbox(this.selectedPhotoIndex);
  }

  loadMorePhotos() {
    this.currentPage++;
    this.renderPhotos();
  }

  updateLoadMoreButton() {
    const loadMoreBtn = document.getElementById('load-more-photos');
    if (!loadMoreBtn) return;

    const filtered = this.getFilteredPhotos();
    const currentlyDisplayed = this.currentPage * this.photosPerPage;

    if (currentlyDisplayed >= filtered.length) {
      loadMoreBtn.style.display = 'none';
    } else {
      loadMoreBtn.style.display = 'inline-block';
    }
  }
}

// Initialize photo system when page loads
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('photo-gallery')) {
    window.photoSystem = new PhotoSystem();
  }
});
