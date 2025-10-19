# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Patricia y James Wedding Website - A modern, interactive wedding website with guest authentication, RSVP system, and photo sharing capabilities.

**GitHub Repository:** https://github.com/James9446/patricia-james

**Tech Stack:**
- Backend: Node.js + Express + PostgreSQL
- Frontend: Vanilla HTML/CSS/JS (no build step, no client dependencies)
- Session: PostgreSQL-based sessions (connect-pg-simple)
- Animations: GSAP with ScrollTrigger

## Current Development Priorities (IMPORTANT)

**Timeline:** Initial deployment target is 24-48 hours via Render.com

**Focus Areas (in order of priority):**

1. **UI/UX Improvements** - This is the BIGGEST problem area
   - CSS styling needs significant work throughout the site
   - Improve visual design, spacing, typography, colors
   - Enhance user experience and interactions
   - Mobile responsiveness needs attention

2. **Code Review & Refactoring**
   - Database schema needs review and possible refactoring
   - Review overall code quality and architecture
   - Identify and fix technical debt
   - Ensure code is production-ready

3. **Initial Deployment Preparation**
   - Landing page is ready and acceptable for launch
   - Other pages can show "Under Construction" placeholders
   - Photo gallery is a stretch goal for initial deploy (not essential)
   - Photo upload/approval features NOT needed for initial deploy
   - Priority: Get something live quickly, even if minimal

**What's Ready:**
- ✅ Landing page - acceptable quality for launch
- ✅ Backend architecture and database schema (needs review)
- ✅ Authentication system basics

**What Needs Work:**
- ❌ CSS styling across all pages
- ❌ UI/UX design and polish
- ❌ Photo gallery (optional for v1)
- ❌ RSVP page UI
- ❌ Events, Location, Accommodations pages (can be placeholders)

**Deployment Strategy:**
- Use Render.com for hosting
- Deploy with minimal features working
- Show "Coming Soon" or "Under Construction" for incomplete pages
- Iterate and improve after initial launch

**Important:** Refer to the README.md for the overall feature plan and roadmap. The README contains comprehensive information about planned features and development phases.

## Essential Commands

### Development Workflow

```bash
# ALWAYS run system check before starting work
./db stats

# Start development server (from server directory)
cd server && npm run dev

# Start production server
cd server && npm start
```

### Database Management

The `./db` script is the primary database tool - use it instead of direct psql commands:

```bash
# Database statistics and health check
./db stats

# View data
./db users                    # All users with partner info
./db rsvps                    # All RSVPs with user details

# Custom queries
./db sql "SELECT * FROM users WHERE account_status = 'registered';"

# Reset database (destructive - requires confirmation)
./db reset --confirm          # Clears DB and re-seeds from test-guests.csv

# Show all available commands
./db help
```

**Important:** The `./db` script loads environment variables from `.env` and prevents credential exposure. Do NOT use direct `psql` commands with hardcoded credentials or `$DATABASE_URL` expansion in shell history.

### Testing

```bash
# Test RSVP system
cd server && node tests/test-rsvp-system.js

# Test basic functionality
cd server && node tests/test-basic-functionality.js

# Run all tests
cd server && node tests/run-all-tests.js
```

### Database Setup (First Time)

```bash
# Create database
createdb patricia_james_wedding_dev

# Initialize schema (v5)
psql -d patricia_james_wedding_dev -f server/database/schema.sql

# Seed with initial data
./db reset --confirm
```

## Areas Requiring Review & Refactoring

**Database Schema:**
- Current schema (v5) uses combined table approach - needs review for scalability and maintainability
- Partner relationship logic (bidirectional foreign keys) - verify this is the best approach
- RSVP pattern (individual records per person) - evaluate if this creates unnecessary complexity
- Soft delete pattern (deleted_at) - ensure it's consistently applied
- Consider if schema migrations are properly structured

**Code Quality:**
- Review error handling patterns across API routes
- Check for potential security vulnerabilities (SQL injection prevention, session security)
- Evaluate authentication flow for edge cases
- Review file upload handling and validation
- Assess code organization and separation of concerns

