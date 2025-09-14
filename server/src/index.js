require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the client directory
const clientPath = path.join(__dirname, '../../client/src');
console.log('Serving static files from:', clientPath);
app.use(express.static(clientPath));

// API routes
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

// Serve the main HTML file for all non-API routes (SPA routing)
app.use((req, res) => {
  const indexPath = path.join(__dirname, '../../client/src/index.html');
  console.log('Serving index.html from:', indexPath);
  res.sendFile(indexPath);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Application is available at http://localhost:${PORT}`);
});