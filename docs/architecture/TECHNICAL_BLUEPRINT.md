# SIPCOT Industrial OS - Technical Blueprint
## Transformation from Static Portal to Data-Driven Industrial Operating System

---

## 1. SYSTEM ARCHITECTURE OVERVIEW

### 1.1 Current State
- **Frontend**: React 19 + MUI 7 + Recharts + Vite 8
- **Backend**: Express 5 + PostgreSQL + JWT Auth (bcrypt)
- **Status**: Prototype with mock data, 3-role RBAC (admin, govt, industry)
- **Existing Pages**: Home, Login, RoleSelection, AdminDashboard, IndustryDashboard, AnalyticsDashboard, IndustrialParks, DataSubmission, ComplianceMonitoring, ReportsDashboard, IndustryProfile, IndustryRegistration, UserManagement, Settings, About, Features, Contact

### 1.2 Target State - Industrial Operating System
```
+---------------------------------------------------------------+
|                    SIPCOT Industrial OS                        |
+---------------------------------------------------------------+
|  PUBLIC LAYER          |  AUTHENTICATED LAYER                  |
|  - Home (State Pulse)  |  GOVT OFFICER         INDUSTRY USER  |
|  - Parks Explorer      |  - Command Center     - Workspace    |
|  - About / Features    |  - Compliance Engine  - Submissions  |
|  - Contact             |  - Analytics          - Profile      |
|                        |  - Report Export      - Documents    |
|                        |  - User Management    - Compliance   |
|                        |  - Parks Management   - Reports      |
+---------------------------------------------------------------+
|  SHARED SERVICES LAYER                                        |
|  - Auth & RBAC Middleware                                     |
|  - Notification Engine                                        |
|  - Audit Trail Logger                                         |
|  - Document Storage Service                                   |
|  - Report Generation Engine (PDF/Excel)                       |
+---------------------------------------------------------------+
|  DATA LAYER                                                   |
|  - PostgreSQL (Transactional)                                 |
|  - Schema: users, profiles, submissions, parks, compliance    |
+---------------------------------------------------------------+
```

### 1.3 RBAC Access Matrix

| Page / Feature                  | Admin | Govt Officer | Industry |
|---------------------------------|:-----:|:------------:|:--------:|
| Home (State Industrial Pulse)   |  R    |     R        |    R     |
| Industrial Parks Explorer       |  RW   |     R        |    R     |
| Services Tracker                |  RW   |     R        |    R     |
| Central Govt Command Center     |  R    |     RW       |    -     |
| Personalized Industry Workspace |  -    |     -        |    RW    |
| Unified Data Submission         |  -    |     -        |    RW    |
| Compliance & Analytics Engine   |  RW   |     R        |    -     |
| Report Export Center            |  RW   |     RW       |    R*    |
| User Management                 |  RW   |     -        |    -     |
| Settings                        |  RW   |     -        |    -     |

*R = Read, W = Write, R* = Limited (own reports only)*

---

## 2. DATABASE SCHEMA EXTENSIONS

### 2.1 New Tables (Added to existing schema.sql)

