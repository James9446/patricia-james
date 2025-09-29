# Patricia y James Wedding Website

A modern, interactive wedding website with guest authentication, RSVP system, and photo sharing capabilities.

## 🚀 Quick Start

### 🛡️ Database Tools Quick Reference
```bash
# Most common commands
./db stats          # Database statistics
./db users          # View all users
./db rsvps          # View all RSVPs
./db help           # Show all commands

# Custom queries
./db sql "SELECT * FROM users WHERE account_status = 'registered';"
```

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd patricia-james-app
   ```

2. **Install dependencies**
   ```bash
   # Install server dependencies
   cd server
   npm install
   
   # No client dependencies needed (vanilla HTML/CSS/JS)
   ```

3. **Set up environment variables**
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env with your database credentials
   nano .env
   ```

4. **Set up the database**
   ```bash
   # Create PostgreSQL database
   createdb patricia_james_wedding_dev
   
   # Initialize the database schema (v5 - current)
   psql -d patricia_james_wedding_dev -f server/database/schema.sql
   
   # Seed with initial data
   ./db reset --confirm
   ```

## 🎯 Features

- **Guest Authentication**: Guests can register and login with email/password
- **RSVP System**: Submit and update RSVPs with dietary restrictions
- **Partner Support**: Couples can RSVP for each other
- **Plus-one Support**: Add plus-ones during RSVP process
- **Database Management**: Comprehensive `./db` tool for all operations

## 🔍 Development Startup Sequence

**Before starting any development work, always run the system check:**

```bash
# From the project root directory
./db stats
```

This verifies:
- ✅ Database connectivity
- ✅ Current data status
- ✅ System is ready for development

**Start the development server:**
```bash
# From the server directory
cd server
npm run dev
```

### Manual System Verification

If you prefer to run checks manually:

```bash
# 1. Check database status
./db stats
./db users

# 2. Test RSVP system
cd server && node tests/test-rsvp-system.js

# 3. Start server and test API
cd server && npm run dev
# In another terminal:
curl http://localhost:5001/api/health
```

## 🔧 Development Commands

### System Verification
```bash
# Quick system check (recommended before starting work)
./db stats

# Detailed system check
cd server && node tests/test-basic-functionality.js
```

### Database Management

#### 🛡️ Safe Database Tools (Recommended)
```bash
# Database statistics
./db stats

# View all users
./db users

# View all RSVPs
./db rsvps

# Run custom SQL queries
./db sql "SELECT * FROM users WHERE account_status = 'registered';"

# Reset database (with confirmation)
./db reset

# Show help
./db help
```

### 🛠️ Database Tools Details

The project includes a single, comprehensive database management tool:

1. **`./db`** - Complete database management tool (recommended for all operations)

#### Security Features
- ✅ **No credential exposure** - Uses environment variables from `.env`
- ✅ **Consistent connection** - Same logic as the server
- ✅ **Error handling** - Graceful failure with helpful messages
- ✅ **Safe for production** - No hardcoded credentials

#### Common Use Cases
```bash
# Check system health
./db stats

# Debug user issues
./db users
./db sql "SELECT * FROM users WHERE email = 'user@example.com';"

# Debug RSVP issues  
./db rsvps
./db sql "SELECT * FROM rsvps WHERE response_status = 'attending';"

# Reset for testing
./db reset
```

#### 🔧 Advanced Database Operations
```bash
# Reset database (WARNING: deletes all data)
./db reset --confirm

# Clean test data (keeps seeded users)
./db clean

# Import guest list from CSV (automatic with reset)
./db reset --confirm
```

### Testing
```bash
# Test RSVP system
cd server && node tests/test-rsvp-system.js

# Test basic functionality
cd server && node tests/test-basic-functionality.js

# Run all tests
cd server && node tests/run-all-tests.js
```

### Server Management
```bash
# Start development server
cd server && npm run dev

# Start production server
cd server && npm start

# Test API endpoints
curl http://localhost:5001/api/health
curl http://localhost:5001/api/rsvps
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:5001
   - API: http://localhost:5001/api

## 📊 Database Management

### 🛡️ Safe Database Access (Recommended)

The project includes safe database management tools that automatically load environment variables and avoid credential exposure:

```bash
# Quick database statistics
./db stats

# View all users with partner information
./db users

# View all RSVPs with user details
./db rsvps

