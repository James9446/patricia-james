# Patricia y James Wedding Website

A modern, interactive wedding website with guest authentication, RSVP system, and photo sharing capabilities.

## 🚀 Quick Start

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
   
   # Initialize the database schema
   node src/database/migrate.js reset
   
   # Create admin user
   node src/admin/create-admin.js create
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:5001
   - API: http://localhost:5001/api

## 📊 Database Management

### Connecting to the Database

#### From Terminal (psql)
```bash
# Connect to your local database
psql postgresql://localhost:5432/patricia_james_wedding_dev

# Or with explicit parameters
psql -h localhost -p 5432 -U your_username -d patricia_james_wedding_dev
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

#### View Guest Data
```sql
-- View all guests
SELECT id, first_name, last_name, full_name, plus_one_allowed, admin_notes 
FROM guests 
ORDER BY last_name, first_name;

-- View guest pairs (couples)
SELECT 
  g1.first_name || ' ' || g1.last_name as guest1,
  g2.first_name || ' ' || g2.last_name as guest2,
  g1.plus_one_allowed
FROM guests g1
LEFT JOIN guests g2 ON g1.partner_id = g2.id
WHERE g1.partner_id IS NULL OR g1.id < g2.id
ORDER BY g1.last_name, g1.first_name;

-- View guests with partners
SELECT 
  g.first_name, g.last_name, g.full_name,
  p.first_name as partner_first_name, 
  p.last_name as partner_last_name
FROM guests g
LEFT JOIN guests p ON g.partner_id = p.id
ORDER BY g.last_name, g.first_name;
```

#### View RSVP Data
```sql
-- View all RSVPs with guest information
SELECT 
  r.response_status, r.party_size, r.dietary_restrictions,
  g.first_name, g.last_name, g.full_name,
  r.responded_at
FROM rsvps r
JOIN guests g ON r.guest_id = g.id
ORDER BY r.responded_at DESC;

-- View RSVP statistics
SELECT 
  response_status,
  COUNT(*) as count,
  SUM(party_size) as total_guests
FROM rsvps 
GROUP BY response_status;

-- View guests who haven't RSVP'd
SELECT g.first_name, g.last_name, g.full_name
FROM guests g
LEFT JOIN rsvps r ON g.id = r.guest_id
WHERE r.id IS NULL
ORDER BY g.last_name, g.first_name;
```

#### Database Maintenance
```sql
-- Reset all RSVPs (WARNING: This deletes all RSVP data)
DELETE FROM rsvps;

-- Reset all guests (WARNING: This deletes all guest data)
DELETE FROM guests;

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
Cordelia,Reynolds,false,,,Individual guest no plus-one
Tara,Folenta,false,Brenda,Bedell,Partner of Brenda Bedell
Brenda,Bedell,false,Tara,Folenta,Partner of Tara Folenta
Alfredo,Lopez,true,,,Individual guest plus-one allowed
```

#### Column Descriptions

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| `first_name` | ✅ | Guest's first name | `Cordelia` |
| `last_name` | ✅ | Guest's last name | `Reynolds` |
| `plus_one_allowed` | ✅ | Can this guest bring a plus-one? | `true` or `false` |
| `partner_first_name` | ❌ | Partner's first name (if applicable) | `Brenda` |
| `partner_last_name` | ❌ | Partner's last name (if applicable) | `Bedell` |
| `admin_notes` | ❌ | Internal notes for admin use | `Individual guest no plus-one` |

#### Important Notes

- **Partners**: If two guests are partners, list each one with the other as their partner
- **Plus-ones**: Set `plus_one_allowed` to `true` if the guest can bring a plus-one
- **Admin notes**: Use this field for internal tracking (e.g., "College friend", "Work colleague")

### Importing Guest Data

#### Method 1: Using the Import Script
```bash
# Navigate to server directory
cd server

# Import from CSV file
node src/admin/import-guests-csv.js import path/to/your/guests.csv

# Example with test data
node src/admin/import-guests-csv.js import test-guests.csv
```

#### Method 2: Generate Sample CSV
```bash
# Generate a sample CSV template
node src/admin/import-guests-csv.js sample