**Performance:**
- Database query optimization (check for N+1 queries)
- Index usage and query performance
- Session storage cleanup strategy
- Large file upload handling

**Technical Debt:**
- Inconsistent error response formats
- Missing validation in some endpoints
- Incomplete photo system implementation
- Test coverage is minimal

**Before Deployment:**
- Security audit (especially authentication and session handling)
- Environment variable validation
- Error logging strategy for production
- Database backup strategy

## Architecture

### Database Schema (v5 - Combined Table Approach)

**Key Design Principle:** Single `users` table for ALL guests and registered users. No separate `guests` table.

**NOTE:** This schema design needs review. Consider whether the current approach is optimal for the use case.

**Users Table:**
- `account_status`: 'guest' (default) → 'registered' (after email/password setup)
- `email` and `password_hash`: NULL until registration
- `partner_id`: Self-referential foreign key for couples
- `plus_one_allowed`: Boolean flag for individual guests
- Soft deletes via `deleted_at` timestamp (never hard delete)

**RSVPs Table:**
- Individual RSVP records per person (not per couple)
- `user_id`: The person this RSVP is for
- `partner_id`: If RSVPing on behalf of partner
- Either partner can create/update RSVPs for both

**Photos Table:**
- User-uploaded photos with admin approval workflow
- Category support via `photo_categories` table
- Optimization tracking (original, optimized, thumbnail)
- Upvotes and comments support

**Sessions:**
- PostgreSQL-backed sessions in `user_sessions` table
- 30-day session lifetime
- Automatically cleaned by connect-pg-simple

### Guest and User Workflow

1. **Initial State:** All guests seeded from CSV with names only (account_status='guest')
2. **Check Guest:** User enters first/last name → system looks up in users table
3. **Registration:** User provides email/password → updates existing user record
4. **Authentication:** Standard email/password login with sessions

**Partner Logic:**
- Partners are linked bidirectionally via `partner_id`
- Either partner can RSVP for both (creates 2 RSVP records)
- Partner RSVPs have `partner_id` field populated
- Frontend shows partner's RSVP status when present

**Plus-One Logic:**
- Plus-ones become real users in the `users` table
- Created during RSVP submission if guest has `plus_one_allowed=true`
- Plus-one gets their own `user_id` for separate dietary restrictions/preferences

### API Structure

**Routes:**
- `/api/auth/*` - Authentication (check-guest, register, login, logout, /me)
- `/api/rsvps/*` - RSVP management (GET, POST, PUT)
- `/api/photos/*` - Photo uploads and retrieval
- `/api/categories/*` - Photo categories

**Authentication Middleware:**
- Session-based authentication (no JWT in current implementation)
- Routes check `req.session.userId` for authenticated user
- Frontend JavaScript in `client/src/js/auth.js` handles auth state

**Database Connection:**
- Configured in `server/src/config/db.js`
- Uses connection pool from `pg` package
- Connection string from `DATABASE_URL` environment variable

### Frontend Architecture

**Single-Page Application:**
- No build step, no bundler
- Navigation handled by `main.js` via `data-page` attributes
- Pages toggled with `.active` class
- All pages in single `index.html` file

**JavaScript Modules:**
- `auth.js` - Registration, login, session management
- `rsvp.js` - RSVP form submission and partner logic
- `photos.js` - Photo upload and display
- `main.js` - SPA routing, mobile menu, animations

**Styling:**
- Custom CSS in `client/src/css/styles.css`
- Google Fonts: Cormorant Garamond, Inter, Playfair Display, Dancing Script
- Responsive design with mobile-first approach

### UI/UX Considerations

**Current Issues to Address:**
- CSS needs comprehensive review and improvement
- Inconsistent spacing and layout across pages
- Typography hierarchy may need refinement
- Color scheme and visual design need polish
- Mobile responsiveness requires testing and fixes
- User interactions and feedback (buttons, forms, transitions)

