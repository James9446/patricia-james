/**
 * RSVP Form Functionality
 * Handles RSVP submission for logged-in users
 */

class RSVPManager {
  constructor() {
    this.currentGuest = null;
    this.currentUser = null;
    this.apiBaseUrl = '/api';
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadUserData();
  }

  bindEvents() {
    // RSVP form submission
    const rsvpForm = document.getElementById('rsvp-form');
    if (rsvpForm) {
      rsvpForm.addEventListener('submit', (e) => this.submitRSVP(e));
    }
  }

  async loadUserData() {
    try {
      // In a real implementation, this would get the current user from authentication
      // For now, we'll simulate getting the current user
      this.currentUser = await this.getCurrentUser();
      
      if (this.currentUser) {
        await this.loadGuestData();
      } else {
        this.showStatus('Please log in to access the RSVP page', 'error');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      this.showStatus('Error loading your information. Please try again.', 'error');
    }
  }

  async getCurrentUser() {
    // Get the current authenticated user from the auth system
    if (window.authSystem && window.authSystem.isAuthenticated && window.authSystem.currentUser) {
      return window.authSystem.currentUser;
    }
    
    // If not authenticated, redirect to login
    if (window.authSystem) {
      window.authSystem.showLoginModal('rsvp');
      return null;
    }
    
    throw new Error('Authentication system not available');
  }

  async loadGuestData() {
    try {
      this.showStatus('Loading your invitation details...', 'info');
      
      // Get current user first
      this.currentUser = await this.getCurrentUser();
      if (!this.currentUser) {
        return; // User will be redirected to login
      }
      
      const response = await fetch(`${this.apiBaseUrl}/guests`);
      const data = await response.json();

      if (data.success) {
        // Find guest by the user's guest_id
        const guest = data.data.find(g => g.id === this.currentUser.guest_id);
        
        if (guest) {
          this.currentGuest = guest;
          this.populateGuestInfo(guest);
          this.hideStatus();
        } else {
          this.showStatus('No invitation found for your account. Please contact us.', 'error');
        }
      } else {
        throw new Error(data.message || 'Failed to load guest data');
      }
    } catch (error) {
      console.error('Guest data loading error:', error);
      this.showStatus('Error loading your invitation details. Please try again.', 'error');
    }
  }

  showStatus(message, type = 'info') {
    const statusDiv = document.getElementById('rsvp-status');
    const statusText = document.getElementById('status-text');
    
    if (statusDiv && statusText) {
      statusText.textContent = message;
      statusDiv.className = `rsvp-status status-${type}`;
      statusDiv.classList.remove('hidden');
      
      // Auto-hide success messages after 5 seconds
      if (type === 'success') {
        setTimeout(() => {
          statusDiv.classList.add('hidden');
        }, 5000);
      }
    }
  }

  hideStatus() {
    const statusDiv = document.getElementById('rsvp-status');
    if (statusDiv) {
      statusDiv.classList.add('hidden');
    }
  }


  populateGuestInfo(guest) {
    const guestName = document.getElementById('guest-name');
    const guestEmailDisplay = document.getElementById('guest-email-display');
    const guestPartySize = document.getElementById('guest-party-size');
    const partySizeSelect = document.getElementById('party_size');

    if (guestName) {
      guestName.textContent = `${guest.first_name} ${guest.last_name}`;
    }

    if (guestEmailDisplay) {
      guestEmailDisplay.textContent = guest.email;
    }

            if (guestPartySize) {
              // Calculate party size based on plus-one allowance
              const partySize = guest.plus_one_allowed ? 2 : 1;
              guestPartySize.textContent = partySize;
            }

    // Set max party size based on guest's plus-one allowance
    if (partySizeSelect) {
      const maxSize = guest.plus_one_allowed ? 2 : 1;
      partySizeSelect.innerHTML = '<option value="">Select number of guests</option>';
      
      for (let i = 1; i <= maxSize; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i === 1 ? '1 Guest' : `${i} Guests`;
        partySizeSelect.appendChild(option);
      }
    }
  }

  async submitRSVP(event) {
    event.preventDefault();
    
    if (!this.currentGuest) {
      this.showStatus('Please lookup your invitation first', 'error');
      return;
    }

    const formData = new FormData(event.target);
    const rsvpData = {
      guest_id: this.currentGuest.id,
      user_id: this.currentUser.id,
      response_status: formData.get('response_status'),
      party_size: parseInt(formData.get('party_size')),
      dietary_restrictions: formData.get('dietary_restrictions') || null,
      song_requests: formData.get('song_requests') || null,
      message: formData.get('message') || null
    };

    // Validate required fields
    if (!rsvpData.response_status) {
      this.showStatus('Please select whether you will be attending', 'error');
      return;
    }

    if (!rsvpData.party_size) {
      this.showStatus('Please select the number of guests attending', 'error');
      return;
    }

    // Validate party size
    if (rsvpData.party_size > this.currentGuest.party_size) {
      this.showStatus(`You can only bring up to ${this.currentGuest.party_size} guests`, 'error');
      return;
    }

    try {
      this.showStatus('Submitting your RSVP...', 'info');
      
      const response = await fetch(`${this.apiBaseUrl}/rsvps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(rsvpData)
      });

      const data = await response.json();

      if (data.success) {
        this.showStatus('Thank you! Your RSVP has been submitted successfully.', 'success');
        this.resetForm();
      } else {
        throw new Error(data.message || 'Failed to submit RSVP');
      }
    } catch (error) {
      console.error('RSVP submission error:', error);
      this.showStatus('Sorry, there was an error submitting your RSVP. Please try again.', 'error');
    }
  }

  resetForm() {
    const form = document.getElementById('rsvp-form');
    if (form) {
      form.reset();
    }
  }
}

// Initialize RSVP manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
  // Only initialize on the RSVP page
  if (document.getElementById('rsvp')) {
    new RSVPManager();
  }
});
