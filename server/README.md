# Patricia & James Wedding Website - Server

## 🎯 Overview

This is the backend server for the Patricia & James wedding website, built with Node.js, Express, and PostgreSQL. The system handles guest management, RSVP processing, and photo sharing functionality.

## 🏗️ Architecture

- **Backend**: Node.js + Express
- **Database**: PostgreSQL with streamlined schema
- **Authentication**: Session-based with name validation
- **File Storage**: Local filesystem (configurable for production)

## 📁 Project Structure

```
server/
├── src/
│   ├── admin/           # Admin tools and scripts
│   ├── config/          # Database and app configuration
│   ├── database/        # Database schema and migrations
│   ├── middleware/      # Express middleware
│   └── routes/          # API route handlers
├── tests/               # Test files and scripts
├── .env                 # Environment variables (create this)
└── package.json         # Dependencies and scripts
```

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Installation

1. **Clone and install dependencies:**
   ```bash
   cd server
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Create the database:**
   ```bash
   createdb patricia_james_wedding_dev
   ```

4. **Initialize the database:**
   ```bash
   node src/database/migrate.js reset
   ```

5. **Create admin user:**
   ```bash
   node src/admin/create-admin.js create
   ```

6. **Start the server:**
   ```bash
   npm run dev
   ```

## 🔧 Environment Variables

Create a `.env` file with the following variables:

```env
# Database Configuration
DATABASE_URL=postgresql://localhost:5432/patricia_james_wedding_dev
DATABASE_ADMIN_URL=postgresql://patricia_james_admin:[YOUR_PASSWORD]@localhost:5432/patricia_james_wedding_dev

# Server Configuration
PORT=5001
NODE_ENV=development

# Security
JWT_SECRET=your-secret-key-here
```

## 🗄️ Database Management

### Database Access

**Regular User (Application):**
```bash
psql -d patricia_james_wedding_dev
```

**Admin User:**
```bash
psql -d patricia_james_wedding_dev -U patricia_james_admin
```

### Common Database Queries

**View all guests:**
```sql
SELECT first_name, last_name, plus_one_allowed, 
       CASE WHEN partner_id IS NOT NULL THEN 'Has Partner' ELSE 'Individual' END as type
FROM guests 
ORDER BY last_name, first_name;
```

**View RSVP summary:**
```sql
SELECT * FROM rsvp_summary ORDER BY last_name, first_name;
```

**View guest pairs:**
```sql
SELECT * FROM guest_pairs ORDER BY primary_last_name, primary_first_name;
```

**Count attendees:**
```sql
SELECT 
  COUNT(*) as total_guests,
  COUNT(CASE WHEN response_status = 'attending' THEN 1 END) as attending,
  COUNT(CASE WHEN plus_one_attending = true THEN 1 END) as plus_ones
FROM guests g
LEFT JOIN rsvps r ON g.id = r.guest_id
WHERE g.partner_id IS NULL OR g.id < g.partner_id;
```

### Database Reset

**⚠️ WARNING: This will delete all data!**

```bash
node src/database/migrate.js reset
```

## 👥 Guest Management

### CSV Import Format

Create a CSV file with the following columns:

```csv
first_name,last_name,plus_one_allowed,partner_first_name,partner_last_name,admin_notes
Cordelia,Reynolds,false,,,Individual guest, no plus-one
Tara,Folenta,false,Brenda,Bedell,Partner of Brenda Bedell
Brenda,Bedell,false,Tara,Folenta,Partner of Tara Folenta
Alfredo,Lopez,true,,,Individual guest, plus-one allowed
```

### Import Guests from CSV

```bash
node src/admin/import-guests-csv.js import your-guests.csv
```

### Create Sample Data

```bash
node src/admin/import-guests-csv.js sample
# Edit the generated sample-guests.csv file
node src/admin/import-guests-csv.js import sample-guests.csv
```

## 🔐 Admin Management

### Create Admin User

```bash
node src/admin/create-admin.js create
```

### List Admin Users

```bash
node src/admin/create-admin.js list
```

### Update Admin Password

```bash
node src/admin/create-admin.js update-password admin@patriciajames.com [NEW_PASSWORD]
```

## 🧪 Testing

### Run All Tests

```bash
# Test RSVP system
node tests/test-rsvp-system.js

