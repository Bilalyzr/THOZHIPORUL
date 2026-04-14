import React, { useState } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  MenuItem,
  TextField,
  Button,
  Divider,
  Alert,
  Snackbar,
  LinearProgress,
  CircularProgress
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableViewIcon from '@mui/icons-material/TableView';
import ContentPasteSearchIcon from '@mui/icons-material/ContentPasteSearch';

function ReportsDashboard() {
  const [reportType, setReportType] = useState('Investment Report');
  const [timePeriod, setTimePeriod] = useState('2025 (Annual)');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });

  const reportTypes = [
    'Investment Report',
    'Employment Growth Tracking',
    'Resource Usage Analysis',
    'CSR Expenditures Summary',
    'Compliance Alert History'
  ];

  const timePeriods = [
    'Q1 2026', 'Q4 2025', '2025 (Annual)', '2024 (Annual)'
  ];

  const handleGenerate = () => {
    setIsGenerating(true);
    setGenerated(false);
    
    // Simulate complex report generation
    setTimeout(() => {
      setIsGenerating(false);
      setGenerated(true);
      setSnackbar({ open: true, message: 'Report generated successfully!' });
    }, 2000);
  };

  const handleDownload = (format) => {
    setSnackbar({ open: true, message: `Preparing ${format} for download...` });
    
    // In a real app, this would be a window.location or blob download
    setTimeout(() => {
      setSnackbar({ open: true, message: `${reportType} (${format}) downloaded successfully.` });
    }, 1500);
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ mb: { xs: 2, md: 4 } }}>
        <Typography variant="h4" color="primary.main" fontWeight="bold" sx={{ fontSize: { xs: '1.4rem', sm: '1.75rem', md: '2.125rem' } }}>
          Industrial Reports
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Generate, preview, and export standardized industrial data reports.
        </Typography>
      </Box>

      <Grid container spacing={{ xs: 2, md: 4 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={3} sx={{ p: { xs: 2, sm: 3, md: 4 }, height: '100%', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 2, md: 3 } }}>
              <ContentPasteSearchIcon fontSize="large" color="secondary" sx={{ mr: 2 }} />
              <Typography variant="h6" color="text.primary">Report Configuration</Typography>
            </Box>
            
            <TextField 
              select fullWidth label="Select Report Type" 
              value={reportType} onChange={(e) => { setReportType(e.target.value); setGenerated(false); }}
              sx={{ mb: 3 }}
            >
              {reportTypes.map((option) => (
                <MenuItem key={option} value={option}>{option}</MenuItem>
              ))}
            </TextField>

            <TextField 
              select fullWidth label="Select Time Period" 
              value={timePeriod} onChange={(e) => { setTimePeriod(e.target.value); setGenerated(false); }}
              sx={{ mb: 4 }}
            >
              {timePeriods.map((option) => (
                <MenuItem key={option} value={option}>{option}</MenuItem>
              ))}
            </TextField>

            <Button 
              variant="contained" color="primary" fullWidth size="large" 
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? 'Generating...' : 'Generate Report Preview'}
            </Button>
            
            {isGenerating && <LinearProgress sx={{ mt: 2 }} />}
          </Paper>
        </Grid>

        {/* Results Pane */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={3} sx={{ p: { xs: 2, sm: 3, md: 4 }, height: '100%', borderRadius: 2, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" color="text.primary" gutterBottom>Export Options</Typography>
            <Divider sx={{ mb: 3 }} />

            {generated ? (
              <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Alert severity="success" sx={{ mb: 2 }}>
                  <strong>{reportType} for {timePeriod}</strong> successfully generated. Select a format to download.
                </Alert>
                
                <Button 
                  variant="outlined" color="primary" size="large" 
                  startIcon={<PictureAsPdfIcon />}
                  onClick={() => handleDownload('PDF')}
                  sx={{ justifyContent: 'flex-start', py: 2 }}
                >
                  Download as PDF Document
                </Button>
                
                <Button 
                  variant="outlined" color="success" size="large" 
                  startIcon={<TableViewIcon />}
                  onClick={() => handleDownload('Excel')}
                  sx={{ justifyContent: 'flex-start', py: 2 }}
                >
                  Download as Excel Spreadsheet
                </Button>
              </Box>
            ) : (
              <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.disabled', textAlign: 'center' }}>
                <Box>
                  {isGenerating ? (
                    <CircularProgress color="inherit" />
                  ) : (
                    <Typography variant="body1">Configure and generate a report to view export options.</Typography>
                  )}
                </Box>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity="success">{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}

export default ReportsDashboard;
