import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, Chip, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  List, ListItem, ListItemIcon, ListItemText, Button, Divider, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert,
  CircularProgress
} from '@mui/material';
import {
  CheckCircle, RadioButtonUnchecked, Warning, Info, Business,
  People, CurrencyRupee, Bolt, WaterDrop, Description,
  UploadFile, Gavel, Assignment, Schedule
} from '@mui/icons-material';
import { workspaceService, researchService, lifecycleService, strategyService } from '../services/api';
import { createDashboardStyles } from '../utils/dashboardStyles';

const ds = createDashboardStyles('industry');

const SCORE_COLORS = { high: '#2E7D32', good: '#43A047', medium: '#F57C00', low: '#d32f2f' };
const getScoreColor = (score) => score >= 80 ? SCORE_COLORS.high : score >= 60 ? SCORE_COLORS.good : score >= 40 ? SCORE_COLORS.medium : SCORE_COLORS.low;
const getScoreLabel = (score) => score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Needs Attention' : 'Critical';

const ScoreBar = ({ label, score }) => (
  <Box sx={{ mb: 1.5 }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
      <Typography variant="body2">{label}</Typography>
      <Typography variant="body2" fontWeight={600}>{score}/100</Typography>
    </Box>
    <LinearProgress variant="determinate" value={score} sx={{ height: 8, borderRadius: 4, bgcolor: 'grey.200', '& .MuiLinearProgress-bar': { bgcolor: getScoreColor(score), borderRadius: 4 } }} />
  </Box>
);

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '-';
  return 'Rs. ' + Number(amount).toLocaleString('en-IN');
};

