import { Box, Typography, Button, Chip, Paper } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../hooks/useSubscription';

/**
 * <GatedFeature> — wraps a value-added UI element and shows an upgrade
 * card if the caller's tier doesn't include the feature.
 *
 * Props:
 *   featureKey  — e.g. 'analytics.predictive' (matches tier_feature_access)
 *   featureName — human label shown on the upgrade card
 *   fallback    — optional custom UI to render when gated (overrides default card)
 *   children    — the real content (rendered when allowed)
 *   compact     — if true, renders a minimal inline lock badge instead of a full card
 *
 * Admin/govt always see the children (bypass). Statutory features are never
 * gated by the backend, so this component is only used on value-added widgets.
 *
 * Usage:
 *   <GatedFeature featureKey="reports.scheduled" featureName="Scheduled Reports">
 *     <ScheduledReportsPanel />
 *   </GatedFeature>
 */
export default function GatedFeature({ featureKey, featureName, fallback, children, compact }) {
  const navigate = useNavigate();
  const { can, loading, tier, displayName } = useSubscription();

  // While loading, render children (fail open — avoid flicker).
  if (loading) return children;

  // Allowed — render the real content.
  if (can(featureKey)) return children;

  // Custom fallback UI.
  if (fallback) return fallback;

  // Compact mode — minimal inline badge.
  if (compact) {
    return (
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
        <LockIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
        <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 600 }}>
          {featureName || 'Premium'}
        </Typography>
      </Box>
    );
  }

  // Default: premium upgrade card.
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3, borderRadius: 3, textAlign: 'center',
        background: 'linear-gradient(135deg, rgba(31,78,121,0.04), rgba(46,125,50,0.04))',
        border: '1px solid rgba(31,78,121,0.12)',
      }}
    >
      <Box sx={{
        width: 48, height: 48, borderRadius: '50%',
        bgcolor: 'rgba(31,78,121,0.08)', color: '#1F4E79',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        mx: 'auto', mb: 1.5,
      }}>
        <LockIcon sx={{ fontSize: 24 }} />
      </Box>
      <Typography variant="subtitle2" fontWeight={800} gutterBottom sx={{ fontFamily: '"Outfit",sans-serif' }}>
        {featureName || 'Premium Feature'}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 320, mx: 'auto', lineHeight: 1.5 }}>
        Your current plan {tier && tier !== 'internal' ? `(${displayName})` : ''} doesn't include this feature.
        Upgrade to unlock it.
      </Typography>
      <Button
        variant="contained"
        size="small"
        startIcon={<AutoAwesomeIcon />}
        onClick={() => navigate('/subscriptions')}
        sx={{
          borderRadius: 2, textTransform: 'none', fontWeight: 700,
          background: 'linear-gradient(135deg, #1F4E79, #2E7D32)',
          px: 3,
        }}
      >
        Upgrade Plan
      </Button>
    </Paper>
  );
}
