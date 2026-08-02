import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, Button,
  Radio, RadioGroup, FormControlLabel, FormControl, FormLabel,
  Select, MenuItem, InputLabel, Checkbox, FormGroup,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Divider, LinearProgress, Alert, Snackbar, Dialog, DialogTitle,
  DialogContent, DialogActions, List, ListItem, ListItemIcon, ListItemText,
  Avatar, TextField, IconButton
} from '@mui/material';
import {
  PictureAsPdf, TableChart, DataObject, Download,
  Visibility, History, Save
} from '@mui/icons-material';
import { submissionService } from '../services/api';
import { downloadRoleReport } from '../utils/reportGenerator';
import * as XLSX from 'xlsx';

export default function ReportExportCenter() {
  const [reportType, setReportType] = useState('investment');
  const [format, setFormat] = useState('PDF');
  const [park, setPark] = useState('all');
  const [period, setPeriod] = useState('2025-26');
  const [quarter, setQuarter] = useState('all');
  const [showPreview, setShowPreview] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [savedDialogOpen, setSavedDialogOpen] = useState(false);
  const [columns, setColumns] = useState({
    company_name: true, investment: true, employment: true,
    location: true, water_usage: false, power_usage: false,
    csr_spend: false, compliance: true, turnover: false,
  });




  const reportTypes = [
    { value: 'investment', label: 'Investment Summary' },
    { value: 'employment', label: 'Employment Report' },
    { value: 'compliance', label: 'Compliance Status' },
    { value: 'park_performance', label: 'Park Performance' },
    { value: 'resource', label: 'Resource Utilization' },
    { value: 'custom', label: 'Custom Query' },
  ];

  const [previewData, setPreviewData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await submissionService.getCompliance();
        // Map the backend compliance data to the report center format
        const mappedData = (Array.isArray(response.data) ? response.data : []).map(row => {
          const s = String(row.status || '').toLowerCase();
          return {
            company: row.name,
            park: row.location,
            investment: row.investmentAmount ? `${row.investmentAmount} Cr` : '-',
            employment: '-', // Currently employment total isn't returned by getCompliance, could be added later
            compliance: s === 'compliant' ? 100 : s === 'alert' ? 20 : 60
          };
        });
        setPreviewData(mappedData);
      } catch (err) {
        console.error("Failed to load report data", err);
      }
    };
    fetchData();
  }, []);

  const recentReports = [
    { id: 1, name: 'Investment_Q1_2026', type: 'PDF', generated: '2026-04-10', size: '120 KB' },
    { id: 2, name: 'Compliance_Annual_2025', type: 'Excel', generated: '2026-03-28', size: '340 KB' },
    { id: 3, name: 'Employment_Oragadam', type: 'CSV', generated: '2026-03-15', size: '56 KB' },
    { id: 4, name: 'Park_Performance_Q4', type: 'PDF', generated: '2026-01-20', size: '180 KB' },
  ];

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const role = localStorage.getItem('role') || 'admin';
      if (format === 'PDF') {
        // Designed role-specific report driven by the current selections.
        const id = await downloadRoleReport(role, { reportType, period, park, quarter });
        setSnackbar({ open: true, message: `Report ${id} generated and downloaded (PDF)!`, severity: 'success' });
      } else if (format === 'Excel') {
        const worksheetData = previewData.map(row => ({
          Company: row.company,
          Location: row.park,
          Investment: row.investment,
          Employment: row.employment,
          'Compliance (%)': row.compliance
        }));
        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Compliance Report");
        XLSX.writeFile(workbook, `THOZHIRPORUL_${reportType}_${period}.xlsx`);
        setSnackbar({ open: true, message: 'Report generated and downloaded as Excel!', severity: 'success' });
      } else {
        const csvData = previewData.map(r => `"${r.company}","${r.park}","${r.investment}","${r.employment}",${r.compliance}`).join('\n');
        const csvContent = 'Company,Park,Investment,Employment,Compliance (%)\n' + csvData;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `THOZHIRPORUL_${reportType}_${period}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        setSnackbar({ open: true, message: 'Report generated and downloaded as CSV!', severity: 'success' });
      }
    } catch (err) {
      console.error('Report generation failed', err);
      setSnackbar({ open: true, message: 'Failed to generate report.', severity: 'error' });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadRecentReport = async (report) => {
    setSnackbar({ open: true, message: `Preparing ${report.name}…`, severity: 'info' });
    try {
      const role = localStorage.getItem('role') || 'admin';
      if (report.type === 'PDF') {
        const id = await downloadRoleReport(role);
        setSnackbar({ open: true, message: `Report ${id} downloaded.`, severity: 'success' });
      } else if (report.type === 'Excel') {
        const worksheet = XLSX.utils.json_to_sheet(previewData.map(r => ({
          Company: r.company, Location: r.park, Investment: r.investment, Employment: r.employment, 'Compliance (%)': r.compliance
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
        XLSX.writeFile(workbook, `${report.name}.xlsx`);
        setSnackbar({ open: true, message: `${report.name} downloaded.`, severity: 'success' });
      } else {
        const csvData = previewData.map(r => `"${r.company}","${r.park}","${r.investment}","${r.employment}",${r.compliance}`).join('\n');
        const csvContent = 'Company,Park,Investment,Employment,Compliance (%)\n' + csvData;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${report.name}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        setSnackbar({ open: true, message: `${report.name} downloaded.`, severity: 'success' });
      }
    } catch (err) {
      console.error('Report download failed', err);
      setSnackbar({ open: true, message: 'Failed to download report.', severity: 'error' });
    }
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: { xs: 2, md: 3 }, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.4rem', sm: '1.75rem', md: '2.125rem' } }}>Report Export Center</Typography>
          <Typography variant="body2" color="text.secondary">Generate branded reports in PDF, Excel, or CSV format</Typography>
        </Box>
        <Button variant="outlined" startIcon={<History />} onClick={() => setSavedDialogOpen(true)}>My Saved Reports</Button>
      </Box>

      {/* Report Builder */}
      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: { xs: 2, md: 3 } }}>
        <Typography variant="h6" fontWeight={600} gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>Report Builder</Typography>

        {/* Step 1: Report Type */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight={600} color="primary" gutterBottom>1. Select Report Type</Typography>
          <RadioGroup row value={reportType} onChange={(e) => setReportType(e.target.value)}>
            {reportTypes.map((rt) => (
              <FormControlLabel key={rt.value} value={rt.value} control={<Radio />} label={rt.label}
                sx={{ mr: 3, border: reportType === rt.value ? '2px solid' : '1px solid', borderColor: reportType === rt.value ? 'primary.main' : 'divider', borderRadius: 2, px: 1.5, py: 0.5, mb: 1 }} />
            ))}
          </RadioGroup>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Step 2: Filters */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight={600} color="primary" gutterBottom>2. Filter Criteria</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Park</InputLabel>
                <Select value={park} label="Park" onChange={(e) => setPark(e.target.value)}>
                  <MenuItem value="all">All Parks</MenuItem>
                  <MenuItem value="oragadam">Oragadam</MenuItem>
                  <MenuItem value="sriperumbudur">Sriperumbudur</MenuItem>
                  <MenuItem value="hosur">Hosur</MenuItem>
                  <MenuItem value="siruseri">Siruseri</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Period</InputLabel>
                <Select value={period} label="Period" onChange={(e) => setPeriod(e.target.value)}>
                  <MenuItem value="2025-26">2025-26</MenuItem>
                  <MenuItem value="2024-25">2024-25</MenuItem>
                  <MenuItem value="2023-24">2023-24</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Quarter</InputLabel>
                <Select value={quarter} label="Quarter" onChange={(e) => setQuarter(e.target.value)}>
                  <MenuItem value="all">All Quarters</MenuItem>
                  <MenuItem value="1">Q1</MenuItem>
                  <MenuItem value="2">Q2</MenuItem>
                  <MenuItem value="3">Q3</MenuItem>
                  <MenuItem value="4">Q4</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Industry Type</InputLabel>
                <Select defaultValue="all" label="Industry Type">
                  <MenuItem value="all">All Types</MenuItem>
                  <MenuItem value="manufacturing">Manufacturing</MenuItem>
                  <MenuItem value="it">IT / Software</MenuItem>
                  <MenuItem value="pharma">Pharma</MenuItem>
                  <MenuItem value="auto">Automobile</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>

        {/* Step 3: Columns (for custom) */}
        {reportType === 'custom' && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" fontWeight={600} color="primary" gutterBottom>3. Select Columns</Typography>
              <FormGroup row>
                {Object.entries(columns).map(([key, checked]) => (
                  <FormControlLabel key={key} control={
                    <Checkbox checked={checked} onChange={(e) => setColumns({ ...columns, [key]: e.target.checked })} />
                  } label={key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} sx={{ mr: 3 }} />
                ))}
              </FormGroup>
            </Box>
          </>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Step 4: Format */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight={600} color="primary" gutterBottom>{reportType === 'custom' ? '4' : '3'}. Output Format</Typography>
          <RadioGroup row value={format} onChange={(e) => setFormat(e.target.value)}>
            <FormControlLabel value="PDF" control={<Radio />} label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><PictureAsPdf color="error" /> PDF (Branded Template)</Box>
            } />
            <FormControlLabel value="Excel" control={<Radio />} label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><TableChart color="success" /> Excel (.xlsx)</Box>
            } />
            <FormControlLabel value="CSV" control={<Radio />} label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><DataObject color="info" /> CSV (Raw Data)</Box>
            } />
          </RadioGroup>
        </Box>

        {generating && <LinearProgress sx={{ mb: 2 }} />}

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<Visibility />} onClick={() => setShowPreview(true)}>Preview Data (First 10 Rows)</Button>
          <Button variant="contained" startIcon={<Download />} onClick={handleGenerate} disabled={generating}>
            {generating ? 'Generating...' : 'Generate Report'}
          </Button>
          <Button variant="outlined" startIcon={<Save />} onClick={() => { localStorage.setItem('savedReportConfig', JSON.stringify({ reportType, format, park, period, quarter })); setSnackbar({ open: true, message: 'Report configuration saved! You can reload it anytime.', severity: 'success' }); }}>Save Configuration</Button>
        </Box>
      </Paper>

      {/* Preview Table */}
      {showPreview && (
        <Paper sx={{ p: { xs: 2, sm: 3 }, mb: { xs: 2, md: 3 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="h6" fontWeight={600} sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>Data Preview</Typography>
            <Typography variant="body2" color="text.secondary">Total records: 234 | Estimated size: 45 KB</Typography>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Company</TableCell>
                  <TableCell>Park</TableCell>
                  <TableCell align="right">Investment</TableCell>
                  <TableCell align="right">Employment</TableCell>
                  <TableCell align="right">Compliance</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {previewData.map((row, i) => (
                  <TableRow key={i} hover>
                    <TableCell>{row.company}</TableCell>
                    <TableCell>{row.park}</TableCell>
                    <TableCell align="right">{row.investment}</TableCell>
                    <TableCell align="right">{row.employment}</TableCell>
                    <TableCell align="right">
                      <Chip label={`${row.compliance}/100`} size="small"
                        color={row.compliance >= 80 ? 'success' : row.compliance >= 60 ? 'warning' : 'error'} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Recent Reports */}
      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="h6" fontWeight={600} gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>Recently Generated Reports</Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Report Name</TableCell>
                <TableCell>Format</TableCell>
                <TableCell>Generated</TableCell>
                <TableCell>Size</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recentReports.map((report) => (
                <TableRow key={report.id} hover>
                  <TableCell><Typography variant="body2" fontWeight={600}>{report.name}</Typography></TableCell>
                  <TableCell>
                    <Chip label={report.type} size="small"
                      color={report.type === 'PDF' ? 'error' : report.type === 'Excel' ? 'success' : 'info'} variant="outlined" />
                  </TableCell>
                  <TableCell>{report.generated}</TableCell>
                  <TableCell>{report.size}</TableCell>
                  <TableCell><Button size="small" startIcon={<Download />} onClick={() => handleDownloadRecentReport(report)}>Download</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>



      {/* Saved Reports Dialog */}
      <Dialog open={savedDialogOpen} onClose={() => setSavedDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Saved Report Configurations</DialogTitle>
        <DialogContent>
          {localStorage.getItem('savedReportConfig') ? (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Your saved report configurations:</Typography>
              <Paper variant="outlined" sx={{ p: 2 }}>
                {(() => {
                  try {
                    const cfg = JSON.parse(localStorage.getItem('savedReportConfig'));
                    return (
                      <List dense>
                        <ListItem><ListItemText primary="Report Type" secondary={cfg.reportType} /></ListItem>
                        <ListItem><ListItemText primary="Format" secondary={cfg.format} /></ListItem>
                        <ListItem><ListItemText primary="Park" secondary={cfg.park} /></ListItem>
                        <ListItem><ListItemText primary="Period" secondary={cfg.period} /></ListItem>
                        <ListItem><ListItemText primary="Quarter" secondary={cfg.quarter} /></ListItem>
                      </List>
                    );
                  } catch {
                    return <Typography color="error">Invalid saved configuration</Typography>;
                  }
                })()}
              </Paper>
              <Button
                variant="contained"
                sx={{ mt: 2 }}
                onClick={() => {
                  try {
                    const cfg = JSON.parse(localStorage.getItem('savedReportConfig'));
                    setReportType(cfg.reportType);
                    setFormat(cfg.format);
                    setPark(cfg.park);
                    setPeriod(cfg.period);
                    setQuarter(cfg.quarter);
                    setSavedDialogOpen(false);
                    setSnackbar({ open: true, message: 'Report configuration loaded!', severity: 'success' });
                  } catch {
                    setSnackbar({ open: true, message: 'Failed to load configuration', severity: 'error' });
                  }
                }}
              >Load Configuration</Button>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">No saved configurations yet. Use "Save Configuration" to save your current report settings.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSavedDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
