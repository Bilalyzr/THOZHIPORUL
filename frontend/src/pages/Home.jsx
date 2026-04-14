import React, { useEffect, useState } from 'react';
import {
  Box, Container, Typography, Button, Grid, Card, CardContent,
  Paper, Divider, Stack, AppBar, Toolbar, useScrollTrigger,
  Fade, IconButton, Chip, Link, Drawer, List, ListItemButton, ListItemText
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { keyframes } from '@emotion/react';
import FactoryIcon from '@mui/icons-material/Factory';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SecurityIcon from '@mui/icons-material/Security';
import BarChartIcon from '@mui/icons-material/BarChart';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import MenuIcon from '@mui/icons-material/Menu';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SpeedIcon from '@mui/icons-material/Speed';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import GroupsIcon from '@mui/icons-material/Groups';
import LandscapeIcon from '@mui/icons-material/Landscape';
import CloseIcon from '@mui/icons-material/Close';
import logoTransparent from '../assets/logo-transparent.png';

// Animations
const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-12px); }
`;
const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.5); }
  70% { box-shadow: 0 0 0 20px rgba(76, 175, 80, 0); }
  100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
`;
const slideUp = keyframes`
  from { opacity: 0; transform: translateY(40px); }
  to { opacity: 1; transform: translateY(0); }
`;
const countUp = keyframes`
  from { opacity: 0; transform: scale(0.5); }
  to { opacity: 1; transform: scale(1); }
`;
const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

function ElevationScroll({ children }) {
  const trigger = useScrollTrigger({ disableHysteresis: true, threshold: 20 });
  return React.cloneElement(children, {
    elevation: trigger ? 4 : 0,
    sx: {
      backgroundColor: trigger ? 'rgba(255,255,255,0.97)' : 'transparent',
      backdropFilter: trigger ? 'blur(20px)' : 'none',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      borderBottom: trigger ? '1px solid rgba(226,232,240,0.8)' : 'none',
      py: trigger ? 0.3 : 0.8,
      color: trigger ? 'text.primary' : 'white'
    }
  });
}

