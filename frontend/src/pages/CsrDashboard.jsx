import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, Chip, LinearProgress,
  CircularProgress, Alert, Divider, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Tooltip
} from '@mui/material';
import {
  EmojiEvents, Park as Eco, School, HealthAndSafety, Diversity3, Palette,
  VolunteerActivism, TrendingUp, CheckCircle, InfoOutlined
} from '@mui/icons-material';
import { researchService } from '../services/api';

const PILLAR_META = {
  health_sanitation: { label: 'Healthcare & Sanitation', icon: <HealthAndSafety />, color: '#E53935', bg: '#FFEBEE' },
  education_skills: { label: 'Education & Skills', icon: <School />, color: '#1F4E79', bg: '#E3F2FD' },
  environment: { label: 'Environment', icon: <Eco />, color: '#2E7D32', bg: '#E8F5E9' },
  women_welfare: { label: 'Women Welfare', icon: <Diversity3 />, color: '#8E24AA', bg: '#F3E5F5' },
  heritage_culture: { label: 'Heritage & Culture', icon: <Palette />, color: '#F57C00', bg: '#FFF3E0' },
  uncategorised: { label: 'Uncategorised', icon: <EmojiEvents />, color: '#607D8B', bg: '#ECEFF1' }
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
  if (!data || !data.by_pillar || !data.sdg_coverage || data.total_records === 0) {
    return (
      <Box>
        <Typography variant="h4" fontWeight="bold" color="primary.main" gutterBottom sx={{ fontSize: { xs: '1.4rem', sm: '1.75rem', md: '2.125rem' } }}>
          CSR Dashboard
        </Typography>
        <Alert severity="info" icon={<InfoOutlined />}>No CSR activities reported yet. Once industries file CSR data via the submission portal, the 5-pillar breakdown, mandate compliance, and SDG coverage will appear here.</Alert>
      </Box>
    );
  }

  const mandatePct = data.mandate_compliance_pct || 0;
  const mandateColor = mandatePct >= 100 ? '#2E7D32' : mandatePct >= 70 ? '#F57C00' : '#d32f2f';
  const maxPillarSpend = Math.max(...Object.values(data.by_pillar).map(p => p.spend), 1);

  // KPI card definitions
  const kpiCards = [
    {
      label: 'Total Actual Spend', value: `₹${data.total_actual_spend_cr} Cr`,
      icon: <VolunteerActivism />, color: '#2E7D32', bg: '#E8F5E9',
      sub: `${data.total_records || 0} projects reported`
    },
    {
      label: 'Mandated (2% PAT)', value: `₹${data.total_mandated_spend_cr} Cr`,
      icon: <TrendingUp />, color: '#1F4E79', bg: '#E3F2FD',
      sub: 'Section 135, Companies Act'
    },
    {
      label: 'Mandate Compliance', value: `${mandatePct}%`,
      icon: <CheckCircle />, color: mandateColor, bg: mandateColor + '12',
      sub: mandatePct >= 100 ? 'Target met ✅' : `${100 - mandatePct}% short of target`,
      progress: Math.min(mandatePct, 100)
    },
    {
      label: 'SDG Goals Covered', value: `${data.sdg_coverage.length}/17`,
      icon: <EmojiEvents />, color: '#8E24AA', bg: '#F3E5F5',
      sub: `${data.sdg_coverage.length} UN Sustainable Development Goals`
    },
  ];

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      {/* ── Header ── */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Box sx={{ width: 42, height: 42, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #2E7D32, #1B5E20)', color: '#fff', boxShadow: '0 4px 12px rgba(46,125,50,0.3)' }}>
            <VolunteerActivism sx={{ fontSize: 22 }} />
          </Box>
          <Typography variant="h4" fontWeight={800} color="primary.main" sx={{ fontSize: { xs: '1.4rem', sm: '1.75rem', md: '2.125rem' }, fontFamily: '"Outfit",sans-serif' }}>
            CSR Dashboard
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ ml: 6.5 }}>
          Section 135 / Schedule VII mandate — companies must spend 2% of average net profit (PAT) on eligible CSR activities.
        </Typography>
      </Box>

      {/* ── KPI Cards ── */}
      <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: 3 }}>
        {kpiCards.map((kpi, i) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
            <Card sx={{
              borderRadius: 3, overflow: 'hidden',
              boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
              border: '1px solid #f1f5f9',
              transition: 'all 0.3s ease',
              '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 28px rgba(0,0,0,0.08)' },
            }}>
              <Box sx={{ height: 3, background: `linear-gradient(90deg, ${kpi.color}, ${kpi.color}80)` }} />
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                  <Box sx={{
                    width: 38, height: 38, borderRadius: '10px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    bgcolor: kpi.bg, color: kpi.color,
                  }}>
                    {kpi.icon}
                  </Box>
                  <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right', maxWidth: 100, lineHeight: 1.3 }}>
                    {kpi.label}
                  </Typography>
                </Box>
                <Typography variant="h5" fontWeight={800} sx={{ color: kpi.color, mb: 0.5, fontFamily: '"Outfit",sans-serif' }}>
                  {kpi.value}
                </Typography>
                {kpi.progress != null && (
                  <LinearProgress variant="determinate" value={kpi.progress}
                    sx={{ mt: 0.5, mb: 0.5, height: 5, borderRadius: 3, bgcolor: '#f1f5f9',
                      '& .MuiLinearProgress-bar': { bgcolor: kpi.color, borderRadius: 3 } }} />
                )}
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                  {kpi.sub}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ── Spend by Pillar ── */}
      <Paper elevation={0} sx={{
        p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 3,
        border: '1px solid #e2e8f0',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
          <Typography variant="h6" fontWeight={800} sx={{ fontFamily: '"Outfit",sans-serif', color: '#0f172a' }}>
            Spend by CSR Pillar
          </Typography>
          <Chip label="Schedule VII" size="small" sx={{ fontSize: '0.65rem', fontWeight: 600, bgcolor: '#f1f5f9', color: '#64748b' }} />
        </Box>
        <Divider sx={{ mb: 2.5, borderColor: '#f1f5f9' }} />
        <Grid container spacing={{ xs: 2, md: 2.5 }}>
          {Object.entries(data.by_pillar).map(([key, val]) => {
            const meta = PILLAR_META[key] || PILLAR_META.uncategorised;
            const pct = (val.spend / maxPillarSpend) * 100;
            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={key}>
                <Box sx={{
                  p: 2.5, borderRadius: 3,
                  bgcolor: meta.bg + '40',
                  border: `1px solid ${meta.color}25`,
                  transition: 'all 0.3s ease',
                  '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 8px 20px ${meta.color}20`, borderColor: meta.color + '50' },
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <Box sx={{
                      width: 36, height: 36, borderRadius: '10px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      bgcolor: meta.color, color: '#fff', fontSize: 18,
                    }}>
                      {meta.icon}
                    </Box>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#1e293b', fontSize: '0.85rem' }}>
                      {meta.label}
                    </Typography>
                  </Box>
                  <Typography variant="h6" fontWeight={800} sx={{ color: meta.color, mb: 1, fontFamily: '"Outfit",sans-serif' }}>
                    ₹{val.spend.toFixed(2)} Cr
                  </Typography>
                  <LinearProgress variant="determinate" value={pct}
                    sx={{ height: 6, borderRadius: 3, bgcolor: meta.color + '15',
                      '& .MuiLinearProgress-bar': { bgcolor: meta.color, borderRadius: 3 } }} />
                  <Box sx={{ display: 'flex', gap: 1.5, mt: 1 }}>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                      {val.count} project{val.count !== 1 ? 's' : ''}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                      · {val.beneficiaries.toLocaleString('en-IN')} beneficiaries
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Paper>

      {/* ── SDG Coverage chips ── */}
      {data.sdg_coverage.length > 0 && (
        <Paper elevation={0} sx={{
          p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 3,
          border: '1px solid #e2e8f0',
        }}>
          <Typography variant="subtitle1" fontWeight={800} gutterBottom sx={{ fontFamily: '"Outfit",sans-serif', color: '#0f172a', mb: 2 }}>
            UN SDG Coverage
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {data.sdg_coverage.map(g => (
              <Tooltip key={g} title={SDG_LABELS[g] || `SDG ${g}`}>
                <Chip
                  label={`🎯 SDG ${g}`}
                  size="small"
                  sx={{
                    fontSize: '0.72rem', fontWeight: 700, height: 28,
                    bgcolor: '#1F4E79', color: '#fff', borderRadius: '8px',
                    cursor: 'default',
                    '&:hover': { bgcolor: '#2c5f8a' },
                  }}
                />
              </Tooltip>
            ))}
          </Box>
        </Paper>
      )}

      {/* ── Activity Records Table ── */}
      <Paper elevation={0} sx={{
        p: { xs: 2, sm: 3 }, borderRadius: 3,
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" fontWeight={800} sx={{ fontFamily: '"Outfit",sans-serif', color: '#0f172a' }}>
            CSR Activity Records
          </Typography>
          <Chip label={`${data.total_records || data.records.length} total`} size="small"
            sx={{ fontSize: '0.7rem', fontWeight: 600, bgcolor: '#f1f5f9', color: '#64748b' }} />
        </Box>
        <TableContainer sx={{ borderRadius: 2, border: '1px solid #f1f5f9' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                <TableCell sx={{ fontWeight: 800, color: '#1e293b', fontSize: '0.75rem' }}>Company</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#1e293b', fontSize: '0.75rem' }}>Pillar</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#1e293b', fontSize: '0.75rem' }}>Activity</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, color: '#1e293b', fontSize: '0.75rem' }}>Actual (Cr)</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, color: '#1e293b', fontSize: '0.75rem' }}>Mandated (Cr)</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#1e293b', fontSize: '0.75rem' }}>SDG</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#1e293b', fontSize: '0.75rem' }}>Location</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.records.slice(0, 20).map((r) => {
                const meta = PILLAR_META[r.pillar] || PILLAR_META.uncategorised;
                return (
                  <TableRow key={r.id} hover sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem', color: '#0f172a' }}>{r.company_name}</TableCell>
                    <TableCell>
                      <Chip label={meta.label} size="small"
                        sx={{ fontSize: '0.62rem', fontWeight: 600, height: 20, bgcolor: meta.color, color: 'white', borderRadius: '6px' }} />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 220, fontSize: '0.78rem', color: '#475569' }}>{r.description}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.8rem', color: '#2E7D32' }}>
                      ₹{r.actual_spend_cr || r.amount_spend || 0}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.8rem', color: '#64748b' }}>
                      {r.mandated_spend_cr || '—'}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.72rem' }}>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.3 }}>
                        {(r.sdg_goals || []).map(g => (
                          <Chip key={g} label={g} size="small"
                            sx={{ fontSize: '0.6rem', height: 18, minWidth: 18, bgcolor: '#E3F2FD', color: '#1F4E79', fontWeight: 700 }} />
                        ))}
                        {!r.sdg_goals?.length && '—'}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.78rem', color: '#64748b' }}>{r.location_benefited || '—'}</TableCell>
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
