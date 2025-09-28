# Database Schema - Patricia & James Wedding (v5)

## 🎯 **Current Schema Design (v5 - Combined Table Approach)**

### ✅ **Combined Table Architecture**
- **Single `users` table** - Contains both guest and user data
- **No data duplication** - Email and password only stored once
- **Simplified relationships** - Direct partner references
- **Flexible account status** - Tracks registration state

### ✅ **Individual RSVP Records**
- **Each user gets their own RSVP** - Specific dietary restrictions
- **Partner RSVP logic** - Either partner can RSVP for both
- **Plus-one handling** - Plus-ones become real users with RSVPs
- **Audit trail** - Track who submitted and when

### ✅ **Dynamic Plus-One Creation**
- **Plus-ones become real users** - Full database entries with accounts
- **Automatic partner linking** - Plus-one linked to the guest who brought them
- **Account status tracking** - Plus-ones start as 'guest' until registered

### ✅ **CSV Import System**
- **Easy guest list population** - Import from `test-guests.csv`
- **Automatic relationship linking** - Partners connected automatically
- **Database tool integration** - Use `./db reset --confirm` for seeding

## 📊 **Current Database Schema (v5)**

### **Users Table (Combined Guest and User Data)**
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    full_name VARCHAR(200) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
    partner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    plus_one_allowed BOOLEAN DEFAULT false,
    email VARCHAR(255) UNIQUE, -- NULL until registered
    password_hash VARCHAR(255), -- NULL until registered
    is_admin BOOLEAN DEFAULT false,
    account_status VARCHAR(20) DEFAULT 'guest' CHECK (account_status IN ('guest', 'registered', 'deleted')),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);
```

### **RSVPs Table (Individual RSVP Records)**
```sql
CREATE TABLE rsvps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    partner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    response_status VARCHAR(20) NOT NULL CHECK (response_status IN ('attending', 'not_attending', 'pending')),
    dietary_restrictions TEXT,
    message TEXT,
    responded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### **User Sessions Table (Session Management)**
```sql
CREATE TABLE user_sessions (
    sid VARCHAR NOT NULL,
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL,
    PRIMARY KEY (sid)
);
```

## 🔄 **Current User Flow (v5)**

### **1. Guest Authentication**
```
Guest enters first name + last name
→ System checks if guest exists in users table
→ If found: Show guest details + partner info
→ If not found: Show error message
```

### **2. Account Creation**
```
Guest creates account with email + password
→ System updates existing user record
→ Sets email, password_hash, account_status = 'registered'
→ No new records created (uses existing user)
```

### **3. RSVP Process**
```
Logged-in guest sees RSVP form
→ Shows their info + partner info (if applicable)
→ Options: RSVP for self, partner, or both
→ If plus-one allowed: Collect plus-one details
→ Submit RSVP → Create individual RSVP records
```

### **4. Plus-One Handling**
```
Guest selects "bringing plus-one"
→ Provides plus-one name + email
→ System creates new user record for plus-one
→ Links plus-one to original guest as partner
→ Plus-one can later create their own account
```

## 📁 **Current File Structure**

### **Database Management**
- **`server/db`** - Main database management tool
- **`./db`** - Wrapper script for easy access
- **`server/test-guests.csv`** - Guest data for seeding

### **API Routes**
- **`server/src/routes/auth.js`** - Authentication endpoints
- **`server/src/routes/rsvps.js`** - RSVP handling
- **`server/src/middleware/auth.js`** - Authentication middleware

### **Documentation**
- **`docs/DATABASE_SCHEMA.md`** - This schema documentation
- **`docs/DATABASE_USAGE_GUIDE.md`** - Database tool usage guide
- **`docs/ADMIN_GUIDE.md`** - Admin workflow guide

## 🚀 **Getting Started**

### **1. Database Management**
```bash
# View database statistics
./db stats

# View all users
./db users

# Reset to seeded state
./db reset --confirm
```

### **2. CSV Format**
```csv
first_name,last_name,plus_one_allowed,partner_first,partner_last,admin_notes
Mike,Jones,false,,,Individual guest no plus-one
John,Smith,false,Jane,Smith,Partner of Jane Smith
Jane,Smith,false,John,Smith,Partner of John Smith
Jack,Blue,true,,,Individual guest plus-one allowed
```

### **3. Current API Endpoints**

#### **Authentication**
- `POST /api/auth/check-guest` - Check guest by name
- `POST /api/auth/register` - Create user account
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/logout` - Logout user

#### **RSVPs**
- `GET /api/rsvps` - Get user's RSVP data
- `POST /api/rsvps` - Submit RSVP (creates plus-ones)
- `PUT /api/rsvps/:id` - Update RSVP

## 🎯 **Current System Status (v5)**

### **✅ Working Features**
- **Combined table architecture** - Single users table for all data
- **Individual RSVP records** - Each user gets their own RSVP
- **Partner RSVP logic** - Either partner can RSVP for both
- **Plus-one creation** - Plus-ones become real users
- **Database management** - Comprehensive `./db` tool
- **CSV seeding** - Easy guest list import
- **Authentication system** - Login/logout with session management

### **✅ Real-World Scenarios**
- **Individual guests** - Can RSVP with dietary restrictions
- **Couples** - Either partner can RSVP for both
- **Plus-ones** - Become real users with full capabilities
- **Admin management** - Easy database operations

### **✅ Production Ready**
- **Database tool** - `./db` for all database operations
- **CSV import** - Automatic seeding from `test-guests.csv`
- **Session management** - Secure cookie-based authentication
- **Error handling** - Comprehensive error management

## 🔧 **Current Usage**

### **1. Database Management**
```bash
# View current state
./db stats
./db users
./db rsvps

# Reset to seeded state
./db reset --confirm

# Clean test data
./db clean
```

### **2. Development Workflow**
```bash
# Start server
npm run dev

# Check database
./db stats

# Test with sample data
./db reset --confirm
```

### **3. Production Deployment**
```bash
# Set up production database
./db reset --confirm

# Verify deployment
./db stats
./db users
```

## 🎉 **System Status: PRODUCTION READY**

The current schema v5 provides:
- ✅ **Combined table architecture** - Simplified data model
- ✅ **Individual RSVP records** - Specific dietary restrictions
- ✅ **Partner RSVP logic** - Flexible couple management
- ✅ **Plus-one handling** - Real user creation
- ✅ **Database management** - Comprehensive tooling
- ✅ **CSV import system** - Easy guest list management

**The system is ready for production use!**
