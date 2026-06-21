import React, { useState } from 'react';
import {
  Box, Container, Typography, Grid, Paper, TextField, Button, Stack,
  Chip, Card, CardContent, Snackbar, Alert, Fade, Divider
} from '@mui/material';
import { keyframes } from '@emotion/react';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SendIcon from '@mui/icons-material/Send';
import HeadsetMicIcon from '@mui/icons-material/HeadsetMic';
import ContactMailIcon from '@mui/icons-material/ContactMail';
import UnifiedNav from '../components/UnifiedNav';
import UnifiedFooter from '../components/UnifiedFooter';
import PageHero from '../components/PageHero';

const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
`;

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
`;

const slideInLeft = keyframes`
  from { opacity: 0; transform: translateX(-30px); }
  to { opacity: 1; transform: translateX(0); }
`;

const slideInRight = keyframes`
  from { opacity: 0; transform: translateX(30px); }
  to { opacity: 1; transform: translateX(0); }
`;

const sectionPattern = {
  backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.04) 1px, transparent 0)',
  backgroundSize: '28px 28px',
};

const contactInfo = [
  { icon: <PhoneIcon sx={{ fontSize: 28 }} />, title: 'Toll-Free Helpline', desc: '1800-425-XXXX', sub: 'Available 24/7', color: '#2E7D32' },
  { icon: <EmailIcon sx={{ fontSize: 28 }} />, title: 'Technical Support', desc: 'thozhiporul-support@sipcot.tn.gov.in', sub: 'Response within 4 hours', color: '#1F4E79' },
  { icon: <LocationOnIcon sx={{ fontSize: 28 }} />, title: 'Head Office', desc: '19-A Rukmani Lakshmipathy Salai, Egmore, Chennai', sub: 'Mon-Sat 9AM-6PM', color: '#2E7D32' },
  { icon: <SupportAgentIcon sx={{ fontSize: 28 }} />, title: 'Industrial Liaison', desc: 'industry-help@sipcot.tn.gov.in', sub: 'For allotment queries', color: '#1F4E79' },
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
      <UnifiedNav transparent={false} />

      {/* ── Hero ── */}
      <PageHero
        icon={<HeadsetMicIcon />}
        label="Contact Support"
        title="Get in Touch with"
        titleHighlight="THOZHIRPORUL"
        subtitle="Technical queries, data submission issues, or platform assistance — our dedicated team is here to help you succeed."
        accentColor="#2E7D32"
        accentColor2="#1F4E79"
        bgImage="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&q=60&w=1600"
      />

      {/* ── Contact Channels + Form ── */}
      <Box sx={{ bgcolor: '#ffffff', py: 14, ...sectionPattern }}>
        <Container maxWidth="lg">
          <Grid container spacing={6}>
            {/* Contact info cards */}
            <Grid size={{ xs: 12, md: 5 }}>
              <Box sx={{ animation: `${slideInLeft} 0.8s ease-out` }}>
                <Chip
                  label="CONTACT CHANNELS"
                  sx={{ mb: 3, background: 'linear-gradient(135deg, #1F4E79, #2E7D32)', color: 'white', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.15em', px: 2.5, py: 1, borderRadius: '50px' }}
                />
                <Typography variant="h5" fontWeight={900} sx={{ mb: 5, fontSize: '1.5rem', letterSpacing: '-0.01em' }}>
                  Reach out through any channel
                </Typography>

                <Stack spacing={3}>
                  {contactInfo.map((item, idx) => (
                    <Fade key={idx} in timeout={300 + idx * 100}>
                      <Card
                        elevation={0}
                        sx={{
                          border: '1px solid #e2e8f0',
                          borderRadius: 3.5,
                          bgcolor: 'rgba(255,255,255,0.9)',
                          backdropFilter: 'blur(12px)',
                          boxShadow: '0 2px 16px rgba(0,0,0,0.04)',
                          transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                          animation: `${fadeInUp} 0.6s ease-out ${idx * 0.12}s both`,
                          '&:hover': { transform: 'translateX(8px)', boxShadow: `0 12px 32px ${item.color}18`, borderColor: `${item.color}40` },
                        }}
                      >
                        <CardContent sx={{ display: 'flex', gap: 3, p: 3 }}>
                          <Box sx={{
                            width: 54, height: 54, flexShrink: 0, borderRadius: 2.5,
                            background: `linear-gradient(135deg, ${item.color}18, ${item.color}08)`,
                            color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: `0 4px 12px ${item.color}20`,
                            transition: 'all 0.3s ease', '&:hover': { transform: 'scale(1.1) rotate(5deg)' }
                          }}>
                            {item.icon}
                          </Box>
                          <Box>
                            <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 0.5 }}>{item.title}</Typography>
                            <Typography variant="body2" fontWeight={600} color="text.primary" sx={{ mb: 0.25, wordBreak: 'break-all' }}>{item.desc}</Typography>
                            <Typography variant="caption" fontWeight={600} color="text.secondary">{item.sub}</Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Fade>
                  ))}
                </Stack>
              </Box>
            </Grid>

            {/* Form */}
            <Grid size={{ xs: 12, md: 7 }}>
              <Box sx={{ animation: `${slideInRight} 0.8s ease-out` }}>
                <Chip
                  label="SEND A MESSAGE"
                  sx={{ mb: 3, background: 'linear-gradient(135deg, #1F4E79, #2E7D32)', color: 'white', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.15em', px: 2.5, py: 1, borderRadius: '50px' }}
                />
                <Typography variant="h5" fontWeight={900} sx={{ mb: 5, fontSize: '1.5rem', letterSpacing: '-0.01em' }}>
                  Fill out the form below
                </Typography>

                <Card
                  elevation={0}
                  sx={{
                    p: 4, borderRadius: 4,
                    bgcolor: 'rgba(255,255,255,0.9)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
                    transition: 'all 0.3s ease',
                    '&:hover': { boxShadow: '0 16px 56px rgba(0,0,0,0.1)' },
                  }}
                >
                  <Grid container spacing={3}>
                    {[
                      { label: 'Your Name', field: 'name', xs: 12 },
                      { label: 'Email Address', field: 'email', xs: 12 },
                    ].map(({ label, field, xs }) => (
                      <Grid key={field} size={xs}>
                        <TextField
                          fullWidth label={label} value={formData[field]}
                          onChange={handleChange(field)} variant="outlined" size="small"
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#2E7D32' }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#2E7D32' } } }}
                        />
                      </Grid>
                    ))}
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth label="Company ID (Optional)" value={formData.companyId}
                        onChange={handleChange('companyId')} variant="outlined" size="small"
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#2E7D32' }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#2E7D32' } } }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth label="Industrial Park" value={formData.park}
                        onChange={handleChange('park')} variant="outlined" size="small"
                        select SelectProps={{ native: true }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#2E7D32' }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#2E7D32' } } }}
                      >
                        <option value="">Select Park</option>
                        <option value="Oragadam">Oragadam</option>
                        <option value="Sriperumbudur">Sriperumbudur</option>
                        <option value="Hosur">Hosur</option>
                        <option value="Siruseri">Siruseri</option>
                      </TextField>
                    </Grid>
                    <Grid size={12}>
                      <TextField
                        fullWidth label="Subject" value={formData.subject}
                        onChange={handleChange('subject')} variant="outlined" size="small"
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#2E7D32' }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#2E7D32' } } }}
                      />
                    </Grid>
                    <Grid size={12}>
                      <TextField
                        fullWidth label="Your Inquiry" value={formData.inquiry}
                        onChange={handleChange('inquiry')} variant="outlined"
                        multiline rows={4}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#2E7D32' }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#2E7D32' } } }}
                      />
                    </Grid>
                    <Grid size={12}>
                      <Button
                        fullWidth variant="contained" size="large"
                        onClick={handleSubmit} endIcon={<SendIcon />}
                        sx={{
                          py: 2, fontWeight: 700,
                          background: 'linear-gradient(135deg, #1F4E79, #2E7D32)',
                          borderRadius: 3, fontSize: '1rem',
                          boxShadow: '0 8px 24px rgba(31,78,121,0.35)',
                          transition: 'all 0.3s ease',
                          '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 16px 40px rgba(46,125,50,0.45)' },
                        }}
                      >
                        Submit Inquiry
                      </Button>
                    </Grid>
                  </Grid>
                </Card>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ── Office Hours ── */}
      <Box sx={{ bgcolor: '#f1f5f9', py: 10, position: 'relative', overflow: 'hidden' }}>
        <Box sx={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 20% 50%, rgba(46,125,50,0.06) 0%, transparent 55%), radial-gradient(ellipse at 80% 50%, rgba(31,78,121,0.06) 0%, transparent 55%)',
          pointerEvents: 'none',
        }} />
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Card
            elevation={0}
            sx={{
              p: 4, borderRadius: 4,
              bgcolor: 'rgba(255,255,255,0.88)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.9)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.07)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: 4,
              animation: `${fadeInUp} 0.8s ease-out`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Box sx={{ width: 60, height: 60, borderRadius: 3, background: 'linear-gradient(135deg, rgba(31,78,121,0.12), rgba(31,78,121,0.06))', color: '#1F4E79', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AccessTimeIcon sx={{ fontSize: 34 }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={800} sx={{ mb: 0.5 }}>Office Hours</Typography>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>Monday – Saturday, 9:00 AM – 6:00 PM IST</Typography>
              </Box>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              For urgent matters outside office hours, please use the grievance portal →
            </Typography>
          </Card>
        </Container>
      </Box>

      {/* ── CTA Band ── */}
      <Box sx={{
        py: 16,
        background: 'linear-gradient(135deg, #060d1a 0%, #0a1e14 40%, #0d2435 100%)',
        color: 'white', textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        <Box sx={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 30% 70%, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '40px 40px', opacity: 0.6, pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', top: '20%', right: '8%', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(46,125,50,0.3) 0%, transparent 65%)', filter: 'blur(60px)', pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', bottom: '10%', left: '5%', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(31,78,121,0.35) 0%, transparent 65%)', filter: 'blur(55px)', pointerEvents: 'none' }} />

        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
          <ContactMailIcon sx={{ fontSize: 64, mb: 3, opacity: 0.9, animation: `${float} 4s ease-in-out infinite` }} />
          <Typography variant="h3" fontWeight={900} sx={{ mb: 3, fontSize: { xs: '1.75rem', md: '2.75rem' }, letterSpacing: '-0.02em' }}>
            Need Immediate Assistance?
          </Typography>
          <Typography variant="h6" sx={{ mb: 6, opacity: 0.8, fontWeight: 300, fontSize: '1.1rem', lineHeight: 1.7 }}>
            Our support team is ready to help you resolve any issues or answer your questions
          </Typography>
          <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained" size="large"
              onClick={() => window.location.href = 'mailto:thozhiporul-support@sipcot.tn.gov.in'}
              startIcon={<EmailIcon />}
              sx={{
                px: 4, py: 2, fontWeight: 700,
                bgcolor: 'white', color: '#2E7D32',
                borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                transition: 'all 0.3s ease',
                '&:hover': { bgcolor: '#f1f8f2', transform: 'translateY(-4px)', boxShadow: '0 16px 48px rgba(0,0,0,0.4)' },
              }}
            >
              Email Support
            </Button>
            <Button
              variant="outlined" size="large"
              onClick={() => window.location.href = 'tel:1800-425-XXXX'}
              startIcon={<PhoneIcon />}
              sx={{
                px: 4, py: 2, fontWeight: 700,
                borderColor: 'rgba(255,255,255,0.6)', color: 'white',
                borderRadius: 3, borderWidth: 2,
                transition: 'all 0.3s ease',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', transform: 'translateY(-4px)', borderColor: 'white' },
              }}
            >
              Call Helpline
            </Button>
          </Box>
        </Container>
      </Box>

      <UnifiedFooter />

      <Snackbar open={submitted} autoHideDuration={6000} onClose={() => setSubmitted(false)}>
        <Alert severity="success" onClose={() => setSubmitted(false)} sx={{ borderRadius: 3 }}>
          Your inquiry has been submitted successfully. We'll respond within 24 hours.
        </Alert>
      </Snackbar>
    </Box>
  );
}
