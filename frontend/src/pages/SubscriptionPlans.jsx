import React, { useState, useEffect } from 'react';
import {
  Box, Container, Typography, Grid, Card, CardContent,
  Button, Chip, Paper,
  Snackbar, Alert, List, ListItem, ListItemText, ListItemIcon, Divider, Fade,
  CircularProgress, Tooltip
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Check, Star, ArrowForward, WorkspacePremium, CheckCircle, Close, Insights, Memory, Security, Rocket, TrendingUp, Diamond, School } from '@mui/icons-material';
import { keyframes } from '@emotion/react';
import UnifiedNav from '../components/UnifiedNav';
import UnifiedFooter from '../components/UnifiedFooter';
import PageHero from '../components/PageHero';
import { paymentsService } from '../services/api';
import { useSubscription, invalidateSubscriptionCache } from '../hooks/useSubscription';

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
  backgroundSize: '28px 28px'
};

// V2 plan data — mirrors backend/routes/subscription-v2.js PLANS_V2
const V2_PLANS = [
  {
    key: 'free_starter',
    name: 'Starter',
    subtitle: 'Digital filing made simple',
    monthlyPrice: 1499,
    annualPrice: 14990,
    badge: 'GET STARTED',
    target: 'Small units (< 50 employees), new allottees',
    icon: 'rocket',
    features: [
      'All 8 data domains, quarterly filing',
      'Server-side validation with field-level errors',
      'Versioned submission history',
      'Compliance score + reporting calendar',
      'Basic anomaly detection (POP%)',
      'Document vault (50 MB)',
      'Email + in-app notifications',
      'CSV report export',
    ],
    isPopular: false,
    color: '#64748B',
    gradient: 'linear-gradient(135deg, #64748B 0%, #475569 100%)',
    accent: '#94A3B8'
},
  {
    key: 'sme_pro',
    name: 'Professional',
    subtitle: 'For growing industries that need foresight',
    monthlyPrice: 4999,
    annualPrice: 49990,
    badge: 'MOST POPULAR',
    target: 'SMEs (50-500 employees), established units',
    icon: 'trending',
    features: [
      'Everything in Starter, plus:',
      'Bulk CSV upload + scoped API key (10K calls/mo)',
      'Cross-metric validation + IQR anomaly detection',
      'Quarterly forecasting (linear regression + MA)',
      'Park-level benchmarking analytics',
      'AI assistant chat (DB-backed, RBAC-scoped)',
      'PDF + real XLSX report export',
      'Scheduled auto-reports',
      'SMS notifications',
      '5 GB document vault',
    ],
    isPopular: true,
    color: '#2E7D32',
    gradient: 'linear-gradient(135deg, #2E7D32 0%, #1B5E20 100%)',
    accent: '#4CAF50'
},
  {
    key: 'enterprise_suite',
    name: 'Enterprise',
    subtitle: 'Full industrial intelligence for large operations',
    monthlyPrice: 24999,
    annualPrice: 249990,
    badge: 'PREMIUM',
    target: 'Large units (500+), multi-park operations',
    icon: 'diamond',
    features: [
      'Everything in Professional, plus:',
      'AI corroboration (expansion coherence analysis)',
      'Investigation workflows (LangGraph agentic)',
      'Holt-Winters ETS forecasting + capacity planning',
      'State-wide analytics + natural-language query',
      'Document OCR (auto-extract from PDFs)',
      'AI-generated decision reports',
      'Agentic workflows (automated investigations)',
      'Unlimited API + 50 GB vault',
      'Dedicated account manager (4h SLA)',
    ],
    isPopular: false,
    color: '#1F4E79',
    gradient: 'linear-gradient(135deg, #1F4E79 0%, #143656 100%)',
    accent: '#42A5F5'
},
];

