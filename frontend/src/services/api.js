import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001/api';

const api = axios.create({
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
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('role', response.data.role);
      if (response.data.name) localStorage.setItem('userName', response.data.name);
      if (response.data.email) localStorage.setItem('userEmail', response.data.email);
    }
    return response.data;
  },
  registerIndustry: (data) => api.post('/auth/register/industry', data),
  registerGovt: (data) => api.post('/auth/register/govt', data),
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
};

export const notificationService = {
  getNotifications: () => api.get('/notifications'),
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
  uploadDocument: (data) => api.post('/workspace/documents', data),
  getLease: () => api.get('/workspace/lease'),
  updateProfile: (data) => api.put('/workspace/profile', data),
  verifyVault: (passphrase) => api.post('/workspace/verify-vault', { passphrase }),
};

export const paymentsService = {
  createOrder: (plan) => api.post('/payments/order', { plan }),
  verifyPayment: (data) => api.post('/payments/verify', data),
};

export const grievanceService = {
  getAll: () => api.get('/grievances'),
  create: (data) => api.post('/grievances', data),
  updateStatus: (id, status) => api.put(`/grievances/${id}/status`, { status }),
};

export default api;
