# THOZHIRPORUL - System Architecture Documentation

## Overview

THOZHIRPORUL is a full-stack industrial monitoring system built with React (frontend) and Node.js/Express (backend), using PostgreSQL as the database.

---

## 1. Technology Stack

### Frontend
```
React 18.x
├── Material-UI (MUI) 5.x - UI Components
├── Recharts 2.x - Data Visualization
├── React Router v6 - Client-side Routing
├── Axios - HTTP Client
└── Emotion/Styled Components - Custom Styling
```

### Backend
```
Node.js 18.x
├── Express.js 4.x - Web Framework
├── PostgreSQL 15.x - Database
├── JWT (jsonwebtoken) - Authentication
├── Bcrypt - Password Hashing
├── PG (node-postgres) - Database Client
└── CORS - Cross-Origin Resource Sharing
```

---

## 2. Project Structure

### Frontend Structure
```
frontend/
├── public/
│   └── assets/
│       ├── logo-transparent.png
│       └── hero.png
├── src/
│   ├── components/
│   │   ├── AIChatbot.jsx
│   │   ├── EnhancedCard.jsx
│   │   ├── LoadingScreen.jsx
│   │   └── SubPageNav.jsx
│   ├── layouts/
│   │   └── MainLayout.jsx
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── RoleSelection.jsx
│   │   ├── Login.jsx
│   │   ├── AdminDashboard.jsx
│   │   ├── IndustryDashboard.jsx
│   │   ├── GovCommandCenter.jsx
│   │   ├── IndustryWorkspace.jsx
│   │   ├── DataSubmission.jsx
│   │   ├── ServicesTracker.jsx
│   │   ├── ComplianceEngine.jsx
│   │   ├── AnalyticsDashboard.jsx
│   │   ├── ReportExportCenter.jsx
│   │   ├── UserManagement.jsx
│   │   └── Settings.jsx
│   ├── services/
│   │   └── api.js
│   ├── styles/
│   │   └── glassmorphism.css
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── package.json
└── vite.config.js
```

### Backend Structure
```
backend/
├── routes/
│   ├── auth.js - Authentication endpoints
│   ├── industries.js - Industry management
│   ├── submissions.js - Data submissions
│   ├── analytics.js - Analytics data
│   ├── reports.js - Report generation
│   ├── notifications.js - User notifications
│   ├── public.js - Public pulse data
│   ├── parks.js - Industrial parks
│   ├── services.js - Service requests
│   ├── command.js - Government command center
│   ├── compliance.js - Compliance monitoring
│   ├── workspace.js - Industry workspace
│   ├── ai-decisions.js - AI recommendations
│   ├── workflow-automation.js - Workflow rules
│   ├── integrations.js - External integrations
│   ├── grievances.js - Public grievances
│   └── sipcot-sync.js - Data synchronization
├── db.js - Database connection
├── index.js - Application entry point
├── seed.sql - Sample data
├── package.json
└── .env - Environment variables
```

---

## 3. Database Schema

### Core Tables

```sql
-- Users & Authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'industry', 'govt')),
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Industry Profiles
CREATE TABLE industry_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    industry_type VARCHAR(100),
    location VARCHAR(255),
    contact_person VARCHAR(100),
    phone_number VARCHAR(15),
    park_id UUID REFERENCES industrial_parks(id)
);

-- Government Profiles
CREATE TABLE govt_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    officer_name VARCHAR(255) NOT NULL,
    designation VARCHAR(100),
    department VARCHAR(100),
    jurisdiction VARCHAR(255)
);

-- Industrial Parks
CREATE TABLE industrial_parks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,
    location VARCHAR(255) NOT NULL,
    district VARCHAR(100) NOT NULL,
    total_area DECIMAL(10,2),
    total_plots INTEGER
);

-- Data Submissions
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    industry_id UUID REFERENCES industry_profiles(user_id),
    submission_type VARCHAR(50) NOT NULL,
    period VARCHAR(20),
    data JSONB,
    status VARCHAR(50) DEFAULT 'Pending',
    submitted_at TIMESTAMP DEFAULT NOW(),
    reviewed_at TIMESTAMP
);

-- Service Requests
CREATE TABLE service_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    industry_id UUID REFERENCES industry_profiles(user_id),
    service_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'Submitted',
    documents JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Compliance Records
CREATE TABLE compliance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    industry_id UUID REFERENCES industry_profiles(user_id),
    category VARCHAR(50),
    score INTEGER CHECK (score BETWEEN 0 AND 100),
    status VARCHAR(50),
    last_updated TIMESTAMP DEFAULT NOW()
);
```

---

## 4. API Architecture

### REST API Endpoints

#### Authentication Routes (`/api/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/login` | User authentication |
| POST | `/register/industry` | Register industry |
| POST | `/register/govt` | Register government officer |
| GET | `/verify` | Verify JWT token |

#### Dashboard Routes (`/api/*`)
| Route | Description | Access |
|-------|-------------|--------|
| `/command/*` | Government command center | Admin, Govt |
| `/workspace/*` | Industry workspace | Industry |
| `/compliance/*` | Compliance monitoring | Admin, Govt |
| `/services/*` | Service requests | All roles |
| `/analytics/*` | Analytics data | Admin, Govt |
| `/reports/*` | Report generation | All roles |

### Request/Response Format

**Standard Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

**Standard Error Response:**
```json
{
  "success": false,
  "error": "Error message",
  "details": { ... }
}
```

---

## 5. Authentication Flow