**Design Approach:**
- Elegant, romantic aesthetic appropriate for wedding website
- Clean, modern interface with good readability
- Smooth animations and transitions (GSAP already integrated)
- Accessible and user-friendly forms (especially RSVP)

**When Working on UI/UX:**
- Prioritize visual consistency across all pages
- Test responsive design on mobile, tablet, desktop
- Ensure sufficient color contrast for accessibility
- Keep interactions intuitive and simple
- Use the existing font stack effectively

## Deployment

### Render.com Deployment

**Backend Deployment:**
1. Create new Web Service on Render
2. Connect to GitHub repository
3. Set build command: `cd server && npm install`
4. Set start command: `cd server && npm start`
5. Add environment variables (see below)

**Environment Variables for Production:**
```env
DATABASE_URL=<Render PostgreSQL connection string>
SESSION_SECRET=<generate secure random string>
NODE_ENV=production
PORT=10000
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
```

**Database Setup on Render:**
1. Create PostgreSQL database in Render
2. Copy DATABASE_URL from Render dashboard
3. Run schema initialization:
   ```bash
   psql <DATABASE_URL> -f server/database/schema.sql
   ```
4. Seed initial data via `./db reset --confirm` (run locally pointing to production DB)

**Static Files:**
- Express serves `client/src` directory
- No separate frontend deployment needed
- All static assets served from same web service

**Post-Deployment:**
- Test health endpoint: `https://<app-name>.onrender.com/api/health`
- Verify landing page loads correctly
- Check database connectivity
- Test authentication flow

## Important Patterns

### Database Queries

**Always use parameterized queries:**
```javascript
await query('SELECT * FROM users WHERE id = $1', [userId]);
```

**Check for soft deletes:**
```sql
WHERE deleted_at IS NULL
```

**Get user with partner:**
```sql
SELECT u.*, p.first_name as partner_first_name
FROM users u
LEFT JOIN users p ON u.partner_id = p.id
WHERE u.id = $1 AND u.deleted_at IS NULL
```

### RSVP Creation Pattern

When creating RSVPs for a couple:
1. Create RSVP for user (user_id=user, partner_id=NULL)
2. Create RSVP for partner (user_id=partner, partner_id=user)
3. Both RSVPs have same response_status but can have different dietary_restrictions

### CSV Guest Import

**Format:** `first_name,last_name,plus_one_allowed,partner_first_name,partner_last_name,admin_notes`

**Process:**
1. Parse CSV from `server/test-guests.csv`
2. Insert all guests with account_status='guest'
3. Link partners using partner_first_name/partner_last_name matching
4. Automatically runs during `./db reset --confirm`

## Environment Variables

Required in `server/.env`:

```env
PORT=5001
DATABASE_URL="postgresql://username:password@host:port/database_name"
SESSION_SECRET="random-secret-key"
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=10485760
```

## Photo System (Phase 6 - In Progress)

**Current Implementation:**
- Database schema ready (photos, photo_categories, photo_comments, photo_upvotes)
- Migration file: `server/database/migrations/006_photo_system_v6_safe.sql`
- Routes: `server/src/routes/photos.js`, `server/src/routes/categories.js`
- Frontend: `client/src/js/photos.js`

**Photo Upload Flow:**
1. User uploads photo via frontend form
2. Multer middleware handles multipart/form-data
3. Sharp library optimizes images (creates thumbnail + optimized version)
4. Photo record saved with is_approved=false
5. Admin approves photos for public display

**Categories:**
- Pre-seeded categories (e.g., "Engagement", "Wedding Day", "Reception")
- Each photo can belong to one category
- Categories have display_order for sorting

## Testing Strategy

**Manual API Testing:**
```bash
# Health check
curl http://localhost:5001/api/health

# Check guest
curl -X POST http://localhost:5001/api/auth/check-guest \
  -H "Content-Type: application/json" \
  -d '{"first_name": "John", "last_name": "Smith"}'

# Get RSVPs (requires session cookie)
curl -X GET http://localhost:5001/api/rsvps
```

**Automated Tests:**
- Located in `server/tests/`
- Run with Node.js (no test framework dependency)
- Test files connect to dev database via same config