// V2 comparison — mirrors backend COMPARISON
const V2_COMPARISON = [
  { category: 'Statutory Filing', statutory: true, rows: [
    { feature: 'Quarterly data submission', starter: true, professional: true, enterprise: true },
    { feature: 'Server-side validation', starter: true, professional: true, enterprise: true },
    { feature: 'Version history (never lose data)', starter: true, professional: true, enterprise: true },
    { feature: 'Compliance score', starter: true, professional: true, enterprise: true },
    { feature: 'Reporting calendar + reminders', starter: true, professional: true, enterprise: true },
    { feature: 'Document vault', starter: true, professional: true, enterprise: true },
  ]},  { category: 'Data Quality', statutory: false, rows: [
    { feature: 'Cross-field validation', starter: true, professional: true, enterprise: true },
    { feature: 'Cross-metric consistency checks', starter: false, professional: true, enterprise: true },
    { feature: 'Anomaly detection (POP%)', starter: true, professional: true, enterprise: true },
    { feature: 'Anomaly detection (IQR + version change)', starter: false, professional: true, enterprise: true },
    { feature: 'AI corroboration (expansion coherence)', starter: false, professional: false, enterprise: true },
    { feature: 'Investigation workflow', starter: false, professional: false, enterprise: true },
  ]},
  { category: 'Forecasting & Intelligence', statutory: false, rows: [
    { feature: 'Quarterly forecasting (unit level)', starter: false, professional: true, enterprise: true },
    { feature: 'Holt-Winters ETS (seasonal patterns)', starter: false, professional: false, enterprise: true },
    { feature: 'Park-level demand forecasting', starter: false, professional: false, enterprise: true },
    { feature: 'Capacity planning (water/power gap)', starter: false, professional: false, enterprise: true },
    { feature: 'Natural-language query', starter: false, professional: false, enterprise: true },
  ]},
  { category: 'Analytics', statutory: false, rows: [
    { feature: 'Own industry data + trends', starter: true, professional: true, enterprise: true },
    { feature: 'Park-level benchmarking', starter: false, professional: true, enterprise: true },
    { feature: 'State-wide analytics', starter: false, professional: false, enterprise: true },
    { feature: 'AI assistant (DB-backed chat)', starter: false, professional: true, enterprise: true },
    { feature: 'Agentic workflows', starter: false, professional: false, enterprise: true },
  ]},
  { category: 'Reports & Export', statutory: false, rows: [
    { feature: 'Basic CSV export', starter: true, professional: true, enterprise: true },
    { feature: 'PDF report export', starter: false, professional: true, enterprise: true },
    { feature: 'Real XLSX (Excel) export', starter: false, professional: true, enterprise: true },
    { feature: 'Scheduled auto-reports', starter: false, professional: true, enterprise: true },
    { feature: 'AI-generated decision reports', starter: false, professional: false, enterprise: true },
  ]},
  { category: 'Integration', statutory: false, rows: [
    { feature: 'Bulk CSV upload', starter: false, professional: true, enterprise: true },
    { feature: 'API access (scoped per-industry key)', starter: false, professional: true, enterprise: true },
    { feature: 'ERP data push (scheduled)', starter: false, professional: true, enterprise: true },
    { feature: 'Document OCR (auto-extract)', starter: false, professional: false, enterprise: true },
  ]},
  { category: 'Notifications', statutory: false, rows: [
    { feature: 'In-app notifications', starter: true, professional: true, enterprise: true },
    { feature: 'Email notifications', starter: true, professional: true, enterprise: true },
    { feature: 'Daily digest batching', starter: true, professional: true, enterprise: true },
    { feature: 'SMS notifications', starter: false, professional: true, enterprise: true },
    { feature: 'WhatsApp (when available)', starter: false, professional: false, enterprise: true },
  ]},
  { category: 'Support', statutory: false, rows: [
    { feature: 'Community support', starter: true, professional: true, enterprise: true },
    { feature: 'Priority support (24h SLA)', starter: false, professional: true, enterprise: true },
    { feature: 'Dedicated account manager', starter: false, professional: false, enterprise: true },
  ]},
  { category: 'Limits', statutory: false, rows: [
    { feature: 'Document storage', starter: '50 MB', professional: '5 GB', enterprise: '50 GB' },
    { feature: 'Attachments per filing', starter: '2', professional: '5', enterprise: '10' },
    { feature: 'API calls per month', starter: '—', professional: '10,000', enterprise: 'Unlimited' },
    { feature: 'Submissions per year', starter: '12', professional: '48', enterprise: 'Unlimited' },
  ]},
];

