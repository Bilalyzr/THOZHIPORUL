import { useState } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, Chip, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  List, ListItem, ListItemIcon, ListItemText, Button, Divider, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert
} from '@mui/material';
import {
  CheckCircle, RadioButtonUnchecked, Warning, Info, Business,
  People, CurrencyRupee, Bolt, WaterDrop, Description,
  UploadFile, Gavel, Assignment, Schedule
} from '@mui/icons-material';

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

export default function IndustryWorkspace() {
  const [leaseDialogOpen, setLeaseDialogOpen] = useState(false);
  const [uploadSnack, setUploadSnack] = useState(false);
  
  const overview = {
    company: { name: 'ABC Industries', park: 'Oragadam Industrial Park', plot: 'A-101', since: 2019, industry_type: 'Auto Components' },
    compliance_score: { overall: 78, submission: 90, environmental: 72, financial: 85, safety: 65 },
    quick_stats: { employees: 234, investment_cr: 45, power_usage_kwh: 125, water_usage_kl: 89 },
    lease: { status: 'Active', end_date: '2035-03-31', monthly_amount: 240000 },
    pending_tasks: [
      { id: 1, title: 'Q1 2026 Data Submission', due_date: '2026-04-15', type: 'submission', priority: 'high', done: false },
      { id: 2, title: 'Fire NOC Renewal', due_date: '2026-05-01', type: 'document', priority: 'medium', done: false },
      { id: 3, title: 'Pollution Certificate Expiring', due_date: '2026-08-15', type: 'document', priority: 'low', done: false },
      { id: 4, title: 'Q4 2025 Data - Approved', due_date: '2026-01-15', type: 'submission', priority: 'none', done: true },
      { id: 5, title: 'Lease Renewed', due_date: '2025-12-01', type: 'lease', priority: 'none', done: true },
    ],
    notices: [
      { id: 1, severity: 'warning', message: 'Water usage increased 40% from last quarter', date: '2026-04-10' },
      { id: 2, severity: 'info', message: 'New quarterly reporting format effective Q2 2026', date: '2026-04-05' },
    ],
    documents: [
      { id: 1, category: 'GST Certificate', file_name: 'gst_2026.pdf', expiry_date: '2026-12-31', verified: true, status: 'Valid' },
      { id: 2, category: 'Fire NOC', file_name: 'fire_noc_2025.pdf', expiry_date: '2026-05-01', verified: true, status: 'Expiring' },
      { id: 3, category: 'Pollution Clearance', file_name: 'pcb_cert_2025.pdf', expiry_date: '2026-08-15', verified: true, status: 'Valid' },
      { id: 4, category: 'Lease Agreement', file_name: 'lease.pdf', expiry_date: null, verified: true, status: 'Active' },
    ],
    service_summary: { applied: 1, in_review: 1, approved: 0, completed: 5 },
  };

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
                { icon: <People />, label: 'Employees', value: quick_stats.employees, color: '#1F4E79' },
                { icon: <CurrencyRupee />, label: 'Investment', value: `Rs.${quick_stats.investment_cr} Cr`, color: '#2E7D32' },
                { icon: <Bolt />, label: 'Power Usage', value: `${quick_stats.power_usage_kwh} kWh`, color: '#F57C00' },
                { icon: <WaterDrop />, label: 'Water Usage', value: `${quick_stats.water_usage_kl} KL`, color: '#1565C0' },
              ].map((stat, i) => (
                <Grid key={i} size={{ xs: 6 }}>
                  <Card variant="outlined" sx={{ textAlign: 'center', p: 1.5 }}>
                    <Box sx={{ color: stat.color, mb: 0.5 }}>{stat.icon}</Box>
                    <Typography variant="h6" fontWeight={700}>{stat.value}</Typography>
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
              { label: 'Plot Number', value: 'A-101' },
              { label: 'Park', value: 'Oragadam Industrial Park' },
              { label: 'Area', value: '5.0 Acres' },
              { label: 'Zone Type', value: 'Industrial' },
              { label: 'Lease Start', value: '01 April 2019' },
              { label: 'Lease End', value: '31 March 2035' },
              { label: 'Monthly Rent', value: 'Rs. 2,40,000' },
              { label: 'Total Paid to Date', value: 'Rs. 1,72,80,000' },
              { label: 'Next Payment Due', value: '01 May 2026' },
              { label: 'Payment Status', value: 'Current - No Dues' },
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
