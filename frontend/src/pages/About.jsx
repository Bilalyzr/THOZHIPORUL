import React from 'react';
import {
  Box, Container, Typography, Grid, Paper, Button, Chip, Stack, Divider, Card, CardContent
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { keyframes } from '@emotion/react';
import SecurityIcon from '@mui/icons-material/Security';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SpeedIcon from '@mui/icons-material/Speed';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SubPageNav from '../components/SubPageNav';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
`;

export default function About() {
  const navigate = useNavigate();

  return (
    <Box sx={{ bgcolor: '#f8fafc' }}>
      <SubPageNav />
      {/* Hero */}
      <Box sx={{
        position: 'relative', pt: { xs: 16, md: 22 }, pb: { xs: 10, md: 16 }, textAlign: 'center', overflow: 'hidden',
        background: `linear-gradient(135deg, rgba(15,23,42,0.9) 0%, rgba(31,78,121,0.85) 50%, rgba(46,125,50,0.8) 100%),
          url("https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=2000")`,
        backgroundSize: 'cover', backgroundPosition: 'center', color: 'white',
      }}>
        <Box sx={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`, backgroundSize: '30px 30px' }} />
        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
          <Chip label="ABOUT THOZHIRPORUL" sx={{ mb: 3, bgcolor: 'rgba(255,255,255,0.12)', color: 'white', fontWeight: 800, letterSpacing: '0.15em', py: 2.5, px: 1, border: '1px solid rgba(255,255,255,0.2)' }} />
          <Typography variant="h2" fontWeight={900} sx={{ mb: 3, letterSpacing: '-0.03em', animation: `${fadeIn} 0.8s ease-out`, fontSize: { xs: '2.2rem', md: '3.5rem' } }}>
            The Intelligence Behind Tamil Nadu's Industrial Growth
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 300, opacity: 0.85, lineHeight: 1.8, maxWidth: 700, mx: 'auto', animation: `${fadeIn} 1s ease-out` }}>
            THOZHIRPORUL transforms how government monitors, industries report, and stakeholders collaborate - all through one unified digital platform by NEXORA.
          </Typography>
        </Container>
      </Box>

      {/* Vision Section */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 14 } }}>
        <Grid container spacing={8} alignItems="center">
          <Grid size={{ xs: 12, md: 6 }}>
            <Chip label="OUR VISION" color="primary" sx={{ mb: 2, fontWeight: 800, letterSpacing: '0.1em' }} />
            <Typography variant="h3" fontWeight={900} sx={{ mb: 3, letterSpacing: '-0.02em' }}>
              A Unified Digital Backbone for{' '}
              <Box component="span" sx={{ color: 'secondary.main' }}>Industrial Excellence</Box>
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 2, fontSize: '1.05rem' }}>
              The Smart Industrial Monitoring System (THOZHIRPORUL) is NEXORA's flagship digital initiative to replace fragmented
              manual reporting with a real-time, data-driven industrial operating system.
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, lineHeight: 2, fontSize: '1.05rem' }}>
              Built for government officers who need state-wide visibility, and industry allottees who need compliance clarity -
              THOZHIRPORUL bridges the information gap that has historically slowed industrial governance in Tamil Nadu.
            </Typography>
            <Button variant="contained" size="large" onClick={() => navigate('/role-selection')} endIcon={<ArrowForwardIcon />}
              sx={{ borderRadius: 3, px: 4, py: 1.5, fontWeight: 700 }}>
              Access THOZHIRPORUL Portal
            </Button>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ position: 'relative' }}>
              <Box component="img" src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800"
                sx={{ width: '100%', borderRadius: 5, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }} />
              <Paper sx={{
                position: 'absolute', bottom: -20, left: -20, p: 3, borderRadius: 4,
                background: 'linear-gradient(135deg, #1F4E79, #2E7D32)', color: 'white',
                boxShadow: '0 12px 32px rgba(31,78,121,0.3)',
              }}>
                <Typography variant="h3" fontWeight={900}>8+</Typography>
                <Typography variant="body2" fontWeight={600}>Industrial Parks</Typography>
              </Paper>
            </Box>
          </Grid>
        </Grid>
      </Container>

      {/* Key Pillars */}
      <Box sx={{ bgcolor: 'white', py: { xs: 8, md: 14 } }}>
        <Container maxWidth="lg">
          <Box textAlign="center" sx={{ mb: 8 }}>
            <Typography variant="h3" fontWeight={900} sx={{ mb: 2 }}>What Makes THOZHIRPORUL Different</Typography>
            <Typography variant="h6" color="text.secondary" fontWeight={400}>Three pillars that define our platform</Typography>
          </Box>
          <Grid container spacing={4}>
            {[
              { icon: <SpeedIcon sx={{ fontSize: 48 }} />, title: 'What is THOZHIRPORUL?', desc: 'A centralized monitoring platform that tracks investment, employment, resource usage, and compliance across all NEXORA industrial parks in real-time. One dashboard for the entire state.', color: '#1F4E79' },
              { icon: <SecurityIcon sx={{ fontSize: 48 }} />, title: 'Security & Transparency', desc: 'JWT-based authentication with role-based access control. Every action is audit-logged. Government-grade encryption ensures data sovereignty and accountability.', color: '#2E7D32' },
              { icon: <TrendingUpIcon sx={{ fontSize: 48 }} />, title: 'Economic Impact', desc: 'Track Rs. 24,500+ Cr in industrial investment, 145,000+ jobs, and 8 parks - all from a single command center. Predictive models project future growth trajectories.', color: '#F57C00' },
            ].map((pillar, idx) => (
              <Grid key={idx} size={{ xs: 12, md: 4 }}>
                <Card elevation={0} sx={{
                  height: '100%', p: 4, textAlign: 'center', borderTop: `4px solid ${pillar.color}`,
                  transition: 'all 0.3s ease', '&:hover': { transform: 'translateY(-8px)', boxShadow: '0 16px 32px rgba(0,0,0,0.08)' },
                }}>
                  <Box sx={{ color: pillar.color, mb: 3 }}>{pillar.icon}</Box>
                  <Typography variant="h5" fontWeight={800} gutterBottom>{pillar.title}</Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.9 }}>{pillar.desc}</Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* CTA */}
      <Box sx={{ py: 12, background: 'linear-gradient(135deg, #0f172a, #1F4E79)', textAlign: 'center' }}>
        <Container maxWidth="sm">
          <Typography variant="h3" color="white" fontWeight={900} sx={{ mb: 3 }}>Join the THOZHIRPORUL Ecosystem</Typography>
          <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.7)', mb: 5, fontWeight: 300 }}>
            Register your industry and start reporting through Tamil Nadu's most advanced industrial platform.
          </Typography>
          <Button variant="contained" size="large" onClick={() => navigate('/role-selection')} endIcon={<ArrowForwardIcon />}
            sx={{ px: 5, py: 1.5, borderRadius: 3, fontWeight: 800, background: 'linear-gradient(135deg, #2E7D32, #4CAF50)', boxShadow: '0 8px 24px rgba(46,125,50,0.4)' }}>
            Register Now
          </Button>
        </Container>
      </Box>
    </Box>
  );
}