# Run custom SQL queries safely
./db sql "SELECT first_name, last_name, account_status FROM users;"
./db sql "SELECT COUNT(*) FROM rsvps WHERE response_status = 'attending';"

# Reset database with confirmation
./db reset

# Show all available commands
./db help
```

### 🔧 Direct Database Access (Advanced)

#### From Terminal (psql) - Use with Caution
```bash
# ⚠️ WARNING: These commands expose credentials in shell history
# Use the safe ./db tools instead when possible

# Connect to your local database
psql postgresql://patricia_james_admin:WeddingAdmin2024!@localhost:5432/patricia_james_wedding_dev

# Or with explicit parameters
psql -h localhost -p 5432 -U patricia_james_admin -d patricia_james_wedding_dev
```

### 🚨 Troubleshooting Database Connection Issues

#### "database James does not exist" Error
This error occurs when PostgreSQL tries to connect to a database named after your system username instead of the correct database. This happens when:

1. **Environment variables not loaded** - The shell doesn't have access to `DATABASE_URL`
2. **Incorrect connection string** - Missing or malformed database URL
3. **Wrong working directory** - Running commands from wrong location

**Solution**: Use the safe database tools instead:
```bash
# ✅ CORRECT - Use safe database tools
./db stats
./db users

# ❌ AVOID - Direct psql commands that expose credentials
psql $DATABASE_URL -c "SELECT * FROM users;"
```

### 🛡️ Best Practices for Database Access

#### ✅ DO Use Safe Database Tools
```bash
# Use the project's safe database tools
./db stats
./db users
./db sql "SELECT * FROM users;"
```

#### ❌ DON'T Expose Credentials
```bash
# ❌ AVOID - Credentials in shell history
psql postgresql://user:password@localhost:5432/db

# ❌ AVOID - Environment variables not loaded
psql $DATABASE_URL -c "SELECT * FROM users;"

# ❌ AVOID - Hardcoded credentials in scripts
echo "password123" | psql -U user -d db
```

#### 🔧 Creating New Shell Scripts
When creating new shell scripts that need database access:

1. **Use Node.js scripts** that load environment variables with `dotenv`
2. **Call the safe database tools** instead of direct database commands
3. **Avoid hardcoded credentials** in shell scripts
4. **Use the existing patterns** from `reset-users.sh` and `check-system.sh`

Example safe shell script:
```bash
#!/bin/bash
# Safe database operations using project tools
./db stats
./db sql "SELECT COUNT(*) FROM users;"
```

#### From Application
The application connects using the `DATABASE_URL` environment variable:
```
DATABASE_URL="postgresql://username:password@localhost:5432/patricia_james_wedding_dev"
```

### Common Database Commands

#### Check Database Status
```sql
-- Check if database is connected
SELECT NOW() as current_time;

-- Check guest count
SELECT COUNT(*) as total_guests FROM guests;

-- Check RSVP count
SELECT COUNT(*) as total_rsvps FROM rsvps;
```

#### View User Data
```sql
-- View all users with partner information
SELECT 
  u.id,
  u.first_name,
  u.last_name,
  u.full_name,
  u.email,
  u.account_status,
  u.plus_one_allowed,
  p.first_name as partner_first_name,
  p.last_name as partner_last_name,
  u.admin_notes
FROM users u
LEFT JOIN users p ON u.partner_id = p.id
WHERE u.deleted_at IS NULL
ORDER BY u.last_name, u.first_name;

-- View users with RSVP status
SELECT 
  u.first_name,
  u.last_name,
  u.email,
  u.account_status,
  r.response_status,
  r.dietary_restrictions,
  r.responded_at
FROM users u
LEFT JOIN rsvps r ON u.id = r.user_id
WHERE u.deleted_at IS NULL
ORDER BY u.last_name, u.first_name;
```

#### View RSVP Data
```sql
-- View all RSVPs with user information
SELECT 
  r.id as rsvp_id,
  u.first_name,
  u.last_name,
  u.email,
  r.response_status,
  r.dietary_restrictions,
  r.message,
  r.responded_at,
  p.first_name as partner_first_name,
  p.last_name as partner_last_name
FROM rsvps r
JOIN users u ON r.user_id = u.id
LEFT JOIN users p ON r.partner_id = p.id
WHERE u.deleted_at IS NULL
ORDER BY r.responded_at DESC;

-- View RSVP statistics
SELECT 
  response_status,
  COUNT(*) as count,
  COUNT(DISTINCT user_id) as unique_users
