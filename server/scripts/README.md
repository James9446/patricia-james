# Server Scripts

This directory contains utility scripts for database management and photo optimization.

## Active Scripts

### `optimize-static-photos.js`
Optimizes images for web delivery using Sharp library.
- Resizes to max 2000px width
- Compresses to 85% quality
- Converts to progressive JPEG
- Reduces file size by ~95%

**Usage:**
```bash
node server/scripts/optimize-static-photos.js
```

### `seed-photos.js`
Seeds the database with photo records (when photo system is fully implemented).
- Inserts photo metadata into database
- Links photos to categories
- Sets approval status

**Usage:**
```bash
node server/scripts/seed-photos.js
```

---

## Archived Scripts

Scripts in `archive/` are one-time migration or fix scripts that were used during development but are no longer needed for regular operations:

- `add-file-hash-column.js` - Migration to add file_hash column
- `check-photo-paths.js` - Utility to verify photo file paths
- `clear-photo-captions.js` - Utility to clear/reset captions
- `fix-photo-paths.js` - Migration to fix incorrect paths
- `optimize-engagement-photos.js` - One-time optimization of engagement photos
- `upload-engagement-photos.js` - One-time upload of engagement photos

These are kept for reference but should not be run again unless you know what you're doing.