```sql
-- ============================================================
-- PARKS & PLOTS MODULE
-- ============================================================

CREATE TYPE park_status AS ENUM ('active', 'under_development', 'proposed');
CREATE TYPE plot_status AS ENUM ('available', 'allotted', 'reserved', 'under_construction');

-- Industrial Parks Master
CREATE TABLE industrial_parks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,        -- e.g., "ORGDM", "SRPBR"
    district VARCHAR(100) NOT NULL,
    total_area_acres DECIMAL(10,2) NOT NULL,
    developed_area_acres DECIMAL(10,2) DEFAULT 0,
    available_area_acres DECIMAL(10,2) DEFAULT 0,
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    status park_status DEFAULT 'active',
    infrastructure_score INTEGER DEFAULT 0,   -- 0-100 composite score
    established_year INTEGER,
    total_industries INTEGER DEFAULT 0,
    total_investment_cr DECIMAL(15,2) DEFAULT 0,
    total_employment INTEGER DEFAULT 0,
    water_capacity_kl DECIMAL(10,2) DEFAULT 0,
    power_capacity_mw DECIMAL(10,2) DEFAULT 0,
    road_connectivity_km DECIMAL(10,2) DEFAULT 0,
    nearest_port VARCHAR(100),
    nearest_airport VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Individual Plots within Parks
CREATE TABLE park_plots (
    id SERIAL PRIMARY KEY,
    park_id INTEGER REFERENCES industrial_parks(id) ON DELETE CASCADE,
    plot_number VARCHAR(50) NOT NULL,
    area_acres DECIMAL(10,2) NOT NULL,
    status plot_status DEFAULT 'available',
    allottee_industry_id INTEGER REFERENCES industry_profiles(id),
    allotment_date DATE,
    lease_start_date DATE,
    lease_end_date DATE,
    monthly_lease_amount DECIMAL(12,2),
    zone_type VARCHAR(50),                    -- Industrial, IT, Mixed, Green
    CONSTRAINT unique_plot_per_park UNIQUE (park_id, plot_number)
);

-- Park Infrastructure Metrics (time-series)
CREATE TABLE park_infrastructure_metrics (
    id SERIAL PRIMARY KEY,
    park_id INTEGER REFERENCES industrial_parks(id) ON DELETE CASCADE,
    recorded_date DATE NOT NULL,
    water_available_kl DECIMAL(10,2),
    water_consumed_kl DECIMAL(10,2),
    power_available_mw DECIMAL(10,2),
    power_consumed_mw DECIMAL(10,2),
    effluent_treated_kl DECIMAL(10,2),
    CONSTRAINT unique_metric_per_day UNIQUE (park_id, recorded_date)
);

-- ============================================================
-- SERVICES / NOC TRACKING MODULE
-- ============================================================

CREATE TYPE service_type AS ENUM (
    'land_allotment', 'noc_fire', 'noc_pollution', 
    'water_connection', 'power_connection', 'building_approval',
    'lease_renewal', 'transfer_request', 'expansion_request'
);
CREATE TYPE service_status AS ENUM (
    'applied', 'document_review', 'field_inspection', 
    'pending_approval', 'approved', 'rejected', 'completed'
);

CREATE TABLE service_requests (
    id SERIAL PRIMARY KEY,
    industry_id INTEGER REFERENCES industry_profiles(id) ON DELETE CASCADE,
    service_type service_type NOT NULL,
    reference_number VARCHAR(50) UNIQUE NOT NULL,  -- Auto-generated
    current_status service_status DEFAULT 'applied',
    priority VARCHAR(20) DEFAULT 'normal',          -- normal, high, urgent
    applied_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expected_completion DATE,
    actual_completion DATE,
    assigned_officer INTEGER REFERENCES users(id),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Service Milestones (Kanban stages)
CREATE TABLE service_milestones (
    id SERIAL PRIMARY KEY,
    request_id INTEGER REFERENCES service_requests(id) ON DELETE CASCADE,
    stage_name VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',     -- pending, in_progress, completed, skipped
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    officer_id INTEGER REFERENCES users(id),
    notes TEXT,
    sort_order INTEGER DEFAULT 0
);

-- ============================================================
-- COMPLIANCE ENGINE MODULE
-- ============================================================

CREATE TYPE violation_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE violation_status AS ENUM ('open', 'acknowledged', 'resolving', 'resolved', 'escalated');

CREATE TABLE compliance_rules (
    id SERIAL PRIMARY KEY,
    rule_code VARCHAR(50) UNIQUE NOT NULL,
    rule_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),                    -- submission, environmental, financial, safety
    check_frequency VARCHAR(50),              -- quarterly, annual, monthly
    auto_flag BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE compliance_violations (
    id SERIAL PRIMARY KEY,
    industry_id INTEGER REFERENCES industry_profiles(id) ON DELETE CASCADE,
    rule_id INTEGER REFERENCES compliance_rules(id),
    violation_date DATE NOT NULL,
    severity violation_severity NOT NULL,
    status violation_status DEFAULT 'open',
    description TEXT NOT NULL,
    auto_detected BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP,
    resolved_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Compliance Score History (monthly snapshots)
CREATE TABLE compliance_scores (
    id SERIAL PRIMARY KEY,
    industry_id INTEGER REFERENCES industry_profiles(id) ON DELETE CASCADE,
    score_date DATE NOT NULL,
    overall_score INTEGER NOT NULL,           -- 0-100
    submission_score INTEGER,
    environmental_score INTEGER,
    financial_score INTEGER,
    safety_score INTEGER,
    CONSTRAINT unique_score_per_month UNIQUE (industry_id, score_date)
);

-- ============================================================
-- DOCUMENT VAULT MODULE
-- ============================================================

CREATE TYPE doc_category AS ENUM (
    'gst_certificate', 'incorporation', 'pollution_clearance',
    'fire_noc', 'lease_agreement', 'submission_attachment',
    'inspection_report', 'compliance_notice', 'other'
);

CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    industry_id INTEGER REFERENCES industry_profiles(id) ON DELETE CASCADE,
    uploaded_by INTEGER REFERENCES users(id),
    category doc_category NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size_kb INTEGER,
    mime_type VARCHAR(100),
    expiry_date DATE,                         -- For certificates that expire
    verified BOOLEAN DEFAULT FALSE,
    verified_by INTEGER REFERENCES users(id),
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- REPORT TEMPLATES MODULE
-- ============================================================

CREATE TABLE report_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_type VARCHAR(50) NOT NULL,       -- investment, employment, compliance, custom
    available_to user_role[] NOT NULL,         -- Array of roles that can use this template
    query_definition JSONB,                   -- Stored query parameters
    column_config JSONB,                      -- Column definitions for the report
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- GOVERNMENT OFFICER PROFILES
-- ============================================================

CREATE TABLE govt_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    officer_name VARCHAR(255) NOT NULL,
    designation VARCHAR(255) NOT NULL,
    department VARCHAR(255) NOT NULL,
    jurisdiction VARCHAR(255),                -- State-wide, District, Park-specific
    assigned_parks INTEGER[],                 -- Array of park IDs
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX idx_park_plots_park ON park_plots(park_id);
CREATE INDEX idx_park_plots_status ON park_plots(status);
CREATE INDEX idx_service_requests_industry ON service_requests(industry_id);
CREATE INDEX idx_service_requests_status ON service_requests(current_status);
CREATE INDEX idx_compliance_violations_industry ON compliance_violations(industry_id);
CREATE INDEX idx_compliance_violations_status ON compliance_violations(status);
CREATE INDEX idx_compliance_scores_industry ON compliance_scores(industry_id);
CREATE INDEX idx_documents_industry ON documents(industry_id);
```

### 2.2 Modifications to Existing Tables

```sql
-- Add park reference to industry_profiles
ALTER TABLE industry_profiles 
    ADD COLUMN park_id INTEGER REFERENCES industrial_parks(id),
    ADD COLUMN plot_id INTEGER REFERENCES park_plots(id),
    ADD COLUMN compliance_score INTEGER DEFAULT 100,
    ADD COLUMN last_submission_date TIMESTAMP,
    ADD COLUMN total_investment_cr DECIMAL(15,2) DEFAULT 0,
    ADD COLUMN total_employees INTEGER DEFAULT 0;

-- Add notification preferences to users
ALTER TABLE users
    ADD COLUMN notification_preferences JSONB DEFAULT '{"email": true, "sms": false, "portal": true}',
    ADD COLUMN last_login TIMESTAMP;
```

---

## 3. PAGE-BY-PAGE TECHNICAL SPECIFICATION

---

### 3.1 HOME PAGE - "State Industrial Pulse" (MODERNIZED)