FROM rsvps 
GROUP BY response_status;

-- View users without RSVPs
SELECT 
  u.first_name,
  u.last_name,
  u.email,
  u.account_status
FROM users u
LEFT JOIN rsvps r ON u.id = r.user_id
WHERE r.id IS NULL 
AND u.deleted_at IS NULL
AND u.account_status = 'registered'
ORDER BY u.last_name, u.first_name;
```

#### Database Maintenance
```sql
-- Check database size
SELECT pg_size_pretty(pg_database_size('patricia_james_wedding_dev'));

-- View admin users
SELECT 
  id, email, first_name, last_name, is_admin, is_active,
  last_login, created_at
FROM users 
WHERE is_admin = true
ORDER BY created_at DESC;
```


## 📁 CSV Guest List Management

### CSV Format

The CSV file should have the following columns:

```csv
first_name,last_name,plus_one_allowed,partner_first_name,partner_last_name,admin_notes
John,Smith,false,Jane,Smith,Partner of Jane Smith
Jane,Smith,false,John,Smith,Partner of John Smith
Jim,Boon,false,Katie,Boon,Partner of Katie Boon
Katie,Boon,false,Jim,Boon,Partner of Jim Boon
David,Thatcher,false,Lisa,Thatcher,Partner of Lisa Thatcher
Lisa,Thatcher,false,David,Thatcher,Partner of David Thatcher
Jack,Blue,true,,,Individual guest plus-one allowed
Paul,Green,true,,,Individual guest plus-one allowed
Mike,Solo,false,,,Individual guest no plus-one
Sarah,Uno,false,,,Individual guest no plus-one
```

#### Column Descriptions

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| `first_name` | ✅ | Guest's first name | `John` |
| `last_name` | ✅ | Guest's last name | `Smith` |
| `plus_one_allowed` | ✅ | Can this guest bring a plus-one? | `true` or `false` |
| `partner_first_name` | ❌ | Partner's first name (if applicable) | `Jane` |
| `partner_last_name` | ❌ | Partner's last name (if applicable) | `Smith` |
| `admin_notes` | ❌ | Internal notes for admin use | `Partner of Jane Smith` |

#### Important Notes

- **Partners**: If two guests are partners, list each one with the other as their partner
- **Plus-ones**: Set `plus_one_allowed` to `true` if the guest can bring a plus-one
- **Admin notes**: Use this field for internal tracking (e.g., "College friend", "Work colleague")

### Importing Guest Data

The system automatically seeds with guest data from `server/test-guests.csv` when you reset the database:

#### Method 1: Reset Database (Recommended)
```bash
# Reset database and automatically seed with CSV data
./db reset --confirm
```

#### Method 2: Update CSV File
```bash
# Edit the CSV file with your guest data
nano server/test-guests.csv

# Reset database to use updated CSV
./db reset --confirm
```

### Import Process

The import process works automatically when you run `./db reset --confirm`:

1. **Clear existing data** from users and rsvps tables
2. **Read CSV file** from `server/test-guests.csv`
3. **Insert all guests** into the users table
4. **Link partners** using the partner_first_name and partner_last_name fields

### Import Output Example

```
🔄 Resetting database...
✅ Database cleared.
🌱 Re-seeding with initial data...
🌱 Seeding initial users from CSV...
📄 Found 10 guests in CSV file
  ✅ Added: John Smith (ID: uuid-1)
  ✅ Added: Jane Smith (ID: uuid-2)
  ✅ Added: Jim Boon (ID: uuid-3)
  ✅ Added: Katie Boon (ID: uuid-4)
  ✅ Added: David Thatcher (ID: uuid-5)
  ✅ Added: Lisa Thatcher (ID: uuid-6)
  ✅ Added: Jack Blue (ID: uuid-7)
  ✅ Added: Paul Green (ID: uuid-8)
  ✅ Added: Mike Solo (ID: uuid-9)
  ✅ Added: Sarah Uno (ID: uuid-10)
🔗 Setting up partner relationships...
  🔗 Linked: John Smith ↔ Jane Smith
  🔗 Linked: Jim Boon ↔ Katie Boon
  🔗 Linked: David Thatcher ↔ Lisa Thatcher
