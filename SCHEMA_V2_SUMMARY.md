# Enhanced Guest Relationship Schema v2

## Overview
We've redesigned the database schema to handle the complex relationships in wedding invitations, including couples, plus-ones, and flexible RSVP management.

## Key Improvements

### 1. Guest Relationships
- **Partner linking**: Guests can be linked as couples
- **Primary vs Partner**: Clear distinction between main guest and partner
- **Flexible RSVP**: Either partner can RSVP for both

### 2. Plus-One Management
- **Permission-based**: Only allowed guests can bring plus-ones
- **Dynamic collection**: Plus-one details collected during RSVP
- **Automatic tracking**: Plus-ones added to database when RSVP submitted

### 3. Admin-Friendly
- **Clear workflow**: Step-by-step guide for populating guest list
- **Relationship management**: Easy to set up couples and permissions
- **Flexible data entry**: Support for various guest types

## New Database Fields

### Guests Table
```sql
-- New fields for relationships
partner_id UUID REFERENCES guests(id) -- Link to partner
is_primary_guest BOOLEAN DEFAULT true -- Primary guest or partner
plus_one_allowed BOOLEAN DEFAULT false -- Can bring plus-one
plus_one_name VARCHAR(200) -- Plus-one name if provided
plus_one_email VARCHAR(255) -- Plus-one email if provided
invitation_sent_date TIMESTAMP WITH TIME ZONE -- When invitation sent
admin_notes TEXT -- Internal admin notes
```

### RSVPs Table
```sql
-- New fields for relationship RSVPs
partner_attending BOOLEAN -- Is partner attending?
partner_guest_id UUID REFERENCES guests(id) -- Reference to partner
plus_one_attending BOOLEAN DEFAULT false -- Is plus-one attending?
plus_one_name VARCHAR(200) -- Plus-one name provided
plus_one_email VARCHAR(255) -- Plus-one email provided
```

## Guest Types Supported

### 1. Individual Guests
- Single people with no partner
- May or may not have plus-one permission
- Example: Single friends, colleagues

### 2. Couples (Primary + Partner)
- Primary guest receives invitation
- Partner linked to primary guest
- Either can RSVP for both
- Example: Married couples, long-term partners

### 3. Plus-Ones
- Additional guests brought by primary guests
- Details collected during RSVP process
- Automatically added to database

## Admin Workflow

### Step 1: Prepare Guest List
Create a spreadsheet with:
- Basic guest info (name, email, phone)
- Guest type (individual, primary, partner)
- Partner information (if applicable)
- Plus-one permissions
- Admin notes

### Step 2: Use Admin Script
```bash
# Populate guest list
node src/admin/populate-guests.js populate

# View current guest list
node src/admin/populate-guests.js show
```

### Step 3: Verify Relationships
Check that couples are properly linked and permissions are set correctly.

## RSVP Flow Examples

### Individual Guest
1. Guest logs in with email
2. Sees their invitation details
3. Selects attending/not attending
4. If plus-one allowed: provides plus-one details
5. Submits RSVP

### Couple (Primary Guest)
1. Primary guest logs in
2. Sees both their info and partner's info
3. Selects attending/not attending for both
4. If plus-one allowed: provides plus-one details
5. Submits RSVP for both

### Couple (Partner)
1. Partner logs in (if they create account)
2. Sees their info and primary guest's info
3. Can update RSVP for both
4. Same plus-one options as primary guest

## Database Views

### Guest Pairs View
Shows all primary guests with their partners:
```sql
SELECT * FROM guest_pairs;
```

### RSVP Summary View
Shows RSVP status for all primary guests:
```sql
SELECT * FROM rsvp_summary;
```

## Migration Strategy

### From Schema v1 to v2
The system automatically detects if migration is needed and:
1. Adds new columns to existing tables
2. Creates new indexes
3. Creates helpful views
4. Preserves existing data

### Safe Migration
- No data loss during migration
- Backward compatible
- Can be run multiple times safely

## Next Steps

### 1. Test the New Schema
```bash
# Initialize with new schema
node src/database/init-v2.js

# Populate with sample data
node src/admin/populate-guests.js populate
```

### 2. Update Frontend
- Modify RSVP form to handle relationships
- Add partner information display
- Implement plus-one collection

### 3. Update API Routes
- Enhance guest endpoints for relationships
- Update RSVP endpoints for partner handling
- Add admin endpoints for guest management

### 4. Test Scenarios
- Individual guest RSVP
- Couple RSVP (both partners)
- Plus-one collection
- Admin guest management

## Benefits

### For Admins
- Clear workflow for guest list management
- Flexible relationship handling
- Easy plus-one permission control
- Comprehensive admin tools

### For Guests
- Intuitive RSVP process
- Clear partner information
- Easy plus-one management
- No duplicate data entry

### For Development
- Scalable schema design
- Clear data relationships
- Helpful database views
- Comprehensive admin tools

## Files Created

1. **`schema-v2.sql`** - Enhanced database schema
2. **`init-v2.js`** - Database initialization with migration
3. **`populate-guests.js`** - Admin script for guest population
4. **`ADMIN_GUIDE.md`** - Comprehensive admin documentation
5. **`SCHEMA_V2_SUMMARY.md`** - This summary document

## Ready for Implementation

The enhanced schema is ready for testing and implementation. The system provides:
- ✅ Flexible guest relationships
- ✅ Plus-one management
- ✅ Admin-friendly workflow
- ✅ Migration from existing schema
- ✅ Comprehensive documentation

Next step: Test the new schema and begin updating the frontend to handle the enhanced relationships.
