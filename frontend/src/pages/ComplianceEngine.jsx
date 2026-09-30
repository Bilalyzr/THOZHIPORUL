import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, Chip, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Select, MenuItem, FormControl, InputLabel, Tabs, Tab, IconButton,
  Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, CircularProgress
} from '@mui/material';
import {
  CheckCircle, Warning, Error as ErrorIcon, HelpOutline,
  Send, Download, TrendingUp, Flag, Receipt, QuestionAnswer
} from '@mui/icons-material';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { complianceService, researchService, lifecycleService, reportingPeriodService, findingsService } from '../services/api';

const SEVERITY_COLORS = { low: '#2196f3', medium: '#fbc02d', high: '#F57C00', critical: '#d32f2f', info: '#90a4ae', warning: '#fbc02d' };
const FINDING_STATUS_COLORS = { open: '#d32f2f', reviewed: '#f57c00', dismissed: '#9e9e9e', resolved: '#4caf50' };
const FILING_STATUS_COLORS = { APPROVED: '#4caf50', UNDER_REVIEW: '#1F4E79', REJECTED: '#d32f2f', LATE: '#f57c00', OVERDUE: '#d32f2f', MISSING: '#7b1fa2', NOT_DUE: '#9e9e9e' };
const CATEGORY_LABELS = { environmental: 'Environmental', safety: 'Safety', financial: 'Financial', submission: 'Submission', operational: 'Operational', other: 'Other' };

