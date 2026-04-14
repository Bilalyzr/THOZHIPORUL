import React from 'react';
import {
  Box, Container, Typography, Grid, Card, CardActionArea, CardContent, Avatar, Stack, Chip, Button
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { keyframes } from '@emotion/react';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import FactoryIcon from '@mui/icons-material/Factory';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import SpeedIcon from '@mui/icons-material/Speed';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import logoTransparent from '../assets/logo-transparent.png';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const portalOptions = [
  {
    role: 'admin',
    title: 'THOZHIPORUL Admin',
    description: 'Full system control - monitoring, compliance, user management, and analytics.',
    icon: <AdminPanelSettingsIcon sx={{ fontSize: 48 }} />,
    color: '#1F4E79',
    gradient: 'linear-gradient(135deg, #1F4E79, #3A74A7)',
  },
  {
    role: 'industry',
    title: 'Industry Portal',
    description: 'Submit data, track compliance, manage documents, and request services.',
    icon: <FactoryIcon sx={{ fontSize: 48 }} />,
    color: '#2E7D32',
    gradient: 'linear-gradient(135deg, #2E7D32, #4CAF50)',
  },
  {
    role: 'govt',
    title: 'Government Officer',
    description: 'Command center, state-wide analytics, compliance oversight, and reports.',
    icon: <AccountBalanceIcon sx={{ fontSize: 48 }} />,
    color: '#E67E22',
    gradient: 'linear-gradient(135deg, #E67E22, #F5A623)',
  },
];

export default function RoleSelection() {
  const navigate = useNavigate();

  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      background: `linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)`,
      py: { xs: 4, md: 8 },
    }}>
      <Container maxWidth="lg">
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/home')}
          sx={{ mb: 3, color: 'text.secondary', '&:hover': { color: 'primary.main' }, animation: `${fadeIn} 0.4s ease-out` }}>
          Back to Home
        </Button>
        <Stack spacing={2} textAlign="center" sx={{ mb: { xs: 4, md: 8 }, animation: `${fadeIn} 0.6s ease-out` }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <Box sx={{
              width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <img src={logoTransparent} alt="THOZHIPORUL Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </Box>
          </Box>
          <Typography variant="h3" fontWeight={900} sx={{
            background: 'linear-gradient(90deg, #1F4E79, #2E7D32)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Welcome to THOZHIPORUL
          </Typography>
          <Typography variant="h6" color="text.secondary" fontWeight={400}>
            Select your portal to access the Smart Industrial Monitoring System
          </Typography>
        </Stack>

        <Grid container spacing={{ xs: 2, md: 4 }} justifyContent="center">
          {portalOptions.map((option, idx) => (
            <Grid size={{ xs: 12, md: 4 }} key={option.role}>
              <Card sx={{
                height: '100%', borderRadius: 4, overflow: 'hidden',
                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                animation: `${fadeIn} ${0.6 + idx * 0.2}s ease-out`,
                '&:hover': { transform: 'translateY(-12px)', boxShadow: `0 20px 40px ${option.color}25` },
              }}>
                <CardActionArea onClick={() => navigate(`/login/${option.role}`)} sx={{ height: '100%', p: { xs: 2, sm: 3, md: 4 }, textAlign: 'center' }}>
                  <Avatar sx={{
                    width: 88, height: 88, mx: 'auto', mb: 3,
                    background: option.gradient,
                    boxShadow: `0 8px 24px ${option.color}30`,
                  }}>
                    {option.icon}
                  </Avatar>
                  <CardContent sx={{ px: 0 }}>
                    <Typography variant="h5" fontWeight={800} gutterBottom sx={{ color: option.color }}>
                      {option.title}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                      {option.description}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Typography variant="body2" color="text.disabled" textAlign="center" sx={{ mt: { xs: 4, md: 8 } }}>
          &copy; 2026 NEXORA | THOZHIPORUL Platform | Government of Tamil Nadu
        </Typography>
      </Container>
    </Box>
  );
}
