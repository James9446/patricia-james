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
      
      // Wait for auth system to complete its user check
      await this.waitForAuthCheck();
      
      // Additional wait to ensure auth system is fully ready
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Double-check auth status before loading
      if (window.authSystem) {
        const authData = window.authSystem.getUserData();
        console.log('📝 RSVP Manager: Final auth check:', authData);
        if (!authData.isAuthenticated || !authData.user) {
          console.log('📝 RSVP Manager: User not authenticated after wait');
          return;
        }
      }
      
      // Load user data
      await this.loadUserData();
      
      this.isInitialized = true;
      console.log('📝 RSVP Manager v5 initialized');
    } catch (error) {
      console.error('RSVP Manager initialization failed:', error);
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
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds max
      
      const checkAuth = () => {
        attempts++;
        if (window.authSystem && window.authSystem.isInitialized) {
          console.log('📝 RSVP Manager: Auth system ready');
          resolve();
        } else if (attempts >= maxAttempts) {
          console.log('📝 RSVP Manager: Auth system timeout, proceeding anyway');
          resolve();
        } else {
          setTimeout(checkAuth, 100);
        }
      };
      checkAuth();
    });
  }

  /**
   * Wait for authentication system to complete its user check
   */
  async waitForAuthCheck() {
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 100; // 10 seconds max
      
      const checkAuthStatus = () => {
        attempts++;
        if (window.authSystem) {
          const authData = window.authSystem.getUserData();
          // Check if auth system has completed its check (either authenticated or not)
          if (authData.isAuthenticated !== undefined) {
            console.log('📝 RSVP Manager: Auth check completed, user authenticated:', authData.isAuthenticated);
            resolve();
            return;
          }
        }
        
        if (attempts >= maxAttempts) {
          console.log('📝 RSVP Manager: Auth check timeout, proceeding anyway');
          resolve();
        } else {
          setTimeout(checkAuthStatus, 100);
        }
      };
      checkAuthStatus();
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
  }

  /**
   * Load user data and RSVP information
   */
  async loadUserData() {
    console.log('📝 RSVP Manager: Loading user data...');
    
    // Check authentication status from the auth system
    if (window.authSystem) {
      const authData = window.authSystem.getUserData();
      console.log('📝 RSVP Manager: Auth data:', authData);
      this.currentUser = authData.user;
      
      if (!authData.isAuthenticated || !authData.user) {
        console.log('📝 RSVP Manager: User not authenticated');
        return;
      }
    } else {
      console.log('📝 RSVP Manager: Auth system not available');
      return;
    }

    try {
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
        } else {
          throw new Error(data.message || 'Failed to load RSVP data');
        }
      } else {
        throw new Error('Failed to load RSVP data');
      }
    } catch (error) {
      console.error('Error loading RSVP data:', error);
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
      console.log('📝 RSVP Manager: User not authenticated');
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
      console.log('📝 RSVP Manager: No response status selected');
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
      console.log('📝 RSVP Manager: Submitting RSVP...');
      
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
        console.log('📝 RSVP Manager: RSVP submitted successfully');
        
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
    }
  }


  /**
   * Get user type for form customization
   */
  getUserType() {
    if (!this.currentUser) return 'unauthenticated';
    
    // Check if user is admin
    if (this.currentUser.is_admin) {
      return 'admin';
    }
    
    // Check if user has a partner (couple)
    if (this.currentUser.partner_id) {
      return 'couple';
    }
    
    // Check if user can bring a plus-one
    if (this.currentUser.plus_one_allowed) {
      return 'individual_with_plus_one';
    }
    
    // Default individual user
    return 'individual';
  }

  /**
   * Get user type display information
   */
  getUserTypeInfo() {
    const userType = this.getUserType();
    
    const typeInfo = {
      unauthenticated: {
        title: 'Please Log In',
        description: 'You need to log in to access the RSVP page.',
        formType: 'login_required'
      },
      individual: {
        title: 'Your RSVP',
        description: 'Please let us know if you\'ll be attending our wedding.',
        formType: 'individual'
      },
      individual_with_plus_one: {
        title: 'Your RSVP',
        description: 'Please let us know if you\'ll be attending our wedding. You may bring a plus-one.',
        formType: 'individual_with_plus_one'
      },
      couple: {
        title: 'Your RSVP',
        description: 'Please let us know if you and your partner will be attending our wedding.',
        formType: 'couple'
      },
      admin: {
        title: 'Admin RSVP',
        description: 'Admin RSVP interface with additional options.',
        formType: 'admin'
      }
    };
    
    return typeInfo[userType] || typeInfo.unauthenticated;
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

  /**
   * Generate dynamic RSVP form based on user type
   */
  generateDynamicForm() {
    const userTypeInfo = this.getUserTypeInfo();
    const userType = this.getUserType();
    
    console.log('📝 RSVP Manager: Generating form for user type:', userType);
    
    // Update page title and description
    this.updatePageHeader(userTypeInfo);
    
    // Generate form based on user type
    switch (userType) {
      case 'unauthenticated':
        this.generateLoginRequiredForm();
        break;
      case 'individual':
        this.generateIndividualForm();
        break;
      case 'individual_with_plus_one':
        this.generateIndividualWithPlusOneForm();
        break;
      case 'couple':
        this.generateCoupleForm();
        break;
      case 'admin':
        this.generateAdminForm();
        break;
      default:
        this.generateIndividualForm();
    }
  }

  /**
   * Update page header with user-specific information
   */
  updatePageHeader(userTypeInfo) {
    const titleElement = document.querySelector('#rsvp h2');
    const descriptionElement = document.querySelector('#rsvp .rsvp-description');
    
    if (titleElement) {
      titleElement.textContent = userTypeInfo.title;
    }
    
    if (descriptionElement) {
      descriptionElement.textContent = userTypeInfo.description;
    }
  }

  /**
   * Generate form for unauthenticated users
   */
  generateLoginRequiredForm() {
    const formContainer = document.getElementById('rsvp-form');
    if (!formContainer) return;
    
    formContainer.innerHTML = `
      <div class="login-required-message">
        <p>Please log in to access the RSVP page.</p>
        <button class="btn btn-primary" onclick="window.authSystem.showLoginModal()">
          Log In
        </button>
      </div>
    `;
  }

  /**
   * Generate form for individual users
   */
  generateIndividualForm() {
    const formContainer = document.getElementById('rsvp-form');
    if (!formContainer) return;
    
    formContainer.innerHTML = `
      <form id="rsvp-form-element">
        <div class="form-group">
          <label>Will you be attending?</label>
          <div class="radio-group">
            <label class="radio-label">
              <input type="radio" name="response_status" value="attending" required>
              <span>Yes, I'll be there!</span>
            </label>
            <label class="radio-label">
              <input type="radio" name="response_status" value="not_attending" required>
              <span>No, I can't make it</span>
            </label>
          </div>
        </div>
        
        <div class="form-group">
          <label for="dietary_restrictions">Dietary Restrictions (optional)</label>
          <textarea id="dietary_restrictions" name="dietary_restrictions" 
                    placeholder="Please let us know about any dietary restrictions or allergies..."></textarea>
        </div>
        
        <div class="form-group">
          <label for="message">Message (optional)</label>
          <textarea id="message" name="message" 
                    placeholder="Any additional message for the couple..."></textarea>
        </div>
        
        <button type="submit" class="btn btn-primary">Submit RSVP</button>
      </form>
    `;
    
    this.setupFormEventListeners();
  }

  /**
   * Generate form for individual users with plus-one option
   */
  generateIndividualWithPlusOneForm() {
    const formContainer = document.getElementById('rsvp-form');
    if (!formContainer) return;
    
    formContainer.innerHTML = `
      <form id="rsvp-form-element">
        <div class="form-group">
          <label>Will you be attending?</label>
          <div class="radio-group">
            <label class="radio-label">
              <input type="radio" name="response_status" value="attending" required>
              <span>Yes, I'll be there!</span>
            </label>
            <label class="radio-label">
              <input type="radio" name="response_status" value="not_attending" required>
              <span>No, I can't make it</span>
            </label>
          </div>
        </div>
        
        <div class="plus-one-section" id="plus-one-section" style="display: none;">
          <h3>Plus-One Information</h3>
          <div class="form-group">
            <label for="plus_one_first_name">Plus-One First Name</label>
            <input type="text" id="plus_one_first_name" name="plus_one_first_name" 
                   placeholder="Enter plus-one's first name">
          </div>
          <div class="form-group">
            <label for="plus_one_last_name">Plus-One Last Name</label>
            <input type="text" id="plus_one_last_name" name="plus_one_last_name" 
                   placeholder="Enter plus-one's last name">
          </div>
          <div class="form-group">
            <label for="plus_one_dietary_restrictions">Plus-One Dietary Restrictions (optional)</label>
            <textarea id="plus_one_dietary_restrictions" name="plus_one_dietary_restrictions" 
                      placeholder="Any dietary restrictions for your plus-one..."></textarea>
          </div>
        </div>
        
        <div class="form-group">
          <label for="dietary_restrictions">Your Dietary Restrictions (optional)</label>
          <textarea id="dietary_restrictions" name="dietary_restrictions" 
                    placeholder="Please let us know about any dietary restrictions or allergies..."></textarea>
        </div>
        
        <div class="form-group">
          <label for="message">Message (optional)</label>
          <textarea id="message" name="message" 
                    placeholder="Any additional message for the couple..."></textarea>
        </div>
        
        <button type="submit" class="btn btn-primary">Submit RSVP</button>
      </form>
    `;
    
    this.setupFormEventListeners();
    this.setupPlusOneToggle();
  }

  /**
   * Generate form for couples
   */
  generateCoupleForm() {
    const formContainer = document.getElementById('rsvp-form');
    if (!formContainer) return;
    
    formContainer.innerHTML = `
      <form id="rsvp-form-element">
        <div class="couple-rsvp-section">
          <h3>Your RSVP</h3>
          <div class="form-group">
            <label>Will you be attending?</label>
            <div class="radio-group">
              <label class="radio-label">
                <input type="radio" name="response_status" value="attending" required>
                <span>Yes, I'll be there!</span>
              </label>
              <label class="radio-label">
                <input type="radio" name="response_status" value="not_attending" required>
                <span>No, I can't make it</span>
              </label>
            </div>
          </div>
          
          <div class="form-group">
            <label for="dietary_restrictions">Your Dietary Restrictions (optional)</label>
            <textarea id="dietary_restrictions" name="dietary_restrictions" 
                      placeholder="Please let us know about any dietary restrictions or allergies..."></textarea>
          </div>
        </div>
        
        <div class="partner-rsvp-section">
          <h3>Partner RSVP</h3>
          <div class="form-group">
            <label>Will your partner be attending?</label>
            <div class="radio-group">
              <label class="radio-label">
                <input type="radio" name="partner_response_status" value="attending">
                <span>Yes, they'll be there!</span>
              </label>
              <label class="radio-label">
                <input type="radio" name="partner_response_status" value="not_attending">
                <span>No, they can't make it</span>
              </label>
            </div>
          </div>
          
          <div class="form-group">
            <label for="partner_dietary_restrictions">Partner's Dietary Restrictions (optional)</label>
            <textarea id="partner_dietary_restrictions" name="partner_dietary_restrictions" 
                      placeholder="Any dietary restrictions for your partner..."></textarea>
          </div>
        </div>
        
        <div class="form-group">
          <label for="message">Message (optional)</label>
          <textarea id="message" name="message" 
                    placeholder="Any additional message for the couple..."></textarea>
        </div>
        
        <button type="submit" class="btn btn-primary">Submit RSVP</button>
      </form>
    `;
    
    this.setupFormEventListeners();
  }

  /**
   * Generate form for admin users
   */
  generateAdminForm() {
    const formContainer = document.getElementById('rsvp-form');
    if (!formContainer) return;
    
    formContainer.innerHTML = `
      <form id="rsvp-form-element">
        <div class="admin-notice">
          <p><strong>Admin Mode:</strong> You have additional options available.</p>
        </div>
        
        <div class="form-group">
          <label>Will you be attending?</label>
          <div class="radio-group">
            <label class="radio-label">
              <input type="radio" name="response_status" value="attending" required>
              <span>Yes, I'll be there!</span>
            </label>
            <label class="radio-label">
              <input type="radio" name="response_status" value="not_attending" required>
              <span>No, I can't make it</span>
            </label>
          </div>
        </div>
        
        <div class="form-group">
          <label for="dietary_restrictions">Dietary Restrictions (optional)</label>
          <textarea id="dietary_restrictions" name="dietary_restrictions" 
                    placeholder="Please let us know about any dietary restrictions or allergies..."></textarea>
        </div>
        
        <div class="form-group">
          <label for="message">Message (optional)</label>
          <textarea id="message" name="message" 
                    placeholder="Any additional message for the couple..."></textarea>
        </div>
        
        <div class="admin-options">
          <h3>Admin Options</h3>
          <div class="form-group">
            <label for="admin_notes">Admin Notes (internal use only)</label>
            <textarea id="admin_notes" name="admin_notes" 
                      placeholder="Internal notes about this RSVP..."></textarea>
          </div>
        </div>
        
        <button type="submit" class="btn btn-primary">Submit RSVP</button>
      </form>
    `;
    
    this.setupFormEventListeners();
  }

  /**
   * Setup form event listeners
   */
  setupFormEventListeners() {
    const form = document.getElementById('rsvp-form-element');
    if (form) {
      form.addEventListener('submit', (e) => this.submitRSVP(e));
    }
  }

  /**
   * Setup plus-one toggle functionality
   */
  setupPlusOneToggle() {
    const attendingRadio = document.querySelector('input[name="response_status"][value="attending"]');
    const plusOneSection = document.getElementById('plus-one-section');
    
    if (attendingRadio && plusOneSection) {
      attendingRadio.addEventListener('change', () => {
        if (attendingRadio.checked) {
          plusOneSection.style.display = 'block';
        } else {
          plusOneSection.style.display = 'none';
        }
      });
    }
  }

  /**
   * Update the populateForm method to work with dynamic forms
   */
  populateForm() {
    if (!this.currentUser) return;
    
    // Generate the appropriate form first
    this.generateDynamicForm();
    
    // Then populate with existing data if available
    if (this.userRsvp) {
      this.populateRsvpForm();
    }
  }

  /**
   * Populate RSVP form with existing data
   */
  populateRsvpForm() {
    // Populate user's RSVP data
    if (this.userRsvp) {
      const responseStatus = document.querySelector(`input[name="response_status"][value="${this.userRsvp.response_status}"]`);
      if (responseStatus) {
        responseStatus.checked = true;
      }
      
      const dietaryRestrictions = document.getElementById('dietary_restrictions');
      if (dietaryRestrictions && this.userRsvp.dietary_restrictions) {
        dietaryRestrictions.value = this.userRsvp.dietary_restrictions;
      }
      
      const message = document.getElementById('message');
      if (message && this.userRsvp.message) {
        message.value = this.userRsvp.message;
      }
    }
    
    // Populate partner's RSVP data if available
    if (this.partnerRsvp) {
      const partnerResponseStatus = document.querySelector(`input[name="partner_response_status"][value="${this.partnerRsvp.response_status}"]`);
      if (partnerResponseStatus) {
        partnerResponseStatus.checked = true;
      }
      
      const partnerDietaryRestrictions = document.getElementById('partner_dietary_restrictions');
      if (partnerDietaryRestrictions && this.partnerRsvp.dietary_restrictions) {
        partnerDietaryRestrictions.value = this.partnerRsvp.dietary_restrictions;
      }
    }
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
