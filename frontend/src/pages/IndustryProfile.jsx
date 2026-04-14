import React, { useState } from 'react';
import { 
  Box, 
  Container, 
  Paper, 
  Typography, 
  TextField, 
  Button, 
  Grid, 
  Avatar, 
  Divider, 
  Alert,
  Snackbar,
  CircularProgress
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

function IndustryProfile() {
  const [formData, setFormData] = useState({
    companyName: 'ABC Industries',
    industryType: 'Automotive',
    location: 'Oragadam Phase 1',
    contactPerson: 'Senthil Kumar',
    email: 'tech@abc-industry.com',
    phone: '+91 98765-XXXXX'
  });
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });

  const showSnackbar = (message) => {
    setSnackbar({ open: true, message });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsUpdating(true);
    
    // Simulate API update
    setTimeout(() => {
      setIsUpdating(false);
      setSuccess(true);
      showSnackbar("Your company profile has been updated successfully.");
      setTimeout(() => setSuccess(false), 3000);
    }, 1500);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setIsUploading(true);
      // Simulate File Upload
      setTimeout(() => {
        setIsUploading(false);
        showSnackbar(`${file.name} uploaded successfully!`);
      }, 2000);
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" color="primary.main" fontWeight="bold" gutterBottom sx={{ fontSize: { xs: '1.4rem', sm: '1.75rem', md: '2.125rem' } }}>
        Company Profile
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: { xs: 2, md: 4 } }}>
        Manage your NEXORA registered company details and contact information.
      </Typography>

      <Grid container spacing={{ xs: 2, md: 4 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={2} sx={{ p: { xs: 2, sm: 3, md: 4 }, textAlign: 'center', borderRadius: 4 }}>
            <Avatar sx={{ width: 100, height: 100, mx: 'auto', mb: 2, bgcolor: 'primary.main' }}>
              <BusinessIcon sx={{ fontSize: 50 }} />
            </Avatar>
            <Typography variant="h5" fontWeight="bold">{formData.companyName}</Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>{formData.industryType}</Typography>
            <Typography variant="caption" color="text.disabled">Member since 2021</Typography>
            
            <Divider sx={{ my: 3 }} />
            
            <Button 
                variant="outlined" 
                component="label" 
                startIcon={isUploading ? <CircularProgress size={20} /> : <CloudUploadIcon />} 
                fullWidth
                disabled={isUploading}
            >
              {isUploading ? 'Uploading...' : 'Upload GST Certificate'}
              <input type="file" hidden onChange={handleFileUpload} />
            </Button>
            <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                PDF or JPG, Max 5MB
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Paper elevation={2} sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: 4 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>General Information</Typography>
            <Divider sx={{ mb: 3 }} />
            
            {success && <Alert severity="success" sx={{ mb: 3 }}>Profile updated successfully!</Alert>}
            
            <form onSubmit={handleSubmit}>
              <Grid container spacing={{ xs: 2, md: 3 }}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField fullWidth label="Company Name" value={formData.companyName} variant="outlined" disabled />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField fullWidth label="Industry Type" value={formData.industryType} variant="outlined" disabled />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField fullWidth label="Registered Location" value={formData.location} variant="outlined" disabled />
                </Grid>
                
                <Grid size={{ xs: 12 }} sx={{ mt: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold">Primary Contact Details</Typography>
                </Grid>
                
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField 
                    fullWidth label="Contact Person" 
                    value={formData.contactPerson} 
                    onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
                    variant="outlined" 
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField 
                    fullWidth label="Phone Number" 
                    value={formData.phone} 
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    variant="outlined" 
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField 
                    fullWidth label="Email Address" 
                    value={formData.email} 
                    variant="outlined" 
                    disabled
                    helperText="Email is managed by administrator for security purposes."
                  />
                </Grid>
                
                <Grid size={{ xs: 12 }} sx={{ mt: 2 }}>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    type="submit" 
                    size="large"
                    disabled={isUpdating}
                    startIcon={isUpdating && <CircularProgress size={20} color="inherit" />}
                  >
                    {isUpdating ? 'Saving...' : 'Save Changes'}
                  </Button>
                </Grid>
              </Grid>
            </form>
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

export default IndustryProfile;
