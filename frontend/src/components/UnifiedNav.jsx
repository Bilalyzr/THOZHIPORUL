import React, { useState, useEffect } from 'react';
import { AppBar, Toolbar, Container, Box, Typography, Button, Stack, IconButton, Drawer, List, ListItemButton, ListItemText, Divider, Collapse } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useScrollTrigger } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import HomeIcon from '@mui/icons-material/Home';
import logoTransparent from '../assets/logo-transparent.png';

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
        elevation={scrolled || !transparent ? 2 : 0}
        sx={{
          bgcolor: (scrolled || !transparent) ? 'rgba(255,255,255,0.98)' : 'transparent',
          backdropFilter: (scrolled || !transparent) ? 'blur(20px)' : 'none',
          borderBottom: (scrolled || !transparent) ? '1px solid rgba(226,232,240,0.8)' : 'none',
          transition: 'all 0.3s ease',
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
                    color: (scrolled || !transparent) ? '#1F4E79' : 'white',
                    transition: 'color 0.3s',
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
                    color: (scrolled || !transparent) ? 'text.secondary' : 'rgba(255,255,255,0.7)',
                    lineHeight: 1,
                  }}
                >
                  BY NEXORA
                </Typography>
              </Box>
            </Box>

            {/* Desktop Nav */}
            <Stack direction="row" spacing={1.5} sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center' }}>
              {navItems.map((item) => (
                <Button
                  key={item.label}
                  size="small"
                  onClick={() => handleNavigate(item.path)}
                  startIcon={location.pathname === item.path ? item.icon : null}
                  sx={{
                    fontWeight: location.pathname === item.path ? 700 : 600,
                    fontSize: '0.8rem',
                    px: 1.5,
                    color: location.pathname === item.path
                      ? (scrolled || !transparent ? '#2E7D32' : '#4CAF50')
                      : (scrolled || !transparent ? 'text.secondary' : 'rgba(255,255,255,0.85)'),
                    bgcolor: location.pathname === item.path ? ((scrolled || !transparent) ? 'rgba(46,125,50,0.08)' : 'rgba(76,175,80,0.15)') : 'transparent',
                    borderRadius: 2,
                    '&:hover': {
                      color: (scrolled || !transparent) ? '#2E7D32' : '#4CAF50',
                      bgcolor: 'transparent',
                    },
                  }}
                >
                  {item.label}
                </Button>
              ))}
              <Button
                variant="contained"
                size="small"
                onClick={() => handleNavigate('/role-selection')}
                sx={{
                  ml: 1,
                  fontWeight: 700,
                  borderRadius: 3,
                  px: 2.5,
                  py: 0.8,
                  background: 'linear-gradient(135deg, #1F4E79, #2E7D32)',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: '0 6px 20px rgba(31,78,121,0.3)',
                  },
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
            width: 280,
            borderTop: '4px solid #2E7D32',
          },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <img src={logoTransparent} alt="Logo" style={{ width: 32, height: 32 }} />
            <Typography fontWeight={900} color="#1F4E79">THOZHIRPORUL</Typography>
          </Box>
          <IconButton onClick={handleDrawerToggle} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider />
        <List sx={{ py: 1 }}>
          {navItems.map((item) => (
            <ListItemButton
              key={item.label}
              onClick={() => handleNavigate(item.path)}
              selected={location.pathname === item.path}
              sx={{
                mx: 1,
                my: 0.5,
                borderRadius: 2,
                '&.Mui-selected': {
                  bgcolor: 'rgba(46,125,50,0.1)',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 4,
                    height: 24,
                    bgcolor: '#2E7D32',
                    borderRadius: '0 4px 4px 0',
                  },
                },
              }}
            >
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontWeight: location.pathname === item.path ? 700 : 600,
                  color: location.pathname === item.path ? '#2E7D32' : 'text.primary',
                }}
              />
            </ListItemButton>
          ))}
          <Divider sx={{ my: 2 }} />
          <ListItemButton
            onClick={() => handleNavigate('/role-selection')}
            sx={{ mx: 2, mt: 1, bgcolor: 'linear-gradient(135deg, #1F4E79, #2E7D32)', color: 'white', borderRadius: 2, '&:hover': { bgcolor: '#163A5F' } }}
          >
            <ListItemText primary="Login to THOZHIRPORUL" primaryTypographyProps={{ fontWeight: 700, textAlign: 'center' }} />
          </ListItemButton>
        </List>
      </Drawer>
    </>
  );
}
