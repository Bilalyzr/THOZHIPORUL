import React, { useState } from 'react';
import {
  Box, Container, Typography, Grid, Card, CardContent,
  Button, Chip, Paper, Stack,
  Snackbar, Alert, List, ListItem, ListItemText, ListItemIcon, Divider, Fade
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Check, Star, ArrowForward, WorkspacePremium, AutoAwesome } from '@mui/icons-material';
import { keyframes } from '@emotion/react';
import UnifiedNav from '../components/UnifiedNav';
import UnifiedFooter from '../components/UnifiedFooter';
import PageHero from '../components/PageHero';

const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
`;

const glowPulse = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(245,158,11,0.3); }
  50% { box-shadow: 0 0 44px rgba(245,158,11,0.7); }
`;

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
`;


const sectionPattern = {
  backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.04) 1px, transparent 0)',
  backgroundSize: '28px 28px',
};

export default function SubscriptionPlans() {
  const navigate = useNavigate();
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const handleSelectPlan = (planName) => {
    setSnackbar({ open: true, message: `${planName} plan selected. Redirecting to payment...`, severity: 'success' });
    setTimeout(() => navigate('/role-selection'), 1500);
  };

  const plans = [
    {
      name: 'Starter',
      subtitle: 'Perfect for MSMEs',
      monthlyPrice: 'Free',
      annualPrice: 'Free',
      badge: 'ALWAYS FREE',
      features: ['Basic Data Submission Forms', 'Overall Compliance Score', 'Standard NOC Pipeline', 'Email Notifications', 'Secure Vault (10 MB)', 'Community Support', 'Statutory filing — never gated'],
      isPopular: false,
      color: '#64748B',
      gradient: 'linear-gradient(135deg, #64748B 0%, #475569 100%)',
    },
    {
      name: 'Professional',
      subtitle: 'For growing industries',
      monthlyPrice: '₹4,999',
      annualPrice: '₹3,999',
      badge: 'RECOMMENDED',
      features: ['Excel & Bulk CSV Uploads', 'Advanced Compliance Analytics', 'Kanban Services Pipeline', 'SMS & Email Notifications', 'Secure Vault (1 GB)', 'Priority Support', 'Custom Report Exports'],
      isPopular: true,
      color: '#2E7D32',
      gradient: 'linear-gradient(135deg, #2E7D32 0%, #1B5E20 100%)',
    },
    {
      name: 'Enterprise',
      subtitle: 'For large conglomerates',
      monthlyPrice: '₹24,999',
      annualPrice: '₹19,999',
      badge: 'PREMIUM',
      features: ['API & ERP Integration', 'AI Compliance Engine', '24/7 Dedicated Support', 'Secure Vault (100 GB)', 'Custom Workflows', 'White-label Reports', 'SLA Guarantees'],
      isPopular: false,
      color: '#1F4E79',
      gradient: 'linear-gradient(135deg, #1F4E79 0%, #143656 100%)',
    },
  ];

  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh' }}>
      <UnifiedNav transparent={false} />

      {/* ── Hero ── */}
      <PageHero
        icon={<WorkspacePremium />}
        label="Subscription Plans"
        title="Choose Your"
        titleHighlight="Perfect Plan"
        subtitle="Statutory compliance is always FREE — data submission, compliance score, and NOC tracking. Premium tiers unlock value-added analytics, automation, and storage as you grow."
        accentColor="#2E7D32"
        accentColor2="#1F4E79"
        bgImage="https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&q=60&w=1600"
      >
        {/* Billing toggle in hero */}
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 3, px: 4, py: 2, borderRadius: 4, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.2)' }}>
          <Typography variant="body1" sx={{ fontWeight: billingPeriod === 'monthly' ? 700 : 500, opacity: billingPeriod === 'monthly' ? 1 : 0.6, transition: 'all 0.3s ease' }}>
            Monthly
          </Typography>
          <Box
            sx={{ position: 'relative', width: 64, height: 32, borderRadius: 16, background: billingPeriod === 'annual' ? 'rgba(46,125,50,0.3)' : 'rgba(255,255,255,0.15)', border: `2px solid ${billingPeriod === 'annual' ? '#2E7D32' : 'rgba(255,255,255,0.3)'}`, cursor: 'pointer', transition: 'all 0.3s ease' }}
            onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'annual' : 'monthly')}
          >
            <Box sx={{ position: 'absolute', top: 2, left: billingPeriod === 'annual' ? 'calc(100% - 28px)' : 2, width: 24, height: 24, borderRadius: '50%', background: billingPeriod === 'annual' ? '#2E7D32' : 'white', transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)', boxShadow: billingPeriod === 'annual' ? '0 0 16px rgba(46,125,50,0.7)' : '0 2px 8px rgba(0,0,0,0.2)' }} />
          </Box>
          <Typography variant="body1" sx={{ fontWeight: billingPeriod === 'annual' ? 700 : 500, opacity: billingPeriod === 'annual' ? 1 : 0.6, transition: 'all 0.3s ease' }}>
            Annual
          </Typography>
          <Chip
            label="SAVE 20%"
            sx={{ background: 'linear-gradient(135deg, #2E7D32, #1B5E20)', color: 'white', fontWeight: 800, fontSize: '0.7rem', height: 28, px: 1, borderRadius: '50px', animation: `${glowPulse} 2.5s ease-in-out infinite` }}
          />
        </Box>

        {/* ── Pricing Cards ── */}
        <Box sx={{ mt: { xs: 8, md: 10 }, position: 'relative', zIndex: 2 }}>
          <Grid container spacing={4}>
          {plans.map((plan, idx) => (
            <Grid key={idx} size={{ xs: 12, md: 4 }}>
              <Fade in timeout={400 + idx * 150}>
                <Card
                  elevation={0}
                  sx={{
                    height: '100%', borderRadius: 4,
                    border: plan.isPopular ? '2px solid #2E7D32' : '1px solid #e2e8f0',
                    position: 'relative', overflow: 'visible',
                    transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
                    bgcolor: plan.isPopular ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.9)',
                    backdropFilter: 'blur(20px)',
                    boxShadow: plan.isPopular ? '0 16px 64px rgba(46,125,50,0.2)' : '0 8px 40px rgba(0,0,0,0.07)',
                    '&:hover': {
                      transform: plan.isPopular ? 'translateY(-20px)' : 'translateY(-14px)',
                      boxShadow: plan.isPopular ? '0 40px 80px rgba(46,125,50,0.3)' : `0 32px 64px ${plan.color}18`,
                      borderColor: plan.isPopular ? '#2E7D32' : plan.color,
                    },
                  }}
                >
                  {plan.isPopular && (
                    <Box sx={{
                      position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)',
                      px: 3, py: 1, borderRadius: '50px',
                      background: 'linear-gradient(135deg, #4CAF50, #2E7D32)',
                      color: 'white', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.1em',
                      boxShadow: '0 4px 20px rgba(46,125,50,0.5)',
                      display: 'flex', alignItems: 'center', gap: 0.5,
                    }}>
                      <Star sx={{ fontSize: 14 }} /> MOST POPULAR
                    </Box>
                  )}

                  {/* Colored top strip */}
                  <Box sx={{ height: 5, borderRadius: '16px 16px 0 0', background: plan.gradient }} />

                  <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                    <Box sx={{ mb: 3 }}>
                      <Chip label={plan.badge} size="small" sx={{ background: plan.gradient, color: 'white', fontWeight: 700, fontSize: '0.65rem', letterSpacing: '0.1em', px: 1.5 }} />
                    </Box>
                    <Box sx={{ mb: 4 }}>
                      <Typography variant="h5" fontWeight={900} sx={{ mb: 0.5, fontSize: '1.5rem' }}>{plan.name}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{plan.subtitle}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                        <Typography variant="h3" fontWeight={900} sx={{ fontSize: '2.5rem', background: plan.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                          {billingPeriod === 'annual' ? plan.annualPrice : plan.monthlyPrice}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" fontWeight={500}>
                          /{billingPeriod === 'annual' ? 'year' : 'month'}
                        </Typography>
                      </Box>
                    </Box>

                    <Divider sx={{ my: 3, borderColor: 'rgba(0,0,0,0.06)' }} />

                    <List dense disablePadding sx={{ mb: 4 }}>
                      {plan.features.map((feature, i) => (
                        <ListItem key={i} disableGutters sx={{ py: 1.2 }}>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <Box sx={{ width: 22, height: 22, borderRadius: '50%', background: `${plan.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Check sx={{ fontSize: 14, color: plan.color }} />
                            </Box>
                          </ListItemIcon>
                          <ListItemText primary={feature} primaryTypographyProps={{ variant: 'body2', fontWeight: 600, color: 'text.primary' }} />
                        </ListItem>
                      ))}
                    </List>

                    <Button
                      fullWidth variant={plan.isPopular ? 'contained' : 'outlined'} size="large"
                      onClick={() => handleSelectPlan(plan.name)}
                      endIcon={<ArrowForward />}
                      sx={{
                        py: 1.8, fontWeight: 700, borderRadius: 3,
                        background: plan.isPopular ? plan.gradient : undefined,
                        color: plan.isPopular ? 'white' : plan.color,
                        borderColor: plan.color, borderWidth: plan.isPopular ? 0 : 2,
                        fontSize: '0.95rem',
                        boxShadow: plan.isPopular ? `0 8px 24px ${plan.color}40` : 'none',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-3px)',
                          boxShadow: plan.isPopular ? `0 16px 40px ${plan.color}50` : `0 8px 24px ${plan.color}20`,
                        },
                      }}
                    >
                      {plan.name === 'Starter' ? 'Get Started Free' : `Subscribe to ${plan.name}`}
                    </Button>
                  </CardContent>
                </Card>
              </Fade>
            </Grid>
          ))}
        </Grid>
        </Box>
      </PageHero>

      {/* ── Feature Comparison ── */}
      <Box sx={{ bgcolor: '#ffffff', py: 14, position: 'relative', overflow: 'hidden', ...sectionPattern }}>
        <Box sx={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(ellipse at 15% 50%, rgba(46,125,50,0.06) 0%, transparent 55%), radial-gradient(ellipse at 85% 50%, rgba(31,78,121,0.06) 0%, transparent 55%)',
          pointerEvents: 'none',
        }} />

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ mb: 10, textAlign: 'center', animation: `${fadeInUp} 0.8s ease-out` }}>
            <Chip
              label="COMPARE FEATURES"
              sx={{ mb: 3, background: 'linear-gradient(135deg, #1F4E79, #2E7D32)', color: 'white', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.15em', px: 2.5, py: 1, borderRadius: '50px' }}
            />
            <Typography variant="h3" fontWeight={900} sx={{ fontSize: { xs: '1.75rem', md: '2.5rem' }, mb: 2, letterSpacing: '-0.02em' }}>
              Feature Comparison
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto', lineHeight: 1.7 }}>
              Compare all features across plans and choose the one that fits your needs
            </Typography>
          </Box>

          <Paper
            elevation={0}
            sx={{
              borderRadius: 4,
              border: '1px solid #e2e8f0',
              bgcolor: 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(16px)',
              overflow: 'hidden',
              boxShadow: '0 8px 40px rgba(0,0,0,0.07)',
            }}
          >
            <Box sx={{ display: 'flex', background: 'linear-gradient(135deg, #0d2435 0%, #1a3a12 100%)', color: 'white' }}>
              <Box sx={{ flex: 2, p: 3, fontWeight: 700 }}>Feature</Box>
              <Box sx={{ flex: 1, p: 3, textAlign: 'center', fontWeight: 700 }}>Starter</Box>
              <Box sx={{ flex: 1, p: 3, textAlign: 'center', fontWeight: 700 }}>Professional</Box>
              <Box sx={{ flex: 1, p: 3, textAlign: 'center', fontWeight: 700 }}>Enterprise</Box>
            </Box>
            {[
              { feature: 'Data Submission', starter: 'Basic Forms', pro: 'Bulk Uploads', enterprise: 'API Integration' },
              { feature: 'Analytics Dashboard', starter: 'Basic', pro: 'Advanced', enterprise: 'AI-Powered' },
              { feature: 'Support Level', starter: 'Community', pro: 'Priority', enterprise: '24/7 Dedicated' },
              { feature: 'Storage Limit', starter: '10 MB', pro: '1 GB', enterprise: '100 GB' },
              { feature: 'Notifications', starter: 'Email Only', pro: 'SMS + Email', enterprise: 'Custom Channels' },
              { feature: 'Custom Reports', starter: '❌', pro: 'PDF/Excel', enterprise: 'All Formats' },
              { feature: 'SLA Guarantee', starter: '❌', pro: '❌', enterprise: '99.9% Uptime' },
            ].map((row, idx) => (
              <Box
                key={idx}
                sx={{
                  display: 'flex',
                  borderBottom: '1px solid #e2e8f0',
                  '&:last-child': { borderBottom: 'none' },
                  bgcolor: idx % 2 === 0 ? 'white' : '#f8fafc',
                  transition: 'all 0.2s ease',
                  '&:hover': { bgcolor: 'rgba(46,125,50,0.03)' },
                }}
              >
                <Box sx={{ flex: 2, p: 3, fontWeight: 600, fontSize: '0.9rem' }}>{row.feature}</Box>
                <Box sx={{ flex: 1, p: 3, textAlign: 'center', fontSize: '0.9rem', color: 'text.secondary' }}>{row.starter}</Box>
                <Box sx={{ flex: 1, p: 3, textAlign: 'center', fontSize: '0.9rem', fontWeight: 700, color: '#2E7D32' }}>{row.pro}</Box>
                <Box sx={{ flex: 1, p: 3, textAlign: 'center', fontSize: '0.9rem', fontWeight: 700, color: '#1F4E79' }}>{row.enterprise}</Box>
              </Box>
            ))}
          </Paper>
        </Container>
      </Box>

      {/* ── CTA Band ── */}
      <Box sx={{
        py: 16,
        background: 'linear-gradient(135deg, #060d1a 0%, #0a1c14 50%, #0d2435 100%)',
        color: 'white', textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        <Box sx={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 30% 70%, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '40px 40px', opacity: 0.6, pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', top: '15%', right: '8%', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(46,125,50,0.3) 0%, transparent 65%)', filter: 'blur(60px)', pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', bottom: '15%', left: '5%', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(31,78,121,0.3) 0%, transparent 65%)', filter: 'blur(55px)', pointerEvents: 'none' }} />

        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
          <WorkspacePremium sx={{ fontSize: 64, mb: 3, opacity: 0.9, animation: `${float} 4s ease-in-out infinite` }} />
          <Typography variant="h3" fontWeight={900} sx={{ mb: 3, fontSize: { xs: '1.75rem', md: '2.75rem' }, letterSpacing: '-0.02em' }}>
            Need a Custom Enterprise Solution?
          </Typography>
          <Typography variant="h6" sx={{ mb: 6, opacity: 0.8, fontWeight: 300, fontSize: '1.1rem', lineHeight: 1.7 }}>
            Contact our sales team to discuss enterprise requirements, custom integrations, and volume pricing.
          </Typography>
          <Button
            variant="contained" size="large"
            onClick={() => navigate('/contact')}
            endIcon={<ArrowForward />}
            sx={{
              px: 5, py: 2, fontWeight: 700,
              bgcolor: 'white', color: '#0d2435',
              borderRadius: 3, fontSize: '1rem',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              transition: 'all 0.3s ease',
              '&:hover': { bgcolor: '#f1f8f2', transform: 'translateY(-4px)', boxShadow: '0 16px 48px rgba(0,0,0,0.4)' },
            }}
          >
            Contact Sales Team
          </Button>
        </Container>
      </Box>

      <UnifiedFooter />

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} sx={{ borderRadius: 3 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
