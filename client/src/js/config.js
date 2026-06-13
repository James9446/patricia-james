/**
 * Frontend Configuration
 *
 * Centralized configuration for wedding details and app settings.
 * This should match the backend constants.js file.
 */

const CONFIG = {
  // Wedding Details
  WEDDING_DATE: '2026-06-21', // ISO format: YYYY-MM-DD
  WEDDING_DATE_DISPLAY: 'June 21, 2026',
  CEREMONY_TIME: '17:00', // 24-hour format
  CEREMONY_TIME_DISPLAY: '5:00 PM',
  RECEPTION_TIME: '17:40', // 24-hour format
  RECEPTION_TIME_DISPLAY: '5:40 PM',

  // Venue Information
  VENUE_NAME: 'Presidio Officers\' Club',
  VENUE_ADDRESS: '50 Moraga Avenue',
  VENUE_CITY: 'San Francisco',
  VENUE_STATE: 'CA',
  VENUE_ZIP: '94129',
  VENUE_PHONE: '(415) 561-5444',
  VENUE_WEBSITE: 'https://www.presidio.gov/venues/officers-club',

  // Application Settings
  APP_NAME: 'Patricia y James Wedding',
  APP_VERSION: '1.0.0',

  // RSVP Settings
  RSVP_DEADLINE: '2026-05-21', // One month before wedding
  RSVP_DEADLINE_DISPLAY: 'May 21, 2026',

  // API Base URL (set dynamically based on environment)
  API_BASE: '/api',

  /**
   * Get wedding date as JavaScript Date object
   * @returns {Date}
   */
  getWeddingDate() {
    return new Date(`${this.WEDDING_DATE}T${this.CEREMONY_TIME}:00`);
  },

  /**
   * Get full venue address
   * @returns {string}
   */
  getVenueFullAddress() {
    return `${this.VENUE_ADDRESS}, ${this.VENUE_CITY}, ${this.VENUE_STATE} ${this.VENUE_ZIP}`;
  },

  /**
   * Get Google Maps URL for venue
   * @returns {string}
   */
  getVenueMapUrl() {
    const address = encodeURIComponent(this.getVenueFullAddress());
    return `https://maps.google.com/?q=${address}`;
  },

  /**
   * Calculate days until wedding
   * @returns {number}
   */
  getDaysUntilWedding() {
    const now = new Date();
    const weddingDate = this.getWeddingDate();
    const diffTime = weddingDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  },

  /**
   * Get countdown object with days, hours, minutes
   * @returns {Object}
   */
  getCountdown() {
    const now = new Date();
    const weddingDate = this.getWeddingDate();
    const timeDiff = weddingDate - now;

    if (timeDiff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    return {
      days: Math.floor(timeDiff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((timeDiff % (1000 * 60)) / 1000)
    };
  }
};

// Make CONFIG available globally
window.CONFIG = CONFIG;