**File**: `frontend/src/pages/Home.jsx`  
**UX Shift**: Static marketing content --> Real-time data telemetry  
**Access**: Public (unauthenticated)

#### Layout Structure
```
+---------------------------------------------------------------+
|  NAVBAR (transparent -> solid on scroll)                       |
+---------------------------------------------------------------+
|  HERO SECTION                                                  |
|  "Tamil Nadu Industrial Pulse"                                 |
|  [Live Investment Ticker: Rs. XX,XXX Cr] [Animated counter]   |
+---------------------------------------------------------------+
|  LIVE KPI RIBBON (4 cards, auto-refresh every 60s)            |
|  +-------------+  +-------------+  +-------------+  +-------+ |
|  | Total Land  |  | Active      |  | Total       |  | Jobs  | |
|  | Bank        |  | Parks       |  | Investment  |  |Created| |
|  | XX,XXX Ac   |  | XX Parks    |  | Rs.XX,XXXCr |  |X.XXL  | |
|  +-------------+  +-------------+  +-------------+  +-------+ |
+---------------------------------------------------------------+
|  INTERACTIVE PARKS MAP (Mini GIS)                              |
|  [Tamil Nadu outline with park markers]                        |
|  Hover: Park name, # industries, available plots              |
|  Click: Navigate to /parks/:parkId                            |
+---------------------------------------------------------------+
|  RECENT HIGHLIGHTS FEED                                        |
|  - New allotments, investment announcements, milestones       |
|  [3-column card grid with date, title, category]              |
+---------------------------------------------------------------+
|  FOOTER                                                        |
+---------------------------------------------------------------+
```

#### Data Fields
| Field | Source | Refresh |
|-------|--------|---------|
| Total Land Bank (acres) | `SUM(industrial_parks.total_area_acres)` | Daily |
| Active Parks Count | `COUNT(*) FROM industrial_parks WHERE status='active'` | Daily |
| Total Investment (Cr) | `SUM(industrial_parks.total_investment_cr)` | Daily |
| Total Employment | `SUM(industrial_parks.total_employment)` | Daily |
| Park Markers (lat/lng) | `industrial_parks` table | Daily |
| Recent Highlights | Curated from audit_logs + manual entries | Real-time |

#### New API Endpoint
```
GET /api/public/pulse
Response: { landBank, activeParkCount, totalInvestment, totalEmployment, parks: [{id, name, lat, lng, industries, available_plots}], highlights: [...] }
```

---

### 3.2 INDUSTRIAL PARKS EXPLORER (MODERNIZED)

**File**: `frontend/src/pages/IndustrialParks.jsx`  
**UX Shift**: Static card list --> GIS-style Interactive Map Explorer  
**Access**: Public (basic view), Authenticated (detailed analytics)

#### Layout Structure
```
+---------------------------------------------------------------+
|  HEADER: "Industrial Parks Explorer"     [Search] [Filters]   |
+---------------------------------------------------------------+
|                        |                                       |
|   INTERACTIVE MAP      |   PARK DETAIL PANEL (slide-in)       |
|   (60% width)          |   (40% width)                        |
|                        |                                       |
|   [Tamil Nadu Map]     |   Park Name: Oragadam                |
|   - Park markers       |   Status: Active | Est. 1997         |
|   - Color: infra score |   +-------------------------------+  |
|   - Size: # industries |   | Total Area    | 2,500 acres   |  |
|   - Click to select    |   | Available     | 340 acres     |  |
|                        |   | Industries    | 187           |  |
|   OVERLAY TOGGLES:     |   | Investment    | Rs.4,200 Cr   |  |
|   [ ] Available Plots  |   | Employment    | 23,400        |  |
|   [ ] Infra Heatmap    |   +-------------------------------+  |
|   [ ] Water Network    |   INFRASTRUCTURE GAUGES              |
|   [ ] Power Grid       |   [Water: 78%] [Power: 85%]         |
|                        |   [Road: 92%]  [ETP: 65%]           |
|                        |                                       |
|                        |   PLOT AVAILABILITY MAP               |
|                        |   [Grid of plots color-coded]         |
|                        |                                       |
|                        |   [View Full Analytics] [Apply Now]  |
+---------------------------------------------------------------+
|  COMPARISON TABLE (below map)                                  |
|  Park | Area | Available | Industries | Infra Score | Action  |
|  ----------------------------------------------------------------|
|  Oragadam | 2500ac | 340ac | 187 | 92/100 | [Details]        |
|  Hosur    | 1800ac | 220ac | 143 | 88/100 | [Details]        |
+---------------------------------------------------------------+
```

#### Data Fields
| Field | Source Table | Column |
|-------|-------------|--------|
| Park Name | `industrial_parks` | `name` |
| Park Code | `industrial_parks` | `code` |
| District | `industrial_parks` | `district` |
| Total Area | `industrial_parks` | `total_area_acres` |
| Available Area | `industrial_parks` | `available_area_acres` |
| Lat/Lng | `industrial_parks` | `latitude`, `longitude` |
| Infrastructure Score | `industrial_parks` | `infrastructure_score` |
| Water Capacity/Usage | `park_infrastructure_metrics` | Latest record |
| Power Capacity/Usage | `park_infrastructure_metrics` | Latest record |
| Plot Grid | `park_plots` | Per-park plot list |
| Industry Count | `industrial_parks` | `total_industries` |

#### New API Endpoints
```
GET /api/parks                         -- List all parks (public summary)
GET /api/parks/:id                     -- Park detail with infrastructure
GET /api/parks/:id/plots               -- Plot-level data (authenticated)
GET /api/parks/:id/metrics             -- Infrastructure time-series (auth)
GET /api/parks/compare?ids=1,2,3       -- Side-by-side comparison
```

---

### 3.3 SERVICES TRACKER (NEW - REPLACES STATIC FORMS)

**File**: `frontend/src/pages/ServicesTracker.jsx`  
**UX Shift**: Static application forms --> Kanban-style lifecycle tracker  
**Access**: Industry (own requests), Admin/Govt (all requests)

