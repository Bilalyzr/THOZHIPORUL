import React, { useState } from 'react';
import {
  Box, Button, Container, TextField, Typography, Paper, Link,
  InputAdornment, IconButton, Alert, Divider, Fade, Slide,
  Accordion, AccordionSummary, AccordionDetails, Chip
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FactoryIcon from '@mui/icons-material/Factory';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import SpeedIcon from '@mui/icons-material/Speed';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LockIcon from '@mui/icons-material/Lock';
import HowlReg from '@mui/icons-material/HowToReg';
import Fingerprint from '@mui/icons-material/Fingerprint';
import { authService, api } from '../services/api';
import logoTransparent from '../assets/logo-transparent.png';
import LoadingScreen from '../components/LoadingScreen';

const ROLE_CONFIG = {
  admin: {
    title: 'THOZHIRPORUL Admin',
    subtitle: 'System monitoring, compliance & user management',
    color: '#1F4E79',
    gradient: 'linear-gradient(135deg, #1F4E79, #3A74A7)',
    bgGradient: 'linear-gradient(160deg, #0f172a 0%, #1F4E79 50%, #2E5A8A 100%)',
    accentColor: '#64B5F6',
    icon: <AdminPanelSettingsIcon sx={{ fontSize: 32, color: 'white' }} />,
    pattern: 'admin',
  },
  industry: {
    title: 'Industry Portal',
    subtitle: 'Data submission, compliance tracking & services',
    color: '#2E7D32',
    gradient: 'linear-gradient(135deg, #2E7D32, #4CAF50)',
    bgGradient: 'linear-gradient(160deg, #0f172a 0%, #2E7D32 50%, #388E3C 100%)',
    accentColor: '#81C784',
    icon: <FactoryIcon sx={{ fontSize: 32, color: 'white' }} />,
    pattern: 'industry',
  },
  govt: {
    title: 'Government Officer',
    subtitle: 'Command center, analytics & oversight',
    color: '#E67E22',
    gradient: 'linear-gradient(135deg, #E67E22, #F5A623)',
    bgGradient: 'linear-gradient(160deg, #0f172a 0%, #E67E22 50%, #F39C12 100%)',
    accentColor: '#FFB74D',
    icon: <AccountBalanceIcon sx={{ fontSize: 32, color: 'white' }} />,
    pattern: 'govt',
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
  const [navigating, setNavigating] = useState(false); // true only on final dashboard redirect
  const [isLoaded, setIsLoaded] = useState(false);
  // 2FA state (admin MFA via Microsoft Authenticator)
  const [mfaChallenge, setMfaChallenge] = useState(null); // { challenge_token, email, mode: 'verify'|'setup' }
  const [mfaCode, setMfaCode] = useState('');
  const [mfaSetupData, setMfaSetupData] = useState(null); // { secret, otpauth_url }
  const [mfaBackupCodes, setMfaBackupCodes] = useState([]);
  const [showSecret, setShowSecret] = useState(false); // reveal toggle for manual secret entry

  const config = ROLE_CONFIG[role] || ROLE_CONFIG.admin;

  React.useEffect(() => {
    setIsLoaded(true);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    // Don't trigger the full-screen LoadingScreen here — the transition to
    // the MFA screen should be instant, not masked by an overlay. Only the
    // inline button spinner (via `loading`) shows during the API call.
    setLoading(true);
    try {
      const data = await authService.login(email, password);

      // 2FA HARD GATE: admin must complete 2FA before accessing dashboard.
      // Case 1: MFA already set up → show code entry.
      if (data.mfa_required) {
        setMfaChallenge({ challenge_token: data.challenge_token, email: data.email, mode: 'verify' });
        setLoading(false);
        return;
      }
      // Case 2: MFA not set up yet → force enrollment (mandatory for admins).
      if (data.mfa_setup_required) {
        setMfaChallenge({ challenge_token: data.challenge_token, email: data.email, mode: 'setup' });
        setLoading(false);
        return;
      }

      if (role && data.role !== role) {
        authService.logout();
        setError(`Access Denied: This is the ${role} portal. Your account is registered as "${data.role}".`);
        setLoading(false);
        return;
      }
      // Final dashboard redirect — show the loading overlay during navigation.
      if (data.role === 'admin') goToDashboard('/admin-dashboard');
      else if (data.role === 'industry') goToDashboard('/workspace');
      else if (data.role === 'govt') goToDashboard('/command-center');
      else { setNavigating(false); setLoading(false); }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials or server error.');
      setLoading(false);
    }
  };

  // 2FA: verify the 6-digit TOTP code from Microsoft Authenticator.
  const handleVerifyMfa = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authService.verifyMfa({ challengeToken: mfaChallenge.challenge_token, code: mfaCode });
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.role);
        if (data.name) localStorage.setItem('userName', data.name);
        if (data.email) localStorage.setItem('userEmail', data.email);
        // Redirect to the role-appropriate dashboard with a loading overlay.
        const path = data.role === 'admin' ? '/admin-dashboard'
                   : data.role === 'industry' ? '/workspace'
                   : '/command-center';
        goToDashboard(path);
      } else {
        setError(data.error || 'Verification failed. No token issued.');
        setLoading(false);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid code. Try again.');
      setLoading(false);
    }
  };

  // 2FA SETUP: fetch the QR code + secret using the challenge token.
  // NOTE: must use the shared axios `api` instance (absolute baseURL) — a
  // relative fetch('/api/...') would hit the Vite dev server and return HTML,
  // breaking JSON parsing ("Failed to generate 2FA secret").
  const handleFetchMfaSetup = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/security/mfa/setup', {}, {
        headers: { 'x-auth-token': mfaChallenge.challenge_token }
      });
      if (data.secret) {
        setMfaSetupData(data);
        setMfaChallenge({ ...mfaChallenge, mode: 'enroll' });
      } else {
        setError(data.error || 'Failed to generate 2FA secret.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate 2FA secret.');
    } finally { setLoading(false); }
  };

  // 2FA ENROLL: verify the code + enable MFA + get the real login token.
  const handleEnrollMfa = async (e) => {
    e.preventDefault();
    if (mfaCode.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/security/mfa/verify',
        { code: mfaCode },
        { headers: { 'x-auth-token': mfaChallenge.challenge_token } }
      );
      if (data.token) {
        // MFA enabled + real token issued — log in.
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.role);
        if (data.name) localStorage.setItem('userName', data.name);
        if (data.email) localStorage.setItem('userEmail', data.email);
        setMfaBackupCodes(data.backup_codes || []);
        setMfaChallenge({ ...mfaChallenge, mode: 'backup_codes' });
      } else {
        setError(data.error || 'Invalid code. Try again.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed.');
    } finally { setLoading(false); }
  };

  // Final redirect to the dashboard with a visible loading overlay.
  const goToDashboard = (path) => {
    setNavigating(true);
    setLoading(true);
    setTimeout(() => { window.location.href = path; }, 800);
  };

  return (
    <>
      {/* LoadingScreen overlay only shows during the FINAL dashboard redirect
          (post-MFA verify), NOT during the inline login→MFA transition. */}
      {loading && navigating && <LoadingScreen message="Signing you in…" />}
      <Box sx={{ minHeight: '100vh', display: 'flex', overflow: 'hidden' }}>
      {/* Left decorative panel */}
      <Box sx={{
        display: { xs: 'none', md: 'flex' }, width: '45%', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center', position: 'relative',
        background: config.bgGradient, overflow: 'hidden',
      }}>
        {/* Animated background pattern */}
        <Box sx={{
          position: 'absolute', inset: 0, opacity: 0.08,
          backgroundImage: `radial-gradient(circle at 20% 50%, ${config.color} 1px, transparent 1px), radial-gradient(circle at 80% 80%, ${config.accentColor} 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
          animation: 'pulse-glow 4s ease-in-out infinite',
        }} />

        {/* Floating orbs */}
        <Box sx={{
          position: 'absolute', width: 400, height: 400, borderRadius: '50%',
          background: `radial-gradient(circle, ${config.color}40 0%, transparent 70%)`,
          top: -100, left: -100, filter: 'blur(80px)',
          animation: 'pulse-glow 6s ease-in-out infinite',
        }} />
        <Box sx={{
          position: 'absolute', width: 300, height: 300, borderRadius: '50%',
          background: `radial-gradient(circle, ${config.accentColor}30 0%, transparent 70%)`,
          bottom: -50, right: -50, filter: 'blur(60px)',
          animation: 'pulse-glow 8s ease-in-out infinite 1s',
        }} />

        <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center', color: 'white', px: 6 }}>
          <Slide direction="right" in={isLoaded} timeout={800}>
            <Box>
              <Box sx={{
                width: 100, height: 100, mx: 'auto', mb: 4,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 3,
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
              }}>
                <img src={logoTransparent} alt="THOZHIRPORUL Logo" style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
              </Box>
              <Typography variant="h2" fontWeight={900} sx={{ mb: 2, letterSpacing: '-0.02em', textShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                THOZHIRPORUL
              </Typography>
              <Box sx={{
                display: 'inline-flex', alignItems: 'center', gap: 1, px: 3, py: 1,
                borderRadius: 2, mb: 4,
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}>
                <Box sx={{
                  width: 8, height: 8, borderRadius: '50%', bgcolor: config.accentColor,
                  animation: 'pulse-glow 2s infinite',
                }} />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Smart Industrial Monitoring System
                </Typography>
              </Box>
            </Box>
          </Slide>

          <Fade in={isLoaded} timeout={{ enter: 1200 }}>
            <Box sx={{ mt: 4 }}>
              <Typography variant="body1" sx={{ opacity: 0.8, lineHeight: 1.9, fontSize: '0.95rem' }}>
                Powering Tamil Nadu's industrial governance with<br />
                real-time data, AI-driven insights, and complete transparency.
              </Typography>
            </Box>
          </Fade>

        </Box>

        <Fade in={isLoaded} timeout={{ enter: 2000 }}>
          <Box sx={{
            position: 'absolute', bottom: 32, left: 0, right: 0, textAlign: 'center',
            color: 'rgba(255,255,255,0.4)',
          }}>
            <Typography variant="caption" sx={{ letterSpacing: '0.15em', fontWeight: 600 }}>
              BY NEXORA | GOVT. OF TAMIL NADU
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontSize: '0.65rem' }}>
              Secured by Tamil Nadu State IT Infrastructure
            </Typography>
          </Box>
        </Fade>
      </Box>

      {/* Right: Login form */}
      <Box sx={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3,
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Subtle background decoration */}
        <Box sx={{
          position: 'absolute', width: 500, height: 500, borderRadius: '50%',
          background: `radial-gradient(circle, ${config.color}08 0%, transparent 70%)`,
          top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        }} />

        <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
          <Slide direction="left" in={isLoaded} timeout={600}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/role-selection')}
              size="small"
              sx={{
                mb: 3, color: 'text.secondary',
                '&:hover': { color: config.color, bgcolor: `${config.color}10` },
              }}
            >
              Back to Portal Selection
            </Button>
          </Slide>

          <Fade in={isLoaded} timeout={{ enter: 800 }}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 3, sm: 5 },
                borderRadius: 4,
                border: '1px solid #E2E8F0',
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)',
              }}
            >
              {/* Role indicator */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mb: 4 }}>
                <Box sx={{
                  width: 64, height: 64, borderRadius: 3, flexShrink: 0,
                  background: config.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 8px 24px ${config.color}40`,
                  position: 'relative', overflow: 'hidden',
                  '&::after': {
                    content: '""',
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)',
                    animation: 'pulse-glow 3s infinite',
                  },
                }}>
                  {config.icon}
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight={800} sx={{ color: config.color, lineHeight: 1.2 }}>
                    {config.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {config.subtitle}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ mb: 3, borderColor: 'rgba(0,0,0,0.06)' }} />

              {/* ===== 2FA / MFA GATE (admin login) ===== */}
              {mfaChallenge ? (
                <Box>
                  {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

                  {/* --- Mode: setup (mandatory enrollment prompt) --- */}
                  {mfaChallenge.mode === 'setup' && (
                    <Box sx={{ textAlign: 'center' }}>
                      <Alert severity="warning" sx={{ mb: 3, borderRadius: 2, textAlign: 'left' }}>
                        <strong>2FA is mandatory for admin accounts.</strong> You must set up Microsoft Authenticator before you can access the dashboard.
                      </Alert>
                      <Button fullWidth variant="contained" size="large" disabled={loading} onClick={handleFetchMfaSetup}
                        sx={{ py: 1.5, borderRadius: 2, fontWeight: 700, bgcolor: config.color }}>
                        {loading ? 'Generating secret…' : 'Set Up Microsoft Authenticator'}
                      </Button>
                      <Button fullWidth sx={{ mt: 1 }} onClick={() => { setMfaChallenge(null); setMfaCode(''); setError(''); }}>
                        Back to Login
                      </Button>
                    </Box>
                  )}

                  {/* --- Mode: enroll (QR + manual key + code entry) --- */}
                  {mfaChallenge.mode === 'enroll' && mfaSetupData && (
                    <form onSubmit={handleEnrollMfa}>
                      <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
                        Add this to <strong>Microsoft Authenticator</strong>, then enter the 6-digit code.
                      </Alert>

                      {/* QR Code (scan option) */}
                      <Box sx={{ textAlign: 'center', mb: 2 }}>
                        <Box sx={{ display: 'inline-block', p: 2, bgcolor: 'white', borderRadius: 2, border: '1px solid #E2E8F0' }}>
                          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(mfaSetupData.otpauth_url)}`} alt="2FA QR Code" width={200} height={200} />
                        </Box>
                      </Box>

                      {/* Manual Setup Details — collapsed by default to keep
                          the secret off the live screen. Expand only when the
                          user can't scan the QR. */}
                      <Accordion sx={{ mb: 3, bgcolor: 'action.hover', borderRadius: '2px !important', border: '1px solid', borderColor: 'divider' }} elevation={0}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography variant="subtitle2" fontWeight={700}>
                            Can't scan? Enter manually
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Box>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Account Name</Typography>
                              <Typography variant="body2" fontWeight={700} sx={{ fontFamily: 'monospace' }}>
                                THOZHIPORUL: {mfaChallenge.email}
                              </Typography>
                            </Box>
                            <Button size="small" onClick={() => { navigator.clipboard.writeText(`THOZHIPORUL: ${mfaChallenge.email}`); }}>
                              Copy
                            </Button>
                          </Box>
                          <Divider sx={{ my: 1 }} />
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Secret Key</Typography>
                              <Typography variant="body2" fontWeight={700} sx={{ fontFamily: 'monospace', wordBreak: 'break-all', filter: showSecret ? 'none' : 'blur(5px)', cursor: 'pointer', userSelect: showSecret ? 'text' : 'none' }}
                                onClick={() => setShowSecret(s => !s)}>
                                {mfaSetupData.secret}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                {showSecret ? 'Click to hide' : 'Click to reveal'}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                              <IconButton size="small" onClick={() => setShowSecret(s => !s)} aria-label={showSecret ? 'Hide secret' : 'Reveal secret'}>
                                {showSecret ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                              </IconButton>
                              <Button size="small" onClick={() => { navigator.clipboard.writeText(mfaSetupData.secret); }}>Copy</Button>
                            </Box>
                          </Box>
                        </AccordionDetails>
                      </Accordion>
                      <TextField
                        fullWidth autoFocus
                        label="6-Digit Code"
                        value={mfaCode}
                        onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        inputProps={{ inputMode: 'numeric', maxLength: 6, style: { textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5em', fontWeight: 700 } }}
                        sx={{ mb: 2.5 }}
                      />
                      <Button type="submit" fullWidth variant="contained" disabled={loading || mfaCode.length !== 6}
                        sx={{ py: 1.5, borderRadius: 2, fontWeight: 700, bgcolor: config.color }}>
                        {loading ? 'Verifying…' : 'Verify & Enable 2FA'}
                      </Button>
                    </form>
                  )}

                  {/* --- Mode: backup_codes (shown once after enrollment) --- */}
                  {mfaChallenge.mode === 'backup_codes' && (
                    <Box sx={{ textAlign: 'center' }}>
                      <Alert severity="success" sx={{ mb: 2, borderRadius: 2, textAlign: 'left' }}>
                        ✅ 2FA enabled successfully! Save these backup codes — you'll need them if you lose your device.
                      </Alert>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', mb: 2, fontFamily: 'monospace' }}>
                        {mfaBackupCodes.map((c, i) => (
                          <Chip key={i} label={c} sx={{ fontFamily: 'monospace', fontWeight: 700 }} />
                        ))}
                      </Box>
                      <Button fullWidth variant="contained" size="large" onClick={() => goToDashboard('/admin-dashboard')}
                        sx={{ py: 1.5, borderRadius: 2, fontWeight: 700, bgcolor: config.color }}>
                        Continue to Dashboard
                      </Button>
                    </Box>
                  )}

                  {/* --- Mode: verify (already-enrolled, just needs code) --- */}
                  {mfaChallenge.mode === 'verify' && (
                    <form onSubmit={handleVerifyMfa}>
                      <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2 }}>
                        Enter the 6-digit code from your <strong>Microsoft Authenticator</strong> app.
                      </Alert>
                      <TextField
                        fullWidth autoFocus
                        label="6-Digit Code"
                        value={mfaCode}
                        onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        inputProps={{ inputMode: 'numeric', maxLength: 6, style: { textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5em', fontWeight: 700 } }}
                        sx={{ mb: 2.5 }}
                      />
                      <Button type="submit" fullWidth variant="contained" disabled={loading || mfaCode.length !== 6}
                        sx={{ py: 1.5, borderRadius: 2, fontWeight: 700, bgcolor: config.color }}>
                        {loading ? 'Verifying...' : 'Verify & Sign In'}
                      </Button>
                      <Button fullWidth sx={{ mt: 1 }} onClick={() => { setMfaChallenge(null); setMfaCode(''); setError(''); }}>
                        Back to Login
                      </Button>
                    </form>
                  )}
                </Box>
              ) : (
              <form onSubmit={handleLogin}>
                {error && (
                  <Fade in={!!error}>
                    <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
                      {error}
                    </Alert>
                  </Fade>
                )}

                <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5, color: 'text.primary' }}>Email Address</Typography>
                <TextField
                  required fullWidth placeholder="Enter your registered email"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email" autoFocus
                  sx={{
                    mb: 2.5,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      transition: 'all 0.2s ease',
                      '&:hover': { borderColor: config.color },
                      '&.Mui-focused': { borderColor: config.color, boxShadow: `0 0 0 3px ${config.color}20` },
                    },
                  }}
                />

                <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5, color: 'text.primary' }}>Password</Typography>
                <TextField
                  required fullWidth placeholder="Enter your password"
                  type={showPassword ? 'text' : 'password'}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password" sx={{ mb: 1 }}
                  InputProps={{
                    sx: {
                      borderRadius: 2,
                      '&:hover': { borderColor: config.color },
                      '&.Mui-focused': { borderColor: config.color, boxShadow: `0 0 0 3px ${config.color}20` },
                    },
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          size="small"
                          sx={{ color: showPassword ? config.color : 'text.secondary' }}
                        >
                          {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
                  <Link
                    component="button"
                    type="button"
                    underline="hover"
                    sx={{ color: config.color, fontSize: '0.8rem', fontWeight: 600 }}
                    onClick={() => alert('Password reset instructions have been sent to your registered email address.')}
                  >
                    Forgot password?
                  </Link>
                </Box>

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                  startIcon={loading ? <Fingerprint sx={{ animation: 'pulse-glow 1s infinite' }} /> : <LockIcon />}
                  sx={{
                    py: 1.8, fontWeight: 700, fontSize: '1rem', borderRadius: 3,
                    background: loading ? 'text.disabled' : config.gradient,
                    boxShadow: loading ? 'none' : `0 8px 24px ${config.color}40`,
                    '&:hover': {
                      boxShadow: `0 12px 32px ${config.color}50`,
                      transform: 'translateY(-2px)',
                    },
                    '&:active': { transform: 'translateY(0)' },
                  }}
                >
                  {loading ? 'Verifying...' : 'Sign In to THOZHIRPORUL'}
                </Button>

                {/* Biometric login hint */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 2 }}>
                  <Box sx={{ width: 32, height: 1, bgcolor: 'divider' }} />
                  <Typography variant="caption" color="text.secondary">Secure Login</Typography>
                  <Box sx={{ width: 32, height: 1, bgcolor: 'divider' }} />
                </Box>
              </form>
              )}

              {(role === 'industry' || role === 'govt') && (
                <Box sx={{ textAlign: 'center', mt: 3, pt: 3, borderTop: '1px solid #E2E8F0' }}>
                  <Typography variant="body2" color="text.secondary">
                    New to THOZHIRPORUL?{' '}
                    <Link
                      component="button"
                      type="button"
                      underline="hover"
                      onClick={() => navigate(role === 'industry' ? '/registration' : '/govt-registration')}
                      sx={{ color: config.color, fontWeight: 700 }}
                    >
                      {role === 'industry' ? 'Register your industry' : 'Register as Government Officer'}
                    </Link>
                  </Typography>
                </Box>
              )}
            </Paper>
          </Fade>

          <Fade in={isLoaded} timeout={{ enter: 1400 }}>
            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <Button
                size="small"
                onClick={() => navigate('/home')}
                sx={{ color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}
              >
                Return to THOZHIRPORUL Home
              </Button>
              <Typography variant="caption" display="block" textAlign="center" color="text.disabled" sx={{ mt: 1.5, fontSize: '0.7rem' }}>
                &copy; 2026 NEXORA | THOZHIRPORUL Platform | Government of Tamil Nadu
              </Typography>
            </Box>
          </Fade>
        </Container>
      </Box>
    </Box>
    </>
  );
}
