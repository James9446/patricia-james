/**
 * Frontend Utility Functions
 *
 * Common utilities for error handling, notifications, and form management
 */

/**
 * Show a notification message to the user
 * @param {string} message - The message to display
 * @param {string} type - 'success', 'error', 'warning', 'info'
 * @param {number} duration - How long to show the message (ms), 0 for permanent
 */
function showNotification(message, type = 'info', duration = 5000) {
  // Remove existing notifications
  const existing = document.querySelectorAll('.notification');
  existing.forEach(notif => notif.remove());

  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <span class="notification-icon">${getNotificationIcon(type)}</span>
      <span class="notification-message">${message}</span>
      <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
  `;

  // Add to DOM
  document.body.appendChild(notification);

  // Trigger animation
  setTimeout(() => notification.classList.add('show'), 10);

  // Error and warning messages should never auto-dismiss - user must manually close them
  // Success and info messages auto-dismiss after duration
  const shouldAutoDismiss = (type === 'success' || type === 'info') && duration > 0;

  if (shouldAutoDismiss) {
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, duration);
  }
}

/**
 * Get icon for notification type
 * @param {string} type
 * @returns {string}
 */
function getNotificationIcon(type) {
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };
  return icons[type] || icons.info;
}

/**
 * Show loading state on a button
 * @param {HTMLElement} button - The button element
 * @param {boolean} loading - Whether to show loading state
 */
function setButtonLoading(button, loading = true) {
  if (loading) {
    button.dataset.originalText = button.textContent;
    button.textContent = 'Loading...';
    button.disabled = true;
    button.classList.add('loading');
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
    button.classList.remove('loading');
    delete button.dataset.originalText;
  }
}

/**
 * Handle form submission with loading state and error handling
 * @param {HTMLFormElement} form - The form element
 * @param {Function} submitHandler - Async function to handle form submission
 * @returns {Promise<void>}
 */
async function handleFormSubmit(form, submitHandler) {
  const submitButton = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Show loading state
    if (submitButton) {
      setButtonLoading(submitButton, true);
    }

    try {
      await submitHandler(new FormData(form));
    } catch (error) {
      console.error('Form submission error:', error);
      showNotification(
        error.message || 'An error occurred. Please try again.',
        'error'
      );
    } finally {
      // Remove loading state
      if (submitButton) {
        setButtonLoading(submitButton, false);
      }
    }
  });
}

/**
 * Show inline error message for a form field
 * @param {HTMLElement} field - The input field
 * @param {string} message - Error message
 */
function showFieldError(field, message) {
  // Remove existing error
  clearFieldError(field);

  // Add error class
  field.classList.add('error');

  // Create error message
  const errorDiv = document.createElement('div');
  errorDiv.className = 'field-error-message';
  errorDiv.textContent = message;

  // Insert after field
  field.parentNode.insertBefore(errorDiv, field.nextSibling);
}

/**
 * Clear error message for a form field
 * @param {HTMLElement} field - The input field
 */
function clearFieldError(field) {
  field.classList.remove('error');
  const errorMessage = field.parentNode.querySelector('.field-error-message');
  if (errorMessage) {
    errorMessage.remove();
  }
}

/**
 * Validate email format
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Debounce function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function}
 */
function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Make utilities available globally
window.showNotification = showNotification;
window.setButtonLoading = setButtonLoading;
window.handleFormSubmit = handleFormSubmit;
window.showFieldError = showFieldError;
window.clearFieldError = clearFieldError;
window.isValidEmail = isValidEmail;
window.debounce = debounce;
