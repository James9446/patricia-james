/**
 * RSVP System v5 for Wedding App
 * 
 * Handles RSVP submission for schema v5 (combined table approach).
 * Integrates with the new authentication system and API structure.
 */

class RSVPManagerV5 {
  constructor() {
    this.currentUser = null;
    this.userRsvp = null;
    this.partnerRsvp = null;
    this.apiBaseUrl = '/api';
    this.isInitialized = false;
    
    this.init();
  }

  async init() {
    try {
      console.log('📝 Initializing RSVP Manager v5...');
      
      // Wait for authentication system to be ready
      await this.waitForAuth();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Wait a bit more for auth system to complete its check
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Load user data without showing status messages initially
      await this.loadUserData(true);
      
      this.isInitialized = true;
      console.log('📝 RSVP Manager v5 initialized');
    } catch (error) {
      console.error('RSVP Manager initialization failed:', error);
      this.showStatus('Failed to initialize RSVP system. Please refresh the page.', 'error');
    }
  }

  /**
   * Wait for authentication system to be ready
   */
  async waitForAuth() {
    if (window.authSystem && window.authSystem.isInitialized) {
      return;
    }
    
    return new Promise((resolve) => {
      const checkAuth = () => {
        if (window.authSystem && window.authSystem.isInitialized) {
          resolve();
        } else {
          setTimeout(checkAuth, 100);
        }
      };
      checkAuth();
    });
  }

  /**
   * Set up event listeners for authentication changes
   */
  setupEventListeners() {
    if (window.authSystem) {
      // Listen for authentication changes
      window.authSystem.on('userChanged', (data) => {
        this.handleAuthChange(data);
      });
      
      // Listen for login events
      window.authSystem.on('login', (data) => {
        this.handleLogin(data);
      });
      
      // Listen for logout events
      window.authSystem.on('logout', () => {
        this.handleLogout();
      });
    }
  }

  /**
   * Handle authentication state changes
   */
  handleAuthChange(data) {
    if (data.isAuthenticated && data.user) {
      this.currentUser = data.user;
      this.loadUserData();
    } else {
      this.currentUser = null;
      this.userRsvp = null;
      this.partnerRsvp = null;
      this.showStatus('Please log in to access the RSVP page', 'error');
    }
  }

  /**
   * Handle login events
   */
  handleLogin(data) {
    this.currentUser = data.user;
    this.loadUserData();
  }

  /**
   * Handle logout events
   */
  handleLogout() {
    this.currentUser = null;
    this.userRsvp = null;
    this.partnerRsvp = null;
    this.showStatus('Please log in to access the RSVP page', 'error');
  }

  /**
   * Load user data and RSVP information
   */
  async loadUserData(silent = false) {
    console.log('📝 RSVP Manager: Loading user data...');
    
    // Check authentication status from the auth system
    if (window.authSystem) {
      const authData = window.authSystem.getUserData();
      console.log('📝 RSVP Manager: Auth data:', authData);
      this.currentUser = authData.user;
      
      if (!authData.isAuthenticated || !authData.user) {
        console.log('📝 RSVP Manager: User not authenticated');
        this.showStatus('Please log in to access the RSVP page', 'error');
        return;
      }
    } else {
      console.log('📝 RSVP Manager: Auth system not available');
      this.showStatus('Authentication system not available. Please refresh the page.', 'error');
      return;
    }

    try {
      // Only show loading message if not in silent mode
      if (!silent) {
        this.showStatus('Loading your RSVP information...', 'info');
      }
      
      // Get RSVP data from the new API
      const response = await fetch(`${this.apiBaseUrl}/rsvps`, {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          this.userRsvp = data.data.user_rsvp;
          this.partnerRsvp = data.data.partner_rsvp;
          
          // Populate the form with existing data
          this.populateForm();
          this.hideStatus();
        } else {
          throw new Error(data.message || 'Failed to load RSVP data');
        }
      } else {
        throw new Error('Failed to load RSVP data');
      }
    } catch (error) {
      console.error('Error loading RSVP data:', error);
      this.showStatus('Error loading your RSVP information. Please try again.', 'error');
    }
  }

  /**
   * Populate the RSVP form with user data
   */
  populateForm() {
    // Update user information display
    this.updateUserInfo();
    
    // Populate form fields if RSVP exists
    if (this.userRsvp) {
      this.populateRsvpForm();
    }
  }

  /**
   * Update user information display
   */
  updateUserInfo() {
    if (!this.currentUser) return;

    // Update guest name
    const guestName = document.getElementById('guest-name');
    if (guestName) {
      guestName.textContent = this.currentUser.full_name;
    }

    // Update email display
    const guestEmailDisplay = document.getElementById('guest-email-display');
    if (guestEmailDisplay) {
      guestEmailDisplay.textContent = this.currentUser.email || 'Not provided';
    }

    // Update party size information
    this.updatePartySizeInfo();
  }

  /**
   * Update party size information based on user type
   */
  updatePartySizeInfo() {
    const guestPartySize = document.getElementById('guest-party-size');
    const partySizeSelect = document.getElementById('party_size');

    if (guestPartySize) {
      // Calculate party size based on user type
      let partySize = 1; // Base size
      if (this.currentUser.partner_id) {
        partySize = 2; // Couple
      }
      if (this.currentUser.plus_one_allowed) {
        partySize = Math.max(partySize, 2); // Plus-one allowed
      }
      guestPartySize.textContent = partySize;
    }

    // Update party size select options
    if (partySizeSelect) {
      const maxSize = this.currentUser.plus_one_allowed ? 2 : 1;
      partySizeSelect.innerHTML = '<option value="">Select number of guests</option>';
      
      for (let i = 1; i <= maxSize; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i === 1 ? '1 Guest' : `${i} Guests`;
        partySizeSelect.appendChild(option);
      }
    }
  }

