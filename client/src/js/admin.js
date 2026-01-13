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
    this.users = [];
    this.userFilters = {
      status: 'all',
      has_partner: 'all',
      plus_one: 'all',
      sort: 'name',
      search: '',
      limit: 100,
      offset: 0
    };
    this.selectedUserId = null;
    this.allUsers = []; // For partner dropdown

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

    // User filters
    document.getElementById('admin-user-status-filter')?.addEventListener('change', (e) => {
      this.userFilters.status = e.target.value;
      this.userFilters.offset = 0;
      this.loadUsers();
    });

    document.getElementById('admin-user-partner-filter')?.addEventListener('change', (e) => {
      this.userFilters.has_partner = e.target.value;
      this.userFilters.offset = 0;
      this.loadUsers();
    });

    document.getElementById('admin-user-plusone-filter')?.addEventListener('change', (e) => {
      this.userFilters.plus_one = e.target.value;
      this.userFilters.offset = 0;
      this.loadUsers();
    });

    document.getElementById('admin-user-sort')?.addEventListener('change', (e) => {
      this.userFilters.sort = e.target.value;
      this.userFilters.offset = 0;
      this.loadUsers();
    });

    document.getElementById('admin-user-search')?.addEventListener('input', (e) => {
      this.userFilters.search = e.target.value;
      this.userFilters.offset = 0;
      clearTimeout(this.userSearchTimeout);
      this.userSearchTimeout = setTimeout(() => this.loadUsers(), 500);
    });

    // Add user button
    document.getElementById('add-user-btn')?.addEventListener('click', () => {
      this.openUserModal();
    });

    // Load more users
    document.getElementById('admin-load-more-users')?.addEventListener('click', () => {
      this.userFilters.offset += this.userFilters.limit;
      this.loadUsers(true); // append mode
    });

    // User modal close/cancel
    document.getElementById('close-user-modal')?.addEventListener('click', () => {
      this.closeUserModal();
    });

    document.getElementById('cancel-user-modal')?.addEventListener('click', () => {
      this.closeUserModal();
    });

    document.getElementById('user-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'user-modal') {
        this.closeUserModal();
      }
    });

    // User form submission - using event delegation for both submit and button click
    document.addEventListener('submit', (e) => {
      if (e.target.id === 'user-form') {
        console.log('📝 Form submit event triggered via delegation!');
        e.preventDefault();
        this.handleUserFormSubmit();
      }
    });

    // Also listen for clicks on the save button directly
    document.addEventListener('click', (e) => {
      if (e.target.closest('#user-form .btn-primary[type="submit"]')) {
        console.log('📝 Save button clicked!');
        e.preventDefault();
        this.handleUserFormSubmit();
      }
    });

    console.log('📝 Form submit and button click listeners attached via delegation');

    // Delete confirmation modal
    document.getElementById('close-delete-modal')?.addEventListener('click', () => {
      this.closeDeleteModal();
    });

    document.getElementById('cancel-delete-user')?.addEventListener('click', () => {
      this.closeDeleteModal();
    });

    document.getElementById('confirm-delete-user')?.addEventListener('click', () => {
      this.confirmDeleteUser();
    });

    document.getElementById('delete-user-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'delete-user-modal') {
        this.closeDeleteModal();
      }
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
      case 'users':
        this.loadUsers();
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

  async loadUsers(append = false) {
    try {
      const params = new URLSearchParams({
        status: this.userFilters.status,
        has_partner: this.userFilters.has_partner,
        plus_one: this.userFilters.plus_one,
        search: this.userFilters.search,
        sort: this.userFilters.sort,
        limit: this.userFilters.limit,
        offset: this.userFilters.offset
      });

      const response = await fetch(`/api/admin/users?${params}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to load users');
      }

      const data = await response.json();

      if (append) {
        this.users = [...this.users, ...data.users];
      } else {
        this.users = data.users;
      }

      // Store all users for partner dropdown
      this.allUsers = data.users;

      this.renderUsers();
      this.renderUserStats(data.stats);

      // Show/hide load more button
      const loadMoreBtn = document.getElementById('admin-load-more-users');
      if (loadMoreBtn) {
        loadMoreBtn.style.display = (this.userFilters.offset + this.userFilters.limit < data.total) ? 'inline-block' : 'none';
      }

    } catch (error) {
      console.error('Error loading users:', error);
      this.showError('Failed to load users');
    }
  }

  renderUserStats(stats) {
    document.getElementById('stat-total-users').textContent = stats.total_active || '0';
    document.getElementById('stat-registered-users').textContent = stats.total_registered || '0';
    document.getElementById('stat-partnered-users').textContent = stats.total_with_partner || '0';
    document.getElementById('stat-plus-one-users').textContent = stats.total_plus_one_allowed || '0';
  }

  renderUsers() {
    const tbody = document.getElementById('admin-users-tbody');
    if (!tbody) return;

    if (this.users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: var(--gray-600);">No users found</td></tr>';
      return;
    }

    tbody.innerHTML = this.users.map(user => {
      const statusBadge = user.account_status === 'registered'
        ? '<span class="badge badge-success">Registered</span>'
        : '<span class="badge badge-pending">Guest</span>';

      const rsvpBadge = user.rsvp_status === 'attending'
        ? '<span class="badge badge-success">✓ Attending</span>'
        : user.rsvp_status === 'not_attending'
        ? '<span class="badge badge-danger">✗ Not Attending</span>'
        : '<span class="badge badge-pending">Pending</span>';

      return `
        <tr>
          <td style="font-family: monospace; font-size: 0.75rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <button
                class="btn-icon"
                onclick="adminDashboard.copyToClipboard('${user.id}', this)"
                title="Copy User ID"
                style="padding: 0.25rem; font-size: 0.875rem;">
                📋
              </button>
              <span style="max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${user.id}">
                ${user.id}
              </span>
            </div>
          </td>
          <td>
            ${user.full_name}
          </td>
          <td>${user.email || '-'}</td>
          <td>${user.address || '-'}</td>
          <td>${user.partner_name || '-'}</td>
          <td>${statusBadge}</td>
          <td>${user.plus_one_allowed ? '✓ Yes' : '-'}</td>
          <td>${rsvpBadge}</td>
          <td>
            <button class="btn-icon" onclick="adminDashboard.openUserModal('${user.id}')" title="Edit User">
              ✏️
            </button>
            <button class="btn-icon danger" onclick="adminDashboard.deleteUser('${user.id}')" title="Delete User">
              🗑️
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  async openUserModal(userId = null) {
    this.selectedUserId = userId;
    const modal = document.getElementById('user-modal');
    const form = document.getElementById('user-form');
    const title = document.getElementById('user-modal-title');

    // Load all users for partner dropdown (exclude current user if editing)
    await this.loadPartnerOptions(userId);

    if (userId) {
      // Edit mode - load user data
      title.textContent = 'Edit User';
      try {
        const response = await fetch(`/api/admin/users/${userId}`, {
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to load user');
        }

        const data = await response.json();
        const user = data.user;

        // Populate form
        document.getElementById('user-id').value = user.id;
        document.getElementById('user-first-name').value = user.first_name;
        document.getElementById('user-last-name').value = user.last_name;
        document.getElementById('user-email').value = user.email || '';
        document.getElementById('user-address').value = user.address || '';
        document.getElementById('user-partner').value = user.partner_id || '';
        document.getElementById('user-account-status').value = user.account_status;
        document.getElementById('user-plus-one').checked = user.plus_one_allowed;

      } catch (error) {
        console.error('Error loading user:', error);
        alert('Failed to load user data');
        return;
      }
    } else {
      // Add mode - clear form
      title.textContent = 'Add New User';
      form.reset();
      document.getElementById('user-id').value = '';
    }

    modal.style.display = 'block';
    // Scroll modal to top
    modal.scrollTop = 0;
    // Scroll page to top to ensure modal is visible
    window.scrollTo(0, 0);
  }

  closeUserModal() {
    const modal = document.getElementById('user-modal');
    modal.style.display = 'none';
    document.getElementById('user-form').reset();
    this.selectedUserId = null;
  }

  async loadPartnerOptions(excludeUserId = null) {
    const select = document.getElementById('user-partner');
    if (!select) return;

    try {
      const response = await fetch('/api/admin/users?limit=500&sort=name', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to load users for partner dropdown');
      }

      const data = await response.json();

      // Clear and rebuild options
      select.innerHTML = '<option value="">No Partner</option>';

      data.users.forEach(user => {
        // Exclude the current user being edited (prevent self-partnering)
        if (excludeUserId && user.id === excludeUserId) {
          return;
        }

        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = user.full_name;
        select.appendChild(option);
      });

    } catch (error) {
      console.error('Error loading partner options:', error);
    }
  }

  async handleUserFormSubmit() {
    console.log('📝 Form submission started');

    const userId = document.getElementById('user-id').value;
    const formData = {
      first_name: document.getElementById('user-first-name').value.trim(),
      last_name: document.getElementById('user-last-name').value.trim(),
      email: document.getElementById('user-email').value.trim() || null,
      address: document.getElementById('user-address').value.trim() || null,
      partner_id: document.getElementById('user-partner').value || null,
      account_status: document.getElementById('user-account-status').value,
      plus_one_allowed: document.getElementById('user-plus-one').checked
    };

    console.log('📝 Form data:', formData);
    console.log('📝 User ID:', userId);

    // Validate required fields
    if (!formData.first_name || !formData.last_name) {
      alert('First name and last name are required');
      return;
    }

    try {
      const url = userId ? `/api/admin/users/${userId}` : '/api/admin/users';
      const method = userId ? 'PUT' : 'POST';

      console.log(`📝 Sending ${method} request to ${url}`);

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      console.log('📝 Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('📝 Error response:', errorData);
        throw new Error(errorData.error || 'Failed to save user');
      }

      const data = await response.json();
      console.log('📝 Success:', data.message);

      // Close modal and reload users
      this.closeUserModal();
      this.userFilters.offset = 0;
      this.loadUsers();

    } catch (error) {
      console.error('📝 Error saving user:', error);
      alert(error.message || 'Failed to save user');
    }
  }

  deleteUser(userId) {
    this.selectedUserId = userId;
    const modal = document.getElementById('delete-user-modal');
    modal.style.display = 'block';
    // Scroll modal to top
    modal.scrollTop = 0;
    // Scroll page to top to ensure modal is visible
    window.scrollTo(0, 0);
  }

  closeDeleteModal() {
    const modal = document.getElementById('delete-user-modal');
    modal.style.display = 'none';
    this.selectedUserId = null;
  }

  async confirmDeleteUser() {
    if (!this.selectedUserId) return;

    try {
      const response = await fetch(`/api/admin/users/${this.selectedUserId}?permanent=false`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      const data = await response.json();
      console.log(data.message);

      // Close modal and reload users
      this.closeDeleteModal();
      this.userFilters.offset = 0;
      this.loadUsers();

    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
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

  copyToClipboard(text, buttonElement) {
    navigator.clipboard.writeText(text).then(() => {
      // Visual feedback: change icon temporarily
      const originalText = buttonElement.textContent;
      buttonElement.textContent = '✓';
      buttonElement.style.color = '#10b981'; // green

      setTimeout(() => {
        buttonElement.textContent = originalText;
        buttonElement.style.color = '';
      }, 1500);
    }).catch(err => {
      console.error('Failed to copy:', err);
      alert('Failed to copy to clipboard');
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
