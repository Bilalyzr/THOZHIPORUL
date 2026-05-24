# THOZHIRPORUL BY NEXORA
## Smart Industrial Monitoring System (SIMS)
### Product Requirements Document (PRD) v2.0

**Version:** 2.0  
**Last Updated:** 2026-05-07  
**Product Owner:** SIPCOT (State Industries Promotion Corporation of Tamil Nadu)  
**Technology Partner:** NEXORA  
**Document Status:** Released  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Overview](#2-product-overview)
3. [User Roles & Personas](#3-user-roles--personas)
4. [System Architecture](#4-system-architecture)
5. [Module Specifications](#5-module-specifications)
6. [Data Models](#6-data-models)
7. [API Specifications](#7-api-specifications)
8. [Security & Compliance](#8-security--compliance)
9. [Deployment Architecture](#9-deployment-architecture)
10. [Future Roadmap](#10-future-roadmap)

---

## 1. Executive Summary

### 1.1 Vision
THOZHIRPORUL is a transformative Industrial Operating System designed to digitize and modernize Tamil Nadu's industrial park governance. The platform enables real-time monitoring, compliance tracking, and streamlined service delivery for industries across all SIPCOT parks.

### 1.2 Key Objectives
- **Digitization**: 100% paperless operations for industry-government interactions
- **Transparency**: Real-time visibility into industrial operations and compliance status
- **Efficiency**: Reduce service delivery timelines from weeks to days
- **Data-Driven Decisions**: AI-powered insights for policy and infrastructure planning
- **Ease of Doing Business**: Single-window portal for all industry needs

### 1.3 Target Metrics
| Metric | Current | Target (2026) |
|--------|---------|---------------|
| Industries Onboarded | 1,250+ | 2,000 |
| Service Processing Time | 15-30 days | < 7 days |
| Compliance Reporting Rate | 60% | 95% |
| Digital Service Requests | 30% | 90% |
| User Satisfaction | N/A | 4.5/5 |

---

## 2. Product Overview

### 2.1 Platform Name & Branding
- **Product Name**: THOZHIRPORUL (தொழில்புரள்)
- **Tagline**: Smart Industrial Monitoring System
- **By**: NEXORA (Technology Partner)
- **Government Body**: SIPCOT, Government of Tamil Nadu

### 2.2 Core Value Propositions

| For Industries | For Government Officers | For Administrators |
|----------------|------------------------|-------------------|
| Single-window services | State-wide oversight | Complete system control |
| Real-time compliance tracking | Data-driven policy making | User management |
| Document management | Red flag identification | Analytics & reporting |
| Mobile inspection ready | Performance monitoring | Workflow automation |

### 2.3 Supported Industrial Parks
1. **Oragadam** (ORGDM) - Automotive Hub
2. **Sriperumbudur** (SRPBR) - Manufacturing
3. **Hosur** (HOSUR) - Industrial Hub
4. **Cheyyar** (CHYYR) - Manufacturing
5. **Thoothukudi** (THOOT) - Special Economic Zone
6. **Gangaikondan** (GNGKN) - Textiles & Manufacturing

---

## 3. User Roles & Personas

### 3.1 Role-Based Access Control (RBAC)

#### **3.1.1 Administrator**
**Access Level**: Full System Control  
**Color Theme**: Blue (#1F4E79)

**Responsibilities**:
- System configuration and monitoring
- User management (create, modify, deactivate)
- Industrial park management
- Workflow automation rules
- AI decision support oversight
- Global analytics and reporting

**Key Features**:
- Admin Dashboard with global KPIs
- User Management Module
- Command Center Access
- Compliance Engine
- Analytics Dashboard
- Settings & Configuration

---

#### **3.1.2 Industry User**
**Access Level**: Single Industry Scope  
**Color Theme**: Green (#2E7D32)

**Responsibilities**:
- Data submission (quarterly/annual)
- Compliance monitoring
- Service request management
- Document management
- Lease renewal tracking

**Key Features**:
- Industry Workspace
- Company Profile Management
- Data Submission Module
- Compliance Score Tracking
- Service Requests (NOC, approvals)
- Report Center

---

#### **3.1.3 Government Officer**
**Access Level**: State/District Oversight  
**Color Theme**: Orange (#E67E22)

**Responsibilities**:
- Command center operations
- Cross-park analytics
- Compliance monitoring
- Service request approvals
- Red flag management
- Report generation

**Key Features**:
- Government Command Center
- Parks Explorer
- Compliance Engine
- Analytics Dashboard
- Service Request Oversight
- Report Export Center

---

### 3.2 User Personas

#### **Persona 1: Rajesh - Factory Manager**
- **Age**: 45 years
- **Industry**: Automotive Manufacturing, Oragadam
- **Pain Points**: 
  - Spending 2-3 days/month on compliance paperwork
  - Unclear NOC approval status
  - Manual report submissions
- **Goals**: 
  - Track compliance in real-time
  - Get quick approvals
  - Mobile-friendly reporting

#### **Persona 2: Priya - District Industrial Officer**
- **Age**: 32 years
- **Role**: Government Officer, Kancheepuram District
- **Pain Points**:
  - No visibility into non-compliant industries
  - Manual park comparisons
  - Delayed grievance redressal
- **Goals**:
  - Proactive compliance monitoring
  - Data-backed decision making
  - Faster grievance resolution

#### **Persona 3: Kumar - SIPCOT System Administrator**
- **Age**: 38 years
- **Role**: IT Administrator, SIPCOT HQ
- **Pain Points**:
  - Managing 1250+ industry accounts manually
  - No centralized reporting
  - Difficulty tracking system-wide issues
- **Goals**:
  - Efficient user management
  - Centralized monitoring dashboard
  - Automated workflows

---

## 4. System Architecture

### 4.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          THOZHIRPORUL PLATFORM                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   React      │  │   React      │  │   React      │              │
│  │  Frontend    │  │  Frontend    │  │  Frontend    │              │
│  │   (Admin)    │  │  (Industry)  │  │   (Govt)     │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                 │                       │
│         └─────────────────┴─────────────────┘                       │
│                           │                                         │
│                    ┌──────▼──────┐                                 │
│                    │   Material  │                                 │
│                    │     UI      │                                 │
│                    └──────┬──────┘                                 │
├───────────────────────────┼─────────────────────────────────────┤ │
│                           │         REST API Layer                 │ │
│                    ┌──────▼──────┐                                 │ │
│                    │  Express.js │                                 │ │
│                    │   Backend   │                                 │ │
│                    │   (Node)    │                                 │ │
│                    └──────┬──────┘                                 │ │
│                           │                                         │ │
│  ┌────────────────────────┼──────────────────────────────────┐    │ │
│  │                        │                                  │    │ │
│  │  ┌──────────────┐   ┌──▼──────┐   ┌──────────────┐     │    │ │
│  │  │   Auth &     │   │ Business│   │  Integration │     │    │ │
│  │  │     RBAC     │   │ Logic   │   │    Layer     │     │    │ │
│  │  └──────────────┘   └─────────┘   └──────────────┘     │    │ │
│  │                                                           │    │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │    │ │
│  │  │ AI Decision  │  │  Workflow    │  │  Notification│  │    │ │
│  │  │   Engine     │  │ Automation   │  │   Service    │  │    │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │    │ │
│  │                                                           │    │ │
│  └───────────────────────────────────────────────────────────┘    │ │
├─────────────────────────────────────────────────────────────┤ │
│                       Data Layer                              │ │
│  ┌──────────────────────────────────────────────────────┐   │ │
│  │              PostgreSQL Database                     │   │ │
│  │  • Users & Profiles                                   │   │ │
│  │  • Industry Data                                      │   │ │
│  │  • Compliance Records                                 │   │ │
│  │  • Service Requests                                   │   │ │
│  │  • Analytics Data                                     │   │ │
│  └──────────────────────────────────────────────────────┘   │ │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Technology Stack

#### **Frontend Stack**
| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | React | 18.x |
| UI Library | Material-UI (MUI) | 5.x |
| Charts | Recharts | 2.x |
| HTTP Client | Axios | 1.x |
| Routing | React Router v6 | 6.x |
| State Management | React Hooks + LocalStorage | - |

#### **Backend Stack**
| Component | Technology | Version |
|-----------|-----------|---------|
| Runtime | Node.js | 18.x |
| Framework | Express.js | 4.x |
| Database | PostgreSQL | 15.x |
| Authentication | JWT (bcrypt) | - |
| API Style | RESTful | - |

#### **DevOps & Infrastructure**
| Component | Technology | Purpose |
|-----------|-----------|---------|
| Web Server | Nginx | Reverse Proxy |
| Container | Docker | Application Containerization |
| Database Pool | PgBouncer | Connection Pooling |

### 4.3 Database Architecture

#### **Core Tables**

```sql
-- Users & Authentication
users (id, email, password_hash, role, status, created_at)

-- Role-Specific Profiles
industry_profiles (user_id, company_name, industry_type, location, contact_person, phone_number, park_id)
govt_profiles (user_id, officer_name, designation, department, jurisdiction)

-- Industrial Parks
industrial_parks (id, name, code, location, district, total_area, total_plots)

-- Data Submissions
submissions (id, industry_id, submission_type, period, data, status, submitted_at, reviewed_at)

-- Compliance
compliance_records (id, industry_id, category, score, status, last_updated)

-- Service Requests
service_requests (id, industry_id, service_type, status, created_at, updated_at, documents)

-- Analytics & Monitoring
utility_data (id, park_id, type, current_value, timestamp)

-- AI & Workflow
ai_recommendations (id, industry_id, recommendation_type, priority, status, created_at)
workflow_executions (id, rule_id, entity_id, action_taken, executed_at)
```

---

## 5. Module Specifications

### 5.1 Authentication & Authorization Module

#### **5.1.1 Features**
1. **Role-Based Login**
   - Separate login portals for Admin, Industry, and Government users
   - Role-specific UI theming and navigation
   - Cross-role access prevention

2. **User Registration**
   - Industry Registration: Company details, license, location
   - Government Officer Registration: Official ID, department, jurisdiction
   - Email verification workflow

3. **Session Management**
   - JWT-based authentication
   - Token refresh mechanism
   - Auto-logout on inactivity

4. **Password Management**
   - Secure password hashing (bcrypt)
   - Password reset flow
   - Forgot password functionality

#### **5.1.2 API Endpoints**

| Endpoint | Method | Description | Access |
|----------|--------|-------------|--------|
| `/api/auth/login` | POST | User login | Public |
| `/api/auth/register/industry` | POST | Register industry | Public |
| `/api/auth/register/govt` | POST | Register government officer | Public |
| `/api/auth/verify` | GET | Verify token | Protected |

---

### 5.2 Admin Dashboard Module

#### **5.2.1 Features**

##### **Global KPI Cards**
- Total Industries (with growth rate)
- Total Investment (₹ Crores)
- Total Employment (Direct + Indirect)
- Power Consumption (Real-time)

##### **Charts & Visualizations**
1. **Industry Growth Trend** (Line Chart - 2021-2025)
2. **Resource Consumption** (Bar Chart - Power vs Water)
3. **Real-Time Utility Monitoring**
   - Electricity: Current flow, peak/min, tariff, run rate
   - Water: Current flow, peak/min, tariff, run rate
   - Live pulse indicators

##### **AI Decision Support**
- Critical alerts (water usage spikes, missed deadlines)
- Low-risk actions (lease renewals, auto-approvals)
- Action execution buttons
- Auto-actions toggle

##### **Workflow Automation Engine**
- Active rules list
- Execution statistics
- Automation enable/disable
- Activity log access

#### **5.2.2 Page Components**
```
AdminDashboard/
├── Header (Title, Subtitle)
├── KPI Cards Row (4 cards)
├── Charts Row (2 charts)
├── Utility Monitoring (2 cards)
└── AI & Workflow Section (2 cards)
```

---

### 5.3 Industry Portal Module

#### **5.3.1 Features**

##### **Industry Workspace**
- Company overview dashboard
- Compliance score display
- Recent submissions feed
- Quick action buttons

##### **Company Profile Management**
- Company details editing
- Document uploads
- License information
- Contact details

##### **Data Submission**
- Quarterly data submission forms
- Power consumption data
- Water consumption data
- Employment data
- Investment data
- Draft saving functionality

##### **Compliance Tracking**
- Real-time compliance score
- Category-wise breakdown
- Violation alerts
- Improvement suggestions

##### **Service Requests**
- NOC requests (Fire, Pollution, Building)
- License renewal
- Plot extension
- Transfer requests
- Status tracking

##### **Report Center**
- Pre-built report templates
- Custom report generation
- Export to PDF/Excel
- Historical reports

#### **5.3.2 Page Components**
```
IndustryDashboard/
├── Header (Company Name, Compliance Badge)
├── KPI Cards (Employees, Investment, Power, Water)
├── Resource Consumption Chart
└── Recent Submissions Feed
```

---

### 5.4 Government Command Center Module

#### **5.4.1 Features**

##### **State-Level KPIs**
- Total CapEx (₹ Crores)
- Total Revenue
- Direct/Indirect Employment
- Red Flags Count

##### **District Heatmap**
- District-wise investment distribution
- Park-wise breakdown
- Interactive drill-down

##### **Park Performance Rankings**
- Infrastructure score
- Investment comparison
- Employment comparison
- Sortable columns

##### **Real-Time Utility Monitoring**
- State-wide power flow
- State-wide water consumption
- Cost run rates
- Tariff information

##### **AI Decision Support**
- Critical alerts (state-wide)
- Batch recommendations
- Priority-based action queue

##### **Workflow Automation**
- State-level rules
- Automated approvals
- Escalation management
- Activity monitoring

##### **Alerts & Action Items**
- Severity-based categorization
- Action buttons
- Assignment capability

##### **5-Year Growth Trends**
- Investment trends
- Employment trends
- Toggle-based visualization

#### **5.4.2 Page Components**
```
GovCommandCenter/
├── Header (State Industrial Command Center)
├── KPI Cards (5 cards)
├── Heatmap & Rankings (2 columns)
├── Utility Monitoring (2 cards)
├── AI & Workflow (2 cards)
├── Alerts & Trends (2 columns)
└── Activity Feed
```

---

### 5.5 Compliance Engine Module

#### **5.5.1 Features**

##### **Compliance Overview**
- Overall compliance rate
- Category-wise breakdown
- Trend analysis

##### **Violation Management**
- Violation list with filters
- Severity indicators
- Action taken tracking
- Resolution workflow

##### **Missing Submissions**
- Industries pending submission
- Deadline tracking
- Auto-reminders

##### **Compliance Trends**
- Time-series analysis
- Predictive insights
- Category trends

##### **Compliance Score by Category**
- Environmental compliance
- Safety compliance
- Financial compliance
- Operational compliance

#### **5.5.2 API Endpoints**

| Endpoint | Method | Description | Access |
|----------|--------|-------------|--------|
| `/api/compliance/overview` | GET | Compliance overview | Admin, Govt |
| `/api/compliance/violations` | GET | List violations | Admin, Govt |
| `/api/compliance/violations/:id` | PUT | Update violation | Admin, Govt |
| `/api/compliance/missing-submissions` | GET | Missing submissions | Admin, Govt |
| `/api/compliance/trends` | GET | Compliance trends | Admin, Govt |
| `/api/compliance/predictions` | GET | AI predictions | Admin |
| `/api/compliance/by-category` | GET | Category breakdown | Admin, Govt |

---

### 5.6 Services Tracker Module

#### **5.6.1 Service Types**

| Service Type | Description | Typical SLA |
|--------------|-------------|-------------|
| NOC - Fire | Fire Safety NOC | 7 days |
| NOC - Pollution | Pollution Control NOC | 10 days |
| NOC - Building | Building Plan Approval | 14 days |
| Lease Renewal | Lease Renewal | 5 days |
| Plot Allotment | New Plot Allotment | 30 days |
| Transfer Request | Ownership Transfer | 21 days |
| Water Connection | Water Connection Request | 7 days |
| Power Connection | Power Connection Request | 10 days |

#### **5.6.2 Features**

##### **Service Request Creation**
- Multi-step form wizard
- Document uploads
- Auto-populated industry details
- Draft saving

##### **Request Tracking**
- Status timeline
- Approver comments
- Document viewing
- Estimated completion

##### **Bottleneck Analysis**
- Identify delayed requests
- Approver-wise analysis
- Service-type analysis
- Park-wise comparison

##### **Bulk Actions**
- Bulk approval (low-risk)
- Bulk rejection
- Bulk escalation

#### **5.6.3 Workflow States**

```
Submitted → Under Review → Site Inspection (if applicable) → 
Approved / Rejected → Completed / Closed
```

---

### 5.7 Analytics Dashboard Module

#### **5.7.1 Features**

##### **Global Analytics**
- State-wide metrics
- District-wise breakdown
- Park-wise comparison

##### **Investment Analytics**
- Total investment trends
- Sector-wise distribution
- Location analysis
- Growth projections

##### **Employment Analytics**
- Direct employment trends
- Indirect employment trends
- Sector-wise employment
- Location-wise distribution

##### **Resource Analytics**
- Power consumption trends
- Water consumption trends
- Peak demand analysis
- Conservation insights

##### **Performance Benchmarks**
- Park performance scores
- Industry performance scores
- Compliance rankings
- Service delivery metrics

---

### 5.8 Report Center Module

#### **5.8.1 Report Types**

| Report Type | Description | Access | Format |
|-------------|-------------|--------|--------|
| Compliance Report | Industry compliance summary | Admin, Govt | PDF, Excel |
| Utilization Report | Park utilization stats | Admin, Govt | PDF, Excel |
| Service Report | Service delivery metrics | Admin, Govt | PDF, Excel |
| Investment Report | Investment trends | Admin, Govt, Industry | PDF, Excel |
| Employment Report | Employment statistics | Admin, Govt | PDF, Excel |
| Environmental Report | Environmental impact | Admin, Govt | PDF |
| Annual Report | Year-end summary | Admin | PDF |

#### **5.8.2 Features**

##### **Report Generation**
- Date range selection
- Filter parameters
- Preview capability
- Scheduled reports

##### **Export Options**
- PDF with charts
- Excel with raw data
- CSV for analysis
- Email delivery

##### **Report Templates**
- Pre-built templates
- Custom template creation
- Template sharing
- Version history

---

### 5.9 AI Decision Support Module

#### **5.9.1 Features**

##### **Recommendation Engine**
- Risk-based recommendations
- Priority scoring
- Action suggestions
- Impact analysis

##### **Batch Processing**
- Multi-industry analysis
- Bulk recommendations
- Priority queue
- Auto-approval rules

##### **Dashboard Summary**
- Critical alerts count
- High-priority items
- Auto-approved count
- Escalated items

#### **5.9.2 Recommendation Types**

| Type | Trigger | Action | Priority |
|------|---------|--------|----------|
| Water Usage Spike | >200% increase | Schedule inspection | Critical |
| Missed Deadline | Past submission date | Issue warning | High |
| Compliance Drop | Score drop >10% | Notify industry | Medium |
| Lease Renewal | 30 days before expiry | Auto-approve if good standing | Low |
| NOC Request | Compliance >90% | Auto-approve | Low |

---

### 5.10 Workflow Automation Module

#### **5.10.1 Features**

##### **Rule Configuration**
- Create custom rules
- Edit existing rules
- Enable/disable rules
- Rule testing

##### **Rule Types**
- Auto-approval rules
- Escalation rules
- Notification rules
- Data validation rules

##### **Execution Engine**
- Real-time evaluation
- Batch processing
- Audit logging
- Error handling

##### **Activity Monitoring**
- Execution logs
- Success/failure metrics
- Performance tracking
- Debugging tools

#### **5.10.2 Sample Rules**

```javascript
// Rule 1: Auto-approve NOC for high-compliance industries
{
  name: "Auto-approve NOC (Compliance > 90%)",
  condition: "compliance_score > 90",
  action: "auto_approve",
  service_types: ["NOC_FIRE", "NOC_POLLUTION"],
  executions: 45
}

// Rule 2: Escalate critical violations
{
  name: "Escalate critical violations",
  condition: "severity == 'critical' AND age > 7 days",
  action: "escalate_to_district_officer",
  executions: 8
}
```

---

## 6. Data Models

### 6.1 Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐
│     users       │       │ industrial_parks│
├─────────────────┤       ├─────────────────┤
│ id (PK)         │───┐   │ id (PK)         │
│ email           │   │   │ name            │
│ password_hash   │   │   │ code            │
│ role            │   │   │ location        │
│ status          │   │   │ district        │
│ created_at      │   │   │ total_area      │
└─────────────────┘   │   └─────────────────┘
                      │           │
                      │           │
         ┌────────────┴───────────┘
         │
         │
┌────────▼──────────────────┐
│   industry_profiles        │
├───────────────────────────┤
│ user_id (FK)              │
│ company_name              │
│ industry_type             │
│ location                  │
│ park_id (FK)              │
│ contact_person            │
│ phone_number              │
└───────────────────────────┘
         │
         │
         ├────────────────────────────────────────────┐
         │                                            │
┌────────▼──────────┐                    ┌───────────▼──────────┐
│   submissions     │                    │  service_requests    │
├───────────────────┤                    ├──────────────────────┤
│ id (PK)           │                    │ id (PK)              │
│ industry_id (FK)  │                    │ industry_id (FK)     │
│ submission_type   │                    │ service_type         │
│ period            │                    │ status               │
│ data              │                    │ created_at           │
│ status            │                    │ updated_at           │
│ submitted_at      │                    │ documents            │
│ reviewed_at       │                    └──────────────────────┘
└───────────────────┘
         │
         │
┌────────▼──────────────────────┐
│   compliance_records          │
├───────────────────────────────┤
│ id (PK)                       │
│ industry_id (FK)              │
│ category                      │
│ score                         │
│ status                        │
│ last_updated                  │
└───────────────────────────────┘
```

### 6.2 Data Dictionary

#### **users**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, Auto | User unique identifier |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User email |
| password_hash | VARCHAR(255) | NOT NULL | Bcrypt hashed password |
| role | ENUM | NOT NULL | 'admin', 'industry', 'govt' |
| status | VARCHAR(50) | DEFAULT 'Active' | Account status |
| created_at | TIMESTAMP | DEFAULT NOW() | Account creation time |

#### **industrial_parks**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, Auto | Park unique identifier |
| name | VARCHAR(255) | NOT NULL | Park name |
| code | VARCHAR(10) | UNIQUE, NOT NULL | Park code |
| location | VARCHAR(255) | NOT NULL | Park location |
| district | VARCHAR(100) | NOT NULL | District name |
| total_area | DECIMAL | Total area in acres | |
| total_plots | INTEGER | Total number of plots | |

#### **industry_profiles**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| user_id | UUID | FK → users.id, PK | User reference |
| company_name | VARCHAR(255) | NOT NULL | Company name |
| industry_type | VARCHAR(100) | Industry category | |
| location | VARCHAR(255) | Company location | |
| contact_person | VARCHAR(100) | Primary contact | |
| phone_number | VARCHAR(15) | Contact number | |
| park_id | UUID | FK → industrial_parks.id | Park reference |

#### **submissions**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, Auto | Submission ID |
| industry_id | UUID | FK → industry_profiles.user_id | Industry reference |
| submission_type | VARCHAR(50) | NOT NULL | Type of submission |
| period | VARCHAR(20) | Reporting period | |
| data | JSONB | Submission data | |
| status | VARCHAR(50) | DEFAULT 'Pending' | Review status |
| submitted_at | TIMESTAMP | Submission time | |
| reviewed_at | TIMESTAMP | Review completion | |

#### **service_requests**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, Auto | Request ID |
| industry_id | UUID | FK → industry_profiles.user_id | Industry reference |
| service_type | VARCHAR(50) | NOT NULL | Service type |
| status | VARCHAR(50) | DEFAULT 'Submitted' | Request status |
| created_at | TIMESTAMP | Creation time | |
| updated_at | TIMESTAMP | Last update | |
| documents | JSONB | Attached documents | |

#### **compliance_records**
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, Auto | Record ID |
| industry_id | UUID | FK → industry_profiles.user_id | Industry reference |
| category | VARCHAR(50) | Compliance category | |
| score | INTEGER | 0-100 | Compliance score |
| status | VARCHAR(50) | Compliant/Non-Compliant | |
| last_updated | TIMESTAMP | Last update time | |

---

## 7. API Specifications

### 7.1 Authentication APIs

#### POST `/api/auth/login`
Authenticate user and return JWT token.

**Request:**
```json
{
  "email": "admin@sipcot.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "role": "admin",
  "name": "Administrator",
  "email": "admin@sipcot.com"
}
```

#### POST `/api/auth/register/industry`
Register a new industry user.

**Request:**
```json
{
  "email": "industry@company.com",
  "password": "password123",
  "company_name": "ABC Manufacturing",
  "industry_type": "Automotive",
  "location": "Oragadam",
  "contact_person": "John Doe",
  "phone_number": "9876543210",
  "park_id": "park-uuid"
}
```

---

### 7.2 Dashboard APIs

#### GET `/api/command/kpis`
Get state-level KPIs for government command center.

**Response:**
```json
{
  "total_capex_cr": 24500,
  "capex_growth_pct": 4.2,
  "total_revenue_cr": 18200,
  "revenue_growth_pct": 2.1,
  "direct_employment": 89000,
  "indirect_employment": 56000,
  "red_flags": 12
}
```

#### GET `/api/workspace/overview`
Get industry workspace overview.

**Response:**
```json
{
  "company_name": "ABC Manufacturing",
  "compliance_score": 87,
  "compliance_status": "Compliant",
  "pending_submissions": 2,
  "active_requests": 1,
  "recent_activity": [...]
}
```

---

### 7.3 Compliance APIs

#### GET `/api/compliance/overview`
Get compliance overview.

**Query Parameters:** `park_id`, `district`, `period`

**Response:**
```json
{
  "total_industries": 1250,
  "compliant_count": 1100,
  "non_compliant_count": 150,
  "compliance_rate": 88,
  "by_category": {
    "environmental": 92,
    "safety": 85,
    "financial": 90,
    "operational": 86
  }
}
```

#### GET `/api/compliance/violations`
Get list of compliance violations.

**Query Parameters:** `severity`, `status`, `park_id`, `page`, `limit`

**Response:**
```json
{
  "violations": [
    {
      "id": "vio-1",
      "industry_id": "ind-1",
      "industry_name": "LMN Textiles",
      "category": "environmental",
      "severity": "critical",
      "description": "Water usage exceeded 200% of permitted limit",
      "status": "open",
      "created_at": "2026-04-15T10:30:00Z"
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 20
}
```

---

### 7.4 Service APIs

#### POST `/api/services`
Create a new service request.

**Request:**
```json
{
  "service_type": "NOC_FIRE",
  "description": "Fire safety NOC for new warehouse",
  "documents": ["file1.pdf", "file2.pdf"],
  "priority": "normal"
}
```

#### PUT `/api/services/:id/status`
Update service request status.

**Request:**
```json
{
  "status": "Approved",
  "comments": "Site inspection completed. All requirements met."
}
```

#### GET `/api/services/bottlenecks`
Get bottleneck analysis.

**Response:**
```json
{
  "bottlenecks": [
    {
      "approver": "District Officer",
      "avg_processing_time_days": 18,
      "pending_count": 45,
      "service_types": ["NOC_POLLUTION", "NOC_BUILDING"]
    }
  ]
}
```

---

### 7.5 AI Decision APIs

#### GET `/api/ai-decisions/recommendations/:industryId`
Get AI recommendations for an industry.

**Response:**
```json
{
  "recommendations": [
    {
      "id": "rec-1",
      "type": "warning",
      "priority": "critical",
      "title": "Water usage spike detected",
      "description": "Water usage increased by 250% compared to last quarter",
      "suggested_actions": ["Schedule inspection", "Issue warning"],
      "confidence": 0.92
    }
  ]
}
```

#### POST `/api/ai-decisions/batch`
Get batch recommendations for multiple industries.

**Request:**
```json
{
  "industry_ids": ["ind-1", "ind-2", "ind-3"],
  "recommendation_types": ["all"],
  "priority_threshold": "medium"
}
```

---

### 7.6 Workflow APIs

#### POST `/api/workflow/evaluate`
Evaluate workflow rules.

**Request:**
```json
{
  "entity_type": "service_request",
  "entity_id": "req-1",
  "context": {
    "compliance_score": 95,
    "service_type": "NOC_FIRE"
  }
}
```

**Response:**
```json
{
  "actions": [
    {
      "rule_id": "rule-1",
      "action": "auto_approve",
      "reason": "Compliance score > 90%",
      "execute_immediately": true
    }
  ]
}
```

#### GET `/api/workflow/activity-log`
Get workflow execution log.

**Query Parameters:** `rule_id`, `entity_id`, `from_date`, `to_date`

---

## 8. Security & Compliance

### 8.1 Authentication Security

#### **Password Policy**
- Minimum 8 characters
- Must include uppercase, lowercase, number
- Bcrypt hashing with salt rounds = 10
- Password reset via email link

#### **JWT Token Management**
- Token expiration: 24 hours
- Refresh token: 7 days
- Stored in localStorage with prefix
- Auto-refresh on API calls

#### **Session Security**
- Auto-logout after 30 minutes inactivity
- Token validation on each API call
- Logout clears all localStorage data

### 8.2 Authorization Security

#### **Role-Based Access Control (RBAC)**
```javascript
// Access Control Matrix
const permissions = {
  admin: [
    'users:read', 'users:write', 'users:delete',
    'parks:read', 'parks:write',
    'compliance:read', 'compliance:write',
    'services:read', 'services:approve', 'services:reject',
    'analytics:read',
    'settings:read', 'settings:write'
  ],
  govt: [
    'parks:read',
    'compliance:read',
    'services:read', 'services:approve', 'services:reject',
    'analytics:read',
    'reports:read', 'reports:generate'
  ],
  industry: [
    'workspace:read',
    'submissions:read', 'submissions:write',
    'services:read', 'services:create',
    'compliance:read',
    'documents:read', 'documents:write'
  ]
};
```

#### **Route Protection**
- Public routes: `/home`, `/role-selection`, `/login/*`, `/registration`
- Protected routes: All dashboard routes
- Role-specific routes: `/admin-dashboard`, `/workspace`, `/command-center`

### 8.3 Data Security

#### **Encryption**
- Passwords: Bcrypt hashing
- Data in transit: HTTPS/TLS
- Data at rest: PostgreSQL encryption

#### **Data Privacy**
- PII encryption for phone numbers
- Email privacy protection
- Document access control
- Audit logging for sensitive operations

#### **Input Validation**
- SQL injection prevention (parameterized queries)
- XSS prevention (input sanitization)
- CSRF protection (token validation)
- File upload validation

### 8.4 Compliance Standards

| Standard | Status | Notes |
|----------|--------|-------|
| ISO 27001 | Planned | Information Security Management |
| GDPR | Partial | Data protection for EU users |
| IT Act 2000 | Compliant | Indian IT law compliance |
| OWASP Top 10 | Addressed | Web application security |

---

## 9. Deployment Architecture

### 9.1 Production Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Internet                             │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ HTTPS (443)
                      │
              ┌───────▼────────┐
              │   Nginx / AWS  │
              │   Load Balancer│
              └───────┬────────┘
                      │
      ┌───────────────┼───────────────┐
      │               │               │
┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐
│  Docker   │  │  Docker   │  │  Docker   │
│ Container │  │ Container │  │ Container │
│  (App 1)  │  │  (App 2)  │  │  (App 3)  │
│  Port:    │  │  Port:    │  │  Port:    │
│  5001     │  │  5001     │  │  5001     │
└─────┬─────┘  └─────┬─────┘  └─────┬─────┘
      │              │              │
      └──────────────┼──────────────┘
                     │
         ┌───────────▼───────────┐
         │  PostgreSQL Database  │
         │  (Port: 5432)         │
         │  - Primary            │
         │  - Replica (Read)     │
         └───────────────────────┘
```

### 9.2 Environment Configuration

#### **Frontend (.env)**
```bash
VITE_API_URL=https://api.thozhirporul.tn.gov.in
VITE_APP_NAME=THOZHIRPORUL
VITE_VERSION=2.0.0
```

#### **Backend (.env)**
```bash
NODE_ENV=production
PORT=5001
DB_HOST=production-db.internal
DB_PORT=5432
DB_NAME=sipcot_production
DB_USER=app_user
DB_PASSWORD=encrypted_password
JWT_SECRET=production_jwt_secret
JWT_EXPIRY=24h
```

### 9.3 Deployment Steps

#### **Frontend Deployment**
1. Build React app: `npm run build`
2. Serve static files via Nginx
3. Configure SSL certificates
4. Set up CDN for static assets

#### **Backend Deployment**
1. Build Docker image
2. Push to container registry
3. Deploy to production servers
4. Run database migrations
5. Configure health checks

---

## 10. Future Roadmap

### 10.1 Phase 3 Features (Q3 2026)

#### **Advanced Analytics**
- Predictive maintenance for park infrastructure
- Demand forecasting for utilities
- Investment trend prediction
- Industry performance benchmarking

#### **Enhanced Mobile Experience**
- React Native mobile app
- Offline data capture
- Push notifications
- Biometric authentication

#### **Integration Expansion**
- TANGEDCO API integration (real-time power data)
- TWAD Board API integration (water data)
- GST portal integration
- Tamil Nadu Single Window integration

### 10.2 Phase 4 Features (Q4 2026)

#### **AI/ML Enhancements**
- Anomaly detection for compliance violations
- Natural language processing for grievances
- Chatbot for industry support
- Automated report generation

#### **Blockchain Integration**
- Document verification
- Immutable compliance records
- Smart contracts for lease management

#### **IoT Integration**
- Real-time meter data ingestion
- Smart sensor integration
- Automated alerts and notifications

### 10.3 Long-term Vision (2027+)

#### **Statewide Expansion**
- All Tamil Nadu industrial parks
- 10,000+ industries
- Multi-state capability

#### **Advanced Features**
- Digital twin for industrial parks
- Carbon footprint tracking
- ESG reporting
- Sustainability scoring

---

## Appendix

### A. Glossary

| Term | Definition |
|------|------------|
| SIPCOT | State Industries Promotion Corporation of Tamil Nadu |
| NOC | No Objection Certificate |
| RBAC | Role-Based Access Control |
| KPI | Key Performance Indicator |
| SLA | Service Level Agreement |
| CapEx | Capital Expenditure |
| ESG | Environmental, Social, and Governance |

### B. Contact Information

**Product Team:**
- Product Owner: SIPCOT Management
- Technology Partner: NEXORA
- Support Email: support@thozhirporul.tn.gov.in
- Helpline: 1800-XXX-XXXX

**Development Team:**
- Frontend Lead: React Team
- Backend Lead: Node.js Team
- DevOps Lead: Infrastructure Team

---

## Document Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2024-01-15 | Initial PRD | Product Team |
| 1.5 | 2024-03-20 | Added v2 features | Product Team |
| 2.0 | 2026-05-07 | Complete system documentation | NEXORA |

---

*This document is confidential and proprietary to SIPCOT and NEXORA. Unauthorized distribution or disclosure is prohibited.*
