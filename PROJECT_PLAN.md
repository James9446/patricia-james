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

## 📊 Database Schema (v4 - Streamlined)

### Core Tables
```sql
-- Guest list management (streamlined)
guests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  full_name VARCHAR(200) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  email VARCHAR(255) UNIQUE, -- Optional initially, added during RSVP
  phone VARCHAR(20),
  partner_id UUID REFERENCES guests(id) ON DELETE SET NULL, -- Link to partner if applicable
  plus_one_allowed BOOLEAN DEFAULT false, -- Can this guest bring a plus-one?
  admin_notes TEXT, -- Internal notes for admin use
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(first_name, last_name) -- For name-based authentication
);

-- User accounts (for photo uploads and interactions)
users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL, -- Email serves as username
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  is_admin BOOLEAN DEFAULT false, -- Admin privileges
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- RSVP responses (enhanced for flexible couple RSVPs)
rsvps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  response_status VARCHAR(20) NOT NULL CHECK (response_status IN ('attending', 'not_attending', 'pending')),
  rsvp_for_self BOOLEAN DEFAULT true, -- Is this RSVP for the guest themselves?
  rsvp_for_partner BOOLEAN DEFAULT false, -- Is this RSVP also for their partner?
  partner_attending BOOLEAN, -- Is partner attending? (NULL if not RSVPing for partner)
  partner_guest_id UUID REFERENCES guests(id) ON DELETE SET NULL, -- Reference to partner
  plus_one_attending BOOLEAN DEFAULT false,
  dietary_restrictions TEXT, -- Moved from guests table
  song_requests TEXT,
  message TEXT,
  responded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Photo uploads
photos (
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

-- Photo comments
photo_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  is_approved BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Photo upvotes (prevents duplicate votes)
photo_upvotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(photo_id, user_id)
);
```

### Key Schema Changes (v4)
- **Streamlined guests table**: Removed `is_invited`, `is_primary_guest`, `invitation_sent`, `dietary_restrictions`
- **Enhanced RSVP system**: Added partner RSVP support, moved dietary restrictions to RSVP table
- **UUID primary keys**: Better for distributed systems and security
- **Computed columns**: `full_name` automatically generated from first/last name
- **Flexible relationships**: Partners linked via `partner_id`, plus-ones handled dynamically

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

### Phase 1: Backend Foundation ✅ COMPLETED
- [x] Set up Node.js/Express server
- [x] Design and create PostgreSQL schema (v4 - streamlined)
- [x] Implement basic API endpoints (guests, RSVPs)
- [x] Database migration system
- [x] CSV import functionality for guest list
- [ ] Deploy backend to Render

### Phase 2: Authentication System
- [ ] Implement user registration with guest list validation
- [ ] Build login/logout functionality
- [ ] Create session management with cookies
- [ ] Update frontend navigation logic

### Phase 3: RSVP System ✅ COMPLETED
- [x] Build RSVP form with guest list integration
- [x] Implement RSVP status tracking
- [x] Test RSVP API endpoints (create, update, retrieve)
- [x] Frontend RSVP form integration
- [ ] Create admin dashboard for guest management

### Phase 4: Photo System
- [ ] Implement photo upload functionality
- [ ] Add photo gallery display with attribution
- [ ] Build comments and upvoting system
- [ ] Set up file storage solution

### Phase 5: Integration & Polish
- [ ] Connect frontend to backend APIs
- [ ] Add error handling and validation
- [ ] Performance optimization and testing
- [ ] Final deployment and testing

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

### 🚧 In Progress
- **Authentication System**: Ready to implement user registration and login
- **Admin Dashboard**: RSVP management interface

### 📋 Next Steps
1. Implement authentication system (Phase 2)
2. Create admin dashboard for RSVP management
3. Build photo upload and sharing system (Phase 4)
4. Implement security measures (Phase 6)
5. Deploy to Render.com with production security

### 🔒 Security Status
- ✅ **Database Admin User**: Created with proper privileges
- ✅ **Basic Database Security**: Password protection and access control
- ⚠️ **Development Security**: Acceptable for current development phase
- 🚧 **Production Security**: Comprehensive security plan documented
- 📋 **Security Checklist**: 50+ security measures identified for production

---

*Last Updated: September 16, 2025*
*Status: Phase 1 & 3 Complete - Security Plan Added - Ready for Authentication Implementation*
