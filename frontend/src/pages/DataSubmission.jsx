import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress } from '@mui/material';

// The legacy multi-step form on this route was a client-side SIMULATION
// (no API calls — audited 2026-09-30). It is replaced by a redirect to the
// REAL filing page (UnifiedDataSubmission → POST /api/submissions).
export default function DataSubmission() {
  const navigate = useNavigate();
  useEffect(() => {
    const t = setTimeout(() => navigate('/submit-data', { replace: true }), 800);
    return () => clearTimeout(t);
  }, [navigate]);
  return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <CircularProgress sx={{ mb: 2 }} />
      <Typography variant="h6">This page has moved</Typography>
      <Typography variant="body2" color="text.secondary">
        Redirecting you to the live data submission form…
      </Typography>
    </Box>
  );
}
