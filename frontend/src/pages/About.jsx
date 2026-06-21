import React from 'react';
import {
  Box, Container, Typography, Grid, Paper, Button, Chip, Stack, Divider, Card, CardContent, Fade
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { keyframes } from '@emotion/react';
import SecurityIcon from '@mui/icons-material/Security';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SpeedIcon from '@mui/icons-material/Speed';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import BusinessIcon from '@mui/icons-material/Business';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import GroupsIcon from '@mui/icons-material/Groups';
import PublicIcon from '@mui/icons-material/Public';
import EmojiObjectsIcon from '@mui/icons-material/EmojiObjects';
import VerifiedIcon from '@mui/icons-material/Verified';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
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

export default function About() {
  const navigate = useNavigate();

  return (
    <Box sx={{ bgcolor: '#f8fafc' }}>
      <UnifiedNav transparent={false} />

      {/* ── Hero ── */}
      <PageHero
        icon={<EmojiObjectsIcon />}
        label="About Thozhirporul"
        title="The Intelligence Behind"
        titleHighlight="Industrial Growth"
        subtitle="THOZHIRPORUL is NEXORA's unified digital platform transforming industrial governance in Tamil Nadu through real-time monitoring, compliance tracking, and data-driven decision making."
        accentColor="#2E7D32"
        accentColor2="#1F4E79"
        bgImage="https://images.unsplash.com/photo-1606765962248-7ff407b51667?auto=format&fit=crop&q=60&w=1600"
      >
        <Button
          variant="contained"
          size="large"
          onClick={() => navigate('/role-selection')}
          endIcon={<ArrowForwardIcon />}
          sx={{
            px: 5, py: 2, fontWeight: 700,
            background: 'linear-gradient(135deg, #2E7D32, #1B5E20)',
            borderRadius: 3, fontSize: '1rem',
            boxShadow: '0 8px 24px rgba(46,125,50,0.45)',
            transition: 'all 0.3s ease',
            '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 16px 36px rgba(46,125,50,0.5)' },
          }}
        >
          Access Platform
        </Button>
      </PageHero>

      {/* ── Floating Stat Cards ── */}
      <Container maxWidth="xl" sx={{ mt: { xs: -6, md: -10 }, position: 'relative', zIndex: 2, pb: 8 }}>
        <Grid container spacing={3}>
          {[
            { icon: <BusinessIcon sx={{ fontSize: 36 }} />, value: '8+', label: 'Industrial Parks', color: '#1F4E79' },
            { icon: <AnalyticsIcon sx={{ fontSize: 36 }} />, value: '₹24,500+ Cr', label: 'Total Investment', color: '#2E7D32' },
            { icon: <GroupsIcon sx={{ fontSize: 36 }} />, value: '1,45,000+', label: 'Employment', color: '#2E7D32' },
            { icon: <PublicIcon sx={{ fontSize: 36 }} />, value: 'State-wide', label: 'Coverage', color: '#1F4E79' },
          ].map((stat, idx) => (
            <Grid key={idx} size={{ xs: 6, md: 3 }}>
              <Fade in timeout={300 + idx * 100}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3.5, borderRadius: 4,
                    bgcolor: 'rgba(255,255,255,0.9)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.8)',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
                    textAlign: 'center',
                    transition: 'all 0.3s ease',
                    animation: `${fadeInUp} 0.6s ease-out ${idx * 0.1}s both`,
                    '&:hover': { transform: 'translateY(-8px)', boxShadow: `0 24px 48px ${stat.color}18`, borderColor: `${stat.color}30` },
                  }}
                >
                  <Box sx={{ color: stat.color, mb: 1.5, display: 'inline-flex', p: 1.5, borderRadius: 2.5, bgcolor: `${stat.color}0d` }}>
                    {stat.icon}
                  </Box>
                  <Typography variant="h3" fontWeight={800} color={stat.color} sx={{ mb: 0.5, fontSize: '2rem' }}>
                    {stat.value}
                  </Typography>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {stat.label}
                  </Typography>
                </Paper>
              </Fade>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* ── Vision Section ── */}
      <Box sx={{ bgcolor: '#ffffff', py: 14, ...sectionPattern }}>
        <Container maxWidth="xl">
          <Grid container spacing={8} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ animation: `${slideInLeft} 0.8s ease-out` }}>
                <Chip
                  label="OUR VISION"
                  sx={{ mb: 3, background: 'linear-gradient(135deg, #1F4E79, #2E7D32)', color: 'white', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.15em', px: 2.5, py: 1, borderRadius: '50px' }}
                />
                <Typography variant="h3" fontWeight={900} sx={{ mb: 4, fontSize: { xs: '1.75rem', md: '2.5rem' }, lineHeight: 1.2, letterSpacing: '-0.02em' }}>
                  A Digital Backbone for{' '}
                  <Box component="span" sx={{ background: 'linear-gradient(90deg, #2E7D32, #1F4E79)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Industrial Excellence
                  </Box>
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.8, fontSize: '1.05rem' }}>
                  The Smart Industrial Monitoring System (THOZHIRPORUL) replaces fragmented manual reporting with a
                  real-time, data-driven industrial operating system built for the future.
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 5, lineHeight: 1.8, fontSize: '1.05rem' }}>
                  Designed for government officers who need state-wide visibility, and industry allottees who need
                  compliance clarity — THOZHIRPORUL bridges the information gap that slows industrial governance.
                </Typography>
                <Button
                  variant="outlined" size="large"
                  onClick={() => navigate('/role-selection')}
                  endIcon={<ArrowForwardIcon />}
                  sx={{
                    px: 4, py: 1.5, fontWeight: 700, borderColor: '#1F4E79', color: '#1F4E79',
                    borderRadius: 3, borderWidth: 2,
                    transition: 'all 0.3s ease',
                    '&:hover': { bgcolor: '#1F4E79', color: 'white', transform: 'translateX(4px)', borderColor: '#1F4E79' },
                  }}
                >
                  Learn More About Platform
                </Button>
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ animation: `${slideInRight} 0.8s ease-out` }}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: 5, overflow: 'hidden',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 24px 64px rgba(0,0,0,0.08)',
                    transition: 'all 0.4s ease',
                    '&:hover': { transform: 'translateY(-10px)', boxShadow: '0 40px 80px rgba(0,0,0,0.14)' },
                  }}
                >
                  <Box
                    component="img"
                    src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800"
                    alt="Industrial Monitoring"
                    sx={{ width: '100%', height: 340, objectFit: 'cover' }}
                  />
                  <CardContent sx={{ p: 4, bgcolor: 'white' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: '#2E7D320d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <VerifiedIcon sx={{ color: '#2E7D32', fontSize: 26 }} />
                      </Box>
                      <Box>
                        <Typography variant="h6" fontWeight={800}>Real-time Intelligence</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Advanced monitoring systems providing instant insights
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ── Key Pillars ── */}
      <Box sx={{ bgcolor: '#f1f5f9', py: 14, position: 'relative', overflow: 'hidden' }}>
        <Box sx={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(ellipse at 15% 50%, rgba(0,137,123,0.07) 0%, transparent 55%), radial-gradient(ellipse at 85% 50%, rgba(31,78,121,0.07) 0%, transparent 55%)',
          pointerEvents: 'none',
        }} />

        <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ mb: 10, textAlign: 'center', animation: `${fadeInUp} 0.8s ease-out` }}>
            <Chip
              label="PLATFORM CAPABILITIES"
              sx={{ mb: 3, background: 'linear-gradient(135deg, #2E7D32, #1F4E79)', color: 'white', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.15em', px: 2.5, py: 1, borderRadius: '50px' }}
            />
            <Typography variant="h3" fontWeight={900} sx={{ fontSize: { xs: '1.75rem', md: '2.5rem' }, mb: 2, letterSpacing: '-0.02em' }}>
              What Makes THOZHIRPORUL Different
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto', lineHeight: 1.7 }}>
              Three core pillars that define our platform's approach to industrial governance
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {[
              { icon: <SpeedIcon sx={{ fontSize: 48 }} />, title: 'Real-time Monitoring', desc: 'Track investment, employment, water, power, and compliance across all parks in real-time with live dashboards.', color: '#1F4E79' },
              { icon: <SecurityIcon sx={{ fontSize: 48 }} />, title: 'Secure & Transparent', desc: 'Role-based access with complete audit trails. Government-grade encryption ensures data sovereignty and accountability.', color: '#2E7D32' },
              { icon: <TrendingUpIcon sx={{ fontSize: 48 }} />, title: 'Economic Insights', desc: 'Predictive models and growth projections help government and industries make informed, data-driven decisions.', color: '#2E7D32' },
            ].map((feature, idx) => (
              <Grid key={idx} size={{ xs: 12, md: 4 }}>
                <Fade in timeout={400 + idx * 150}>
                  <Card
                    elevation={0}
                    sx={{
                      height: '100%', borderRadius: 4,
                      bgcolor: 'rgba(255,255,255,0.85)',
                      backdropFilter: 'blur(16px)',
                      border: '1px solid rgba(255,255,255,0.9)',
                      boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                      transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
                      animation: `${fadeInUp} 0.6s ease-out ${idx * 0.15}s both`,
                      '&:hover': { transform: 'translateY(-12px)', boxShadow: `0 28px 56px ${feature.color}18`, borderColor: `${feature.color}30` },
                    }}
                  >
                    <CardContent sx={{ p: 4 }}>
                      <Box sx={{ color: feature.color, mb: 3, width: 72, height: 72, borderRadius: 3, bgcolor: `${feature.color}0d`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s ease', '&:hover': { transform: 'scale(1.1) rotate(5deg)' } }}>
                        {feature.icon}
                      </Box>
                      <Typography variant="h6" fontWeight={800} sx={{ mb: 2, fontSize: '1.25rem' }}>{feature.title}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.75 }}>{feature.desc}</Typography>
                    </CardContent>
                  </Card>
                </Fade>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── CTA Band ── */}
      <Box sx={{
        py: 16,
        background: 'linear-gradient(135deg, #060d1a 0%, #0d2435 40%, #0a1e14 100%)',
        color: 'white', textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        <Box sx={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 30% 70%, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '40px 40px', opacity: 0.6, pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', top: '20%', right: '10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,137,123,0.25) 0%, transparent 65%)', filter: 'blur(60px)', pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', bottom: '10%', left: '5%', width: 250, height: 250, borderRadius: '50%', background: 'radial-gradient(circle, rgba(31,78,121,0.3) 0%, transparent 65%)', filter: 'blur(60px)', pointerEvents: 'none' }} />

        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
          <AutoAwesomeIcon sx={{ fontSize: 64, mb: 3, opacity: 0.9, animation: `${float} 4s ease-in-out infinite` }} />
          <Typography variant="h3" fontWeight={900} sx={{ mb: 3, fontSize: { xs: '1.75rem', md: '2.75rem' }, letterSpacing: '-0.02em' }}>
            Join the THOZHIRPORUL Ecosystem
          </Typography>
          <Typography variant="h6" sx={{ mb: 6, opacity: 0.8, fontWeight: 300, fontSize: '1.1rem', lineHeight: 1.7 }}>
            Register your industry today and become part of Tamil Nadu's digital industrial transformation
          </Typography>
          <Button
            variant="contained" size="large"
            onClick={() => navigate('/role-selection')}
            endIcon={<ArrowForwardIcon />}
            sx={{
              px: 6, py: 2, fontWeight: 700,
              bgcolor: 'white', color: '#0d2435',
              borderRadius: 3, fontSize: '1rem',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              transition: 'all 0.3s ease',
              '&:hover': { bgcolor: '#f1f5f9', transform: 'translateY(-4px)', boxShadow: '0 16px 48px rgba(0,0,0,0.4)' },
            }}
          >
            Get Started Now
          </Button>
        </Container>
      </Box>

      <UnifiedFooter />
    </Box>
  );
}
