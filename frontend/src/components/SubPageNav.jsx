import React from 'react';
import { AppBar, Toolbar, Container, Box, Typography, Button, Stack, IconButton, useScrollTrigger } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import SpeedIcon from '@mui/icons-material/Speed';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HomeIcon from '@mui/icons-material/Home';
import logoTransparent from '../assets/logo-transparent.png';

export default function SubPageNav() {
  const navigate = useNavigate();
  const trigger = useScrollTrigger({ disableHysteresis: true, threshold: 10 });

  return (
    <AppBar position="fixed" elevation={trigger ? 2 : 0} sx={{
      bgcolor: trigger ? 'rgba(255,255,255,0.97)' : 'transparent',
      backdropFilter: trigger ? 'blur(20px)' : 'none',
      borderBottom: trigger ? '1px solid rgba(226,232,240,0.8)' : 'none',
      transition: 'all 0.3s ease', zIndex: 1100,
    }}>
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ justifyContent: 'space-between', height: 64 }}>
          {/* Left: Back + Logo */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton onClick={() => navigate('/home')} size="small"
              sx={{ color: trigger ? 'primary.main' : 'white', border: '1px solid', borderColor: trigger ? 'divider' : 'rgba(255,255,255,0.25)', mr: 1 }}>
              <ArrowBackIcon fontSize="small" />
            </IconButton>
            <Box sx={{
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <img src={logoTransparent} alt="THOZHIPORUL Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </Box>
            <Box sx={{ cursor: 'pointer' }} onClick={() => navigate('/home')}>
              <Typography variant="subtitle1" fontWeight={900} sx={{
                lineHeight: 1, fontSize: '1rem',
                color: trigger ? 'text.primary' : 'white',
                transition: 'color 0.3s',
              }}>
                THOZHIPORUL
              </Typography>
              <Typography variant="caption" sx={{ fontSize: '0.5rem', fontWeight: 600, letterSpacing: '0.08em', color: trigger ? 'text.secondary' : 'rgba(255,255,255,0.6)' }}>
                BY NEXORA
              </Typography>
            </Box>
          </Box>

          {/* Right: Nav links */}
          <Stack direction="row" spacing={0.5} sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center' }}>
            {[
              { label: 'Home', path: '/home', icon: <HomeIcon sx={{ fontSize: 16, mr: 0.3 }} /> },
              { label: 'About', path: '/about' },
              { label: 'Features', path: '/features' },
              { label: 'Parks', path: '/parks' },
              { label: 'Contact', path: '/contact' },
            ].map((item) => (
              <Button key={item.label} size="small" onClick={() => navigate(item.path)}
                startIcon={item.icon || null}
                sx={{
                  fontWeight: 600, fontSize: '0.8rem', px: 1.5,
                  color: trigger ? 'text.secondary' : 'rgba(255,255,255,0.85)',
                  '&:hover': { color: trigger ? 'primary.main' : 'white', bgcolor: 'transparent' },
                }}>
                {item.label}
              </Button>
            ))}
            <Button variant="contained" size="small" onClick={() => navigate('/role-selection')}
              sx={{ ml: 1, fontWeight: 700, borderRadius: 2, px: 2, background: 'linear-gradient(135deg, #1F4E79, #2E7D32)' }}>
              Login
            </Button>
          </Stack>

          {/* Mobile: Home button */}
          <Box sx={{ display: { xs: 'flex', sm: 'none' }, gap: 1 }}>
            <Button size="small" variant="outlined" onClick={() => navigate('/home')}
              sx={{ color: trigger ? 'primary.main' : 'white', borderColor: trigger ? 'divider' : 'rgba(255,255,255,0.3)' }}>
              Home
            </Button>
            <Button size="small" variant="contained" onClick={() => navigate('/role-selection')}
              sx={{ background: 'linear-gradient(135deg, #1F4E79, #2E7D32)' }}>
              Login
            </Button>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
