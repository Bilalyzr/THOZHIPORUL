import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatically add token to headers if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['x-auth-token'] = token;
  }
  return config;
});

export const authService = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    // Only store a real session token — never store anything when an MFA
    // challenge (setup or verify) is required. The token isn't issued yet.
    if (response.data.token && !response.data.mfa_required && !response.data.mfa_setup_required) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('role', response.data.role);
      if (response.data.name) localStorage.setItem('userName', response.data.name);
      if (response.data.email) localStorage.setItem('userEmail', response.data.email);
    }
    return response.data;
  },
  registerIndustry: (data) => api.post('/auth/register/industry', data),
  registerGovt: (data) => api.post('/auth/register/govt', data),
  impersonate: (industryId) => api.post(`/auth/impersonate/${industryId}`),
  endImpersonation: () => api.post('/auth/impersonate/end'),
  // 2FA — TOTP (Microsoft Authenticator compatible)
  verifyMfa: async (data) => {
    const response = await api.post('/auth/verify-mfa', data);
    return response.data;
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('sipcot_service_requests');
    localStorage.removeItem('sipcot_submissions');
    localStorage.removeItem('sipcot_violations');
    localStorage.removeItem('savedReportConfig');
  },
};

export const industryService = {
  register: (data) => api.post('/industries', data),
  getAll: () => api.get('/industries'),
  getById: (id) => api.get(`/industries/${id}`),
};

export const submissionService = {
  submit: (data) => api.post('/submissions', data),
  getMySubmissions: () => api.get('/submissions/me'),
  getCompliance: () => api.get('/submissions/compliance'),
  updateStatus: (id, status) => api.put(`/submissions/${id}/status`, { status }),
};

export const analyticService = {
  getGlobalData: () => api.get('/analytics/global'),
  getCommandCenterStats: () => api.get('/analytics/command-center'),
  getUtilityBreakdown: (type) => api.get('/analytics/utility-breakdown', { params: { type } }),
};

