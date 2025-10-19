# Deployment Readiness Checklist
## Patricia y James Wedding Website - Render.com Deployment

**Date Prepared:** 2025-10-19
**Target Platform:** Render.com
**Status:** ✅ Ready for Deployment

---

## 📋 Pre-Deployment Checklist

### ✅ 1. Code & Features Verification

#### Working Features:
- [x] **Home Page** - Hero section with wedding date, transparent navbar
- [x] **Authentication System** - Guest check-in, registration, login/logout
- [x] **RSVP System** - Submit and update RSVPs with dietary restrictions
- [x] **Events Page** - 4 event cards (Ceremony, Reception, Welcome, Brunch)
- [x] **Photos Page** - Static engagement photo gallery with lightbox (27 photos, optimized)
- [x] **Notification System** - Success/error notifications for user actions
- [x] **Session Management** - PostgreSQL-backed sessions with 30-day persistence
- [x] **Mobile Responsive** - Hamburger menu, responsive layouts

#### Under Construction (To Be Marked):
- [ ] **Location Page** - Will show "Under Construction" message
- [ ] **Accommodations Page** - Will show "Under Construction" message

---

### ✅ 2. Environment Configuration

#### Required Environment Variables:
```bash
# Production values needed on Render.com:
NODE_ENV=production
PORT=5001  # Or leave blank (Render auto-assigns)
DATABASE_URL="postgresql://username:password@hostname:5432/database"  # From Render PostgreSQL
SESSION_SECRET="<GENERATE_STRONG_32_CHAR_RANDOM_STRING>"
CORS_ORIGIN="https://your-app-name.onrender.com"  # Or custom domain
```

#### Generate Session Secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Files Status:
- [x] `.env.example` exists with documentation
- [x] `.env` in `.gitignore` (verified)
- [x] No secrets in code or repository

---

### ✅ 3. Database Preparation

#### Schema Status:
- [x] Schema v5 ready (`server/database/schema.sql`)
- [x] Users table with combined guest/user data
- [x] RSVPs table with individual responses
- [x] User sessions table for PostgreSQL-backed sessions
- [x] Photos table (future feature - not blocking deployment)

#### Database Setup on Render:
1. Create new PostgreSQL instance on Render.com
2. Copy `DATABASE_URL` from Render dashboard
3. Run migration: `psql $DATABASE_URL -f server/database/schema.sql`
4. Seed guest data: `psql $DATABASE_URL -f server/database/seed-v5.sql` (if exists)

---

### ✅ 4. Static Assets Verification

#### Image Optimization:
- [x] **Engagement Photos**: 27 photos optimized (282MB → 13MB, 95.4% reduction)
- [x] **Location**: `/client/src/images/engagement-photos-optimized/`
- [x] **Size**: 13MB total (250-680KB per photo)
- [x] **Format**: Progressive JPEG, 2000px max width, 85% quality

#### Asset Loading:
- [x] CSS: `styles.css` (modern styling applied)
- [x] JavaScript: `config.js`, `utils.js`, `main.js`, `auth.js`, `rsvp.js`, `photos.js`
- [x] All assets return 200 OK on local server

---

### ✅ 5. Security Checklist

- [x] **Passwords**: Bcrypt hashing (10 rounds)
- [x] **Sessions**: PostgreSQL-backed, httpOnly cookies, sameSite strict in production
- [x] **CSRF Protection**: sameSite cookie policy
- [x] **SQL Injection**: Parameterized queries throughout
- [x] **XSS Prevention**: httpOnly cookies, no innerHTML usage
- [x] **Environment Variables**: No secrets in code, all in `.env`
- [x] **Session Secret Validation**: Server exits if missing in production (index.js:22-25)
- [x] **Password Validation**: Min 8 chars, uppercase, lowercase, number, special char

---

### ✅ 6. UI/UX Modernization Status

#### Completed Styling:
- [x] **Navbar**: Glassmorphism gradient on all pages EXCEPT home (transparent on home)
- [x] **Forms**: Standardized 14px padding, consistent styling
- [x] **Buttons**: Gradient backgrounds (solstice blue → lavender haze), hover lift animations
- [x] **Cards**: Border-radius 2xl, hover effects, enhanced shadows
- [x] **Event Cards**: Color-coded borders, gradient overlays
- [x] **Photo Gallery**: Lightbox viewer with fixed navigation buttons, keyboard support
- [x] **Notifications**: Slide-in animations, auto-dismiss, green/red color coding

