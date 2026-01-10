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

## CRITICAL DEVELOPMENT RULES

### 🚨 DATABASE SAFETY RULES - ABSOLUTE PRIORITY

**CRITICAL:** Database changes can cause catastrophic data loss. Follow these rules without exception.

#### ⛔ NEVER Touch Production Database

**ABSOLUTE RULE:** You must NEVER make ANY changes to the production database. Not reads, not writes, not schema changes, NOTHING.

- ❌ NEVER connect to production database
- ❌ NEVER run queries against production database
- ❌ NEVER modify production data
- ❌ NEVER apply migrations to production database
- ❌ NEVER run scripts against production database

**Only Exception:** Reading from production database dump files that user has explicitly provided in `/tmp/` directory for restoration purposes.

#### ⚠️ Development Database Changes Require Explicit Plan

**BEFORE making ANY changes to the development database:**

1. **STOP and INVESTIGATE** - Never immediately "fix" database issues
   - Understand WHY the problem exists
   - Check what data currently exists
   - Assess the impact of any changes
   - Identify root cause before taking action

2. **CREATE EXPLICIT PLAN** - Present detailed plan to user
   - What exactly will be changed
   - What data will be affected
   - What backup strategy will be used
   - What the expected outcome is
   - Alternative approaches considered

3. **GET EXPLICIT APPROVAL** - User must approve the plan
   - Wait for clear "yes" or "proceed"
   - Never assume approval
   - If unsure, ask again

4. **BACKUP FIRST** - Always create backup before destructive operations
   ```bash
   # Always backup before ANY destructive database operation
   pg_dump patricia_james_wedding_dev > backups/before_[operation]_$(date +%Y%m%d_%H%M%S).sql
   ```

5. **WARN STRONGLY** - Issue clear warning before execution
   - "⚠️ WARNING: About to [drop/modify/delete] [what]. This will [impact]. Backup created at [path]. Proceeding..."

#### 🚫 Prohibited Database Operations Without Explicit Plan

These operations are FORBIDDEN without following the process above:

- ❌ `dropdb` (dropping database)
- ❌ `DROP TABLE` (dropping tables)
- ❌ `TRUNCATE` (clearing table data)
- ❌ `DELETE FROM` without WHERE clause
- ❌ `UPDATE` affecting multiple critical records
- ❌ Schema migrations on existing data
- ❌ `./db reset` (resets entire database)

#### ✅ Safe Database Operations

These are generally safe but still require care:

- ✅ `SELECT` queries (read-only)
- ✅ `./db stats` (read-only statistics)
- ✅ `./db users` (read-only view)
- ✅ `./db rsvps` (read-only view)
- ✅ Single-record INSERT (if part of approved plan)
- ✅ Single-record UPDATE with specific WHERE clause (if part of approved plan)

#### 🔍 When Database Issues Occur

**NEVER immediately run destructive operations. Instead:**

1. **Investigate First**
   - What error occurred?
   - What does the current database state look like?
   - When did this issue start?
   - What changed recently?

2. **Gather Information**
   - Check current data: `./db stats`, `./db users`
   - Check logs for clues
   - Check git history for recent changes
   - Check if production is affected

3. **Present Findings to User**
   - "I found [issue]. Current state is [description]. Possible causes: [list]. Recommended approach: [plan]. Shall I proceed?"

4. **Wait for Approval**
   - Do not proceed until user explicitly approves

#### Why This Matters

**Previous Incident:** Carelessly dropped development database without investigation, destroying:
- 256 photos (weeks of work)
- 6 registered users
- All RSVPs and data

This was caused by:
- Not investigating WHY schema was wrong
- Not checking what data existed
- Not creating backup first
- Not asking about data importance
- Immediately jumping to "fix" by dropping database

**Never let this happen again.**

---

### ⛔ NEVER Push to GitHub Without User Testing

**ABSOLUTE RULE:** You must NEVER push any code to GitHub until the user has explicitly tested the changes and given permission to push.