## Common Development Tasks

### Improving UI/UX and Styling (PRIORITY)

**Workflow for CSS improvements:**
1. Identify the page or component needing work
2. Review current styles in `client/src/css/styles.css`
3. Test changes locally with live reload (`npm run dev`)
4. Test responsive design (mobile, tablet, desktop)
5. Ensure changes don't break other pages
6. Consider accessibility (color contrast, font sizes, focus states)

**Key areas to review:**
- `client/src/css/styles.css` - Main stylesheet
- Page layouts and spacing consistency
- Form styling (especially RSVP form)
- Button and link hover states
- Mobile navigation and responsiveness
- Typography scale and hierarchy

**Testing UI changes:**
```bash
# Start dev server
cd server && npm run dev

# View site at http://localhost:5001
# Test all pages: home, rsvp, events, location, photos, accommodations
# Use browser dev tools to test responsive breakpoints
```

### Creating "Under Construction" Pages

For pages not ready for initial deploy:

```html
<!-- Add to the page div in index.html -->
<div id="page-name" class="page">
  <div class="under-construction">
    <h1>Coming Soon</h1>
    <p>This page is currently under construction. Check back soon!</p>
  </div>
</div>
```

```css
/* Add to styles.css */
.under-construction {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
  padding: 2rem;
}
```

### Adding a New API Endpoint

1. Create or edit route file in `server/src/routes/`
2. Import route in `server/src/index.js`
3. Mount route: `app.use('/api/endpoint', routerName);`
4. Test with curl or frontend

### Database Schema Changes

1. Create migration SQL file in `server/database/migrations/`
2. Use `IF NOT EXISTS` checks for idempotency
3. Update main schema.sql for fresh installations
4. Test migration: `psql -d patricia_james_wedding_dev -f migration.sql`

### Adding Frontend Page

1. Add page div in `client/src/index.html` with unique id
2. Add navigation link with `data-page="page-id"`
3. Styling in `client/src/css/styles.css`
4. JavaScript in appropriate module or `main.js`

## Troubleshooting

### Database Connection Issues

If you see "database James does not exist" or connection errors:
- Ensure PostgreSQL is running: `brew services list | grep postgresql`
- Verify DATABASE_URL in `.env` is correct
- Use `./db stats` instead of direct psql commands

### Session Issues

Sessions stored in database - if session errors occur:
- Check `user_sessions` table exists
- Verify `connect-pg-simple` is installed
- Clear expired sessions: `DELETE FROM user_sessions WHERE expire < NOW();`

### RSVP Not Saving

Common issues:
- User not authenticated (check req.session.userId)
- Partner logic not creating second RSVP record
- Response status validation (must be 'attending', 'not_attending', or 'pending')

## Photo Optimization Process

**IMPORTANT: Use this process for all user-uploaded photos in the future**

When implementing photo upload features, photos must be optimized for web performance:

### Optimization Specifications:
- **Max Width**: 2000px (resize larger images)
- **Quality**: 85% JPEG
- **Format**: Progressive JPEG
- **Expected Size**: 250-700KB per photo (95%+ reduction from originals)

### Implementation Using Sharp:
```javascript
const sharp = require('sharp');

await sharp(inputBuffer)
  .resize(2000, null, {
    fit: 'inside',
    withoutEnlargement: true
  })
  .jpeg({ quality: 85, progressive: true })
  .toFile(outputPath);
```

### Results from Engagement Photos:
- **Original**: 282.1MB total (27 photos, 10-15MB each)
- **Optimized**: 13.0MB total (27 photos, 250-680KB each)
- **Reduction**: 95.4% smaller, 21x faster loading

### Script Location:
`/server/scripts/optimize-static-photos.js`

### Future User Upload Flow:
1. User uploads photo (any size)
2. Save original to `/uploads/photos/original_[uuid].jpg`
3. Immediately optimize to `/uploads/photos/optimized_[uuid].jpg`
4. Serve optimized version to users
5. Keep original for admin/high-res downloads


