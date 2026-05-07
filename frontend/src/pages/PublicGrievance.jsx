import { useState } from 'react';
import { 
  Box, Typography, Paper, TextField, Button, Grid, Alert, 
  Snackbar, Card, CardContent, Divider, List, ListItem, 
  ListItemIcon, ListItemText, useTheme 
} from '@mui/material';
import { 
  Campaign, ReportProblem, CheckCircle, HourglassEmpty, 
  Speed, HelpOutline, AssignmentTurnedIn, Info 
} from '@mui/icons-material';
import SubPageNav from '../components/SubPageNav';

export default function PublicGrievance() {
  const theme = useTheme();
  const [form, setForm] = useState({ name: '', phone: '', location: '', description: '' });
  const [submitted, setSubmitted] = useState(false);
  const [refId, setRefId] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setRefId(`GRV-${Math.floor(Math.random() * 10000)}`);
    setSubmitted(true);
    setForm({ name: '', phone: '', location: '', description: '' });
  };

  const stats = [
    { label: 'Grievances Resolved', value: '4,850+', icon: <AssignmentTurnedIn />, color: '#2E7D32' },
    { label: 'Active Inquiries', value: '124', icon: <HourglassEmpty />, color: '#1F4E79' },
    { label: 'Avg. Response Time', value: '24 hrs', icon: <Speed />, color: '#F57C00' }
  ];

  const faqs = [
    { q: 'How long does it take?', a: 'Most infrastructure issues are addressed within 48 working hours.' },
    { q: 'Can I report anonymously?', a: 'Yes, but providing contact info helps us reach out for more details if needed.' },
    { q: 'Who reviews my report?', a: 'Directly assigned to the relevant Industrial Park Officer and the SIPCOT Head Office.' }
  ];

  return (
    <>
      <SubPageNav />
      
      {/* Hero Section */}
      <Box sx={{ 
        background: 'linear-gradient(135deg, #1F4E79 0%, #2E7D32 100%)', 
        pt: { xs: 12, md: 20 }, 
        pb: { xs: 8, md: 12 }, 
        px: 3, 
        color: 'white',
        textAlign: 'center',
        position: 'relative',
        overflow: 'visible', // Ensure cards can overlap correctly
        zIndex: 1
      }}>
        {/* Decorative Circles */}
        <Box sx={{ position: 'absolute', top: -100, right: -100, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', zIndex: 0 }} />
        <Box sx={{ position: 'absolute', bottom: -50, left: -50, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', zIndex: 0 }} />

        <Box sx={{ maxWidth: 900, mx: 'auto', position: 'relative', zIndex: 2 }}>
          <Campaign sx={{ fontSize: 60, mb: 2, opacity: 0.9 }} />
          <Typography variant="h3" fontWeight={800} gutterBottom sx={{ fontSize: { xs: '2rem', md: '3rem' } }}>
            Public Grievance Portal
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.8, fontWeight: 400, maxWidth: 600, mx: 'auto' }}>
            Empowering citizens and industries to report issues directly to SIPCOT. Your feedback drives our excellence.
          </Typography>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3, mt: -6, pb: 10, position: 'relative', zIndex: 3 }}>
        
        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 6 }}>
          {stats.map((stat, i) => (
            <Grid item xs={12} sm={4} key={i}>
              <Card sx={{ 
                boxShadow: '0 10px 30px rgba(0,0,0,0.1)', 
                borderRadius: 4, 
                border: 'none',
                transition: 'transform 0.3s ease',
                position: 'relative',
                zIndex: 4,
                bgcolor: 'white',
                '&:hover': { transform: 'translateY(-5px)' }
              }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
                  <Box sx={{ 
                    width: 50, height: 50, borderRadius: 2, 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    bgcolor: `${stat.color}15`, color: stat.color, mr: 2
                  }}>
                    {stat.icon}
                  </Box>
                  <Box>
                    <Typography variant="h5" fontWeight={800} color={stat.color}>{stat.value}</Typography>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>{stat.label}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={4}>
          {/* Main Form Area */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ 
              p: { xs: 3, md: 5 }, 
              borderRadius: 5, 
              boxShadow: '0 20px 50px rgba(0,0,0,0.05)',
              border: '1px solid rgba(0,0,0,0.05)'
            }}>
              <Typography variant="h5" fontWeight={700} sx={{ mb: 4, display: 'flex', alignItems: 'center' }}>
                <ReportProblem sx={{ mr: 1.5, color: 'error.main' }} /> File a New Grievance
              </Typography>

              <form onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <TextField 
                      fullWidth label="Full Name" required 
                      variant="outlined" value={form.name} 
                      onChange={e => setForm({...form, name: e.target.value})} 
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField 
                      fullWidth label="Phone Number" required 
                      variant="outlined" value={form.phone} 
                      onChange={e => setForm({...form, phone: e.target.value})} 
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField 
                      fullWidth label="Industrial Park Location / Area" required 
                      variant="outlined" value={form.location} 
                      onChange={e => setForm({...form, location: e.target.value})} 
                      placeholder="e.g., Oragadam Phase II, Main Road"
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField 
                      fullWidth label="Describe the Issue" required 
                      multiline rows={5} variant="outlined" value={form.description} 
                      onChange={e => setForm({...form, description: e.target.value})} 
                      placeholder="Please provide as much detail as possible..."
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button 
                      type="submit" variant="contained" size="large" fullWidth
                      sx={{ 
                        py: 2, borderRadius: 3, fontWeight: 700, fontSize: '1.1rem',
                        background: 'linear-gradient(90deg, #1F4E79 0%, #2E7D32 100%)',
                        boxShadow: '0 8px 20px rgba(31, 78, 121, 0.3)',
                        '&:hover': { transform: 'scale(1.01)', boxShadow: '0 10px 25px rgba(31, 78, 121, 0.4)' }
                      }}
                    >
                      Submit Grievance
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </Paper>
          </Grid>

          {/* Sidebar Area */}
          <Grid item xs={12} md={4}>
            {/* Track Status Card */}
            <Card sx={{ borderRadius: 5, mb: 4, bgcolor: '#f8f9fa', border: '1px dashed #dee2e6' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <Info sx={{ mr: 1, color: 'primary.main' }} /> Track Existing Status
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Already filed a report? Enter your Reference ID to check the progress.
                </Typography>
                <TextField fullWidth size="small" placeholder="GRV-XXXX" sx={{ mb: 1, bgcolor: 'white' }} />
                <Button fullWidth variant="outlined" size="small" sx={{ borderRadius: 2 }}>Track Progress</Button>
              </CardContent>
            </Card>

            {/* FAQ Section */}
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2, px: 1 }}>Quick Help</Typography>
            <List disablePadding>
              {faqs.map((faq, i) => (
                <ListItem key={i} sx={{ 
                  flexDirection: 'column', alignItems: 'flex-start', 
                  mb: 2, p: 2, bgcolor: 'white', borderRadius: 3,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                }}>
                  <Typography variant="body2" fontWeight={700} gutterBottom color="primary">
                    {faq.q}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {faq.a}
                  </Typography>
                </ListItem>
              ))}
            </List>

            {/* Emergency Contact */}
            <Box sx={{ mt: 4, p: 3, borderRadius: 5, background: 'linear-gradient(135deg, #FFF 0%, #F1F8E9 100%)', border: '1px solid #C8E6C9' }}>
               <Typography variant="subtitle2" fontWeight={800} color="success.main" gutterBottom>Emergency Helpline</Typography>
               <Typography variant="h5" fontWeight={800} color="primary">1800-425-1234</Typography>
               <Typography variant="caption" color="text.secondary">Available 24/7 for industrial emergencies.</Typography>
            </Box>
          </Grid>
        </Grid>

        <Snackbar open={submitted} autoHideDuration={6000} onClose={() => setSubmitted(false)}>
          <Alert 
            onClose={() => setSubmitted(false)} 
            severity="success" 
            variant="filled" 
            sx={{ width: '100%', borderRadius: 3, fontWeight: 600, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}
          >
            Grievance submitted successfully. Reference ID: {refId}
          </Alert>
        </Snackbar>
      </Box>
    </>
  );
}
