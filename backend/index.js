require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5001; // changed due to port conflict

// Middleware
app.use(cors());
app.use(express.json());

// Basic Route
app.get('/', (req, res) => {
    res.json({ message: 'SIMS Backend API Running' });
});

// Auth Routes
const auth = require('./routes/auth');
app.use('/api/auth', auth.router);

// Core Business Routes
app.use('/api/industries', require('./routes/industries'));
app.use('/api/submissions', require('./routes/submissions'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/notifications', require('./routes/notifications'));

// Industrial OS v2 Routes
app.use('/api/public', require('./routes/public'));
app.use('/api/parks', require('./routes/parks'));
app.use('/api/services', require('./routes/services'));
app.use('/api/command', require('./routes/command'));
app.use('/api/compliance', require('./routes/compliance'));
app.use('/api/workspace', require('./routes/workspace'));

// Protected Test Route Ensure RBAC System is functional
app.get('/api/admin-test', auth.requireRole(['admin']), (req, res) => {
    res.json({ message: "Admin Access Granted" });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
