import React from 'react';
import {
  Box, Container, Typography, Grid, Card, CardActionArea, CardContent,
  Avatar, Stack, Chip, Button, Fade, Slide, Paper, Divider
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { keyframes } from '@emotion/react';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import FactoryIcon from '@mui/icons-material/Factory';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import GroupsIcon from '@mui/icons-material/Groups';
import logoTransparent from '../assets/logo-transparent.png';

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
`;

const shimmer = keyframes`
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
`;

const portalOptions = [
  {
    role: 'admin',
    title: 'THOZHIRPORUL Admin',
    description: 'Full system control - monitoring, compliance, user management, and analytics.',
    icon: <AdminPanelSettingsIcon sx={{ fontSize: 48 }} />,
    color: '#1F4E79',
    gradient: 'linear-gradient(135deg, #1F4E79, #3A74A7)',
    features: ['Real-time Monitoring', 'User Management', 'System Analytics', 'Compliance Oversight'],
  },
  {
    role: 'industry',
    title: 'Industry Portal',
    description: 'Submit data, track compliance, manage documents, and request services.',
    icon: <FactoryIcon sx={{ fontSize: 48 }} />,
    color: '#2E7D32',
    gradient: 'linear-gradient(135deg, #2E7D32, #4CAF50)',
    features: ['Data Submission', 'Compliance Tracking', 'Service Requests', 'Document Management'],
  },
  {
    role: 'govt',
    title: 'Government Officer',
    description: 'Command center, state-wide analytics, compliance oversight, and reports.',
    icon: <AccountBalanceIcon sx={{ fontSize: 48 }} />,
    color: '#E67E22',
    gradient: 'linear-gradient(135deg, #E67E22, #F5A623)',
    features: ['Command Center', 'State Analytics', 'Compliance Engine', 'Report Generation'],
  },
];

const FeatureItem = ({ icon: Icon, text }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
    <Icon sx={{ fontSize: 16, opacity: 0.7 }} />
    <Typography variant="caption" color="text.secondary">{text}</Typography>
  </Box>
);

export default function RoleSelection() {
  const navigate = useNavigate();
  const [isLoaded, setIsLoaded] = React.useState(false);

  React.useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      background: `linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%)`,
      py: { xs: 4, md: 8 },
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background decoration */}
      <Box sx={{
        position: 'absolute', width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(31, 78, 121, 0.06) 0%, transparent 70%)',
        top: -200, right: -200,
      }} />
      <Box sx={{
        position: 'absolute', width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(46, 125, 50, 0.06) 0%, transparent 70%)',
        bottom: -150, left: -150,
      }} />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Slide direction="down" in={isLoaded} timeout={600}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/home')}
            sx={{
              mb: 3, color: 'text.secondary',
              '&:hover': { color: 'primary.main', bgcolor: 'primary.light' },
            }}
          >
            Back to Home
          </Button>
        </Slide>

        <Fade in={isLoaded} timeout={800}>
          <Stack spacing={2} textAlign="center" sx={{ mb: { xs: 4, md: 8 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <Box sx={{
                width: 100, height: 100, borderRadius: 3,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, rgba(31, 78, 121, 0.1) 0%, rgba(46, 125, 50, 0.1) 100%)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.5)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                animation: `${float} 4s ease-in-out infinite`,
              }}>
                <img src={logoTransparent} alt="THOZHIRPORUL Logo" style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
              </Box>
            </Box>

            <Typography variant="h2" fontWeight={900} sx={{
              background: 'linear-gradient(90deg, #1F4E79, #2E7D32, #E67E22)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              backgroundSize: '200% auto',
              animation: `${shimmer} 4s linear infinite`,
            }}>
              Welcome to THOZHIRPORUL
            </Typography>

            <Typography variant="h6" color="text.secondary" fontWeight={400} sx={{ maxWidth: 600, mx: 'auto', lineHeight: 1.6 }}>
              Select your portal to access the Smart Industrial Monitoring System
            </Typography>
          </Stack>
        </Fade>

        <Grid container spacing={{ xs: 2, md: 4 }} justifyContent="center">
          {portalOptions.map((option, idx) => (
            <Grid size={{ xs: 12, md: 4 }} key={option.role}>
              <Fade in={isLoaded} timeout={{ enter: 1000 + idx * 200 }}>
                <Card sx={{
                  height: '100%', borderRadius: 4, overflow: 'hidden',
                  transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  border: '1px solid rgba(0,0,0,0.08)',
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(20px)',
                  '&:hover': {
                    transform: 'translateY(-12px) scale(1.02)',
                    boxShadow: `0 24px 48px ${option.color}20`,
                    borderColor: option.color,
                  },
                }}>
                  <CardActionArea
                    onClick={() => navigate(`/login/${option.role}`)}
                    sx={{ height: '100%', p: { xs: 2, sm: 3, md: 4 }, textAlign: 'center' }}
                  >
                    <Avatar sx={{
                      width: 96, height: 96, mx: 'auto', mb: 3,
                      background: option.gradient,
                      boxShadow: `0 12px 32px ${option.color}30`,
                      transition: 'all 0.3s ease',
                      '&:hover': { transform: 'scale(1.1) rotate(5deg)' },
                    }}>
                      {option.icon}
                    </Avatar>

                    <CardContent sx={{ px: 0 }}>
                      <Chip
                        label={option.role.toUpperCase()}
                        size="small"
                        sx={{
                          mb: 2, fontWeight: 700, fontSize: '0.65rem',
                          bgcolor: `${option.color}15`,
                          color: option.color,
                          border: `1px solid ${option.color}30`,
                        }}
                      />

                      <Typography variant="h5" fontWeight={800} gutterBottom sx={{ color: option.color }}>
                        {option.title}
                      </Typography>

                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, mb: 3 }}>
                        {option.description}
                      </Typography>

                      <Divider sx={{ my: 2, borderColor: 'rgba(0,0,0,0.06)' }} />

                      <Box sx={{ mt: 2, pt: 2, borderTop: '1px dashed rgba(0,0,0,0.08)' }}>
                        {option.features.map((feature, i) => (
                          <Typography
                            key={i}
                            variant="caption"
                            sx={{
                              display: 'inline-block', mx: 0.5, mb: 0.5, px: 1.5, py: 0.5,
                              bgcolor: `${option.color}08`,
                              color: 'text.secondary',
                              borderRadius: 1,
                              fontSize: '0.7rem',
                            }}
                          >
                            ✓ {feature}
                          </Typography>
                        ))}
                      </Box>
                    </CardContent>

                    <Box sx={{
                      mt: 2, pt: 2, borderTop: '1px solid rgba(0,0,0,0.06)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
                      color: option.color, fontWeight: 700, fontSize: '0.85rem',
                    }}>
                      Access Portal
                      <GroupsIcon sx={{ fontSize: 18, transition: 'transform 0.2s', '.MuiCardActionArea:hover &': { transform: 'translateX(4px)' } }} />
                    </Box>
                  </CardActionArea>
                </Card>
              </Fade>
            </Grid>
          ))}
        </Grid>

        <Fade in={isLoaded} timeout={{ enter: 1800 }}>
          <Box sx={{ textAlign: 'center', mt: { xs: 4, md: 8 } }}>
            <Paper
              elevation={0}
              sx={{
                display: 'inline-flex', alignItems: 'center', gap: 3, px: 4, py: 2,
                borderRadius: 3, bgcolor: 'rgba(255, 255, 255, 0.6)',
                backdropFilter: 'blur(10px)', border: '1px solid rgba(0,0,0,0.06)',
              }}
            >
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Need Help?</Typography>
                <Typography variant="body2" fontWeight={600}>1800-XXX-XXXX</Typography>
              </Box>
              <Box sx={{ width: 1, height: 30, bgcolor: 'divider' }} />
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Email Support</Typography>
                <Typography variant="body2" fontWeight={600}>support@sipcot.tn.gov.in</Typography>
              </Box>
            </Paper>

            <Typography variant="body2" color="text.disabled" textAlign="center" sx={{ mt: 4 }}>
              &copy; 2026 NEXORA | THOZHIRPORUL Platform | Government of Tamil Nadu
            </Typography>
          </Box>
        </Fade>
      </Container>
    </Box>
  );
}
