import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, Chip, Button,
  ToggleButton, ToggleButtonGroup, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Select,
  FormControl, InputLabel, Stepper, Step, StepLabel, IconButton,
  Tooltip as MuiTooltip, Snackbar, Alert, Divider
} from '@mui/material';
import {
  Add, ViewKanban, Timeline, TableChart, Visibility,
  Schedule, Person, Flag, CheckCircle, HourglassEmpty,
  Assignment, Warning, Download
} from '@mui/icons-material';

const STATUS_FLOW = ['applied', 'document_review', 'field_inspection', 'pending_approval', 'approved', 'completed'];
const STATUS_LABELS = {
  applied: 'Applied', document_review: 'Doc Review', field_inspection: 'Inspection',
  pending_approval: 'Pending Approval', approved: 'Approved', rejected: 'Rejected', completed: 'Completed'
};
const STATUS_COLORS = {
  applied: '#1565C0', document_review: '#7B1FA2', field_inspection: '#F57C00',
  pending_approval: '#FBC02D', approved: '#2E7D32', rejected: '#D32F2F', completed: '#43A047'
};
const SERVICE_LABELS = {
  noc_fire: 'NOC Fire Safety', land_allotment: 'Land Allotment', water_connection: 'Water Connection',
  power_connection: 'Power Connection', lease_renewal: 'Lease Renewal', noc_pollution: 'NOC Pollution',
  building_approval: 'Building Approval', transfer_request: 'Transfer Request', expansion_request: 'Expansion Request'
};

const INITIAL_REQUESTS = [
  { id: 1, reference_number: 'SR-2026-0045', service_type: 'noc_fire', company_name: 'ABC Industries', current_status: 'field_inspection', priority: 'normal', applied_date: '2026-03-15', expected_completion: '2026-04-30', assigned_officer: 'Mr. Kumar', remarks: 'New unit expansion requires updated fire safety NOC' },
  { id: 2, reference_number: 'SR-2026-0044', service_type: 'land_allotment', company_name: 'ABC Industries', current_status: 'document_review', priority: 'high', applied_date: '2026-03-10', expected_completion: '2026-05-15', assigned_officer: 'Ms. Priya', remarks: 'Additional 2-acre plot for Phase II' },
  { id: 3, reference_number: 'SR-2026-0043', service_type: 'water_connection', company_name: 'XYZ Manufacturing', current_status: 'completed', priority: 'normal', applied_date: '2026-02-20', expected_completion: '2026-03-20', assigned_officer: 'Mr. Rajan', remarks: 'Industrial water connection for new block' },
  { id: 4, reference_number: 'SR-2026-0042', service_type: 'power_connection', company_name: 'LMN Textiles', current_status: 'pending_approval', priority: 'urgent', applied_date: '2026-02-01', expected_completion: '2026-03-15', assigned_officer: 'Mr. Kumar', remarks: 'Urgent: Production halted without power upgrade' },
  { id: 5, reference_number: 'SR-2026-0041', service_type: 'lease_renewal', company_name: 'PQR Auto Parts', current_status: 'approved', priority: 'normal', applied_date: '2026-01-15', expected_completion: '2026-02-28', assigned_officer: 'Ms. Priya', remarks: 'Routine 5-year lease renewal' },
];

// Load from localStorage or fall back to defaults
function loadState(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch { return fallback; }
}

