# Patricia y James Wedding Website - Project Plan

## 🎯 Project Overview
A modern, interactive wedding website with guest authentication, RSVP system, and photo sharing capabilities.

## 🏗️ Architecture Overview
```
Frontend (Static) → Backend API (Node.js/Express) → PostgreSQL Database
     ↓                        ↓                           ↓
  Render Static           Render Web Service         Render PostgreSQL
```

## 🔐 Authentication Strategy

### User Flow
1. **Guest visits site** → Sees Home Page (always accessible)
2. **Guest tries to navigate to another page** → Authentication check
   - **If logged in** → Navigate to selected page
   - **If not logged in** → Present login/register options
3. **Login Flow** → Enter credentials → Navigate to intended page
4. **Register Flow** → Name lookup → Guest list validation → Create account → Full access

### Authentication Requirements
- **Home page**: Always accessible (no authentication required)
- **Other pages**: Require authentication
- **Session management**: Cookie-based, persistent across browser sessions
- **Guest list validation**: Only invited guests can register
- **Duplicate prevention**: Can't register twice with same name

## 📊 Database Schema (v5 - Redesigned)

### Core Tables
```sql
-- ========================================
-- INVITATIONS Table (Master invitation list)
-- ========================================
CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invitation_code VARCHAR(20) UNIQUE NOT NULL, -- e.g., "SMITH001", "JONES002"
    primary_guest_name VARCHAR(200) NOT NULL, -- "John & Jane Smith"
    party_size INTEGER NOT NULL DEFAULT 2, -- How many people can attend
    plus_one_allowed BOOLEAN DEFAULT false,
    invitation_sent BOOLEAN DEFAULT false,
    rsvp_deadline DATE,
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- GUESTS Table (Individual people)
-- ========================================
CREATE TABLE guests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invitation_id UUID REFERENCES invitations(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- USERS Table (Authentication only)
-- ========================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT false,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE -- Soft delete instead of is_active
);

-- ========================================
-- RSVPs Table (Simplified)
-- ========================================
CREATE TABLE rsvps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invitation_id UUID REFERENCES invitations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
    
    -- RSVP details
    response_status VARCHAR(20) NOT NULL CHECK (response_status IN ('attending', 'not_attending', 'pending')),
    attending_count INTEGER NOT NULL DEFAULT 1, -- How many people are attending
    
    -- Plus-one details (if applicable)
    plus_one_name VARCHAR(200), -- Name of plus-one if bringing one
    plus_one_email VARCHAR(255), -- Email of plus-one if provided
    
    -- Additional information
    dietary_restrictions TEXT,
    song_requests TEXT,
    message TEXT,
    
    -- Metadata
    responded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- USER_SESSIONS Table (Session storage)
-- ========================================
CREATE TABLE user_sessions (
    sid VARCHAR NOT NULL,
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL,
    PRIMARY KEY (sid)
);

-- ========================================
-- PHOTOS Table (Future feature)
-- ========================================
CREATE TABLE photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    caption TEXT,
    is_approved BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Key Schema Changes (v5)
- **Invitation-centric design**: Master invitation list with unique codes
- **Simplified guest management**: No `is_primary` column, equal partner treatment
- **Clean user authentication**: Email-only authentication, no redundant name fields
- **Streamlined RSVP system**: Single RSVP per invitation, plus-one details stored inline
- **Session management**: Proper `user_sessions` table for `express-session`
- **Soft delete**: `deleted_at` instead of `is_active` for better data integrity

## 🚀 Deployment Strategy

### Render.com Setup
1. **Frontend**: Static site deployment (HTML/CSS/JS)
2. **Backend**: Web service (Node.js/Express API)
3. **Database**: PostgreSQL add-on
4. **File Storage**: Render persistent disk or AWS S3 for photos

### Technology Stack
- **Frontend**: HTML/CSS/JavaScript (current)
- **Backend**: Node.js + Express
- **Database**: PostgreSQL 17.6
- **Deployment**: Render.com
- **File Storage**: Render persistent disk or AWS S3
- **Authentication**: Session-based with cookies

## 📋 Development Phases

### Phase 1: Schema Redesign & Migration 🚧 CRITICAL
- [ ] **Design new schema (v5)** - Invitation-centric, simplified structure
- [ ] **Create migration scripts** - From v4 to v5 schema
- [ ] **Update all API endpoints** - Align with new schema
- [ ] **Test migration process** - Ensure data integrity
- [ ] **Update documentation** - Reflect new schema design

### Phase 2: Authentication System Redesign 🚧 CRITICAL
- [ ] **Centralized AuthManager** - Single source of truth for auth state
- [ ] **Event-driven updates** - Components subscribe to auth changes
- [ ] **Proper session handling** - Server/client synchronization
- [ ] **Error boundary** - Graceful failure handling
- [ ] **User type detection** - Individual/partner/plus-one logic

### Phase 3: RSVP System Redesign 🚧 CRITICAL
- [ ] **User type detection** - Based on database relationships
- [ ] **Dynamic form generation** - Based on user type
- [ ] **State management** - Track RSVP status and updates
- [ ] **API integration** - Proper error handling and loading states
- [ ] **User experience flow** - Clear guidance for each user type

### Phase 4: API & Database Enhancements
- [ ] **New API endpoints** - Invitation lookup, user type detection
- [ ] **Plus-one registration** - Allow plus-ones to create accounts
- [ ] **Partner RSVP logic** - Either partner can RSVP for both
- [ ] **Admin dashboard** - Manage invitations and guests

### Phase 5: Photo System
- [ ] Implement photo upload functionality
- [ ] Add photo gallery display with attribution
- [ ] Build comments and upvoting system
- [ ] Set up file storage solution

### Phase 6: Integration & Polish
- [ ] Connect frontend to backend APIs
- [ ] Add error handling and validation
- [ ] Performance optimization and testing
- [ ] Final deployment and testing

### Phase 2.5: Authentication System Improvements 🚧 CRITICAL

#### **Current Issues Identified:**
- ❌ No visual indication of login status
- ❌ No logout functionality visible to users
- ❌ Poor error handling for common scenarios
- ❌ No duplicate registration prevention
- ❌ No password validation or requirements
- ❌ No session timeout handling
- ❌ No "remember me" functionality
- ❌ No password reset capability
- ❌ No account management features

#### **Comprehensive Authentication Improvement Plan:**

##### **2.5.1 User Interface & Experience**
- [ ] **Login Status Indicator**
  - Add user name/welcome message in navigation
  - Show login/logout button based on status
  - Visual indicator of authentication state
- [ ] **Logout Functionality**
  - Prominent logout button in navigation
  - Confirmation dialog for logout
  - Clear session termination
- [ ] **Authentication Modal Improvements**
  - Better error message display
  - Loading states during authentication
  - Form validation feedback
  - Success/error animations

##### **2.5.2 Error Handling & Validation**
- [ ] **Registration Error Handling**
  - Prevent duplicate registrations with clear messaging
  - Handle "guest not found" scenarios gracefully
  - Validate email format and uniqueness
  - Password strength requirements
- [ ] **Login Error Handling**
  - Clear "invalid credentials" messages
  - Account lockout after failed attempts
  - Handle expired sessions gracefully
- [ ] **Network Error Handling**
  - Offline detection and messaging
  - Retry mechanisms for failed requests
  - Timeout handling for slow connections

##### **2.5.3 Security Enhancements**
- [ ] **Password Security**
  - Minimum password requirements (8+ chars, mixed case, numbers)
  - Password strength indicator
  - Secure password hashing (bcrypt)
- [ ] **Session Management**
  - Session timeout configuration
  - "Remember me" functionality
  - Secure session storage
- [ ] **Account Security**
  - Password reset functionality
  - Account lockout protection
  - Session invalidation on logout

##### **2.5.4 User Account Management**
- [ ] **Account Information**
  - View/edit profile information
  - Change password functionality
  - Account deletion option
- [ ] **Guest Information Integration**
  - Display guest details (partner, plus-one status)
  - Show RSVP status and history
  - Partner account linking

##### **2.5.5 Frontend Integration**
- [ ] **Navigation State Management**
  - Dynamic navigation based on auth status
  - Protected route access control
  - Redirect after login/logout
- [ ] **Authentication State Persistence**
  - Maintain login state across page refreshes
  - Handle browser back/forward navigation
  - Deep linking to protected pages

##### **2.5.6 Testing & Quality Assurance**
- [ ] **Authentication Flow Testing**
  - Complete user journey testing
  - Error scenario testing
  - Cross-browser compatibility
- [ ] **Security Testing**
  - Session security validation
  - Password security testing
  - Authentication bypass testing

#### **Implementation Priority:**
1. **HIGH PRIORITY**: Login status indicator and logout functionality
2. **HIGH PRIORITY**: Error handling for common scenarios
3. **MEDIUM PRIORITY**: Password security and validation
4. **MEDIUM PRIORITY**: Session management improvements
5. **LOW PRIORITY**: Advanced account management features

### Phase 6: Security & Production Hardening
- [ ] Implement comprehensive security measures
- [ ] Database security hardening
- [ ] Application security implementation
- [ ] Production deployment with security

## 🎨 Key Features

### Home Page
- ✅ Beautiful hero section with proposal photo
- ✅ Custom fonts (Lucy Said OK for brand, Great Vibes for date)
- ✅ Dynamic navbar with stable positioning
- ✅ Always accessible (no authentication required)

### Protected Pages
- **RSVP**: Form with meal preferences, dietary restrictions
- **Photos**: Upload, view, comment, upvote
- **Details**: Wedding information, schedule, location
- **Registry**: Gift registry information

### Social Features
- **Photo Attribution**: Know who uploaded each photo
- **Comments**: Users can comment on photos
- **Upvoting**: One vote per user per photo
- **Photo Sorting**: Newest, Most Popular, Most Comments

## 🔧 Technical Implementation

### Frontend Navigation Logic
```javascript
function handleNavigation(pageId) {
  if (pageId === 'home') {
    showPage('home'); // Always allow home
  } else {
    if (isLoggedIn()) {
      showPage(pageId); // Show requested page
    } else {
      showLoginModal(pageId); // Show login/register with intended page
    }
  }
}
```

### Authentication States
- **Public**: Home page only
- **Authenticated**: All pages + photo upload, comments, upvoting
- **Session Management**: Cookie-based, persistent across browser sessions

## 📝 Decisions Made

### Authentication
- **Strategy**: Hybrid approach with guest list validation
- **Method**: Name-based lookup with simple registration
- **Session**: Cookie-based authentication
- **Access Control**: Home always public, other pages require login

### Database
- **Type**: PostgreSQL 17.6
- **Hosting**: Render.com PostgreSQL add-on
- **Schema**: Normalized design with proper relationships

### File Storage
- **Photos**: Render persistent disk or AWS S3
- **Moderation**: Auto-approved (with reporting system)

### User Experience
- **Registration**: Simple username/password after name validation
- **Navigation**: Seamless redirect to intended page after login
- **Social Features**: Full commenting and upvoting system

## 🎯 Success Metrics
- [ ] All invited guests can successfully register and access the site
- [ ] RSVP system captures all necessary information
- [ ] Photo sharing is active and engaging
- [ ] Site loads quickly and works across all devices
- [ ] No authentication or navigation issues

## 📅 Timeline
- **Phase 1-2**: Backend and Authentication (Week 1-2)
- **Phase 3**: RSVP System (Week 3)
- **Phase 4**: Photo System (Week 4)
- **Phase 5**: Integration and Polish (Week 5)
- **Phase 6**: Security & Production Hardening (Week 6)

## 🔒 Security & Production Hardening

### Database Security
- [ ] **Create limited-privilege application user**
  - Separate user for application vs admin operations
  - Grant only necessary permissions (SELECT, INSERT, UPDATE, DELETE)
  - No CREATE/DROP privileges for application user
- [ ] **Environment variable management**
  - Move all passwords to secure environment variables
  - Use different passwords for development vs production
  - Implement password rotation strategy
- [ ] **Database connection security**
  - Enable SSL/TLS encryption for all connections
  - Configure connection pooling with limits
  - Implement connection timeout and retry logic
- [ ] **Backup and recovery**
  - Automated daily backups with retention policy
  - Test backup restoration procedures
  - Document disaster recovery plan
- [ ] **Database monitoring**
  - Set up database performance monitoring
  - Implement audit logging for sensitive operations
  - Configure alerts for unusual activity

### Application Security
- [ ] **Authentication & Authorization**
  - Implement secure session management
  - Add password complexity requirements
  - Implement account lockout after failed attempts
  - Add two-factor authentication for admin users
- [ ] **Input validation & sanitization**
  - Validate all user inputs on both client and server
  - Implement SQL injection prevention
  - Add XSS protection headers
  - Sanitize file uploads and user-generated content
- [ ] **API Security**
  - Implement rate limiting to prevent abuse
  - Add request size limits
  - Implement CORS properly for production
  - Add API authentication tokens
- [ ] **File upload security**
  - Validate file types and sizes
  - Scan uploaded files for malware
  - Store files outside web root
  - Implement secure file serving

### Infrastructure Security
- [ ] **Server security**
  - Configure firewall rules (only necessary ports)
  - Keep all software updated
  - Disable unnecessary services
  - Implement intrusion detection
- [ ] **Network security**
  - Use HTTPS everywhere (SSL certificates)
  - Implement secure headers (HSTS, CSP, etc.)
  - Configure proper DNS settings
  - Use CDN for static assets with security features
- [ ] **Monitoring & logging**
  - Implement comprehensive logging
  - Set up security monitoring and alerting
  - Monitor for suspicious activity
  - Regular security audits and penetration testing

### Production Deployment Security
- [ ] **Environment separation**
  - Separate development, staging, and production environments
  - Use different database instances for each environment
  - Implement proper environment variable management
- [ ] **Secrets management**
  - Use secure secret management service
  - Rotate secrets regularly
  - Never commit secrets to version control
- [ ] **Deployment security**
  - Use secure deployment pipelines
  - Implement automated security scanning
  - Use container security best practices
  - Implement blue-green deployments for zero downtime

### Compliance & Privacy
- [ ] **Data protection**
  - Implement GDPR compliance measures
  - Add privacy policy and terms of service
  - Implement data retention policies
  - Add user data export/deletion capabilities
- [ ] **Security documentation**
  - Document all security measures
  - Create incident response plan
  - Implement security training for administrators
  - Regular security reviews and updates

### Security Testing
- [ ] **Automated security testing**
  - Implement security scanning in CI/CD pipeline
  - Regular dependency vulnerability scanning
  - Automated penetration testing
  - Security code reviews
- [ ] **Manual security testing**
  - Regular security audits
  - Penetration testing by third party
  - Social engineering awareness training
  - Security incident simulation exercises

## 🎯 Current Status

### ✅ Completed Features
- **Frontend**: Beautiful home page with custom fonts and responsive design
- **Backend**: Node.js/Express server with PostgreSQL integration
- **Database**: Schema v4 with streamlined guest management and RSVP system
- **RSVP System**: Full CRUD operations, partner support, dietary restrictions
- **Guest Management**: CSV import, partner linking, plus-one handling
- **API Testing**: All endpoints tested and functional
- **Database Admin**: Secure admin user with full privileges created
- **Authentication**: Basic login/register functionality (needs redesign)

### 🚧 Critical Issues Identified
- **Schema Design Flaws**: Data duplication, missing core concepts, complex relationships
- **Authentication System Problems**: State management chaos, timing issues, poor UX
- **RSVP System Issues**: Hardcoded data, no user type detection, poor error handling
- **User Experience**: No guided flow, poor error messages, confusing navigation

### 📋 Next Steps - COMPLETE SYSTEM REDESIGN
1. **CRITICAL**: Implement new schema (v5) - Invitation-centric design
2. **CRITICAL**: Redesign authentication system - Centralized state management
3. **CRITICAL**: Redesign RSVP system - User type detection and dynamic forms
4. **HIGH**: Create migration scripts from v4 to v5
5. **HIGH**: Update all API endpoints for new schema
6. **MEDIUM**: Build admin dashboard for invitation management
7. **LOW**: Implement photo system and advanced features

### 🔒 Security Status
- ✅ **Database Admin User**: Created with proper privileges
- ✅ **Basic Database Security**: Password protection and access control
- ⚠️ **Development Security**: Acceptable for current development phase
- 🚧 **Production Security**: Comprehensive security plan documented
- 📋 **Security Checklist**: 50+ security measures identified for production

---

*Last Updated: December 20, 2024*
*Status: Schema v5 Redesign Planned - Critical Issues Identified - Complete System Redesign Required*