#### Layout Structure
```
+---------------------------------------------------------------+
|  HEADER: "Services Tracker"  [+ New Request]  [Filter by Type]|
+---------------------------------------------------------------+
|  MY ACTIVE REQUESTS SUMMARY                                    |
|  +----------+ +----------+ +----------+ +----------+          |
|  | Applied  | | In Review| | Pending  | | Completed|          |
|  |    3     | |    2     | |    1     | |    12    |          |
|  +----------+ +----------+ +----------+ +----------+          |
+---------------------------------------------------------------+
|  KANBAN BOARD VIEW  |  [Toggle: Kanban | Timeline | Table]    |
|                                                                |
|  Applied    | Doc Review  | Inspection | Approval  | Done     |
|  +--------+ | +--------+ | +--------+ | +--------+| +------+ |
|  |NOC-Fire| | |Land    | |          | |          || |Water | |
|  |SR-2026 | | |Allot   | |          | |          || |Conn  | |
|  |Mar 15  | | |SR-2025 | |          | |          || |Done! | |
|  +--------+ | +--------+ |          | |          || +------+ |
+---------------------------------------------------------------+
|  SELECTED REQUEST DETAIL PANEL                                 |
|  Reference: SR-2026-0045  | Type: NOC Fire Safety             |
|  Applied: Mar 15, 2026    | Expected: Apr 30, 2026            |
|  Assigned Officer: Mr. Kumar                                   |
|                                                                |
|  MILESTONE TIMELINE:                                           |
|  [x] Applied ----[x] Doc Review ----[ ] Inspection ----[ ]   |
|  Mar 15          Mar 18              Pending                   |
|                                                                |
|  BOTTLENECK ALERT: "Inspection pending > 15 days"             |
|                                                                |
|  [Upload Document] [Send Message] [Withdraw Request]          |
+---------------------------------------------------------------+
```

#### Data Fields
| Field | Source | Column |
|-------|--------|--------|
| Reference Number | `service_requests` | `reference_number` |
| Service Type | `service_requests` | `service_type` |
| Current Status | `service_requests` | `current_status` |
| Applied Date | `service_requests` | `applied_date` |
| Expected Completion | `service_requests` | `expected_completion` |
| Assigned Officer | `service_requests` JOIN `govt_profiles` | `officer_name` |
| Milestones | `service_milestones` | Per-request stages |
| Bottleneck Flag | Computed | `expected_completion < NOW()` or stage duration > threshold |
| Attached Documents | `documents` | WHERE `industry_id` matches |

#### New API Endpoints
```
GET    /api/services                    -- List requests (filtered by role)
POST   /api/services                    -- Create new service request
GET    /api/services/:id                -- Request detail + milestones
PUT    /api/services/:id/status         -- Update status (admin/govt)
GET    /api/services/:id/milestones     -- Get milestone timeline
PUT    /api/services/:id/milestones/:mid -- Update milestone
GET    /api/services/bottlenecks        -- Overdue requests (admin/govt)
POST   /api/services/:id/documents      -- Attach document
```

---

### 3.4 CENTRAL GOVERNMENT COMMAND CENTER (NEW)

**File**: `frontend/src/pages/GovCommandCenter.jsx`  
**User Logic**: High-level oversight for state officials  
**Access**: Govt Officer, Admin (read-only)

#### Layout Structure
```
+---------------------------------------------------------------+
|  HEADER: "State Industrial Command Center"    [Date Range]    |
|  Officer: Mr. Rajesh Kumar | Dept: Industries | Jurisdiction: All |
+---------------------------------------------------------------+
|  TOP KPI ROW (5 cards with sparkline trends)                  |
|  +----------+ +----------+ +----------+ +----------+ +------+ |
|  | Total    | | Total    | | Direct   | | Indirect | | Red  | |
|  | CapEx    | | Revenue  | | Jobs     | | Jobs     | | Flags| |
|  |24,500 Cr | |18,200 Cr | | 89,000  | | 56,000  | |  12  | |
|  | +4.2% ^  | | +2.1% ^  | | +1.8% ^ | | +3.1% ^ | | -2 v | |
|  +----------+ +----------+ +----------+ +----------+ +------+ |
+---------------------------------------------------------------+
|  STATE-WIDE HEATMAP            |  DEPARTMENTAL RANKINGS       |
|  (Left 55%)                    |  (Right 45%)                 |
|                                |                               |
|  [Tamil Nadu District Map]     |  Park Performance Table      |
|  Color = Investment density    |  Rank | Park    | Score      |
|  Hover = District stats        |  1    | Oragadm | 94/100     |
|  Click = Drill into district   |  2    | Hosur   | 91/100     |
|                                |  3    | SRPBR   | 88/100     |
|                                |                               |
|                                |  [Sort by: Score|Investment] |
+---------------------------------------------------------------+
|  ALERTS & ACTION ITEMS         |  TREND ANALYSIS              |
|  (Left 50%)                    |  (Right 50%)                 |
|                                |                               |
|  [!] 12 industries missed Q1  |  [Line Chart]                |
|  [!] 3 parks below 70% infra  |  Investment Growth 5-year    |
|  [!] 5 NOC requests overdue   |  Employment Growth 5-year    |
|  [i] 8 new registrations      |  [Toggle: Quarterly|Annual]  |
|                                |                               |
|  [View All Alerts]             |  [Export Chart]              |
+---------------------------------------------------------------+
|  RECENT ACTIVITY FEED                                          |
|  - Timeline of system-wide events with severity indicators    |
+---------------------------------------------------------------+
```

