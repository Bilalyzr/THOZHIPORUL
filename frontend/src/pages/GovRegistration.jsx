import React, { useState } from 'react';
import {
  Box, Paper, Typography, Button, Grid, MenuItem, Alert, Snackbar,
  CircularProgress, TextField, Container, Divider, InputAdornment, IconButton
} from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/api';

const departments = [
  'Industries & Commerce', 'Industrial Policy & Promotion', 'MSME Department',
  'Environment & Forests', 'Revenue & Disaster Management', 'Labour & Employment',
  'Municipal Administration', 'Public Works Department', 'Other'
];

const designations = [
  'District Collector', 'Joint Director', 'Deputy Director', 'Assistant Director',
  'District Industries Centre (DIC) Officer', 'Environmental Officer', 'Inspector', 'Analyst', 'Other'
];

const jurisdictions = [
  'State-wide', 'Kancheepuram District', 'Krishnagiri District', 'Chengalpattu District',
  'Tirunelveli District', 'Tiruvannamalai District', 'Chennai District', 'Coimbatore District', 'Other'
];

export default function GovRegistration() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    officerName: '', designation: '', department: '', jurisdiction: '',
    officialEmail: '', phoneNumber: '', employeeId: '', password: '', confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.registerGovt(formData);
      setSnackbar({ open: true, message: res.data.msg });
      setTimeout(() => navigate('/login/govt'), 2500);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', py: { xs: 3, md: 6 }, px: { xs: 1, sm: 2 } }}>
      <Container maxWidth="md">
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/login/govt')} size="small"
          sx={{ mb: 2, color: 'text.secondary' }}>
          Back to Login
        </Button>

        <Paper elevation={0} sx={{ p: { xs: 3, md: 5 }, borderRadius: 4, border: '1px solid #E2E8F0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Box sx={{
              background: 'linear-gradient(135deg, #E67E22, #F5A623)',
              p: 1.5, borderRadius: 3, display: 'flex',
              boxShadow: '0 4px 16px rgba(230,126,34,0.3)',
            }}>
              <AccountBalanceIcon sx={{ color: 'white', fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight={800} sx={{ color: '#E67E22' }}>
                Government Officer Registration
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Create your THOZHIPORUL account for state industrial monitoring access.
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          <form onSubmit={handleSubmit}>
            {error && <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert>}

            <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem' }}>
              Officer Information
            </Typography>
            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField required fullWidth label="Officer Full Name" name="officerName"
                  value={formData.officerName} onChange={handleChange} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField required fullWidth label="Government Employee ID" name="employeeId"
                  value={formData.employeeId} onChange={handleChange} placeholder="e.g., TN-GOV-12345" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField required fullWidth select label="Designation" name="designation"
                  value={formData.designation} onChange={handleChange}>
                  {designations.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField required fullWidth select label="Department" name="department"
                  value={formData.department} onChange={handleChange}>
                  {departments.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField required fullWidth select label="Jurisdiction" name="jurisdiction"
                  value={formData.jurisdiction} onChange={handleChange}
                  helperText="Select the geographic scope of your oversight responsibilities.">
                  {jurisdictions.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                </TextField>
              </Grid>
            </Grid>

            <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 1.5, mt: 3, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem' }}>
              Contact & Login Credentials
            </Typography>
            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField required fullWidth label="Official Email" name="officialEmail" type="email"
                  value={formData.officialEmail} onChange={handleChange}
                  helperText="This email will be your THOZHIPORUL login username." />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField required fullWidth label="Official Phone Number" name="phoneNumber" type="tel"
                  value={formData.phoneNumber} onChange={handleChange} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField required fullWidth label="Password" name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password} onChange={handleChange}
                  helperText="Minimum 6 characters"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                          {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField required fullWidth label="Confirm Password" name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword} onChange={handleChange}
                  error={formData.confirmPassword !== '' && formData.password !== formData.confirmPassword}
                  helperText={formData.confirmPassword !== '' && formData.password !== formData.confirmPassword ? 'Passwords do not match' : ''} />
              </Grid>
            </Grid>

            <Alert severity="info" sx={{ mt: 3, borderRadius: 2 }}>
              After registration, you can log in immediately with your email and password.
            </Alert>

            <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
              <Button type="submit" variant="contained" size="large" disabled={loading}
                sx={{
                  py: 1.5, px: 4, minWidth: 220, fontWeight: 700, borderRadius: 3,
                  background: 'linear-gradient(135deg, #E67E22, #F5A623)',
                  boxShadow: '0 4px 16px rgba(230,126,34,0.3)',
                }}>
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Create Account'}
              </Button>
              <Button variant="outlined" size="large" onClick={() => navigate('/login/govt')} sx={{ borderRadius: 3 }}>
                Cancel
              </Button>
            </Box>
          </form>
        </Paper>

        <Typography variant="caption" display="block" textAlign="center" color="text.disabled" sx={{ mt: 3 }}>
          &copy; 2026 NEXORA | THOZHIPORUL Platform | Government of Tamil Nadu
        </Typography>
      </Container>

      <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" variant="filled" onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
