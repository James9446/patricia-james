/**
 * Authentication System for Wedding App
 * 
 * Handles user authentication, session management, and protected page access.
 * Integrates with the backend API for login, logout, and user management.
 */

class AuthSystem {
  constructor() {
    this.currentUser = null;
    this.isAuthenticated = false;
    this.apiBase = '/api';
    
    // Initialize authentication system
    this.init();
  }

  /**
   * Initialize the authentication system
   */
  async init() {
    try {
      // Check if user is already authenticated
      await this.checkAuthStatus();
      
      // Set up navigation handlers
      this.setupNavigationHandlers();
      
      // Update UI based on authentication status
      this.updateUI();
      
      console.log('Auth system initialized');
    } catch (error) {
      console.error('Auth system initialization failed:', error);
    }
  }

  /**
   * Check authentication status from server
   */
  async checkAuthStatus() {
    try {
      const response = await fetch(`${this.apiBase}/auth/status`, {
        method: 'GET',
        credentials: 'include' // Include cookies for session
      });

      if (response.ok) {
        const data = await response.json();
        this.isAuthenticated = data.authenticated;
        
        if (this.isAuthenticated) {
          // Get user details
          await this.getCurrentUser();
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
      console.log('🔐 Getting current user from server...');
      const response = await fetch(`${this.apiBase}/auth/me`, {
        method: 'GET',
        credentials: 'include'
      });

      console.log('🔐 Auth/me response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔐 User data received:', data);
        this.currentUser = data.data;
        this.isAuthenticated = true;
        console.log('🔐 User authenticated:', this.isAuthenticated);
        console.log('🔐 Current user:', this.currentUser);
      } else {
        console.log('🔐 Auth/me failed, user not authenticated');
        this.currentUser = null;
        this.isAuthenticated = false;
      }
    } catch (error) {
      console.error('Get current user failed:', error);
      this.currentUser = null;
      this.isAuthenticated = false;
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
   * Register a new user account
   */
  async register(guestId, email, password, firstName, lastName) {
    try {
      const response = await fetch(`${this.apiBase}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          guest_id: guestId,
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
          // Duplicate registration - use server message for specificity
          data.message = data.message || 'An account already exists for this guest or email address. Please try logging in instead.';
        } else if (response.status === 404) {
          // Guest not found
          data.message = 'Guest information not found. Please check your name spelling or contact us.';
        } else if (response.status === 400) {
          // Validation error
          data.message = data.message || 'Please check your information and try again.';
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
        // After successful login, get the full user information
        await this.getCurrentUser();
        this.updateUI();
      } else {
        // Handle specific error cases
        if (response.status === 401) {
          // Invalid credentials
          data.message = 'Invalid email or password. Please try again.';
        } else if (response.status === 404) {
          // User not found
          data.message = 'No account found with this email address.';
        } else if (response.status === 400) {
          // Validation error
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
        this.currentUser = null;
        this.isAuthenticated = false;
        this.updateUI();
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
                <input type="password" id="loginPassword" name="password" required>
              </div>
              <button type="submit" class="auth-button">Login</button>
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
                <label for="registerPassword">Password:</label>
                <input type="password" id="registerPassword" name="password" required>
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
   * Set up authentication modal event handlers
   */
  setupAuthModalEvents() {
    const modal = document.getElementById('authModal');
    const closeBtn = document.querySelector('.auth-close');
    const tabs = document.querySelectorAll('.auth-tab');
    const loginForm = document.getElementById('loginFormElement');
    const registerForm = document.getElementById('registerFormElement');


    // Close modal
    closeBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });

    // Close modal when clicking outside the modal content
    modal.addEventListener('click', (e) => {
      // Close if clicking on the modal backdrop (not on the content)
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
      const password = document.getElementById('registerPassword').value;
      
      // Check if user is already logged in
      if (this.isAuthenticated) {
        this.showAuthMessage('You are already logged in. Please logout first if you want to create a different account.', false);
        return;
      }
      
      // Basic validation
      if (!firstName || !lastName || !email || !password) {
        this.showAuthMessage('Please fill in all fields', false);
        return;
      }
      
      if (password.length < 6) {
        this.showAuthMessage('Password must be at least 6 characters long', false);
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
      
      // Register user
      const result = await this.register(
        guestCheck.data.guest_id,
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
   * Show a specific page (wrapper for existing showPage function)
   */
  showPage(pageId) {
    this.navigateToPage(pageId);
  }
}

// Initialize authentication system after main.js has loaded
window.addEventListener('load', () => {
  console.log('🔐 Initializing authentication system...');
  
  // Initialize immediately - the auth system will handle showPage errors gracefully
  window.authSystem = new AuthSystem();
  console.log('🔐 Authentication system initialized');
});

// Export for use in other scripts
window.AuthSystem = AuthSystem;
