/* eslint-disable react-refresh/only-export-components */
import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box, CircularProgress } from '@mui/material';
import theme from './theme';
import './index.css';

// Layouts
import MainLayout from './layouts/MainLayout';
import AIChatbot from './components/AIChatbot';
import AccessibilityWidget from './components/AccessibilityWidget';
import ScrollToTop from './components/ScrollToTop';
import { LanguageProvider } from './context/LanguageContext';

// Loading Fallback Component
const PageLoader = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
    <CircularProgress />
  </Box>
);

// Auth Pages
const Login = lazy(() => import('./pages/Login'));
const RoleSelection = lazy(() => import('./pages/RoleSelection'));

// Public Pages
const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Features = lazy(() => import('./pages/Features'));
const IndustrialParks = lazy(() => import('./pages/IndustrialParks'));
const Contact = lazy(() => import('./pages/Contact'));
const PublicGrievance = lazy(() => import('./pages/PublicGrievance'));

// Legacy Pages (kept for backward compatibility)
const IndustryDashboard = lazy(() => import('./pages/IndustryDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const IndustryRegistration = lazy(() => import('./pages/IndustryRegistration'));
const DataSubmission = lazy(() => import('./pages/DataSubmission'));
const ComplianceMonitoring = lazy(() => import('./pages/ComplianceMonitoring'));
const ReportsDashboard = lazy(() => import('./pages/ReportsDashboard'));
const AnalyticsDashboard = lazy(() => import('./pages/AnalyticsDashboard'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const IndustryProfile = lazy(() => import('./pages/IndustryProfile'));
const Settings = lazy(() => import('./pages/Settings'));

// Industrial OS v2 Pages
const GovCommandCenter = lazy(() => import('./pages/GovCommandCenter'));
const IndustryWorkspace = lazy(() => import('./pages/IndustryWorkspace'));
const ServicesTracker = lazy(() => import('./pages/ServicesTracker'));
const UnifiedDataSubmission = lazy(() => import('./pages/UnifiedDataSubmission'));
const ComplianceEngine = lazy(() => import('./pages/ComplianceEngine'));
const ReportExportCenter = lazy(() => import('./pages/ReportExportCenter'));
const GovRegistration = lazy(() => import('./pages/GovRegistration'));
const AuditLogViewer = lazy(() => import('./pages/AuditLogViewer'));
const MobileInspection = lazy(() => import('./pages/MobileInspection'));
const SecureVault = lazy(() => import('./pages/SecureVault'));
const SubscriptionPlans = lazy(() => import('./pages/SubscriptionPlans'));
const CsrDashboard = lazy(() => import('./pages/CsrDashboard'));

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LanguageProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Auth Routes */}
            <Route path="/login" element={<RoleSelection />} />
            <Route path="/login/:role" element={<Login />} />
            <Route path="/role-selection" element={<RoleSelection />} />
            <Route path="/registration" element={<IndustryRegistration />} />
            <Route path="/govt-registration" element={<GovRegistration />} />

            {/* Main App Routes - Protected with Layout */}
            <Route element={<MainLayout />}>
              {/* Legacy routes (preserved for backward compatibility) */}
              <Route path="/industry-dashboard" element={<IndustryDashboard />} />
              <Route path="/admin-dashboard" element={<AdminDashboard />} />
              <Route path="/data-submission" element={<DataSubmission />} />
              <Route path="/compliance" element={<ComplianceMonitoring />} />
              <Route path="/reports" element={<ReportsDashboard />} />
              <Route path="/analytics" element={<AnalyticsDashboard />} />
              <Route path="/user-management" element={<UserManagement />} />
              <Route path="/industry-profile" element={<IndustryProfile />} />
              <Route path="/profile" element={<IndustryProfile />} />
              <Route path="/settings" element={<Settings />} />

              {/* Industrial OS v2 Routes */}
              {/* Govt/Admin Pages */}
              <Route path="/command-center" element={<GovCommandCenter />} />
              <Route path="/compliance-engine" element={<ComplianceEngine />} />
              <Route path="/audit-logs" element={<AuditLogViewer />} />
              <Route path="/mobile-inspection" element={<MobileInspection />} />

              {/* Industry Pages */}
              <Route path="/workspace" element={<IndustryWorkspace />} />
              <Route path="/submit-data" element={<UnifiedDataSubmission />} />
              <Route path="/secure-vault" element={<SecureVault />} />

              {/* Shared Pages (content adapts to role) */}
              <Route path="/services" element={<ServicesTracker />} />
              <Route path="/report-center" element={<ReportExportCenter />} />
              <Route path="/parks-explorer" element={<IndustrialParks />} />
              <Route path="/csr-dashboard" element={<CsrDashboard />} />
            </Route>

            {/* Public Pages */}
            <Route path="/home" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/features" element={<Features />} />
            <Route path="/parks" element={<IndustrialParks />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/subscriptions" element={<SubscriptionPlans />} />
            <Route path="/grievance" element={<PublicGrievance />} />

            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </Suspense>
        <AIChatbot />
        <AccessibilityWidget />
      </BrowserRouter>
      </LanguageProvider>
    </ThemeProvider>
  </React.StrictMode>
);