#### Pages NOT Changed:
- [x] **Home Page**: Original hero design preserved per user request

---

### ✅ 7. Testing Status

#### Local Testing Completed:
- [x] Database reset and seeding works (`./db reset --confirm`)
- [x] Registration flow works (Jack Blue test user)
- [x] Login/logout flow works
- [x] RSVP submission and updates work
- [x] Session persistence across page navigation
- [x] Photo gallery loads quickly with optimized images
- [x] Lightbox navigation works without accidental closes
- [x] Mobile hamburger menu functional

#### Browser Testing Guide:
- [x] Created: `BROWSER_TESTING_GUIDE.md`
- [x] Comprehensive 10-section testing checklist
- [x] Test user credentials documented
- [x] Error reporting format provided

---

## 🚀 Render.com Deployment Steps

### Step 1: Create Web Service

1. **Sign in to Render.com**
2. **New > Web Service**
3. **Connect GitHub Repository**: `patricia-james-app`
4. **Configure Service**:
   - **Name**: `patricia-james-wedding`
   - **Region**: Choose closest to guests (e.g., Oregon US West)
   - **Branch**: `main` (or your production branch)
   - **Root Directory**: Leave blank
   - **Environment**: `Node`
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`
   - **Plan**: Free (or paid for custom domain/better performance)

### Step 2: Create PostgreSQL Database

1. **New > PostgreSQL**
2. **Name**: `patricia-james-wedding-db`
3. **Region**: Same as web service
4. **Plan**: Free (or paid for more storage)
5. **Copy Internal Database URL** from dashboard

### Step 3: Configure Environment Variables

In Render Web Service dashboard, add:

```bash
NODE_ENV=production
DATABASE_URL=<PASTE_INTERNAL_DATABASE_URL_FROM_STEP_2>
SESSION_SECRET=<GENERATE_WITH_crypto.randomBytes>
CORS_ORIGIN=https://patricia-james-wedding.onrender.com
```

### Step 4: Initialize Database

**Option A: Using Render Shell**
1. Go to Web Service > Shell tab
2. Run:
```bash
psql $DATABASE_URL -f server/database/schema.sql
psql $DATABASE_URL -f server/database/seed-v5.sql  # If seed file exists
```

**Option B: Using Local psql**
```bash
# Copy DATABASE_URL from Render dashboard
psql "postgresql://username:password@hostname:5432/database" -f server/database/schema.sql
psql "postgresql://username:password@hostname:5432/database" -f server/database/seed-v5.sql
```

### Step 5: Deploy

1. **Trigger Manual Deploy** or push to connected branch
2. **Monitor Build Logs** in Render dashboard
3. **Wait for "Live" status** (usually 2-5 minutes)

### Step 6: Verify Deployment

Visit: `https://patricia-james-wedding.onrender.com`

**Quick Checks**:
- [ ] Home page loads with wedding date "June 21, 2026"
- [ ] Navbar is transparent on home page
- [ ] Click "RSVP" - authentication flow works
- [ ] Register test user and login
- [ ] Submit RSVP successfully
- [ ] Navigate to Events page - 4 cards display
- [ ] Navigate to Photos page - gallery loads quickly
- [ ] Check browser console for errors (F12)

---

## 🔧 Post-Deployment Configuration

### 1. Custom Domain (Optional)

If using custom domain (e.g., `patricia-james-wedding.com`):

1. **Render Dashboard** > Settings > Custom Domain
2. **Add Domain**: `patricia-james-wedding.com` and `www.patricia-james-wedding.com`
3. **Update DNS Records** (at domain registrar):
   - Type: `CNAME`, Name: `www`, Value: `patricia-james-wedding.onrender.com`
   - Type: `A`, Name: `@`, Value: Render's IP addresses (shown in dashboard)
4. **Update CORS_ORIGIN**: `https://patricia-james-wedding.com`

### 2. SSL Certificate

- [x] **Automatic**: Render provides free Let's Encrypt SSL
- [x] **Force HTTPS**: Enabled by default

### 3. Mark Pages Under Construction

After deployment, add to `client/src/index.html`:

