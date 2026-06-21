import React, { useState, useEffect } from 'react';
import { AppBar, Toolbar, Container, Box, Typography, Button, Stack, IconButton, Drawer, List, ListItemButton, ListItemText, Divider, Collapse } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useScrollTrigger } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import HomeIcon from '@mui/icons-material/Home';
import logoTransparent from '../assets/logo-transparent.png';
import AccessibilityNew from '@mui/icons-material/AccessibilityNew';

const navItems = [
  { label: 'Home', path: '/home', icon: <HomeIcon sx={{ fontSize: 16 }} /> },
  { label: 'About', path: '/about' },
  { label: 'Features', path: '/features' },
  { label: 'Pricing', path: '/subscriptions' },
  { label: 'Parks', path: '/parks' },
  { label: 'Contact', path: '/contact' },
  { label: 'Grievance', path: '/grievance' },
];

export default function UnifiedNav({ transparent = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const trigger = useScrollTrigger({ disableHysteresis: true, threshold: 50 });

  useEffect(() => {
    setScrolled(trigger);
  }, [trigger]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigate = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          bgcolor: (scrolled || !transparent) ? 'rgba(255, 255, 255, 0.85)' : 'transparent',
          backdropFilter: (scrolled || !transparent) ? 'blur(20px)' : 'none',
          borderBottom: (scrolled || !transparent) ? '1px solid rgba(226, 232, 240, 0.8)' : 'none',
          boxShadow: (scrolled || !transparent) ? '0 4px 20px rgba(15, 23, 42, 0.04)' : 'none',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 1100,
        }}
      >
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ justifyContent: 'space-between', height: 70 }}>
            {/* Logo */}
            <Box
              sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => handleNavigate('/home')}
            >
              <Box
                sx={{
                  width: 45,
                  height: 45,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={logoTransparent}
                  alt="THOZHIRPORUL Logo"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </Box>
              <Box sx={{ ml: 1 }}>
                <Typography
                  variant="h6"
                  fontWeight={900}
                  sx={{
                    lineHeight: 1,
                    fontSize: '1.15rem',
                    background: (scrolled || !transparent) 
                      ? 'linear-gradient(90deg, #1F4E79 0%, #2E7D32 100%)' 
                      : 'white',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: (scrolled || !transparent) ? 'transparent' : 'white',
                    transition: 'all 0.3s',
                  }}
                >
                  THOZHIRPORUL
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '0.5rem',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    color: (scrolled || !transparent) ? '#64748B' : 'rgba(255,255,255,0.75)',
                    lineHeight: 1,
                  }}
                >
                  BY NEXORA
                </Typography>
              </Box>
            </Box>

            {/* Desktop Nav */}
            <Stack direction="row" spacing={1} sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center' }}>
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Button
                    key={item.label}
                    size="small"
                    onClick={() => handleNavigate(item.path)}
                    startIcon={isActive ? item.icon : null}
                    sx={{
                      fontWeight: isActive ? 750 : 600,
                      fontSize: '0.82rem',
                      px: 2,
                      py: 0.75,
                      textTransform: 'none',
                      color: isActive
                        ? (scrolled || !transparent ? '#2E7D32' : '#81C784')
                        : (scrolled || !transparent ? '#475569' : 'rgba(255,255,255,0.9)'),
                      bgcolor: isActive 
                        ? ((scrolled || !transparent) ? 'rgba(46,125,50,0.08)' : 'rgba(255,255,255,0.15)') 
                        : 'transparent',
                      borderRadius: 2.5,
                      border: isActive
                        ? ((scrolled || !transparent) ? '1px solid rgba(46,125,50,0.12)' : '1px solid rgba(255,255,255,0.25)')
                        : '1px solid transparent',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      backdropFilter: (isActive && !scrolled && transparent) ? 'blur(10px)' : 'none',
                      '&:hover': {
                        color: scrolled || !transparent ? '#2E7D32' : '#81C784',
                        bgcolor: scrolled || !transparent ? 'rgba(46,125,50,0.04)' : 'rgba(255,255,255,0.1)',
                        borderColor: scrolled || !transparent ? 'rgba(46,125,50,0.08)' : 'rgba(255,255,255,0.15)',
                      },
                    }}
                  >
                    {item.label}
                  </Button>
                );
              })}
              <IconButton
                onClick={() => window.dispatchEvent(new Event('open-accessibility-panel'))}
                sx={{
                  ml: 1,
                  color: scrolled || !transparent ? '#1F4E79' : 'white',
                  '&:hover': { bgcolor: scrolled || !transparent ? 'rgba(31,78,121,0.08)' : 'rgba(255,255,255,0.1)' }
                }}
                aria-label="accessibility options"
              >
                <AccessibilityNew className="acc-icon-keep" />
              </IconButton>
              <Button
                variant="contained"
                size="small"
                onClick={() => handleNavigate('/role-selection')}
                sx={{
                  ml: 1.5,
                  fontWeight: 800,
                  borderRadius: 3.5,
                  px: 3,
                  py: 1,
                  textTransform: 'none',
                  background: 'linear-gradient(135deg, #1F4E79 0%, #2E7D32 100%)',
                  boxShadow: '0 4px 12px rgba(31, 78, 121, 0.2)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 24px rgba(31, 78, 121, 0.35)',
                    background: 'linear-gradient(135deg, #2A6399 0%, #3B9B40 100%)',
                  },
                  '&:active': {
                    transform: 'scale(0.96) translateY(-1px)',
                  }
                }}
              >
                Login
              </Button>
            </Stack>

            {/* Mobile Menu Button */}
            <IconButton
              sx={{ display: { xs: 'flex', md: 'none' }, color: (scrolled || !transparent) ? 'text.primary' : 'white' }}
              onClick={handleDrawerToggle}
            >
              <MenuIcon />
            </IconButton>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        PaperProps={{
          sx: {
            width: 290,
            bgcolor: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(20px)',
            borderLeft: '1px solid rgba(226, 232, 240, 0.8)',
            borderTop: '6px solid',
            borderImage: 'linear-gradient(135deg, #1F4E79, #2E7D32) 1',
          },
        }}
      >
        <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <img src={logoTransparent} alt="Logo" style={{ width: 34, height: 34 }} />
            <Typography fontWeight={900} sx={{ color: '#1F4E79', letterSpacing: '-0.02em', fontSize: '1.05rem' }}>
              THOZHIRPORUL
            </Typography>
          </Box>
          <IconButton onClick={handleDrawerToggle} size="small" sx={{ bgcolor: 'rgba(0,0,0,0.03)', '&:hover': { bgcolor: 'rgba(0,0,0,0.06)' } }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
        <Divider sx={{ borderColor: 'rgba(226, 232, 240, 0.8)' }} />
        <List sx={{ py: 2, px: 1.5 }}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <ListItemButton
                key={item.label}
                onClick={() => handleNavigate(item.path)}
                selected={isActive}
                sx={{
                  my: 0.8,
                  py: 1.2,
                  px: 2,
                  borderRadius: 3,
                  transition: 'all 0.2s ease',
                  '&.Mui-selected': {
                    bgcolor: 'rgba(46, 125, 50, 0.08)',
                    border: '1px solid rgba(46, 125, 50, 0.12)',
                    '&:hover': {
                      bgcolor: 'rgba(46, 125, 50, 0.12)',
                    },
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      left: 8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 4,
                      height: 18,
                      bgcolor: '#2E7D32',
                      borderRadius: 2,
                    },
                  },
                  '&:hover': {
                    bgcolor: 'rgba(0, 0, 0, 0.03)',
                  }
                }}
              >
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontWeight: isActive ? 800 : 600,
                    color: isActive ? '#2E7D32' : '#1E293B',
                    fontSize: '0.92rem',
                    sx: { pl: isActive ? 1.2 : 0, transition: 'all 0.2s ease' }
                  }}
                />
              </ListItemButton>
            );
          })}
          <ListItemButton
            onClick={() => { handleDrawerToggle(); window.dispatchEvent(new Event('open-accessibility-panel')); }}
            sx={{
              my: 0.8,
              py: 1.2,
              px: 2,
              borderRadius: 3,
              bgcolor: 'rgba(31, 78, 121, 0.04)',
              border: '1px solid rgba(31, 78, 121, 0.1)'
            }}
          >
            <ListItemText
              primary="Accessibility Options"
              primaryTypographyProps={{
                fontWeight: 700,
                color: '#1F4E79',
                fontSize: '0.92rem'
              }}
            />
          </ListItemButton>
          <Divider sx={{ my: 3, borderColor: 'rgba(226, 232, 240, 0.8)' }} />
          <ListItemButton
            onClick={() => handleNavigate('/role-selection')}
            sx={{ 
              mx: 0.5, 
              mt: 1, 
              py: 1.6,
              background: 'linear-gradient(135deg, #1F4E79, #2E7D32)', 
              color: 'white', 
              borderRadius: 3.5, 
              boxShadow: '0 4px 12px rgba(31, 78, 121, 0.2)',
              transition: 'all 0.3s ease',
              '&:hover': { 
                background: 'linear-gradient(135deg, #2A6399, #3B9B40)',
                transform: 'translateY(-1px)',
                boxShadow: '0 6px 16px rgba(31, 78, 121, 0.3)',
              },
              '&:active': {
                transform: 'scale(0.97)',
              }
            }}
          >
            <ListItemText primary="Login to THOZHIRPORUL" primaryTypographyProps={{ fontWeight: 800, textAlign: 'center', fontSize: '0.92rem' }} />
          </ListItemButton>
        </List>
      </Drawer>
    </>
  );
}