#### Data Fields
| KPI | Query Logic |
|-----|-------------|
| Total CapEx | `SUM(financial_data.investment_amount)` across latest submissions |
| Total Revenue | `SUM(financial_data.annual_turnover)` across latest submissions |
| Direct Employment | `SUM(employment_data.permanent_employees)` |
| Indirect Employment | `SUM(employment_data.contract_employees)` |
| Red-Flagged Alerts | `COUNT(*) FROM compliance_violations WHERE status IN ('open','escalated')` |
| Park Rankings | `industrial_parks ORDER BY infrastructure_score DESC` |
| District Heatmap | Aggregated `industrial_parks` grouped by `district` |
| Trend Data | `financial_data` + `employment_data` grouped by `period_year` |
| Overdue Services | `service_requests WHERE expected_completion < NOW() AND status != 'completed'` |

#### New API Endpoints
```
GET /api/command/kpis                   -- Aggregated KPI cards
GET /api/command/heatmap                -- District-level aggregation
GET /api/command/rankings               -- Park performance rankings
GET /api/command/alerts                 -- Red-flag alerts list
GET /api/command/trends?metric=investment&years=5  -- Trend data
GET /api/command/activity-feed          -- Recent system-wide activity
```

---

### 3.5 PERSONALIZED INDUSTRY WORKSPACE (NEW)

**File**: `frontend/src/pages/IndustryWorkspace.jsx`  
**User Logic**: Private portal for factory owners/management  
**Access**: Industry role only

#### Layout Structure
```
+---------------------------------------------------------------+
|  HEADER: "ABC Industries - Workspace"                         |
|  Park: Oragadam | Plot: A-127 | Since: 2019                  |
+---------------------------------------------------------------+
|  COMPLIANCE HEALTH SCORE                                       |
|  +----------------------------------------------------------+|
|  |  [==========|||||||===========] 78/100 - GOOD             ||
|  |  Submission: 90  | Environment: 72  | Financial: 85       ||
|  |  Safety: 65      |                                        ||
|  |  [View Breakdown] [Improve Score Tips]                    ||
|  +----------------------------------------------------------+|
+---------------------------------------------------------------+
|  ACTIONABLE TASK LIST           |  QUICK STATS               |
|  (Left 60%)                     |  (Right 40%)               |
|                                 |                             |
|  [ ] Q1 2026 Data Due: Apr 15  |  Employees: 234            |
|  [ ] Fire NOC renewal: May 01  |  Investment: Rs.45 Cr      |
|  [ ] Pollution cert expiring   |  Power Usage: 125 kWh      |
|  [x] Q4 2025 - Approved        |  Water Usage: 89 KL        |
|  [x] Lease renewed             |                             |
|                                 |  LEASE STATUS              |
|  COMPLIANCE NOTICES             |  Active until: 2035        |
|  - Warning: Water usage spike  |  Monthly: Rs.2.4L          |
|  - Info: New reporting format  |  [View Agreement]          |
+---------------------------------------------------------------+
|  DOCUMENT VAULT                                                |
|  +-----------------------------------------------------------+|
|  | Category        | File           | Expiry    | Status     ||
|  | GST Certificate | gst_2026.pdf  | Dec 2026  | Verified   ||
|  | Fire NOC        | fire_noc.pdf  | May 2026  | Expiring!  ||
|  | Pollution Cert  | pcb_cert.pdf  | Aug 2026  | Verified   ||
|  | Lease Agreement | lease.pdf     | -         | Active     ||
|  +-----------------------------------------------------------+|
|  [Upload New Document]                                        |
+---------------------------------------------------------------+
|  SERVICE REQUEST STATUS (Mini Kanban)                          |
|  [Applied: 1] [In Review: 1] [Approved: 0] [Completed: 5]   |
+---------------------------------------------------------------+
```

#### Data Fields
| Field | Source |
|-------|--------|
| Company Name | `industry_profiles.company_name` |
| Park/Plot | `industrial_parks` JOIN `park_plots` |
| Compliance Score (Overall) | `compliance_scores` latest record |
| Compliance Breakdown | `compliance_scores` sub-scores |
| Pending Tasks | Computed from `data_submissions` deadlines + `documents.expiry_date` + `service_requests` |
| Lease Status | `park_plots.lease_start_date`, `lease_end_date`, `monthly_lease_amount` |
| Document Vault | `documents WHERE industry_id = ?` |
| Service Requests | `service_requests WHERE industry_id = ?` |
| Resource Stats | Latest `resource_usage` + `employment_data` + `financial_data` |

#### New API Endpoints
```
GET /api/workspace/overview             -- Combined workspace data
GET /api/workspace/compliance-score     -- Detailed compliance breakdown
GET /api/workspace/tasks                -- Pending actionable tasks
GET /api/workspace/documents            -- Document vault list
POST /api/workspace/documents           -- Upload new document
GET /api/workspace/lease                -- Lease details
GET /api/workspace/services             -- Service request summary
```

---

### 3.6 UNIFIED DATA SUBMISSION PORTAL (ENHANCED)

**File**: `frontend/src/pages/UnifiedDataSubmission.jsx`  
**UX Shift**: Upgrade existing DataSubmission.jsx with Excel upload + history  
**Access**: Industry role only

#### Layout Structure
```
+---------------------------------------------------------------+
|  HEADER: "Unified Data Submission"  [Period: Q1 2026 v]      |
+---------------------------------------------------------------+
|  SUBMISSION MODE SELECTOR                                      |
|  ( ) Step-by-Step Form    ( ) Excel Upload    ( ) API Import  |
+---------------------------------------------------------------+
|                                                                |
|  IF STEP-BY-STEP FORM:                                        |
|  PROGRESS BAR: [1.Company]-[2.Financial]-[3.Employment]-      |
|                [4.Resources]-[5.CSR]-[6.Review & Submit]      |
|                                                                |
|  Step 2: Financial Data                                        |
|  +-----------------------------------------------------------+|
|  | Investment Amount (Cr)*    [_______________]               ||
|  | Annual Turnover (Cr)*      [_______________]               ||
|  | Export Revenue (Cr)         [_______________]               ||
|  | R&D Expenditure (Cr)       [_______________]               ||
|  +-----------------------------------------------------------+|
|  [< Previous]                              [Save Draft] [Next>]|
|                                                                |
|  IF EXCEL UPLOAD:                                              |
|  +-----------------------------------------------------------+|
|  | [Download Template]  (.xlsx with pre-filled headers)       ||
|  | [Drag & Drop Zone]                                        ||
|  | [Upload & Validate]                                        ||
|  |                                                            ||
|  | VALIDATION RESULTS:                                        ||
|  | Row 1: OK | Row 2: OK | Row 3: ERROR - Missing field     ||
|  | [Fix Errors] [Submit Valid Rows]                           ||
|  +-----------------------------------------------------------+|
+---------------------------------------------------------------+
|  SUBMISSION HISTORY TABLE                                      |
|  Period     | Status    | Submitted    | Approved By | Action  |
|  Q4 2025   | Approved  | Jan 15, 2026 | Admin       | [View] |
|  Q3 2025   | Approved  | Oct 12, 2025 | Admin       | [View] |
|  Q1 2026   | Draft     | -            | -           | [Edit] |
+---------------------------------------------------------------+
```

