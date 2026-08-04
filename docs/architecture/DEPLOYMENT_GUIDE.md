# SIPCOT SIMS Deployment Guide

This document outlines the steps to deploy the Smart Industrial Monitoring System (SIMS) to a production environment.

## 🛠 Prerequisites
- Node.js (v18+)
- PostgreSQL Database
- Production server (AWS EC2, Azure VM, or similar)
- SSL Certificate (Standard for Government portals)

## 📦 Production Build
The frontend has been successfully compiled into optimized static assets.
- **Location:** `frontend/dist/`
- **Command:** `npm run build` (Executed successfully)

## 🚀 Deployment Steps

### 1. Database Setup
1. Provision a PostgreSQL instance.
2. Execute the provided schema: `backend/schema.sql`.
3. Create a dedicated database user with restricted permissions for the application.

### 2. Environment Configuration
Create a `.env` file in the `backend/` directory on your production server:
```env
PORT=5000
DB_USER=sipcot_prod_user
DB_PASSWORD=secure_password_here
DB_HOST=your-db-endpoint.rds.amazonaws.com
DB_NAME=sipcot_sims
DB_PORT=5432
JWT_SECRET=generate_a_long_random_string_here
```

### 3. Backend Deployment
1. Transfer the `backend/` folder to the server.
2. Run `npm install --production`.
3. Use a process manager like **PM2** to keep the server running:
   ```bash
   pm2 start index.js --name "sims-backend"
   ```

### 4. Frontend Deployment
1. Serve the `frontend/dist/` folder using a high-performance web server like **Nginx** or **Apache**.
2. **Nginx Configuration Snippet:**
   ```nginx
   server {
       listen 80;
       server_name sims.sipcot.tn.gov.in;
       root /var/www/sims/frontend/dist;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }

       location /api {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

## 🔒 Security Recommendations
- **HTTPS:** Always serve the frontend and API over TLS.
- **CORS:** Update `backend/index.js` to restrict `cors()` allowed origins to your production domain only.
- **Audit Logs:** Ensure the `audit_logs` table is regularly backed up as it contains important security trails for government officials.
- **Secrets:** Never commit the `.env` file to version control.
