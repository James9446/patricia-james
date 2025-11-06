# Codebase Cleanup Plan

## Date: November 5, 2025
## Status: Ready for Execution

This document outlines the cleanup tasks needed to establish a clean, professional codebase.

---

## 🚨 CRITICAL ISSUES (Fix Immediately)

### 1. Duplicate Migration Number 007

**Problem:** Two migration files with number 007
- `server/database/migrations/007_add_rsvp_fields.sql`
- `server/database/migrations/007_add_upload_source.sql`

**Impact:** Confusion about migration order, potential database issues

**Solution:**
- Rename `007_add_upload_source.sql` → `009_add_upload_source.sql`
- This maintains chronological order (008 is photo categories)

**Action:**
```bash
cd server/database/migrations
git mv 007_add_upload_source.sql 009_add_upload_source.sql
git commit -m "fix: Rename duplicate migration 007 to 009"
```

---

## 📁 Files to Remove/Archive

### Files to Delete (Not Needed in Repo)

#### Root Directory
- [ ] `photos.tar.gz` - 880MB archive file (untracked)
- [ ] `photos/` - Source photos directory (untracked)
  - These belong in server/uploads or external storage, not git

**Action:**
```bash
# Add to .gitignore
echo "photos.tar.gz" >> .gitignore
echo "photos/" >> .gitignore

# Delete files
rm photos.tar.gz
rm -rf photos/

git add .gitignore
git commit -m "chore: Add photos to gitignore and remove from working dir"
```

#### Server Scripts
- [ ] `server/scripts/migrate-production.sql` - One-off file, should be in migrations

**Action:**
Move content to proper migration file or delete if already applied

```bash
rm server/scripts/migrate-production.sql
git add server/scripts/migrate-production.sql
git commit -m "chore: Remove one-off migration script"
```

### Scripts to Archive (Move to archive/)

Already archived scripts in `server/scripts/archive/`:
- Review these periodically
- Delete if not needed after 3 months

**Currently in scripts/ to review:**
- [ ] `seed-photos.js` - Used for initial dev? Still needed?
- [ ] `optimize-static-photos.js` - Still needed?

**Action:** Review each script:
1. If actively used → Keep with updated comments
2. If might be needed later → Move to archive/
3. If obsolete → Delete

---

## 🗂️ Files to Update

### Update .gitignore

Add these entries if not already present:

```gitignore
# Photos and uploads
photos/
photos.tar.gz
*.tar.gz
server/uploads/

# Environment
.env
.env.local
.env.production

# Logs
*.log
logs/

# OS files
.DS_Store
Thumbs.db

# Temporary files
*.tmp
*.temp
*.sql.bak
```

**Action:**
```bash
# Edit .gitignore with the above additions
git add .gitignore
git commit -m "chore: Update gitignore with upload files and temp files"
```

---

## 🌿 Branch Cleanup

### Current Branches

**Local:**
- `cleanup-backup-20250927-114113` - Old backup, can delete
- `feature/photo-system` - Merged? Check status
- `initial-deployment` - Current work (to merge to main)
- `main` - Production
- `post-deployment-dev` - Check if still needed

**Remote:**
- `docs/update-readme-examples` - Old?
- `feature/guest-relationship-schema` - Old?
- `feature/photo-system` - Merged?

### Cleanup Plan

```bash
# Check which branches are merged
git branch --merged main

# Delete local branches that are merged
git branch -d cleanup-backup-20250927-114113
git branch -d feature/photo-system  # if merged

# Delete remote branches that are merged
git push origin --delete docs/update-readme-examples
git push origin --delete feature/guest-relationship-schema

# After merging initial-deployment to main:
git branch -d initial-deployment
git push origin --delete initial-deployment
```

---

## 📝 Documentation to Review/Update

### Files to Update

#### README.md
- [ ] Update with current setup instructions
- [ ] Add production URL
- [ ] Document environment variables needed
- [ ] Add link to DEVELOPMENT_WORKFLOW.md

#### docs/PROJECT_PLAN.md
- [ ] Mark completed phases
- [ ] Update with current status
- [ ] Remove obsolete tasks

#### docs/DATABASE_SCHEMA.md
- [ ] Add upload_source column
- [ ] Document current photo_categories

### Documentation to Consider Deleting

- [ ] `DEPLOYMENT_READINESS.md` (root) - Move to docs/ or delete if obsolete

---

## 🔧 Code Cleanup Tasks

### Server Scripts - Add Documentation

Each script in `server/scripts/` needs header comments:

```javascript
/**
 * Script Name and Purpose
 *
 * Description: What this script does
 * When to use: Specific use cases
 *
 * Usage: node scripts/script-name.js
 *
 * Dependencies: List any required setup
 *
 * Example:
 *   $ cd server
 *   $ node scripts/script-name.js
 */
```

**Scripts to document:**
- [ ] bulk-upload-photos.js
- [ ] generate-thumbnails.js
- [ ] update-categories.js
- [ ] seed-photos.js (if keeping)
- [ ] optimize-static-photos.js (if keeping)

### Database Migrations - Add Headers

Each migration needs clear comments:

```sql
-- ========================================
-- Migration XXX: Clear Description
-- ========================================
-- Purpose: What this changes and why
-- Dependencies: Any prerequisites
-- Rollback: How to undo if needed
-- ========================================
```

---

## 🏗️ Repository Structure Improvements

### Create Standard Directories

```bash
# Create missing standard directories
mkdir -p server/uploads/photos  # For production uploads
mkdir -p server/logs            # For application logs
mkdir -p docs/api               # For API documentation
mkdir -p docs/deployment        # For deployment guides
```

### Update Directory README Files

Add README.md to key directories explaining their purpose:
- `server/scripts/README.md`
- `server/database/migrations/README.md`
- `docs/README.md`

---

## ✅ Execution Checklist

Execute these tasks in order:

### Phase 1: Critical Fixes (Do First)
- [ ] Fix duplicate migration 007 → 009
- [ ] Test that migrations still work
- [ ] Commit the fix

### Phase 2: File Cleanup
- [ ] Add photos/ and *.tar.gz to .gitignore
- [ ] Remove photos directory and tarball from working dir
- [ ] Delete migrate-production.sql from scripts
- [ ] Commit cleanup

### Phase 3: Branch Cleanup
- [ ] Identify merged branches
- [ ] Delete merged local branches
- [ ] Delete merged remote branches
- [ ] Commit changes

### Phase 4: Documentation
- [ ] Add headers to all scripts
- [ ] Add headers to all migrations
- [ ] Update README.md
- [ ] Review and update project documentation
- [ ] Commit documentation updates

### Phase 5: Final Steps
- [ ] Review DEVELOPMENT_WORKFLOW.md
- [ ] Merge initial-deployment to main
- [ ] Create develop branch from main
- [ ] Tag current version
- [ ] Document cleanup completion

---

## 📊 Success Criteria

Cleanup is complete when:
- ✅ No duplicate migration numbers
- ✅ No untracked large files (photos, tarballs)
- ✅ Only active branches remain
- ✅ All scripts have clear documentation
- ✅ .gitignore is comprehensive
- ✅ Repository follows standard structure
- ✅ Development workflow documented and followed

---

## 🚀 Next Steps After Cleanup

1. **Establish git flow:**
   - main (production)
   - develop (integration)
   - feature/* branches

2. **Set up CI/CD considerations:**
   - Automated testing
   - Deployment previews
   - Branch protection rules

3. **Ongoing maintenance:**
   - Weekly branch review
   - Monthly dependency updates
   - Quarterly documentation review

---

Last Updated: November 5, 2025
