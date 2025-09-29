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
    this.partnerInfo = null;
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
          this.partnerInfo = data.data.partner_info;
          
          console.log('📝 RSVP Manager: Loaded data:', {
            userRsvp: this.userRsvp,
            partnerRsvp: this.partnerRsvp,
            partnerInfo: this.partnerInfo
          });
          
          // Debug partner information
          if (this.partnerInfo) {
            console.log('📝 RSVP Manager: Partner info found:', this.partnerInfo);
          } else {
            console.log('📝 RSVP Manager: No partner info found');
          }
          
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
    
    // Always update user info display, regardless of RSVP data
    this.updateUserInfo();
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
    if (!this.currentUser) {
      console.log('📝 RSVP Manager: No current user for updateUserInfo');
      return;
    }

    console.log('📝 RSVP Manager: Updating user info for:', this.currentUser.full_name);

    // Update guest name
    const guestName = document.getElementById('guest-name');
    if (guestName) {
      guestName.textContent = this.currentUser.full_name;
      console.log('📝 RSVP Manager: Updated guest name to:', this.currentUser.full_name);
    } else {
      console.log('📝 RSVP Manager: guest-name element not found');
    }

    // Update email display
    const guestEmailDisplay = document.getElementById('guest-email-display');
    if (guestEmailDisplay) {
      guestEmailDisplay.textContent = this.currentUser.email || 'Not provided';
      console.log('📝 RSVP Manager: Updated guest email to:', this.currentUser.email || 'Not provided');
    } else {
      console.log('📝 RSVP Manager: guest-email-display element not found');
    }

      // User type info no longer displayed
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
    
    // Debug: Log all form data
    console.log('📝 RSVP Manager: Form data entries:');
    for (let [key, value] of formData.entries()) {
      console.log(`  ${key}: ${value}`);
    }
    
    const rsvpData = {
      response_status: formData.get('response_status'),
      dietary_restrictions: formData.get('dietary_restrictions') || null,
      message: formData.get('message') || null
    };

    console.log('📝 RSVP Manager: Extracted RSVP data:', rsvpData);

    // Validate required fields
    if (!rsvpData.response_status) {
      console.log('📝 RSVP Manager: No response status selected');
      alert('Please select whether you will be attending.');
      return;
    }

    // Handle partner RSVP if user has a partner
    if (this.currentUser.partner_id || this.partnerInfo) {
      const partnerResponseStatus = formData.get('partner_response_status');
      if (partnerResponseStatus) {
        rsvpData.partner_response_status = partnerResponseStatus;
        rsvpData.partner_dietary_restrictions = formData.get('partner_dietary_restrictions') || null;
        rsvpData.partner_message = formData.get('partner_message') || null;
        console.log('📝 RSVP Manager: Partner RSVP data:', {
          partner_response_status: partnerResponseStatus,
          partner_dietary_restrictions: rsvpData.partner_dietary_restrictions,
          partner_message: rsvpData.partner_message
        });
      } else {
        console.log('📝 RSVP Manager: No partner response status found');
      }
    }

    // Handle plus-one if user is bringing one
    const bringPlusOne = formData.get('bring_plus_one');
    if (bringPlusOne === 'on') {
      const plusOneFirstName = formData.get('plus_one_first_name');
      const plusOneLastName = formData.get('plus_one_last_name');
      const plusOneEmail = formData.get('plus_one_email');
      const plusOneDietary = formData.get('plus_one_dietary_restrictions');
      
      if (plusOneFirstName && plusOneLastName && plusOneEmail) {
        rsvpData.plus_one = {
          first_name: plusOneFirstName,
          last_name: plusOneLastName,
          email: plusOneEmail,
          dietary_restrictions: plusOneDietary || null
        };
        console.log('📝 RSVP Manager: Plus-one data:', rsvpData.plus_one);
      } else {
        console.log('📝 RSVP Manager: Plus-one selected but missing required fields');
        alert('Please fill in all required plus-one information.');
      return;
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
        console.log('📝 RSVP Manager: Response data:', data.data);
        
        // Update local state
        this.userRsvp = data.data.user_rsvp;
        this.partnerRsvp = data.data.partner_rsvp;
        
        // Show success message
        this.showSuccessMessage('RSVP submitted successfully! Thank you for responding.');
        
        // Update form to show submitted state
        this.updateFormToSubmittedState();
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
    
    console.log('📝 RSVP Manager: getUserType - currentUser:', this.currentUser);
    console.log('📝 RSVP Manager: getUserType - partnerInfo:', this.partnerInfo);
    
    // Check if user is admin
    if (this.currentUser.is_admin) {
      return 'admin';
    }
    
    // Check if user has a partner (couple) - use partnerInfo as fallback
    if (this.currentUser.partner_id || this.partnerInfo) {
      console.log('📝 RSVP Manager: Detected as couple');
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
    const formContainer = document.querySelector('.rsvp-form');
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
    const formContainer = document.querySelector('.rsvp-form');
    if (!formContainer) return;
    
    formContainer.innerHTML = `
      <div class="card">
        <form id="rsvp-form-element">
          <!-- Guest Info Section (Pre-populated for logged-in users) -->
          <div class="form-section">
            <h3 class="section-title">Your Invitation</h3>
            
            <div class="guest-info">
              <p><strong>Guest:</strong> <span id="guest-name">Loading...</span></p>
              <p><strong>Email:</strong> <span id="guest-email-display">Loading...</span></p>
            </div>
          </div>
          
          <!-- RSVP Form -->
          <div class="form-section">
            <h3 class="section-title">RSVP Details</h3>
            
            <div class="form-group">
              <label class="form-label">Will you be attending?</label>
              <div class="radio-group">
                <label class="radio-option">
                  <input type="radio" name="response_status" value="attending" class="form-radio">
                  <span class="radio-label">Yes, I'll be there!</span>
                </label>
                <label class="radio-option">
                  <input type="radio" name="response_status" value="not_attending" class="form-radio">
                  <span class="radio-label">No, I can't make it</span>
                </label>
              </div>
            </div>
            
            <div class="form-group">
              <label for="dietary_restrictions" class="form-label">Dietary Restrictions (optional)</label>
              <textarea id="dietary_restrictions" name="dietary_restrictions" class="form-textarea"
                        placeholder="Please let us know about any dietary restrictions or allergies..."></textarea>
            </div>
            
            <div class="form-group">
              <label for="message" class="form-label">Message (optional)</label>
              <textarea id="message" name="message" class="form-textarea"
                        placeholder="Any additional message for the couple..."></textarea>
            </div>
            
            <button type="submit" class="btn btn-primary">Submit RSVP</button>
          </div>
        </form>
      </div>
    `;
    
    // Wait for DOM to update before setting up event listeners
    setTimeout(() => {
      this.setupFormEventListeners();
    }, 10);
  }

  /**
   * Generate form for individual users with plus-one option
   */
  generateIndividualWithPlusOneForm() {
    const formContainer = document.querySelector('.rsvp-form');
    if (!formContainer) return;
    
    formContainer.innerHTML = `
      <div class="card">
        <form id="rsvp-form-element">
          <!-- Guest Info Section (Pre-populated for logged-in users) -->
          <div class="form-section">
            <h3 class="section-title">Your Invitation</h3>
            
            <div class="guest-info">
              <p><strong>Guest:</strong> <span id="guest-name">Loading...</span></p>
              <p><strong>Email:</strong> <span id="guest-email-display">Loading...</span></p>
            </div>
          </div>
          
          <!-- RSVP Form -->
          <div class="form-section">
            <h3 class="section-title">RSVP Details</h3>
            
            <div class="form-group">
              <label class="form-label">Will you be attending?</label>
              <div class="radio-group">
                <label class="radio-option">
                  <input type="radio" name="response_status" value="attending" class="form-radio" required>
                  <span class="radio-label">Yes, I'll be there!</span>
                </label>
                <label class="radio-option">
                  <input type="radio" name="response_status" value="not_attending" class="form-radio" required>
                  <span class="radio-label">No, I can't make it</span>
                </label>
              </div>
            </div>
        
        <div class="form-group">
          <label>
            <input type="checkbox" id="bring_plus_one" name="bring_plus_one">
            I will bring a plus-one
          </label>
        </div>
        
        <div class="plus-one-section" id="plus-one-section" style="display: none;">
          <h3>Plus-One Information</h3>
          <div class="form-group">
            <label for="plus_one_first_name">Plus-One First Name *</label>
            <input type="text" id="plus_one_first_name" name="plus_one_first_name" 
                   placeholder="Enter plus-one's first name" required>
          </div>
          <div class="form-group">
            <label for="plus_one_last_name">Plus-One Last Name *</label>
            <input type="text" id="plus_one_last_name" name="plus_one_last_name" 
                   placeholder="Enter plus-one's last name" required>
          </div>
          <div class="form-group">
            <label for="plus_one_email">Plus-One Email *</label>
            <input type="email" id="plus_one_email" name="plus_one_email" 
                   placeholder="Enter plus-one's email address" required>
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
    const formContainer = document.querySelector('.rsvp-form');
    if (!formContainer) return;
    
    // Get partner information from the loaded data
    let partnerName = 'Your Partner';
    if (this.partnerInfo) {
      partnerName = `${this.partnerInfo.first_name} ${this.partnerInfo.last_name}`;
    }
    
    formContainer.innerHTML = `
      <div class="card">
        <form id="rsvp-form-element">
          <!-- Guest Info Section (Pre-populated for logged-in users) -->
          <div class="form-section">
            <h3 class="section-title">Your Invitation</h3>
            
            <div class="guest-info">
              <p><strong>Guest:</strong> <span id="guest-name">Loading...</span></p>
              <p><strong>Email:</strong> <span id="guest-email-display">Loading...</span></p>
            </div>
          </div>
          
          <!-- RSVP Form -->
          <div class="form-section">
            <h3 class="section-title">RSVP for You and ${partnerName}</h3>
            <p>You can RSVP for both yourself and your partner. Each person can have different dietary restrictions.</p>
        
        <div class="couple-rsvp-section">
          <h4>${this.currentUser.first_name} ${this.currentUser.last_name}</h4>
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
          <h4>${partnerName}</h4>
          <div class="form-group">
            <label>Will ${partnerName} be attending?</label>
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
            <label for="partner_dietary_restrictions">${partnerName}'s Dietary Restrictions (optional)</label>
            <textarea id="partner_dietary_restrictions" name="partner_dietary_restrictions" 
                      placeholder="Any dietary restrictions for ${partnerName}..."></textarea>
          </div>
        </div>
        
        <div class="form-group">
          <label for="message">Message (optional)</label>
          <textarea id="message" name="message" 
                    placeholder="Any additional message for the couple..."></textarea>
        </div>
        
        <button type="submit" class="btn btn-primary">Submit RSVP for Both</button>
      </form>
    `;
    
    // Wait for DOM to update before setting up event listeners
    setTimeout(() => {
      this.setupFormEventListeners();
    }, 10);
  }

  /**
   * Generate form for admin users
   */
  generateAdminForm() {
    const formContainer = document.querySelector('.rsvp-form');
    if (!formContainer) return;
    
    formContainer.innerHTML = `
      <div class="card">
        <form id="rsvp-form-element">
          <!-- Guest Info Section (Pre-populated for logged-in users) -->
          <div class="form-section">
            <h3 class="section-title">Your Invitation</h3>
            
            <div class="guest-info">
              <p><strong>Guest:</strong> <span id="guest-name">Loading...</span></p>
              <p><strong>Email:</strong> <span id="guest-email-display">Loading...</span></p>
            </div>
          </div>
          
          <!-- RSVP Form -->
          <div class="form-section">
            <h3 class="section-title">RSVP Details</h3>
            
            <div class="admin-notice">
              <p><strong>Admin Mode:</strong> You have additional options available.</p>
            </div>
            
            <div class="form-group">
              <label class="form-label">Will you be attending?</label>
              <div class="radio-group">
                <label class="radio-option">
                  <input type="radio" name="response_status" value="attending" class="form-radio" required>
                  <span class="radio-label">Yes, I'll be there!</span>
                </label>
                <label class="radio-option">
                  <input type="radio" name="response_status" value="not_attending" class="form-radio" required>
                  <span class="radio-label">No, I can't make it</span>
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
    
    // Wait for DOM to update before setting up event listeners
    setTimeout(() => {
      this.setupFormEventListeners();
    }, 10);
  }

  /**
   * Setup form event listeners
   */
  setupFormEventListeners() {
    const form = document.getElementById('rsvp-form-element');
    console.log('📝 RSVP Manager: Setting up form event listeners...');
    console.log('📝 RSVP Manager: Form element found:', form);
    
    // Debug: Check what's actually in the rsvp-form container
    const formContainer = document.querySelector('.rsvp-form');
    console.log('📝 RSVP Manager: Form container:', formContainer);
    if (formContainer) {
      console.log('📝 RSVP Manager: Form container innerHTML:', formContainer.innerHTML.substring(0, 200) + '...');
    }
    
    if (form) {
      form.addEventListener('submit', (e) => {
        console.log('📝 RSVP Manager: Form submit event triggered!');
        this.submitRSVP(e);
      });
      console.log('📝 RSVP Manager: Event listener attached to form');
    } else {
      console.log('📝 RSVP Manager: ERROR - Form element not found!');
    }
  }

  /**
   * Show success message
   */
  showSuccessMessage(message) {
    const statusElement = document.getElementById('rsvp-status');
    if (statusElement) {
      statusElement.innerHTML = `
        <div class="alert alert-success">
          <strong>Success!</strong> ${message}
        </div>
      `;
      statusElement.style.display = 'block';
      
      // Hide message after 5 seconds
      setTimeout(() => {
        statusElement.style.display = 'none';
      }, 5000);
    }
  }

  /**
   * Update form to show submitted state
   */
  updateFormToSubmittedState() {
    const formContainer = document.querySelector('.rsvp-form');
    if (!formContainer) return;

    // Disable all form inputs
    const inputs = formContainer.querySelectorAll('input, textarea, button');
    inputs.forEach(input => {
      input.disabled = true;
    });

    // Add a "submitted" indicator
    const submitButton = formContainer.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.textContent = 'RSVP Submitted ✓';
      submitButton.classList.add('btn-success');
      submitButton.classList.remove('btn-primary');
    }

    // Show a message about editing
    const editMessage = document.createElement('div');
    editMessage.className = 'alert alert-info';
    editMessage.innerHTML = `
      <strong>RSVP Submitted!</strong> 
      You can refresh the page to edit your response if needed.
    `;
    
    // Insert after the form
    const form = formContainer.querySelector('form');
    if (form) {
      form.insertAdjacentElement('afterend', editMessage);
    }
  }

  /**
   * Setup plus-one toggle functionality
   */
  setupPlusOneToggle() {
    const bringPlusOneCheckbox = document.getElementById('bring_plus_one');
    const plusOneSection = document.getElementById('plus-one-section');
    
    console.log('📝 RSVP Manager: Setting up plus-one toggle...');
    console.log('📝 RSVP Manager: Plus-one checkbox found:', bringPlusOneCheckbox);
    console.log('📝 RSVP Manager: Plus-one section found:', plusOneSection);
    
    if (bringPlusOneCheckbox && plusOneSection) {
      bringPlusOneCheckbox.addEventListener('change', () => {
        console.log('📝 RSVP Manager: Plus-one checkbox changed:', bringPlusOneCheckbox.checked);
        if (bringPlusOneCheckbox.checked) {
          plusOneSection.style.display = 'block';
          console.log('📝 RSVP Manager: Plus-one section shown');
          // Make plus-one fields required
          const plusOneFields = plusOneSection.querySelectorAll('input[required]');
          plusOneFields.forEach(field => {
            field.required = true;
          });
        } else {
          plusOneSection.style.display = 'none';
          console.log('📝 RSVP Manager: Plus-one section hidden');
          // Clear plus-one fields and make them not required
          const plusOneFields = plusOneSection.querySelectorAll('input, textarea');
          plusOneFields.forEach(field => {
            field.value = '';
            field.required = false;
          });
        }
      });
    } else {
      console.log('📝 RSVP Manager: ERROR - Plus-one elements not found');
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
