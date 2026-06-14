import React, { useEffect, useState } from 'react';
import {
  Box, Container, Typography, Button, Grid, Card, CardContent,
  Paper, Divider, Stack, Fade, Chip, Link
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { keyframes } from '@emotion/react';
import FactoryIcon from '@mui/icons-material/Factory';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SecurityIcon from '@mui/icons-material/Security';
import BarChartIcon from '@mui/icons-material/BarChart';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import logoTransparent from '../assets/logo-transparent.png';
import LoadingScreen from '../components/LoadingScreen';
import UnifiedNav from '../components/UnifiedNav';

// Animations
const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-12px); }
`;
const dashboardFloat = keyframes`
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-8px) rotate(0.3deg); }
`;
const pulseGreen = keyframes`
  0% { transform: scale(0.92); box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.6); }
  70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(76, 175, 80, 0); }
  100% { transform: scale(0.92); box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
`;
const drawPath = keyframes`
  from { stroke-dashoffset: 400; }
  to { stroke-dashoffset: 0; }
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
  const [isIntroLoading, setIsIntroLoading] = useState(true);
  const [recentEvents, setRecentEvents] = useState([
    { time: 'Just now', msg: 'SLA NOC Approved - Kanchipuram Hub', type: 'success' },
    { time: '2 mins ago', msg: 'GST Verification completed for Unit #49', type: 'info' },
    { time: '5 mins ago', msg: 'GIS Map plot allocation sync finished', type: 'success' },
    { time: '12 mins ago', msg: 'New grievance ticket registered - Org #382', type: 'warning' },
  ]);

  useEffect(() => { 
    if (!isIntroLoading) return;
    const timer = setTimeout(() => {
      setIsIntroLoading(false);
      setIsVisible(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, [isIntroLoading]);

  useEffect(() => {
    const eventOptions = [
      { msg: 'NOC Clearance issued for TechPark-Coimbatore', type: 'success' },
      { msg: 'System Audit completed successfully', type: 'info' },
      { msg: 'SIPCOT land plot status updated to ALLOCATED', type: 'success' },
      { msg: 'Statutory compliance score recalculated: 98.4%', type: 'info' },
      { msg: 'Auto OCR document scanning complete (Unit #12)', type: 'success' },
      { msg: 'Grievance resolved by Administrator (Ticket #932)', type: 'success' }
    ];

    const timer = setInterval(() => {
      setRecentEvents(prev => {
        const nextOption = eventOptions[Math.floor(Math.random() * eventOptions.length)];
        const newEvent = {
          time: 'Just now',
          msg: nextOption.msg,
          type: nextOption.type
        };
        const updatedPrev = prev.map((e, idx) => {
          if (idx === 0) return { ...e, time: '1 min ago' };
          if (idx === 1) return { ...e, time: '3 mins ago' };
          if (idx === 2) return { ...e, time: '6 mins ago' };
          return e;
        });
        return [newEvent, ...updatedPrev.slice(0, 3)];
      });
    }, 4500);

    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { label: 'About', path: '/about' },
    { label: 'Features', path: '/features' },
    { label: 'Pricing', path: '/subscriptions' },
    { label: 'Industrial Parks', path: '/parks' },
    { label: 'Contact', path: '/contact' },
    { label: 'Grievance', path: '/grievance' },
  ];

  return (
    <>
      {isIntroLoading && <LoadingScreen message="Initializing THOZHIRPORUL..." />}
      <UnifiedNav transparent={true} />
      <Box sx={{ overflowX: 'hidden', bgcolor: '#f8fafc' }}>

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

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2, color: 'white', py: { xs: 8, md: 12 } }}>
          <Fade in={isVisible} timeout={800}>
            <Grid container spacing={5} alignItems="center">
              {/* Left Column: Hero Text and Actions */}
              <Grid size={{ xs: 12, md: 7 }} sx={{ textAlign: { xs: 'center', md: 'left' } }}>
                {/* Glowing Active Status Badge */}
                <Box sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1.5,
                  mb: 3.5,
                  bgcolor: 'rgba(46, 125, 50, 0.15)',
                  border: '1px solid rgba(76, 175, 80, 0.35)',
                  borderRadius: '50px',
                  px: 2.5,
                  py: 1,
                  backdropFilter: 'blur(10px)',
                  animation: `${slideUp} 0.8s ease-out`,
                }}>
                  <Box sx={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    bgcolor: '#4CAF50',
                    animation: `${pulseGreen} 1.8s infinite ease-in-out`
                  }} />
                  <Typography sx={{
                    fontWeight: 800,
                    letterSpacing: '0.12em',
                    fontSize: '0.75rem',
                    color: '#c0f772',
                    textTransform: 'uppercase'
                  }}>
                    SIPCOT SIMS 2.0 • Live Monitoring Active
                  </Typography>
                </Box>

                <Typography variant="h1" sx={{
                  fontSize: { xs: '2.8rem', sm: '3.6rem', md: '4.6rem' },
                  fontWeight: 900,
                  lineHeight: 1.1,
                  mb: 3,
                  letterSpacing: '-0.04em',
                  animation: `${slideUp} 1s ease-out`,
                }}>
                  Welcome to{' '}
                  <Box component="span" sx={{
                    background: 'linear-gradient(90deg, #4CAF50, #81C784, #4CAF50)',
                    backgroundSize: '200% auto',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    animation: `${shimmer} 3s linear infinite`,
                  }}>
                    THOZHIRPORUL
                  </Box>
                </Typography>

                <Typography variant="h5" sx={{
                  mb: 5, fontWeight: 300, opacity: 0.88, maxWidth: { xs: '100%', md: 620 },
                  fontSize: { xs: '1.05rem', md: '1.3rem' }, lineHeight: 1.6,
                  animation: `${slideUp} 1.2s ease-out`,
                  mx: { xs: 'auto', md: 0 }
                }}>
                  The unified digital command center powering Tamil Nadu's industrial transformation
                  through real-time telemetry, statutory compliance auditing, and secure land orchestration.
                </Typography>

                {/* CTA Buttons */}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} justifyContent={{ xs: 'center', md: 'flex-start' }} sx={{ animation: `${slideUp} 1.4s ease-out`, mb: 6 }}>
                  <Button variant="contained" size="large" onClick={() => navigate('/role-selection')}
                    endIcon={<ArrowForwardIcon />}
                    sx={{
                      px: 4.5, py: 2, fontSize: '1.05rem', fontWeight: 800, borderRadius: 3.5,
                      background: 'linear-gradient(135deg, #1B5E20, #4CAF50)',
                      boxShadow: '0 8px 30px rgba(46,125,50,0.35)',
                      '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 12px 36px rgba(46,125,50,0.5)', background: 'linear-gradient(135deg, #1B5E20, #4CAF50)' },
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}>
                    Launch Command Portal
                  </Button>
                  <Button variant="outlined" size="large" onClick={() => navigate('/parks')}
                    sx={{
                      px: 4, py: 2, fontSize: '1rem', fontWeight: 700, borderRadius: 3.5,
                      color: 'white', borderColor: 'rgba(255,255,255,0.35)', borderWidth: 1.5,
                      backdropFilter: 'blur(10px)',
                      '&:hover': { borderColor: 'white', borderWidth: 1.5, bgcolor: 'rgba(255,255,255,0.08)', transform: 'translateY(-2px)' },
                      transition: 'all 0.3s ease',
                    }}>
                    Explore Parks
                  </Button>
                </Stack>

                {/* Core Pillars */}
                <Grid container spacing={1.5} justifyContent={{ xs: 'center', md: 'flex-start' }} sx={{ animation: `${slideUp} 1.6s ease-out` }}>
                  {[
                    { title: 'Infrastructure', icon: <FactoryIcon sx={{ fontSize: 18 }} /> },
                    { title: 'Land Allocation', icon: <LocationOnIcon sx={{ fontSize: 18 }} /> },
                    { title: 'Single-Window', icon: <SecurityIcon sx={{ fontSize: 18 }} /> },
                  ].map((item, idx) => (
                    <Grid key={idx} size={{ xs: 6, sm: 'auto' }}>
                      <Box sx={{
                        px: 2, py: 1, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)',
                        color: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', gap: 1,
                        transition: 'all 0.3s ease',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', transform: 'translateY(-2px)' },
                      }}>
                        <Box sx={{ color: '#4CAF50', display: 'flex', alignItems: 'center' }}>{item.icon}</Box>
                        <Typography variant="caption" fontWeight={700} sx={{ letterSpacing: '0.05em' }}>{item.title}</Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Grid>

              {/* Right Column: Interactive Command Dashboard Mockup */}
              <Grid size={{ xs: 12, md: 5 }} sx={{ display: { xs: 'none', md: 'block' }, animation: `${slideUp} 1.2s ease-out` }}>
                <Box sx={{
                  position: 'relative',
                  width: '100%',
                  maxWidth: 480,
                  bgcolor: 'rgba(15, 23, 42, 0.45)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 6,
                  boxShadow: '0 30px 60px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
                  p: 3,
                  mx: 'auto',
                  animation: `${dashboardFloat} 6s ease-in-out infinite`,
                }}>
                  {/* Dashboard Header */}
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#4CAF50', animation: `${pulseGreen} 1.5s infinite` }} />
                      <Typography sx={{ fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.7)' }}>
                        SIMS CONTROL ROOM
                      </Typography>
                    </Box>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.65rem', color: '#4CAF50', bgcolor: 'rgba(76,175,80,0.15)', px: 1.5, py: 0.5, borderRadius: 2 }}>
                      SYSTEM: ONLINE
                    </Typography>
                  </Box>

                  {/* Stat Grid */}
                  <Grid container spacing={2} mb={3}>
                    <Grid size={{ xs: 6 }}>
                      <Paper variant="outlined" sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
                        <Typography sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, mb: 0.5 }}>COMPLIANCE AVG</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: '#4CAF50', letterSpacing: '-0.02em' }}>98.4%</Typography>
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Paper variant="outlined" sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
                        <Typography sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, mb: 0.5 }}>ACTIVE SESSIONS</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: '#3B82F6', letterSpacing: '-0.02em' }}>1,842</Typography>
                      </Paper>
                    </Grid>
                  </Grid>

                  {/* SVG Chart */}
                  <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 3, border: '1px solid rgba(255,255,255,0.04)' }}>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>DATA INGESTION (GB/s)</Typography>
                      <Typography sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>Real-time Feed</Typography>
                    </Box>
                    <svg viewBox="0 0 300 100" style={{ width: '100%', height: '80px', display: 'block' }}>
                      {/* Horizontal Grid lines */}
                      <line x1="0" y1="20" x2="300" y2="20" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                      <line x1="0" y1="50" x2="300" y2="50" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                      <line x1="0" y1="80" x2="300" y2="80" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                      
                      {/* Flow Path 1 (Blue) */}
                      <path
                        d="M 0 80 Q 30 50 60 70 T 120 40 T 180 60 T 240 25 T 300 15"
                        fill="none"
                        stroke="#3B82F6"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        style={{
                          strokeDasharray: '400',
                          strokeDashoffset: '400',
                          animation: `${drawPath} 2.5s cubic-bezier(0.4, 0, 0.2, 1) forwards`,
                        }}
                      />
                      {/* Flow Path 2 (Green) */}
                      <path
                        d="M 0 90 Q 40 40 80 60 T 160 30 T 240 50 T 300 35"
                        fill="none"
                        stroke="#10B981"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        style={{
                          strokeDasharray: '400',
                          strokeDashoffset: '400',
                          animation: `${drawPath} 2.5s 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards`,
                        }}
                      />
                    </svg>
                  </Box>

                  {/* Activity log feed */}
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, mb: 1.5, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.02em' }}>
                    LIVE ACTIVITY MONITOR
                  </Typography>
                  <Stack spacing={1} sx={{ minHeight: 120 }}>
                    {recentEvents.map((evt, idx) => (
                      <Box key={idx} sx={{
                        p: 1.2,
                        borderRadius: 2,
                        bgcolor: 'rgba(255,255,255,0.02)',
                        borderLeft: `3px solid ${
                          evt.type === 'success' ? '#10B981' : evt.type === 'warning' ? '#F57C00' : '#3B82F6'
                        }`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        animation: `${slideUp} 0.4s ease-out forwards`,
                      }}>
                        <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.85)', fontWeight: 500, maxWidth: '80%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {evt.msg}
                        </Typography>
                        <Typography sx={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>
                          {evt.time}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              </Grid>
            </Grid>
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
      <Box sx={{ py: { xs: 12, md: 16 }, position: 'relative', overflow: 'hidden', bgcolor: '#f8fafc' }}>
        {/* Ambient background glows */}
        <Box sx={{ position: 'absolute', top: '20%', left: '-10%', width: 450, height: 450, borderRadius: '50%', background: 'radial-gradient(circle, rgba(76,175,80,0.04) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', bottom: '15%', right: '-5%', width: 450, height: 450, borderRadius: '50%', background: 'radial-gradient(circle, rgba(31,78,121,0.03) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none' }} />

        {/* Sleek background grid pattern */}
        <Box sx={{
          position: 'absolute',
          inset: 0,
          opacity: 0.25,
          backgroundImage: `radial-gradient(#e2e8f0 1.5px, transparent 1.5px)`,
          backgroundSize: '24px 24px',
          pointerEvents: 'none'
        }} />

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Box textAlign="center" sx={{ mb: 8 }}>
            {/* PLATFORM CAPABILITIES Live Badge */}
            <Box sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1.5,
              mb: 3,
              bgcolor: 'rgba(31, 78, 121, 0.08)',
              border: '1px solid rgba(31, 78, 121, 0.15)',
              borderRadius: '50px',
              px: 2.5,
              py: 0.8,
            }}>
              <Box sx={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                bgcolor: '#4CAF50',
                animation: `${pulseGreen} 2s infinite ease-in-out`
              }} />
              <Typography sx={{
                fontWeight: 800,
                letterSpacing: '0.12em',
                fontSize: '0.72rem',
                color: '#1F4E79',
                textTransform: 'uppercase'
              }}>
                Platform Capabilities
              </Typography>
            </Box>

            <Typography variant="h2" fontWeight={900} sx={{ mb: 3, letterSpacing: '-0.03em', fontSize: { xs: '2.2rem', sm: '2.8rem', md: '3.8rem' }, color: '#0f172a' }}>
              Built for Modern{' '}
              <Box component="span" sx={{ 
                background: 'linear-gradient(135deg, #2E7D32 0%, #4CAF50 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: 'inline-block'
              }}>
                Governance
              </Box>
            </Typography>
            <Typography variant="h6" sx={{ mx: 'auto', fontWeight: 400, lineHeight: 1.7, fontSize: '1.05rem', color: '#64748b', maxWidth: 800 }}>
              THOZHIRPORUL integrates industrial datasets into a single source of truth, enabling agile decision-making and sustainable growth.
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {[
              {
                title: 'Real-time Monitoring',
                desc: 'Live surveillance of resource consumption, emission metrics, and operational status across every industrial unit.',
                icon: <BarChartIcon sx={{ fontSize: 32 }} />,
                color: '#1F4E79',
                bgColor: '#e6f0fa',
                shadow: '0 8px 24px rgba(31, 78, 121, 0.08)',
                hoverShadow: '0 20px 40px rgba(31, 78, 121, 0.15)',
                hoverIconShadow: '0 12px 28px rgba(31, 78, 121, 0.22)',
                path: '/command-center',
                badge: 'Live Feed',
                action: 'Explore Command Center'
              },
              {
                title: 'Compliance Engine',
                desc: 'Automated tracking of mandatory filings, GST compliance, environmental clearances, and statutory obligations.',
                icon: <SecurityIcon sx={{ fontSize: 32 }} />,
                color: '#2E7D32',
                bgColor: '#e8f5e9',
                shadow: '0 8px 24px rgba(46, 125, 50, 0.08)',
                hoverShadow: '0 20px 40px rgba(46, 125, 50, 0.15)',
                hoverIconShadow: '0 12px 28px rgba(46, 125, 50, 0.22)',
                path: '/compliance-engine',
                badge: 'Automated',
                action: 'Manage Compliance'
              },
              {
                title: 'Predictive Analytics',
                desc: 'AI-ready data models to forecast economic shifts, infrastructure demand, and investment trajectories.',
                icon: <AssessmentIcon sx={{ fontSize: 32 }} />,
                color: '#E65100',
                bgColor: '#fff3e0',
                shadow: '0 8px 24px rgba(230, 81, 0, 0.08)',
                hoverShadow: '0 20px 40px rgba(230, 81, 0, 0.15)',
                hoverIconShadow: '0 12px 28px rgba(230, 81, 0, 0.22)',
                path: '/analytics',
                badge: 'AI-Powered',
                action: 'View Analytics'
              },
              {
                title: 'Unified Gateway',
                desc: 'Single platform connecting factory owners, NEXORA administrators, and state officials seamlessly.',
                icon: <FactoryIcon sx={{ fontSize: 32 }} />,
                color: '#374151',
                bgColor: '#f3f4f6',
                shadow: '0 8px 24px rgba(55, 65, 81, 0.06)',
                hoverShadow: '0 20px 40px rgba(55, 65, 81, 0.12)',
                hoverIconShadow: '0 12px 28px rgba(55, 65, 81, 0.18)',
                path: '/workspace',
                badge: 'Multi-Portal',
                action: 'Access Workspace'
              },
            ].map((feature, idx) => (
              <Grid key={idx} size={{ xs: 12, sm: 6, md: 3 }}>
                <Card 
                  elevation={0} 
                  onClick={() => navigate(feature.path)}
                  sx={{
                    height: '100%',
                    position: 'relative',
                    p: 4.5,
                    pt: 5,
                    borderRadius: '24px',
                    bgcolor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
                    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '4px',
                      background: feature.color,
                      opacity: 0.1,
                      transition: 'all 0.3s ease',
                    },
                    '&:hover::before': {
                      height: '6px',
                      opacity: 1,
                    },
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      background: `linear-gradient(180deg, #ffffff 0%, ${feature.bgColor}33 100%)`,
                      boxShadow: feature.hoverShadow,
                      borderColor: `${feature.color}22`,
                    },
                    '&:hover .icon-box': {
                      transform: 'scale(1.1) rotate(3deg)',
                      boxShadow: feature.hoverIconShadow,
                    },
                    '&:hover .action-link': {
                      color: feature.color,
                    },
                    '&:hover .arrow-icon': {
                      transform: 'translateX(6px)',
                    }
                  }}
                >
                  {/* Top-right Status Pill */}
                  <Box sx={{
                    position: 'absolute',
                    top: 20,
                    right: 20,
                    bgcolor: `${feature.color}11`,
                    color: feature.color,
                    borderRadius: '6px',
                    px: 1.5,
                    py: 0.5,
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    border: `1px solid ${feature.color}22`
                  }}>
                    {feature.badge}
                  </Box>

                  <CardContent sx={{ p: 0, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <Box
                      className="icon-box"
                      sx={{
                        width: 64,
                        height: 64,
                        borderRadius: '18px',
                        bgcolor: feature.bgColor,
                        color: feature.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 3.5,
                        boxShadow: feature.shadow,
                        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                    >
                      {feature.icon}
                    </Box>
                    <Typography variant="h5" fontWeight={800} sx={{ fontSize: '1.25rem', color: '#0f172a', letterSpacing: '-0.01em', mb: 1.5 }}>
                      {feature.title}
                    </Typography>
                    <Typography variant="body1" sx={{ lineHeight: 1.7, fontSize: '0.9rem', color: '#64748b', mb: 3.5, flexGrow: 1 }}>
                      {feature.desc}
                    </Typography>

                    {/* Learn More link with sliding arrow */}
                    <Box 
                      className="action-link"
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1,
                        fontSize: '0.85rem', 
                        fontWeight: 700, 
                        color: '#64748b',
                        transition: 'color 0.3s ease',
                      }}
                    >
                      <span>{feature.action}</span>
                      <ArrowForwardIcon 
                        className="arrow-icon"
                        sx={{ 
                          fontSize: 16, 
                          transition: 'transform 0.3s ease' 
                        }} 
                      />
                    </Box>
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

      {/* SUBSCRIPTION WORKSPACE TIERS SECTION */}
      <Box sx={{ py: { xs: 12, md: 16 }, bgcolor: '#FAFDFB', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0', position: 'relative', overflow: 'hidden' }}>
        {/* Ambient green glow background */}
        <Box sx={{ position: 'absolute', top: '-10%', left: '-10%', width: 400, height: 400, borderRadius: '50%', bg: '#2E7D32', filter: 'blur(120px)', opacity: 0.04, pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', bottom: '-10%', right: '-10%', width: 400, height: 400, borderRadius: '50%', bg: '#1F4E79', filter: 'blur(120px)', opacity: 0.04, pointerEvents: 'none' }} />

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Box textAlign="center" sx={{ mb: 10 }}>
            <Chip label="FLEXIBLE MONETIZATION" sx={{ mb: 2, bgcolor: 'rgba(76, 175, 80, 0.12)', color: '#2E7D32', fontWeight: 800, px: 2, py: 2.5, letterSpacing: '0.1em' }} />
            <Typography variant="h2" fontWeight={900} sx={{ mb: 2, letterSpacing: '-0.03em', fontSize: { xs: '2rem', sm: '2.5rem', md: '3.75rem' } }}>
              Tailored Subscription{' '}
              <Box component="span" sx={{ color: '#2E7D32' }}>Workspace Tiers</Box>
            </Typography>
            <Typography variant="h6" color="text.secondary" maxWidth={750} sx={{ mx: 'auto', fontWeight: 400, lineHeight: 1.7, fontSize: '1.05rem' }}>
              Whether you are an MSME owner or a multinational conglomerate, choose a plan structured precisely around your compliance reporting and statutory storage requirements.
            </Typography>
          </Box>

          <Grid container spacing={4} alignItems="stretch">
            {[
              {
                name: 'Compliance Starter',
                price: '₹0',
                period: 'Free Plan',
                desc: 'Baseline digital forms and standard compliance tracker. Perfect for small businesses fulfilling statutory requirements.',
                bullets: ['Unified submission forms', 'Overall compliance scoring', 'Standard Services NOC tracker', '10 MB Vault file limit'],
                color: '#455A64',
                bg: 'white'
              },
              {
                name: 'SME Professional',
                price: '₹4,999',
                period: '/ month',
                desc: 'Bulk uploads, manual Excel reports, statutory expiry alert automations, and consolidated compliance logs for growth factories.',
                bullets: ['Bulk CSV & Excel uploads', 'Detailed category score breakdown', 'SLA timelines & Kanban alerts', '1 GB Vault storage + expiry alerts'],
                color: '#2E7D32',
                bg: 'white',
                isPopular: true
              },
              {
                name: 'Enterprise Suite',
                price: '₹24,999',
                period: '/ month',
                desc: 'Predictive economic modeling, live API feeds, automated AI OCR document scanning, and deep state-level compliance auditing.',
                bullets: ['Direct API & ERP integrations', 'AI Compliance Mitigation engine', 'Scheduled automatic reporting', '100 GB Vault + Auto OCR scanning'],
                color: '#1F4E79',
                bg: 'white'
              }
            ].map((plan, idx) => (
              <Grid size={{ xs: 12, md: 4 }} key={idx}>
                <Card 
                  elevation={0}
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 5,
                    border: plan.isPopular ? '2px solid #2E7D32' : '1px solid #E2E8F0',
                    boxShadow: plan.isPopular ? '0 16px 40px rgba(46, 125, 50, 0.1)' : '0 4px 20px rgba(0,0,0,0.02)',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    '&:hover': { transform: 'translateY(-8px)', boxShadow: plan.isPopular ? '0 24px 48px rgba(46, 125, 50, 0.15)' : '0 16px 36px rgba(0,0,0,0.06)' }
                  }}
                >
                  {plan.isPopular && (
                    <Box sx={{
                      position: 'absolute',
                      top: 20,
                      right: 20,
                      bgcolor: '#2E7D32',
                      color: 'white',
                      fontWeight: 800,
                      fontSize: '0.65rem',
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 2,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase'
                    }}>
                      Highly Recommended
                    </Box>
                  )}

                  <CardContent sx={{ p: 5, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="h5" fontWeight={900} sx={{ color: plan.color, mb: 1, letterSpacing: '-0.02em' }}>
                      {plan.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 4.5, minHeight: 60, lineHeight: 1.6 }}>
                      {plan.desc}
                    </Typography>

                    <Box display="flex" alignItems="baseline" mb={4}>
                      <Typography variant="h3" fontWeight={900} sx={{ color: 'text.primary', letterSpacing: '-0.03em' }}>
                        {plan.price}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ ml: 1 }}>
                        {plan.period}
                      </Typography>
                    </Box>

                    <Divider sx={{ mb: 4 }} />

                    <Box sx={{ flexGrow: 1, mb: 5 }}>
                      <Stack spacing={2}>
                        {plan.bullets.map((bullet, bIdx) => (
                          <Box display="flex" alignItems="center" gap={1.5} key={bIdx}>
                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: plan.color }} />
                            <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ fontSize: '0.85rem' }}>
                              {bullet}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    </Box>

                    <Button
                      fullWidth
                      variant={plan.isPopular ? 'contained' : 'outlined'}
                      onClick={() => navigate('/subscriptions')}
                      sx={{
                        py: 1.8,
                        borderRadius: 3.5,
                        fontWeight: 800,
                        textTransform: 'none',
                        fontSize: '0.95rem',
                        bgcolor: plan.isPopular ? '#2E7D32' : 'transparent',
                        borderColor: plan.isPopular ? 'none' : plan.color,
                        color: plan.isPopular ? 'white' : plan.color,
                        boxShadow: plan.isPopular ? '0 8px 24px rgba(46,125,50,0.2)' : 'none',
                        '&:hover': {
                          bgcolor: plan.isPopular ? '#1B5E20' : `${plan.color}05`,
                          borderColor: plan.isPopular ? 'none' : plan.color,
                          transform: 'translateY(-1px)'
                        }
                      }}
                    >
                      Compare Features
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
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
            }}>THOZHIRPORUL</Box>?
          </Typography>
          <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.7)', mb: 6, fontWeight: 300, fontSize: '1.2rem' }}>
            Sign in with your official credentials to access your role-based dashboard.
          </Typography>
          <Button variant="contained" size="large" onClick={() => navigate('/role-selection')}
            endIcon={<ArrowForwardIcon />}
            sx={{ px: 8, py: 2, fontSize: '1.2rem', fontWeight: 900, borderRadius: 4, background: 'linear-gradient(135deg, #2E7D32, #4CAF50)', boxShadow: '0 8px 32px rgba(46,125,50,0.4)' }}>
            Go to THOZHIRPORUL Portal
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
                    THOZHIRPORUL
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
            <Typography variant="caption" color="text.disabled">&copy; 2026 NEXORA, Government of Tamil Nadu. THOZHIRPORUL Platform.</Typography>
            <Stack direction="row" spacing={3}>
              <Link onClick={() => navigate('/about')} sx={{ cursor: 'pointer', color: 'text.disabled', textDecoration: 'none', fontSize: '0.75rem', '&:hover': { color: 'text.primary' } }}>Privacy Policy</Link>
              <Link onClick={() => navigate('/about')} sx={{ cursor: 'pointer', color: 'text.disabled', textDecoration: 'none', fontSize: '0.75rem', '&:hover': { color: 'text.primary' } }}>Terms of Service</Link>
            </Stack>
          </Box>
        </Container>
      </Box>
    </Box>
    </>
  );
}
