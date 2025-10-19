/**
 * Application Constants
 *
 * Centralized configuration for app-wide constants including
 * wedding details, venue information, and application settings.
 */

// Wedding Details
const WEDDING_DATE = '2026-06-21'; // ISO format: YYYY-MM-DD
const WEDDING_DATE_DISPLAY = 'June 21, 2026';
const CEREMONY_TIME = '16:00'; // 24-hour format
const CEREMONY_TIME_DISPLAY = '4:00 PM';
const RECEPTION_TIME = '18:00'; // 24-hour format
const RECEPTION_TIME_DISPLAY = '6:00 PM';

// Venue Information
const VENUE_NAME = 'Presidio Officers\' Club';
const VENUE_ADDRESS = '50 Moraga Avenue';
const VENUE_CITY = 'San Francisco';
const VENUE_STATE = 'CA';
const VENUE_ZIP = '94129';
const VENUE_PHONE = '(415) 561-5444';
const VENUE_WEBSITE = 'https://www.presidio.gov/venues/officers-club';

// Application Settings
const APP_NAME = 'Patricia y James Wedding';
const APP_VERSION = '1.0.0';
const SESSION_DURATION_DAYS = 30;

// Password Requirements
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

// RSVP Settings
const RSVP_DEADLINE = '2026-05-21'; // One month before wedding
const RSVP_DEADLINE_DISPLAY = 'May 21, 2026';

// File Upload Settings (for photo system)
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_PHOTOS_PER_UPLOAD = 10;

module.exports = {
  // Wedding Details
  WEDDING_DATE,
  WEDDING_DATE_DISPLAY,
  CEREMONY_TIME,
  CEREMONY_TIME_DISPLAY,
  RECEPTION_TIME,
  RECEPTION_TIME_DISPLAY,

  // Venue
  VENUE_NAME,
  VENUE_ADDRESS,
  VENUE_CITY,
  VENUE_STATE,
  VENUE_ZIP,
  VENUE_PHONE,
  VENUE_WEBSITE,

  // App Settings
  APP_NAME,
  APP_VERSION,
  SESSION_DURATION_DAYS,

  // Password
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,

  // RSVP
  RSVP_DEADLINE,
  RSVP_DEADLINE_DISPLAY,

  // File Upload
  MAX_FILE_SIZE,
  ALLOWED_IMAGE_TYPES,
  MAX_PHOTOS_PER_UPLOAD,

  // Helper function to get full wedding date/time object
  getWeddingDateTime: () => ({
    date: WEDDING_DATE,
    dateDisplay: WEDDING_DATE_DISPLAY,
    ceremonyTime: CEREMONY_TIME,
    ceremonyTimeDisplay: CEREMONY_TIME_DISPLAY,
    receptionTime: RECEPTION_TIME,
    receptionTimeDisplay: RECEPTION_TIME_DISPLAY,
    fullDateTime: new Date(`${WEDDING_DATE}T${CEREMONY_TIME}:00`)
  }),

  // Helper function to get full venue object
  getVenueInfo: () => ({
    name: VENUE_NAME,
    address: VENUE_ADDRESS,
    city: VENUE_CITY,
    state: VENUE_STATE,
    zip: VENUE_ZIP,
    phone: VENUE_PHONE,
    website: VENUE_WEBSITE,
    fullAddress: `${VENUE_ADDRESS}, ${VENUE_CITY}, ${VENUE_STATE} ${VENUE_ZIP}`
  })
};
