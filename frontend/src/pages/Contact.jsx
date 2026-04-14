import React, { useState } from 'react';
import {
  Box, Container, Typography, Grid, Paper, TextField, Button, Stack,
  Divider, Chip, Card, CardContent, Snackbar, Alert
} from '@mui/material';
import { keyframes } from '@emotion/react';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SendIcon from '@mui/icons-material/Send';
import SubPageNav from '../components/SubPageNav';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
`;

const contactInfo = [
  { icon: <PhoneIcon />, title: 'Toll-Free Helpline', desc: '1800-425-XXXX', sub: 'Available 24/7', color: '#1F4E79' },
  { icon: <EmailIcon />, title: 'Technical Support', desc: 'thozhiporul-support@sipcot.tn.gov.in', sub: 'Response within 4 hours', color: '#2E7D32' },
  { icon: <LocationOnIcon />, title: 'Head Office', desc: 'NEXORA Projects Office, 19-A Rukmani Lakshmipathy Salai, Egmore, Chennai - 600008', sub: 'Mon-Sat 9AM-6PM', color: '#F57C00' },
  { icon: <SupportAgentIcon />, title: 'Industrial Liaison', desc: 'industry-help@sipcot.tn.gov.in', sub: 'For allotment queries', color: '#7B1FA2' },
];

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', companyId: '', park: '', subject: '', inquiry: '' });

  const handleChange = (field) => (e) => setFormData({ ...formData, [field]: e.target.value });

  const handleSubmit = () => {
    setSubmitted(true);
    setFormData({ name: '', email: '', companyId: '', park: '', subject: '', inquiry: '' });
  };

  return (
    <Box sx={{ bgcolor: '#f8fafc' }}>
      <SubPageNav />
      {/* Hero */}
      <Box sx={{
        pt: { xs: 16, md: 22 }, pb: { xs: 10, md: 14 }, textAlign: 'center', overflow: 'hidden',
        background: `linear-gradient(135deg, rgba(15,23,42,0.9) 0%, rgba(31,78,121,0.85) 50%, rgba(46,125,50,0.8) 100%),
          url("https://images.unsplash.com/photo-1574680077845-84af669f3c71?auto=format&fit=crop&q=80&w=2000")`,
        backgroundSize: 'cover', backgroundPosition: 'center', color: 'white',
      }}>
        <Container maxWidth="md">
          <Chip label="THOZHIPORUL SUPPORT" sx={{ mb: 3, bgcolor: 'rgba(255,255,255,0.12)', color: 'white', fontWeight: 800, letterSpacing: '0.15em', py: 2.5, border: '1px solid rgba(255,255,255,0.2)' }} />
          <Typography variant="h2" fontWeight={900} sx={{ mb: 3, letterSpacing: '-0.03em', animation: `${fadeIn} 0.8s ease-out`, fontSize: { xs: '2.2rem', md: '3.5rem' } }}>
            Get in Touch with THOZHIPORUL Support
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 300, opacity: 0.85, lineHeight: 1.8, maxWidth: 650, mx: 'auto' }}>
            Technical queries, data submission issues, or platform assistance - our dedicated team is here to help.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <Grid container spacing={6}>
          {/* Contact Cards */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Typography variant="h4" fontWeight={800} gutterBottom sx={{ mb: 1 }}>
              THOZHIPORUL <Box component="span" sx={{ color: 'primary.main' }}>Helpdesk</Box>
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, lineHeight: 1.8 }}>
              For industry-specific data queries or technical platform issues, reach out through any channel below.
            </Typography>

            <Stack spacing={2.5}>
              {contactInfo.map((item, idx) => (
                <Card key={idx} elevation={0} sx={{
                  transition: 'all 0.3s ease',
                  '&:hover': { transform: 'translateX(8px)', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' },
                }}>
                  <CardContent sx={{ display: 'flex', gap: 2, py: 2.5 }}>
                    <Box sx={{
                      width: 48, height: 48, borderRadius: 3, flexShrink: 0,
                      bgcolor: `${item.color}10`, color: item.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {item.icon}
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={700}>{item.title}</Typography>
                      <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>{item.desc}</Typography>
                      <Typography variant="caption" color="text.secondary">{item.sub}</Typography>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>

            <Paper sx={{ p: 2.5, mt: 3, borderRadius: 3, bgcolor: '#f0f7ff', border: '1px solid #dbeafe', display: 'flex', alignItems: 'center', gap: 2 }}>
              <AccessTimeIcon sx={{ color: '#1F4E79' }} />
              <Box>
                <Typography variant="body2" fontWeight={700}>Average Response Time</Typography>
                <Typography variant="caption" color="text.secondary">4-6 business hours for all inquiries</Typography>
              </Box>
            </Paper>
          </Grid>

          {/* Contact Form */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Paper sx={{ p: { xs: 3, md: 5 }, borderRadius: 4, boxShadow: '0 8px 32px rgba(0,0,0,0.06)' }}>
              <Typography variant="h5" fontWeight={800} gutterBottom>Submit a Digital Inquiry</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Fill out the form below and our support team will respond within 4-6 business hours.
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Grid container spacing={2.5}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField fullWidth label="Full Name" value={formData.name} onChange={handleChange('name')} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField fullWidth label="Official Email" type="email" value={formData.email} onChange={handleChange('email')} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField fullWidth label="Company ID" placeholder="E.g., ABC-123" value={formData.companyId} onChange={handleChange('companyId')} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField fullWidth label="NEXORA Park" value={formData.park} onChange={handleChange('park')} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField fullWidth label="Subject" value={formData.subject} onChange={handleChange('subject')} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField fullWidth label="Detailed Inquiry" multiline rows={4} value={formData.inquiry} onChange={handleChange('inquiry')} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Button variant="contained" size="large" fullWidth endIcon={<SendIcon />}
                    onClick={handleSubmit} disabled={submitted}
                    sx={{ py: 1.5, fontWeight: 700, borderRadius: 3, background: submitted ? undefined : 'linear-gradient(135deg, #1F4E79, #2E7D32)' }}>
                    {submitted ? 'Request Submitted!' : 'Send Support Request'}
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      <Snackbar open={submitted} autoHideDuration={5000} onClose={() => setSubmitted(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSubmitted(false)} severity="success" variant="filled">
          Your support request has been submitted! Our THOZHIPORUL team will respond within 4-6 business hours.
        </Alert>
      </Snackbar>
    </Box>
  );
}
