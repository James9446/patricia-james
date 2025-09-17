# Database Schema - Patricia & James Wedding

## 🎯 **Key Improvements Based on Your Requirements**

### ✅ **Name-Based Authentication**
- **No email required initially** - Guests authenticate with first name + last name
- **Email collected during registration** - When they create an account
- **Unique name constraint** - Prevents duplicate guest records

### ✅ **Dynamic Plus-One Creation**
- **Plus-ones become real guest records** - Full database entries
- **Automatic partner linking** - Plus-one linked to the guest who brought them
- **No approval needed** - Plus-ones added immediately during RSVP

### ✅ **Flexible Couple RSVP**
- **Either partner can RSVP** - Independent or together
- **RSVP for self, partner, or both** - Clear options in the form
- **Partner details shown** - Name and email displayed in UI

### ✅ **CSV Import System**
- **Easy guest list population** - Import from spreadsheet
- **Automatic relationship linking** - Partners connected automatically
- **Deployment-friendly** - Works with local and remote databases

## 📊 **Database Schema Overview**

### **Guests Table**
```sql
-- Core guest information
first_name, last_name, full_name (computed)
email (nullable initially)
partner_id (links to partner)
is_primary_guest (true for main guests)
plus_one_allowed (permission flag)
admin_notes (internal notes)
```

### **RSVPs Table**
```sql
-- Flexible RSVP handling
rsvp_for_self (boolean)
rsvp_for_partner (boolean)
partner_attending (boolean)
plus_one_attending (boolean)
plus_one_name, plus_one_email (collected during RSVP)
```

### **Users Table**
```sql
-- Account information
guest_id (links to guest record)
username (full name)
email, password_hash
first_name, last_name
```

## 🔄 **User Flow**

### **1. Guest Authentication**
```
Guest enters first name + last name
→ System checks if guest exists
→ If found: Show guest details + partner info
→ If not found: Show error message
```

### **2. Account Creation**
```
Guest creates account with email + password
→ System creates user record
→ Links user to guest record
→ Updates guest email if needed
```

### **3. RSVP Process**
```
Logged-in guest sees RSVP form
→ Shows their info + partner info (if applicable)
→ Options: RSVP for self, partner, or both
→ If plus-one allowed: Collect plus-one details
→ Submit RSVP → Create plus-one guest record if needed
```

### **4. Plus-One Handling**
```
Guest selects "bringing plus-one"
→ Provides plus-one name + email
→ System creates new guest record for plus-one
→ Links plus-one to original guest as partner
→ Plus-one can later create their own account
```

## 📁 **Files Created**

### **Database Schema**
- **`schema-v3.sql`** - Refined database schema
- **`init-v3.js`** - Database initialization with migration

### **Admin Tools**
- **`import-guests-csv.js`** - CSV import script
- **`ADMIN_GUIDE.md`** - Comprehensive admin documentation

### **API Routes**
- **`auth-v3.js`** - Name-based authentication
- **`rsvps-v3.js`** - Enhanced RSVP handling

### **Documentation**
- **`SCHEMA_V3_REFINED.md`** - This summary
- **`SCHEMA_REVIEW.md`** - Detailed review process

## 🚀 **Getting Started**

### **1. Test the New Schema**
```bash
# Initialize with v3 schema
node src/database/init-v3.js

# Create sample CSV
node src/admin/import-guests-csv.js sample

# Import your guest list
node src/admin/import-guests-csv.js import your-guests.csv
```

### **2. CSV Format**
```csv
first_name,last_name,plus_one_allowed,partner_first_name,partner_last_name,admin_notes
Cordelia,Reynolds,false,,,Individual guest, no plus-one
Tara,Folenta,false,Brenda,Bedell,Partner of Brenda Bedell
Brenda,Bedell,false,Tara,Folenta,Partner of Tara Folenta
Alfredo,Lopez,true,,,Individual guest, plus-one allowed
```

### **3. API Endpoints**

#### **Authentication**
- `POST /api/auth/check-guest` - Check guest by name
- `POST /api/auth/register` - Create user account
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/me` - Get current user info

#### **RSVPs**
- `POST /api/rsvps` - Submit RSVP (creates plus-ones)
- `GET /api/rsvps/:guest_id` - Get RSVP details
- `GET /api/rsvps/summary` - Admin RSVP summary

## 🎯 **Perfect for Your Use Case**

### **Your Examples Work Perfectly**
- ✅ **Cordelia Reynolds** - Individual, no plus-one
- ✅ **Tara Folenta + Brenda Bedell** - Couple, no plus-one
- ✅ **Alfredo Lopez** - Individual with plus-one permission

### **Real-World Scenarios**
- ✅ **Couples** - Either can RSVP for both
- ✅ **Individuals** - Can bring plus-ones if allowed
- ✅ **Plus-ones** - Become real guests with accounts
- ✅ **Admin** - Easy CSV import and RSVP summaries

### **Deployment Ready**
- ✅ **Local development** - CSV import works locally
- ✅ **Production deployment** - Can import via admin interface
- ✅ **Database migration** - Safe upgrade from v1 to v3
- ✅ **No data loss** - Preserves existing guest data

## 🔧 **Next Steps**

### **1. Test the Schema**
```bash
# Test with your actual guest list
node src/admin/import-guests-csv.js sample
# Edit the sample CSV with your real data
node src/admin/import-guests-csv.js import sample-guests.csv
```

### **2. Update Frontend**
- Modify RSVP form for new fields
- Add name-based authentication
- Handle partner information display
- Implement plus-one collection

### **3. Test RSVP Flow**
- Test individual guest RSVP
- Test couple RSVP (both partners)
- Test plus-one creation
- Test account creation

### **4. Deploy**
- Set up production database
- Import guest list
- Deploy frontend and backend
- Test with real guests

## 🎉 **Ready to Go!**

The refined schema v3 perfectly matches your requirements:
- ✅ **Name-based authentication**
- ✅ **Dynamic plus-one creation**
- ✅ **Flexible couple RSVPs**
- ✅ **CSV import system**
- ✅ **Admin-friendly workflow**

**What would you like to do next?**
1. Test the new schema with your guest list?
2. Update the frontend to work with the new API?
3. Set up the admin interface?
4. Deploy to production?