## Deferred Features (Post-Initial Deployment)

### Phase 1: Database-Driven Photo Gallery System
**Status**: Currently using static filesystem photos
**Priority**: Second major feature after initial deployment

**Current Implementation:**
- Static photo array in `photos.js` (27 engagement photos)
- Photos served from `/images/engagement-photos-optimized/`
- No database integration

**Required for Full Implementation:**
1. **Database Schema Updates** - Create migration for:
   - `photo_categories` table (name, slug, is_active, display_order)
   - Rename `photo_upvotes` to `photo_likes` for consistency
   - Add missing fields to `photos` table:
     - `category_id` (FK to photo_categories)
     - `optimized_filename` (web-optimized version)
     - `thumbnail_filename` (thumbnail version)
     - `file_hash` (SHA256 for duplicate detection)
     - `display_order` (manual ordering)
     - `is_optimized` (processing status)
     - `optimized_at` (timestamp)
     - `optimized_file_size` (size tracking)

2. **Photo Upload Flow** (see "Photo Optimization Process" section above):
   - User uploads photo via form
   - Save original: `/uploads/photos/original_[uuid].jpg`
   - Background optimization: resize to 2000px, 85% quality, progressive JPEG
   - Save optimized: `/uploads/photos/optimized_[uuid].jpg`
   - Generate thumbnail: 300x300 cover crop
   - Store all versions in database
   - Serve optimized version to users

3. **API Routes** (already exist but need schema):
   - `GET /api/photos` - List approved photos with pagination
   - `POST /api/photos` - Upload single photo
   - `POST /api/photos/batch` - Upload multiple photos (max 20)
   - `GET /api/photos/:id` - Get single photo with metadata
   - `POST /api/photos/:id/likes` - Like a photo
   - `DELETE /api/photos/:id/likes` - Unlike a photo
   - `POST /api/photos/:id/comments` - Add comment
   - `GET /api/photos/:id/comments` - Get comments
   - `GET /api/categories` - List photo categories

4. **Frontend Updates**:
   - Switch from static array to API calls
   - Add upload form (authenticated users only)
   - Category filtering from database
   - Like/comment functionality
   - Admin approval workflow

**Migration Path:**
```sql
-- Create photo_categories table
-- Add new columns to photos table
-- Rename photo_upvotes to photo_likes
-- Seed with initial categories (engagement, timeline, childhood, etc.)
-- Migrate existing 27 engagement photos to database
```

### Phase 2: User Photo Upload & Moderation
**Status**: Not started
**Priority**: After database-driven gallery is working

**Features:**
- Authenticated users can upload photos
- Batch upload support (up to 20 photos at once)
- Automatic optimization pipeline (background processing with Sharp)
- Duplicate detection using file hash
- Admin moderation queue (approve/reject)
- Photo tagging and categorization
- Like and comment system
- Featured photo selection

**Technical Considerations:**
- File size limits (none currently, but consider for production)
- Storage strategy (local filesystem vs S3/cloud storage)
- Image processing queue (async with job queue?)
- Moderation workflow (email notifications?)
- User upload quotas (prevent abuse)

---

## Current Status Summary

**✅ Working & Ready for Deployment:**
- Home page (unchanged, looks great)
- Authentication system (register, login, logout)
- RSVP form (submit and update RSVPs)
- Static photo gallery (27 engagement photos, optimized)
- Responsive navigation with glassmorphism
- Modern UI with gradients and animations

**✅ Recently Improved:**
- Navbar with glassmorphism (all pages except home)
- Standardized form inputs (consistent 14px padding)
- Modern button design (gradient backgrounds, hover animations)
- Enhanced card components (softer shadows, hover effects)
- Event cards redesigned (color-coded gradients)
- Photo optimization (95.4% size reduction, 21x faster loading)

**⏳ In Progress:**
- Location page styling
- Accommodations page styling

**🔮 Deferred to Post-Launch:**
- Database-driven photo gallery
- User photo upload system
- Photo moderation/approval workflow
- Advanced photo features (likes, comments, featured)