export default function IndustryWorkspace() {
  const [leaseDialogOpen, setLeaseDialogOpen] = useState(false);
  const [uploadSnack, setUploadSnack] = useState(false);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // T1.1 + T1.3 — realisation vs commitment + resource quotas
  const [realisation, setRealisation] = useState(null);
  // T2.1 — billing & dues
  const [billing, setBilling] = useState(null);
  const [billingStatements, setBillingStatements] = useState([]);
  // T3.2 — CSR funding opportunities (from Mission Inaippagam)
  const [csrNeeds, setCsrNeeds] = useState([]);

  useEffect(() => {
    let active = true;
    const fetchWorkspace = async () => {
      try {
        setLoading(true);
        const res = await workspaceService.getOverview();
        if (active) {
          setOverview(res.data);
          setError(null);
        }
      } catch (err) {
        console.error('Failed to fetch workspace overview:', err);
        if (active) {
          setError(err.response?.data?.error || 'Failed to load workspace data. Please make sure the backend is running.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    fetchWorkspace();
    // T1.1 + T1.3 — load realisation vs commitment + resource quotas
    researchService.getRealisation()
      .then((res) => { if (active) setRealisation(res.data); })
      .catch(() => { /* optional feature — fail silently */ });
    // T2.1 — load billing summary + statements
    lifecycleService.getBillingSummary()
      .then((res) => { if (active) setBilling(res.data); })
      .catch(() => { /* optional */ });
    lifecycleService.getBilling()
      .then((res) => { if (active) setBillingStatements(res.data); })
      .catch(() => { /* optional */ });
    // T3.2 — Load CSR funding opportunities for this industry
    strategyService.getCsrNeeds()
      .then((res) => { if (active) setCsrNeeds(res.data || []); })
      .catch(() => { /* optional */ });
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button variant="contained" onClick={() => window.location.reload()}>Retry</Button>
      </Box>
    );
  }

  if (!overview) return null;

  // Coerce top-level nulls to {} so destructuring defaults apply uniformly
  // (defaults only kick in for `undefined`, not `null` — guards against the
  // backend sending an explicit null for a sub-object).
  const _ov = overview || {};
  const { company = {}, compliance_score = {}, quick_stats = {}, lease = {}, pending_tasks = [], notices = [], service_summary = {} } = {
    company: _ov.company || {},
    compliance_score: _ov.compliance_score || {},
    quick_stats: _ov.quick_stats || {},
    lease: _ov.lease || {},
    pending_tasks: _ov.pending_tasks || [],
    notices: _ov.notices || [],
    service_summary: _ov.service_summary || {}
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      {/* Company Header */}
      <Paper sx={{ ...ds.heroBanner }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 }, flexWrap: 'wrap' }}>
          <Avatar sx={{ width: { xs: 40, sm: 56 }, height: { xs: 40, sm: 56 }, bgcolor: 'rgba(255,255,255,0.2)' }}>
            <Business fontSize="large" />
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="h5" fontWeight={700} sx={{ fontSize: { xs: '1.15rem', sm: '1.5rem' } }}>{company.name} - Workspace</Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, fontSize: { xs: '0.7rem', sm: '0.875rem' }, wordBreak: 'break-word' }}>
              {company.park} | Plot: {company.plot} | Since {company.since} | {company.industry_type}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Compliance Health Score */}
      <Paper sx={{ ...ds.paper, mb: { xs: 2, md: 3 } }}>
        <Typography variant="h6" fontWeight={600} gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>Compliance Health Score</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 2, sm: 3 }, mb: 2, flexWrap: 'wrap' }}>
          <Box sx={{ position: 'relative', display: 'inline-flex' }}>
            <Box sx={{ width: { xs: 80, sm: 100 }, height: { xs: 80, sm: 100 }, borderRadius: '50%', border: `6px solid ${getScoreColor(compliance_score.overall)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box textAlign="center">
                <Typography variant="h4" fontWeight={700} color={getScoreColor(compliance_score.overall)} sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>{compliance_score.overall}</Typography>
                <Typography variant="caption">/100</Typography>
              </Box>
            </Box>
          </Box>
          <Chip label={getScoreLabel(compliance_score.overall)} sx={{ bgcolor: getScoreColor(compliance_score.overall), color: 'white', fontWeight: 600, fontSize: '0.9rem', px: 1 }} />
        </Box>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}><ScoreBar label="Submission" score={compliance_score.submission} /></Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}><ScoreBar label="Environmental" score={compliance_score.environmental} /></Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}><ScoreBar label="Financial" score={compliance_score.financial} /></Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}><ScoreBar label="Safety" score={compliance_score.safety} /></Grid>
        </Grid>
      </Paper>

      {/* T1.1 — Investment & Employment Realisation (committed vs actual) */}
      {realisation && realisation.available && (
        <Paper sx={{ ...ds.paper, mb: { xs: 2, md: 3 } }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>Allotment Commitment vs Actual</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            Measured against your CAF / allotment baseline — SIPCOT governs on the realisation gap.
          </Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" gutterBottom>Investment Realisation</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="h5" fontWeight={700} color={getScoreColor(realisation.investment.realisation_pct || 0)}>
                  {realisation.investment.realisation_pct != null ? `${realisation.investment.realisation_pct}%` : '—'}
                </Typography>
              </Box>
              <LinearProgress variant="determinate" value={Math.min(realisation.investment.realisation_pct || 0, 100)} sx={{ height: 8, borderRadius: 4, mb: 1, '& .MuiLinearProgress-bar': { bgcolor: getScoreColor(realisation.investment.realisation_pct || 0), borderRadius: 4 } }} />
              <Typography variant="body2" color="text.secondary">
                ₹{realisation.investment.realised_cr} Cr realised of ₹{realisation.investment.committed_cr} Cr committed
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="subtitle2" gutterBottom>Employment Realisation</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="h5" fontWeight={700} color={getScoreColor(Math.min(realisation.employment.realisation_pct || 0, 100))}>
                  {realisation.employment.realisation_pct != null ? `${realisation.employment.realisation_pct}%` : '—'}
                </Typography>
              </Box>
              <LinearProgress variant="determinate" value={Math.min(realisation.employment.realisation_pct || 0, 100)} sx={{ height: 8, borderRadius: 4, mb: 1, '& .MuiLinearProgress-bar': { bgcolor: getScoreColor(Math.min(realisation.employment.realisation_pct || 0, 100)), borderRadius: 4 } }} />
              <Typography variant="body2" color="text.secondary">
                {realisation.employment.realised} jobs realised of {realisation.employment.committed} committed
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* T1.3 — Resource Usage Quota vs Actual */}
      {realisation && realisation.available && realisation.quotas && (
        <Paper sx={{ ...ds.paper, mb: { xs: 2, md: 3 } }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>Resource Usage vs Allocation</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            Over-draw beyond 120% of allocation triggers an environmental compliance violation.
          </Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><WaterDrop color="info" fontSize="small" /> Water</Typography>
                <Typography variant="body2" fontWeight={600}>{quick_stats.water_usage_kl || 0} KL used</Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={realisation.quotas.water_allocated_kl > 0 ? Math.min(((quick_stats.water_usage_kl || 0) / realisation.quotas.water_allocated_kl) * 100, 100) : 0}
                sx={{ height: 8, borderRadius: 4, mb: 0.5, '& .MuiLinearProgress-bar': { bgcolor: ((quick_stats.water_usage_kl || 0) > realisation.quotas.water_allocated_kl * 1.2 ? '#d32f2f' : '#1565C0'), borderRadius: 4 } }}
              />
              <Typography variant="caption" color="text.secondary">Allocated: {realisation.quotas.water_allocated_kl} KL/month · Quota: {realisation.quotas.water_allocated_kl > 0 ? Math.round(((quick_stats.water_usage_kl || 0) / realisation.quotas.water_allocated_kl) * 100) : 0}% used</Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Bolt color="warning" fontSize="small" /> Power</Typography>
                <Typography variant="body2" fontWeight={600}>{quick_stats.power_usage_kwh || 0} kWh</Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={realisation.quotas.sanctioned_load_kw > 0 ? Math.min(((quick_stats.power_usage_kwh || 0) / (realisation.quotas.sanctioned_load_kw * 730)) * 100, 100) : 0}
                sx={{ height: 8, borderRadius: 4, mb: 0.5, '& .MuiLinearProgress-bar': { bgcolor: ((quick_stats.power_usage_kwh || 0) > realisation.quotas.sanctioned_load_kw * 1.2 * 730 ? '#d32f2f' : '#F57C00'), borderRadius: 4 } }}
              />
              <Typography variant="caption" color="text.secondary">Sanctioned: {realisation.quotas.sanctioned_load_kw} kW · Tariff: ₹{realisation.quotas.tariff_per_unit}/unit</Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: { xs: 2, md: 3 } }}>
        {/* Actionable Task List */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ ...ds.paper, height: '100%' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>Actionable Tasks</Typography>
            <List dense>
              {pending_tasks.map((task) => (
                <ListItem key={task.id} sx={{ borderRadius: 1, mb: 0.5, bgcolor: task.done ? 'action.hover' : 'transparent' }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {task.done ? <CheckCircle color="success" /> : <RadioButtonUnchecked color={task.priority === 'high' ? 'error' : task.priority === 'medium' ? 'warning' : 'action'} />}
                  </ListItemIcon>
                  <ListItemText
                    primary={task.title}
                    secondary={`Due: ${task.due_date}`}
                    primaryTypographyProps={{ sx: { textDecoration: task.done ? 'line-through' : 'none', color: task.done ? 'text.secondary' : 'text.primary' } }}
                  />
                  {task.priority !== 'none' && (
                    <Chip label={task.priority} size="small"
                      color={task.priority === 'high' ? 'error' : task.priority === 'medium' ? 'warning' : 'default'} variant="outlined" />
                  )}
                </ListItem>
              ))}
            </List>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>Compliance Notices</Typography>
            {notices.map((notice) => (
              <Box key={notice.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, p: 1, borderRadius: 1, bgcolor: notice.severity === 'warning' ? 'warning.50' : 'info.50' }}>
                {notice.severity === 'warning' ? <Warning color="warning" fontSize="small" /> : <Info color="info" fontSize="small" />}
                <Typography variant="body2">{notice.message}</Typography>
              </Box>
            ))}
          </Paper>
        </Grid>

        {/* Quick Stats + Lease */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper sx={{ ...ds.paper, mb: 2 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>Quick Stats</Typography>
            <Grid container spacing={2}>
              {[
                { icon: <People />, label: 'Employees', value: quick_stats.employees ? quick_stats.employees.toLocaleString('en-IN') : '0', color: '#1F4E79' },
                { icon: <CurrencyRupee />, label: 'Investment', value: `Rs. ${quick_stats.investment_cr ? quick_stats.investment_cr.toLocaleString('en-IN') : '0'} Cr`, color: '#2E7D32' },
                { icon: <Bolt />, label: 'Power Usage', value: `${quick_stats.power_usage_kwh ? quick_stats.power_usage_kwh.toLocaleString('en-IN') : '0'} kWh`, color: '#F57C00' },
                { icon: <WaterDrop />, label: 'Water Usage', value: `${quick_stats.water_usage_kl ? quick_stats.water_usage_kl.toLocaleString('en-IN') : '0'} KL`, color: '#1565C0' },
              ].map((stat, i) => (
                <Grid key={i} size={{ xs: 6 }}>
                  <Card variant="outlined" sx={{ textAlign: 'center', p: 1.5 }}>
                    <Box sx={{ color: stat.color, mb: 0.5 }}>{stat.icon}</Box>
                    <Typography fontWeight={700} sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem', md: '0.95rem', lg: '1.1rem' }, lineHeight: 1.2, my: 0.5 }}>{stat.value}</Typography>
                    <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
          <Paper sx={{ ...ds.paper }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>Lease Status</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">Status</Typography>
              <Chip label={lease.status} color="success" size="small" />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">Valid Until</Typography>
              <Typography variant="body2" fontWeight={600}>{lease.end_date}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Monthly Rent</Typography>
              <Typography variant="body2" fontWeight={600}>Rs. {lease.monthly_amount ? (lease.monthly_amount / 100000).toFixed(1) : '0.0'}L</Typography>
            </Box>
            <Button variant="outlined" size="small" fullWidth sx={{ mt: 2 }} startIcon={<Description />} onClick={() => setLeaseDialogOpen(true)}>View Lease Agreement</Button>
          </Paper>

          {/* T2.1 — Billing & Dues */}
          <Paper sx={{ ...ds.paper, mt: 2 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>Billing &amp; Dues</Typography>
            {billing ? (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">Outstanding</Typography>
                  <Typography variant="h6" fontWeight={700} color={billing.total_outstanding > 0 ? 'error.main' : 'success.main'}>
                    ₹{Number(billing.total_outstanding).toLocaleString('en-IN')}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">Overdue statements: {billing.overdue_count}</Typography>
                  <Typography variant="caption" color={billing.arrears_gt_90d > 0 ? 'error.main' : 'text.secondary'}>Arrears &gt;90d: ₹{Number(billing.arrears_gt_90d).toLocaleString('en-IN')}</Typography>
                </Box>
                {billingStatements.length > 0 ? (
                  <Box sx={{ mt: 1 }}>
                    {billingStatements.slice(0, 3).map((s) => (
                      <Box key={s.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5, borderBottom: 1, borderColor: 'divider' }}>
                        <Box>
                          <Typography variant="caption" fontWeight={600}>{s.invoice_no}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{s.billing_period} · ₹{Number(s.total_amount).toLocaleString('en-IN')}</Typography>
                        </Box>
                        <Chip label={s.status} size="small" color={s.status === 'paid' ? 'success' : s.status === 'overdue' ? 'error' : 'warning'} variant="outlined" sx={{ fontSize: '0.65rem' }} />
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="caption" color="text.secondary">No billing statements generated yet.</Typography>
                )}
              </Box>
            ) : (
              <Typography variant="caption" color="text.secondary">Billing module loading…</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* T3.2 — CSR Funding Opportunities (from Mission Inaippagam) */}
      {csrNeeds.length > 0 && (
        <Paper sx={{ ...ds.paper, mt: 2 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>CSR Funding Opportunities</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            Verified community development needs aligned with Mission Inaippagam — fund these to meet your 2% PAT mandate.
          </Typography>
          <Grid container spacing={2}>
            {csrNeeds.slice(0, 4).map((n) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={n.id}>
                <Card variant="outlined" sx={{ p: 1.5, height: '100%' }}>
                  <Typography variant="subtitle2" fontWeight={600} noWrap>{n.title}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    {n.department || 'Govt Dept'} · {n.district || 'TN'}
                  </Typography>
                  {n.budget_required && <Typography variant="caption" sx={{ display: 'block' }}>Budget: ₹{Number(n.budget_required).toLocaleString('en-IN')}</Typography>}
                  {n.sdg_goals && n.sdg_goals.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                      {n.sdg_goals.slice(0, 4).map(g => <Chip key={g} label={`SDG ${g}`} size="small" sx={{ fontSize: '0.6rem', height: 18 }} />)}
                    </Box>
                  )}
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}



      {/* Service Request Status */}
      <Paper sx={{ ...ds.paper }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>Service Requests</Typography>
        <Grid container spacing={2}>
          {[
            { label: 'Applied', count: service_summary.applied, color: '#1565C0' },
            { label: 'In Review', count: service_summary.in_review, color: '#F57C00' },
            { label: 'Approved', count: service_summary.approved, color: '#2E7D32' },
            { label: 'Completed', count: service_summary.completed, color: '#43A047' },
          ].map((item, i) => (
            <Grid key={i} size={{ xs: 6, sm: 3 }}>
              <Card variant="outlined" sx={{ textAlign: 'center', p: 2, borderTop: `3px solid ${item.color}` }}>
                <Typography variant="h4" fontWeight={700} color={item.color}>{item.count}</Typography>
                <Typography variant="body2" color="text.secondary">{item.label}</Typography>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Lease Agreement Dialog */}
      <Dialog open={leaseDialogOpen} onClose={() => setLeaseDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Lease Agreement Details</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 1 }}>
            {[
              { label: 'Plot Number', value: lease.plot_number },
              { label: 'Park', value: lease.park_name },
              { label: 'Area', value: `${lease.area_acres} Acres` },
              { label: 'Zone Type', value: lease.zone_type || 'Industrial' },
              { label: 'Lease Start', value: formatDate(lease.lease_start) },
              { label: 'Lease End', value: formatDate(lease.end_date) },
              { label: 'Monthly Rent', value: formatCurrency(lease.monthly_amount) },
              { label: 'Total Paid to Date', value: formatCurrency(lease.total_paid) },
              { label: 'Next Payment Due', value: formatDate(lease.next_payment_due) },
              { label: 'Payment Status', value: lease.payment_status || 'Current' },
            ].map((item, i) => (
              <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" color="text.secondary">{item.label}</Typography>
                <Typography variant="body2" fontWeight={600}>{item.value}</Typography>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLeaseDialogOpen(false)}>Close</Button>
          <Button variant="contained" onClick={() => { alert('Lease agreement PDF downloaded!'); setLeaseDialogOpen(false); }}>Download PDF</Button>
        </DialogActions>
      </Dialog>

      {/* Upload Snackbar */}
      <Snackbar open={uploadSnack} autoHideDuration={3000} onClose={() => setUploadSnack(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setUploadSnack(false)} severity="success" variant="filled">Document uploaded successfully! It will be verified within 24 hours.</Alert>
      </Snackbar>
    </Box>
  );
}
