require('dotenv').config();

// Validate required environment variables on startup (env-config.md workflows)
const requiredEnv = ['DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'];
const missingEnv = requiredEnv.filter(key => !process.env[key]);
if (missingEnv.length > 0) {
    console.error(`[SERVER] [FATAL] Startup failed. Missing required environment variables: ${missingEnv.join(', ')}`);
    console.error('[SERVER] Refer to .env.example to configure the required variables. Exiting...');
    process.exit(1);
}

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
app.use('/api/users', require('./routes/users'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/notifications', require('./routes/notifications'));

// Industrial OS v2 Routes
app.use('/api/public', require('./routes/public'));
app.use('/api/parks', require('./routes/parks'));
app.use('/api/services', require('./routes/services'));
app.use('/api/command', require('./routes/command'));
app.use('/api/compliance', require('./routes/compliance'));
app.use('/api/workspace', require('./routes/workspace'));

// Advanced / Integrations
app.use('/api/ai-decisions', require('./routes/ai-decisions'));
app.use('/api/workflow', require('./routes/workflow-automation'));
app.use('/api/integrations', require('./routes/integrations'));
app.use('/api/grievances', require('./routes/grievances'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/sipcot-sync', require('./routes/sipcot-sync'));

// Protected Test Route Ensure RBAC System is functional
app.get('/api/admin-test', auth.requireRole(['admin']), (req, res) => {
    res.json({ message: "Admin Access Granted" });
});

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================
app.use((err, req, res, next) => {
    console.error('[SERVER] Unhandled Error:', err);
    res.status(500).json({ 
        error: 'Something went wrong on our end!',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`[SERVER] Sipcot SIMS Backend running on port ${PORT}`);
});
