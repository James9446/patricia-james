# Patricia & James Wedding - Backend Server

## Setup Instructions

### 1. Environment Variables

Create a `.env` file in the server directory with the following variables:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/patricia_james_wedding

# Server Configuration
PORT=5001
NODE_ENV=development

# JWT Secret (for future authentication)
JWT_SECRET=your-super-secret-jwt-key-here

# File Upload Configuration (for future photo uploads)
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# Email Configuration (for future RSVP notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

### 2. Database Setup

1. Install PostgreSQL locally or use a cloud service
2. Create a database named `patricia_james_wedding`
3. Update the `DATABASE_URL` in your `.env` file
4. Run the server - it will automatically initialize the database schema

### 3. Install Dependencies

```bash
cd server
npm install
```

### 4. Run the Server

```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

## API Endpoints

### Health Check
- `GET /api/health` - Server health status

### Guests
- `GET /api/guests` - Get all guests
- `GET /api/guests/:id` - Get specific guest
- `POST /api/guests` - Create new guest
- `PUT /api/guests/:id` - Update guest
- `DELETE /api/guests/:id` - Delete guest

### RSVPs
- `GET /api/rsvps` - Get all RSVPs
- `GET /api/rsvps/stats` - Get RSVP statistics
- `GET /api/rsvps/guest/:guestId` - Get RSVP for specific guest
- `POST /api/rsvps` - Submit RSVP
- `PUT /api/rsvps/:id` - Update RSVP
- `DELETE /api/rsvps/:id` - Delete RSVP

## Database Schema

The database includes the following tables:
- `guests` - Guest list with contact information
- `users` - User accounts for photo uploads and interactions
- `rsvps` - RSVP responses from guests
- `photos` - User-uploaded photos
- `photo_comments` - Comments on photos
- `photo_upvotes` - Upvotes on photos

## Development Notes

- The server automatically initializes the database schema on startup
- CORS is enabled for development
- Error handling middleware provides consistent error responses
- All timestamps are stored in UTC with timezone information
