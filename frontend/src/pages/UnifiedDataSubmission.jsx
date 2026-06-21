import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Button, TextField, Stepper, Step,
  StepLabel, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Chip, Radio, RadioGroup, FormControlLabel, FormControl,
  FormLabel, Select, MenuItem, InputLabel, Alert, Divider, Card, CardContent,
  Snackbar, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import {
  CloudUpload, Download, CheckCircle, Edit, Visibility,
  NavigateBefore, NavigateNext, Send, Save
} from '@mui/icons-material';
import { submissionService } from '../services/api';

const steps = ['Period', 'Financial', 'Employment', 'Resources', 'CSR', 'Review & Submit'];

const EMPTY_FORM = {
  periodYear: 2026, periodQuarter: 1,
  investmentAmount: '', annualTurnover: '', exportRevenue: '', rdExpenditure: '',
  permanentEmployees: '', contractEmployees: '', scStEmployees: '', womenEmployees: '',
  waterConsumption: '', powerUsage: '', wasteGenerated: '', wasteRecycledPct: '',
  csrActivities: '', csrSpent: '', csrBeneficiaries: '',
};

export default function UnifiedDataSubmission() {
  const [mode, setMode] = useState('form');
  const [activeStep, setActiveStep] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [uploadedFile, setUploadedFile] = useState(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [history, setHistory] = useState([]);
  const [viewDialog, setViewDialog] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const refreshHistory = async () => {
    try {
      const res = await submissionService.getMySubmissions();
      setHistory(res.data);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  };

  useEffect(() => {
    let active = true;
    submissionService.getMySubmissions()
      .then(res => {
        if (active) setHistory(res.data);
      })
      .catch(err => {
        console.error('Failed to fetch history:', err);
        if (active) {
          setSnackbar({ open: true, message: 'Failed to load submission history.', severity: 'error' });
        }
      });
    return () => { active = false; };
  }, []);

  const handleChange = (field) => (e) => setFormData({ ...formData, [field]: e.target.value });

  // SUBMIT data
  const handleSubmit = async () => {
    try {
      await submissionService.submit(formData);
      const periodLabel = `Q${formData.periodQuarter} ${formData.periodYear}`;
      setSnackbar({ open: true, message: `Data for ${periodLabel} submitted successfully!`, severity: 'success' });
      setFormData({ ...EMPTY_FORM });
      setActiveStep(0);
      setEditingId(null);
      refreshHistory(); // Refresh table
    } catch (err) {
      console.error('Submission failed:', err);
      setSnackbar({ open: true, message: 'Failed to submit data. Please try again.', severity: 'error' });
    }
  };

  // SAVE DRAFT
  const handleSaveDraft = () => {
    const periodLabel = `Q${formData.periodQuarter} ${formData.periodYear}`;

    if (editingId) {
      setHistory(history.map(h => h.id === editingId ? {
        ...h, period: periodLabel, data: { ...formData }
      } : h));
      setSnackbar({ open: true, message: `Draft "${periodLabel}" saved. You can continue later.`, severity: 'info' });
    } else {
      const draft = {
        id: Date.now(),
        period: periodLabel,
        periodYear: formData.periodYear,
        periodQuarter: formData.periodQuarter,
        status: 'Draft',
        submitted: '-',
        approved_by: '-',
        data: { ...formData },
      };
      setHistory([draft, ...history]);
      setEditingId(draft.id);
      setSnackbar({ open: true, message: `Draft saved for ${periodLabel}. Click "Edit" to continue.`, severity: 'info' });
    }
  };

  // EDIT a draft
  const handleEdit = (entry) => {
    setFormData({
      ...EMPTY_FORM,
      periodYear: entry.periodYear || 2026,
      periodQuarter: entry.periodQuarter || 1,
      ...entry.data,
    });
    setEditingId(entry.id);
    setActiveStep(0);
    setMode('form');
    setSnackbar({ open: true, message: `Editing draft for ${entry.period}. Make changes and submit.`, severity: 'info' });
  };

  // DOWNLOAD submission as CSV
  const handleDownloadSubmission = (entry) => {
    const d = entry.data || {};
    const csv = `Field,Value
Period,${entry.period}
Status,${entry.status}
Submitted,${entry.submitted}
Investment Amount (Cr),${d.investmentAmount || '-'}
Annual Turnover (Cr),${d.annualTurnover || '-'}
Export Revenue (Cr),${d.exportRevenue || '-'}
R&D Expenditure (Cr),${d.rdExpenditure || '-'}
Permanent Employees,${d.permanentEmployees || '-'}
Contract Employees,${d.contractEmployees || '-'}
SC/ST Employees,${d.scStEmployees || '-'}
Women Employees,${d.womenEmployees || '-'}
Water Consumption (KL),${d.waterConsumption || '-'}
Power Usage (kWh),${d.powerUsage || '-'}
Waste Generated (Tons),${d.wasteGenerated || '-'}
Waste Recycled (%),${d.wasteRecycledPct || '-'}
CSR Activities,"${d.csrActivities || '-'}"
CSR Spent (Lakhs),${d.csrSpent || '-'}
Beneficiaries,${d.csrBeneficiaries || '-'}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Submission_${entry.period.replace(' ', '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setSnackbar({ open: true, message: `Submission data for ${entry.period} downloaded.`, severity: 'success' });
  };

  // DOWNLOAD template
  const handleDownloadTemplate = () => {
    const csv = 'Period Year,Period Quarter,Investment Amount (Cr),Annual Turnover (Cr),Export Revenue (Cr),R&D Expenditure (Cr),Permanent Employees,Contract Employees,SC/ST Employees,Women Employees,Water Consumption (KL),Power Usage (kWh),Waste Generated (Tons),Waste Recycled (%),CSR Activities,CSR Spent (Lakhs),Beneficiaries\n2026,1,,,,,,,,,,,,,,,,';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'NEXORA_Submission_Template.csv';
    a.click();
    URL.revokeObjectURL(url);
    setSnackbar({ open: true, message: 'Template downloaded! Fill in the data and upload.', severity: 'success' });
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Year</InputLabel>
                <Select value={formData.periodYear} label="Year" onChange={handleChange('periodYear')}>
                  <MenuItem value={2026}>2026</MenuItem>
                  <MenuItem value={2025}>2025</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Quarter</InputLabel>
                <Select value={formData.periodQuarter} label="Quarter" onChange={handleChange('periodQuarter')}>
                  <MenuItem value={1}>Q1 (Apr-Jun)</MenuItem>
                  <MenuItem value={2}>Q2 (Jul-Sep)</MenuItem>
                  <MenuItem value={3}>Q3 (Oct-Dec)</MenuItem>
                  <MenuItem value={4}>Q4 (Jan-Mar)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        );
      case 1:
        return (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Investment Amount (Cr) *" type="number" value={formData.investmentAmount} onChange={handleChange('investmentAmount')} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Annual Turnover (Cr) *" type="number" value={formData.annualTurnover} onChange={handleChange('annualTurnover')} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Export Revenue (Cr)" type="number" value={formData.exportRevenue} onChange={handleChange('exportRevenue')} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="R&D Expenditure (Cr)" type="number" value={formData.rdExpenditure} onChange={handleChange('rdExpenditure')} /></Grid>
          </Grid>
        );
      case 2:
        return (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Permanent Employees *" type="number" value={formData.permanentEmployees} onChange={handleChange('permanentEmployees')} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Contract Employees *" type="number" value={formData.contractEmployees} onChange={handleChange('contractEmployees')} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="SC/ST Employees" type="number" value={formData.scStEmployees} onChange={handleChange('scStEmployees')} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Women Employees" type="number" value={formData.womenEmployees} onChange={handleChange('womenEmployees')} /></Grid>
          </Grid>
        );
      case 3:
        return (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Water Consumption (KL) *" type="number" value={formData.waterConsumption} onChange={handleChange('waterConsumption')} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Power Usage (kWh) *" type="number" value={formData.powerUsage} onChange={handleChange('powerUsage')} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Waste Generated (Tons)" type="number" value={formData.wasteGenerated} onChange={handleChange('wasteGenerated')} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Waste Recycled (%)" type="number" value={formData.wasteRecycledPct} onChange={handleChange('wasteRecycledPct')} /></Grid>
          </Grid>
        );
      case 4:
        return (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}><TextField fullWidth multiline rows={3} label="CSR Activities Description" value={formData.csrActivities} onChange={handleChange('csrActivities')} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="CSR Amount Spent (Lakhs)" type="number" value={formData.csrSpent} onChange={handleChange('csrSpent')} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><TextField fullWidth label="Beneficiaries Count" type="number" value={formData.csrBeneficiaries} onChange={handleChange('csrBeneficiaries')} /></Grid>
          </Grid>
        );
      case 5:
        return (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>{editingId ? 'You are editing an existing draft. Click "Submit Data" to finalize.' : 'Review all data before submitting. Once submitted, changes require admin approval.'}</Alert>
            <Grid container spacing={2}>
              {[
                { label: 'Period', value: `Q${formData.periodQuarter} ${formData.periodYear}` },
                { label: 'Investment', value: formData.investmentAmount ? `Rs. ${formData.investmentAmount} Cr` : '-' },
                { label: 'Turnover', value: formData.annualTurnover ? `Rs. ${formData.annualTurnover} Cr` : '-' },
                { label: 'Export Revenue', value: formData.exportRevenue ? `Rs. ${formData.exportRevenue} Cr` : '-' },
                { label: 'Permanent Employees', value: formData.permanentEmployees || '-' },
                { label: 'Contract Employees', value: formData.contractEmployees || '-' },
                { label: 'Water (KL)', value: formData.waterConsumption || '-' },
                { label: 'Power (kWh)', value: formData.powerUsage || '-' },
                { label: 'Waste (Tons)', value: formData.wasteGenerated || '-' },
                { label: 'Recycled (%)', value: formData.wasteRecycledPct || '-' },
                { label: 'CSR Spent (L)', value: formData.csrSpent || '-' },
                { label: 'Beneficiaries', value: formData.csrBeneficiaries || '-' },
              ].map((item, i) => (
                <Grid key={i} size={{ xs: 6, sm: 3 }}>
                  <Card variant="outlined">
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                      <Typography variant="body1" fontWeight={600}>{item.value}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        );
      default: return null;
    }
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Typography variant="h4" fontWeight={700} gutterBottom sx={{ fontSize: { xs: '1.4rem', sm: '1.75rem', md: '2.125rem' } }}>
        Unified Data Submission
        {editingId && <Chip label="Editing Draft" color="warning" size="small" sx={{ ml: 2, verticalAlign: 'middle' }} />}
      </Typography>

      {/* Mode Selector */}
      <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: { xs: 2, md: 3 } }}>
        <FormControl>
          <FormLabel>Submission Mode</FormLabel>
          <RadioGroup row value={mode} onChange={(e) => setMode(e.target.value)}>
            <FormControlLabel value="form" control={<Radio />} label="Step-by-Step Form" />
            <FormControlLabel value="excel" control={<Radio />} label="Excel Upload" />
          </RadioGroup>
        </FormControl>
      </Paper>

      {/* Step-by-Step Form */}
      {mode === 'form' && (
        <Paper sx={{ p: { xs: 2, sm: 3 }, mb: { xs: 2, md: 3 } }}>
          <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: { xs: 2, md: 4 } }}>
            {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
          </Stepper>

          <Box sx={{ minHeight: 200, mb: 3 }}>{renderStepContent()}</Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button disabled={activeStep === 0} onClick={() => setActiveStep(activeStep - 1)} startIcon={<NavigateBefore />}>Previous</Button>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" startIcon={<Save />} onClick={handleSaveDraft}>Save Draft</Button>
              {activeStep < steps.length - 1 ? (
                <Button variant="contained" onClick={() => setActiveStep(activeStep + 1)} endIcon={<NavigateNext />}>Next</Button>
              ) : (
                <Button variant="contained" color="success" startIcon={<Send />} onClick={handleSubmit}>Submit Data</Button>
              )}
            </Box>
          </Box>
        </Paper>
      )}

      {/* Excel Upload */}
      {mode === 'excel' && (
        <Paper sx={{ p: { xs: 2, sm: 3 }, mb: { xs: 2, md: 3 } }}>
          <Typography variant="h6" fontWeight={600} gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>Excel Upload Wizard</Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: { xs: 2, md: 3 }, flexWrap: 'wrap' }}>
            <Button variant="outlined" startIcon={<Download />} onClick={handleDownloadTemplate}>Download Template (.csv)</Button>
          </Box>
          <Box sx={{ border: '2px dashed', borderColor: 'divider', borderRadius: 2, p: 4, textAlign: 'center', bgcolor: 'grey.50', mb: 2 }}>
            <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            <Typography variant="body1">Drag & drop your Excel file here</Typography>
            <Typography variant="body2" color="text.secondary">or click to browse</Typography>
            <input type="file" accept=".csv,.xlsx,.xls" id="file-upload" style={{ display: 'none' }} onChange={(e) => { if (e.target.files[0]) { setUploadedFile(e.target.files[0]); setSnackbar({ open: true, message: `File "${e.target.files[0].name}" selected.`, severity: 'info' }); } }} />
            <label htmlFor="file-upload"><Button variant="outlined" sx={{ mt: 2 }} component="span">Choose File</Button></label>
            {uploadedFile && (
              <Box sx={{ mt: 2 }}>
                <Chip label={uploadedFile.name} color="primary" onDelete={() => setUploadedFile(null)} sx={{ mb: 1 }} />
                <Button variant="contained" onClick={async () => {
                  try {
                    const reader = new FileReader();
                    reader.onload = async (event) => {
                      const text = event.target.result;
                      const lines = text.split('\n');
                      if (lines.length > 1) {
                        const values = lines[1].split(',');
                        const parsedData = {
                          periodYear: Number(values[0]) || 2026,
                          periodQuarter: Number(values[1]) || 1,
                          investmentAmount: Number(values[2]) || 0,
                          annualTurnover: Number(values[3]) || 0,
                          exportRevenue: Number(values[4]) || 0,
                          rdExpenditure: Number(values[5]) || 0,
                          permanentEmployees: Number(values[6]) || 0,
                          contractEmployees: Number(values[7]) || 0,
                          scStEmployees: Number(values[8]) || 0,
                          womenEmployees: Number(values[9]) || 0,
                          waterConsumption: Number(values[10]) || 0,
                          powerUsage: Number(values[11]) || 0,
                          wasteGenerated: Number(values[12]) || 0,
                          wasteRecycledPct: Number(values[13]) || 0,
                          csrActivities: values[14] || '',
                          csrSpent: Number(values[15]) || 0,
                          csrBeneficiaries: Number(values[16]) || 0,
                        };
                        
                        await submissionService.submit(parsedData);
                        refreshHistory();
                        setUploadedFile(null);
                        setSnackbar({ open: true, message: 'File parsed and submitted to database successfully!', severity: 'success' });
                      }
                    };
                    reader.readAsText(uploadedFile);
                  } catch {
                    setSnackbar({ open: true, message: 'Failed to process file.', severity: 'error' });
                  }
                }}>Upload & Validate</Button>
              </Box>
            )}
          </Box>
          <Alert severity="info">Upload a .csv or .xlsx file using the provided template. The system will validate all fields before submission.</Alert>
        </Paper>
      )}

      {/* Submission History */}
      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="h6" fontWeight={600} sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>Submission History</Typography>
          <Typography variant="body2" color="text.secondary">{history.length} submissions</Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Period</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Submitted</TableCell>
                <TableCell>Approved By</TableCell>
                <TableCell>Investment</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell><Typography fontWeight={600}>{row.period}</Typography></TableCell>
                  <TableCell>
                    <Chip label={row.status} size="small"
                      color={row.status === 'Approved' ? 'success' : row.status === 'Draft' ? 'default' : row.status === 'Submitted' ? 'primary' : 'warning'} />
                  </TableCell>
                  <TableCell>{row.submitted}</TableCell>
                  <TableCell>{row.approved_by}</TableCell>
                  <TableCell>{row.data?.investmentAmount ? `Rs. ${row.data.investmentAmount} Cr` : '-'}</TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      {row.status === 'Draft' && (
                        <Button size="small" startIcon={<Edit />} onClick={() => handleEdit(row)} variant="outlined" color="primary">Edit</Button>
                      )}
                      <Button size="small" startIcon={<Visibility />} onClick={() => setViewDialog(row)} variant="outlined">View</Button>
                      <Button size="small" startIcon={<Download />} onClick={() => handleDownloadSubmission(row)} variant="outlined" color="secondary">CSV</Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* View Submission Dialog */}
      <Dialog open={!!viewDialog} onClose={() => setViewDialog(null)} maxWidth="sm" fullWidth>
        {viewDialog && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" fontWeight={600}>Submission: {viewDialog.period}</Typography>
                <Chip label={viewDialog.status} color={viewDialog.status === 'Approved' ? 'success' : viewDialog.status === 'Draft' ? 'default' : 'primary'} />
              </Box>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ py: 1 }}>
                {[
                  { label: 'Submitted', value: viewDialog.submitted },
                  { label: 'Approved By', value: viewDialog.approved_by },
                  { label: 'Investment (Cr)', value: viewDialog.data?.investmentAmount || '-' },
                  { label: 'Turnover (Cr)', value: viewDialog.data?.annualTurnover || '-' },
                  { label: 'Export Revenue (Cr)', value: viewDialog.data?.exportRevenue || '-' },
                  { label: 'R&D (Cr)', value: viewDialog.data?.rdExpenditure || '-' },
                  { label: 'Permanent Employees', value: viewDialog.data?.permanentEmployees || '-' },
                  { label: 'Contract Employees', value: viewDialog.data?.contractEmployees || '-' },
                  { label: 'SC/ST Employees', value: viewDialog.data?.scStEmployees || '-' },
                  { label: 'Women Employees', value: viewDialog.data?.womenEmployees || '-' },
                  { label: 'Water (KL)', value: viewDialog.data?.waterConsumption || '-' },
                  { label: 'Power (kWh)', value: viewDialog.data?.powerUsage || '-' },
                  { label: 'Waste (Tons)', value: viewDialog.data?.wasteGenerated || '-' },
                  { label: 'Recycled (%)', value: viewDialog.data?.wasteRecycledPct || '-' },
                  { label: 'CSR Spent (Lakhs)', value: viewDialog.data?.csrSpent || '-' },
                  { label: 'Beneficiaries', value: viewDialog.data?.csrBeneficiaries || '-' },
                ].map((item, i) => (
                  <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.8, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" color="text.secondary">{item.label}</Typography>
                    <Typography variant="body2" fontWeight={600}>{item.value}</Typography>
                  </Box>
                ))}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setViewDialog(null)}>Close</Button>
              <Button variant="contained" startIcon={<Download />} onClick={() => { handleDownloadSubmission(viewDialog); setViewDialog(null); }}>Download CSV</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