#### Enhanced Data Fields (beyond existing)
| New Field | Table | Column |
|-----------|-------|--------|
| Export Revenue | `financial_data` | `export_revenue` (new column) |
| R&D Expenditure | `financial_data` | `rd_expenditure` (new column) |
| Waste Generated (tons) | `resource_usage` | `waste_generated` (new column) |
| Waste Recycled (%) | `resource_usage` | `waste_recycled_pct` (new column) |
| SC/ST Employment | `employment_data` | `sc_st_employees` (new column) |
| Women Employment | `employment_data` | `women_employees` (new column) |
| CSR Beneficiaries | `csr_activities` | `beneficiary_count` (new column) |

#### Schema Additions
```sql
ALTER TABLE financial_data 
    ADD COLUMN export_revenue DECIMAL(15,2) DEFAULT 0,
    ADD COLUMN rd_expenditure DECIMAL(15,2) DEFAULT 0;

ALTER TABLE resource_usage
    ADD COLUMN waste_generated DECIMAL(10,2) DEFAULT 0,
    ADD COLUMN waste_recycled_pct DECIMAL(5,2) DEFAULT 0;

ALTER TABLE employment_data
    ADD COLUMN sc_st_employees INTEGER DEFAULT 0,
    ADD COLUMN women_employees INTEGER DEFAULT 0;

ALTER TABLE csr_activities
    ADD COLUMN beneficiary_count INTEGER DEFAULT 0;
```

#### New/Updated API Endpoints
```
POST /api/submissions                    -- (existing, enhanced payload)
POST /api/submissions/upload-excel       -- Excel file upload + validation
GET  /api/submissions/template           -- Download Excel template
GET  /api/submissions/me                 -- (existing) Submission history
GET  /api/submissions/:id               -- View specific submission detail
PUT  /api/submissions/:id               -- Update draft submission
```

---

### 3.7 COMPLIANCE & ANALYTICS ENGINE (NEW)

**File**: `frontend/src/pages/ComplianceEngine.jsx`  
**User Logic**: Automated monitoring and trend projection  
**Access**: Admin (full), Govt (read-only)

#### Layout Structure
```
+---------------------------------------------------------------+
|  HEADER: "Compliance & Analytics Engine"   [Date Range]       |
+---------------------------------------------------------------+
|  COMPLIANCE OVERVIEW CARDS                                     |
|  +-----------+ +-----------+ +-----------+ +-----------+      |
|  | Compliant | | Warning   | | Violation | | Missing   |      |
|  |   892     | |    156    | |     45    | |     67    |      |
|  | (76.8%)   | | (13.4%)   | |  (3.9%)  | |  (5.8%)  |      |
|  +-----------+ +-----------+ +-----------+ +-----------+      |
+---------------------------------------------------------------+
|  AUTOMATED VIOLATION FLAGGING LIST     |  TREND ANALYSIS      |
|  (Left 55%)                            |  (Right 45%)         |
|                                        |                       |
|  Filters: [Severity v] [Status v]     |  [Line Chart]        |
|  +------------------------------------+|  Compliance Score    |
|  | Industry  | Rule    | Severity |   ||  Trend (12 months)  |
|  | XYZ Mfg   | SUB-Q1  | High    |   ||                      |
|  | LMN Text  | ENV-WAT | Critical|   ||  [Bar Chart]         |
|  | PQR Auto  | FIN-REV | Medium  |   ||  Violations by       |
|  +------------------------------------+|  Category            |
|  [Acknowledge] [Escalate] [Resolve]   ||                      |
|                                        |  [Pie Chart]         |
|  MISSING REPORT FLAGS                  |  Violation Severity  |
|  67 industries have not submitted     |  Distribution        |
|  Q1 2026 data (due: Apr 15)          |                       |
|  [Send Bulk Reminder] [Export List]   |  [Export All Charts]  |
+---------------------------------------------------------------+
|  PREDICTIVE GROWTH MODELING                                    |
|  +-----------------------------------------------------------+|
|  | Metric          | Current  | Projected (1yr) | Trend     ||
|  | Total Investment | 24,500Cr | 28,200Cr       | +15.1%    ||
|  | Employment       | 145,000  | 162,000        | +11.7%    ||
|  | Compliance Rate  | 76.8%    | 82.3%          | +5.5pp    ||
|  +-----------------------------------------------------------+|
|  [Download Full Compliance Report]                            |
+---------------------------------------------------------------+
```

#### Data Fields
| Field | Query Logic |
|-------|-------------|
| Compliant Count | Industries with `compliance_scores.overall_score >= 80` |
| Warning Count | Industries with score `60-79` |
| Violation Count | `COUNT(*) FROM compliance_violations WHERE status = 'open'` |
| Missing Submissions | Industries without submission for current period |
| Violation List | `compliance_violations` JOIN `industry_profiles` JOIN `compliance_rules` |
| Score Trend | `compliance_scores` grouped by `score_date` |
| Violations by Category | `compliance_violations` JOIN `compliance_rules` grouped by `category` |
| Severity Distribution | `compliance_violations` grouped by `severity` |
| Predictive Growth | Linear regression on `financial_data` + `employment_data` time-series |