  /**
   * Populate RSVP form with existing data
   */
  populateRsvpForm() {
    if (!this.userRsvp) return;

    // Populate response status
    const responseStatus = document.querySelector('input[name="response_status"][value="' + this.userRsvp.response_status + '"]');
    if (responseStatus) {
      responseStatus.checked = true;
    }

    // Populate dietary restrictions
    const dietaryRestrictions = document.getElementById('dietary_restrictions');
    if (dietaryRestrictions && this.userRsvp.dietary_restrictions) {
      dietaryRestrictions.value = this.userRsvp.dietary_restrictions;
    }

    // Populate message
    const message = document.getElementById('message');
    if (message && this.userRsvp.message) {
      message.value = this.userRsvp.message;
    }

    // Populate party size
    const partySize = document.getElementById('party_size');
    if (partySize) {
      // Calculate party size from RSVP data
      let calculatedSize = 1;
      if (this.userRsvp.response_status === 'attending') {
        calculatedSize = 1; // User attending
        if (this.partnerRsvp && this.partnerRsvp.response_status === 'attending') {
          calculatedSize = 2; // Both attending
        }
      }
      partySize.value = calculatedSize;
    }
  }

  /**
   * Set up form event handlers
   */
  setupFormHandlers() {
    const rsvpForm = document.getElementById('rsvp-form');
    if (rsvpForm) {
      rsvpForm.addEventListener('submit', (e) => this.submitRSVP(e));
    }
  }

  /**
   * Submit RSVP form
   */
  async submitRSVP(event) {
    event.preventDefault();
    
    if (!this.currentUser) {
      this.showStatus('Please log in to submit your RSVP', 'error');
      return;
    }

    const formData = new FormData(event.target);
    const rsvpData = {
      response_status: formData.get('response_status'),
      dietary_restrictions: formData.get('dietary_restrictions') || null,
      message: formData.get('message') || null
    };

    // Validate required fields
    if (!rsvpData.response_status) {
      this.showStatus('Please select whether you will be attending', 'error');
      return;
    }

    // Handle partner RSVP if user has a partner
    if (this.currentUser.partner_id) {
      const partnerResponseStatus = formData.get('partner_response_status');
      if (partnerResponseStatus) {
        rsvpData.partner_response_status = partnerResponseStatus;
        rsvpData.partner_dietary_restrictions = formData.get('partner_dietary_restrictions') || null;
        rsvpData.partner_message = formData.get('partner_message') || null;
      }
    }

    try {
      this.showStatus('Submitting your RSVP...', 'info');
      
      const response = await fetch(`${this.apiBaseUrl}/rsvps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(rsvpData)
      });

      const data = await response.json();

      if (data.success) {
        this.showStatus('Thank you! Your RSVP has been submitted successfully.', 'success');
        
        // Update local state
        this.userRsvp = data.data.user_rsvp;
        this.partnerRsvp = data.data.partner_rsvp;
        
        // Reset form with new data
        this.populateRsvpForm();
      } else {
        throw new Error(data.message || 'Failed to submit RSVP');
      }
    } catch (error) {
      console.error('RSVP submission error:', error);
      this.showStatus('Sorry, there was an error submitting your RSVP. Please try again.', 'error');
    }
  }

  /**
   * Show status message
   */
  showStatus(message, type = 'info') {
    const statusDiv = document.getElementById('rsvp-status');
    const statusText = document.getElementById('status-text');
    
    if (statusDiv && statusText) {
      // Reset display and remove hidden class for smooth transition
      statusDiv.style.display = 'block';
      statusDiv.classList.remove('hidden');
      
      statusText.textContent = message;
      statusDiv.className = `rsvp-status status-${type}`;
      
      // Auto-hide success messages after 5 seconds
      if (type === 'success') {
        setTimeout(() => {
          this.hideStatus();
        }, 5000);
      }
    }
  }

  /**
   * Hide status message with smooth transition
   */
  hideStatus() {
    const statusDiv = document.getElementById('rsvp-status');
    if (statusDiv) {
      statusDiv.classList.add('hidden');
      // Remove from DOM after transition completes
      setTimeout(() => {
        if (statusDiv.classList.contains('hidden')) {
          statusDiv.style.display = 'none';
        }
      }, 300);
    }
  }

  /**
   * Get user type for form customization
   */
  getUserType() {
    if (!this.currentUser) return 'unauthenticated';
    
    if (this.currentUser.partner_id) {
      return 'couple';
    } else if (this.currentUser.plus_one_allowed) {
      return 'individual_with_plus_one';
    } else {
      return 'individual';
    }
  }

  /**
   * Check if user can RSVP for partner
   */
  canRsvpForPartner() {
    return this.currentUser && this.currentUser.partner_id;
  }

  /**
   * Check if user can bring a plus-one
   */
  canBringPlusOne() {
    return this.currentUser && this.currentUser.plus_one_allowed;
  }
}

// Initialize RSVP manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
  // Only initialize on the RSVP page
  if (document.getElementById('rsvp')) {
    // Wait for auth system to be available
    const initRSVP = () => {
      if (window.authSystem) {
        new RSVPManagerV5();
      } else {
        // Wait a bit and try again
        setTimeout(initRSVP, 100);
      }
    };
    
    initRSVP();
  }
});

// Export for use in other scripts
window.RSVPManagerV5 = RSVPManagerV5;