export const userService = {
  getAll: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  updateStatus: (id, status) => api.put(`/users/${id}/status`, { status }),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`)
};

export const reportService = {
  generate: (data) => api.post('/reports/generate', data, { responseType: 'blob' }),
  getData: (params) => api.get('/reports/data', { params }),
};

export const notificationService = {
  getNotifications: () => api.get('/notifications'),
};

export const auditService = {
  getLogs: (limit) => api.get(`/audit${limit ? `?limit=${limit}` : ''}`),
};

// Industrial OS v2 Services
export const publicService = {
  getPulse: () => api.get('/public/pulse'),
};

export const parkService = {
  getAll: () => api.get('/parks'),
  getById: (id) => api.get(`/parks/${id}`),
  getPlots: (id) => api.get(`/parks/${id}/plots`),
  getMetrics: (id) => api.get(`/parks/${id}/metrics`),
  compare: (ids) => api.get(`/parks/compare?ids=${ids.join(',')}`),
};

export const serviceRequestService = {
  getAll: () => api.get('/services'),
  getById: (id) => api.get(`/services/${id}`),
  create: (data) => api.post('/services', data),
  updateStatus: (id, data) => api.put(`/services/${id}/status`, data),
  allotPlot: (id, plotId) => api.post(`/services/${id}/allot`, { plotId }),
  getBottlenecks: () => api.get('/services/bottlenecks'),
};

export const commandService = {
  getKPIs: () => api.get('/command/kpis'),
  getHeatmap: () => api.get('/command/heatmap'),
  getRankings: (sort) => api.get(`/command/rankings?sort=${sort || 'infrastructure_score'}`),
  getAlerts: () => api.get('/command/alerts'),
  getTrends: (metric) => api.get(`/command/trends?metric=${metric || 'investment'}`),
  getActivityFeed: () => api.get('/command/activity-feed'),
};

export const complianceService = {
  getOverview: () => api.get('/compliance/overview'),
  getViolations: (params) => api.get('/compliance/violations', { params }),
  updateViolation: (id, data) => api.put(`/compliance/violations/${id}`, data),
  getMissingSubmissions: () => api.get('/compliance/missing-submissions'),
  sendReminders: (data) => api.post('/compliance/send-reminders', data),
  getTrends: () => api.get('/compliance/trends'),
  getPredictions: () => api.get('/compliance/predictions'),
  getByCategory: () => api.get('/compliance/by-category'),
};

export const aiDecisionService = {
  getRecommendations: (industryId) => api.get(`/ai-decisions/recommendations/${industryId}`),
  getBatchRecommendations: (params) => api.get('/ai-decisions/batch', { params }),
  getDashboardSummary: () => api.get('/ai-decisions/dashboard-summary'),
};

export const workflowService = {
  evaluateRules: (data) => api.post('/workflow/evaluate', data),
  getRules: (type) => api.get(`/workflow/rules${type ? `?type=${type}` : ''}`),
  updateRuleset: (ruleset, ruleId, data) => api.put(`/workflow/rules/${ruleset}/${ruleId}`, data),
  executeAction: (data) => api.post('/workflow/execute-action', data),
  getActivityLog: (params) => api.get('/workflow/activity-log', { params }),
  getStats: () => api.get('/workflow/stats'),
};

export const workspaceService = {
  getOverview: () => api.get('/workspace/overview'),
  getComplianceScore: () => api.get('/workspace/compliance-score'),
  getDocuments: () => api.get('/workspace/documents'),
  // data is a FormData (multipart/form-data). Axios sets the boundary
  // automatically when given FormData — do NOT set Content-Type manually.
  uploadDocument: (formData) => api.post('/workspace/documents', formData),
  // Blob response so the frontend can trigger a real file download.
  downloadDocument: (id) => api.get(`/workspace/documents/${id}/download`, { responseType: 'blob' }),
  deleteDocument: (id) => api.delete(`/workspace/documents/${id}`),
  getLease: () => api.get('/workspace/lease'),
  updateProfile: (data) => api.put('/workspace/profile', data),
  verifyVault: (passphrase) => api.post('/workspace/verify-vault', { passphrase }),
};

export const paymentsService = {
  createOrder: (plan) => api.post('/payments/order', { plan }),
  verifyPayment: (data) => api.post('/payments/verify', data),
};

// Subscription tier state (used by useSubscription hook + GatedFeature)
export const subscriptionService = {
  getMe: () => api.get('/subscriptions/me'),
};

export const grievanceService = {
  getAll: () => api.get('/grievances'),
  create: (data) => api.post('/grievances', data),
  updateStatus: (id, status) => api.put(`/grievances/${id}/status`, { status }),
  // Public aggregate counters for the Grievance Portal landing page
  // (no auth required — returns resolved/active/avg response hours only).
  getPublicStats: () => api.get('/grievances/public-stats'),
};

// ============================================================
// Enhancement (v3) Services — additive, mirror the new routes.
// ============================================================

// Secure Vault enhancements (Quick Win 3 + Module 4)
export const vaultService = {
  getExpiryDashboard: (industryId) => api.get('/vault/expiry-dashboard', { params: { industryId } }),
  verify: (id, data) => api.post(`/vault/${id}/verify`, data),
  verificationHistory: (id) => api.get(`/vault/${id}/verification-history`),
  addVersion: (id, data) => api.post(`/vault/${id}/version`, data),
  getVersions: (id) => api.get(`/vault/${id}/versions`),
  integrity: (id) => api.get(`/vault/${id}/integrity`),
  createShareLink: (id, data) => api.post(`/vault/${id}/share`, data),
  storeOcr: (id, data) => api.post(`/vault/${id}/ocr`, data),
};

// Scheduled reports + saved configs (Quick Win 4 + Top 3-C)
export const scheduledReportService = {
  list: () => api.get('/scheduled-reports'),
  create: (data) => api.post('/scheduled-reports', data),
  update: (id, data) => api.put(`/scheduled-reports/${id}`, data),
  remove: (id) => api.delete(`/scheduled-reports/${id}`),
  listConfigs: () => api.get('/scheduled-reports/configs'),
  saveConfig: (data) => api.post('/scheduled-reports/configs', data),
  removeConfig: (id) => api.delete(`/scheduled-reports/configs/${id}`),
  history: () => api.get('/scheduled-reports/history'),
};

// Persistent notifications (Quick Win 5)
export const notificationV2Service = {
  list: (params) => api.get('/notifications-v2', { params }),
  markRead: (id) => api.put(`/notifications-v2/${id}/read`),
  markAllRead: () => api.put('/notifications-v2/read-all'),
  getPreferences: () => api.get('/notifications-v2/preferences'),
  updatePreferences: (data) => api.put('/notifications-v2/preferences', data),
  digest: (since) => api.get('/notifications-v2/digest', { params: { since } }),
  streamUrl: () => `${API_URL.replace(/\/$/, '')}/notifications-v2/stream`,
};

// Global search (Quick Win 6)
export const searchService = {
  query: (q) => api.get('/search', { params: { q } }),
};

// Account — unified Profile + Settings (all 3 roles)
export const accountService = {
  getProfile: () => api.get('/account/profile'),
  updateProfile: (data) => api.put('/account/profile', data),
  getSettings: () => api.get('/account/settings'),
  updateSettings: (data) => api.put('/account/settings', data),
  changePassword: (data) => api.put('/account/password', data),
};

// Research-grounded Tier 1 (committed-vs-actual, CSR, GST, quotas)
export const researchService = {
  getRealisation: () => api.get('/research/realisation'),
  getParkRealisation: () => api.get('/research/park-realisation'),
  getCsrDashboard: () => api.get('/research/csr-dashboard'),
  runCsrCheck: () => api.post('/research/csr-check'),
  getGstReconciliation: () => api.get('/research/gst-reconciliation'),
  setGstReconcile: (submissionId, data) => api.put(`/research/gst-reconcile/${submissionId}`, data),
};

// Mobile field inspections (T2.2)
export const inspectionService = {
  getAll: () => api.get('/inspections'),
  create: (data) => api.post('/inspections', data),
};

// Tier 2 allottee lifecycle (billing, queries, inspections HO, incentives, MD escalation)
export const lifecycleService = {
  getBilling: () => api.get('/lifecycle/billing'),
  getBillingSummary: () => api.get('/lifecycle/billing/summary'),
  generateBilling: (data) => api.post('/lifecycle/billing/generate', data),
  payBill: (id) => api.post(`/lifecycle/billing/${id}/pay`),
  getQueries: () => api.get('/lifecycle/queries'),
  raiseQuery: (data) => api.post('/lifecycle/queries', data),
  respondQuery: (id, data) => api.put(`/lifecycle/queries/${id}/respond`, data),
  resolveQuery: (id) => api.put(`/lifecycle/queries/${id}/resolve`),
  checkOpenQueries: (submissionId) => api.get(`/lifecycle/queries/open/${submissionId}`),
  forwardHo: (id, data) => api.put(`/lifecycle/inspections/${id}/forward-ho`, data),
  hoDecision: (id, data) => api.put(`/lifecycle/inspections/${id}/ho-decision`, data),
  getIncentives: () => api.get('/lifecycle/incentives'),
  createIncentive: (data) => api.post('/lifecycle/incentives', data),
  disburseIncentive: (id, data) => api.put(`/lifecycle/incentives/${id}/disburse`, data),
  escalateMd: (id) => api.put(`/lifecycle/grievances/${id}/escalate-md`),
  mdResolution: (id, data) => api.put(`/lifecycle/grievances/${id}/md-resolution`, data),
  getMdEscalations: () => api.get('/lifecycle/grievances/md-escalations'),
};

// Tier 3 strategic (circulars, gov integrations, directory, tier access, CSR needs)
export const strategyService = {
  getCirculars: (params) => api.get('/strategy/circulars', { params }),
  publishCircular: (data) => api.post('/strategy/circulars', data),
  getIntegrations: () => api.get('/strategy/integrations'),
  updateIntegration: (key, data) => api.put(`/strategy/integrations/${key}`, data),
  syncIntegration: (key) => api.post(`/strategy/integrations/${key}/sync`),
  getIntegrationLog: (key) => api.get(`/strategy/integrations/${key}/log`),
  getContacts: (params) => api.get('/strategy/contacts', { params }),
  verifyContact: (id) => api.put(`/strategy/contacts/${id}/verify`),
  addContact: (data) => api.post('/strategy/contacts', data),
  getTierAccess: () => api.get('/strategy/tier-access'),
  updateTierAccess: (key, data) => api.put(`/strategy/tier-access/${key}`, data),
  getCsrNeeds: (params) => api.get('/strategy/csr-needs', { params }),
  syncCsrNeeds: () => api.post('/strategy/csr-needs/sync'),
  addCsrNeed: (data) => api.post('/strategy/csr-needs', data),
  pushCsrReports: () => api.post('/strategy/csr-needs/push-reports'),
};

// i18n (Quick Win 6)
export const i18nService = {
  dictionary: (lang) => api.get('/i18n/dictionary', { params: { lang } }),
  translate: (keys, lang) => api.get('/i18n/translate', { params: { keys: keys.join(','), lang } }),
  listStrings: (lang) => api.get('/i18n/strings', { params: { lang } }),
  upsertString: (data) => api.post('/i18n/strings', data),
  removeString: (id) => api.delete(`/i18n/strings/${id}`),
};

export default api;
