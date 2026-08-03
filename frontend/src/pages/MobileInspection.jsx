import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, TextField, Button, Grid, IconButton, MenuItem,
  Snackbar, Alert, CircularProgress, Chip, Divider, Tabs, Tab, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Dialog,
  DialogTitle, DialogContent, DialogActions, InputLabel, FormControl, Select
} from '@mui/material';
import { PhotoCamera, LocationOn, UploadFile, Send, ForwardToInbox, Gavel, CheckCircle } from '@mui/icons-material';
import { industryService, lifecycleService, inspectionService } from '../services/api';

const INSPECTION_TYPES = ['environmental', 'safety', 'fire', 'financial', 'routine'];
const OUTCOMES = [
  { value: 'compliant', label: 'Compliant', color: 'success' },
  { value: 'minor_issues', label: 'Minor Issues', color: 'info' },
  { value: 'violation', label: 'Violation', color: 'warning' },
  { value: 'critical', label: 'Critical', color: 'error' },
];

export default function MobileInspection() {
  const [tab, setTab] = useState(0);
  const [industries, setIndustries] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [incentives, setIncentives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [form, setForm] = useState({
    industryId: '', inspectionType: 'environmental', outcome: 'compliant',
    findings: '', latitude: '', longitude: ''
  });
  // HO forwarding dialog
  const [hoDialog, setHoDialog] = useState(null); // { inspection, statusReport }
  // Incentive dialog
  const [incentiveDialog, setIncentiveDialog] = useState(null); // { industryId, scheme, amount }

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [indRes, inspRes, incRes] = await Promise.all([
          industryService.getAll(),
          inspectionService.getAll().then(r => r.data).catch(() => []),
          lifecycleService.getIncentives().then(r => r.data).catch(() => []),
        ]);
        if (!active) return;
        setIndustries(Array.isArray(indRes.data) ? indRes.data : []);
        setInspections(Array.isArray(inspRes) ? inspRes : []);
        setIncentives(Array.isArray(incRes) ? incRes : []);
      } catch { setSnackbar({ open: true, message: 'Failed to load data.', severity: 'error' }); }
      finally { if (active) setLoading(false); }
    };
    load();
    return () => { active = false; };
  }, []);

  const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const captureLocation = () => {
    if (!navigator.geolocation) return setSnackbar({ open: true, message: 'Geolocation not available.', severity: 'warning' });
    navigator.geolocation.getCurrentPosition(
      (pos) => setForm({ ...form, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) }),
      () => setSnackbar({ open: true, message: 'Location access denied.', severity: 'warning' })
    );
  };

  const handleSubmit = async () => {
    if (!form.industryId) return setSnackbar({ open: true, message: 'Select an industry first.', severity: 'warning' });
    setSubmitting(true);
    try {
      await inspectionService.create({
        industryId: parseInt(form.industryId),
        inspectionType: form.inspectionType,
        outcome: form.outcome,
        findings: form.findings,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
      });
      setSnackbar({ open: true, message: `Inspection submitted. Outcome: ${form.outcome}.`, severity: 'success' });
      setForm({ industryId: '', inspectionType: 'environmental', outcome: 'compliant', findings: '', latitude: '', longitude: '' });
      // Refresh list
      const inspRes = await inspectionService.getAll();
      setInspections(Array.isArray(inspRes.data) ? inspRes.data : []);
    } catch {
      setSnackbar({ open: true, message: 'Failed to submit inspection.', severity: 'error' });
    } finally { setSubmitting(false); }
  };

  // T2.3 — Forward inspection to HO
  const handleForwardHo = async () => {
    if (!hoDialog?.statusReport) return;
    try {
      await lifecycleService.forwardHo(hoDialog.inspection.id, { statusReport: hoDialog.statusReport });
      setSnackbar({ open: true, message: 'Inspection forwarded to Head Office.', severity: 'success' });
      setHoDialog(null);
      const inspRes = await inspectionService.getAll();
      setInspections(Array.isArray(inspRes.data) ? inspRes.data : []);
    } catch { setSnackbar({ open: true, message: 'Failed to forward.', severity: 'error' }); }
  };

  // T2.4 — Create incentive disbursement
  const handleCreateIncentive = async () => {
    if (!incentiveDialog?.incentiveScheme || !incentiveDialog?.amountSanctioned) return;
    try {
      await lifecycleService.createIncentive({
        industryId: parseInt(incentiveDialog.industryId),
        incentiveScheme: incentiveDialog.incentiveScheme,
        amountSanctioned: parseFloat(incentiveDialog.amountSanctioned),
        inspectionId: incentiveDialog.inspectionId || null,
      });
      setSnackbar({ open: true, message: 'Incentive sanctioned + industry notified.', severity: 'success' });
      setIncentiveDialog(null);
      const r = await lifecycleService.getIncentives(); setIncentives(r.data || []);
    } catch { setSnackbar({ open: true, message: 'Failed to create incentive.', severity: 'error' }); }
  };

  if (loading) return <Box display="flex" justifyContent="center" p={6}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', color: 'primary.main', fontSize: { xs: '1.4rem', sm: '1.75rem', md: '2.125rem' } }}>
        <LocationOn sx={{ mr: 1, color: 'error.main' }} /> Mobile Inspection
      </Typography>

      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="New Inspection" />
        <Tab label="History" />
        <Tab label="HO Forwarding" />
        <Tab label="Incentives" />
      </Tabs>

      {/* TAB 0 — New Inspection Form */}
      {tab === 0 && (
        <Paper sx={{ p: 3, maxWidth: 600, borderTop: '4px solid #1976d2' }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Industry / Unit</InputLabel>
                <Select value={form.industryId} label="Industry / Unit" onChange={handleChange('industryId')}>
                  {industries.map((ind) => <MenuItem key={ind.id} value={ind.id}>{ind.company_name || ind.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Inspection Type</InputLabel>
                <Select value={form.inspectionType} label="Inspection Type" onChange={handleChange('inspectionType')}>
                  {INSPECTION_TYPES.map(t => <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Outcome</InputLabel>
                <Select value={form.outcome} label="Outcome" onChange={handleChange('outcome')}>
                  {OUTCOMES.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Findings / Notes" multiline rows={4} size="small" value={form.findings} onChange={handleChange('findings')} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Button size="small" variant="outlined" startIcon={<LocationOn />} onClick={captureLocation}>Capture Geo-Location</Button>
                {form.latitude && <Typography variant="caption" color="text.secondary">{form.latitude}, {form.longitude}</Typography>}
              </Box>
            </Grid>
          </Grid>

          <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>Evidence Upload (geo-tagged photos)</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
              <IconButton color="primary" component="label" sx={{ border: '1px solid', p: 2 }}><input hidden accept="image/*" type="file" /><PhotoCamera fontSize="large" /></IconButton>
              <IconButton color="secondary" component="label" sx={{ border: '1px solid', p: 2 }}><input hidden accept="application/pdf" type="file" /><UploadFile fontSize="large" /></IconButton>
            </Box>
          </Box>

          <Button variant="contained" fullWidth size="large" sx={{ mt: 3 }} disabled={submitting} startIcon={submitting ? <CircularProgress size={18} /> : <Send />} onClick={handleSubmit}>
            {submitting ? 'Submitting…' : 'Submit Inspection'}
          </Button>
          {form.outcome === 'violation' || form.outcome === 'critical'
            ? <Alert severity="warning" sx={{ mt: 2 }}>A compliance violation will be auto-raised for this industry on submission.</Alert>
            : null}
        </Paper>
      )}

      {/* TAB 1 — Inspection History */}
      {tab === 1 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead><TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell>Company</TableCell><TableCell>Type</TableCell><TableCell>Outcome</TableCell>
              <TableCell>Findings</TableCell><TableCell>Date</TableCell><TableCell>Linked Violation</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {inspections.length === 0 ? <TableRow><TableCell colSpan={6} align="center"><Typography color="text.secondary">No inspections yet.</Typography></TableCell></TableRow> : null}
              {inspections.map((i) => (
                <TableRow key={i.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{i.company_name}</TableCell>
                  <TableCell>{i.inspection_type}</TableCell>
                  <TableCell><Chip label={i.outcome || '—'} size="small" color={(OUTCOMES.find(o => o.value === i.outcome) || {}).color || 'default'} /></TableCell>
                  <TableCell sx={{ maxWidth: 200 }}>{i.findings || '—'}</TableCell>
                  <TableCell>{i.conducted_at ? new Date(i.conducted_at).toLocaleDateString('en-IN') : '—'}</TableCell>
                  <TableCell>{i.linked_violation_id ? <Chip label={`#${i.linked_violation_id}`} size="small" color="error" /> : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* TAB 2 — HO Forwarding */}
      {tab === 2 && (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Forward completed inspections (with PO Status Report) to the Head Office for approval. HO decision authorises downstream incentive disbursement.
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead><TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell>Company</TableCell><TableCell>Type</TableCell><TableCell>Outcome</TableCell>
                <TableCell>HO Status</TableCell><TableCell align="center">Action</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {inspections.filter(i => i.outcome && i.outcome !== 'critical').slice(0, 15).map((i) => (
                  <TableRow key={i.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{i.company_name}</TableCell>
                    <TableCell>{i.inspection_type}</TableCell>
                    <TableCell><Chip label={i.outcome} size="small" color={(OUTCOMES.find(o => o.value === i.outcome) || {}).color || 'default'} /></TableCell>
                    <TableCell>
                      {i.forwarded_to_ho ? <Chip label={i.ho_decision || 'pending HO'} size="small" color={i.ho_decision === 'approved' ? 'success' : i.ho_decision === 'rejected' ? 'error' : 'warning'} />
                        : <Chip label="not forwarded" size="small" variant="outlined" />}
                    </TableCell>
                    <TableCell align="center">
                      {!i.forwarded_to_ho && (
                        <Button size="small" variant="outlined" startIcon={<ForwardToInbox />} onClick={() => setHoDialog({ inspection: i, statusReport: '' })}>Forward to HO</Button>
                      )}
                      {i.forwarded_to_ho && i.ho_decision === 'approved' && (
                        <Button size="small" variant="contained" color="success" startIcon={<Gavel />} onClick={() => setIncentiveDialog({ industryId: i.industry_id, inspectionId: i.id, incentiveScheme: '', amountSanctioned: '' })}>Create Incentive</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* TAB 3 — Incentive Disbursements */}
      {tab === 3 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead><TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell>Company</TableCell><TableCell>Scheme</TableCell><TableCell align="right">Sanctioned</TableCell>
              <TableCell align="right">Disbursed</TableCell><TableCell>Status</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {incentives.length === 0 ? <TableRow><TableCell colSpan={5} align="center"><Typography color="text.secondary">No incentive disbursements yet.</Typography></TableCell></TableRow> : null}
              {incentives.map((inc) => (
                <TableRow key={inc.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{inc.company_name}</TableCell>
                  <TableCell>{inc.incentive_scheme}</TableCell>
                  <TableCell align="right">₹{Number(inc.amount_sanctioned).toLocaleString('en-IN')}</TableCell>
                  <TableCell align="right">₹{Number(inc.amount_disbursed || 0).toLocaleString('en-IN')}</TableCell>
                  <TableCell><Chip label={inc.status} size="small" color={inc.status === 'disbursed' ? 'success' : inc.status === 'sanctioned' ? 'info' : 'default'} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* HO Forward Dialog */}
      <Dialog open={!!hoDialog} onClose={() => setHoDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Forward to Head Office</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth multiline rows={4} label="PO Status Report (narrative for HO)" sx={{ mt: 1 }}
            value={hoDialog?.statusReport || ''} onChange={(e) => setHoDialog({ ...hoDialog, statusReport: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHoDialog(null)}>Cancel</Button>
          <Button variant="contained" startIcon={<ForwardToInbox />} onClick={handleForwardHo}>Forward</Button>
        </DialogActions>
      </Dialog>

      {/* Incentive Dialog */}
      <Dialog open={!!incentiveDialog} onClose={() => setIncentiveDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Sanction Incentive</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Incentive Scheme" placeholder="e.g. Capital Subsidy" sx={{ mt: 1, mb: 2 }}
            value={incentiveDialog?.incentiveScheme || ''} onChange={(e) => setIncentiveDialog({ ...incentiveDialog, incentiveScheme: e.target.value })} />
          <TextField fullWidth label="Amount Sanctioned (₹)" type="number"
            value={incentiveDialog?.amountSanctioned || ''} onChange={(e) => setIncentiveDialog({ ...incentiveDialog, amountSanctioned: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIncentiveDialog(null)}>Cancel</Button>
          <Button variant="contained" color="success" startIcon={<CheckCircle />} onClick={handleCreateIncentive}>Sanction & Notify</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
