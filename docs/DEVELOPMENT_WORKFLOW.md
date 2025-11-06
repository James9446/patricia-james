# Development Workflow

## Overview
This document establishes the development process for the Patricia & James wedding website. Following this workflow ensures code quality, proper testing, and smooth deployments.

---

## Branch Strategy

### Main Branches
- **`main`** - Production-ready code. Render deploys from this branch.
- **`develop`** (to be created) - Integration branch for completed features

### Feature Branches
- Create a new branch for each feature or bug fix
- Branch naming convention: `feature/feature-name` or `fix/bug-name`
- Example: `feature/guest-photo-upload`, `fix/carousel-scroll`

---

## Development Process

### 1. Starting New Work

```bash
# Make sure main is up to date
git checkout main
git pull origin main

# Create a new feature branch
git checkout -b feature/your-feature-name
```

### 2. Local Development

1. **Make changes** on your feature branch
2. **Test locally** at http://localhost:5001
3. **Test all affected functionality** - not just the new feature
4. **Commit frequently** with clear messages

```bash
git add .
git commit -m "feat: Add description of what changed"
```

### 3. Before Pushing to GitHub

**CRITICAL CHECKLIST** - Complete ALL items before pushing:

- [ ] Code works correctly in local environment
- [ ] All related features tested (not just new code)
- [ ] No console errors in browser
- [ ] Database migrations tested locally (if applicable)
- [ ] No sensitive data (API keys, passwords) in code
- [ ] Code follows existing patterns and style
- [ ] Comments added for complex logic
- [ ] Unused code/files removed

### 4. Pushing Feature Branch

```bash
# Push feature branch to GitHub
git push origin feature/your-feature-name
```

### 5. Testing in Production-Like Environment

**Option A: Create a preview deployment on Render**
- Render can deploy from feature branches
- Test thoroughly before merging

**Option B: Manual testing checklist**
- Document all tests performed
- Screenshot any visual changes
- Test on mobile and desktop

### 6. Merging to Main

```bash
# Create pull request on GitHub
# After approval and testing:
git checkout main
git pull origin main
git merge feature/your-feature-name
git push origin main
```

### 7. Post-Deployment

- Monitor Render deployment logs
- Test production site immediately after deployment
- Keep feature branch for 1 week, then delete

---

## Code Quality Standards

### File Organization

```
patricia-james-app/
├── client/
│   └── src/
│       ├── css/         # Stylesheets
│       ├── js/          # JavaScript modules
│       └── images/      # Static images only
├── server/
│   ├── src/
│   │   ├── config/      # Configuration files
│   │   ├── middleware/  # Express middleware
│   │   └── routes/      # API routes
│   ├── database/
│   │   └── migrations/  # Database migrations (numbered)
│   └── scripts/         # Utility scripts
├── docs/               # Documentation
└── README.md
```

### What NOT to commit
- `node_modules/`
- `.env` files
- `photos/` directory (use server uploads dir)
- `*.tar.gz` files
- `*.log` files
- Temporary test files
- Personal notes
- Database backups (use proper backup solution)

### Git Commit Messages

Follow conventional commits:

```
feat: Add new feature
fix: Bug fix
docs: Documentation changes
style: Code style changes (formatting)
refactor: Code refactoring
test: Adding tests
chore: Maintenance tasks
```

Examples:
- `feat: Add swipe navigation to photo carousel`
- `fix: Resolve duplicate photo upload issue`
- `docs: Update development workflow`
- `refactor: Clean up unused migration files`

---

## Database Migrations

### Migration Naming
- Use sequential numbers: `001_`, `002_`, `003_`
- Include descriptive name: `008_update_photo_categories.sql`
- **NEVER** reuse a migration number

### Migration Process

1. **Create migration** in `server/database/migrations/`
2. **Test locally first**:
   ```bash
   cd server
   node scripts/your-migration-script.js
   ```
3. **Verify database state** after migration
4. **Document what changed** in migration comments
5. **Commit migration file**
6. **After deploying to production**, run migration via SSH:
   ```bash
   render ssh patricia-james-app
   cd /opt/render/project/src/server
   node scripts/your-migration-script.js
   ```

---

## Testing Checklist

### Before Every Commit
- [ ] Code runs without errors locally
- [ ] Browser console shows no errors
- [ ] Changes work as expected

### Before Merging to Main
- [ ] Full user flow tested
- [ ] Mobile responsive design verified
- [ ] Cross-browser testing (Chrome, Safari, Firefox)
- [ ] Database changes tested
- [ ] API endpoints tested
- [ ] Authentication still works
- [ ] No performance regressions

### After Production Deployment
- [ ] Production site loads correctly
- [ ] Core features work (auth, navigation, photos)
- [ ] Database queries executing properly
- [ ] No errors in Render logs
- [ ] Mobile version works

---

## Emergency Procedures

### Rollback Process
If production breaks after deployment:

1. **Immediately** checkout previous working commit:
   ```bash
   git checkout <last-working-commit-hash>
   git push -f origin main
   ```

2. **Investigate locally** what went wrong

3. **Fix on feature branch**, test thoroughly, then re-deploy

### Hot Fixes
For critical bugs in production:

1. Create `hotfix/bug-name` branch from `main`
2. Fix bug and test locally
3. Push and deploy immediately
4. Merge to both `main` and `develop`

---

## Scripts Maintenance

### Keep Scripts Organized

**`server/scripts/` directory:**
- Keep only **actively used** scripts
- Archive old/unused scripts to `server/scripts/archive/`
- Each script should have clear comments explaining:
  - What it does
  - When to use it
  - Example usage

### Script Naming
- Use descriptive names: `bulk-upload-photos.js` ✅
- Avoid generic names: `script1.js` ❌
- Include purpose in name: `generate-thumbnails.js` ✅

---

## Documentation

### Keep Updated
- Update docs when changing major features
- Document all environment variables needed
- Keep deployment instructions current
- Document any production-only configuration

### Required Documentation
- `README.md` - Project overview and setup
- `docs/DATABASE_SCHEMA.md` - Database structure
- `docs/DEVELOPMENT_WORKFLOW.md` - This file
- `docs/DEPLOYMENT_GUIDE.md` - Production deployment

---

## Review Frequency

**Weekly:**
- Review and close completed feature branches
- Clean up old scripts
- Update documentation

**Monthly:**
- Security updates for dependencies
- Database backup verification
- Performance review

---

## Key Principles

1. **Test locally FIRST, always**
2. **Never push untested code**
3. **One feature per branch**
4. **Clear, descriptive commit messages**
5. **Keep codebase clean - delete unused code**
6. **Document complex logic**
7. **Production rollouts should be boring** (no surprises)

---

Last Updated: November 5, 2025
