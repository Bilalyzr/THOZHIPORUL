# THOZHIRPORUL BY NEXORA

Smart Industrial Monitoring System (SIMS) - Unified digital platform powering industrial transformation through real-time monitoring, compliance tracking, and data-driven governance.

## Overview
THOZHIRPORUL integrates industrial datasets into a single source of truth, enabling agile decision-making and sustainable growth for industrial parks and unit owners.

## Key Features
- **Quarterly Industrial Intelligence**: validated filings (investment, employment, water, power, turnover, production, CSR, operational status) with append-only version history and anomaly detection — data is as fresh as the latest filing, with real-time in-app/SSE notifications.
- **Compliance Engine**: Automated tracking of mandatory filings and statutory obligations, with a period-based reporting calendar and escalating reminders.
- **Predictive Analytics**: Quarterly forecasting (industry/park/state) from real filed data — returns an explicit INSUFFICIENT_DATA answer instead of fabricating numbers.

> Deployment note: the scheduler, MFA attempt limiters and SSE bus are in-process (single instance). For horizontal scale-out, move rate-limit/MFA counters and the notification bus to Redis before running multiple backend replicas.
- **GIS Explorer**: Interactive map-driven oversight of industrial clusters.

## Project Structure
- `frontend/`: React-based dashboard with Material UI.
- `backend/`: Node.js/Express API with PostgreSQL.

## Getting Started
Refer to the `DEPLOYMENT_GUIDE.md` for setup instructions.

---
&copy; 2026 NEXORA, Government of Tamil Nadu.
