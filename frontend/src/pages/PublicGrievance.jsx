import { useState } from 'react';
import { Box, Typography, Paper, TextField, Button, Grid, Alert, Snackbar } from '@mui/material';
import { Campaign, ReportProblem } from '@mui/icons-material';
import SubPageNav from '../components/SubPageNav';

export default function PublicGrievance() {
  const [form, setForm] = useState({ name: '', phone: '', location: '', description: '' });
  const [submitted, setSubmitted] = useState(false);
  const [refId, setRefId] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setRefId(`GRV-${Math.floor(Math.random() * 10000)}`);
    setSubmitted(true);
    setForm({ name: '', phone: '', location: '', description: '' });
  };

  return (
    <>
      <SubPageNav />
      <Box sx={{ maxWidth: 800, mx: 'auto', p: { xs: 2, md: 4 }, pt: { xs: 12, md: 16 } }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Campaign sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          <Typography variant="h4" fontWeight={700} gutterBottom>Public Grievance Portal</Typography>
          <Typography variant="body1" color="text.secondary">
            Report infrastructure issues, compliance concerns, or general grievances directly to SIPCOT authority.
          </Typography>
        </Box>

        <Paper sx={{ p: { xs: 2, md: 4 } }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
            <ReportProblem sx={{ mr: 1, color: 'error.main' }} /> File a New Grievance
          </Typography>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Full Name" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Phone Number" required value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Industrial Park Location / Area" required value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Describe the Issue" required multiline rows={4} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </Grid>
              <Grid item xs={12}>
                <Button type="submit" variant="contained" size="large" fullWidth>Submit Grievance</Button>
              </Grid>
            </Grid>
          </form>
        </Paper>
        <Snackbar open={submitted} autoHideDuration={6000} onClose={() => setSubmitted(false)}>
          <Alert severity="success" sx={{ width: '100%' }}>Grievance submitted successfully. Reference ID: {refId}</Alert>
        </Snackbar>
      </Box>
    </>
  );
}