export default function ServicesTracker() {
  const [view, setView] = useState('kanban');
  const [requests, setRequests] = useState(() => loadState('sipcot_service_requests', INITIAL_REQUESTS));
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const role = localStorage.getItem('role') || 'industry';

  // Persist requests to localStorage on every change
  useEffect(() => {
    localStorage.setItem('sipcot_service_requests', JSON.stringify(requests));
  }, [requests]);

  // New request form state
  const [newServiceType, setNewServiceType] = useState('');
  const [newPriority, setNewPriority] = useState('normal');
  const [newRemarks, setNewRemarks] = useState('');

  // Status update form state
  const [updateStatus, setUpdateStatus] = useState('');
  const [updateRemarks, setUpdateRemarks] = useState('');

  const getMilestones = (req) => {
    const statusIdx = STATUS_FLOW.indexOf(req.current_status);
    return STATUS_FLOW.map((s, i) => ({
      stage: STATUS_LABELS[s],
      status: i < statusIdx ? 'completed' : i === statusIdx ? 'in_progress' : 'pending',
    }));
  };

  const statusCounts = STATUS_FLOW.reduce((acc, s) => {
    acc[s] = requests.filter(r => r.current_status === s).length;
    return acc;
  }, {});

  // CREATE new service request
  const handleCreateRequest = () => {
    if (!newServiceType) {
      setSnackbar({ open: true, message: 'Please select a service type.', severity: 'error' });
      return;
    }
    const refNum = `SR-2026-${String(Math.floor(1000 + Math.random() * 9000))}`;
    const today = new Date().toISOString().split('T')[0];
    const expected = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const newReq = {
      id: Date.now(),
      reference_number: refNum,
      service_type: newServiceType,
      company_name: 'ABC Industries',
      current_status: 'applied',
      priority: newPriority,
      applied_date: today,
      expected_completion: expected,
      assigned_officer: 'Pending Assignment',
      remarks: newRemarks,
    };
    setRequests([newReq, ...requests]);
    setNewDialogOpen(false);
    setNewServiceType('');
    setNewPriority('normal');
    setNewRemarks('');
    setSnackbar({ open: true, message: `Service request ${refNum} submitted successfully!`, severity: 'success' });
  };

  // UPDATE status (admin/govt)
  const handleUpdateStatus = () => {
    if (!updateStatus) {
      setSnackbar({ open: true, message: 'Please select a new status.', severity: 'error' });
      return;
    }
    setRequests(requests.map(r =>
      r.id === selectedRequest.id ? { ...r, current_status: updateStatus, remarks: updateRemarks || r.remarks } : r
    ));
    const label = STATUS_LABELS[updateStatus];
    setStatusDialogOpen(false);
    setSelectedRequest(null);
    setUpdateStatus('');
    setUpdateRemarks('');
    setSnackbar({ open: true, message: `Request updated to "${label}" successfully!`, severity: 'success' });
  };

  // WITHDRAW request (industry)
  const handleWithdraw = () => {
    setRequests(requests.filter(r => r.id !== selectedRequest.id));
    setSelectedRequest(null);
    setSnackbar({ open: true, message: 'Service request withdrawn successfully.', severity: 'warning' });
  };

  // DOWNLOAD all requests as CSV
  const handleDownloadCSV = () => {
    const header = 'Reference,Type,Company,Status,Priority,Applied,Expected,Officer,Remarks';
    const rows = requests.map(r =>
      `${r.reference_number},${SERVICE_LABELS[r.service_type]},${r.company_name},${STATUS_LABELS[r.current_status]},${r.priority},${r.applied_date},${r.expected_completion},${r.assigned_officer},"${r.remarks || ''}"`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'service_requests.csv';
    a.click();
    URL.revokeObjectURL(url);
    setSnackbar({ open: true, message: 'Service requests exported as CSV.', severity: 'success' });
  };

  const KanbanColumn = ({ status }) => {
    const items = requests.filter(r => r.current_status === status);
    return (
      <Paper sx={{ minWidth: 220, p: 1.5, bgcolor: 'grey.50', height: '100%', minHeight: 200 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography variant="subtitle2" fontWeight={600}>{STATUS_LABELS[status]}</Typography>
          <Chip label={items.length} size="small" sx={{ bgcolor: STATUS_COLORS[status], color: 'white' }} />
        </Box>
        {items.map((req) => (
          <Card key={req.id} sx={{ mb: 1, cursor: 'pointer', '&:hover': { boxShadow: 3 }, borderLeft: `3px solid ${STATUS_COLORS[req.current_status]}` }} onClick={() => setSelectedRequest(req)}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="body2" fontWeight={600}>{SERVICE_LABELS[req.service_type]}</Typography>
              <Typography variant="caption" color="text.secondary">{req.reference_number}</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography variant="caption">{req.company_name}</Typography>
                {req.priority === 'urgent' && <Chip label="Urgent" size="small" color="error" sx={{ height: 18, fontSize: '0.65rem' }} />}
                {req.priority === 'high' && <Chip label="High" size="small" color="warning" sx={{ height: 18, fontSize: '0.65rem' }} />}
              </Box>
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && (
          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'center', mt: 4 }}>No requests</Typography>
        )}
      </Paper>
    );
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: { xs: 2, md: 3 }, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.4rem', sm: '1.75rem', md: '2.125rem' } }}>Services Tracker</Typography>
          <Typography variant="body2" color="text.secondary">Track NOCs, allotments, and service requests</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button variant="outlined" size="small" startIcon={<Download />} onClick={handleDownloadCSV}>Export CSV</Button>
          {role === 'industry' && (
            <Button variant="contained" startIcon={<Add />} onClick={() => setNewDialogOpen(true)}>New Request</Button>
          )}
          <ToggleButtonGroup size="small" value={view} exclusive onChange={(e, v) => v && setView(v)}>
            <ToggleButton value="kanban"><MuiTooltip title="Kanban"><ViewKanban /></MuiTooltip></ToggleButton>
            <ToggleButton value="table"><MuiTooltip title="Table"><TableChart /></MuiTooltip></ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Applied', count: statusCounts.applied || 0, color: STATUS_COLORS.applied, icon: <Assignment /> },
          { label: 'In Review', count: (statusCounts.document_review || 0) + (statusCounts.field_inspection || 0), color: STATUS_COLORS.document_review, icon: <HourglassEmpty /> },
          { label: 'Pending Approval', count: statusCounts.pending_approval || 0, color: STATUS_COLORS.pending_approval, icon: <Schedule /> },
          { label: 'Completed', count: (statusCounts.approved || 0) + (statusCounts.completed || 0), color: STATUS_COLORS.completed, icon: <CheckCircle /> },
        ].map((item, i) => (
          <Grid key={i} size={{ xs: 6, sm: 3 }}>
            <Card sx={{ borderTop: `4px solid ${item.color}` }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Box sx={{ color: item.color, mb: 0.5 }}>{item.icon}</Box>
                <Typography variant="h4" fontWeight={700}>{item.count}</Typography>
                <Typography variant="body2" color="text.secondary">{item.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Kanban View */}
      {view === 'kanban' && (
        <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2 }}>
          {STATUS_FLOW.map((status) => (
            <Box key={status} sx={{ flex: '1 0 200px' }}>
              <KanbanColumn status={status} />
            </Box>
          ))}
        </Box>
      )}

      {/* Table View */}
      {view === 'table' && (
        <Paper>
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Reference</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Company</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Priority</TableCell>
                  <TableCell>Applied</TableCell>
                  <TableCell>Expected</TableCell>
                  <TableCell>Officer</TableCell>
                  <TableCell>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id} hover>
                    <TableCell><Typography variant="body2" fontWeight={600}>{req.reference_number}</Typography></TableCell>
                    <TableCell>{SERVICE_LABELS[req.service_type]}</TableCell>
                    <TableCell>{req.company_name}</TableCell>
                    <TableCell><Chip label={STATUS_LABELS[req.current_status]} size="small" sx={{ bgcolor: STATUS_COLORS[req.current_status], color: 'white' }} /></TableCell>
                    <TableCell>
                      <Chip label={req.priority} size="small"
                        color={req.priority === 'urgent' ? 'error' : req.priority === 'high' ? 'warning' : 'default'} variant="outlined" />
                    </TableCell>
                    <TableCell>{req.applied_date}</TableCell>
                    <TableCell>{req.expected_completion}</TableCell>
                    <TableCell>{req.assigned_officer}</TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => setSelectedRequest(req)}><Visibility /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Request Detail Dialog */}
      <Dialog open={!!selectedRequest && !statusDialogOpen} onClose={() => setSelectedRequest(null)} maxWidth="md" fullWidth>
        {selectedRequest && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" fontWeight={600}>{SERVICE_LABELS[selectedRequest.service_type]}</Typography>
                <Chip label={selectedRequest.reference_number} variant="outlined" />
              </Box>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mb: 3, mt: 0 }}>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" color="text.secondary">Company</Typography>
                  <Typography variant="body2" fontWeight={600}>{selectedRequest.company_name}</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" color="text.secondary">Applied</Typography>
                  <Typography variant="body2" fontWeight={600}>{selectedRequest.applied_date}</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" color="text.secondary">Expected</Typography>
                  <Typography variant="body2" fontWeight={600}>{selectedRequest.expected_completion}</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" color="text.secondary">Officer</Typography>
                  <Typography variant="body2" fontWeight={600}>{selectedRequest.assigned_officer}</Typography>
                </Grid>
              </Grid>

              {selectedRequest.remarks && (
                <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary">Remarks</Typography>
                  <Typography variant="body2">{selectedRequest.remarks}</Typography>
                </Box>
              )}

              <Typography variant="subtitle1" fontWeight={600} gutterBottom>Milestone Timeline</Typography>
              <Stepper alternativeLabel sx={{ mb: 2 }}>
                {getMilestones(selectedRequest).map((m, i) => (
                  <Step key={i} completed={m.status === 'completed'} active={m.status === 'in_progress'}>
                    <StepLabel>{m.stage}</StepLabel>
                  </Step>
                ))}
              </Stepper>

              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">Current Status</Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip label={STATUS_LABELS[selectedRequest.current_status]} sx={{ bgcolor: STATUS_COLORS[selectedRequest.current_status], color: 'white', fontWeight: 600 }} />
                </Box>
              </Box>

              {selectedRequest.expected_completion < new Date().toISOString().split('T')[0] && selectedRequest.current_status !== 'completed' && selectedRequest.current_status !== 'approved' && (
                <Box sx={{ p: 2, bgcolor: '#fff3e0', borderRadius: 1, display: 'flex', alignItems: 'center', gap: 1, mt: 2, border: '1px solid #ffcc80' }}>
                  <Warning color="warning" />
                  <Typography variant="body2" color="warning.dark">Bottleneck Alert: This request has exceeded the expected completion date.</Typography>
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setSelectedRequest(null)}>Close</Button>
              {role === 'industry' && selectedRequest.current_status !== 'completed' && selectedRequest.current_status !== 'approved' && (
                <Button variant="outlined" color="error" onClick={handleWithdraw}>Withdraw Request</Button>
              )}
              {(role === 'admin' || role === 'govt') && selectedRequest.current_status !== 'completed' && (
                <Button variant="contained" onClick={() => { setUpdateStatus(''); setUpdateRemarks(''); setStatusDialogOpen(true); }}>Update Status</Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Status Update Dialog (Admin/Govt) */}
      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Service Request Status</DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Box sx={{ mt: 1 }}>
              <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body2"><strong>Ref:</strong> {selectedRequest.reference_number}</Typography>
                <Typography variant="body2"><strong>Type:</strong> {SERVICE_LABELS[selectedRequest.service_type]}</Typography>
                <Typography variant="body2"><strong>Current Status:</strong> {STATUS_LABELS[selectedRequest.current_status]}</Typography>
              </Box>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>New Status</InputLabel>
                <Select value={updateStatus} label="New Status" onChange={(e) => setUpdateStatus(e.target.value)}>
                  {STATUS_FLOW.map((s) => (
                    <MenuItem key={s} value={s}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: STATUS_COLORS[s] }} />
                        {STATUS_LABELS[s]}
                      </Box>
                    </MenuItem>
                  ))}
                  <MenuItem value="rejected">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: STATUS_COLORS.rejected }} />
                      Rejected
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
              <TextField fullWidth multiline rows={3} label="Officer Remarks (optional)" value={updateRemarks} onChange={(e) => setUpdateRemarks(e.target.value)} />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleUpdateStatus}>Save & Update</Button>
        </DialogActions>
      </Dialog>

      {/* New Request Dialog (Industry) */}
      <Dialog open={newDialogOpen} onClose={() => setNewDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Service Request</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1, mb: 2 }}>
            <InputLabel>Service Type *</InputLabel>
            <Select value={newServiceType} label="Service Type *" onChange={(e) => setNewServiceType(e.target.value)}>
              {Object.entries(SERVICE_LABELS).map(([key, label]) => (
                <MenuItem key={key} value={key}>{label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Priority</InputLabel>
            <Select value={newPriority} label="Priority" onChange={(e) => setNewPriority(e.target.value)}>
              <MenuItem value="normal">Normal</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="urgent">Urgent</MenuItem>
            </Select>
          </FormControl>
          <TextField fullWidth multiline rows={3} label="Remarks / Description" value={newRemarks} onChange={(e) => setNewRemarks(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setNewDialogOpen(false); setNewServiceType(''); setNewPriority('normal'); setNewRemarks(''); }}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateRequest}>Submit Request</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