#### New API Endpoints
```
GET /api/compliance/overview             -- Summary cards
GET /api/compliance/violations           -- Paginated violation list
PUT /api/compliance/violations/:id       -- Update violation status
GET /api/compliance/missing-submissions  -- Industries missing reports
POST /api/compliance/send-reminders      -- Bulk reminder dispatch
GET /api/compliance/trends               -- Score trends over time
GET /api/compliance/predictions          -- Projected growth metrics
GET /api/compliance/by-category          -- Violations grouped by category
```

---

### 3.8 REPORT EXPORT & UTILITY CENTER (NEW)

**File**: `frontend/src/pages/ReportExportCenter.jsx`  
**User Logic**: Self-service data extraction for official documentation  
**Access**: Admin/Govt (all reports), Industry (own data only)

#### Layout Structure
```
+---------------------------------------------------------------+
|  HEADER: "Report Export Center"          [My Saved Reports]   |
+---------------------------------------------------------------+
|  REPORT BUILDER                                                |
|  +-----------------------------------------------------------+|
|  | 1. SELECT REPORT TYPE                                      ||
|  |    ( ) Investment Summary    ( ) Employment Report         ||
|  |    ( ) Compliance Status     ( ) Park Performance          ||
|  |    ( ) Resource Utilization  ( ) Custom Query              ||
|  |                                                            ||
|  | 2. FILTER CRITERIA                                         ||
|  |    Park:    [All Parks        v]                           ||
|  |    District:[All Districts    v]                           ||
|  |    Period:  [2025-26          v]  Quarter: [All   v]      ||
|  |    Industry Type: [All Types  v]                           ||
|  |    Status:  [All              v]                           ||
|  |                                                            ||
|  | 3. SELECT COLUMNS (for Custom Query)                       ||
|  |    [x] Company Name  [x] Investment  [x] Employment       ||
|  |    [x] Location      [ ] Water Usage [ ] Power Usage      ||
|  |    [ ] CSR Spend     [x] Compliance  [ ] Turnover         ||
|  |                                                            ||
|  | 4. OUTPUT FORMAT                                           ||
|  |    ( ) PDF (Branded SIPCOT Template)                       ||
|  |    ( ) Excel (.xlsx with charts)                           ||
|  |    ( ) CSV (Raw data)                                      ||
|  +-----------------------------------------------------------+|
|  [Preview Data (first 10 rows)]   [Generate Report]           |
+---------------------------------------------------------------+
|  DATA PREVIEW TABLE                                            |
|  [First 10 rows of filtered results]                          |
|  Total records: 234 | Estimated file size: 45KB               |
+---------------------------------------------------------------+
|  RECENT GENERATED REPORTS                                      |
|  Name                | Type    | Generated    | Size  | Dl   |
|  Investment_Q1_2026  | PDF     | Apr 10, 2026 | 120KB | [v]  |
|  Compliance_Annual   | Excel   | Mar 28, 2026 | 340KB | [v]  |
|  Employment_Oragadam | CSV     | Mar 15, 2026 | 56KB  | [v]  |
+---------------------------------------------------------------+
```

#### Report Templates
| Template | Data Source | Key Columns |
|----------|------------|-------------|
| Investment Summary | `financial_data` + `industry_profiles` | Company, Park, Investment, Turnover, Export Rev |
| Employment Report | `employment_data` + `industry_profiles` | Company, Permanent, Contract, SC/ST, Women |
| Compliance Status | `compliance_scores` + `compliance_violations` | Company, Score, Violations, Last Submission |
| Park Performance | `industrial_parks` + aggregations | Park, Industries, Investment, Employment, Infra Score |
| Resource Utilization | `resource_usage` + `industry_profiles` | Company, Water, Power, Waste, Recycled % |
| Custom Query | Dynamic based on column selection | User-selected columns |

#### New API Endpoints
```
POST /api/reports/preview               -- Preview filtered data (first N rows)
POST /api/reports/generate              -- (enhanced) Generate with template
GET  /api/reports/templates             -- Available report templates
GET  /api/reports/history               -- Previously generated reports
GET  /api/reports/download/:id          -- Download generated report
POST /api/reports/save-config           -- Save custom report configuration
```

---

## 4. DYNAMIC NAVIGATION LOGIC (RBAC)

### 4.1 Navigation Configuration

