require('dotenv').config();
const express = require('express');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const path = require('path');
const { query } = require('./config/db');

// Import routes
const rsvpsRouter = require('./routes/rsvps');
const authRouter = require('./routes/auth');
const photosRouter = require('./routes/photos');
const categoriesRouter = require('./routes/categories');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Validate required environment variables in production
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  console.error('ERROR: SESSION_SECRET environment variable is required in production');
  process.exit(1);
}

// Session configuration
app.use(session({
  store: new PgSession({
    pool: require('./config/db').pool, // Use the same connection pool
    tableName: 'user_sessions' // Table to store sessions
  }),
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    httpOnly: true, // Prevent XSS attacks
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax' // CSRF protection
  }
}));

// CORS middleware (environment-based)
app.use((req, res, next) => {
  // In production, only allow requests from specific origin
  const allowedOrigin = process.env.CORS_ORIGIN || '*';

  // Set CORS headers
  res.header('Access-Control-Allow-Origin', allowedOrigin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Serve static files from the client directory
const clientPath = path.join(__dirname, '../../client/src');
console.log('Serving static files from:', clientPath);
app.use(express.static(clientPath));

// API routes
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'UP',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Mount API routes
app.use('/api/auth', authRouter);
app.use('/api/rsvps', rsvpsRouter);
app.use('/api/photos', photosRouter);
app.use('/api/categories', categoriesRouter);

// Serve the main HTML file for all non-API routes (SPA routing)
app.use((req, res) => {
  const indexPath = path.join(__dirname, '../../client/src/index.html');
  console.log('Serving index.html from:', indexPath);
  res.sendFile(indexPath);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Initialize database and start server
async function startServer() {
  try {
    // Test database connection (optional for development)
    try {
      const result = await query('SELECT NOW() as current_time');
      console.log('✅ Database connected successfully:', result.rows[0].current_time);
      
      // Check if we have any users (schema v5: combined users table)
      const userCount = await query('SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL');
      console.log(`📊 Current user count: ${userCount.rows[0].count}`);
    } catch (dbError) {
      console.warn('⚠️  Database connection failed:', dbError.message);
      console.log('📝 Server will start without database (development mode)');
      console.log('💡 To enable database features, set up PostgreSQL and configure DATABASE_URL');
      console.log('💡 Run "./db reset --confirm" to initialize the database');
    }
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📱 Application is available at http://localhost:${PORT}`);
      console.log(`🔗 API endpoints available at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();