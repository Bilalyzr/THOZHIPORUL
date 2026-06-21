import React from 'react';
import { Box, Container, Grid, Typography, Link, Stack, Divider, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SecurityIcon from '@mui/icons-material/Security';
import logoTransparent from '../assets/logo-transparent.png';

const platformLinks = [
  { label: 'Home', path: '/home' },
  { label: 'About Platform', path: '/about' },
  { label: 'Features', path: '/features' },
  { label: 'Pricing Plans', path: '/subscriptions' },
  { label: 'Industrial Parks', path: '/parks' },
];

const resourcesLinks = [
  { label: 'Public Grievance', path: '/grievance' },
  { label: 'Contact Helpdesk', path: '/contact' },
  { label: 'Knowledge Hub', path: '/features' },
  { label: 'Developer API', path: '/contact' },
];

export default function UnifiedFooter() {
  const navigate = useNavigate();

  return (
    <Box 
      component="footer"
      sx={{ 
        position: 'relative',
        bgcolor: '#0B0F19', 
        color: '#E2E8F0',
        pt: { xs: 8, md: 12 }, 
        pb: 6,
        overflow: 'hidden',
        borderTop: '2px solid',
        borderImage: 'linear-gradient(90deg, #1F4E79 0%, #2E7D32 50%, #1F4E79 100%) 1',
      }}
    >
      {/* Decorative Radial glows */}
      <Box sx={{
        position: 'absolute',
        top: '-10%',
        right: '5%',
        width: 400,
        height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(46,125,50,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <Box sx={{
        position: 'absolute',
        bottom: '-10%',
        left: '5%',
        width: 400,
        height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(31,78,121,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
        <Grid container spacing={{ xs: 4, md: 6 }} sx={{ mb: 8 }}>
          
          {/* Brand Column */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Box 
              sx={{ display: 'flex', alignItems: 'center', mb: 3.5, gap: 2, cursor: 'pointer' }}
              onClick={() => navigate('/home')}
            >
              <Box sx={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={logoTransparent} alt="THOZHIRPORUL Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={900} sx={{
                  lineHeight: 1, 
                  letterSpacing: '-0.02em',
                  background: 'linear-gradient(90deg, #81C784, #4CAF50)',
                  WebkitBackgroundClip: 'text', 
                  WebkitTextFillColor: 'transparent',
                  fontSize: '1.35rem',
                }}>
                  THOZHIRPORUL
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.12em' }}>
                  BY NEXORA
                </Typography>
              </Box>
            </Box>
            <Typography sx={{ color: '#94A3B8', lineHeight: 1.8, fontSize: '0.92rem', mb: 3.5, pr: { md: 4 } }}>
              The Smart Industrial Monitoring System is Tamil Nadu's unified digital framework for industrial governance, transparency, and data-driven growth.
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <SecurityIcon sx={{ color: '#81C784', fontSize: 20 }} />
              <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                SSL Encrypted & Secure Govt. Infrastructure
              </Typography>
            </Box>
          </Grid>

          {/* Platform Links Column */}
          <Grid size={{ xs: 6, md: 2 }}>
            <Typography 
              fontWeight={800} 
              sx={{ 
                mb: 3.5, 
                fontSize: '0.88rem', 
                color: 'white', 
                letterSpacing: '0.05em', 
                textTransform: 'uppercase' 
              }}
            >
              Platform
            </Typography>
            <Stack spacing={2}>
              {platformLinks.map((item) => (
                <Link 
                  key={item.label} 
                  onClick={() => navigate(item.path)} 
                  sx={{ 
                    cursor: 'pointer', 
                    color: '#94A3B8', 
                    textDecoration: 'none', 
                    fontWeight: 500, 
                    fontSize: '0.9rem', 
                    transition: 'all 0.3s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    '&:hover': { 
                      color: '#81C784',
                      transform: 'translateX(4px)',
                    } 
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </Stack>
          </Grid>

          {/* Resources Column */}
          <Grid size={{ xs: 6, md: 2 }}>
            <Typography 
              fontWeight={800} 
              sx={{ 
                mb: 3.5, 
                fontSize: '0.88rem', 
                color: 'white', 
                letterSpacing: '0.05em', 
                textTransform: 'uppercase' 
              }}
            >
              Resources
            </Typography>
            <Stack spacing={2}>
              {resourcesLinks.map((item) => (
                <Link 
                  key={item.label} 
                  onClick={() => navigate(item.path)} 
                  sx={{ 
                    cursor: 'pointer', 
                    color: '#94A3B8', 
                    textDecoration: 'none', 
                    fontWeight: 500, 
                    fontSize: '0.9rem', 
                    transition: 'all 0.3s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    '&:hover': { 
                      color: '#81C784',
                      transform: 'translateX(4px)',
                    } 
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </Stack>
          </Grid>

          {/* Official Support Card */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Typography 
              fontWeight={800} 
              sx={{ 
                mb: 3.5, 
                fontSize: '0.88rem', 
                color: 'white', 
                letterSpacing: '0.05em', 
                textTransform: 'uppercase' 
              }}
            >
              Official Support
            </Typography>
            <Paper 
              variant="outlined" 
              sx={{ 
                p: 3, 
                borderRadius: 4, 
                bgcolor: 'rgba(255, 255, 255, 0.02)', 
                borderColor: 'rgba(255, 255, 255, 0.06)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  borderColor: 'rgba(76, 175, 80, 0.3)',
                  bgcolor: 'rgba(255, 255, 255, 0.04)',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
                }
              }}
            >
              <Stack spacing={2.5}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <PhoneIcon sx={{ color: '#81C784', mt: 0.3, fontSize: 20 }} />
                  <Box>
                    <Typography variant="body2" sx={{ color: 'white', fontWeight: 700 }}>
                      Helpdesk: 1800-425-XXXX
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mt: 0.2 }}>
                      Toll-free Support (9:00 AM - 6:00 PM)
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <EmailIcon sx={{ color: '#81C784', mt: 0.3, fontSize: 20 }} />
                  <Box>
                    <Typography variant="body2" sx={{ color: 'white', fontWeight: 700 }}>
                      thozhiporul-support@sipcot.tn.gov.in
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mt: 0.2 }}>
                      Official Email Queries
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <AccessTimeIcon sx={{ color: '#81C784', mt: 0.3, fontSize: 20 }} />
                  <Box>
                    <Typography variant="caption" sx={{ color: '#64748B', display: 'block', fontWeight: 600 }}>
                      SYSTEM MAINTENANCE WINDOW
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mt: 0.2 }}>
                      Every Sunday 02:00 AM - 04:00 AM IST
                    </Typography>
                  </Box>
                </Box>
              </Stack>
            </Paper>
          </Grid>

        </Grid>

        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)', mb: 4 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 500 }}>
            &copy; 2026 NEXORA, Government of Tamil Nadu. THOZHIRPORUL Platform. All rights reserved.
          </Typography>
          <Stack direction="row" spacing={3}>
            <Link 
              onClick={() => navigate('/about')} 
              sx={{ 
                cursor: 'pointer', 
                color: '#64748B', 
                textDecoration: 'none', 
                fontSize: '0.78rem', 
                fontWeight: 600,
                transition: 'color 0.2s',
                '&:hover': { color: 'white' } 
              }}
            >
              Privacy Policy
            </Link>
            <Link 
              onClick={() => navigate('/about')} 
              sx={{ 
                cursor: 'pointer', 
                color: '#64748B', 
                textDecoration: 'none', 
                fontSize: '0.78rem', 
                fontWeight: 600,
                transition: 'color 0.2s',
                '&:hover': { color: 'white' } 
              }}
            >
              Terms of Service
            </Link>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}
