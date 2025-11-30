// Admin Dashboard System
// Handles photo management, RSVP viewing, and admin controls

class AdminDashboard {
  constructor() {
    this.currentTab = 'dashboard';
    this.photos = [];
    this.photoFilters = {
      category: 'all',
      status: 'active',
      featured: 'all',
      search: '',
      limit: 50,
      offset: 0
    };
    this.rsvps = [];
    this.rsvpFilters = {
      status: 'all',
      sort: 'name'
    };

    this.init();
  }

  init() {
    // Only initialize if admin page exists (i.e., user is admin)
    if (!document.getElementById('admin')) {
      return;
    }

    console.log('🔧 Initializing Admin Dashboard...');
    this.setupEventListeners();
    this.loadDashboard();
  }

  setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.admin-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabName = e.target.getAttribute('data-tab');
        this.switchTab(tabName);
      });
    });

    // Photo filters
    document.getElementById('admin-photo-category-filter')?.addEventListener('change', (e) => {
      this.photoFilters.category = e.target.value;
      this.photoFilters.offset = 0;
      this.loadPhotos();
    });

    document.getElementById('admin-photo-status-filter')?.addEventListener('change', (e) => {
      this.photoFilters.status = e.target.value;
      this.photoFilters.offset = 0;
      this.loadPhotos();
    });

    document.getElementById('admin-photo-featured-filter')?.addEventListener('change', (e) => {
      this.photoFilters.featured = e.target.value;
      this.photoFilters.offset = 0;
      this.loadPhotos();
    });

    document.getElementById('admin-photo-search')?.addEventListener('input', (e) => {
      this.photoFilters.search = e.target.value;
      this.photoFilters.offset = 0;
      // Debounce search
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => this.loadPhotos(), 500);
    });

    // RSVP filters
    document.getElementById('admin-rsvp-status-filter')?.addEventListener('change', (e) => {
      this.rsvpFilters.status = e.target.value;
      this.loadRSVPs();
    });

    document.getElementById('admin-rsvp-sort')?.addEventListener('change', (e) => {
      this.rsvpFilters.sort = e.target.value;
      this.loadRSVPs();
    });

    // Load more photos
    document.getElementById('admin-load-more-photos')?.addEventListener('click', () => {
      this.photoFilters.offset += this.photoFilters.limit;
      this.loadPhotos(true); // append mode
    });
  }

  switchTab(tabName) {
    this.currentTab = tabName;

    // Update tab buttons
    document.querySelectorAll('.admin-tab').forEach(tab => {
      tab.classList.remove('active');
      if (tab.getAttribute('data-tab') === tabName) {
        tab.classList.add('active');
      }
    });

    // Update tab content
    document.querySelectorAll('.admin-tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`admin-${tabName}`)?.classList.add('active');

    // Load data for the tab
    switch (tabName) {
      case 'dashboard':
        this.loadDashboard();
        break;
      case 'photos':
        this.loadPhotoCategories();
        this.loadPhotos();
        break;
      case 'rsvps':
        this.loadRSVPs();
        break;
    }
  }

  async loadDashboard() {
    try {
      const response = await fetch('/api/admin/stats', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to load dashboard stats');
      }

      const data = await response.json();
      const { stats } = data;

      // Update stat cards
      document.getElementById('stat-total-photos').textContent = stats.photos.total_photos || '0';
      document.getElementById('stat-featured-photos').textContent = stats.photos.featured_photos || '0';
      document.getElementById('stat-attending').textContent = stats.rsvps.attending || '0';
      document.getElementById('stat-pending').textContent = stats.rsvps.pending || '0';

      // Show recent photos
      this.renderRecentPhotos(stats.recent_photos || []);

    } catch (error) {
      console.error('Error loading dashboard:', error);
      this.showError('Failed to load dashboard statistics');
    }
  }

  renderRecentPhotos(photos) {
    const container = document.getElementById('recent-photos-list');
    if (!container) return;

    if (photos.length === 0) {
      container.innerHTML = '<p class="text-center" style="color: var(--gray-600);">No recent uploads</p>';
      return;
    }

    container.innerHTML = photos.map(photo => {
      const imageUrl = `/api/photos/uploads/${photo.thumbnail_filename || photo.filename}`;
      const isDeleted = photo.deleted_at !== null;

      return `
        <div class="admin-photo-item ${isDeleted ? 'deleted' : ''}">
          <img src="${imageUrl}" alt="${photo.category_name}">
          <div class="admin-photo-info">
            <div class="photo-uploader">${photo.uploader_name}</div>
            <div class="photo-category">${photo.category_name}</div>
            <div class="photo-date">${this.formatDate(photo.upload_date)}</div>
            ${photo.is_featured ? '<span class="badge badge-featured">⭐ Featured</span>' : ''}
            ${isDeleted ? '<span class="badge badge-deleted">🗑️ Deleted</span>' : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  async loadPhotoCategories() {
    try {
      const response = await fetch('/api/categories', {
        credentials: 'include'
      });

      const data = await response.json();
      if (data.success) {
        const select = document.getElementById('admin-photo-category-filter');
        if (select) {
          // Keep "All Categories" option
          const currentOptions = select.innerHTML;
          select.innerHTML = '<option value="all">All Categories</option>';

          data.categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.slug;
            option.textContent = cat.name;
            select.appendChild(option);
          });
        }
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }

  async loadPhotos(append = false) {
    try {
      const params = new URLSearchParams({
        category: this.photoFilters.category,
        deleted: this.photoFilters.status === 'active' ? 'false' : this.photoFilters.status === 'deleted' ? 'true' : 'all',
        featured: this.photoFilters.featured,
        search: this.photoFilters.search,
        limit: this.photoFilters.limit,
        offset: this.photoFilters.offset,
        sort: 'newest'
      });

      const response = await fetch(`/api/admin/photos?${params}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to load photos');
      }

      const data = await response.json();

      if (append) {
        this.photos = [...this.photos, ...data.photos];
      } else {
        this.photos = data.photos;
      }

      this.renderPhotos();

      // Show/hide load more button
      const loadMoreBtn = document.getElementById('admin-load-more-photos');
      if (loadMoreBtn) {
        loadMoreBtn.style.display = (this.photoFilters.offset + this.photoFilters.limit < data.total) ? 'inline-block' : 'none';
      }

    } catch (error) {
      console.error('Error loading photos:', error);
      this.showError('Failed to load photos');
    }
  }

  renderPhotos() {
    const container = document.getElementById('admin-photos-list');
    if (!container) return;

    if (this.photos.length === 0) {
      container.innerHTML = '<p class="text-center" style="color: var(--gray-600);">No photos found</p>';
      return;
    }

    container.innerHTML = this.photos.map(photo => {
      const imageUrl = `/api/photos/uploads/${photo.thumbnail_filename || photo.filename}`;
      const isDeleted = photo.deleted_at !== null;

      return `
        <div class="admin-photo-item ${isDeleted ? 'deleted' : ''}" data-photo-id="${photo.id}">
          <img src="${imageUrl}" alt="${photo.caption || 'Photo'}">
          <div class="admin-photo-info">
            <div class="photo-uploader"><strong>${photo.uploader_name}</strong></div>
            <div class="photo-category">${photo.category_name}</div>
            ${photo.caption ? `<div class="photo-caption">${photo.caption}</div>` : ''}
            <div class="photo-stats">
              ${photo.like_count > 0 ? `❤️ ${photo.like_count}` : ''}
              ${photo.comment_count > 0 ? `💬 ${photo.comment_count}` : ''}
            </div>
            <div class="photo-date">${this.formatDate(photo.upload_date)}</div>
          </div>
          <div class="admin-photo-actions">
            ${!isDeleted ? `
              <button class="btn-icon ${photo.is_featured ? 'active' : ''}" onclick="adminDashboard.toggleFeatured('${photo.id}', ${!photo.is_featured})" title="${photo.is_featured ? 'Remove from Featured' : 'Mark as Featured'}">
                ⭐
              </button>
              <button class="btn-icon" onclick="adminDashboard.viewPhoto('${photo.id}')" title="View Full Size">
                👁️
              </button>
              <button class="btn-icon danger" onclick="adminDashboard.deletePhoto('${photo.id}', false)" title="Hide Photo (Soft Delete)">
                🗑️
              </button>
              <button class="btn-icon danger" onclick="adminDashboard.deletePhoto('${photo.id}', true)" title="Delete Permanently">
                ❌
              </button>
            ` : `
              <span class="badge badge-deleted">Deleted</span>
              <button class="btn-icon success" onclick="adminDashboard.restorePhoto('${photo.id}')" title="Restore Photo">
                ↩️
              </button>
              <button class="btn-icon danger" onclick="adminDashboard.deletePhoto('${photo.id}', true)" title="Delete Permanently">
                ❌
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');
  }

  async toggleFeatured(photoId, featured) {
    try {
      const response = await fetch(`/api/admin/photos/${photoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_featured: featured })
      });

      if (!response.ok) {
        throw new Error('Failed to update photo');
      }

      const data = await response.json();
      console.log(data.message);

      // Update local photo data
      const photo = this.photos.find(p => p.id === photoId);
      if (photo) {
        photo.is_featured = featured;
      }

      // Re-render
      this.renderPhotos();

    } catch (error) {
      console.error('Error toggling featured:', error);
      alert('Failed to update photo');
    }
  }

  viewPhoto(photoId) {
    const photo = this.photos.find(p => p.id === photoId);
    if (!photo) return;

    const imageUrl = `/api/photos/uploads/${photo.optimized_filename || photo.filename}`;
    window.open(imageUrl, '_blank');
  }

  async deletePhoto(photoId, permanent = false) {
    const confirmMsg = permanent
      ? 'Are you sure you want to PERMANENTLY delete this photo? This cannot be undone!'
      : 'Hide this photo from guests? You can restore it later.';

    if (!confirm(confirmMsg)) return;

    try {
      const response = await fetch(`/api/admin/photos/${photoId}?permanent=${permanent}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to delete photo');
      }

      const data = await response.json();
      console.log(data.message);

      if (permanent) {
        // Remove from local array
        this.photos = this.photos.filter(p => p.id !== photoId);
      } else {
        // Mark as deleted
        const photo = this.photos.find(p => p.id === photoId);
        if (photo) {
          photo.deleted_at = new Date().toISOString();
        }
      }

      // Re-render
      this.renderPhotos();

    } catch (error) {
      console.error('Error deleting photo:', error);
      alert('Failed to delete photo');
    }
  }

  async restorePhoto(photoId) {
    try {
      const response = await fetch(`/api/admin/photos/${photoId}/restore`, {
        method: 'PUT',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to restore photo');
      }

      const data = await response.json();
      console.log(data.message);

      // Update local photo data
      const photo = this.photos.find(p => p.id === photoId);
      if (photo) {
        photo.deleted_at = null;
      }

      // Re-render
      this.renderPhotos();

    } catch (error) {
      console.error('Error restoring photo:', error);
      alert('Failed to restore photo');
    }
  }

  async loadRSVPs() {
    try {
      const params = new URLSearchParams({
        status: this.rsvpFilters.status,
        sort: this.rsvpFilters.sort,
        limit: 200
      });

      const response = await fetch(`/api/admin/rsvps?${params}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to load RSVPs');
      }

      const data = await response.json();
      this.rsvps = data.rsvps;

      // Update summary
      this.updateRSVPSummary(data.stats);

      // Render RSVPs
      this.renderRSVPs();

    } catch (error) {
      console.error('Error loading RSVPs:', error);
      this.showError('Failed to load RSVPs');
    }
  }

  updateRSVPSummary(stats) {
    const summaryElement = document.getElementById('rsvp-summary-text');
    if (!summaryElement) return;

    summaryElement.innerHTML = `
      <strong>Total:</strong> ${stats.total_users} guests &nbsp;|&nbsp;
      <strong>Attending:</strong> ${stats.attending_count} &nbsp;|&nbsp;
      <strong>Not Attending:</strong> ${stats.not_attending_count} &nbsp;|&nbsp;
      <strong>Pending:</strong> ${stats.pending_count}
    `;
  }

  renderRSVPs() {
    const tbody = document.getElementById('admin-rsvps-tbody');
    if (!tbody) return;

    if (this.rsvps.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--gray-600);">No RSVPs found</td></tr>';
      return;
    }

    tbody.innerHTML = this.rsvps.map(rsvp => {
      const statusBadge = rsvp.response_status === 'attending'
        ? '<span class="badge badge-success">✓ Attending</span>'
        : rsvp.response_status === 'not_attending'
        ? '<span class="badge badge-danger">✗ Not Attending</span>'
        : '<span class="badge badge-pending">⏳ Pending</span>';

      return `
        <tr>
          <td>
            ${rsvp.full_name}
            ${rsvp.partner_name ? `<br><small style="color: var(--gray-600);">+ ${rsvp.partner_name}</small>` : ''}
          </td>
          <td>${rsvp.email}</td>
          <td>${statusBadge}</td>
          <td>${rsvp.dietary_restrictions || '-'}</td>
          <td>${rsvp.message || '-'}</td>
          <td>${rsvp.submitted_at ? this.formatDate(rsvp.submitted_at) : '-'}</td>
        </tr>
      `;
    }).join('');
  }

  formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  showError(message) {
    console.error(message);
    // Could add a toast notification here
  }
}

// Initialize admin dashboard when page loads
let adminDashboard;
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('admin')) {
    adminDashboard = new AdminDashboard();
  }
});
