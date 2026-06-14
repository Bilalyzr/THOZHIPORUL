import React, { useState } from 'react';
import { 
  Box, 
  Container, 
  Paper, 
  Typography, 
  Stepper, 
  Step, 
  StepLabel,
  Button,
  Grid,
  TextField,
  Divider,
  Alert,
  Snackbar,
  CircularProgress
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import SendIcon from '@mui/icons-material/Send';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

const steps = ['Company Defaults', 'Investment Details', 'Employment Data', 'Resource Usage', 'CSR Activities'];

function DataSubmission() {
  // Get user's company name from localStorage or use default
  const companyName = localStorage.getItem('companyName') || localStorage.getItem('userName') || 'My Company';

  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formData, setFormData] = useState({
    companyName: companyName,
    industryType: 'Manufacturing',
    location: 'NEXORA Park, Irungattukottai',
    investmentAmount: '',
    annualTurnover: '',
    permanentEmployees: '',
    contractEmployees: '',
    waterConsumption: '', 
    powerUsage: '',
    csrActivities: '',
    csrSpent: ''
  });

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleNext = () => {
    // Basic validation for mandatory fields in current step
    if (activeStep === 1 && (!formData.investmentAmount || !formData.annualTurnover)) {
      showSnackbar("Please fill in investment details to proceed.", "warning");
      return;
    }
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => setActiveStep((prevActiveStep) => prevActiveStep - 1);
  const handleReset = () => {
    setActiveStep(0);
    setFormData({
      ...formData,
      investmentAmount: '',
      annualTurnover: '',
      permanentEmployees: '',
      contractEmployees: '',
      waterConsumption: '', 
      powerUsage: '',
      csrActivities: '',
      csrSpent: ''
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveDraft = () => {
    showSnackbar("Draft saved successfully to the system.");
  };

  const handleSubmit = () => {
    setIsSubmitting(true);
    // Simulate API Submission
    setTimeout(() => {
      setIsSubmitting(false);
      setTransactionId(`THOZHIRPORUL-${Date.now()}`);
      showSnackbar("Full Industrial Report Submitted to NEXORA successfully!");
      setActiveStep(steps.length + 1); // Finished state
    }, 2000);
  };

  const getStepContent = (stepIndex) => {
    switch (stepIndex) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Confirm your base company profile details before submitting operational data.
              </Alert>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField 
                required fullWidth label="Company Name" name="companyName" 
                value={formData.companyName} onChange={handleChange} disabled
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField 
                required fullWidth label="Industry Type" name="industryType" 
                value={formData.industryType} onChange={handleChange}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField 
                required fullWidth label="Location (NEXORA Park)" name="location" 
                value={formData.location} onChange={handleChange} disabled
              />
            </Grid>
          </Grid>
        );
      case 1:
        return (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField 
                required fullWidth label="Current Investment Amount (in Crores)" name="investmentAmount" 
                value={formData.investmentAmount} onChange={handleChange} type="number"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField 
                required fullWidth label="Annual Turnover (in Crores)" name="annualTurnover" 
                value={formData.annualTurnover} onChange={handleChange} type="number"
              />
            </Grid>
          </Grid>
        );
      case 2:
        return (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField 
                required fullWidth label="Number of Permanent Employees" name="permanentEmployees" 
                value={formData.permanentEmployees} onChange={handleChange} type="number"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField 
                required fullWidth label="Number of Contract Employees" name="contractEmployees" 
                value={formData.contractEmployees} onChange={handleChange} type="number"
              />
            </Grid>
          </Grid>
        );
      case 3:
        return (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField 
                required fullWidth label="Water Consumption (in KL)" name="waterConsumption" 
                value={formData.waterConsumption} onChange={handleChange} type="number"
                helperText="Total consumption for the reporting period."
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField 
                required fullWidth label="Power Usage (in kWh)" name="powerUsage" 
                value={formData.powerUsage} onChange={handleChange} type="number"
                helperText="Total metered electricity usage."
              />
            </Grid>
          </Grid>
        );
      case 4:
        return (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <TextField 
                required fullWidth label="Description of CSR Activities" name="csrActivities" 
                value={formData.csrActivities} onChange={handleChange} 
                multiline rows={4} placeholder="E.g., Local school development, tree planting..."
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField 
                fullWidth label="Total Amount Spent on CSR (in Lakhs)" name="csrSpent" 
                value={formData.csrSpent} onChange={handleChange} type="number"
              />
            </Grid>
          </Grid>
        );
      default:
        return 'Unknown stepIndex';
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" color="primary.main" fontWeight="bold">
          Submit Industrial Data
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Periodic data submission for {companyName} (Q1 2026).
        </Typography>
      </Box>

      <Paper elevation={3} sx={{ p: { xs: 2, md: 5 }, borderRadius: 2 }}>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 5 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {activeStep === steps.length ? (
          <Box sx={{ textAlign: 'center', py: 5 }}>
            <Typography variant="h6" gutterBottom>Finalize Your Submission</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              Please upload a consolidated proof document (PDF) for the data provided above before final submission.
            </Typography>
            
            <Box sx={{ mb: 4 }}>
              <Button 
                variant="outlined" 
                component="label" 
                startIcon={<CloudUploadIcon />}
                size="large"
              >
                Upload Proof Documents (PDF)
                <input type="file" hidden accept=".pdf" onChange={() => showSnackbar("Document uploaded successfully!")} />
              </Button>
            </Box>

            <Alert severity="success" sx={{ mb: 4, justifyContent: 'center' }}>
              All data has been reviewed and successfully validated!
            </Alert>
            
            <Button 
              variant="contained" color="primary" 
              onClick={handleSubmit} startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
              disabled={isSubmitting}
              size="large"
              sx={{ px: 4 }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Final Report to NEXORA'}
            </Button>
            <Button sx={{ ml: 2 }} onClick={handleReset} disabled={isSubmitting}>
              Reset Form
            </Button>
          </Box>
        ) : activeStep > steps.length ? (
            <Box sx={{ textAlign: 'center', py: 5 }}>
                <Typography variant="h5" color="success.main" gutterBottom>🎉 Submission Successful!</Typography>
                <Typography variant="body1" sx={{ mb: 4 }}>Your report has been received and logged under Transaction ID: {transactionId}.</Typography>
                <Button variant="outlined" onClick={handleReset}>Initiate New Submission</Button>
            </Box>
        ) : (
          <Box>
            <Box sx={{ minHeight: '30vh', py: 2 }}>
              {getStepContent(activeStep)}
            </Box>

            <Divider sx={{ my: 3 }} />

            <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2 }}>
              <Button
                color="inherit"
                disabled={activeStep === 0}
                onClick={handleBack}
                sx={{ mr: 1 }}
              >
                Back
              </Button>
              <Button color="secondary" onClick={handleSaveDraft} startIcon={<SaveIcon />} sx={{ display: { xs: 'none', sm: 'flex' }}}>
                Save Draft
              </Button>
              <Box sx={{ flex: '1 1 auto' }} />
              <Button onClick={handleNext} variant="contained" color="primary">
                {activeStep === steps.length - 1 ? 'Review Data' : 'Next Step'}
              </Button>
            </Box>
          </Box>
        )}
      </Paper>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}

export default DataSubmission;
