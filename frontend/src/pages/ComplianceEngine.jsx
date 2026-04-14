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

export default function ComplianceEngine() {
  const [tab, setTab] = useState(0);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const INITIAL_VIOLATIONS = [
    { id: 1, company: 'XYZ Manufacturing', rule_code: 'SUB-Q', rule_name: 'Quarterly Submission', severity: 'high', status: 'open', date: '2026-04-01', description: 'Missed Q1 2026 quarterly submission' },
    { id: 2, company: 'LMN Textiles', rule_code: 'ENV-WAT', rule_name: 'Water Usage Threshold', severity: 'critical', status: 'open', date: '2026-03-28', description: 'Water consumption exceeded by 300%' },
    { id: 3, company: 'PQR Auto Parts', rule_code: 'FIN-INV', rule_name: 'Investment Declaration', severity: 'medium', status: 'acknowledged', date: '2026-03-15', description: 'Investment change >10% not declared' },
    { id: 4, company: 'Sunrise Foods', rule_code: 'SAF-NOC', rule_name: 'Fire Safety NOC', severity: 'high', status: 'resolving', date: '2026-02-28', description: 'Fire safety NOC expired' },
    { id: 5, company: 'Delta Pharma', rule_code: 'ENV-WST', rule_name: 'Waste Management', severity: 'medium', status: 'open', date: '2026-03-20', description: 'Waste recycling below 60%' },
  ];

  const [violations, setViolations] = useState(() => {
    try { const s = localStorage.getItem('sipcot_violations'); return s ? JSON.parse(s) : INITIAL_VIOLATIONS; }
    catch { return INITIAL_VIOLATIONS; }
  });

  useEffect(() => {
    localStorage.setItem('sipcot_violations', JSON.stringify(violations));
  }, [violations]);

  const overview = {
    compliant: { count: 892, pct: 76.8 },
    warning: { count: 156, pct: 13.4 },
    violation: { count: violations.filter(v => v.status === 'open' || v.status === 'escalated').length, pct: ((violations.filter(v => v.status === 'open' || v.status === 'escalated').length / 1160) * 100).toFixed(1) },
    missing: { count: 67, pct: 5.8 },
  };

  const trendData = [
    { month: 'Jul', score: 71.2 }, { month: 'Aug', score: 72.5 },
    { month: 'Sep', score: 73.1 }, { month: 'Oct', score: 74.8 },
    { month: 'Nov', score: 75.2 }, { month: 'Dec', score: 75.9 },
    { month: 'Jan', score: 76.5 }, { month: 'Feb', score: 77.1 },
    { month: 'Mar', score: 77.8 },
  ];

  const categoryData = [
    { name: 'Submission', value: 18 }, { name: 'Environmental', value: 12 },
    { name: 'Safety', value: 9 }, { name: 'Financial', value: 6 },
  ];

  const severityDist = [
    { name: 'Critical', value: 8 }, { name: 'High', value: 15 },
    { name: 'Medium', value: 14 }, { name: 'Low', value: 8 },
  ];

  const predictions = [
    { metric: 'Total Investment', current: '24,500 Cr', projected: '28,200 Cr', growth: 15.1 },
    { metric: 'Employment', current: '145,000', projected: '162,000', growth: 11.7 },
    { metric: 'Compliance Rate', current: '76.8%', projected: '82.3%', growth: 5.5 },
    { metric: 'Active Industries', current: '1,160', projected: '1,340', growth: 15.5 },
  ];

  const filteredViolations = violations.filter(v =>
    (severityFilter === 'all' || v.severity === severityFilter) &&
    (statusFilter === 'all' || v.status === statusFilter)
  );

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
                  <Typography variant="subtitle1" fontWeight={600}>67 industries have not submitted Q1 2026 data</Typography>
                  <Typography variant="body2" color="text.secondary">Deadline: April 15, 2026</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button variant="contained" size="small" startIcon={<Send />} onClick={() => setSnackbar({ open: true, message: 'Compliance reminders sent to 67 industries via email and portal notification.', severity: 'success' })}>Send Bulk Reminder</Button>
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