const formatMonth = (ym) => {
  // '2026-01' -> 'Jan 2026'
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return ym;
  const [y, m] = ym.split('-');
  const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${names[parseInt(m, 10) - 1]} ${y}`;
};

const formatDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-IN', { dateStyle: 'medium' });
};
const STATUS_COLORS = { open: '#d32f2f', acknowledged: '#f57c00', resolving: '#fbc02d', resolved: '#4caf50', escalated: '#9c27b0' };
const PIE_COLORS = ['#1F4E79', '#2E7D32', '#F57C00', '#d32f2f', '#7B1FA2', '#0288D1', '#00897B', '#C2185B'];

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

  const [violations, setViolations] = useState([]);
  const [overview, setOverview] = useState({
    compliant: { count: 0, pct: 0 }, warning: { count: 0, pct: 0 },
    violation: { count: 0, pct: 0 }, missing: { count: 0, pct: 0 },
  });
  const [trendData, setTrendData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [missingInfo, setMissingInfo] = useState({ total: 0, missing: [], cycle_start: null });
  // v7 — filing matrix + data-quality findings
  const [matrix, setMatrix] = useState(null);
  const [matrixYear, setMatrixYear] = useState(new Date().getFullYear());
  const [findings, setFindings] = useState([]);
  // T1.4 — GST reconciliation data + T2.2 — officer query state
  const [gstData, setGstData] = useState([]);
  const [queries, setQueries] = useState([]);
  const [queryDialog, setQueryDialog] = useState(null); // { submissionId, company, queryText }

  const mapOverview = (o) => {
    o = o || {};
    return {
    compliant: { count: o.compliant?.count || 0, pct: o.compliant?.percentage || 0 },
    warning: { count: o.warning?.count || 0, pct: o.warning?.percentage || 0 },
    violation: { count: o.violation?.count || 0, pct: o.violation?.percentage || 0 },
    missing: { count: o.missing?.count || 0, pct: o.missing?.percentage || 0 },
  };
  };

  const fetchViolations = async () => {
    const res = await complianceService.getViolations({ limit: 100 });
    setViolations((res.data.violations || []).map(v => ({
      id: v.id,
      company: v.company_name,
      rule_code: v.rule_code || '—',
      rule_name: v.rule_name || v.description || '',
      severity: v.severity,
      status: v.status,
      date: v.violation_date,
    })));
  };

  const fetchOverview = async () => {
    const res = await complianceService.getOverview();
    setOverview(mapOverview(res.data || {}));
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [ov, tr, cat, pred, miss] = await Promise.all([
          complianceService.getOverview(),
          complianceService.getTrends(),
          complianceService.getByCategory(),
          complianceService.getPredictions(),
          complianceService.getMissingSubmissions(),
        ]);
        if (!active) return;
        setOverview(mapOverview(ov.data));
        setTrendData((tr.data || []).map(t => ({ month: formatMonth(t.month), score: t.avg_score })));
        setCategoryData((cat.data || []).map(c => ({ name: CATEGORY_LABELS[c.category] || c.category, value: c.count })));
        setPredictions((pred.data || []).map(p => ({
          metric: p.metric, current: p.current, projected: p.projected_1yr,
          growth: p.growth_pct, basis: p.growth_basis, model: p.model
        })));
        setMissingInfo(miss.data || { total: 0, missing: [], cycle_start: null });
        await fetchViolations();
      } catch (err) {
        console.error('Failed to load compliance data', err);
        setSnackbar({ open: true, message: 'Unable to load compliance data. Please sign in as an admin/govt user.', severity: 'error' });
      }
    })();
    // T1.4 — load GST reconciliation + T2.2 — load filing queries (officer view)
    researchService.getGstReconciliation().then(r => setGstData(r.data || [])).catch(() => {});
    lifecycleService.getQueries().then(r => setQueries(r.data || [])).catch(() => {});
    // v7 — filing matrix + data-quality findings
    reportingPeriodService.getFilingMatrix({ year: new Date().getFullYear() })
      .then(r => setMatrix(r.data)).catch(() => {});
    findingsService.list({ limit: 100 })
      .then(r => setFindings((r.data && r.data.findings) || [])).catch(() => {});
    return () => { active = false; };
  }, []);

  const refreshMatrix = async (year) => {
    try {
      const r = await reportingPeriodService.getFilingMatrix({ year });
      setMatrix(r.data);
    } catch { /* keep old */ }
  };

  const refreshFindings = async () => {
    try {
      const r = await findingsService.list({ limit: 100 });
      setFindings((r.data && r.data.findings) || []);
    } catch { /* keep old */ }
  };

  // v7 — resolve/dismiss a data finding
  const handleFindingStatus = async (id, status) => {
    try {
      await findingsService.setStatus(id, status);
      setSnackbar({ open: true, message: `Finding marked ${status}.`, severity: 'success' });
      refreshFindings();
    } catch {
      setSnackbar({ open: true, message: 'Failed to update finding.', severity: 'error' });
    }
  };

  const handleUpdateStatus = async (v, newStatus, message, severity) => {
    try {
      await complianceService.updateViolation(v.id, { status: newStatus });
      setSnackbar({ open: true, message, severity });
      await Promise.all([fetchViolations(), fetchOverview()]);
    } catch (err) {
      console.error('Failed to update violation', err);
      setSnackbar({ open: true, message: 'Failed to update violation status.', severity: 'error' });
    }
  };

  // T1.4 — Officer marks GST reconciliation status
  const handleGstReconcile = async (submissionId, status) => {
    try {
      await researchService.setGstReconcile(submissionId, { status });
      setSnackbar({ open: true, message: `GST marked as ${status}.`, severity: 'success' });
      const r = await researchService.getGstReconciliation(); setGstData(r.data || []);
    } catch {
      setSnackbar({ open: true, message: 'Failed to update GST status.', severity: 'error' });
    }
  };

  // T2.2 — Officer raises a filing-deficiency query
  const handleRaiseQuery = async () => {
    if (!queryDialog?.queryText || !queryDialog?.submissionId) return;
    try {
      await lifecycleService.raiseQuery({ submissionId: queryDialog.submissionId, queryText: queryDialog.queryText });
      setSnackbar({ open: true, message: 'Query raised — industry notified.', severity: 'success' });
      setQueryDialog(null);
      const r = await lifecycleService.getQueries(); setQueries(r.data || []);
    } catch {
      setSnackbar({ open: true, message: 'Failed to raise query.', severity: 'error' });
    }
  };

  // T2.2 — Officer resolves a query
  const handleResolveQuery = async (qid) => {
    try {
      await lifecycleService.resolveQuery(qid);
      const r = await lifecycleService.getQueries(); setQueries(r.data || []);
      setSnackbar({ open: true, message: 'Query resolved.', severity: 'success' });
    } catch { setSnackbar({ open: true, message: 'Failed to resolve.', severity: 'error' }); }
  };

  const handleSendReminders = async () => {
    try {
      const ids = (missingInfo.missing || []).map(m => m.id);
      const res = await complianceService.sendReminders({ industryIds: ids });
      setSnackbar({ open: true, message: res.data?.msg || `Reminders sent to ${ids.length} industries.`, severity: 'success' });
    } catch (err) {
      console.error('Failed to send reminders', err);
      setSnackbar({ open: true, message: 'Failed to send reminders.', severity: 'error' });
    }
  };

  const handleExportMissing = () => {
    const header = 'Company,Park,Outstanding Periods,Reminders Sent,Govt Notified';
    const lines = (missingInfo.missing || []).map(m =>
      `${m.company_name},${m.location || ''},"${(m.outstanding_periods || []).join(' ')}",${m.reminders_sent || 0},${m.gov_notified ? 'yes' : 'no'}`);
    const csv = [header, ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'missing_submissions.csv'; a.click();
    URL.revokeObjectURL(url);
    setSnackbar({ open: true, message: 'Missing submissions list exported as CSV.', severity: 'success' });
  };

  const severityDist = ['critical', 'high', 'medium', 'low'].map(sev => ({
    name: sev.charAt(0).toUpperCase() + sev.slice(1),
    value: violations.filter(v => v.severity === sev).length,
  }));

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

      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 3 }} variant="scrollable" allowScrollButtonsMobile>
        <Tab label="Violations" />
        <Tab label="Filing Status" />
        <Tab label="Data Findings" />
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
                        <TableCell>{formatDate(v.date)}</TableCell>
                        <TableCell>
                          <Button size="small" variant="outlined" sx={{ mr: 0.5 }} disabled={v.status === 'acknowledged' || v.status === 'resolved'} onClick={() => handleUpdateStatus(v, 'acknowledged', `Violation for ${v.company} acknowledged. Status updated.`, 'info')}>{v.status === 'acknowledged' ? 'Acknowledged' : 'Acknowledge'}</Button>
                          <Button size="small" variant="outlined" color="error" disabled={v.status === 'escalated' || v.status === 'resolved'} onClick={() => handleUpdateStatus(v, 'escalated', `Violation for ${v.company} escalated to senior officer.`, 'warning')}>{v.status === 'escalated' ? 'Escalated' : 'Escalate'}</Button>
                          <Button size="small" variant="outlined" color="success" disabled={v.status === 'resolved'} onClick={() => handleUpdateStatus(v, 'resolved', `Violation for ${v.company} marked as resolved.`, 'success')}>{v.status === 'resolved' ? 'Resolved' : 'Resolve'}</Button>
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
                  <Typography variant="subtitle1" fontWeight={600}>{missingInfo.total} industries have not submitted for the current cycle</Typography>
                  <Typography variant="body2" color="text.secondary">Cycle start: {missingInfo.cycle_start ? formatDate(missingInfo.cycle_start) : '—'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button variant="contained" size="small" startIcon={<Send />} disabled={!missingInfo.total} onClick={handleSendReminders}>Send Bulk Reminder</Button>
                  <Button variant="outlined" size="small" startIcon={<Download />} disabled={!missingInfo.total} onClick={handleExportMissing}>Export List</Button>
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
                    {categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
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

      {/* Tab 1: Filing Status — period-based matrix (who filed / who's late / who's missing) */}
      {tab === 1 && matrix && (
        <Paper sx={{ p: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            <Box>
              <Typography variant="h6" fontWeight={600} sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>Filing Status — {matrix.year} (period-based)</Typography>
              <Typography variant="body2" color="text.secondary">
                Expected: {matrix.summary.expected_industries} industries × {matrix.summary.periods_evaluated} elapsed quarters.
                Filed {matrix.summary.filed} · Not yet due {matrix.summary.not_due} · <span style={{ color: '#d32f2f' }}>Overdue {matrix.summary.overdue}</span> · <span style={{ color: '#7b1fa2' }}>Missing {matrix.summary.missing}</span> · Late {matrix.summary.late} · Reminders {matrix.summary.reminders_sent}
              </Typography>
            </Box>
            <FormControl size="small" sx={{ minWidth: 110 }}>
              <InputLabel>Year</InputLabel>
              <Select value={matrixYear} label="Year" onChange={(e) => { setMatrixYear(e.target.value); refreshMatrix(e.target.value); }}>
                {[2027, 2026, 2025].map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Industry</TableCell>
                  <TableCell>Park</TableCell>
                  {matrix.periods.map(p => <TableCell key={p.period_quarter} align="center">Q{p.period_quarter}<br /><Typography variant="caption" color="text.secondary">due {formatDate(p.due_on)}</Typography></TableCell>)}
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {matrix.industries.map(ind => (
                  <TableRow key={ind.industry_id} hover>
                    <TableCell><Typography variant="body2" fontWeight={600}>{ind.company_name}</Typography>
                      <Typography variant="caption" color="text.secondary">{ind.operational_status?.replace(/_/g, ' ')}</Typography></TableCell>
                    <TableCell>{ind.park_name}</TableCell>
                    {ind.periods.map(p => (
                      <TableCell key={p.quarter} align="center">
                        <Chip label={p.status.replace(/_/g, ' ')} size="small"
                          sx={{ bgcolor: FILING_STATUS_COLORS[p.status] || '#9e9e9e', color: 'white', fontSize: '0.65rem' }} />
                      </TableCell>
                    ))}
                    <TableCell align="center">
                      {(() => {
                        const filedPeriod = ind.periods.find(p => p.submission_id);
                        return (
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                            {filedPeriod && (
                              <Button size="small" variant="outlined" color="primary"
                                onClick={() => setQueryDialog({ submissionId: filedPeriod.submission_id, company: ind.company_name, queryText: '' })}>
                                Raise Query
                              </Button>
                            )}
                            {ind.outstanding.length > 0 && (
                              <Button size="small" variant="outlined" color="warning"
                                onClick={async () => {
                                  try {
                                    const res = await complianceService.sendReminders({ industryIds: [ind.industry_id] });
                                    setSnackbar({ open: true, severity: 'success', message: res.data?.msg || 'Reminder delivered.' });
                                    refreshMatrix(matrixYear);
                                  } catch {
                                    setSnackbar({ open: true, severity: 'error', message: 'Reminder failed.' });
                                  }
                                }}>
                                Remind
                              </Button>
                            )}
                          </Box>
                        );
                      })()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Alert severity="info" sx={{ mt: 2 }}>
            Statuses are computed from the <strong>reporting calendar × expected filers × actual filings</strong> (not submission timestamps).
            The scheduler sends escalating reminders (upcoming → due → grace → overdue → escalated, with officer notification) every hour.
          </Alert>
        </Paper>
      )}

      {/* Tab 2: Data Findings — anomalies + consistency evidence */}
      {tab === 2 && (
        <Paper sx={{ p: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            <Typography variant="h6" fontWeight={600} sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              Data Quality Findings — anomalies &amp; inconsistencies ({findings.filter(f => f.status === 'open').length} open)
            </Typography>
            <Button size="small" variant="outlined" onClick={async () => {
              try {
                const r = await findingsService.runDetection();
                setSnackbar({ open: true, severity: 'success', message: `Batch detection: ${r.data.submissions_evaluated} filings → ${r.data.new_consistency_findings} consistency, ${r.data.anomalies_detected} anomaly finding(s).` });
                refreshFindings();
              } catch { setSnackbar({ open: true, severity: 'error', message: 'Detection failed.' }); }
            }}>Run Batch Detection</Button>
          </Box>
          {findings.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
              No findings recorded. Detectors run at filing time and daily; metrics with insufficient history are skipped (never guessed).
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Severity</TableCell>
                    <TableCell>Type / Rule</TableCell>
                    <TableCell>Industry</TableCell>
                    <TableCell>Period</TableCell>
                    <TableCell>Metric</TableCell>
                    <TableCell align="right">Observed</TableCell>
                    <TableCell align="right">Expected</TableCell>
                    <TableCell align="right">Change %</TableCell>
                    <TableCell>Reason / Evidence</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {findings.slice(0, 60).map(f => (
                    <TableRow key={f.id} hover>
                      <TableCell><Chip label={f.severity} size="small" sx={{ bgcolor: SEVERITY_COLORS[f.severity] || '#90a4ae', color: 'white' }} /></TableCell>
                      <TableCell>{f.finding_type}<br /><Typography variant="caption" color="text.secondary">{f.rule_id}</Typography></TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{f.company_name}</TableCell>
                      <TableCell>{f.period_year}-Q{f.period_quarter ?? 'FY'}</TableCell>
                      <TableCell>{f.metric || '—'}</TableCell>
                      <TableCell align="right">{f.observed_value != null ? Number(f.observed_value).toLocaleString('en-IN') : '—'}</TableCell>
                      <TableCell align="right">{f.expected_value != null ? Number(f.expected_value).toLocaleString('en-IN') : '—'}</TableCell>
                      <TableCell align="right">{f.change_pct != null ? `${f.change_pct > 0 ? '+' : ''}${f.change_pct}%` : '—'}</TableCell>
                      <TableCell sx={{ maxWidth: 320 }}>
                        <Typography variant="caption">{f.reason}</Typography>
                        {f.evidence && typeof f.evidence === 'object' && (
                          <Typography variant="caption" color="text.secondary" component="div" sx={{ fontFamily: 'monospace', mt: 0.5 }}>
                            {Object.entries(f.evidence).slice(0, 4).map(([k, v]) => `${k}=${String(v)}`).join(' · ')}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip label={f.status} size="small" variant="outlined" sx={{ color: FINDING_STATUS_COLORS[f.status] }} />
                        {f.status === 'open' && (
                          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                            <Button size="small" onClick={() => handleFindingStatus(f.id, 'reviewed')}>Reviewed</Button>
                            <Button size="small" color="success" onClick={() => handleFindingStatus(f.id, 'resolved')}>Resolve</Button>
                            <Button size="small" color="inherit" onClick={() => handleFindingStatus(f.id, 'dismissed')}>Dismiss</Button>
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* Tab 3: Trends */}
      {tab === 3 && (
        <Paper sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="h6" fontWeight={600} gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>Compliance Score Trend</Typography>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={['auto', 'auto']} />
              <Tooltip formatter={(value) => [`${value}%`, 'Avg Score']} />
              <Legend />
              <Line type="monotone" dataKey="score" stroke="#1F4E79" strokeWidth={3} name="Avg Compliance Score" dot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </Paper>
      )}

      {/* Tab 4: Predictions */}
      {tab === 4 && (
        <Paper sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="h6" fontWeight={600} gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>Predictive Growth Modeling</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Projections are real quarter-over-quarter growth from filed data. Metrics without enough history show
            INSUFFICIENT_DATA instead of a fabricated number.
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Metric</TableCell>
                  <TableCell align="right">Current</TableCell>
                  <TableCell align="right">Projected (1 Year)</TableCell>
                  <TableCell align="right">Growth (QoQ)</TableCell>
                  <TableCell>Basis</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {predictions.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell><Typography fontWeight={600}>{p.metric}</Typography></TableCell>
                    <TableCell align="right">{p.current}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>{p.projected}</TableCell>
                    <TableCell align="right">
                      {p.growth === null || p.growth === undefined
                        ? <Chip label="n/a" size="small" variant="outlined" />
                        : <Chip icon={<TrendingUp />} label={`${p.growth > 0 ? '+' : ''}${p.growth}%`} color={p.growth >= 0 ? 'success' : 'error'} variant="outlined" size="small" />}
                    </TableCell>
                    <TableCell><Typography variant="caption" color="text.secondary">{p.basis || '—'}</Typography></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Button variant="contained" startIcon={<Download />} onClick={() => { const reportData = predictions.map(p => `${p.metric},${p.current},${p.projected},${p.growth ?? 'n/a'}% (${p.basis || ''})`).join('\n'); const csv = 'Metric,Current,Projected 1yr,Growth\n' + reportData; const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'compliance_report.csv'; a.click(); URL.revokeObjectURL(url); setSnackbar({ open: true, message: 'Compliance report downloaded successfully!', severity: 'success' }); }}>Download Full Compliance Report</Button>
          </Box>
        </Paper>
      )}

      {/* T1.4 — GST Turnover Reconciliation (officer view) */}
      {gstData.length > 0 && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Receipt /> GST Turnover Reconciliation
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell>Company</TableCell>
                  <TableCell>GSTIN</TableCell>
                  <TableCell align="right">Declared (Cr)</TableCell>
                  <TableCell align="right">GST Filed (Cr)</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {gstData.map((g) => (
                  <TableRow key={g.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{g.company_name}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{g.gstin || '—'}</TableCell>
                    <TableCell align="right">{g.declared_turnover_cr || '—'}</TableCell>
                    <TableCell align="right">{g.gst_turnover_cr || '—'}</TableCell>
                    <TableCell><Chip label={g.gst_reconcile_status || 'unverified'} size="small" color={g.gst_reconcile_status === 'matches' ? 'success' : g.gst_reconcile_status === 'mismatch' ? 'error' : 'default'} variant="outlined" /></TableCell>
                    <TableCell align="center">
                      <Select size="small" value="action" displayEmpty onChange={(e) => e.target.value !== 'action' && handleGstReconcile(g.id, e.target.value)} sx={{ height: 28, fontSize: '0.75rem' }}>
                        <MenuItem value="action">Action…</MenuItem>
                        <MenuItem value="matches">Mark Matched</MenuItem>
                        <MenuItem value="mismatch">Mark Mismatch</MenuItem>
                        <MenuItem value="overdue">Mark Overdue</MenuItem>
                        <MenuItem value="unverified">Reset</MenuItem>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* T2.2 — Filing-Deficiency Queries (officer view) */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <QuestionAnswer /> Filing-Deficiency Queries ({queries.filter(q => q.status !== 'resolved').length} open)
        </Typography>
        {queries.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No queries raised. Officers can raise a deficiency query on any submission to request clarification from the industry.</Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell>Company</TableCell>
                  <TableCell>Query</TableCell>
                  <TableCell>Response</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {queries.slice(0, 15).map((q) => (
                  <TableRow key={q.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{q.company_name}</TableCell>
                    <TableCell sx={{ maxWidth: 200 }}>{q.query_text}</TableCell>
                    <TableCell sx={{ maxWidth: 200 }}>{q.response_text || <Typography variant="caption" color="text.secondary">Awaiting response…</Typography>}</TableCell>
                    <TableCell><Chip label={q.status} size="small" color={q.status === 'open' ? 'error' : q.status === 'responded' ? 'warning' : 'success'} variant="outlined" /></TableCell>
                    <TableCell align="center">
                      {q.status !== 'resolved' && <Button size="small" variant="outlined" onClick={() => handleResolveQuery(q.id)}>Resolve</Button>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* T2.2 — Raise Query Dialog */}
      <Dialog open={!!queryDialog} onClose={() => setQueryDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Raise Filing-Deficiency Query</DialogTitle>
        <DialogContent>
          {queryDialog && (
            <TextField
              autoFocus fullWidth multiline rows={3}
              label="Query to the industry (they will be notified)…"
              value={queryDialog.queryText || ''}
              onChange={(e) => setQueryDialog({ ...queryDialog, queryText: e.target.value })}
              sx={{ mt: 1 }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQueryDialog(null)}>Cancel</Button>
          <Button variant="contained" color="primary" startIcon={<Send />} onClick={handleRaiseQuery}>Raise Query & Notify</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
