import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, Chip, LinearProgress,
  CircularProgress, Alert, Divider, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow
} from '@mui/material';
import { EmojiEvents, Park as Eco, School, HealthAndSafety, Diversity3, Palette } from '@mui/icons-material';
import { researchService } from '../services/api';

const PILLAR_META = {
  health_sanitation: { label: 'Healthcare & Sanitation', icon: <HealthAndSafety />, color: '#E53935' },
  education_skills: { label: 'Education & Skills', icon: <School />, color: '#1F4E79' },
  environment: { label: 'Environment', icon: <Eco />, color: '#2E7D32' },
  women_welfare: { label: 'Women Welfare', icon: <Diversity3 />, color: '#8E24AA' },
  heritage_culture: { label: 'Heritage & Culture', icon: <Palette />, color: '#F57C00' },
  uncategorised: { label: 'Uncategorised', icon: <EmojiEvents />, color: '#607D8B' }
};

const SDG_LABELS = {
  1: 'No Poverty', 2: 'Zero Hunger', 3: 'Good Health', 4: 'Quality Education',
  5: 'Gender Equality', 6: 'Clean Water', 7: 'Clean Energy', 8: 'Decent Work',
  9: 'Industry & Innovation', 10: 'Reduced Inequalities', 11: 'Sustainable Cities',
  12: 'Responsible Consumption', 13: 'Climate Action', 14: 'Life Below Water',
  15: 'Life on Land', 16: 'Peace & Justice', 17: 'Partnerships'
};

export default function CsrDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    researchService.getCsrDashboard()
      .then((res) => { if (active) setData(res.data); })
      .catch(() => { if (active) setError('Failed to load CSR dashboard.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading) return <Box display="flex" justifyContent="center" p={6}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data || data.total_records === 0) {
    return (
      <Box>
        <Typography variant="h4" fontWeight="bold" color="primary.main" gutterBottom>CSR Dashboard</Typography>
        <Alert severity="info">No CSR activities reported yet. Once industries file CSR data via the submission portal, the 5-pillar breakdown, mandate compliance, and SDG coverage will appear here.</Alert>
      </Box>
    );
  }

  const mandatePct = data.mandate_compliance_pct || 0;
  const mandateColor = mandatePct >= 100 ? '#2E7D32' : mandatePct >= 70 ? '#F57C00' : '#d32f2f';
  const maxPillarSpend = Math.max(...Object.values(data.by_pillar).map(p => p.spend), 1);

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Typography variant="h4" fontWeight="bold" color="primary.main" gutterBottom sx={{ fontSize: { xs: '1.4rem', sm: '1.75rem', md: '2.125rem' } }}>
        CSR Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Section 135 / Schedule VII mandate — companies must spend 2% of average PAT on eligible CSR activities.
      </Typography>

      <Grid container spacing={3}>
        {/* KPI cards */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined"><CardContent>
            <Typography variant="caption" color="text.secondary">Total Actual Spend</Typography>
            <Typography variant="h5" fontWeight={700} color="#2E7D32">₹{data.total_actual_spend_cr} Cr</Typography>
          </CardContent></Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined"><CardContent>
            <Typography variant="caption" color="text.secondary">Mandated (2% PAT)</Typography>
            <Typography variant="h5" fontWeight={700} color="#1F4E79">₹{data.total_mandated_spend_cr} Cr</Typography>
          </CardContent></Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined"><CardContent>
            <Typography variant="caption" color="text.secondary">Mandate Compliance</Typography>
            <Typography variant="h5" fontWeight={700} color={mandateColor}>{mandatePct}%</Typography>
            <LinearProgress variant="determinate" value={Math.min(mandatePct, 100)} sx={{ mt: 1, height: 6, borderRadius: 3, '& .MuiLinearProgress-bar': { bgcolor: mandateColor } }} />
          </CardContent></Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined"><CardContent>
            <Typography variant="caption" color="text.secondary">SDG Goals Covered</Typography>
            <Typography variant="h5" fontWeight={700}>{data.sdg_coverage.length}</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
              {data.sdg_coverage.slice(0, 6).map(g => (
                <Chip key={g} label={`SDG ${g}`} size="small" sx={{ fontSize: '0.65rem', height: 20 }} />
              ))}
            </Box>
          </CardContent></Card>
        </Grid>
      </Grid>

      {/* Spend by pillar */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>Spend by CSR Pillar (Schedule VII)</Typography>
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          {Object.entries(data.by_pillar).map(([key, val]) => {
            const meta = PILLAR_META[key] || PILLAR_META.uncategorised;
            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={key}>
                <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Box sx={{ color: meta.color }}>{meta.icon}</Box>
                    <Typography variant="subtitle2" fontWeight={600}>{meta.label}</Typography>
                  </Box>
                  <Typography variant="h6" fontWeight={700} color={meta.color}>₹{val.spend.toFixed(2)} Cr</Typography>
                  <LinearProgress variant="determinate" value={(val.spend / maxPillarSpend) * 100} sx={{ mt: 1, height: 6, borderRadius: 3, '& .MuiLinearProgress-bar': { bgcolor: meta.color } }} />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    {val.count} project(s) · {val.beneficiaries.toLocaleString('en-IN')} beneficiaries
                  </Typography>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Paper>

      {/* Records table */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>CSR Activity Records</Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell>Company</TableCell>
                <TableCell>Pillar</TableCell>
                <TableCell>Activity</TableCell>
                <TableCell align="right">Actual (Cr)</TableCell>
                <TableCell align="right">Mandated (Cr)</TableCell>
                <TableCell>SDG</TableCell>
                <TableCell>Location</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.records.slice(0, 20).map((r) => {
                const meta = PILLAR_META[r.pillar] || PILLAR_META.uncategorised;
                return (
                  <TableRow key={r.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{r.company_name}</TableCell>
                    <TableCell><Chip label={meta.label} size="small" sx={{ fontSize: '0.65rem', bgcolor: meta.color, color: 'white' }} /></TableCell>
                    <TableCell sx={{ maxWidth: 250 }}>{r.description}</TableCell>
                    <TableCell align="right">{r.actual_spend_cr || r.amount_spend}</TableCell>
                    <TableCell align="right">{r.mandated_spend_cr || '—'}</TableCell>
                    <TableCell>{(r.sdg_goals || []).map(g => `SDG${g}`).join(', ') || '—'}</TableCell>
                    <TableCell>{r.location_benefited || '—'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
