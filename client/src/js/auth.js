/**
 * Authentication System v5 for Wedding App
 * 
 * Centralized state management for schema v5 (combined table approach).
 * Handles user authentication, session management, and protected page access.
 * Integrates with the new backend API structure.
 */

class AuthSystemV5 {
  constructor() {
    this.currentUser = null;
    this.isAuthenticated = false;
    this.isInitialized = false;
    this.apiBase = '/api';
    this.eventListeners = new Map();
    
    // Initialize authentication system
    this.init();
  }

  /**
   * Initialize the authentication system
   */
  async init() {
    try {
      console.log('🔐 Initializing AuthSystem v5...');
      
      // Check if user is already authenticated
      await this.checkAuthStatus();
      
      // Set up navigation handlers
      this.setupNavigationHandlers();
      
      // Update UI based on authentication status
      this.updateUI();
      
      this.isInitialized = true;
      console.log('🔐 AuthSystem v5 initialized');
      
      // Emit initialization event
      this.emit('initialized', { isAuthenticated: this.isAuthenticated, user: this.currentUser });
    } catch (error) {
      console.error('Auth system initialization failed:', error);
      this.emit('error', { type: 'initialization', error });
    }
  }

  /**
   * Event system for centralized state management
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Check authentication status from server
   */
  async checkAuthStatus() {
    try {
      const response = await fetch(`${this.apiBase}/auth/status`, {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        this.isAuthenticated = data.authenticated;
        
        if (this.isAuthenticated) {
          // Get user details
          await this.getCurrentUser();
        } else {
          this.currentUser = null;
        }
      } else {
        this.isAuthenticated = false;
        this.currentUser = null;
      }
    } catch (error) {
      console.error('Auth status check failed:', error);
      this.isAuthenticated = false;
      this.currentUser = null;
    }
  }

  /**
   * Get current user information
   */
  async getCurrentUser() {
    try {
      const response = await fetch(`${this.apiBase}/auth/me`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        this.currentUser = data.data;
        this.isAuthenticated = true;
        
        // Emit user data change event
        this.emit('userChanged', { user: this.currentUser, isAuthenticated: true });
      } else {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.emit('userChanged', { user: null, isAuthenticated: false });
      }
    } catch (error) {
      console.error('Get current user failed:', error);
      this.currentUser = null;
      this.isAuthenticated = false;
      this.emit('userChanged', { user: null, isAuthenticated: false });
    }
  }

  /**
   * Check if a guest exists by name (for registration)
   */
  async checkGuest(firstName, lastName) {
    try {
      const response = await fetch(`${this.apiBase}/auth/check-guest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName
        })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Check guest failed:', error);
      return {
        success: false,
        message: 'Failed to check guest information'
      };
    }
  }

  /**
   * Register a new user account (schema v5: uses user_id instead of guest_id)
   */
  async register(userId, email, password, firstName, lastName) {
    try {
      const response = await fetch(`${this.apiBase}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          user_id: userId, // Schema v5: user_id instead of guest_id
          email: email,
          password: password,
          first_name: firstName,
          last_name: lastName
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Auto-login after successful registration
        await this.login(email, password);
      } else {
        // Handle specific error cases
        if (response.status === 409) {
          data.message = data.message || 'An account already exists for this user or email address. Please try logging in instead.';
        } else if (response.status === 404) {
          data.message = 'User information not found. Please check your name spelling or contact us.';
        } else if (response.status === 400) {
          // Check if there are specific validation errors (e.g., password requirements)
          if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
            data.message = 'Password requirements:\n' + data.errors.join('\n');
          } else {
            data.message = data.message || 'Please check your information and try again.';
          }
        }
      }

      return data;
    } catch (error) {
      console.error('Registration failed:', error);
      return {
        success: false,
        message: 'Registration failed'
      };
    }
  }

