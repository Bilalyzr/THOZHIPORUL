import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, Chip, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Select, MenuItem, FormControl, InputLabel, Tabs, Tab, IconButton,
  Snackbar, Alert
} from '@mui/material';
import {
  CheckCircle, Warning, Error as ErrorIcon, HelpOutline,
  Send, Download, TrendingUp, Flag
} from '@mui/icons-material';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const SEVERITY_COLORS = { low: '#2196f3', medium: '#fbc02d', high: '#f57c00', critical: '#d32f2f' };
const STATUS_COLORS = { open: '#d32f2f', acknowledged: '#f57c00', resolving: '#fbc02d', resolved: '#4caf50', escalated: '#9c27b0' };
const PIE_COLORS = ['#1F4E79', '#2E7D32', '#F57C00', '#d32f2f'];

const OverviewCard = ({ label, count, pct, color, icon }) => (
  <Card sx={{ borderTop: `4px solid ${color}` }}>
    <CardContent sx={{ textAlign: 'center' }}>
      <Box sx={{ color, mb: 1 }}>{icon}</Box>
      <Typography variant="h3" fontWeight={700}>{count}</Typography>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="caption" color="text.secondary">({pct}%)</Typography>
    </CardContent>
  </Card>
);

export default function ComplianceEngine() {
  const [tab, setTab] = useState(0);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const INITIAL_VIOLATIONS = [
    { id: 1, company: 'Renault-Nissan India', rule_code: 'ENV_01', rule_name: 'Stack emissions exceed TNPCB limits', severity: 'critical', status: 'open', date: '2026-06-15' },
    { id: 2, company: 'Samsung Electronics', rule_code: 'SAF_04', rule_name: 'Fire safety NOC expired', severity: 'high', status: 'acknowledged', date: '2026-06-12' },
    { id: 3, company: 'TVS Motor Company', rule_code: 'ENV_03', rule_name: 'Effluent treatment plant bypass detected', severity: 'critical', status: 'resolving', date: '2026-06-18' },
    { id: 4, company: 'Foxconn India', rule_code: 'FIN_02', rule_name: 'Water charges lease payment delayed', severity: 'medium', status: 'open', date: '2026-06-05' },
    { id: 5, company: 'Apollo Tyres Ltd', rule_code: 'OPR_02', rule_name: 'Quarterly production report overdue', severity: 'low', status: 'resolved', date: '2026-06-01' }
  ];

  const [violations, setViolations] = useState(() => {
    try { const s = localStorage.getItem('sipcot_violations'); return s ? JSON.parse(s) : INITIAL_VIOLATIONS; }
    catch { return INITIAL_VIOLATIONS; }
  });

  useEffect(() => {
    localStorage.setItem('sipcot_violations', JSON.stringify(violations));
  }, [violations]);

  const overview = {
    compliant: { count: 1120, pct: 89 },
    warning: { count: 85, pct: 7 },
    violation: { count: violations.filter(v => v.status !== 'resolved').length, pct: 3 },
    missing: { count: 12, pct: 1 },
  };

  const trendData = [
    { month: 'Oct 2025', score: 72 },
    { month: 'Nov 2025', score: 74 },
    { month: 'Dec 2025', score: 76 },
    { month: 'Jan 2026', score: 75 },
    { month: 'Feb 2026', score: 78 },
    { month: 'Mar 2026', score: 81 },
    { month: 'Apr 2026', score: 80 },
    { month: 'May 2026', score: 83 },
    { month: 'Jun 2026', score: 85 }
  ];

  const categoryData = [
    { name: 'Environmental', value: 8 },
    { name: 'Safety', value: 5 },
    { name: 'Financial', value: 4 },
    { name: 'Operational', value: 2 }
  ];

  const severityDist = [
    { name: 'Critical', value: 3 },
    { name: 'High', value: 5 },
    { name: 'Medium', value: 7 },
    { name: 'Low', value: 4 }
  ];

  const predictions = [
    { metric: 'Compliance Rating', current: '82%', projected: '91%', growth: 11 },
    { metric: 'Resource Efficiency', current: '76%', projected: '84%', growth: 10 },
    { metric: 'Violation Resolution Time', current: '14.2 days', projected: '6.5 days', growth: 54 },
    { metric: 'Statutory Submission Rate', current: '92%', projected: '98%', growth: 6 }
  ];

  const filteredViolations = violations.filter(v =>
    (severityFilter === 'all' || v.severity === severityFilter) &&
    (statusFilter === 'all' || v.status === statusFilter)
  );

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Typography variant="h4" fontWeight={700} gutterBottom sx={{ fontSize: { xs: '1.4rem', sm: '1.75rem', md: '2.125rem' } }}>Compliance & Analytics Engine</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Automated monitoring, violation tracking, and predictive analytics</Typography>

      {/* Overview Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <OverviewCard label="Compliant" count={overview.compliant.count} pct={overview.compliant.pct} color="#2E7D32" icon={<CheckCircle fontSize="large" />} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <OverviewCard label="Warning" count={overview.warning.count} pct={overview.warning.pct} color="#F57C00" icon={<Warning fontSize="large" />} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <OverviewCard label="Violations" count={overview.violation.count} pct={overview.violation.pct} color="#d32f2f" icon={<ErrorIcon fontSize="large" />} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <OverviewCard label="Missing Data" count={overview.missing.count} pct={overview.missing.pct} color="#9e9e9e" icon={<HelpOutline fontSize="large" />} />
        </Grid>
      </Grid>

      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Violations" />
        <Tab label="Trends & Analytics" />
        <Tab label="Predictions" />
      </Tabs>

      {/* Tab 0: Violations */}
      {tab === 0 && (
        <Grid container spacing={{ xs: 2, md: 3 }}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Paper sx={{ p: { xs: 2, sm: 3 } }}>
              <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <FormControl size="small" sx={{ minWidth: 130 }}>
                  <InputLabel>Severity</InputLabel>
                  <Select value={severityFilter} label="Severity" onChange={(e) => setSeverityFilter(e.target.value)}>
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="critical">Critical</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="low">Low</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 130 }}>
                  <InputLabel>Status</InputLabel>
                  <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="open">Open</MenuItem>
                    <MenuItem value="acknowledged">Acknowledged</MenuItem>
                    <MenuItem value="resolving">Resolving</MenuItem>
                    <MenuItem value="resolved">Resolved</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <TableContainer sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Industry</TableCell>
                      <TableCell>Rule</TableCell>
                      <TableCell>Severity</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredViolations.map((v) => (
                      <TableRow key={v.id} hover>
                        <TableCell><Typography variant="body2" fontWeight={600}>{v.company}</Typography></TableCell>
                        <TableCell><Chip label={v.rule_code} size="small" variant="outlined" /><br /><Typography variant="caption">{v.rule_name}</Typography></TableCell>
                        <TableCell><Chip label={v.severity} size="small" sx={{ bgcolor: SEVERITY_COLORS[v.severity], color: 'white', textTransform: 'capitalize' }} /></TableCell>
                        <TableCell><Chip label={v.status} size="small" sx={{ bgcolor: STATUS_COLORS[v.status], color: 'white', textTransform: 'capitalize' }} /></TableCell>
                        <TableCell>{v.date}</TableCell>
                        <TableCell>
                          <Button size="small" variant="outlined" sx={{ mr: 0.5 }} disabled={v.status === 'acknowledged' || v.status === 'resolved'} onClick={() => { setViolations(violations.map(vv => vv.id === v.id ? { ...vv, status: 'acknowledged' } : vv)); setSnackbar({ open: true, message: `Violation for ${v.company} acknowledged. Status updated.`, severity: 'info' }); }}>{v.status === 'acknowledged' ? 'Acknowledged' : 'Acknowledge'}</Button>
                          <Button size="small" variant="outlined" color="error" disabled={v.status === 'escalated' || v.status === 'resolved'} onClick={() => { setViolations(violations.map(vv => vv.id === v.id ? { ...vv, status: 'escalated' } : vv)); setSnackbar({ open: true, message: `Violation for ${v.company} escalated to senior officer.`, severity: 'warning' }); }}>{v.status === 'escalated' ? 'Escalated' : 'Escalate'}</Button>
                          <Button size="small" variant="outlined" color="success" disabled={v.status === 'resolved'} onClick={() => { setViolations(violations.map(vv => vv.id === v.id ? { ...vv, status: 'resolved' } : vv)); setSnackbar({ open: true, message: `Violation for ${v.company} marked as resolved.`, severity: 'success' }); }}>{v.status === 'resolved' ? 'Resolved' : 'Resolve'}</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            {/* Missing Submissions Alert */}
            <Paper sx={{ p: { xs: 2, sm: 3 }, mt: 2, borderLeft: '4px solid #F57C00' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>0 industries have not submitted Q1 2026 data</Typography>
                  <Typography variant="body2" color="text.secondary">Deadline: April 15, 2026</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button variant="contained" size="small" startIcon={<Send />} onClick={() => setSnackbar({ open: true, message: 'Compliance reminders sent to 0 industries via email and portal notification.', severity: 'success' })}>Send Bulk Reminder</Button>
                  <Button variant="outlined" size="small" startIcon={<Download />} onClick={() => { const csvContent = 'Company,Location,Last Submission,Periods Missed\nXYZ Manufacturing,Sriperumbudur,2025-10-12,2\nDelta Pharma,Hosur,2025-07-20,3\nStar Electronics,Oragadam,2026-01-05,1'; const blob = new Blob([csvContent], { type: 'text/csv' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'missing_submissions.csv'; a.click(); URL.revokeObjectURL(url); setSnackbar({ open: true, message: 'Missing submissions list exported as CSV.', severity: 'success' }); }}>Export List</Button>
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* Side Charts */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>Violations by Category</Typography>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
                    {categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
            <Paper sx={{ p: { xs: 1.5, sm: 2 } }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>Severity Distribution</Typography>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={severityDist}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {severityDist.map((entry, i) => <Cell key={i} fill={Object.values(SEVERITY_COLORS).reverse()[i]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Tab 1: Trends */}
      {tab === 1 && (
        <Paper sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="h6" fontWeight={600} gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>Compliance Score Trend (9 Months)</Typography>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[65, 85]} />
              <Tooltip formatter={(value) => [`${value}%`, 'Avg Score']} />
              <Legend />
              <Line type="monotone" dataKey="score" stroke="#1F4E79" strokeWidth={3} name="Avg Compliance Score" dot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </Paper>
      )}

      {/* Tab 2: Predictions */}
      {tab === 2 && (
        <Paper sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="h6" fontWeight={600} gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>Predictive Growth Modeling</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Based on historical trends and current trajectory</Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Metric</TableCell>
                  <TableCell align="right">Current</TableCell>
                  <TableCell align="right">Projected (1 Year)</TableCell>
                  <TableCell align="right">Growth</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {predictions.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell><Typography fontWeight={600}>{p.metric}</Typography></TableCell>
                    <TableCell align="right">{p.current}</TableCell>
                    <TableCell align="right" sx={{ color: '#2E7D32', fontWeight: 600 }}>{p.projected}</TableCell>
                    <TableCell align="right">
                      <Chip icon={<TrendingUp />} label={`+${p.growth}%`} color="success" variant="outlined" size="small" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Button variant="contained" startIcon={<Download />} onClick={() => { const reportData = predictions.map(p => `${p.metric},${p.current},${p.projected},${p.growth}%`).join('\n'); const csv = 'Metric,Current,Projected 1yr,Growth\n' + reportData; const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'compliance_report.csv'; a.click(); URL.revokeObjectURL(url); setSnackbar({ open: true, message: 'Compliance report downloaded successfully!', severity: 'success' }); }}>Download Full Compliance Report</Button>
          </Box>
        </Paper>
      )}

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
