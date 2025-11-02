// test-server.js
const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// Serve static files from current directory
app.use(express.static(__dirname));

// Basic route
app.get('/', (req, res) => {
  console.log('📄 Serving index.html');
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/details.html', (req, res) => {
  console.log('📄 Serving details.html');
  res.sendFile(path.join(__dirname, 'details.html'));
});

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Test server running on http://localhost:${PORT}`);
  console.log(`📁 Current directory: ${__dirname}`);
});