```javascript
// navigationConfig.js - RBAC-based menu structure

export const navigationConfig = {
  // Visible to all authenticated users
  common: [
    { label: 'Home', path: '/', icon: 'HomeIcon' }
  ],

  // GOVERNMENT OFFICER navigation
  govt: [
    { 
      section: 'Command & Control',
      items: [
        { label: 'Command Center', path: '/command-center', icon: 'DashboardIcon', badge: 'alerts' },
        { label: 'Parks Explorer', path: '/parks', icon: 'MapIcon' },
        { label: 'Services Overview', path: '/services', icon: 'AssignmentIcon', badge: 'overdue' },
      ]
    },
    {
      section: 'Monitoring',
      items: [
        { label: 'Compliance Engine', path: '/compliance-engine', icon: 'SecurityIcon', badge: 'violations' },
        { label: 'Analytics', path: '/analytics', icon: 'BarChartIcon' },
      ]
    },
    {
      section: 'Reports',
      items: [
        { label: 'Report Center', path: '/report-center', icon: 'DescriptionIcon' },
      ]
    }
  ],

  // INDUSTRY USER navigation
  industry: [
    {
      section: 'My Workspace',
      items: [
        { label: 'Dashboard', path: '/workspace', icon: 'SpaceDashboardIcon' },
        { label: 'Company Profile', path: '/profile', icon: 'BusinessIcon' },
        { label: 'Document Vault', path: '/workspace/documents', icon: 'FolderIcon', badge: 'expiring' },
      ]
    },
    {
      section: 'Compliance',
      items: [
        { label: 'Submit Data', path: '/submit-data', icon: 'UploadFileIcon', badge: 'due' },
        { label: 'My Compliance', path: '/my-compliance', icon: 'VerifiedIcon' },
        { label: 'Service Requests', path: '/services', icon: 'SupportAgentIcon', badge: 'pending' },
      ]
    },
    {
      section: 'Reports',
      items: [
        { label: 'My Reports', path: '/report-center', icon: 'DescriptionIcon' },
      ]
    }
  ],

  // ADMIN navigation
  admin: [
    {
      section: 'Overview',
      items: [
        { label: 'Admin Dashboard', path: '/admin', icon: 'DashboardIcon' },
        { label: 'Command Center', path: '/command-center', icon: 'MonitorIcon' },
      ]
    },
    {
      section: 'Management',
      items: [
        { label: 'Parks Management', path: '/parks', icon: 'MapIcon' },
        { label: 'Services Tracker', path: '/services', icon: 'AssignmentIcon', badge: 'overdue' },
        { label: 'User Management', path: '/users', icon: 'PeopleIcon' },
        { label: 'Industries', path: '/industries', icon: 'FactoryIcon' },
      ]
    },
    {
      section: 'Analytics & Compliance',
      items: [
        { label: 'Compliance Engine', path: '/compliance-engine', icon: 'SecurityIcon', badge: 'violations' },
        { label: 'Analytics', path: '/analytics', icon: 'BarChartIcon' },
        { label: 'Report Center', path: '/report-center', icon: 'DescriptionIcon' },
      ]
    },
    {
      section: 'System',
      items: [
        { label: 'Settings', path: '/settings', icon: 'SettingsIcon' },
      ]
    }
  ]
};
```

### 4.2 Route Protection Logic

```javascript
// Route definitions in main.jsx

const protectedRoutes = [
  // Shared pages (content adapts to role)
  { path: '/parks', element: <IndustrialParks />, roles: ['admin', 'govt', 'industry'] },
  { path: '/parks/:id', element: <ParkDetail />, roles: ['admin', 'govt', 'industry'] },
  { path: '/services', element: <ServicesTracker />, roles: ['admin', 'govt', 'industry'] },
  { path: '/report-center', element: <ReportExportCenter />, roles: ['admin', 'govt', 'industry'] },
  { path: '/analytics', element: <AnalyticsDashboard />, roles: ['admin', 'govt'] },

  // Govt/Admin only
  { path: '/command-center', element: <GovCommandCenter />, roles: ['admin', 'govt'] },
  { path: '/compliance-engine', element: <ComplianceEngine />, roles: ['admin', 'govt'] },

  // Industry only
  { path: '/workspace', element: <IndustryWorkspace />, roles: ['industry'] },
  { path: '/workspace/documents', element: <DocumentVault />, roles: ['industry'] },
  { path: '/submit-data', element: <UnifiedDataSubmission />, roles: ['industry'] },
  { path: '/my-compliance', element: <MyCompliance />, roles: ['industry'] },
  { path: '/profile', element: <IndustryProfile />, roles: ['industry'] },

  // Admin only
  { path: '/admin', element: <AdminDashboard />, roles: ['admin'] },
  { path: '/users', element: <UserManagement />, roles: ['admin'] },
  { path: '/settings', element: <Settings />, roles: ['admin'] },
];

// Role-based redirect after login
const roleDefaultRoutes = {
  admin: '/admin',
  govt: '/command-center',
  industry: '/workspace'
};
```

---

## 5. IMPLEMENTATION PRIORITY & PHASING

### Phase 1: Foundation (Weeks 1-3)
- [ ] Database schema migration (new tables + ALTER existing)
- [ ] Backend route scaffolding for parks, services, compliance
- [ ] Navigation config + RBAC route protection
- [ ] Home page modernization (live KPI ribbon)

### Phase 2: Core Pages (Weeks 4-7)
- [ ] Industrial Parks Explorer (map + detail panel)
- [ ] Services Tracker (Kanban board)
- [ ] Government Command Center (KPI cards + heatmap)
- [ ] Industry Workspace (compliance score + task list)

### Phase 3: Data & Compliance (Weeks 8-10)
- [ ] Unified Data Submission (Excel upload + validation)
- [ ] Compliance & Analytics Engine (violation tracking + trends)
- [ ] Document Vault (upload, verify, expiry tracking)

### Phase 4: Reports & Polish (Weeks 11-12)
- [ ] Report Export Center (templates + PDF/Excel generation)
- [ ] Predictive analytics modeling
- [ ] Performance optimization & testing
- [ ] Replace all mock data with live DB queries

---

## 6. SYSTEM INTEGRATION SAFEGUARDS

To ensure the transformation does not break existing functionality:

1. **Additive Schema Changes**: All new tables are independent. Existing tables get `ALTER ADD COLUMN` with defaults, so existing queries continue working.

2. **Backward-Compatible API**: Existing endpoints (`/api/auth/login`, `/api/industries`, `/api/submissions`, `/api/analytics`, `/api/reports`, `/api/notifications`) remain unchanged. New endpoints use new prefixes (`/api/parks`, `/api/services`, `/api/command`, `/api/compliance`, `/api/workspace`).

3. **Feature Flags**: New pages are added to routing but hidden behind role checks. No existing route paths change.

4. **Mock-to-Live Migration**: The current mock data pattern in routes is preserved during development. Each route has a clear `// [Mock Implementation]` comment showing where to plug in real queries.

5. **Incremental Frontend**: New pages are added as new files. Existing pages (AdminDashboard, IndustryDashboard) remain functional and are gradually enhanced, not replaced.

---

*Blueprint Version: 1.0 | Generated: April 12, 2026 | Project: SIPCOT SIMS Industrial OS*
