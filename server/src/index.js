require('dotenv').config();
const express = require('express');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const path = require('path');
const { query } = require('./config/db');
const logger = require('./config/logger');

// Import routes
const rsvpsRouter = require('./routes/rsvps');
const authRouter = require('./routes/auth');
const photosRouter = require('./routes/photos');
const categoriesRouter = require('./routes/categories');

const app = express();
const PORT = process.env.PORT || 5001;

// Trust first proxy (required for Render/Cloudflare to handle secure cookies)
app.set('trust proxy', 1);

// Middleware - Increase body size limits for photo uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Validate required environment variables in production
if (process.env.NODE_ENV === 'production') {
  const requiredEnvVars = ['DATABASE_URL', 'SESSION_SECRET'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    logger.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    logger.error('Please set these variables in your environment configuration');
    process.exit(1);
  }
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
logger.info(`Serving static files from: ${clientPath}`);
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
  logger.debug(`Serving index.html from: ${indexPath}`);
  res.sendFile(indexPath);
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`, { stack: err.stack });
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
      logger.info(`Database connected successfully: ${result.rows[0].current_time}`);

      // Check if we have any users (schema v5: combined users table)
      const userCount = await query('SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL');
      logger.info(`Current user count: ${userCount.rows[0].count}`);
    } catch (dbError) {
      logger.warn(`Database connection failed: ${dbError.message}`);
      logger.info('Server will start without database (development mode)');
      logger.info('To enable database features, set up PostgreSQL and configure DATABASE_URL');
      logger.info('Run "./db reset --confirm" to initialize the database');
    }

    // Start the server
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`Application is available at http://localhost:${PORT}`);
      logger.info(`API endpoints available at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`, { stack: error.stack });
    process.exit(1);
  }
}

startServer();