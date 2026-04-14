import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme';

// Layouts
import MainLayout from './layouts/MainLayout';

// Auth Pages
import Login from './pages/Login';
import RoleSelection from './pages/RoleSelection';

// Public Pages
import Home from './pages/Home';
import About from './pages/About';
import Features from './pages/Features';
import IndustrialParks from './pages/IndustrialParks';
import Contact from './pages/Contact';

// Legacy Pages (kept for backward compatibility)
import IndustryDashboard from './pages/IndustryDashboard';
import AdminDashboard from './pages/AdminDashboard';
import IndustryRegistration from './pages/IndustryRegistration';
import DataSubmission from './pages/DataSubmission';
import ComplianceMonitoring from './pages/ComplianceMonitoring';
import ReportsDashboard from './pages/ReportsDashboard';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import UserManagement from './pages/UserManagement';
import IndustryProfile from './pages/IndustryProfile';
import Settings from './pages/Settings';

// Industrial OS v2 Pages
import GovCommandCenter from './pages/GovCommandCenter';
import IndustryWorkspace from './pages/IndustryWorkspace';
import ServicesTracker from './pages/ServicesTracker';
import UnifiedDataSubmission from './pages/UnifiedDataSubmission';
import ComplianceEngine from './pages/ComplianceEngine';
import ReportExportCenter from './pages/ReportExportCenter';
import GovRegistration from './pages/GovRegistration';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<RoleSelection />} />
          <Route path="/login/:role" element={<Login />} />
          <Route path="/role-selection" element={<RoleSelection />} />
          <Route path="/govt-registration" element={<GovRegistration />} />

          {/* Main App Routes - Protected with Layout */}
          <Route element={<MainLayout />}>
            {/* Legacy routes (preserved for backward compatibility) */}
            <Route path="/industry-dashboard" element={<IndustryDashboard />} />
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/registration" element={<IndustryRegistration />} />
            <Route path="/data-submission" element={<DataSubmission />} />
            <Route path="/compliance" element={<ComplianceMonitoring />} />
            <Route path="/reports" element={<ReportsDashboard />} />
            <Route path="/analytics" element={<AnalyticsDashboard />} />
            <Route path="/user-management" element={<UserManagement />} />
            <Route path="/industry-profile" element={<IndustryProfile />} />
            <Route path="/settings" element={<Settings />} />

            {/* Industrial OS v2 Routes */}
            {/* Govt/Admin Pages */}
            <Route path="/command-center" element={<GovCommandCenter />} />
            <Route path="/compliance-engine" element={<ComplianceEngine />} />

            {/* Industry Pages */}
            <Route path="/workspace" element={<IndustryWorkspace />} />
            <Route path="/submit-data" element={<UnifiedDataSubmission />} />

            {/* Shared Pages (content adapts to role) */}
            <Route path="/services" element={<ServicesTracker />} />
            <Route path="/report-center" element={<ReportExportCenter />} />
            <Route path="/parks-explorer" element={<IndustrialParks />} />
          </Route>

          {/* Public Pages */}
          <Route path="/home" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/features" element={<Features />} />
          <Route path="/parks" element={<IndustrialParks />} />
          <Route path="/contact" element={<Contact />} />

          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
