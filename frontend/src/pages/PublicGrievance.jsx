import { useState } from 'react';
import {
  Box, Typography, Paper, TextField, Button, Grid, Alert,
  Snackbar, Card, CardContent, Divider, List, ListItem,
  ListItemIcon, ListItemText, Container, Chip, Stack, Fade
} from '@mui/material';
import { keyframes } from '@emotion/react';
import {
  Campaign, ReportProblem, CheckCircle, HourglassEmpty,
  Speed, HelpOutline, AssignmentTurnedIn
} from '@mui/icons-material';
import UnifiedNav from '../components/UnifiedNav';
import UnifiedFooter from '../components/UnifiedFooter';
import PageHero from '../components/PageHero';


const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
`;

const sectionPattern = {
  backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.04) 1px, transparent 0)',
  backgroundSize: '28px 28px',
};

import { grievanceService } from '../services/api';

export default function PublicGrievance() {
  const [form, setForm] = useState({ name: '', phone: '', location: '', description: '' });
  const [submitted, setSubmitted] = useState(false);
  const [refId, setRefId] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const title = form.description.substring(0, 50) + (form.description.length > 50 ? '...' : '');
      const response = await grievanceService.create({
        title,
        location: form.location,
        name: form.name,
        description: `Phone: ${form.phone}. Details: ${form.description}`
      });
      setRefId(`GRV-${response.data.id || Math.floor(Math.random() * 10000)}`);
      setSubmitted(true);
      setForm({ name: '', phone: '', location: '', description: '' });
    } catch (err) {
      console.error('Failed to submit grievance:', err);
    }
  };

  const stats = [
    { label: 'Grievances Resolved', value: '4,850+', icon: <AssignmentTurnedIn sx={{ fontSize: 30 }} />, color: '#2E7D32' },
    { label: 'Active Inquiries', value: '124', icon: <HourglassEmpty sx={{ fontSize: 30 }} />, color: '#1F4E79' },
    { label: 'Avg. Response Time', value: '24 hrs', icon: <Speed sx={{ fontSize: 30 }} />, color: '#2E7D32' },
  ];

  const faqs = [
    { q: 'How long does it take?', a: 'Most infrastructure issues are addressed within 48 working hours.' },
    { q: 'Can I report anonymously?', a: 'Yes, but providing contact info helps us reach out for more details.' },
    { q: 'Who reviews my report?', a: 'Assigned to the relevant Industrial Park Officer and SIPCOT Head Office.' },
  ];

  return (
    <>
      <UnifiedNav transparent={false} />

      {/* ── Hero ── */}
      <PageHero
        icon={<Campaign />}
        label="Public Grievance Portal"
        title="Report, Track &"
        titleHighlight="Resolve Issues"
        subtitle="Report infrastructure issues, service delays, or other concerns directly to SIPCOT. Your feedback drives our excellence."
        accentColor="#2E7D32"
        accentColor2="#1F4E79"
        bgImage="https://images.unsplash.com/photo-1573166953836-06864dc83b06?auto=format&fit=crop&q=60&w=1600"
      />

      {/* ── Floating Stat Cards ── */}
      <Box sx={{ bgcolor: '#f8fafc', pt: 0, pb: 0 }}>
        <Container maxWidth="lg">
          <Grid container spacing={3} sx={{ mt: { xs: -5, md: -8 }, position: 'relative', zIndex: 2, pb: 2 }}>
            {stats.map((stat, i) => (
              <Grid key={i} size={{ xs: 12, sm: 4 }}>
                <Fade in timeout={300 + i * 120}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3.5, borderRadius: 4, textAlign: 'center',
                      bgcolor: 'rgba(255,255,255,0.92)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255,255,255,0.8)',
                      boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
                      transition: 'all 0.3s ease',
                      animation: `${fadeInUp} 0.5s ease-out ${i * 0.1}s both`,
                      '&:hover': { transform: 'translateY(-8px)', boxShadow: `0 20px 48px ${stat.color}20`, borderColor: `${stat.color}30` },
                    }}
                  >
                    <Box sx={{ color: stat.color, mb: 1.5, display: 'flex', justifyContent: 'center' }}>
                      <Box sx={{ p: 1.5, borderRadius: 2.5, background: `linear-gradient(135deg, ${stat.color}18, ${stat.color}08)`, display: 'inline-flex', boxShadow: `0 4px 12px ${stat.color}20` }}>
                        {stat.icon}
                      </Box>
                    </Box>
                    <Typography variant="h4" fontWeight={800} color={stat.color} sx={{ mb: 0.5 }}>{stat.value}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{stat.label}</Typography>
                  </Paper>
                </Fade>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── Main Content ── */}
      <Box sx={{ bgcolor: '#ffffff', py: 14, ...sectionPattern }}>
        <Container maxWidth="lg">
          <Grid container spacing={6}>
            {/* Form */}
            <Grid size={{ xs: 12, md: 7 }}>
              <Box sx={{ animation: `${fadeInUp} 0.6s ease-out` }}>
                <Chip
                  label="SUBMIT GRIEVANCE"
                  sx={{ mb: 3, background: 'linear-gradient(135deg, #1F4E79, #2E7D32)', color: 'white', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.15em', px: 2.5, py: 1, borderRadius: '50px' }}
                />
                <Typography variant="h5" fontWeight={900} sx={{ mb: 5, fontSize: '1.5rem', letterSpacing: '-0.01em' }}>
                  Fill in the details below
                </Typography>

                <Card
                  elevation={0}
                  sx={{
                    borderRadius: 4,
                    bgcolor: 'rgba(255,255,255,0.9)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
                    overflow: 'hidden',
                    '&:hover': { boxShadow: '0 16px 56px rgba(0,0,0,0.1)' },
                    transition: 'all 0.3s ease',
                  }}
                >
                  <Box sx={{ height: 5, background: 'linear-gradient(90deg, #1F4E79, #2E7D32, #1F4E79)', backgroundSize: '200% 100%' }} />
                  <CardContent sx={{ p: 4 }}>
                    {submitted ? (
                      <Box sx={{ textAlign: 'center', py: 6 }}>
                        <Box sx={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(46,125,50,0.15), rgba(46,125,50,0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3, boxShadow: '0 8px 24px rgba(46,125,50,0.2)' }}>
                          <CheckCircle sx={{ fontSize: 48, color: '#2E7D32' }} />
                        </Box>
                        <Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>Grievance Submitted!</Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                          Your reference ID: <Box component="span" sx={{ fontWeight: 800, color: '#2E7D32' }}>{refId}</Box>
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                          We will review and respond within 48 working hours.
                        </Typography>
                        <Button
                          variant="outlined" borderRadius={3}
                          sx={{ borderColor: '#2E7D32', color: '#2E7D32', borderWidth: 2, fontWeight: 700, borderRadius: 3, '&:hover': { bgcolor: '#f1f8f2' } }}
                          onClick={() => setSubmitted(false)}
                        >
                          Submit Another
                        </Button>
                      </Box>
                    ) : (
                      <form onSubmit={handleSubmit}>
                        <Grid container spacing={3}>
                          <Grid size={12}>
                            <TextField
                              fullWidth label="Your Name" value={form.name}
                              onChange={(e) => setForm({ ...form, name: e.target.value })}
                              variant="outlined" size="small" required
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#2E7D32' } } }}
                            />
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                              fullWidth label="Phone Number" value={form.phone}
                              onChange={(e) => setForm({ ...form, phone: e.target.value })}
                              variant="outlined" size="small" required
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                            />
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                              fullWidth label="Location / Park" value={form.location}
                              onChange={(e) => setForm({ ...form, location: e.target.value })}
                              variant="outlined" size="small" required
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                            />
                          </Grid>
                          <Grid size={12}>
                            <TextField
                              fullWidth label="Describe the Issue" value={form.description}
                              onChange={(e) => setForm({ ...form, description: e.target.value })}
                              variant="outlined" multiline rows={5} required
                              placeholder="Please provide details about the issue, including location and any relevant information..."
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                            />
                          </Grid>
                          <Grid size={12}>
                            <Button
                              fullWidth type="submit" variant="contained" size="large"
                              startIcon={<ReportProblem />}
                              sx={{
                                py: 1.8, fontWeight: 700,
                                background: 'linear-gradient(135deg, #1F4E79, #2E7D32)',
                                borderRadius: 3, fontSize: '1rem',
                                boxShadow: '0 8px 24px rgba(31,78,121,0.4)',
                                transition: 'all 0.3s ease',
                                '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 16px 40px rgba(46,125,50,0.5)' },
                              }}
                            >
                              Submit Grievance
                            </Button>
                          </Grid>
                        </Grid>
                      </form>
                    )}
                  </CardContent>
                </Card>
              </Box>
            </Grid>

            {/* FAQ */}
            <Grid size={{ xs: 12, md: 5 }}>
              <Box sx={{ animation: `${fadeInUp} 0.6s ease-out 0.2s both` }}>
                <Chip
                  label="FAQ"
                  sx={{ mb: 3, background: 'linear-gradient(135deg, #1F4E79, #2E7D32)', color: 'white', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.15em', px: 2.5, py: 1, borderRadius: '50px' }}
                />
                <Typography variant="h5" fontWeight={900} sx={{ mb: 5, fontSize: '1.5rem', letterSpacing: '-0.01em' }}>
                  Common Questions
                </Typography>

                <Stack spacing={2.5}>
                  {faqs.map((faq, idx) => (
                    <Card
                      key={idx} elevation={0}
                      sx={{
                        borderRadius: 3.5,
                        bgcolor: 'rgba(255,255,255,0.9)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid #e2e8f0',
                        borderLeft: '4px solid #2E7D32',
                        boxShadow: '0 2px 16px rgba(0,0,0,0.04)',
                        transition: 'all 0.25s ease',
                        animation: `${fadeInUp} 0.5s ease-out ${0.3 + idx * 0.1}s both`,
                        '&:hover': { transform: 'translateX(6px)', boxShadow: '0 8px 32px rgba(46,125,50,0.12)', borderColor: '#2E7D32' },
                      }}
                    >
                      <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                          <HelpOutline sx={{ color: '#2E7D32', fontSize: 20, flexShrink: 0, mt: 0.2 }} />
                          <Typography variant="subtitle2" fontWeight={800} sx={{ lineHeight: 1.5 }}>{faq.q}</Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ ml: 4.5, lineHeight: 1.7 }}>{faq.a}</Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>

                {/* Info card */}
                <Card
                  elevation={0}
                  sx={{
                    mt: 4, borderRadius: 3.5, p: 3,
                    bgcolor: 'rgba(46,125,50,0.05)',
                    border: '1px solid rgba(46,125,50,0.2)',
                    boxShadow: 'none',
                  }}
                >
                  <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5, color: '#2E7D32' }}>
                    How Grievance Redressal Works
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.75 }}>
                    Upon submission, your grievance is assigned a unique reference ID and routed to the concerned Industrial Park Officer. Most grievances are resolved within 48 working hours.
                  </Typography>
                </Card>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <UnifiedFooter />
    </>
  );
}
