require('dotenv').config();
const express = require('express');
const path = require('path');
const { initializeDatabase } = require('./database/init');

// Import routes
const guestsRouter = require('./routes/guests');
const rsvpsRouter = require('./routes/rsvps');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware (for development)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
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
app.use('/api/guests', guestsRouter);
app.use('/api/rsvps', rsvpsRouter);

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
    // Try to initialize database (optional for development)
    try {
      await initializeDatabase();
      console.log('✅ Database connected and initialized');
    } catch (dbError) {
      console.warn('⚠️  Database connection failed:', dbError.message);
      console.log('📝 Server will start without database (development mode)');
      console.log('💡 To enable database features, set up PostgreSQL and configure DATABASE_URL');
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