# Test admin database access
node tests/test-admin-simple.js

# Test API endpoints
node tests/test-api.js
```

### Test Individual Components

**Test Database Connection:**
```bash
node tests/test-admin-simple.js
```

**Test RSVP Functionality:**
```bash
node tests/test-rsvp-system.js
```

**Test API Endpoints:**
```bash
node tests/test-api.js
```

## 📊 API Endpoints

### RSVP Endpoints

- `POST /api/rsvps` - Submit RSVP
- `GET /api/rsvps/:guest_id` - Get RSVP for specific guest
- `GET /api/rsvps/summary` - Get RSVP summary (admin)

### Guest Endpoints

- `GET /api/guests` - List all guests
- `GET /api/guests/:id` - Get specific guest
- `POST /api/guests` - Create new guest (admin)

### Authentication Endpoints

- `POST /api/auth/check-guest` - Check guest by name
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user info

## 🔒 Security Features

### Current Security Status

- ✅ **Database Admin User**: Created with proper privileges
- ✅ **Password Protection**: All database access requires authentication
- ✅ **Input Validation**: Basic validation on API endpoints
- ✅ **Environment Variables**: Sensitive data in environment variables

### Production Security Checklist

See `PROJECT_PLAN.md` for comprehensive security measures to implement before production deployment.

## 🚀 Development Scripts

```bash
# Start development server
npm run dev

# Start production server
npm start

# Run database migration
node src/database/migrate.js migrate

# Reset database (WARNING: deletes all data)
node src/database/migrate.js reset

# Create admin user
node src/admin/create-admin.js create

# Import guests from CSV
node src/admin/import-guests-csv.js import guests.csv
```

## 📝 Database Schema

### Core Tables

- **guests**: Guest information and relationships
- **users**: User accounts for authentication
- **rsvps**: RSVP responses and details
- **photos**: Photo uploads and metadata
- **photo_comments**: Comments on photos
- **photo_upvotes**: Photo upvotes

### Key Features

- **Partner Relationships**: Guests can be linked as partners
- **Plus-One Support**: Dynamic plus-one creation during RSVP
- **Flexible RSVPs**: Support for individual and couple RSVPs
- **Photo Sharing**: Upload, comment, and upvote system

## 🐛 Troubleshooting

### Common Issues

**Database Connection Failed:**
- Check if PostgreSQL is running
- Verify database exists: `createdb patricia_james_wedding_dev`
- Check `.env` file configuration

**Permission Denied:**
- Ensure admin user has proper privileges
- Check database user permissions

**Test Failures:**
- Ensure database is initialized: `node src/database/migrate.js reset`
- Check that sample data exists
- Verify environment variables are set

### Getting Help

1. Check the logs for error messages
2. Verify database connection: `node tests/test-admin-simple.js`
3. Test RSVP system: `node tests/test-rsvp-system.js`
4. Review the `PROJECT_PLAN.md` for detailed documentation

## 📚 Additional Documentation

- `PROJECT_PLAN.md` - Complete project overview and roadmap
- `ADMIN_GUIDE.md` - Detailed admin operations guide
- `SCHEMA_V3_REFINED.md` - Database schema documentation

## 🔄 Next Steps

1. **Authentication System**: Implement user registration and login
2. **Admin Dashboard**: Build RSVP management interface
3. **Photo System**: Implement photo upload and sharing
4. **Security Hardening**: Implement production security measures
5. **Deployment**: Deploy to production with proper security

---

*Last Updated: September 16, 2025*
*Status: Core backend complete, ready for authentication implementation*