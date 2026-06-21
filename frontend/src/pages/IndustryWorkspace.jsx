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
import { workspaceService } from '../services/api';

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

  const { company, compliance_score, quick_stats, lease, pending_tasks, notices, service_summary } = overview;

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      {/* Company Header */}
      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: { xs: 2, md: 3 }, background: 'linear-gradient(135deg, #1F4E79 0%, #2E7D32 100%)', color: 'white' }}>
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
      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: { xs: 2, md: 3 } }}>
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

      <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: { xs: 2, md: 3 } }}>
        {/* Actionable Task List */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: { xs: 2, sm: 3 }, height: '100%' }}>
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
          <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 2 }}>
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
          <Paper sx={{ p: { xs: 2, sm: 3 } }}>
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
              <Typography variant="body2" fontWeight={600}>Rs. {(lease.monthly_amount / 100000).toFixed(1)}L</Typography>
            </Box>
            <Button variant="outlined" size="small" fullWidth sx={{ mt: 2 }} startIcon={<Description />} onClick={() => setLeaseDialogOpen(true)}>View Lease Agreement</Button>
          </Paper>
        </Grid>
      </Grid>



      {/* Service Request Status */}
      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
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
