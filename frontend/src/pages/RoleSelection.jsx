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


export default function RoleSelection() {
  const navigate = useNavigate();
  const [isLoaded, setIsLoaded] = React.useState(false);

  React.useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <Box sx={{
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center',
      background: 'linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 50%, #CBD5E1 100%)',
      py: { xs: 6, md: 10 },
      position: 'relative', 
      overflow: 'hidden',
    }}>
      {/* Background decorations */}
      <Box sx={{
        position: 'absolute', 
        width: 600, 
        height: 600, 
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(31, 78, 121, 0.08) 0%, transparent 70%)',
        top: -200, 
        right: -200,
        pointerEvents: 'none',
      }} />
      <Box sx={{
        position: 'absolute', 
        width: 500, 
        height: 500, 
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(46, 125, 50, 0.08) 0%, transparent 70%)',
        bottom: -150, 
        left: -150,
        pointerEvents: 'none',
      }} />
      <Box sx={{
        position: 'absolute', 
        width: 400, 
        height: 400, 
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(230, 126, 34, 0.05) 0%, transparent 70%)',
        top: '35%', 
        left: '40%',
        pointerEvents: 'none',
      }} />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Slide direction="down" in={isLoaded} timeout={600}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/home')}
            sx={{
              mb: 3, 
              color: 'text.secondary',
              fontWeight: 700,
              borderRadius: 2.5,
              px: 2,
              py: 0.8,
              transition: 'all 0.2s',
              '&:hover': { color: '#1F4E79', bgcolor: 'rgba(31, 78, 121, 0.06)' },
            }}
          >
            Back to Home
          </Button>
        </Slide>

        <Fade in={isLoaded} timeout={800}>
          <Stack spacing={2.5} textAlign="center" sx={{ mb: { xs: 6, md: 9 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <Box sx={{
                width: 90, 
                height: 90, 
                borderRadius: 4,
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                boxShadow: '0 8px 32px rgba(31, 78, 121, 0.08)',
                animation: `${float} 6s ease-in-out infinite`,
              }}>
                <img src={logoTransparent} alt="THOZHIRPORUL Logo" style={{ width: '75%', height: '75%', objectFit: 'contain' }} />
              </Box>
            </Box>

            <Typography variant="h3" fontWeight={900} sx={{
              fontSize: { xs: '2.2rem', sm: '2.8rem', md: '3.5rem' },
              letterSpacing: '-0.03em',
              background: 'linear-gradient(90deg, #1F4E79 0%, #2E7D32 50%, #E67E22 100%)',
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              backgroundSize: '200% auto',
              animation: `${shimmer} 6s linear infinite`,
            }}>
              Welcome to THOZHIRPORUL
            </Typography>


          </Stack>
        </Fade>

        <Grid container spacing={{ xs: 3, md: 4 }} justifyContent="center">
          {portalOptions.map((option, idx) => (
            <Grid size={{ xs: 12, md: 4 }} key={option.role}>
              <Fade in={isLoaded} timeout={{ enter: 1000 + idx * 200 }}>
                <Card sx={{
                  height: '100%', 
                  borderRadius: 5, 
                  overflow: 'hidden',
                  transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  background: 'rgba(255, 255, 255, 0.75)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.03)',
                  '&:hover': {
                    transform: 'translateY(-10px)',
                    boxShadow: `0 30px 60px ${option.color}18`,
                    borderColor: option.color,
                  },
                }}>
                  <CardActionArea
                    onClick={() => navigate(`/login/${option.role}`)}
                    sx={{ 
                      height: '100%', 
                      p: { xs: 3, sm: 4 }, 
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      alignItems: 'stretch',
                      '&:hover .role-avatar': {
                        transform: 'scale(1.08) rotate(5deg)',
                        boxShadow: `0 16px 36px ${option.color}45`,
                      },
                      '&:hover .role-arrow': {
                        transform: 'translateX(4px)',
                      }
                    }}
                  >
                    <Box sx={{ flexGrow: 1 }}>
                      <Avatar 
                        className="role-avatar"
                        sx={{
                          width: 90, 
                          height: 90, 
                          mx: 'auto', 
                          mb: 3.5,
                          background: option.gradient,
                          boxShadow: `0 12px 28px ${option.color}25`,
                          transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                      >
                        {option.icon}
                      </Avatar>

                      <Chip
                        label={option.role.toUpperCase()}
                        size="small"
                        sx={{
                          mb: 2, 
                          fontWeight: 800, 
                          fontSize: '0.65rem',
                          letterSpacing: '0.08em',
                          bgcolor: `${option.color}08`,
                          color: option.color,
                          border: `1px solid ${option.color}18`,
                          borderRadius: 1.5,
                        }}
                      />

                      <Typography variant="h5" fontWeight={900} gutterBottom sx={{ color: option.color, fontSize: '1.35rem', mb: 1.5 }}>
                        {option.title}
                      </Typography>

                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, mb: 4, px: 1 }}>
                        {option.description}
                      </Typography>

                      <Divider sx={{ my: 3, borderColor: 'rgba(0,0,0,0.06)' }} />

                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', mb: 3 }}>
                        {option.features.map((feature, i) => (
                          <Chip
                            key={i}
                            label={feature}
                            size="small"
                            sx={{
                              bgcolor: `${option.color}06`,
                              border: `1px solid ${option.color}12`,
                              color: '#334155',
                              fontWeight: 600,
                              fontSize: '0.72rem',
                              borderRadius: 2,
                              '& .MuiChip-label': {
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                              }
                            }}
                            icon={<span style={{ color: option.color, fontWeight: 900 }}>✓</span>}
                          />
                        ))}
                      </Box>
                    </Box>

                    <Box 
                      sx={{
                        mt: 2, 
                        py: 1.8,
                        borderRadius: 3,
                        background: `${option.color}08`,
                        border: `1px solid ${option.color}12`,
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: 1.2,
                        color: option.color, 
                        fontWeight: 800, 
                        fontSize: '0.9rem',
                        transition: 'all 0.3s ease',
                        '.MuiCardActionArea-root:hover &': {
                          background: option.gradient,
                          color: 'white',
                          boxShadow: `0 8px 20px ${option.color}25`,
                          borderColor: 'transparent',
                        }
                      }}
                    >
                      Access Portal
                      <GroupsIcon className="role-arrow" sx={{ fontSize: 18, transition: 'transform 0.3s ease' }} />
                    </Box>
                  </CardActionArea>
                </Card>
              </Fade>
            </Grid>
          ))}
        </Grid>


      </Container>
    </Box>
  );
}