```html
<!-- Location Page - Under Construction -->
<section id="location" class="page">
  <div class="container text-center" style="padding-top: 8rem;">
    <h1>Location</h1>
    <div class="card" style="max-width: 600px; margin: 2rem auto;">
      <p style="font-size: 1.5rem; margin: 2rem 0;">🚧 Under Construction 🚧</p>
      <p>We're working on something special! Check back soon for venue details.</p>
    </div>
  </div>
</section>

<!-- Accommodations Page - Under Construction -->
<section id="accommodations" class="page">
  <div class="container text-center" style="padding-top: 8rem;">
    <h1>Accommodations</h1>
    <div class="card" style="max-width: 600px; margin: 2rem auto;">
      <p style="font-size: 1.5rem; margin: 2rem 0;">🚧 Under Construction 🚧</p>
      <p>We're working on something special! Check back soon for hotel information.</p>
    </div>
  </div>
</section>
```

---

## 🐛 Troubleshooting

### Issue: "Application Error" on Render

**Check**:
1. Build logs for npm install errors
2. Runtime logs for Node.js errors
3. DATABASE_URL is set correctly
4. SESSION_SECRET is set

### Issue: Database Connection Fails

**Check**:
1. PostgreSQL instance is running
2. DATABASE_URL uses **Internal Database URL** (not External)
3. Web service and database are in same region
4. Database schema has been initialized

### Issue: Sessions Don't Persist

**Check**:
1. `user_sessions` table exists in database
2. SESSION_SECRET is set in environment variables
3. Cookies are enabled in browser
4. CORS_ORIGIN matches your deployed URL

### Issue: Photos Don't Load

**Check**:
1. `/client/src/images/engagement-photos-optimized/` directory deployed
2. Static file serving configured correctly (index.js:62-65)
3. Image paths in `photos.js` are correct
4. Check network tab for 404 errors

---

## 📊 Performance Expectations

### Free Tier Limitations:
- **Cold Starts**: 30-60 seconds if inactive for 15 minutes
- **Build Time**: 2-5 minutes
- **Storage**: 512MB for web service, 1GB for database
- **Bandwidth**: Unlimited

### Optimization Tips:
1. **Upgrade to Paid Plan** ($7/month) for:
   - No cold starts
   - More CPU/RAM
   - Better performance
2. **Enable Caching** for static assets
3. **Monitor Database Size** (photos will increase it when feature is added)

---

## 📝 Deployment Notes

### Current Implementation:
- **Static Photo Gallery**: 27 engagement photos loaded from filesystem
- **No User Uploads Yet**: Deferred to Phase 2 (post-deployment)
- **Session Store**: PostgreSQL (production-ready, scales well)
- **Authentication**: Bcrypt with session-based auth

### Future Features (Post-Deployment):
1. **Database-Driven Photos**: Migrate to full photo schema
2. **User Photo Uploads**: Implement upload flow with Sharp optimization
3. **Location Page**: Complete venue showcase with maps
4. **Accommodations Page**: Hotel blocks and booking information

### Documentation References:
- **Browser Testing**: `BROWSER_TESTING_GUIDE.md`
- **Development Guide**: `CLAUDE.md`
- **Environment Setup**: `server/.env.example`
- **Database Schema**: `server/database/schema.sql`

---

## ✅ Final Checklist Before Deploy

- [ ] All tests passing locally (per `BROWSER_TESTING_GUIDE.md`)
- [ ] `.env` file NOT committed to Git
- [ ] Session secret generated (32+ character random string)
- [ ] Database schema ready (`schema.sql`)
- [ ] Guest seed data ready (if applicable)
- [ ] All image assets committed to repo
- [ ] Under construction pages added (Location, Accommodations)
- [ ] Render.com account created
- [ ] PostgreSQL instance created on Render
- [ ] Environment variables configured on Render
- [ ] Database initialized with schema
- [ ] First deployment triggered
- [ ] Post-deployment verification completed

---

## 🎉 Success Criteria

**Minimum for Go-Live**:
- [x] Home page displays correctly
- [x] RSVP form works (can submit successfully)
- [x] Authentication works (login/logout)
- [x] Mobile menu works
- [x] Wedding date correct (June 21, 2026)
- [x] No broken links or critical errors
- [x] Photo gallery functional with optimized images
- [x] Session persistence across navigation

**Post-Deployment**:
- [ ] Test on real mobile devices
- [ ] Share URL with close friends for UAT
- [ ] Monitor error logs for first 24 hours
- [ ] Send invitations with website URL

---

**Deployment Status:** ✅ READY
**Estimated Deployment Time:** 15-20 minutes
**Next Steps:** Create Render.com PostgreSQL instance, configure environment variables, deploy!