**Workflow:**
1. ✅ Make code changes as requested
2. ✅ Commit changes locally (so they're saved)
3. ✅ User tests changes thoroughly
4. ⛔ **STOP** - Do NOT push to GitHub yet
5. ✅ User explicitly says "push to production" or "push to GitHub"
6. ✅ ONLY THEN can you run `git push`

**Why This Matters:**
- Production site is live at patriciajames.fyi
- Untested changes can break the site for wedding guests
- User needs to verify changes work as expected before deployment
- Render auto-deploys from GitHub (push = instant production deploy)

**If User Asks to "Deploy" or "Push Changes":**
- First confirm: "I see you have uncommitted changes. Would you like me to commit them locally first so you can test?"
- After testing: "Have you tested these changes and verified they work correctly?"
- Only after explicit confirmation: Push to GitHub

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

### Render.com Deployment - Complete Guide

**Production URL:** https://patriciajames.fyi
**Platform:** Render.com (Free tier → Starter $7/month recommended)
**Database:** Render PostgreSQL (Free tier → Starter $7/month for persistence)
**Custom Domain:** AWS Route 53

---

### Part 1: Database Setup

**Step 1: Create PostgreSQL Database**
1. Go to Render Dashboard → **"New +"** → **"PostgreSQL"**
2. Configure:
   - Name: `patricia-james-wedding-db`
   - Database: `patricia_james_wedding` (auto-filled)
   - Region: **Oregon (US West)** (same as web service)
   - Plan: Free (or Starter $7/month for persistence beyond 90 days)
3. Click **"Create Database"**

**Step 2: Copy Database URLs**
After creation, you'll see two URLs:
- **Internal Database URL** (use this for web service)
- **External Database URL** (use for local migrations)

**Step 3: Initialize Schema**
```bash
# Use EXTERNAL URL for migrations from local machine
psql "postgresql://user:pass@host.oregon-postgres.render.com:5432/db" \
  -f server/database/schema.sql

# Seed guest data (if using seed file)
psql "postgresql://user:pass@host.oregon-postgres.render.com:5432/db" \
  -f server/database/seed-v5.sql
```

---

### Part 2: Web Service Setup

**Step 1: Create Web Service**
1. Render Dashboard → **"New +"** → **"Web Service"**
2. Connect GitHub repository: `James9446/patricia-james`
3. Configure:
   - **Name**: `patricia-james-wedding`
   - **Region**: **Oregon (US West)** (same as database!)
   - **Branch**: `initial-deployment` (or `main`)
   - **Root Directory**: Leave blank
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`
   - **Health Check Path**: `/api/health`
   - **Plan**: Free (or Starter $7/month for no cold starts)

**Step 2: Add Environment Variables**

⚠️ **CRITICAL:** Environment variables must be set in Render UI, not in code!

Go to **Environment** tab and add:

| Key | Value | Notes |
|-----|-------|-------|
| `NODE_ENV` | `production` | Required for secure cookies |
| `DATABASE_URL` | `postgresql://...` | ⚠️ Use **INTERNAL** URL from Step 1 |
| `SESSION_SECRET` | `<generate>` | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `CORS_ORIGIN` | `https://patriciajames.fyi` | Your custom domain (update after DNS setup) |

**Step 3: Deploy**
- Click **"Create Web Service"** or **"Manual Deploy"**
- Wait 2-3 minutes for build and deployment
- Check logs for successful startup

---

### Part 3: Critical Code Configuration

⚠️ **REQUIRED:** Trust Proxy Setting

Render uses Cloudflare proxy. Express MUST trust the proxy for secure cookies to work:

```javascript
// server/src/index.js
app.set('trust proxy', 1);  // CRITICAL - must be set before session middleware
```

**Without this setting:**
- ❌ Set-Cookie headers won't be sent
- ❌ Sessions won't work
- ❌ Users can't login/register

This is already in the code at `server/src/index.js:18`.

---

### Part 4: Custom Domain Setup (patriciajames.fyi)

**Step 1: Add Domain in Render**
1. Web Service → **Settings** → **Custom Domain**
2. Click **"Add Custom Domain"**
3. Enter: `patriciajames.fyi`
4. Render shows DNS records (copy these!)

**Step 2: Configure DNS in AWS Route 53**
1. AWS Console → **Route 53** → **Hosted Zones**
2. Click `patriciajames.fyi`
3. **Create A Record:**
   - Record name: (blank)
   - Type: **A**
   - Value: Render's IP addresses (from Step 1, one per line)
   - TTL: `300`
4. **Create CNAME Record** (optional for www):
   - Record name: `www`
   - Type: **CNAME**
   - Value: `patricia-james.onrender.com`
   - TTL: `300`

**Step 3: Update CORS_ORIGIN**
After DNS propagates, update environment variable:
- `CORS_ORIGIN` → `https://patriciajames.fyi`
- Save changes (triggers redeploy)

**Step 4: Wait for SSL**
- Render auto-provisions Let's Encrypt SSL certificate
- Takes 5-15 minutes after DNS propagates
- Site will be available at `https://patriciajames.fyi`

---

### Part 5: Deployment Verification

**Check 1: Health Endpoint**
```bash
curl https://patriciajames.fyi/api/health
# Should return: {"status":"UP","environment":"production",...}
```

**Check 2: Database Connection**
- Look for "✅ Database connected successfully" in logs
- Look for "📊 Current user count: X" in logs

**Check 3: Session Cookies**
1. Visit site in browser
2. Register a test user
3. F12 → Network → POST /api/auth/register → **Response Headers**
4. **Must see:** `Set-Cookie: connect.sid=...`
5. F12 → Application → Cookies → Should see `connect.sid` cookie

**Check 4: RSVP Flow**
1. Login as registered user
2. Navigate to RSVP page
3. Should load without 401 errors
4. Submit RSVP successfully

---

### Deployment Strategy: Free vs Paid

**Free Tier ($0/month):**
- ✅ Good for testing/development
- ❌ Cold starts (50+ seconds after 15min inactivity)
- ❌ Database expires after 90 days
- ❌ Limited to 750 hours/month
- ⚠️ **Manual deploys recommended** (limited deploy quota)

**Starter Tier ($14/month total):**
- ✅ Web Service: $7/month (no cold starts, always running)
- ✅ Database: $7/month (permanent, doesn't expire)
- ✅ Better performance
- ✅ Unlimited deploys
- ✅ Custom domains included

**Recommendation:** Start on free tier for testing, upgrade to Starter before sending invitations to guests.

---

### Manual Deploy Workflow (Free Tier)

Since free tier has limited deploy quota:

1. Make changes locally and test
2. Commit to `initial-deployment` branch
3. Push to GitHub: `git push origin initial-deployment`
4. **Wait** - don't auto-deploy yet
5. Batch multiple changes together
6. Go to Render → **"Manual Deploy"** when ready
7. Select branch and deploy

**Auto-Deploy:** Can be enabled in Settings → Build & Deploy, but uses quota faster.

---

### Environment Variables - Production Checklist

✅ **Required:**
- `NODE_ENV=production`
- `DATABASE_URL` (Internal URL from Render PostgreSQL)
- `SESSION_SECRET` (32+ character random hex)
- `CORS_ORIGIN=https://patriciajames.fyi`

✅ **Auto-Set by Render:**
- `PORT` (Render sets this, don't override)

❌ **Not Needed:**
- `UPLOAD_DIR` (not used in current static photo implementation)
- `MAX_FILE_SIZE` (not used until user uploads are implemented)

---

### Important Database Notes

**Use Internal vs External URLs:**
- **Web Service → Database:** Internal URL (faster, secure, free bandwidth)
- **Local Machine → Database:** External URL (for migrations, manual queries)
- Internal URL format: `postgresql://...@dpg-xxx.oregon-postgres.render.com/db`
- External URL format: `postgresql://...@dpg-xxx.oregon-postgres.render.com:5432/db`

**Session Storage:**
- Sessions stored in `user_sessions` table (PostgreSQL-backed)
- 30-day session lifetime
- Automatically cleaned by connect-pg-simple
- Persists across server restarts

---

### Troubleshooting Production Issues

**Issue: No cookies being set**
- ✅ Check `app.set('trust proxy', 1)` is in index.js
- ✅ Check `NODE_ENV=production` is set
- ✅ Check response headers for `Set-Cookie`

**Issue: 401 Unauthorized on /api/rsvps**
- ✅ Check `CORS_ORIGIN` matches URL you're accessing
- ✅ Check cookie is being sent (Network → Request Headers → Cookie)
- ✅ Check session exists in database: `SELECT * FROM user_sessions;`

**Issue: Database connection fails**
- ✅ Use **Internal Database URL** not External
- ✅ Ensure web service and database in same region
- ✅ Check DATABASE_URL is set in environment variables

**Issue: Plus-ones can't register**
- ✅ Email validation should exclude current user_id
- ✅ Check `account_status='guest'` vs `'registered'`
- ✅ Fixed in commit `6ec640c`

---

### Post-Deployment Configuration

**Static Files:**
- Express serves `client/src` directory
- No separate frontend deployment needed
- All static assets served from same web service
- Optimized engagement photos (13MB, 27 images)

**Pages Status:**
- ✅ Home (hero with transparent navbar)
- ✅ RSVP (full functionality)
- ✅ Events (ceremony & reception)
- ✅ Photos (static gallery with lightbox)
- 🚧 Location (under construction)
- 🚧 Accommodations (under construction)

**SSL/HTTPS:**
- Automatic Let's Encrypt SSL certificate
- Force HTTPS enabled by default
- HTTP automatically redirects to HTTPS

**Monitoring:**
- Check `/api/health` endpoint
- Monitor Render logs for errors
- Watch database size (free tier: 1GB limit)

---

### Key Lessons Learned

1. **Trust Proxy is Critical:** Render/Cloudflare require `app.set('trust proxy', 1)` for secure cookies
2. **Use Internal Database URL:** For web service connections (faster, secure, free)
3. **Environment Variables in Render UI:** Not in code or .env file
4. **Auto-Login After Registration:** Session must be created in registration endpoint
5. **Plus-One Registration:** Email validation must exclude current user's email
6. **Manual Deploys on Free Tier:** Conserve deploy quota by batching changes
7. **Custom Domain DNS:** A records for root, CNAME for www
8. **SSL is Automatic:** Let's Encrypt provisioned automatically after DNS propagates

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