// Animated counter
function AnimatedStat({ value, suffix, label, delay }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), delay); return () => clearTimeout(t); }, [delay]);
  return (
    <Box sx={{ textAlign: 'center', animation: visible ? `${countUp} 0.6s ease-out` : 'none', opacity: visible ? 1 : 0 }}>
      <Typography variant="h2" sx={{ fontWeight: 900, fontSize: { xs: '2rem', md: '3.5rem' }, letterSpacing: '-0.03em', color: 'primary.main' }}>
        {value}<Box component="span" sx={{ color: 'secondary.main', fontSize: '0.45em', ml: 0.5 }}>{suffix}</Box>
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: '0.7rem', color: 'text.secondary' }}>{label}</Typography>
    </Box>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const trigger = useScrollTrigger({ disableHysteresis: true, threshold: 0 });

  useEffect(() => { setIsVisible(true); }, []);

  const navItems = [
    { label: 'About THOZHIPORUL', path: '/about' },
    { label: 'Capabilities', path: '/features' },
    { label: 'Industrial Parks', path: '/parks' },
    { label: 'Support', path: '/contact' },
  ];

  return (
    <Box sx={{ overflowX: 'hidden', bgcolor: '#f8fafc' }}>
      {/* NAVBAR */}
      <ElevationScroll>
        <AppBar position="fixed" color="default" sx={{ zIndex: 1100 }}>
          <Container maxWidth="xl">
            <Toolbar disableGutters sx={{ justifyContent: 'space-between', height: 72 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => navigate('/home')}>
                <Box sx={{
                  width: 48, height: 48, mr: 1.5, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <img src={logoTransparent} alt="NEXORA Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={900} sx={{
                    letterSpacing: '-0.02em', fontSize: '1.4rem', lineHeight: 1.1,
                    color: trigger ? 'text.primary' : 'white', transition: 'color 0.3s',
                    background: trigger ? 'linear-gradient(90deg, #1F4E79, #2E7D32)' : 'none',
                    WebkitBackgroundClip: trigger ? 'text' : 'unset',
                    WebkitTextFillColor: trigger ? 'transparent' : 'unset',
                  }}>
                    THOZHIPORUL
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.55rem', fontWeight: 600, letterSpacing: '0.1em', color: trigger ? 'text.secondary' : 'rgba(255,255,255,0.7)', lineHeight: 1 }}>
                    BY NEXORA
                  </Typography>
                </Box>
              </Box>

              <Stack direction="row" spacing={1} sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center' }}>
                {navItems.map((item) => (
                  <Button key={item.label} onClick={() => navigate(item.path)}
                    sx={{ px: 2.5, fontWeight: 600, fontSize: '0.85rem', color: trigger ? 'text.primary' : 'white',
                      '&:hover': { color: '#2E7D32', bgcolor: 'transparent' }, transition: 'color 0.3s' }}>
                    {item.label}
                  </Button>
                ))}
                <Box sx={{ width: '1px', height: 24, bgcolor: trigger ? 'divider' : 'rgba(255,255,255,0.25)', mx: 1 }} />
                <Button variant="contained" onClick={() => navigate('/role-selection')}
                  sx={{
                    borderRadius: 3, px: { xs: 2, sm: 3 }, py: 0.8, fontWeight: 700,
                    background: trigger ? 'linear-gradient(135deg, #1F4E79, #2E7D32)' : 'rgba(255,255,255,0.12)',
                    border: trigger ? 'none' : '1px solid rgba(255,255,255,0.25)',
                    backdropFilter: 'blur(10px)',
                    '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 6px 20px rgba(31,78,121,0.3)' }
                  }}>
                  Login to THOZHIPORUL
                </Button>
              </Stack>

              <IconButton sx={{ display: { xs: 'flex', md: 'none' }, color: trigger ? 'text.primary' : 'white' }} onClick={() => setMobileMenu(true)}>
                <MenuIcon />
              </IconButton>
            </Toolbar>
          </Container>
        </AppBar>
      </ElevationScroll>

      {/* Mobile Drawer */}
      <Drawer anchor="right" open={mobileMenu} onClose={() => setMobileMenu(false)} PaperProps={{ sx: { width: 280 } }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography fontWeight={800} color="primary">THOZHIPORUL</Typography>
          <IconButton onClick={() => setMobileMenu(false)}><CloseIcon /></IconButton>
        </Box>
        <Divider />
        <List>
          {navItems.map((item) => (
            <ListItemButton key={item.label} onClick={() => { navigate(item.path); setMobileMenu(false); }}>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 600 }} />
            </ListItemButton>
          ))}
          <ListItemButton onClick={() => { navigate('/role-selection'); setMobileMenu(false); }}
            sx={{ mx: 2, mt: 2, bgcolor: 'primary.main', color: 'white', borderRadius: 2, '&:hover': { bgcolor: 'primary.dark' } }}>
            <ListItemText primary="Login to THOZHIPORUL" primaryTypographyProps={{ fontWeight: 700, textAlign: 'center' }} />
          </ListItemButton>
        </List>
      </Drawer>

      {/* HERO SECTION */}
      <Box sx={{
        position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', overflow: 'hidden',
        background: `linear-gradient(135deg, rgba(15,23,42,0.85) 0%, rgba(31,78,121,0.75) 50%, rgba(46,125,50,0.7) 100%),
          url("https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=2000")`,
        backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed',
      }}>
        {/* Animated grid pattern overlay */}
        <Box sx={{
          position: 'absolute', inset: 0, opacity: 0.05,
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }} />

        {/* Floating orbs */}
        {[
          { size: 300, top: '10%', right: '-5%', delay: '0s', color: 'rgba(46,125,50,0.15)' },
          { size: 200, bottom: '15%', left: '-3%', delay: '1s', color: 'rgba(31,78,121,0.2)' },
          { size: 150, top: '60%', right: '20%', delay: '2s', color: 'rgba(245,124,0,0.1)' },
        ].map((orb, i) => (
          <Box key={i} sx={{
            position: 'absolute', width: orb.size, height: orb.size, borderRadius: '50%',
            background: `radial-gradient(circle, ${orb.color}, transparent 70%)`,
            top: orb.top, bottom: orb.bottom, left: orb.left, right: orb.right,
            animation: `${float} ${4 + i}s ease-in-out ${orb.delay} infinite`,
            filter: 'blur(40px)',
          }} />
        ))}

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2, textAlign: 'center', color: 'white', py: { xs: 4, md: 8 } }}>
          <Fade in={isVisible} timeout={800}>
            <Box>
              {/* THOZHIPORUL Badge */}
              <Chip label="SMART INDUSTRIAL MONITORING SYSTEM" sx={{
                mb: 4, bgcolor: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)',
                fontWeight: 700, letterSpacing: '0.15em', fontSize: '0.7rem', py: 2.5, px: 1,
                backdropFilter: 'blur(10px)',
                animation: `${slideUp} 0.8s ease-out`,
              }} />

              <Typography variant="h1" sx={{
                fontSize: { xs: '2.8rem', md: '5.5rem' }, fontWeight: 900, lineHeight: 1.05, mb: 4,
                letterSpacing: '-0.04em', animation: `${slideUp} 1s ease-out`,
              }}>
                Welcome to{' '}
                <Box component="span" sx={{
                  background: 'linear-gradient(90deg, #4CAF50, #81C784, #4CAF50)',
                  backgroundSize: '200% auto',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  animation: `${shimmer} 3s linear infinite`,
                }}>
                  THOZHIPORUL
                </Box>
              </Typography>

              <Typography variant="h5" sx={{
                mb: 6, fontWeight: 300, opacity: 0.9, maxWidth: 750, mx: 'auto',
                fontSize: { xs: '1.1rem', md: '1.5rem' }, lineHeight: 1.7,
                animation: `${slideUp} 1.2s ease-out`,
              }}>
                The unified digital platform powering Tamil Nadu's industrial transformation
                through real-time monitoring, compliance tracking, and data-driven governance.
              </Typography>

              {/* CTA Buttons */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center" sx={{ animation: `${slideUp} 1.4s ease-out` }}>
                <Button variant="contained" size="large" onClick={() => navigate('/role-selection')}
                  endIcon={<ArrowForwardIcon />}
                  sx={{
                    px: 5, py: 1.8, fontSize: '1.1rem', fontWeight: 800, borderRadius: 4,
                    background: 'linear-gradient(135deg, #2E7D32, #4CAF50)',
                    boxShadow: '0 8px 32px rgba(46,125,50,0.4)',
                    '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 12px 40px rgba(46,125,50,0.5)' },
                    transition: 'all 0.3s ease',
                  }}>
                  Launch THOZHIPORUL Portal
                </Button>
                <Button variant="outlined" size="large" onClick={() => navigate('/parks')}
                  sx={{
                    px: 4, py: 1.8, fontSize: '1rem', fontWeight: 700, borderRadius: 4,
                    color: 'white', borderColor: 'rgba(255,255,255,0.4)', borderWidth: 2,
                    backdropFilter: 'blur(10px)',
                    '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.08)', transform: 'translateY(-2px)' },
                    transition: 'all 0.3s ease',
                  }}>
                  Explore Parks
                </Button>
              </Stack>

              {/* Core Pillars */}
              <Grid container spacing={2} justifyContent="center" sx={{ mt: 8, animation: `${slideUp} 1.6s ease-out` }}>
                {[
                  { title: 'Industrial Infrastructure', icon: <FactoryIcon /> },
                  { title: 'Land Allocation', icon: <LocationOnIcon /> },
                  { title: 'Single-Window Clearance', icon: <SecurityIcon /> },
                ].map((item, idx) => (
                  <Grid key={idx} size={{ xs: 12, sm: 4 }}>
                    <Paper elevation={0} sx={{
                      px: { xs: 2, sm: 3 }, py: 2, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)',
                      color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5,
                      transition: 'all 0.3s ease',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.12)', transform: 'translateY(-4px)' },
                    }}>
                      <Box sx={{ color: '#4CAF50' }}>{item.icon}</Box>
                      <Typography variant="body1" fontWeight={700}>{item.title}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Fade>
        </Container>
      </Box>

      {/* LIVE STATS RIBBON */}
      <Container maxWidth="lg" sx={{ mt: -8, position: 'relative', zIndex: 10 }}>
        <Paper sx={{
          p: { xs: 4, md: 6 }, borderRadius: 6, bgcolor: 'white',
          boxShadow: '0 20px 60px -10px rgba(15,23,42,0.15)',
          border: '1px solid rgba(226,232,240,0.8)',
        }}>
          <Grid container spacing={{ xs: 2, sm: 3, md: 4 }} alignItems="center" justifyContent="center">
            {[
              { label: 'Active Investors', value: '32', suffix: 'Lakh+', delay: 200 },
              { label: 'Strategic Clusters', value: '24', suffix: '+', delay: 400 },
              { label: 'Total Investment', value: '1.2', suffix: 'Lakh Cr+', delay: 600 },
              { label: 'Jobs Created', value: '6.5', suffix: 'Lakh+', delay: 800 },
            ].map((stat, idx) => (
              <Grid key={idx} size={{ xs: 6, md: 3 }} sx={{ borderRight: { md: idx < 3 ? '1px solid' : 'none' }, borderColor: 'divider' }}>
                <AnimatedStat {...stat} />
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Container>

      {/* CAPABILITIES SECTION */}
      <Box sx={{ py: { xs: 12, md: 18 } }}>
        <Container maxWidth="lg">
          <Box textAlign="center" sx={{ mb: 10 }}>
            <Chip label="PLATFORM CAPABILITIES" sx={{ mb: 2, bgcolor: 'primary.main', color: 'white', fontWeight: 800, px: 2, py: 2.5, letterSpacing: '0.1em' }} />
            <Typography variant="h2" fontWeight={900} sx={{ mb: 2, letterSpacing: '-0.03em', fontSize: { xs: '2rem', sm: '2.5rem', md: '3.75rem' } }}>
              Built for Modern{' '}
              <Box component="span" sx={{ color: 'secondary.main' }}>Governance</Box>
            </Typography>
            <Typography variant="h6" color="text.secondary" maxWidth={700} sx={{ mx: 'auto', fontWeight: 400, lineHeight: 1.7 }}>
              THOZHIPORUL integrates industrial datasets into a single source of truth, enabling agile decision-making and sustainable growth.
            </Typography>
          </Box>

          <Grid container spacing={{ xs: 2, sm: 3, md: 4 }}>
            {[
              { title: 'Real-time Monitoring', desc: 'Live surveillance of resource consumption, emission metrics, and operational status across every industrial unit.', icon: <BarChartIcon sx={{ fontSize: 44 }} />, color: '#1F4E79' },
              { title: 'Compliance Engine', desc: 'Automated tracking of mandatory filings, GST compliance, environmental clearances, and statutory obligations.', icon: <SecurityIcon sx={{ fontSize: 44 }} />, color: '#2E7D32' },
              { title: 'Predictive Analytics', desc: 'AI-ready data models to forecast economic shifts, infrastructure demand, and investment trajectories.', icon: <AssessmentIcon sx={{ fontSize: 44 }} />, color: '#F57C00' },
              { title: 'Unified Gateway', desc: 'Single platform connecting factory owners, NEXORA administrators, and state officials seamlessly.', icon: <FactoryIcon sx={{ fontSize: 44 }} />, color: '#455A64' },
            ].map((feature, idx) => (
              <Grid key={idx} size={{ xs: 12, sm: 6, md: 3 }}>
                <Card elevation={0} sx={{
                  height: '100%', p: 4, transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  '&:hover': { transform: 'translateY(-12px)', boxShadow: '0 20px 40px rgba(0,0,0,0.08)', borderColor: `${feature.color}40` },
                }}>
                  <CardContent sx={{ p: 0 }}>
                    <Box sx={{
                      width: 80, height: 80, borderRadius: 4,
                      bgcolor: `${feature.color}10`, color: feature.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3,
                      boxShadow: `0 8px 24px ${feature.color}15`,
                    }}>
                      {feature.icon}
                    </Box>
                    <Typography variant="h5" fontWeight={800} gutterBottom>{feature.title}</Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>{feature.desc}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* INDUSTRIAL PARKS SHOWCASE */}
      <Box sx={{ py: { xs: 4, md: 12 } }}>
        <Container maxWidth="lg">
          <Paper sx={{
            borderRadius: 6, overflow: 'hidden', bgcolor: '#0F172A', color: 'white',
            boxShadow: '0 40px 80px -20px rgba(0,0,0,0.3)',
          }}>
            <Grid container>
              <Grid size={{ xs: 12, md: 7 }} sx={{ p: { xs: 6, md: 8 } }}>
                <Chip label="GIS-POWERED" sx={{ mb: 3, bgcolor: 'rgba(76,175,80,0.2)', color: '#4CAF50', fontWeight: 800, letterSpacing: '0.1em' }} />
                <Typography variant="h2" fontWeight={900} sx={{ mb: 3, letterSpacing: '-0.03em', fontSize: { xs: '2.2rem', md: '3rem' } }}>
                  Explore Industrial Parks on Interactive Maps
                </Typography>
                <Typography variant="h6" sx={{ opacity: 0.75, mb: 5, fontWeight: 300, lineHeight: 1.8 }}>
                  Navigate 8+ industrial parks across Tamil Nadu with real GIS maps, plot availability overlays, and infrastructure analytics.
                </Typography>
                <Button variant="contained" color="secondary" size="large" onClick={() => navigate('/parks')}
                  endIcon={<ArrowForwardIcon />}
                  sx={{ px: 5, py: 1.8, borderRadius: 3, fontWeight: 800, fontSize: '1rem' }}>
                  Open GIS Explorer
                </Button>
              </Grid>
              <Grid size={{ xs: 12, md: 5 }} sx={{ display: { xs: 'none', md: 'block' }, position: 'relative' }}>
                <Box component="img" src="https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&q=80&w=1000"
                  sx={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} />
                <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, #0F172A, transparent 80%)' }} />
              </Grid>
            </Grid>
          </Paper>
        </Container>
      </Box>

      {/* CTA SECTION */}
      <Box sx={{ py: { xs: 8, md: 16 }, position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #1F4E79 0%, #0f172a 50%, #1B5E20 100%)' }}>
        <Box sx={{ position: 'absolute', inset: 0, opacity: 0.08, backgroundImage: `radial-gradient(circle at 20% 50%, white 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
        <Container maxWidth="md" sx={{ position: 'relative', textAlign: 'center' }}>
          <Typography variant="h2" color="white" fontWeight={900} sx={{ mb: 3, letterSpacing: '-0.03em', fontSize: { xs: '2rem', sm: '2.5rem', md: '3.75rem' } }}>
            Ready to access{' '}
            <Box component="span" sx={{
              background: 'linear-gradient(90deg, #4CAF50, #81C784)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>THOZHIPORUL</Box>?
          </Typography>
          <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.7)', mb: 6, fontWeight: 300, fontSize: '1.2rem' }}>
            Sign in with your official credentials to access your role-based dashboard.
          </Typography>
          <Button variant="contained" size="large" onClick={() => navigate('/role-selection')}
            endIcon={<ArrowForwardIcon />}
            sx={{ px: 8, py: 2, fontSize: '1.2rem', fontWeight: 900, borderRadius: 4, background: 'linear-gradient(135deg, #2E7D32, #4CAF50)', boxShadow: '0 8px 32px rgba(46,125,50,0.4)' }}>
            Go to THOZHIPORUL Portal
          </Button>
        </Container>
      </Box>

      {/* FOOTER */}
      <Box sx={{ bgcolor: 'white', pt: 10, pb: 5, borderTop: '1px solid #E2E8F0' }}>
        <Container maxWidth="lg">
          <Grid container spacing={{ xs: 3, md: 6 }} sx={{ mb: 8 }}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1.5 }}>
                <Box sx={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={logoTransparent} alt="NEXORA Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={900} sx={{
                    lineHeight: 1, letterSpacing: '-0.02em',
                    background: 'linear-gradient(90deg, #1F4E79, #2E7D32)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  }}>
                    THOZHIPORUL
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em' }}>
                    BY NEXORA
                  </Typography>
                </Box>
              </Box>
              <Typography color="text.secondary" sx={{ lineHeight: 1.8, fontSize: '0.9rem' }}>
                The Smart Industrial Monitoring System is Tamil Nadu's unified digital framework for industrial governance, transparency, and data-driven growth.
              </Typography>
            </Grid>
            <Grid size={{ xs: 6, md: 2 }}>
              <Typography fontWeight={800} sx={{ mb: 3, fontSize: '0.85rem' }}>Platform</Typography>
              <Stack spacing={2}>
                {navItems.map((item) => (
                  <Link key={item.label} onClick={() => navigate(item.path)} sx={{ cursor: 'pointer', color: 'text.secondary', textDecoration: 'none', fontWeight: 500, fontSize: '0.85rem', '&:hover': { color: 'primary.main' } }}>{item.label}</Link>
                ))}
              </Stack>
            </Grid>
            <Grid size={{ xs: 6, md: 2 }}>
              <Typography fontWeight={800} sx={{ mb: 3, fontSize: '0.85rem' }}>Resources</Typography>
              <Stack spacing={2}>
                <Link onClick={() => navigate('/features')} sx={{ cursor: 'pointer', color: 'text.secondary', textDecoration: 'none', fontWeight: 500, fontSize: '0.85rem', '&:hover': { color: 'primary.main' } }}>Knowledge Hub</Link>
                <Link onClick={() => navigate('/about')} sx={{ cursor: 'pointer', color: 'text.secondary', textDecoration: 'none', fontWeight: 500, fontSize: '0.85rem', '&:hover': { color: 'primary.main' } }}>Status Center</Link>
                <Link onClick={() => navigate('/contact')} sx={{ cursor: 'pointer', color: 'text.secondary', textDecoration: 'none', fontWeight: 500, fontSize: '0.85rem', '&:hover': { color: 'primary.main' } }}>Developer API</Link>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography fontWeight={800} sx={{ mb: 3, fontSize: '0.85rem' }}>Official Support</Typography>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, bgcolor: '#f8fafc' }}>
                <Typography variant="body2" fontWeight={700}>Helpdesk: 1800-425-XXXX</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>thozhiporul-support@sipcot.tn.gov.in</Typography>
              </Paper>
              <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 1.5 }}>Maintenance: Sunday 02:00-04:00 AM IST</Typography>
            </Grid>
          </Grid>
          <Divider sx={{ mb: 4 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="caption" color="text.disabled">&copy; 2026 NEXORA, Government of Tamil Nadu. THOZHIPORUL Platform.</Typography>
            <Stack direction="row" spacing={3}>
              <Link onClick={() => navigate('/about')} sx={{ cursor: 'pointer', color: 'text.disabled', textDecoration: 'none', fontSize: '0.75rem', '&:hover': { color: 'text.primary' } }}>Privacy Policy</Link>
              <Link onClick={() => navigate('/about')} sx={{ cursor: 'pointer', color: 'text.disabled', textDecoration: 'none', fontSize: '0.75rem', '&:hover': { color: 'text.primary' } }}>Terms of Service</Link>
            </Stack>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
