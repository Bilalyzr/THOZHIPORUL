import React, { useState } from 'react';
import {
  Box, Button, Container, TextField, Typography, Paper, Link,
  InputAdornment, IconButton, Alert, Divider
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import FactoryIcon from '@mui/icons-material/Factory';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import SpeedIcon from '@mui/icons-material/Speed';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LockIcon from '@mui/icons-material/Lock';
import { authService } from '../services/api';
import logoTransparent from '../assets/logo-transparent.png';
import LoadingScreen from '../components/LoadingScreen';

const ROLE_CONFIG = {
  admin: {
    title: 'THOZHIRPORUL Admin',
    subtitle: 'System monitoring, compliance & user management',
    color: '#1F4E79',
    gradient: 'linear-gradient(135deg, #1F4E79, #3A74A7)',
    bgGradient: 'linear-gradient(160deg, #0f172a 0%, #1F4E79 100%)',
    icon: <AdminPanelSettingsIcon sx={{ fontSize: 28, color: 'white' }} />,
  },
  industry: {
    title: 'Industry Portal',
    subtitle: 'Data submission, compliance tracking & services',
    color: '#2E7D32',
    gradient: 'linear-gradient(135deg, #2E7D32, #4CAF50)',
    bgGradient: 'linear-gradient(160deg, #0f172a 0%, #2E7D32 100%)',
    icon: <FactoryIcon sx={{ fontSize: 28, color: 'white' }} />,
  },
  govt: {
    title: 'Government Officer',
    subtitle: 'Command center, analytics & oversight',
    color: '#E67E22',
    gradient: 'linear-gradient(135deg, #E67E22, #F5A623)',
    bgGradient: 'linear-gradient(160deg, #0f172a 0%, #E67E22 100%)',
    icon: <AccountBalanceIcon sx={{ fontSize: 28, color: 'white' }} />,
  },
};

export default function Login() {
  const navigate = useNavigate();
  const { role } = useParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const config = ROLE_CONFIG[role] || ROLE_CONFIG.admin;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authService.login(email, password);
      if (role && data.role !== role) {
        authService.logout();
        setError(`Access Denied: This is the ${role} portal. Your account is registered as "${data.role}".`);
        setLoading(false);
        return;
      }
      if (data.role === 'admin') navigate('/admin-dashboard');
      else if (data.role === 'industry') navigate('/workspace');
      else if (data.role === 'govt') navigate('/command-center');
      else setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials or server error.');
      setLoading(false);
    }
  };

  return (
    <>
      {loading && <LoadingScreen message="Authenticating credentials..." />}
      <Box sx={{ minHeight: '100vh', display: 'flex' }}>
      {/* Left decorative panel */}
      <Box sx={{
        display: { xs: 'none', md: 'flex' }, width: '42%', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center', position: 'relative',
        background: config.bgGradient, overflow: 'hidden',
      }}>
        <Box sx={{
          position: 'absolute', inset: 0, opacity: 0.06,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
        <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center', color: 'white', px: 6 }}>
          <Box sx={{
            width: 80, height: 80, mx: 'auto', mb: 3,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <img src={logoTransparent} alt="THOZHIRPORUL Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </Box>
          <Typography variant="h3" fontWeight={900} sx={{ mb: 2, letterSpacing: '-0.02em' }}>THOZHIRPORUL</Typography>
          <Typography variant="body1" sx={{ opacity: 0.7, mb: 4, lineHeight: 1.8 }}>
            Smart Industrial Monitoring System
          </Typography>
          <Box sx={{ width: 50, height: 2, bgcolor: 'rgba(255,255,255,0.2)', mx: 'auto', mb: 4, borderRadius: 1 }} />
          <Typography variant="body2" sx={{ opacity: 0.5, fontSize: '0.8rem' }}>
            Powering Tamil Nadu's industrial governance with real-time data and transparency.
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ position: 'absolute', bottom: 24, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>
          BY NEXORA | GOVT. OF TAMIL NADU
        </Typography>
      </Box>

      {/* Right: Login form */}
      <Box sx={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3,
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      }}>
        <Container maxWidth="sm">
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/role-selection')} size="small"
            sx={{ mb: 3, color: 'text.secondary', '&:hover': { color: config.color } }}>
            Back to Portal Selection
          </Button>

          <Paper elevation={0} sx={{ p: { xs: 3, sm: 5 }, borderRadius: 4, border: '1px solid #E2E8F0' }}>
            {/* Role indicator */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
              <Box sx={{
                width: 52, height: 52, borderRadius: 3, flexShrink: 0,
                background: config.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 4px 16px ${config.color}30`,
              }}>
                {config.icon}
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={800} sx={{ color: config.color, lineHeight: 1.2 }}>
                  {config.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">{config.subtitle}</Typography>
              </Box>
            </Box>

            <Divider sx={{ mb: 3 }} />

            <form onSubmit={handleLogin}>
              {error && <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert>}

              <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>Email Address</Typography>
              <TextField
                required fullWidth placeholder="Enter your registered email"
                value={email} onChange={(e) => setEmail(e.target.value)}
                autoComplete="email" autoFocus sx={{ mb: 2.5 }}
              />

              <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>Password</Typography>
              <TextField
                required fullWidth placeholder="Enter your password"
                type={showPassword ? 'text' : 'password'}
                value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password" sx={{ mb: 1 }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
                <Link component="button" type="button" variant="body2" underline="hover"
                  sx={{ color: 'text.secondary', fontSize: '0.8rem' }}
                  onClick={() => alert('Password reset instructions have been sent to your registered email address.')}>
                  Forgot password?
                </Link>
              </Box>

              <Button type="submit" fullWidth variant="contained" size="large" disabled={loading}
                startIcon={<LockIcon />}
                sx={{
                  py: 1.5, fontWeight: 700, fontSize: '1rem', borderRadius: 3,
                  background: config.gradient, boxShadow: `0 4px 16px ${config.color}30`,
                  '&:hover': { boxShadow: `0 8px 24px ${config.color}40` },
                }}>
                {loading ? 'Signing in...' : 'Sign In to THOZHIRPORUL'}
              </Button>
            </form>

            {(role === 'industry' || role === 'govt') && (
              <Box sx={{ textAlign: 'center', mt: 3, pt: 3, borderTop: '1px solid #E2E8F0' }}>
                <Typography variant="body2" color="text.secondary">
                  New to THOZHIRPORUL?{' '}
                  <Link component="button" type="button" underline="hover"
                    onClick={() => navigate(role === 'industry' ? '/registration' : '/govt-registration')}
                    sx={{ color: config.color, fontWeight: 700 }}>
                    {role === 'industry' ? 'Register your industry' : 'Register as Government Officer'}
                  </Link>
                </Typography>
              </Box>
            )}
          </Paper>

          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Button size="small" onClick={() => navigate('/home')} sx={{ color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}>
              Return to THOZHIRPORUL Home
            </Button>
          </Box>
          <Typography variant="caption" display="block" textAlign="center" color="text.disabled" sx={{ mt: 1 }}>
            &copy; 2026 NEXORA | THOZHIRPORUL Platform | Government of Tamil Nadu
          </Typography>
        </Container>
      </Box>
    </Box>
    </>
  );
}

