import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Paper, Chip, Skeleton, ToggleButton, ToggleButtonGroup
} from '@mui/material';
import {
  CurrencyRupee, People, WaterDrop, Bolt, VolunteerActivism,
  Business, Assessment, Feedback, TrendingUp, Factory, Analytics
} from '@mui/icons-material';
import {
  BarChart, Bar, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart
} from 'recharts';
import api from '../services/api';

const COLORS = {
  primary: '#1F4E79', secondary: '#2E7D32', accent: '#F57C00',
  purple: '#7B1FA2', red: '#D32F2F', teal: '#00838F', blue: '#1565C0',
  palette: ['#1F4E79', '#2E7D32', '#F57C00', '#7B1FA2', '#D32F2F', '#00838F', '#1565C0', '#E65100', '#5E35B1', '#00695C']
};

const truncate = (str, len = 18) =>
  str ? String(str).slice(0, len) + (String(str).length > len ? '…' : '') : '';

function ChartCard({ title, icon, children, subtitle, height = 300 }) {
  return (
    <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', p: 3, height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Box sx={{ p: 0.8, borderRadius: 2, bgcolor: 'rgba(31,78,121,0.08)', color: 'primary.main', display: 'flex' }}>
          {icon}
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ fontSize: '1rem' }}>{title}</Typography>
          {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
        </Box>
      </Box>
      <Box sx={{ height }}>{children}</Box>
    </Paper>
  );
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trendMetric, setTrendMetric] = useState('investment_cr');

  useEffect(() => {
    let isMounted = true;
    api.get('/charts/all')
      .then(res => { if (isMounted) setData(res.data); })
      .catch(err => { if (isMounted) setError(err.response?.data?.error || 'Failed to load analytics'); })
      .finally(() => { if (isMounted) setLoading(false); });
    return () => { isMounted = false; };
  }, []);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" fontWeight={800} sx={{ mb: 3 }}>Industrial Analytics</Typography>
        <Grid container spacing={3}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
              <Skeleton variant="rounded" height={340} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>Industrial Analytics</Typography>
        <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', p: 5, textAlign: 'center' }}>
          <Typography color="error" fontWeight={600}>Could not load analytics data</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{error}</Typography>
        </Paper>
      </Box>
    );
  }

  const {
    investment = [], employment = [], water = [], power = [], csr = [],
    parks = [], compliance = [], grievances = [], turnover = [],
    trend = [], production = []
  } = data;

  const trendKeyLabel = {
    investment_cr: 'Investment (Cr)',
    employees: 'Employees',
    water_kl: 'Water (KL)',
    power_kwh: 'Power (kWh)',
    csr_lakhs: 'CSR (Lakhs)'
  };

  const complianceColors = { Compliant: '#2E7D32', Warning: '#F57C00', Violation: '#D32F2F', 'Not Assessed': '#9E9E9E' };
  const grievanceColors = { Open: '#D32F2F', 'In Progress': '#F57C00', Resolved: '#2E7D32', Escalated: '#7B1FA2' };

  const tooltipStyle = { backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.8rem' };

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: 'rgba(31,78,121,0.08)', color: 'primary.main' }}>
            <Analytics sx={{ fontSize: 32 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800}>Industrial Analytics</Typography>
            <Typography variant="body2" color="text.secondary">
              {parks.length} parks · {investment.length} industries · {trend.length} quarters of live filing data
            </Typography>
          </Box>
        </Box>
        <Chip label="Live PostgreSQL data" size="small" variant="outlined" color="success" />
      </Box>

      {/* ── ROW 1: Investment + Employment ── */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard title="Investment by Industry" icon={<CurrencyRupee />} subtitle="Latest quarterly filing (₹ Crores)" height={320}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={investment} layout="vertical" margin={{ left: 20, right: 20, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={130} tickFormatter={(v) => truncate(v, 16)} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`₹${v} Cr`, 'Investment']} />
                <Bar dataKey="value_cr" fill={COLORS.primary} radius={[0, 6, 6, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard title="Employment by Industry" icon={<People />} subtitle="Permanent + contract workers, women representation" height={320}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={employment} margin={{ top: 5, right: 10, bottom: 45, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" height={60} interval={0} tickFormatter={(v) => truncate(v, 12)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                <Bar dataKey="permanent" stackId="emp" name="Permanent" fill={COLORS.primary} />
                <Bar dataKey="contract" stackId="emp" name="Contract" fill={COLORS.secondary} />
                <Bar dataKey="women" name="Women" fill={COLORS.accent} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
      </Grid>

      {/* ── ROW 2: Water + Power ── */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard title="Water Consumption vs Allocation" icon={<WaterDrop />} subtitle="KL per quarter" height={320}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={water} margin={{ top: 5, right: 10, bottom: 45, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" height={60} interval={0} tickFormatter={(v) => truncate(v, 12)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                <Bar dataKey="value_kl" name="Consumption (KL)" fill={COLORS.teal} radius={[4, 4, 0, 0]} barSize={20} />
                <Line type="monotone" dataKey="allocation" name="Allocation (KL)" stroke={COLORS.red} strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard title="Power Consumption vs Sanctioned Load" icon={<Bolt />} subtitle="kWh per quarter / kW sanction" height={320}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={power} margin={{ top: 5, right: 10, bottom: 45, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" height={60} interval={0} tickFormatter={(v) => truncate(v, 12)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                <Bar dataKey="value_kwh" name="Usage (kWh)" fill={COLORS.accent} radius={[4, 4, 0, 0]} barSize={20} />
                <Line type="monotone" dataKey="sanctioned_kw" name="Sanctioned (kW)" stroke={COLORS.red} strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
      </Grid>

      {/* ── ROW 3: CSR + Turnover ── */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard title="CSR Spending by Industry" icon={<VolunteerActivism />} subtitle="Latest quarter (₹ Lakhs)" height={320}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={csr} margin={{ top: 5, right: 10, bottom: 45, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" height={60} interval={0} tickFormatter={(v) => truncate(v, 12)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`₹${v} Lakhs`, 'CSR']} />
                <Bar dataKey="value_lakhs" name="CSR (Lakhs)" fill={COLORS.secondary} radius={[4, 4, 0, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard title="Turnover & Export Revenue" icon={<TrendingUp />} subtitle="Annual figures (₹ Crores)" height={320}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={turnover} margin={{ top: 5, right: 10, bottom: 45, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" height={60} interval={0} tickFormatter={(v) => truncate(v, 12)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                <Bar dataKey="value_cr" name="Total Turnover (Cr)" fill={COLORS.blue} radius={[4, 4, 0, 0]} barSize={18} />
                <Bar dataKey="export_cr" name="Export (Cr)" fill={COLORS.secondary} radius={[4, 4, 0, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
      </Grid>

      {/* ── ROW 4: Quarterly Trend (multi-metric selector) ── */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12 }}>
          <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 0.8, borderRadius: 2, bgcolor: 'rgba(31,78,121,0.08)', color: 'primary.main', display: 'flex' }}>
                  <Assessment />
                </Box>
                <Typography variant="subtitle1" fontWeight={700}>Quarterly Trend — {trendKeyLabel[trendMetric]}</Typography>
              </Box>
              <ToggleButtonGroup
                size="small" exclusive value={trendMetric} onChange={(e, v) => v && setTrendMetric(v)}
                aria-label="trend metric"
              >
                <ToggleButton value="investment_cr" sx={{ fontSize: '0.7rem', px: 1.5 }}>Investment</ToggleButton>
                <ToggleButton value="employees" sx={{ fontSize: '0.7rem', px: 1.5 }}>Employment</ToggleButton>
                <ToggleButton value="water_kl" sx={{ fontSize: '0.7rem', px: 1.5 }}>Water</ToggleButton>
                <ToggleButton value="power_kwh" sx={{ fontSize: '0.7rem', px: 1.5 }}>Power</ToggleButton>
                <ToggleButton value="csr_lakhs" sx={{ fontSize: '0.7rem', px: 1.5 }}>CSR</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={trend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone" dataKey={trendMetric}
                  name={trendKeyLabel[trendMetric]}
                  stroke={COLORS.primary} strokeWidth={2.5}
                  fill="url(#trendGrad)"
                  dot={{ r: 4, fill: COLORS.primary }}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* ── ROW 5: Park-Level Comparison ── */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12 }}>
          <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
              <Box sx={{ p: 0.8, borderRadius: 2, bgcolor: 'rgba(46,125,50,0.08)', color: 'secondary.main', display: 'flex' }}>
                <Business />
              </Box>
              <Typography variant="subtitle1" fontWeight={700}>Park-Level Comparison</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>Aggregated from latest filings</Typography>
            </Box>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={parks.filter(p => (p.investment_cr || 0) > 0)} margin={{ top: 5, right: 20, bottom: 50, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="park" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" height={55} interval={0}
                  tickFormatter={(v) => truncate(v, 14)} />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                <Bar yAxisId="left" dataKey="investment_cr" name="Investment (Cr)" fill={COLORS.primary} radius={[4, 4, 0, 0]} barSize={14} />
                <Bar yAxisId="left" dataKey="employees" name="Employees" fill={COLORS.secondary} radius={[4, 4, 0, 0]} barSize={14} />
                <Bar yAxisId="right" dataKey="water_kl" name="Water (KL)" fill={COLORS.teal} radius={[4, 4, 0, 0]} barSize={14} />
                <Bar yAxisId="right" dataKey="power_kwh" name="Power (kWh)" fill={COLORS.accent} radius={[4, 4, 0, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* ── ROW 6: Compliance + Grievances donuts + Production ── */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <ChartCard title="Compliance" icon={<Assessment />} subtitle="Score distribution" height={240}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={compliance} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  innerRadius={45} outerRadius={80} paddingAngle={3}>
                  {compliance.map((entry, i) => (
                    <Cell key={i} fill={complianceColors[entry.name] || COLORS.palette[i % COLORS.palette.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <ChartCard title="Grievances" icon={<Feedback />} subtitle="By status" height={240}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={grievances} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  innerRadius={45} outerRadius={80} paddingAngle={3}>
                  {grievances.map((entry, i) => (
                    <Cell key={i} fill={grievanceColors[entry.name] || COLORS.palette[i % COLORS.palette.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard title="Production Output" icon={<Factory />} subtitle="Top products by value (₹ Cr)" height={240}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={production} layout="vertical" margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="product_name" type="category" tick={{ fontSize: 9 }} width={120}
                  tickFormatter={(v) => truncate(v, 18)} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`₹${v} Cr`, 'Production Value']} />
                <Bar dataKey="value_cr" fill={COLORS.purple} radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
      </Grid>

      {/* Footer */}
      <Box sx={{ textAlign: 'center', py: 3 }}>
        <Typography variant="caption" color="text.disabled">
          Generated {new Date(data.generated_at).toLocaleString()} from live PostgreSQL —
          {' '}{trend.length} quarters · {investment.length} industries · {parks.length} parks
        </Typography>
      </Box>
    </Box>
  );
}