```
┌──────────┐              ┌──────────┐              ┌──────────┐
│  Client  │              │  Server  │              │ Database │
└─────┬────┘              └─────┬────┘              └─────┬────┘
      │                          │                          │
      │  POST /api/auth/login    │                          │
      │  {email, password}       │                          │
      │─────────────────────────>│                          │
      │                          │                          │
      │                          │  SELECT * FROM users      │
      │                          │  WHERE email = ?          │
      │                          │─────────────────────────>│
      │                          │                          │
      │                          │  User Record             │
      │                          │<─────────────────────────│
      │                          │                          │
      │                          │  bcrypt.compare()        │
      │                          │                          │
      │  {token, role, name}     │                          │
      │<─────────────────────────│                          │
      │                          │                          │
      │  Store token in localStorage                           │
      │                          │                          │
      │  Subsequent requests with x-auth-token header        │
      │─────────────────────────>│                          │
      │                          │                          │
      │  Verify JWT               │                          │
      │  Extract user info        │                          │
      │<─────────────────────────│                          │
```

---

## 6. Component Hierarchy

### Page Component Structure

```
App.jsx
├── Home.jsx (Public)
├── RoleSelection.jsx (Public)
│   └── Login.jsx (Public)
│       ├── IndustryRegistration.jsx (Public)
│       └── GovRegistration.jsx (Public)
│
└── MainLayout.jsx (Protected)
    ├── Header/AppBar
    │   ├── Notifications Menu
    │   └── Profile Menu
    ├── Sidebar (Role-based)
    └── Content Area (Outlet)
        ├── AdminDashboard.jsx (Admin only)
        ├── IndustryDashboard.jsx (Industry only)
        ├── GovCommandCenter.jsx (Govt only)
        ├── IndustryWorkspace.jsx (Industry only)
        ├── DataSubmission.jsx (Industry only)
        ├── ServicesTracker.jsx (All)
        ├── ComplianceEngine.jsx (Admin, Govt)
        ├── AnalyticsDashboard.jsx (Admin, Govt)
        ├── ReportExportCenter.jsx (All)
        ├── UserManagement.jsx (Admin only)
        └── Settings.jsx (All)
```

---

## 7. State Management

### Local Storage Keys

| Key | Description | Example |
|-----|-------------|---------|
| `token` | JWT authentication token | `eyJhbGciOiJIUzI1NiIs...` |
| `role` | User role | `admin`, `industry`, `govt` |
| `userName` | User's name | `John Doe` |
| `userEmail` | User's email | `john@example.com` |
| `companyName` | Company name (industry) | `ABC Manufacturing` |
| `autoActionsEnabled` | Workflow automation toggle | `true`/`false` |
| `aiTasks` | AI decision tasks | JSON array |

### Component-level State

Key components use React `useState` and `useEffect` for:
- Form inputs and validation
- Data fetching and caching
- UI state (modals, drawers, menus)
- Real-time data updates (utility monitoring, alerts)

---

## 8. Real-time Features

### Utility Monitoring (Admin/Govt Dashboards)

```javascript
// Simulated real-time updates (2-3 second intervals)
useEffect(() => {
  const interval = setInterval(() => {
    setUtilityData(prev => ({
      electricity: {
        ...prev.electricity,
        currentFlow: prev.electricity.currentFlow + randomChange,
        lastUpdated: new Date().toISOString()
      },
      // ... similar for water
    }));
  }, 3000);

  return () => clearInterval(interval);
}, []);
```

**Production Implementation:**
- WebSocket connection for real-time updates
- Server-Sent Events (SSE) for one-way updates
- IoT sensor integration via MQTT

---

## 9. Security Implementation

### JWT Middleware

```javascript
const auth = {
  // Authenticate user
  authenticateToken: (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ error: 'Access denied' });

    try {
      const verified = jwt.verify(token, process.env.JWT_SECRET);
      req.user = verified;
      next();
    } catch (err) {
      res.status(400).json({ error: 'Invalid token' });
    }
  },

  // Require specific role
  requireRole: (roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access forbidden' });
    }
    next();
  }
};
```

### Password Hashing

```javascript
const bcrypt = require('bcrypt');
const saltRounds = 10;

// Hash password
const hashPassword = async (password) => {
  return await bcrypt.hash(password, saltRounds);
};

// Compare password
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};
```

---

## 10. Error Handling

### Global Error Handler

```javascript
app.use((err, req, res, next) => {
  console.error('[SERVER] Unhandled Error:', err);

  res.status(500).json({
    success: false,
    error: 'Something went wrong on our end!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});
```

### Client-side Error Handling

```javascript
// Axios interceptor for error handling
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Unauthorized - redirect to login
      authService.logout();
      window.location.href = '/role-selection';
    }
    return Promise.reject(error);
  }
);
```

---

## 11. Performance Considerations

### Frontend Optimization
- Code splitting via React Router lazy loading
- Image optimization (WebP format, lazy loading)
- API response caching (localStorage)
- Debounced search inputs
- Virtual scrolling for large lists

### Backend Optimization
- Database connection pooling (max: 20 connections)
- Query result caching (Redis - planned)
- API rate limiting (planned)
- Database indexing on frequently queried columns
- Pagination for large datasets

---

## 12. Deployment Checklist

### Pre-deployment
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] SSL certificates installed
- [ ] CORS settings verified
- [ ] JWT secrets updated
- [ ] Database backups enabled

### Post-deployment
- [ ] Health check endpoint verified
- [ ] API testing completed
- [ ] Performance benchmarks recorded
- [ ] Monitoring tools configured
- [ ] Error logging enabled
- [ ] User acceptance testing (UAT) completed

---

*This architecture document is a living document and will be updated as the system evolves.*
