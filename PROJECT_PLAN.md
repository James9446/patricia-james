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

## 📊 Database Schema

### Core Tables
```sql
-- Guest list management
guests (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  rsvp_status VARCHAR(50) DEFAULT 'pending',
  plus_one_allowed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User accounts
users (
  id SERIAL PRIMARY KEY,
  guest_id INTEGER REFERENCES guests(id),
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

-- RSVP responses
rsvps (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  attending BOOLEAN NOT NULL,
  meal_preference VARCHAR(100),
  dietary_restrictions TEXT,
  plus_one_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Photo uploads
photos (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  caption TEXT,
  upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  upvote_count INTEGER DEFAULT 0
);

-- Photo comments
photo_comments (
  id SERIAL PRIMARY KEY,
  photo_id INTEGER REFERENCES photos(id),
  user_id INTEGER REFERENCES users(id),
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Photo upvotes (prevents duplicate votes)
photo_upvotes (
  id SERIAL PRIMARY KEY,
  photo_id INTEGER REFERENCES photos(id),
  user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(photo_id, user_id)
);
```

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

### Phase 1: Backend Foundation
- [ ] Set up Node.js/Express server
- [ ] Design and create PostgreSQL schema
- [ ] Implement basic API endpoints
- [ ] Deploy backend to Render

### Phase 2: Authentication System
- [ ] Implement user registration with guest list validation
- [ ] Build login/logout functionality
- [ ] Create session management with cookies
- [ ] Update frontend navigation logic

### Phase 3: RSVP System
- [ ] Build RSVP form with guest list integration
- [ ] Create admin dashboard for guest management
- [ ] Implement RSVP status tracking

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

---

*Last Updated: [Current Date]*
*Status: Planning Complete - Ready for Implementation*