✅ Database reset to seeded state complete!
```

## 🔧 Development

### Project Structure

```
patricia-james-app/
├── client/                 # Frontend (HTML/CSS/JS)
│   └── src/
│       ├── index.html     # Main HTML file
│       ├── css/           # Stylesheets
│       ├── js/            # JavaScript files
│       └── fonts/         # Custom fonts
├── server/                # Backend (Node.js/Express)
│   ├── src/
│   │   ├── index.js       # Main server file
│   │   ├── config/        # Configuration files
│   │   ├── database/      # Database schema and migrations
│   │   ├── routes/        # API routes
│   │   └── admin/         # Admin scripts
│   ├── package.json       # Server dependencies
│   └── .env              # Environment variables
└── README.md             # This file
```

### Available Scripts

#### Server Scripts
```bash
# Start development server with auto-reload
npm run dev

# Start production server
npm start

# Test database connection
./db stats

# Initialize database schema
psql -d patricia_james_wedding_dev -f server/database/schema.sql

# Reset database (WARNING: deletes all data)
./db reset --confirm
```

#### Database Scripts
```bash
# View all users
./db users

# View all RSVPs
./db rsvps

# Reset database with CSV data
./db reset --confirm

# Clean test data
./db clean

# Run custom SQL
./db sql "SELECT * FROM users WHERE is_admin = true;"
```

### API Endpoints

#### Authentication
- `POST /api/auth/check-guest` - Check guest by name
- `POST /api/auth/register` - Create user account
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/logout` - Logout user

#### RSVPs
- `GET /api/rsvps` - Get user's RSVP data
- `POST /api/rsvps` - Submit/update RSVP
- `PUT /api/rsvps/:id` - Update RSVP

### Testing the API

#### Test Authentication
```bash
# Check guest by name
curl -X POST http://localhost:5001/api/auth/check-guest \
  -H "Content-Type: application/json" \
  -d '{"first_name": "John", "last_name": "Smith"}'

# Register user
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user-id", "email": "user@example.com", "password": "password123"}'
```

#### Test RSVP Retrieval
```bash
curl -X GET http://localhost:5001/api/rsvps
```

## 👤 User Management

### Current System

The system uses a combined approach where all users are stored in the `users` table:

- **Guest Status**: Users start as 'guest' until they register
- **Registration**: Guests can register with email/password
- **Admin Access**: Set `is_admin = true` for admin privileges

### User Commands

```bash
# View all users
./db users

# View user details
./db sql "SELECT * FROM users WHERE email = 'user@example.com';"

# Create admin user (manual)
./db sql "UPDATE users SET is_admin = true WHERE email = 'admin@example.com';"
```

### User Features

Users have access to:
- **RSVP Management**: Submit and update their RSVPs
- **Partner RSVP**: RSVP for their partner if applicable
- **Plus-one Management**: Add plus-ones if allowed
- **Account Management**: Update their profile information

### Security Notes

- User passwords are hashed using bcrypt with 12 salt rounds
- All users are stored in the combined `users` table
- Admin privileges are stored in the `is_admin` field
- Session management uses PostgreSQL for persistence

## 🚀 Deployment

### Environment Variables

Create a `.env` file in the server directory:

```env
# Server Configuration
PORT=5001

# Database Configuration
DATABASE_URL="postgresql://username:password@host:port/database_name"

# JWT Secret (for future authentication)
JWT_SECRET="your_super_secret_jwt_key_here"

# File Upload (for future photo system)
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=10485760
```

### Production Deployment

1. **Set up production database** (PostgreSQL on Render.com or similar)
2. **Update environment variables** with production values
3. **Deploy backend** to Render.com or similar platform
4. **Deploy frontend** as static site
5. **Configure domain** and SSL certificates

## 🐛 Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check if PostgreSQL is running
brew services list | grep postgresql

# Start PostgreSQL
brew services start postgresql

# Check database exists
psql -l | grep patricia_james_wedding_dev
```

#### Import Issues
```bash
# Check CSV format
head -5 your-guests.csv

# Validate CSV syntax
node -e "console.log(require('fs').readFileSync('your-guests.csv', 'utf8').split('\n').slice(0,3))"
```

#### API Issues
```bash
# Check server logs
npm run dev

# Test API endpoints
curl -X GET http://localhost:5001/api/guests
```

### Getting Help

1. Check the server logs for error messages
2. Verify your database connection
3. Ensure all environment variables are set correctly
4. Check that the CSV format matches the expected structure

## 📝 License

This project is for personal use only.

---

*Last Updated: December 20, 2024*
*Version: 1.0.0 - Schema v5 Implemented*