const FeatureCell = ({ value, color }) => {
  if (value === true) return <Check sx={{ fontSize: 18, color: color || '#2E7D32' }} />;
  if (value === false) return <Close sx={{ fontSize: 18, color: 'text.disabled' }} />;
  return <Typography variant="body2" fontWeight={600}>{value}</Typography>;
};

export default function SubscriptionPlans() {
  const navigate = useNavigate();
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [processing, setProcessing] = useState(null);
  const { tier: currentTier, refresh } = useSubscription();

  useEffect(() => {
    if (!document.getElementById('razorpay-script')) {
      const s = document.createElement('script');
      s.id = 'razorpay-script';
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.async = true;
      document.head.appendChild(s);
    }
  }, []);

  const handleSelectPlan = async (planKey, planName) => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (!token) {
      setSnackbar({ open: true, message: 'Please log in as an industry user to upgrade.', severity: 'warning' });
      setTimeout(() => navigate('/login/industry'), 1200);
      return;
    }
    if (role !== 'industry') {
      setSnackbar({ open: true, message: 'Subscription upgrades are for industry accounts only.', severity: 'warning' });
      return;
    }
    setProcessing(planKey);
    try {
      const orderRes = await paymentsService.createOrder(planKey);
      const order = orderRes.data;
      if (order.mock) {
        const verifyRes = await paymentsService.verifyPayment({
          razorpay_order_id: order.orderId,
          razorpay_payment_id: 'mock_pay_' + order.orderId.slice(-10),
          razorpay_signature: 'mock',
          plan: planKey
});
        if (verifyRes.data && !verifyRes.data.error) {
          setSnackbar({ open: true, message: `Successfully upgraded to ${planName}! (Mock mode)`, severity: 'success' });
          invalidateSubscriptionCache();
          refresh();
        }
        setProcessing(null);
        return;
      }
      if (!window.Razorpay) {
        setSnackbar({ open: true, message: 'Payment gateway failed to load. Please try again.', severity: 'error' });
        setProcessing(null);
        return;
      }
      const rzp = new window.Razorpay({
        key: order.keyId, amount: order.amount, currency: order.currency || 'INR',
        name: 'THOZHIRPORUL', description: `${planName} Subscription`, order_id: order.orderId,
        theme: { color: '#1F4E79' },
        handler: async (response) => {
          try {
            const verifyRes = await paymentsService.verifyPayment({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              plan: planKey
});
            if (verifyRes.data && !verifyRes.data.error) {
              setSnackbar({ open: true, message: `Successfully upgraded to ${planName}!`, severity: 'success' });
              invalidateSubscriptionCache();
              refresh();
            } else {
              setSnackbar({ open: true, message: 'Payment verification failed.', severity: 'error' });
            }
          } catch { setSnackbar({ open: true, message: 'Payment verification failed.', severity: 'error' }); }
          setProcessing(null);
        },
        modal: { ondismiss: () => { setSnackbar({ open: true, message: 'Payment cancelled.', severity: 'info' }); setProcessing(null); } }
});
      rzp.open();
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Could not start checkout.', severity: 'error' });
      setProcessing(null);
    }
  };

  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh' }}>
      <UnifiedNav transparent={false} />

      <PageHero
        icon={<WorkspacePremium />}
        label="Subscription Plans"
        title="Industrial Intelligence"
        titleHighlight="Priced by Value"
        subtitle="Every plan includes statutory filing with server-side validation and versioned history. Higher tiers unlock forecasting, AI analytics, and automation."
        accentColor="#2E7D32"
        accentColor2="#1F4E79"
      >
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 3, px: 4, py: 2, borderRadius: 4, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.2)' }}>
          <Typography variant="body1" sx={{ fontWeight: billingPeriod === 'monthly' ? 700 : 500, opacity: billingPeriod === 'monthly' ? 1 : 0.6 }}>
            Monthly
          </Typography>
          <Box sx={{ position: 'relative', width: 64, height: 32, borderRadius: 16, background: billingPeriod === 'annual' ? 'rgba(46,125,50,0.3)' : 'rgba(255,255,255,0.15)', border: `2px solid ${billingPeriod === 'annual' ? '#2E7D32' : 'rgba(255,255,255,0.3)'}`, cursor: 'pointer' }}
            onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'annual' : 'monthly')}>
            <Box sx={{ position: 'absolute', top: 2, left: billingPeriod === 'annual' ? 'calc(100% - 28px)' : 2, width: 24, height: 24, borderRadius: '50%', background: billingPeriod === 'annual' ? '#2E7D32' : 'white', transition: 'all 0.3s' }} />
          </Box>
          <Typography variant="body1" sx={{ fontWeight: billingPeriod === 'annual' ? 700 : 500, opacity: billingPeriod === 'annual' ? 1 : 0.6 }}>
            Annual
          </Typography>
          <Chip label="2 MONTHS FREE" sx={{ background: 'linear-gradient(135deg, #2E7D32, #1B5E20)', color: 'white', fontWeight: 800, fontSize: '0.7rem', height: 28, px: 1, borderRadius: '50px', animation: `${glowPulse} 2.5s ease-in-out infinite` }} />
        </Box>

        <Box sx={{ mt: { xs: 6, md: 8 }, position: 'relative', zIndex: 2 }}>
          <Grid container spacing={{ xs: 3, md: 4 }} alignItems="stretch">
          {V2_PLANS.map((plan, idx) => {
            const PlanIcon = plan.icon === 'rocket' ? Rocket : plan.icon === 'trending' ? TrendingUp : Diamond;
            const isPlus = plan.features[0]?.endsWith('plus:');
            const displayFeatures = isPlus ? plan.features.slice(1) : plan.features;
            return (
            <Grid key={idx} size={{ xs: 12, sm: 6, md: 4 }} sx={{ display: 'flex' }}>
              <Fade in timeout={400 + idx * 150} style={{ flex: 1 }}>
                <Card elevation={0} sx={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  borderRadius: 5,
                  border: plan.isPopular ? '2px solid #2E7D32' : '1px solid #e2e8f0',
                  position: 'relative', overflow: 'visible',
                  transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
                  bgcolor: 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: plan.isPopular
                    ? '0 20px 60px rgba(46,125,50,0.18)'
                    : '0 4px 24px rgba(0,0,0,0.06)',
                  '&:hover': {
                    transform: 'translateY(-12px)',
                    boxShadow: plan.isPopular
                      ? '0 36px 72px rgba(46,125,50,0.28)'
                      : `0 24px 56px ${plan.color}15`,
                    borderColor: plan.isPopular ? '#2E7D32' : plan.accent,
                    '& .plan-icon': { transform: 'scale(1.15) rotate(5deg)' }
}
}}>
                  {/* Ribbon for popular */}
                  {plan.isPopular && (
                    <Box sx={{
                      position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                      px: 3, py: 0.8, borderRadius: '50px', whiteSpace: 'nowrap',
                      background: 'linear-gradient(135deg, #4CAF50, #2E7D32)',
                      color: 'white', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.12em',
                      boxShadow: '0 4px 20px rgba(46,125,50,0.5)', zIndex: 2,
                      display: 'flex', alignItems: 'center', gap: 0.5
}}>
                      <Star sx={{ fontSize: 13 }} /> MOST POPULAR
                    </Box>
                  )}

                  {/* Gradient top strip with icon */}
                  <Box sx={{
                    height: 80, position: 'relative', overflow: 'hidden',
                    background: plan.gradient,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '20px 20px 0 0',
                    '&::after': {
                      content: '""', position: 'absolute', inset: 0,
                      background: 'radial-gradient(circle at 30% 120%, rgba(255,255,255,0.15) 0%, transparent 60%)'
}
}}>
                    <Box className="plan-icon" sx={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 56, height: 56, borderRadius: 3,
                      background: 'rgba(255,255,255,0.15)',
                      border: '2px solid rgba(255,255,255,0.3)',
                      backdropFilter: 'blur(8px)',
                      transition: 'all 0.4s cubic-bezier(0.34,1.56,0.64,1)',
                      zIndex: 1
}}>
                      <PlanIcon sx={{ fontSize: 30, color: 'white' }} />
                    </Box>
                    <Chip
                      label={`${displayFeatures.length} features`}
                      size="small"
                      sx={{
                        position: 'absolute', bottom: 8, right: 12,
                        bgcolor: 'rgba(255,255,255,0.2)', color: 'white',
                        fontSize: '0.6rem', fontWeight: 600, height: 20,
                        backdropFilter: 'blur(4px)'
}}
                    />
                  </Box>

                  <CardContent sx={{ p: { xs: 2.5, md: 3 }, display: 'flex', flexDirection: 'column', flex: 1 }}>
                    {/* Plan name + subtitle */}
                    <Box sx={{ mb: 2.5 }}>
                      <Typography variant="h5" fontWeight={800} sx={{ fontSize: '1.4rem', mb: 0.3, color: plan.color }}>
                        {plan.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                        {plan.subtitle}
                      </Typography>
                    </Box>

                    {/* Price block */}
                    <Box sx={{
                      mb: 3, py: 2.5, px: 2,
                      borderRadius: 3,
                      bgcolor: `${plan.color}08`,
                      border: `1px solid ${plan.color}15`
}}>
                      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
                        {billingPeriod === 'annual' && (
                          <Typography component="span" sx={{ fontSize: '1.1rem', color: 'text.disabled', textDecoration: 'line-through', fontWeight: 500 }}>
                            ₹{plan.monthlyPrice.toLocaleString('en-IN')}
                          </Typography>
                        )}
                        <Typography variant="h2" fontWeight={800} sx={{
                          fontSize: { xs: '2.2rem', md: '2.6rem' },
                          background: plan.gradient,
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          lineHeight: 1.1
}}>
                          {billingPeriod === 'annual'
                            ? `₹${Math.round(plan.annualPrice / 12).toLocaleString('en-IN')}`
                            : `₹${plan.monthlyPrice.toLocaleString('en-IN')}`}
                        </Typography>
                        <Typography variant="body1" color="text.secondary" fontWeight={600}>
                          /mo
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                        {billingPeriod === 'annual' ? (
                          <>
                            <Chip
                              label={`SAVE ₹${((plan.monthlyPrice * 12) - plan.annualPrice).toLocaleString('en-IN')}/yr`}
                              size="small" color="success"
                              sx={{ fontWeight: 700, fontSize: '0.65rem', height: 22 }}
                            />
                            <Typography variant="caption" color="text.disabled">
                              Billed ₹{plan.annualPrice.toLocaleString('en-IN')}/yr
                            </Typography>
                          </>
                        ) : (
                          <Typography variant="caption" color="text.disabled">
                            Annual: ₹{plan.annualPrice.toLocaleString('en-IN')}/yr · 2 months free
                          </Typography>
                        )}
                      </Box>
                    </Box>

                    {/* Target user */}
                    <Tooltip title={plan.target} arrow placement="top">
                      <Typography variant="caption" sx={{
                        display: 'block', mb: 2, textAlign: 'center',
                        color: 'text.disabled', fontStyle: 'italic',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
}}>
                        Best for: {plan.target.split(',')[0]}
                      </Typography>
                    </Tooltip>

                    <Divider sx={{ mb: 2, borderColor: 'rgba(0,0,0,0.06)' }} />

                    {/* Features */}
                    {isPlus && (
                      <Typography variant="caption" sx={{
                        display: 'block', mb: 1.5, fontWeight: 700,
                        color: plan.color, textAlign: 'center', letterSpacing: '0.05em'
}}>
                        EVERYTHING IN {plan.key === 'sme_pro' ? 'STARTER' : 'PROFESSIONAL'}, PLUS:
                      </Typography>
                    )}
                    <List dense disablePadding sx={{ mb: 3, flex: 1 }}>
                      {displayFeatures.map((feature, i) => (
                        <ListItem key={i} disableGutters sx={{ py: 0.7 }}>
                          <ListItemIcon sx={{ minWidth: 30 }}>
                            <Box sx={{
                              width: 20, height: 20, borderRadius: '50%',
                              background: `${plan.color}12`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
}}>
                              <Check sx={{ fontSize: 13, color: plan.color }} />
                            </Box>
                          </ListItemIcon>
                          <ListItemText
                            primary={feature}
                            primaryTypographyProps={{
                              variant: 'body2',
                              fontWeight: 500,
                              color: 'text.primary',
                              sx: { lineHeight: 1.4 }
}}
                          />
                        </ListItem>
                      ))}
                    </List>

                    {/* CTA Button */}
                    <Button
                      fullWidth
                      variant={plan.isPopular ? 'contained' : 'outlined'}
                      size="large"
                      disabled={processing === plan.key || currentTier === plan.key}
                      onClick={() => handleSelectPlan(plan.key, plan.name)}
                      endIcon={currentTier === plan.key
                        ? <CheckCircle />
                        : (processing === plan.key ? <CircularProgress size={18} color="inherit" /> : <ArrowForward />)}
                      sx={{
                        mt: 'auto', py: 1.6, fontWeight: 700, borderRadius: 2.5,
                        fontSize: '0.9rem', letterSpacing: '0.02em',
                        background: plan.isPopular ? plan.gradient : undefined,
                        color: plan.isPopular ? 'white' : plan.color,
                        borderColor: plan.color,
                        borderWidth: plan.isPopular ? 0 : 1.5,
                        transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: plan.isPopular
                            ? `0 12px 32px ${plan.color}40`
                            : `0 8px 24px ${plan.color}18`,
                          background: plan.isPopular ? plan.gradient : `${plan.color}08`
},
                        '&.Mui-disabled': {
                          bgcolor: currentTier === plan.key ? `${plan.color}10` : 'transparent',
                          color: currentTier === plan.key ? plan.color : 'text.disabled',
                          borderColor: currentTier === plan.key ? plan.color : 'text.disabled'
}
}}
                    >
                      {currentTier === plan.key
                        ? '✓ Current Plan'
                        : processing === plan.key
                          ? 'Processing…'
                          : `Subscribe to ${plan.name}`}
                    </Button>
                  </CardContent>
                </Card>
              </Fade>
            </Grid>
            );
          })}
        </Grid>
        </Box>
      </PageHero>

      {/* Feature Comparison — 9 categories, V2 */}
      <Box sx={{ bgcolor: '#ffffff', py: 14, position: 'relative', overflow: 'hidden', ...sectionPattern }}>
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ mb: 8, textAlign: 'center', animation: `${fadeInUp} 0.8s ease-out` }}>
            <Chip label="DETAILED COMPARISON" sx={{ mb: 3, background: 'linear-gradient(135deg, #1F4E79, #2E7D32)', color: 'white', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.15em', px: 2.5, py: 1, borderRadius: '50px' }} />
            <Typography variant="h3" fontWeight={900} sx={{ fontSize: { xs: '1.75rem', md: '2.5rem' }, mb: 2 }}>
              Every Feature, Side by Side
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
              9 categories · 44 features · statutory filing always free across all tiers
            </Typography>
          </Box>

          {V2_COMPARISON.map((section, sIdx) => (
            <Paper key={sIdx} elevation={0} sx={{ mb: 3, borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, background: section.statutory ? 'linear-gradient(135deg, #1a3a12, #2E7D32)' : 'linear-gradient(135deg, #0d2435, #143656)', color: 'white', py: 1.5, px: 3 }}>
                {section.statutory ? <Security sx={{ fontSize: 16 }} /> : <Insights sx={{ fontSize: 16 }} />}
                <Typography variant="subtitle2" fontWeight={700}>
                  {section.category}
                </Typography>
                {section.statutory && (
                  <Chip label="ALL PLANS" size="small" sx={{ ml: 'auto', bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontSize: '0.6rem', fontWeight: 700 }} />
                )}
              </Box>
              {section.rows.map((row, idx) => (
                <Box key={idx} sx={{ display: 'flex', borderBottom: idx < section.rows.length - 1 ? '1px solid #f1f5f9' : 'none', bgcolor: idx % 2 === 0 ? 'white' : '#f8fafc', '&:hover': { bgcolor: 'rgba(46,125,50,0.03)' } }}>
                  <Box sx={{ flex: 2, p: 2, pl: 3, fontWeight: 500, fontSize: '0.85rem' }}>{row.feature}</Box>
                  <Box sx={{ flex: 1, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FeatureCell value={row.starter} color="#64748B" />
                  </Box>
                  <Box sx={{ flex: 1, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(46,125,50,0.02)' }}>
                    <FeatureCell value={row.professional} color="#2E7D32" />
                  </Box>
                  <Box sx={{ flex: 1, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(31,78,121,0.02)' }}>
                    <FeatureCell value={row.enterprise} color="#1F4E79" />
                  </Box>
                </Box>
              ))}
            </Paper>
          ))}

          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mt: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Check sx={{ fontSize: 16, color: '#2E7D32' }} />
              <Typography variant="body2" color="text.secondary">= included</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Close sx={{ fontSize: 16, color: 'text.disabled' }} />
              <Typography variant="body2" color="text.secondary">= not in this tier</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Memory sx={{ fontSize: 16, color: '#1F4E79' }} />
              <Typography variant="body2" color="text.secondary">= AI/agentic capability</Typography>
            </Box>
          </Box>
        </Container>
      </Box>

      <Box sx={{ py: 16, background: 'linear-gradient(135deg, #060d1a 0%, #0a1c14 50%, #0d2435 100%)', color: 'white', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
          <WorkspacePremium sx={{ fontSize: 64, mb: 3, opacity: 0.9, animation: `${float} 4s ease-in-out infinite` }} />
          <Typography variant="h3" fontWeight={900} sx={{ mb: 3, fontSize: { xs: '1.75rem', md: '2.75rem' } }}>
            Need a Custom Enterprise Solution?
          </Typography>
          <Typography variant="h6" sx={{ mb: 6, opacity: 0.8, fontWeight: 300, lineHeight: 1.7 }}>
            Multi-park deployments, custom agentic workflows, dedicated infrastructure, and volume pricing for industrial conglomerates.
          </Typography>
          <Button variant="contained" size="large" onClick={() => navigate('/contact')} endIcon={<ArrowForward />}
            sx={{ px: 5, py: 2, fontWeight: 700, bgcolor: 'white', color: '#0d2435', borderRadius: 3, '&:hover': { bgcolor: '#f1f8f2', transform: 'translateY(-4px)' } }}>
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