# This creates a sample CSV file you can modify
```

#### Method 3: Reset and Re-import
```bash
# Clear existing data and import fresh
node src/admin/import-guests-csv.js reset path/to/your/guests.csv
```

### Import Process

The import process works in two passes:

1. **Pass 1**: Insert all guests into the database
2. **Pass 2**: Link partners together using the `partner_first_name` and `partner_last_name` fields

### Import Output Example

```
📁 Reading CSV file: test-guests.csv
📊 Found 4 guests in CSV

🔄 Pass 1: Inserting guests...
✅ Inserted guest: Cordelia Reynolds
✅ Inserted guest: Tara Folenta
✅ Inserted guest: Brenda Bedell
✅ Inserted guest: Alfredo Lopez

🔄 Pass 2: Linking partners...
✅ Linked guests as partners
✅ Linked Tara Folenta with Brenda Bedell
✅ Linked guests as partners
✅ Linked Brenda Bedell with Tara Folenta

🎉 CSV import completed!

📊 Import Summary:
Total guests: 4
Guests with partners: 2
Plus-one allowed: 1

👥 Guest Relationships:
  Brenda Bedell + Tara Folenta (Plus-one: No)
  Alfredo Lopez (Plus-one: Yes)
  Cordelia Reynolds (Plus-one: No)
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
node test-api.js

# Initialize database schema
node src/database/init.js

# Migrate to schema v4
node src/database/migrate-to-v4.js migrate

# Reset database (WARNING: deletes all data)
node src/database/migrate-to-v4.js reset
```

#### Admin Scripts
```bash
# Import guests from CSV
node src/admin/import-guests-csv.js import guests.csv

# Generate sample CSV
node src/admin/import-guests-csv.js sample

# Reset and import
node src/admin/import-guests-csv.js reset guests.csv

# Create admin user
node src/admin/create-admin.js create

# Update admin password
node src/admin/create-admin.js update-password admin@patriciajames.com [NEW_PASSWORD]

# List all admin users
node src/admin/create-admin.js list
```

### API Endpoints

#### Guests
- `GET /api/guests` - Get all guests
- `GET /api/guests/:id` - Get specific guest
- `POST /api/guests` - Create new guest
- `PUT /api/guests/:id` - Update guest
- `DELETE /api/guests/:id` - Delete guest

#### RSVPs
- `GET /api/rsvps` - Get all RSVPs
- `GET /api/rsvps/stats` - Get RSVP statistics
- `GET /api/rsvps/guest/:guestId` - Get RSVP for specific guest
- `POST /api/rsvps` - Submit/update RSVP
- `PUT /api/rsvps/:id` - Update RSVP
- `DELETE /api/rsvps/:id` - Delete RSVP

### Testing the API

#### Test RSVP Submission
```bash
curl -X POST http://localhost:5001/api/rsvps \
  -H "Content-Type: application/json" \
  -d '{
    "guest_id": "your-guest-id-here",
    "response_status": "attending",
    "party_size": 2,
    "dietary_restrictions": "Vegetarian",
    "song_requests": "Dancing Queen by ABBA",
    "message": "So excited to celebrate!"
  }'
```

#### Test Guest Retrieval
```bash
curl -X GET http://localhost:5001/api/guests
```

## 👤 Admin User Management

### Default Admin User

The system comes with a default admin user for system management:

- **Email**: `admin@patriciajames.com`
- **Password**: `[Generated during setup - check console output]`
- **Privileges**: Full admin access

⚠️ **Important**: Change the default password after first login!

### Admin User Commands

```bash
# Create the default admin user
node src/admin/create-admin.js create

# Update admin password
node src/admin/create-admin.js update-password admin@patriciajames.com [NEW_PASSWORD]

# List all admin users
node src/admin/create-admin.js list
```

### Admin Features

Admin users have access to:
- **Guest Management**: View, edit, and manage guest list
- **RSVP Management**: View all RSVPs, export data, manage responses
- **System Administration**: User management, system settings
- **Photo Moderation**: Approve/reject uploaded photos (future feature)

### Security Notes

- Admin passwords are hashed using bcrypt with 12 salt rounds
- Admin users are separate from guest accounts
- Admin privileges are stored in the `is_admin` field in the users table
- All admin actions should be logged for security auditing

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

*Last Updated: September 16, 2025*
*Version: 1.0.0*
