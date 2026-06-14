import React, { useState } from 'react';
import {
  Box, Container, Typography, Grid, Card, CardContent,
  Button, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Chip, Switch, FormControlLabel, Paper, Divider,
  IconButton, Snackbar, Alert, Stack, Fade, Zoom
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle, LockOpen, AutoAwesome,
  HelpOutline, CloudUpload, History, Analytics, Security,
  PictureAsPdf, FlashOn, SupportAgent
} from '@mui/icons-material';
import UnifiedNav from '../components/UnifiedNav';

export default function SubscriptionPlans() {
  const navigate = useNavigate();
  const [billingPeriod, setBillingPeriod] = useState('monthly'); // 'monthly' or 'annual'
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const handleSelectPlan = (planName, price) => {
    setSnackbar({
      open: true,
      message: `🔐 Initiating mock secure payment sandbox for ${planName} (${billingPeriod === 'annual' ? 'Annual Plan' : 'Monthly Plan'}). Price: ${price} INR`,
      severity: 'info'
    });
    setTimeout(() => {
      setSnackbar({
        open: true,
        message: `✅ Sandbox Authorized! Workspace upgraded successfully to ${planName}.`,
        severity: 'success'
      });
    }, 2000);
  };

  const plans = [
    {
      name: 'Compliance Starter',
      tier: 'free_starter',
      subtitle: 'MSME Regulatory Baseline',
      monthlyPrice: '0',
      annualPrice: '0',
      features: [
        'Unified Data Submission (Basic Forms)',
        'Overall Compliance Score Tracker',
        'Standard Services NOC Pipeline',
        'Standard Email Notifications',
        'Secure Vault Storage (Up to 10 MB)',
        'Basic Support Ticket Gateways'
      ],
      isPopular: false,
      buttonText: 'Current Plan (Free)',
      buttonColor: 'inherit',
      color: '#455A64',
      bgGrad: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=400'
    },
    {
      name: 'SME Professional',
      tier: 'sme_pro',
      subtitle: 'Growth & Operational Excellence',
      monthlyPrice: '4,999',
      annualPrice: '3,999',
      features: [
        'Excel & Bulk CSV Uploads',
        'Compliance Category Breakdown & Tips',
        'Kanban Services Pipeline + Alerts',
        'SMS & Slack Webhook Notifications',
        'Automated PDF & Excel Reporting exports',
        'Secure Vault Storage (Up to 1 GB)',
        'Statutory Expiry Alerts & Reminders',
        'Audit logs history (14 days)'
      ],
      isPopular: true,
      buttonText: 'Upgrade to SME Pro',
      buttonColor: 'success',
      color: '#2E7D32',
      bgGrad: 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)',
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=400'
    },
    {
      name: 'Enterprise Suite',
      tier: 'enterprise_suite',
      subtitle: 'Conglomerate Command Intelligence',
      monthlyPrice: '24,999',
      annualPrice: '19,999',
      features: [
        'ERP & Auto-API Synchronization',
        'AI Compliance Mitigation Engine',
        'Priority Service Processing SLAs',
        'Custom Escalation Notification Matrices',
        'Scheduled Automatic Report generation',
        'Secure Vault (100 GB S3 Storage)',
        'Automatic OCR Document Extraction',
        'Immutable Security Auditing Logs',
        'Predictive Analytics & Heatmaps',
        '24/7 Priority Support & Phone Access'
      ],
      isPopular: false,
      buttonText: 'Purchase Enterprise',
      buttonColor: 'primary',
      color: '#1F4E79',
      bgGrad: 'linear-gradient(135deg, #172554 0%, #0f172a 100%)',
      image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&q=80&w=400'
    }
  ];

  const matrix = [
    { module: 'Unified Data Submission', starter: 'Basic Forms', pro: 'Excel & Bulk Uploads', enterprise: 'Direct ERP & API Sync', icon: <CloudUpload sx={{ color: '#64748b' }} /> },
    { module: 'Compliance Score Analytics', starter: 'Overall Score', pro: 'Detailed Breakdown', enterprise: 'AI Mitigations & Trends', icon: <Analytics sx={{ color: '#64748b' }} /> },
    { module: 'Services NOC Tracker', starter: 'Standard Pipeline', pro: 'Kanban + SLA Alerts', enterprise: 'VIP Express Priority Processing', icon: <FlashOn sx={{ color: '#64748b' }} /> },
    { module: 'Secure Document Vault', starter: '10 MB Limits', pro: '1 GB + Expiry Reminders', enterprise: '100 GB + Auto OCR Scanner', icon: <Security sx={{ color: '#64748b' }} /> },
    { module: 'Automated Reporting', starter: 'Disabled', pro: 'Manual PDF/Excel Exports', enterprise: 'Scheduled Multi-Format Auto-Reports', icon: <PictureAsPdf sx={{ color: '#64748b' }} /> },
    { module: 'Security Audit Logs', starter: 'Disabled', pro: '14-Day Vault History', enterprise: 'Immutable Compliance Trail (Indefinite)', icon: <History sx={{ color: '#64748b' }} /> },
    { module: 'Priority Support', starter: 'Email (48-hour)', pro: 'Ticketing & Chat Support', enterprise: '24/7 Dedicated Account Manager', icon: <SupportAgent sx={{ color: '#64748b' }} /> }
  ];

  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', pb: 12 }}>
      <UnifiedNav transparent={false} />

      {/* HEADER SECTION */}
      <Box sx={{
        background: 'linear-gradient(135deg, rgba(15,23,40,0.95) 0%, rgba(21,60,36,0.92) 100%), url("https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2000")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: 'white',
        pt: { xs: 14, md: 20 },
        pb: { xs: 12, md: 18 },
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative elements */}
        <Box sx={{ position: 'absolute', top: -100, right: -100, width: 300, height: 300, borderRadius: '50%', bg: '#2E7D32', filter: 'blur(100px)', opacity: 0.15 }} />
        <Box sx={{ position: 'absolute', bottom: -100, left: -100, width: 300, height: 300, borderRadius: '50%', bg: '#1F4E79', filter: 'blur(100px)', opacity: 0.15 }} />

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>

          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 2, py: 0.8, borderRadius: 3, mb: 3, bgcolor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <AutoAwesome sx={{ color: '#4CAF50', fontSize: '0.9rem' }} />
            <Typography variant="caption" sx={{ fontWeight: 800, color: '#81c784', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Monetization Feature Mapping</Typography>
          </Box>

          <Typography variant="h2" fontWeight={900} gutterBottom sx={{ fontSize: { xs: '2.5rem', md: '4rem' }, letterSpacing: '-0.03em' }}>
            Flexible SaaS Subscription Workspace Tiers
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.8, maxW: 720, mx: 'auto', fontWeight: 300, mb: 6, lineHeight: 1.8, fontSize: '1.15rem' }}>
            Choose the perfect tier to monitor, submit, and secure statutory assets inside the SIPCOT Thozhirporul platform.
          </Typography>

          {/* MONTHLY / ANNUAL SWITCH */}
          <Paper 
            elevation={4} 
            sx={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              px: 3, 
              py: 1.2, 
              borderRadius: 5, 
              bgcolor: 'rgba(255,255,255,0.05)', 
              border: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 700, color: billingPeriod === 'monthly' ? '#81c784' : 'rgba(255,255,255,0.6)' }}>Monthly Billing</Typography>
            <Switch 
              checked={billingPeriod === 'annual'} 
              onChange={() => setBillingPeriod(billingPeriod === 'monthly' ? 'annual' : 'monthly')}
              color="success"
              sx={{ mx: 1 }}
            />
            <Typography variant="body2" component="span" sx={{ fontWeight: 700, color: billingPeriod === 'annual' ? '#81c784' : 'rgba(255,255,255,0.6)' }}>
              Annual Billing <Chip label="SAVE 20%" size="small" sx={{ bgcolor: 'rgba(76, 175, 80, 0.15)', color: '#81c784', fontWeight: 900, ml: 1, height: 18, fontSize: '0.65rem' }} />
            </Typography>
          </Paper>
        </Container>
      </Box>

      {/* WORKSPACE PLANS CARDS */}
      <Container maxWidth="lg" sx={{ mt: { xs: -8, md: -12 }, position: 'relative', zIndex: 10 }}>
        <Grid container spacing={4} alignItems="stretch">
          {plans.map((plan, i) => {
            const price = billingPeriod === 'annual' ? plan.annualPrice : plan.monthlyPrice;
            return (
              <Grid size={{ xs: 12, md: 4 }} key={plan.tier}>
                <Zoom in timeout={300 + i * 150}>
                  <Card 
                    elevation={8}
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      borderRadius: 5,
                      border: plan.isPopular ? '2px solid #4CAF50' : '1px solid #E2E8F0',
                      position: 'relative',
                      boxShadow: plan.isPopular ? '0 20px 48px rgba(76, 175, 80, 0.18)' : '0 10px 30px rgba(0,0,0,0.05)',
                      transition: 'all 0.3s ease',
                      '&:hover': { transform: 'translateY(-8px)', boxShadow: plan.isPopular ? '0 24px 56px rgba(76, 175, 80, 0.25)' : '0 20px 40px rgba(0,0,0,0.08)' }
                    }}
                  >
                    {plan.isPopular && (
                      <Box sx={{
                        position: 'absolute',
                        top: 20,
                        right: 20,
                        bgcolor: '#4CAF50',
                        color: 'white',
                        fontWeight: 800,
                        fontSize: '0.65rem',
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 2,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase'
                      }}>
                        Most Popular
                      </Box>
                    )}

                    <CardContent sx={{ p: { xs: 4, sm: 5 }, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                      {/* Plan Image */}
                      <Box sx={{
                        width: '100%',
                        height: 140,
                        mb: 3,
                        borderRadius: 3,
                        overflow: 'hidden',
                        position: 'relative'
                      }}>
                        <Box
                          component="img"
                          src={plan.image}
                          alt={plan.name}
                          sx={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transition: 'transform 0.4s ease',
                          }}
                        />
                        <Box sx={{
                          position: 'absolute',
                          inset: 0,
                          background: `linear-gradient(135deg, ${plan.color}30 0%, transparent 100%)`,
                        }} />
                      </Box>

                      <Typography variant="h5" fontWeight={900} sx={{ color: plan.color, mb: 1, letterSpacing: '-0.02em' }}>
                        {plan.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ mb: 3.5, display: 'block' }}>
                        {plan.subtitle}
                      </Typography>

                      <Box display="flex" alignItems="baseline" mb={4}>
                        <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: '-0.03em', color: 'text.primary' }}>
                          ₹{price}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ ml: 1 }}>
                          / month {billingPeriod === 'annual' && '(billed annually)'}
                        </Typography>
                      </Box>

                      <Divider sx={{ mb: 4 }} />

                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body2" fontWeight={800} color="text.primary" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem' }}>
                          Key Benefits Included:
                        </Typography>
                        <Stack spacing={2} sx={{ mb: 4 }}>
                          {plan.features.map((feature, fIdx) => (
                            <Box display="flex" alignItems="flex-start" gap={1.5} key={fIdx}>
                              <CheckCircle sx={{ color: plan.color, fontSize: '1.05rem', mt: 0.3 }} />
                              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5, fontSize: '0.85rem' }}>
                                {feature}
                              </Typography>
                            </Box>
                          ))}
                        </Stack>
                      </Box>

                      <Button
                        fullWidth
                        variant={plan.isPopular ? 'contained' : 'outlined'}
                        color={plan.buttonColor}
                        size="large"
                        onClick={() => handleSelectPlan(plan.name, price)}
                        sx={{
                          py: 1.8,
                          borderRadius: 3.5,
                          fontWeight: 800,
                          textTransform: 'none',
                          fontSize: '0.95rem',
                          background: plan.isPopular ? 'linear-gradient(135deg, #2E7D32, #4CAF50)' : 'transparent',
                          color: plan.isPopular ? 'white' : plan.color,
                          borderColor: plan.isPopular ? 'none' : plan.color,
                          boxShadow: plan.isPopular ? '0 8px 24px rgba(76, 175, 80, 0.25)' : 'none',
                          '&:hover': {
                            background: plan.isPopular ? 'linear-gradient(135deg, #1B5E20, #2E7D32)' : `${plan.color}08`,
                            borderColor: plan.isPopular ? 'none' : plan.color
                          }
                        }}
                      >
                        {plan.buttonText}
                      </Button>
                    </CardContent>
                  </Card>
                </Zoom>
              </Grid>
            );
          })}
        </Grid>
      </Container>

      {/* FEATURE COMPARISON MATRIX */}
      <Container maxWidth="lg" sx={{ mt: 10 }}>
        <Box textAlign="center" sx={{ mb: 5 }}>
          <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: '-0.02em', mb: 1 }}>
            Exhaustive Feature Comparison Matrix
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Deep dive into every operational boundary and threshold mapping.
          </Typography>
        </Box>

        <TableContainer component={Paper} elevation={3} sx={{ borderRadius: 4, overflowX: 'auto', border: '1px solid #E2E8F0' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#0F1728' }}>
                <TableCell sx={{ color: '#ffffff !important', fontWeight: 800, py: 2.5 }}>Platform Feature Module</TableCell>
                <TableCell sx={{ color: '#ffffff !important', fontWeight: 800 }}>Compliance Starter (Free)</TableCell>
                <TableCell sx={{ color: '#ffffff !important', fontWeight: 800 }}>SME Professional (Paid)</TableCell>
                <TableCell sx={{ color: '#ffffff !important', fontWeight: 800 }}>Enterprise Suite (Paid)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {matrix.map((row, index) => (
                <TableRow key={index} hover sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                  <TableCell sx={{ py: 2, borderBottom: '1px solid #eee' }}>
                    <Box display="flex" alignItems="center" gap={1.5}>
                      {row.icon}
                      <Typography variant="body2" fontWeight={700} color="#1F4E79">{row.module}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ borderBottom: '1px solid #eee', color: 'text.secondary', fontSize: '0.85rem' }}>{row.starter}</TableCell>
                  <TableCell sx={{ borderBottom: '1px solid #eee', color: 'text.primary', fontWeight: 600, fontSize: '0.85rem' }}>{row.pro}</TableCell>
                  <TableCell sx={{ borderBottom: '1px solid #eee', color: 'text.primary', fontWeight: 700, fontSize: '0.85rem' }}>{row.enterprise}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>

      {/* GOVT PLATFORM GPaaS SECTION */}
      <Container maxWidth="lg" sx={{ mt: 10 }}>
        <Paper
          elevation={4}
          sx={{
            p: 0,
            borderRadius: 5,
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #111827 0%, #1e293b 100%)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.05)'
          }}
        >
          <Grid container>
            <Grid size={{ xs: 12, md: 5 }} sx={{ position: 'relative', minHeight: { xs: 200, md: 'auto' } }}>
              <Box
                component="img"
                src="https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&q=80&w=600"
                alt="Government Dashboard"
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  position: 'absolute',
                  inset: 0
                }}
              />
              <Box sx={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to right, rgba(17,24,39,0.3) 0%, rgba(17,24,39,0.8) 100%)'
              }} />
            </Grid>
            <Grid size={{ xs: 12, md: 7 }} sx={{ p: { xs: 4, md: 6 } }}>
              <Chip label="STATE GOVERNANCE G2G" sx={{ mb: 2, bgcolor: 'rgba(76, 175, 80, 0.15)', color: '#81c784', fontWeight: 900, px: 1 }} />
              <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: '-0.02em', mb: 2 }}>
                Are you a Government Official or Park Manager?
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.8, fontWeight: 300, lineHeight: 1.8, mb: 3 }}>
                The Government/Admin tracks operate on a Government-Platform-as-a-Service (GPaaS) cost structure. Park officers (G1) and Command Center officials (G2) obtain full bypass access to all industry audit files and verification logs.
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-start' } }}>
                <Button
                  variant="contained"
                  color="secondary"
                  size="large"
                  onClick={() => navigate('/role-selection')}
                  sx={{
                    py: 1.8,
                    px: 4,
                    borderRadius: 3.5,
                    fontWeight: 800,
                    textTransform: 'none',
                    bgcolor: '#E67E22',
                    boxShadow: '0 8px 24px rgba(230, 126, 34, 0.25)',
                    '&:hover': { bgcolor: '#D35400' }
                  }}
                >
                  Access Govt. Portal
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Container>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity || 'success'} variant="filled" onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
