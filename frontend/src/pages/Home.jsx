import React, { useEffect, useState } from 'react';
import {
  Box, Container, Typography, Button, Grid, Card, CardContent,
  Paper, Divider, Stack, Fade, Chip
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { keyframes } from '@emotion/react';
import FactoryIcon from '@mui/icons-material/Factory';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SecurityIcon from '@mui/icons-material/Security';
import BarChartIcon from '@mui/icons-material/BarChart';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SpeedIcon from '@mui/icons-material/Speed';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import LoadingScreen from '../components/LoadingScreen';
import UnifiedNav from '../components/UnifiedNav';
import UnifiedFooter from '../components/UnifiedFooter';
import { publicService } from '../services/api';

// Animations
const dashboardFloat = keyframes`
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-8px) rotate(0.3deg); }
`;
const pulseGreen = keyframes`
  0% { transform: scale(0.92); box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.6); }
  70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(76, 175, 80, 0); }
  100% { transform: scale(0.92); box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
`;
const drawPath = keyframes`
  from { stroke-dashoffset: 400; }
  to { stroke-dashoffset: 0; }
`;
const slideUp = keyframes`
  from { opacity: 0; transform: translateY(30px); }
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
const orbit1 = keyframes`
  0% { transform: translate(0px, 0px) scale(1); }
  33% { transform: translate(40px, -60px) scale(1.05); }
  66% { transform: translate(-30px, 30px) scale(0.95); }
  100% { transform: translate(0px, 0px) scale(1); }
`;
const orbit2 = keyframes`
  0% { transform: translate(0px, 0px) scale(1); }
  50% { transform: translate(-50px, 40px) scale(1.1); }
  100% { transform: translate(0px, 0px) scale(1); }
`;
const pulseCardGlow = keyframes`
  0%, 100% { box-shadow: 0 30px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06), 0 0 25px rgba(76,175,80,0.03); }
  50% { box-shadow: 0 30px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1), 0 0 35px rgba(76,175,80,0.12); }
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
  const [dashboardTab, setDashboardTab] = useState('telemetry');
  const [highlightedRow, setHighlightedRow] = useState(null);
  const [alertFilter, setAlertFilter] = useState('all');
  const [recentEvents, setRecentEvents] = useState([
    { time: 'Just now', msg: 'SLA NOC Approved - Kanchipuram Hub', type: 'success' },
    { time: '2 mins ago', msg: 'GST Verification completed for Unit #49', type: 'info' },
    { time: '5 mins ago', msg: 'GIS Map plot allocation sync finished', type: 'success' },
    { time: '12 mins ago', msg: 'New grievance ticket registered - Org #382', type: 'warning' },
  ]);

  // Live public statistics (real data from /api/public/pulse)
  const [pulse, setPulse] = useState(null);
  useEffect(() => {
    let active = true;
    publicService.getPulse().then(res => { if (active) setPulse(res.data); }).catch(() => {});
    return () => { active = false; };
  }, []);

  // Real-time telemetry data states
  const [streamingRate, setStreamingRate] = useState(45.8);
  const [telemetryPoints1, setTelemetryPoints1] = useState([80, 70, 55, 62, 50, 45, 55, 38, 28, 20, 15]);
  const [telemetryPoints2, setTelemetryPoints2] = useState([90, 75, 50, 55, 45, 38, 32, 45, 52, 40, 35]);

  // Telemetry real-time update logic
  useEffect(() => {
    if (dashboardTab !== 'telemetry') return;

    let intervalId;
    // Delay start of dynamic telemetry updates by 3 seconds to let initial draw animation complete
    const startTimeout = setTimeout(() => {
      intervalId = setInterval(() => {
        setStreamingRate(prev => {
          const diff = (Math.random() - 0.5) * 4;
          const next = Math.max(40.0, Math.min(50.0, prev + diff));
          return parseFloat(next.toFixed(1));
        });

        setTelemetryPoints1(prev => {
          const next = [...prev];
          next.shift();
          const lastVal = next[next.length - 1];
          // Bounded random walk to avoid large jumps
          const diff = (Math.random() - 0.5) * 20;
          const newVal = Math.max(10, Math.min(85, lastVal + diff));
          next.push(Math.round(newVal));
          return next;
        });

        setTelemetryPoints2(prev => {
          const next = [...prev];
          next.shift();
          const lastVal = next[next.length - 1];
          // Bounded random walk to avoid large jumps
          const diff = (Math.random() - 0.5) * 20;
          const newVal = Math.max(15, Math.min(90, lastVal + diff));
          next.push(Math.round(newVal));
          return next;
        });
      }, 1200);
    }, 3000);

    return () => {
      clearTimeout(startTimeout);
      if (intervalId) clearInterval(intervalId);
    };
  }, [dashboardTab]);

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


  return (
    <>
      {isIntroLoading && <LoadingScreen message="Initializing THOZHIRPORUL..." />}
      <UnifiedNav transparent={true} />
      <Box sx={{ overflowX: 'hidden', bgcolor: '#f8fafc' }}>

      {/* HERO SECTION */}
      <Box sx={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        bgcolor: '#070b13',
        background: `linear-gradient(135deg, rgba(7,11,19,0.95) 0%, rgba(15,23,42,0.85) 50%, rgba(7,11,19,0.95) 100%),
          url("https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=2000")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}>
        {/* Animated grid pattern overlay */}
        <Box sx={{
          position: 'absolute',
          inset: 0,
          opacity: 0.07,
          backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
        }} />

        {/* Floating complex orbs */}
        {[
          { size: 450, top: '5%', right: '-10%', delay: '0s', color: 'rgba(46,125,50,0.14)', animation: orbit1 },
          { size: 350, bottom: '5%', left: '-8%', delay: '1.5s', color: 'rgba(31,78,121,0.12)', animation: orbit2 },
          { size: 250, top: '50%', right: '15%', delay: '3s', color: 'rgba(46,125,50,0.08)', animation: orbit1 },
        ].map((orb, i) => (
          <Box key={i} sx={{
            position: 'absolute',
            width: orb.size,
            height: orb.size,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${orb.color}, transparent 70%)`,
            top: orb.top,
            bottom: orb.bottom,
            left: orb.left,
            right: orb.right,
            animation: `${orb.animation} ${12 + i * 4}s ease-in-out infinite alternate`,
            filter: 'blur(90px)',
            pointerEvents: 'none',
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
                  bgcolor: 'rgba(46, 125, 50, 0.08)',
                  border: '1px solid rgba(46, 125, 50, 0.25)',
                  borderRadius: '50px',
                  px: 2.5,
                  py: 1,
                  backdropFilter: 'blur(12px)',
                  boxShadow: '0 0 15px rgba(46, 125, 50, 0.05)',
                  animation: `${slideUp} 0.8s ease-out`,
                }}>
                  <Box sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: '#2E7D32',
                    boxShadow: '0 0 8px #2E7D32',
                    animation: `${pulseGreen} 1.8s infinite ease-in-out`
                  }} />
                  <Typography sx={{
                    fontWeight: 800,
                    letterSpacing: '0.12em',
                    fontSize: '0.72rem',
                    color: '#4CAF50',
                    textTransform: 'uppercase'
                  }}>
                    SIPCOT SIMS 2.0 • Live Monitoring Active
                  </Typography>
                </Box>
 
                <Typography variant="h1" sx={{
                  fontSize: { xs: '2.8rem', sm: '3.8rem', md: '4.8rem' },
                  fontWeight: 900,
                  lineHeight: 1.1,
                  mb: 3,
                  letterSpacing: '-0.04em',
                  animation: `${slideUp} 1s ease-out`,
                }}>
                  Welcome to{' '}
                  <Box component="span" sx={{
                    background: 'linear-gradient(90deg, #4CAF50 0%, #2E7D32 50%, #81C784 100%)',
                    backgroundSize: '200% auto',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    animation: `${shimmer} 4s linear infinite`,
                    display: 'inline-block',
                    overflow: 'visible'
                  }}>
                    THOZHIRPORUL
                  </Box>
                </Typography>
 
                <Typography variant="h5" sx={{
                  mb: 5, fontWeight: 400, color: 'rgba(255, 255, 255, 0.72)', maxWidth: { xs: '100%', md: 620 },
                  fontSize: { xs: '1.05rem', md: '1.25rem' }, lineHeight: 1.6,
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
                      background: 'linear-gradient(135deg, #4CAF50, #2E7D32)',
                      boxShadow: '0 8px 30px rgba(46,125,50,0.3)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        transform: 'translateY(-3px)',
                        boxShadow: '0 12px 36px rgba(46,125,50,0.5)',
                        background: 'linear-gradient(135deg, #2E7D32, #1B5E20)'
                      },
                    }}>
                    Launch Command Portal
                  </Button>
                  <Button variant="outlined" size="large" onClick={() => navigate('/parks')}
                    sx={{
                      px: 4, py: 2, fontSize: '1rem', fontWeight: 700, borderRadius: 3.5,
                      color: 'white', borderColor: 'rgba(255,255,255,0.25)', borderWidth: 1.5,
                      backdropFilter: 'blur(10px)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        borderColor: '#2E7D32',
                        borderWidth: 1.5,
                        bgcolor: 'rgba(46,125,50,0.08)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 24px rgba(46,125,50,0.1)'
                      },
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
                        px: 2.5, py: 1.2, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)',
                        color: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', gap: 1.2,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          bgcolor: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(46,125,50,0.3)',
                          transform: 'translateY(-2px)',
                          color: 'white'
                        },
                      }}>
                        <Box sx={{ color: '#2E7D32', display: 'flex', alignItems: 'center' }}>{item.icon}</Box>
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
                  maxWidth: 500,
                  bgcolor: 'rgba(10, 15, 30, 0.7)',
                  backdropFilter: 'blur(30px)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 6,
                  boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
                  p: 3,
                  mx: 'auto',
                  animation: `${dashboardFloat} 6s ease-in-out infinite, ${pulseCardGlow} 8s ease-in-out infinite`,
                  overflow: 'hidden'
                }}>
                  {/* Glowing dynamic background nodes inside card */}
                  <Box sx={{ position: 'absolute', top: '-10%', left: '-10%', width: '120px', height: '120px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(76,175,80,0.08), transparent 70%)', filter: 'blur(15px)', pointerEvents: 'none' }} />
                  
                  {/* Dashboard Header */}
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2.5}>
                    <Box display="flex" alignItems="center" gap={1.2}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#2E7D32', boxShadow: '0 0 8px #2E7D32', animation: `${pulseGreen} 1.5s infinite` }} />
                      <Typography sx={{ fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.7)' }}>
                        SIMS CONTROL ROOM
                      </Typography>
                    </Box>
                    <Typography sx={{ fontWeight: 800, fontSize: '0.65rem', color: '#4CAF50', bgcolor: 'rgba(46,125,50,0.12)', border: '1px solid rgba(46,125,50,0.2)', px: 1.5, py: 0.5, borderRadius: 2 }}>
                      SYS: LIVE
                    </Typography>
                  </Box>
 
                  {/* Stat Grid */}
                  <Grid container spacing={2} mb={3}>
                    <Grid size={{ xs: 6 }}>
                      <Paper variant="outlined" sx={{
                        p: 2, bgcolor: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.05)', borderRadius: 3.5,
                        transition: 'all 0.3s ease',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(46,125,50,0.2)' }
                      }}>
                        <Typography sx={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.45)', fontWeight: 700, mb: 0.5, letterSpacing: '0.05em' }}>COMPLIANCE AVG</Typography>
                        <Box display="flex" alignItems="baseline" gap={0.5}>
                          <Typography variant="h5" sx={{ fontWeight: 900, color: '#2E7D32', letterSpacing: '-0.02em' }}>98.4%</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', color: '#2E7D32', fontSize: '0.65rem', fontWeight: 700 }}>
                            <TrendingUpIcon sx={{ fontSize: 10, mr: 0.2 }} />
                            +0.4%
                          </Box>
                        </Box>
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Paper variant="outlined" sx={{
                        p: 2, bgcolor: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.05)', borderRadius: 3.5,
                        transition: 'all 0.3s ease',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(31,78,121,0.2)' }
                      }}>
                        <Typography sx={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.45)', fontWeight: 700, mb: 0.5, letterSpacing: '0.05em' }}>ACTIVE UNITS</Typography>
                        <Box display="flex" alignItems="baseline" gap={0.5}>
                          <Typography variant="h5" sx={{ fontWeight: 900, color: '#1F4E79', letterSpacing: '-0.02em' }}>1,842</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', color: '#1F4E79', fontSize: '0.65rem', fontWeight: 700 }}>
                            <TrendingUpIcon sx={{ fontSize: 10, mr: 0.2 }} />
                            +12
                          </Box>
                        </Box>
                      </Paper>
                    </Grid>
                  </Grid>
 
                  {/* Interactive Switch Tabs */}
                  <Box sx={{ display: 'flex', bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 3.5, p: 0.5, mb: 2.5, border: '1px solid rgba(255,255,255,0.05)' }}>
                    {[
                      { id: 'telemetry', label: 'Telemetry', icon: <SpeedIcon sx={{ fontSize: 13 }} /> },
                      { id: 'compliance', label: 'Compliance', icon: <SecurityIcon sx={{ fontSize: 13 }} /> },
                      { id: 'alerts', label: 'Alert Feed', icon: <WarningAmberIcon sx={{ fontSize: 13 }} /> },
                    ].map((tab) => (
                      <Box
                        key={tab.id}
                        onClick={() => setDashboardTab(tab.id)}
                        sx={{
                          flex: 1, py: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.8,
                          borderRadius: 3, fontWeight: 800, fontSize: '0.72rem', cursor: 'pointer',
                          bgcolor: dashboardTab === tab.id ? 'rgba(255,255,255,0.08)' : 'transparent',
                          color: dashboardTab === tab.id ? '#2E7D32' : 'rgba(255,255,255,0.5)',
                          border: dashboardTab === tab.id ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
                          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                          '&:hover': {
                            color: 'white',
                            bgcolor: dashboardTab === tab.id ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)'
                          }
                        }}
                      >
                        {tab.icon}
                        {tab.label}
                      </Box>
                    ))}
                  </Box>
 
                  {/* TAB CONTENT: Telemetry */}
                  {dashboardTab === 'telemetry' && (
                    <Box sx={{ animation: `${slideUp} 0.4s ease-out` }}>
                      <Box sx={{ mb: 2.5, p: 2, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 3.5, border: '1px solid rgba(255,255,255,0.03)' }}>
                        <Box display="flex" justifyContent="space-between" mb={1}>
                          <Typography sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', fontWeight: 800 }}>DATA STREAMING RATE</Typography>
                          <Typography sx={{ fontSize: '0.65rem', color: '#2E7D32', fontWeight: 800 }}>{streamingRate} MB/s</Typography>
                        </Box>
                        <svg viewBox="0 0 300 100" style={{ width: '100%', height: '80px', display: 'block' }}>
                          <line x1="0" y1="20" x2="300" y2="20" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                          <line x1="0" y1="50" x2="300" y2="50" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                          <line x1="0" y1="80" x2="300" y2="80" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                          <path
                            d={telemetryPoints1.map((y, i) => `${i === 0 ? 'M' : 'L'} ${i * 30} ${y}`).join(' ')}
                            fill="none"
                            stroke="#1F4E79"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            style={{
                              strokeDasharray: '400',
                              strokeDashoffset: '400',
                              animation: `${drawPath} 2.5s cubic-bezier(0.4, 0, 0.2, 1) forwards`,
                              transition: 'd 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            }}
                          />
                          <path
                            d={telemetryPoints2.map((y, i) => `${i === 0 ? 'M' : 'L'} ${i * 30} ${y}`).join(' ')}
                            fill="none"
                            stroke="#2E7D32"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            style={{
                              strokeDasharray: '400',
                              strokeDashoffset: '400',
                              animation: `${drawPath} 2.5s 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards`,
                              transition: 'd 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            }}
                          />
                          <circle
                            cx="300"
                            cy={telemetryPoints1[telemetryPoints1.length - 1]}
                            r="4"
                            fill="#1F4E79"
                            style={{
                              filter: 'drop-shadow(0 0 4px #1F4E79)',
                              transition: 'cy 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            }}
                          />
                          <circle
                            cx="300"
                            cy={telemetryPoints2[telemetryPoints2.length - 1]}
                            r="4"
                            fill="#2E7D32"
                            style={{
                              filter: 'drop-shadow(0 0 4px #2E7D32)',
                              transition: 'cy 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            }}
                          />
                        </svg>
                      </Box>
                      {/* Cluster Nodes */}
                      <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap={1.5}>
                        {[
                          { name: 'Kanchipuram Hub', status: 'Optimal', color: '#2E7D32' },
                          { name: 'Coimbatore Hub', status: 'Optimal', color: '#2E7D32' },
                          { name: 'Hosur Cluster', status: 'Synced', color: '#1F4E79' },
                          { name: 'Madurai District', status: 'Optimal', color: '#2E7D32' }
                        ].map((node, i) => (
                          <Box key={i} sx={{
                            p: 1.2, borderRadius: 2.5, bgcolor: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            transition: 'all 0.2s ease', '&:hover': { bgcolor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.1)' }
                          }}>
                            <Box display="flex" flexDirection="column">
                              <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{node.name}</Typography>
                              <Typography sx={{ fontSize: '0.55rem', fontWeight: 600, color: 'rgba(255,255,255,0.45)' }}>{node.status}</Typography>
                            </Box>
                            <Box sx={{ ml: 'auto', width: 6, height: 6, borderRadius: '50%', bgcolor: node.color, boxShadow: `0 0 6px ${node.color}` }} />
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}
 
                  {/* TAB CONTENT: Compliance */}
                  {dashboardTab === 'compliance' && (
                    <Box sx={{ animation: `${slideUp} 0.4s ease-out` }}>
                      <Grid container spacing={2.5} alignItems="center">
                        <Grid size={{ xs: 5 }}>
                          <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <svg viewBox="0 0 100 100" style={{ width: '100%', maxWidth: '100px', transform: 'rotate(-90deg)' }}>
                              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="6" />
                              <circle
                                cx="50"
                                cy="50"
                                r="42"
                                fill="none"
                                stroke="#2E7D32"
                                strokeWidth="6"
                                strokeDasharray="264"
                                strokeDashoffset="4"
                                strokeLinecap="round"
                                style={{
                                  filter: 'drop-shadow(0 0 6px rgba(46,125,50,0.5))',
                                  transition: 'stroke-dashoffset 1s ease-in-out'
                                }}
                              />
                            </svg>
                            <Box sx={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <Typography sx={{ fontSize: '1.1rem', fontWeight: 900, color: 'white', lineHeight: 1 }}>98.4%</Typography>
                              <Typography sx={{ fontSize: '0.45rem', fontWeight: 800, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.05em' }}>AVG SCORE</Typography>
                            </Box>
                          </Box>
                        </Grid>
                        <Grid size={{ xs: 7 }}>
                          <Stack spacing={1}>
                            {[
                              { label: 'SLA NOC Clearances', val: '99.2%', color: '#2E7D32' },
                              { label: 'Environmental Filings', val: '97.8%', color: '#2E7D32' },
                              { label: 'Statutory GST Audits', val: '98.5%', color: '#1F4E79' },
                            ].map((metric, i) => (
                              <Box
                                key={i}
                                onClick={() => setHighlightedRow(i)}
                                sx={{
                                  p: 1.2, borderRadius: 2.5, cursor: 'pointer',
                                  bgcolor: highlightedRow === i ? 'rgba(46,125,50,0.08)' : 'rgba(255,255,255,0.01)',
                                  border: highlightedRow === i ? '1px solid rgba(46,125,50,0.25)' : '1px solid rgba(255,255,255,0.04)',
                                  transition: 'all 0.2s ease',
                                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}
                              >
                                <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: highlightedRow === i ? '#2E7D32' : 'rgba(255,255,255,0.85)' }}>{metric.label}</Typography>
                                <Typography sx={{ fontSize: '0.65rem', fontWeight: 900, color: metric.color }}>{metric.val}</Typography>
                              </Box>
                            ))}
                          </Stack>
                        </Grid>
                      </Grid>
                      <Box sx={{ mt: 2.5, p: 1.5, borderRadius: 2.5, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <SecurityIcon sx={{ color: '#2E7D32', fontSize: 16 }} />
                        <Typography sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                          All industrial sectors currently operate within compliance boundaries.
                        </Typography>
                      </Box>
                    </Box>
                  )}
 
                  {/* TAB CONTENT: Alert Feed */}
                  {dashboardTab === 'alerts' && (
                    <Box sx={{ animation: `${slideUp} 0.4s ease-out` }}>
                      {/* Alert Filter Toggles */}
                      <Box display="flex" gap={1} mb={2}>
                        {['all', 'warning', 'info'].map((f) => (
                          <Box
                            key={f}
                            onClick={() => setAlertFilter(f)}
                            sx={{
                              px: 1.5, py: 0.5, borderRadius: 1.5, fontSize: '0.6rem', fontWeight: 800, cursor: 'pointer',
                              textTransform: 'uppercase', letterSpacing: '0.05em',
                              bgcolor: alertFilter === f ? 'rgba(255,255,255,0.08)' : 'transparent',
                              color: alertFilter === f ? '#2E7D32' : 'rgba(255,255,255,0.4)',
                              border: '1px solid',
                              borderColor: alertFilter === f ? 'rgba(46,125,50,0.3)' : 'rgba(255,255,255,0.05)',
                              transition: 'all 0.2s ease',
                              '&:hover': { color: 'white' }
                            }}
                          >
                            {f}
                          </Box>
                        ))}
                      </Box>
 
                      {/* Activity log feed */}
                      <Stack spacing={1} sx={{ minHeight: 120 }}>
                        {recentEvents
                          .filter(evt => alertFilter === 'all' || evt.type === alertFilter)
                          .map((evt, idx) => (
                            <Box key={idx} sx={{
                              p: 1.2,
                              borderRadius: 2.5,
                              bgcolor: 'rgba(255,255,255,0.01)',
                              borderLeft: `3px solid ${
                                evt.type === 'success' ? '#2E7D32' : evt.type === 'warning' ? '#1F4E79' : '#1F4E79'
                              }`,
                              borderRight: '1px solid rgba(255,255,255,0.03)',
                              borderTop: '1px solid rgba(255,255,255,0.03)',
                              borderBottom: '1px solid rgba(255,255,255,0.03)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              animation: `${slideUp} 0.3s ease-out forwards`,
                              transition: 'all 0.2s ease',
                              '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' }
                            }}>
                              <Typography sx={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.85)', fontWeight: 600, maxWidth: '80%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {evt.msg}
                              </Typography>
                              <Typography sx={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>
                                {evt.time}
                              </Typography>
                            </Box>
                          ))}
                      </Stack>
                    </Box>
                  )}
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
              { label: 'Industrial Parks', value: pulse ? String(pulse.activeParkCount) : '8', suffix: '+', delay: 200 },
              { label: 'Land Bank', value: pulse ? pulse.landBank : '3,590', suffix: pulse?.landBank_unit || 'acres', delay: 400 },
              { label: 'Total Investment', value: pulse ? pulse.totalInvestment : '18,470', suffix: `${pulse?.totalInvestment_unit || 'Cr'}+`, delay: 600 },
              { label: 'Jobs Created', value: pulse ? pulse.totalEmployment : '1,12,000', suffix: '+', delay: 800 },
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
                color: '#2E7D32',
                bgColor: '#e8f5e9',
                shadow: '0 8px 24px rgba(46, 125, 50, 0.08)',
                hoverShadow: '0 20px 40px rgba(46, 125, 50, 0.15)',
                hoverIconShadow: '0 12px 28px rgba(46, 125, 50, 0.22)',
                path: '/analytics',
                badge: 'AI-Powered',
                action: 'View Analytics'
              },
              {
                title: 'Unified Gateway',
                desc: 'Single platform connecting factory owners, NEXORA administrators, and state officials seamlessly.',
                icon: <FactoryIcon sx={{ fontSize: 32 }} />,
                color: '#1F4E79',
                bgColor: '#e6f0fa',
                shadow: '0 8px 24px rgba(31, 78, 121, 0.08)',
                hoverShadow: '0 20px 40px rgba(31, 78, 121, 0.15)',
                hoverIconShadow: '0 12px 28px rgba(31, 78, 121, 0.22)',
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
                color: '#1F4E79',
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
      <UnifiedFooter />
    </Box>
    </>
  );
}