  /**
   * Login with email and password
   */
  async login(email, password) {
    try {
      const response = await fetch(`${this.apiBase}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          email: email,
          password: password
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Update state after successful login
        this.currentUser = data.data;
        this.isAuthenticated = true;
        
        // Update UI and emit events
        this.updateUI();
        this.emit('login', { user: this.currentUser });
        this.emit('userChanged', { user: this.currentUser, isAuthenticated: true });
      } else {
        // Handle specific error cases
        if (response.status === 401) {
          data.message = 'Invalid email or password. Please try again.';
        } else if (response.status === 404) {
          data.message = 'No account found with this email address.';
        } else if (response.status === 400) {
          data.message = data.message || 'Please check your information and try again.';
        }
      }
      
      return data;
    } catch (error) {
      console.error('Login failed:', error);
      return {
        success: false,
        message: 'Login failed'
      };
    }
  }

  /**
   * Logout current user
   */
  async logout() {
    try {
      const response = await fetch(`${this.apiBase}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });

      const data = await response.json();
      
      if (data.success) {
        // Clear state
        this.currentUser = null;
        this.isAuthenticated = false;
        
        // Update UI and emit events
        this.updateUI();
        this.emit('logout');
        this.emit('userChanged', { user: null, isAuthenticated: false });
      }
      
      return data;
    } catch (error) {
      console.error('Logout failed:', error);
      return {
        success: false,
        message: 'Logout failed'
      };
    }
  }

  /**
   * Set up navigation handlers for protected pages
   */
  setupNavigationHandlers() {
    // Find all navigation links and override their click handlers
    const navLinks = document.querySelectorAll('[data-page]');
    
    navLinks.forEach(link => {
      // Remove existing event listeners by cloning the element
      const newLink = link.cloneNode(true);
      link.parentNode.replaceChild(newLink, link);
      
      // Add new event listener with authentication check
      newLink.addEventListener('click', (e) => {
        e.preventDefault();
        const pageId = newLink.getAttribute('data-page');
        
        if (pageId === 'home') {
          // Home page is always accessible
          this.navigateToPage(pageId);
        } else {
          // Other pages require authentication
          if (this.isAuthenticated) {
            this.navigateToPage(pageId);
          } else {
            this.showLoginModal(pageId);
          }
        }
      });
    });
  }

  /**
   * Show login/register modal
   */
  showLoginModal(intendedPage = null) {
    // Create modal if it doesn't exist
    if (!document.getElementById('authModal')) {
      this.createAuthModal();
    }

    // Store intended page for redirect after login
    this.intendedPage = intendedPage;

    // Show modal
    const modal = document.getElementById('authModal');
    modal.style.display = 'block';
    
    // Focus on first name input
    const firstNameInput = document.getElementById('firstName');
    if (firstNameInput) {
      firstNameInput.focus();
    }
  }

  /**
   * Create authentication modal
   */
  createAuthModal() {
    const modalHTML = `
      <div id="authModal" class="auth-modal" style="display: none;">
        <div class="auth-modal-content">
          <span class="auth-close">&times;</span>
          
          <div class="auth-tabs">
            <button class="auth-tab active" data-tab="login">Login</button>
            <button class="auth-tab" data-tab="register">Register</button>
          </div>

          <!-- Login Form -->
          <div id="loginForm" class="auth-form active">
            <h2>Welcome Back!</h2>
            <form id="loginFormElement">
              <div class="form-group">
                <label for="loginEmail">Email:</label>
                <input type="email" id="loginEmail" name="email" required>
              </div>
              <div class="form-group">
                <label for="loginPassword">Password:</label>
                <div class="password-input-wrapper">
                  <input type="password" id="loginPassword" name="password" required>
                  <button type="button" class="toggle-password" data-target="loginPassword" aria-label="Show password">
                    <span class="toggle-text">Show</span>
                  </button>
                </div>
              </div>
              <button type="submit" class="auth-button">Login</button>
              <div class="forgot-password-link">
                <a href="#" id="forgotPasswordLink">Forgot Password?</a>
              </div>
            </form>
          </div>

          <!-- Register Form -->
          <div id="registerForm" class="auth-form">
            <h2>Create Your Account</h2>
            <form id="registerFormElement">
              <div class="form-group">
                <label for="firstName">First Name:</label>
                <input type="text" id="firstName" name="firstName" required>
              </div>
              <div class="form-group">
                <label for="lastName">Last Name:</label>
                <input type="text" id="lastName" name="lastName" required>
              </div>
              <div class="form-group">
                <label for="registerEmail">Email:</label>
                <input type="email" id="registerEmail" name="email" required>
              </div>
              <div class="form-group">
                <label for="registerEmailConfirm">Confirm Email:</label>
                <input type="email" id="registerEmailConfirm" name="emailConfirm" required onpaste="return false" autocomplete="off">
                <small class="email-confirmation-hint">Please type your email again (pasting is disabled to prevent errors)</small>
              </div>
              <div class="form-group">
                <label for="registerPassword">Password:</label>
                <div class="password-input-wrapper">
                  <input type="password" id="registerPassword" name="password" required>
                  <button type="button" class="toggle-password" data-target="registerPassword" aria-label="Show password">
                    <span class="toggle-text">Show</span>
                  </button>
                </div>
                <small class="password-requirements">
                  Must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character (!@#$%^&*)
                </small>
              </div>
              <div class="form-group">
                <label for="registerPasswordConfirm">Confirm Password:</label>
                <div class="password-input-wrapper">
                  <input type="password" id="registerPasswordConfirm" name="passwordConfirm" required>
                  <button type="button" class="toggle-password" data-target="registerPasswordConfirm" aria-label="Show password">
                    <span class="toggle-text">Show</span>
                  </button>
                </div>
              </div>
              <button type="submit" class="auth-button">Register</button>
            </form>
          </div>

          <div id="authMessage" class="auth-message"></div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.setupAuthModalEvents();
  }

  /**
   * Validate password complexity (Option A requirements)
   */
  validatePasswordComplexity(password) {
    const errors = [];

    if (password.length < 8) {
      errors.push('At least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('At least 1 uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('At least 1 lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('At least 1 number');
    }
    if (!/[!@#$%^&*]/.test(password)) {
      errors.push('At least 1 special character (!@#$%^&*)');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Set up authentication modal event handlers
   */
  setupAuthModalEvents() {
    const modal = document.getElementById('authModal');
    const closeBtn = document.querySelector('.auth-close');
    const tabs = document.querySelectorAll('.auth-tab');
    const loginForm = document.getElementById('loginFormElement');
    const registerForm = document.getElementById('registerFormElement');

    // Set up password toggle buttons (only for auth modals, not reset password page)
    const setupPasswordToggles = () => {
      const toggleButtons = document.querySelectorAll('.auth-modal .toggle-password');
      toggleButtons.forEach(button => {
        button.addEventListener('click', () => {
          const targetId = button.getAttribute('data-target');
          const input = document.getElementById(targetId);
          const toggleText = button.querySelector('.toggle-text');

          if (input.type === 'password') {
            input.type = 'text';
            toggleText.textContent = 'Hide';
            button.setAttribute('aria-label', 'Hide password');
          } else {
            input.type = 'password';
            toggleText.textContent = 'Show';
            button.setAttribute('aria-label', 'Show password');
          }
        });
      });
    };

    // Initialize password toggles
    setupPasswordToggles();

    // Close modal
    closeBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });

    // Close modal when clicking outside the modal content
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });

    // Tab switching
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        
        // Update tab appearance
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Update form visibility
        document.querySelectorAll('.auth-form').forEach(form => {
          form.classList.remove('active');
        });
        document.getElementById(tabName + 'Form').classList.add('active');
      });
    });

    // Login form submission
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;
      
      // Check if user is already logged in
      if (this.isAuthenticated) {
        this.showAuthMessage('You are already logged in!', true);
        modal.style.display = 'none';
        return;
      }
      
      // Basic validation
      if (!email || !password) {
        this.showAuthMessage('Please enter both email and password', false);
        return;
      }
      
      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        this.showAuthMessage('Please enter a valid email address', false);
        return;
      }
      
      // Show loading state
      this.showAuthMessage('Logging in...', true);
      
      const result = await this.login(email, password);
      this.showAuthMessage(result.message, result.success);
      
      if (result.success) {
        modal.style.display = 'none';
        if (this.intendedPage) {
          this.navigateToPage(this.intendedPage);
          this.intendedPage = null;
        }
      }
    });

    // Register form submission
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const firstName = document.getElementById('firstName').value.trim();
      const lastName = document.getElementById('lastName').value.trim();
      const email = document.getElementById('registerEmail').value.trim();
      const emailConfirm = document.getElementById('registerEmailConfirm').value.trim();
      const password = document.getElementById('registerPassword').value;
      const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

      // Check if user is already logged in
      if (this.isAuthenticated) {
        this.showAuthMessage('You are already logged in. Please logout first if you want to create a different account.', false);
        return;
      }

      // Basic validation
      if (!firstName || !lastName || !email || !emailConfirm || !password || !passwordConfirm) {
        this.showAuthMessage('Please fill in all fields', false);
        return;
      }

      // Email confirmation validation
      if (email !== emailConfirm) {
        this.showAuthMessage('Email addresses do not match', false);
        return;
      }

      // Password confirmation validation
      if (password !== passwordConfirm) {
        this.showAuthMessage('Passwords do not match', false);
        return;
      }

      // Password complexity validation
      const passwordValidation = this.validatePasswordComplexity(password);
      if (!passwordValidation.valid) {
        this.showAuthMessage('Password requirements not met:\n' + passwordValidation.errors.join('\n'), false);
        return;
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        this.showAuthMessage('Please enter a valid email address', false);
        return;
      }
      
      // Show loading state
      this.showAuthMessage('Checking guest information...', true);
      
      // First check if guest exists
      const guestCheck = await this.checkGuest(firstName, lastName);
      
      if (!guestCheck.success) {
        this.showAuthMessage(guestCheck.message, false);
        return;
      }
      
      // Check if guest already has a user account
      if (guestCheck.data.has_user_account) {
        const errorMessage = `This guest already has an account registered with email: ${guestCheck.data.user_email}. Please try logging in instead.`;
        this.showAuthMessage(errorMessage, false);
        return;
      }
      
      // Show loading state for registration
      this.showAuthMessage('Creating your account...', true);
      
      // Register user (schema v5: use user_id instead of guest_id)
      const result = await this.register(
        guestCheck.data.user_id, // Schema v5: user_id instead of guest_id
        email,
        password,
        firstName,
        lastName
      );
      
      this.showAuthMessage(result.message, result.success);
      
      if (result.success) {
        modal.style.display = 'none';
        if (this.intendedPage) {
          this.navigateToPage(this.intendedPage);
          this.intendedPage = null;
        }
      }
    });

    // Forgot password link
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    if (forgotPasswordLink) {
      forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        modal.style.display = 'none';
        this.showForgotPasswordModal();
      });
    }
  }

  /**
   * Show authentication message
   */
  showAuthMessage(message, isSuccess) {
    const messageEl = document.getElementById('authMessage');
    if (!messageEl) {
      console.error('Auth message element not found! Modal may not be created.');
      return;
    }

    messageEl.textContent = message;
    messageEl.className = `auth-message ${isSuccess ? 'success' : 'error'}`;

    // Clear message after 5 seconds
    setTimeout(() => {
      messageEl.textContent = '';
      messageEl.className = 'auth-message';
    }, 5000);
  }

  /**
   * Show forgot password modal
   */
  showForgotPasswordModal() {
    // Create modal if it doesn't exist
    if (!document.getElementById('forgotPasswordModal')) {
      this.createForgotPasswordModal();
    }

    // Show modal
    const modal = document.getElementById('forgotPasswordModal');
    modal.style.display = 'block';
  }

  /**
   * Create forgot password modal
   */
  createForgotPasswordModal() {
    const modalHTML = `
      <div id="forgotPasswordModal" class="auth-modal" style="display: none;">
        <div class="auth-modal-content">
          <span class="forgot-password-close">&times;</span>

          <div class="auth-form active">
            <h2>Reset Your Password</h2>
            <p>Enter your email address and we'll send you a link to reset your password.</p>
            <form id="forgotPasswordFormElement">
              <div class="form-group">
                <label for="forgotPasswordEmail">Email:</label>
                <input type="email" id="forgotPasswordEmail" name="email" required>
              </div>
              <button type="submit" class="auth-button">Send Reset Link</button>
            </form>
          </div>

          <div id="forgotPasswordMessage" class="auth-message"></div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.setupForgotPasswordModalEvents();
  }

  /**
   * Set up forgot password modal event handlers
   */
  setupForgotPasswordModalEvents() {
    const modal = document.getElementById('forgotPasswordModal');
    const closeBtn = modal.querySelector('.forgot-password-close');
    const form = document.getElementById('forgotPasswordFormElement');

    // Close modal
    closeBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });

    // Form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.getElementById('forgotPasswordEmail').value.trim();

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        this.showForgotPasswordMessage('Please enter a valid email address', false);
        return;
      }

      // Show loading state
      this.showForgotPasswordMessage('Sending reset link...', true);

      const result = await this.requestPasswordReset(email);
      this.showForgotPasswordMessage(result.message, result.success);

      // Clear form if successful
      if (result.success) {
        form.reset();
      }
    });
  }

  /**
   * Show message in forgot password modal
   */
  showForgotPasswordMessage(message, isSuccess) {
    const messageEl = document.getElementById('forgotPasswordMessage');
    if (!messageEl) {
      console.error('Forgot password message element not found!');
      return;
    }

    messageEl.textContent = message;
    messageEl.className = `auth-message ${isSuccess ? 'success' : 'error'}`;

    // Clear message after 8 seconds (longer than normal since user needs to check email)
    setTimeout(() => {
      messageEl.textContent = '';
      messageEl.className = 'auth-message';
    }, 8000);
  }

  /**
   * Request password reset email
   */
  async requestPasswordReset(email) {
    try {
      const response = await fetch(`${this.apiBase}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      return data;

    } catch (error) {
      console.error('Password reset request failed:', error);
      return {
        success: false,
        message: 'Failed to send reset email. Please try again later.'
      };
    }
  }

  /**
   * Update UI based on authentication status
   */
  updateUI() {
    // Update navigation based on auth status
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
      const pageId = item.dataset.page;

      if (pageId === 'home') {
        // Home is always accessible
        item.style.display = 'block';
      } else if (this.isAuthenticated) {
        // Show all pages for authenticated users
        item.style.display = 'block';
      } else {
        // Hide protected pages for unauthenticated users
        item.style.display = 'none';
      }
    });

    // Show/hide admin nav links based on admin status
    const adminNavItems = document.querySelectorAll('.nav-item-admin');
    adminNavItems.forEach(item => {
      if (this.isAuthenticated && this.currentUser && this.currentUser.is_admin) {
        item.style.display = 'block';
      } else {
        item.style.display = 'none';
      }
    });

    // Update user info in navigation
    this.updateUserInfo();
  }

  /**
   * Update user information in navigation
   */
  updateUserInfo() {
    const nav = document.querySelector('.navbar-container');
    if (!nav) return;

    // Remove existing user info
    const existingUserInfo = document.querySelector('.user-info');
    if (existingUserInfo) {
      existingUserInfo.remove();
    }

    if (this.isAuthenticated && this.currentUser) {
      // Add user info for authenticated users
      const userInfo = document.createElement('div');
      userInfo.className = 'user-info';
      userInfo.innerHTML = `
        <button id="logoutBtn" class="logout-btn">Logout</button>
      `;
      nav.appendChild(userInfo);

      // Add logout handler
      document.getElementById('logoutBtn').addEventListener('click', async () => {
        const confirmed = confirm('Are you sure you want to logout?');
        if (confirmed) {
          await this.logout();
          this.navigateToPage('home');
        }
      });
    } else {
      // Add login button for unauthenticated users
      const userInfo = document.createElement('div');
      userInfo.className = 'user-info';
      userInfo.innerHTML = `
        <button id="loginBtn" class="login-btn">Login</button>
      `;
      nav.appendChild(userInfo);

      // Add login handler
      document.getElementById('loginBtn').addEventListener('click', () => {
        this.showLoginModal();
      });
    }
  }

  /**
   * Navigate to a page with error handling
   */
  navigateToPage(pageId) {
    try {
      if (typeof window.showPage === 'function') {
        window.showPage(pageId);
      } else {
        // Fallback navigation
        window.location.hash = pageId;
      }
    } catch (error) {
      console.warn('Error navigating to page:', pageId, error);
      // Fallback to hash navigation
      window.location.hash = pageId;
    }
  }

  /**
   * Get user data for other components
   */
  getUserData() {
    return {
      user: this.currentUser,
      isAuthenticated: this.isAuthenticated,
      isInitialized: this.isInitialized
    };
  }

  /**
   * Initialize reset password page
   */
  initializeResetPasswordPage() {
    const form = document.getElementById('resetPasswordForm');
    if (!form) return; // Not on reset password page

    // Set up password toggle buttons for reset password page
    const toggleButtons = document.querySelectorAll('#reset-password .toggle-password');
    toggleButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const targetId = button.getAttribute('data-target');
        const input = document.getElementById(targetId);
        const toggleText = button.querySelector('.toggle-text');

        if (!input || !toggleText) return;

        if (input.type === 'password') {
          input.type = 'text';
          toggleText.textContent = 'Hide';
          button.setAttribute('aria-label', 'Hide password');
        } else {
          input.type = 'password';
          toggleText.textContent = 'Show';
          button.setAttribute('aria-label', 'Show password');
        }
      });
    });

    // Get token from URL hash (format: #reset-password?token=abc123)
    const hash = window.location.hash;
    const queryString = hash.includes('?') ? hash.split('?')[1] : '';
    const urlParams = new URLSearchParams(queryString);
    const token = urlParams.get('token');

    if (!token) {
      this.showResetPasswordMessage('Invalid or missing reset token', false);
      // Disable the form
      const inputs = form.querySelectorAll('input, button');
      inputs.forEach(input => input.disabled = true);
      return;
    }

    // Verify token with backend
    this.verifyResetToken(token);

    // Handle form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const password = document.getElementById('resetPasswordNew').value;
      const passwordConfirm = document.getElementById('resetPasswordConfirm').value;

      // Validate passwords match
      if (password !== passwordConfirm) {
        this.showResetPasswordMessage('Passwords do not match', false);
        return;
      }

      // Validate password complexity
      const validation = this.validatePasswordComplexity(password);
      if (!validation.valid) {
        this.showResetPasswordMessage('Password requirements:\n' + validation.errors.join('\n'), false);
        return;
      }

      // Show loading state
      this.showResetPasswordMessage('Resetting password...', true);

      // Submit password reset
      const result = await this.submitPasswordReset(token, password);
      this.showResetPasswordMessage(result.message, result.success);

      // Redirect to home on success (user is now logged in)
      if (result.success) {
        setTimeout(() => {
          window.location.href = '/#home';
          // Force auth check after redirect
          window.location.reload();
        }, 2000);
      }
    });
  }

  /**
   * Verify reset token with backend
   */
  async verifyResetToken(token) {
    try {
      const response = await fetch(`${this.apiBase}/auth/verify-reset-token?token=${token}`, {
        method: 'GET',
        credentials: 'include'
      });

      const data = await response.json();

      if (!data.success) {
        this.showResetPasswordMessage(data.message || 'Invalid or expired reset token', false);
        // Disable the form
        const form = document.getElementById('resetPasswordForm');
        if (form) {
          const inputs = form.querySelectorAll('input, button');
          inputs.forEach(input => input.disabled = true);
        }
      }

    } catch (error) {
      console.error('Token verification failed:', error);
      this.showResetPasswordMessage('Failed to verify reset token', false);
    }
  }

  /**
   * Submit password reset
   */
  async submitPasswordReset(token, password) {
    try {
      const response = await fetch(`${this.apiBase}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ token, password })
      });

      const data = await response.json();
      return data;

    } catch (error) {
      console.error('Password reset failed:', error);
      return {
        success: false,
        message: 'Failed to reset password. Please try again.'
      };
    }
  }

  /**
   * Show message on reset password page
   */
  showResetPasswordMessage(message, isSuccess) {
    const messageEl = document.getElementById('resetPasswordMessage');
    if (!messageEl) {
      console.error('Reset password message element not found!');
      return;
    }

    messageEl.textContent = message;
    messageEl.className = `auth-message ${isSuccess ? 'success' : 'error'}`;
  }

  /**
   * Wait for authentication to be initialized
   */
  async waitForInitialization() {
    return new Promise((resolve) => {
      if (this.isInitialized) {
        resolve(this.getUserData());
      } else {
        this.on('initialized', (data) => {
          resolve(this.getUserData());
        });
      }
    });
  }
}

// Initialize authentication system after main.js has loaded
window.addEventListener('load', () => {
  console.log('🔐 Initializing AuthSystem v5...');

  // Initialize immediately
  window.authSystem = new AuthSystemV5();
  console.log('🔐 AuthSystem v5 initialized');

  // Initialize reset password page if we're on it
  window.authSystem.initializeResetPasswordPage();
});

// Export for use in other scripts
window.AuthSystemV5 = AuthSystemV5;
