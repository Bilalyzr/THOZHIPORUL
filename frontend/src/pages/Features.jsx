import React from 'react';
import {
  Box, Container, Typography, Grid, Paper, Chip, Card, CardContent, List, ListItem,
  ListItemIcon, ListItemText, Button, Fade
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { keyframes } from '@emotion/react';
import BarChartIcon from '@mui/icons-material/BarChart';
import SecurityIcon from '@mui/icons-material/Security';
import AssessmentIcon from '@mui/icons-material/Assessment';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import MapIcon from '@mui/icons-material/Map';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DescriptionIcon from '@mui/icons-material/Description';
import SettingsApplicationsIcon from '@mui/icons-material/SettingsApplications';
import SupportIcon from '@mui/icons-material/Support';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import MemoryIcon from '@mui/icons-material/Memory';
import ScheduleIcon from '@mui/icons-material/Schedule';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import BoltIcon from '@mui/icons-material/Bolt';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import UnifiedNav from '../components/UnifiedNav';
import UnifiedFooter from '../components/UnifiedFooter';
import PageHero from '../components/PageHero';

const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
`;

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
`;

const sectionPattern = {
  backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.04) 1px, transparent 0)',
  backgroundSize: '28px 28px',
};

const features = [
  {
    icon: <VerifiedUserIcon sx={{ fontSize: 40 }} />,
    title: 'Data Filing & Validation',
    desc: 'Eight data domains, server-side validation with field-level errors, and append-only versioned history that never loses data.',
    color: '#1F4E79',
    details: [
      'Investment, employment, water, power, turnover, CSR, production, operational status',
      'Server-side validation: types, ranges, cross-field rules — rejects invalid data with actionable errors',
      'Versioned submissions: every revision preserved with diffs, change reasons, and actor',
      'Bulk CSV upload, scoped API push (ERP), and document attachments per filing',
      'Production line items with quantities, units, and values',
    ],
  },
  {
    icon: <ScheduleIcon sx={{ fontSize: 40 }} />,
    title: 'Reporting Calendar & Compliance',
    desc: 'Admin-configurable reporting calendar with period-based missing-filer detection, 5-stage escalating reminders, and daily compliance scoring.',
    color: '#2E7D32',
    details: [
      'Quarterly deadlines with grace periods — configurable by administrators',
      'Period-based filing matrix (NOT_DUE → SUBMITTED → LATE → OVERDUE → MISSING)',
      '5-stage reminder engine: upcoming → due → grace → overdue + govt notify → escalated',
      'Daily compliance scoring computed from real violations, findings, and filing timeliness',
      'Notices, certificates, and violation lifecycle with SLA escalation',
    ],
  },
  {
    icon: <AutoAwesomeIcon sx={{ fontSize: 40 }} />,
    title: 'Anomaly Detection & Data Quality',
    desc: 'Explainable statistical detection that flags unusual changes and provides the full evidence trail.',
    color: '#7B1FA2',
    details: [
      'Period-over-period change detection (e.g., employment 740 → 1,250 = +68.9% flagged)',
      'IQR fence outlier detection vs the industry\'s own history',
      'Version-change detection on amendments with before/after evidence',
      'Cross-metric corroboration: does the employment jump track investment and power?',
      'Every finding stored with severity, reason, evidence, and resolution workflow',
    ],
  },
  {
    icon: <TrendingUpIcon sx={{ fontSize: 40 }} />,
    title: 'Forecasting & Capacity Planning',
    desc: 'Quarterly forecasting with confidence bands and park-level capacity gap analysis for water and power infrastructure.',
    color: '#E65100',
    details: [
      'Holt-Winters ETS (seasonal), linear regression, and moving average models',
      'Q+1 to Q+4 horizons at industry, park, and state scope',
      'Explicit INSUFFICIENT_DATA when history is thin — never fabricates numbers',
      'Backtesting with MAPE quality metrics on every forecast',
      'Capacity vs projected demand: current, forecast, gap, and risk per park',
    ],
  },
  {
    icon: <MemoryIcon sx={{ fontSize: 40 }} />,
    title: 'Agentic AI Layer',
    desc: 'LangGraph.js orchestration with specialist agents that coordinate trusted services — never replacing them.',
    color: '#7B1FA2',
    details: [
      '11 specialist agents: capture, validation, consistency, anomaly, compliance, forecast, analytics, decision, notification, report, copilot',
      '16 registered tools with schema validation, RBAC, timeouts, and retry policies',
      '6 workflows: submission, missing-filer, investigation, forecast, copilot, reporting',
      'Human approval gates for consequential actions — agents cannot self-approve',
      'Natural-language query: "Which parks will exceed water allocation next quarter?"',
    ],
  },
  {
    icon: <SecurityIcon sx={{ fontSize: 40 }} />,
    title: 'Security, Audit & Sovereignty',
    desc: 'Government-grade security with hash-chained audit trails, encrypted 2FA, and zero data egress to third-party AI.',
    color: '#B71C1C',
    details: [
      'Role-based access (industry/govt/admin) with mandatory TOTP for admins (AES-GCM encrypted secrets)',
      'Hash-chained audit log with change payloads — every workflow reconstructable',
      'Scoped per-industry API keys (sha256 at rest) — no shared master key',
      'Self-hosted LLM runtime (Ollama/vLLM) — allottee data never leaves SIPCOT infrastructure',
      'Prompt-injection defense: untrusted documents/messages have zero authority',
    ],
  },
];

const extraModules = [
  { icon: <MapIcon sx={{ fontSize: 36 }} />, title: 'GIS Parks Explorer', desc: 'Interactive map with park markers, investment heatmaps, and plot-level drill-down with readiness scores.', color: '#2E7D32' },
  { icon: <DashboardIcon sx={{ fontSize: 36 }} />, title: 'Command Center', desc: 'Officer dashboard with real KPIs, quarterly demand trends, alerts, activity feed, and park rankings.', color: '#1F4E79' },
  { icon: <DescriptionIcon sx={{ fontSize: 36 }} />, title: 'Report Center', desc: '9 report types with real XLSX, PDF, CSV export, metadata, caveats, and scheduled auto-generation.', color: '#1F4E79' },
  { icon: <HistoryEduIcon sx={{ fontSize: 36 }} />, title: 'Version History Viewer', desc: 'Every filing revision with machine-readable diffs: field, old value, new value, change %, actor, timestamp.', color: '#2E7D32' },
  { icon: <BoltIcon sx={{ fontSize: 36 }} />, title: 'Power & Water Intelligence', desc: 'Quarterly park-level demand series derived from actual filings, with tariff implications and over-draw alerts.', color: '#E65100' },
  { icon: <AssessmentIcon sx={{ fontSize: 36 }} />, title: 'Compliance Monitoring', desc: 'Industry compliance scores with sub-breakdowns, violation tracking, and improvement plans.', color: '#7B1FA2' },
];

const platformStats = [
  { value: '11', label: 'Specialist AI Agents' },
  { value: '16', label: 'Registered Tools' },
  { value: '6', label: 'Agentic Workflows' },
  { value: '9', label: 'Report Types' },
  { value: '92', label: 'Database Tables' },
  { value: '61', label: 'Automated Tests' },
];

export default function Features() {
  const navigate = useNavigate();

  return (
    <Box sx={{ bgcolor: '#f8fafc' }}>
      <UnifiedNav transparent={false} />

      {/* ── Hero ── */}
      <PageHero
        icon={<SettingsApplicationsIcon />}
        label="Platform Features"
        title="Industrial Intelligence"
        titleHighlight="Capabilities"
        subtitle="Every feature is live, tested, and verified — from server-side validation to agentic AI workflows. No mockups, no roadmap items, no fabricated statistics."
        accentColor="#2E7D32"
        accentColor2="#1F4E79"
        bgImage="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=60&w=1600"
      />

      {/* ── Platform Stats Strip ── */}
      <Container maxWidth="lg" sx={{ mt: { xs: -4, md: -6 }, position: 'relative', zIndex: 2, pb: 4 }}>
        <Paper elevation={0} sx={{
          py: 3, px: 4, borderRadius: 4,
          bgcolor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.8)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
          display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 3,
        }}>
          {platformStats.map((stat, idx) => (
            <Box key={idx} sx={{ textAlign: 'center', minWidth: 90 }}>
              <Typography variant="h4" fontWeight={800} sx={{
                background: 'linear-gradient(135deg, #1F4E79, #2E7D32)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                {stat.value}
              </Typography>
              <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                {stat.label}
              </Typography>
            </Box>
          ))}
        </Paper>
      </Container>

      {/* ── Core Features ── */}
      <Box sx={{ bgcolor: '#ffffff', py: 12, ...sectionPattern }}>
        <Container maxWidth="xl">
          <Box sx={{ mb: 8, textAlign: 'center', animation: `${fadeInUp} 0.8s ease-out` }}>
            <Chip label="CORE CAPABILITIES" sx={{ mb: 3, background: 'linear-gradient(135deg, #1F4E79, #2E7D32)', color: 'white', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.15em', px: 2.5, py: 1, borderRadius: '50px' }} />
            <Typography variant="h3" fontWeight={900} sx={{ fontSize: { xs: '1.75rem', md: '2.5rem' }, mb: 2 }}>
              Six Pillars of the Platform
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 640, mx: 'auto', lineHeight: 1.7 }}>
              Each pillar is a working, tested capability — not a planned feature. All are verified by automated end-to-end tests.
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {features.map((feature, idx) => (
              <Grid key={idx} size={{ xs: 12, md: 6, lg: 4 }}>
                <Fade in timeout={400 + idx * 120} style={{ height: '100%' }}>
                  <Card elevation={0} sx={{
                    height: '100%', borderRadius: 4, display: 'flex', flexDirection: 'column',
                    bgcolor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(16px)',
                    border: '1px solid #e2e8f0', borderTop: `4px solid ${feature.color}`,
                    boxShadow: '0 4px 24px rgba(0,0,0,0.05)',
                    animation: `${fadeInUp} 0.6s ease-out ${idx * 0.12}s both`,
                    '&:hover': { transform: 'translateY(-10px)', boxShadow: `0 28px 56px ${feature.color}18`, borderColor: `${feature.color}40` },
                    transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
                    overflow: 'visible',
                  }}>
                    <Box sx={{ p: 3, pb: 2 }}>
                      <Box sx={{
                        width: 56, height: 56, mb: 2, borderRadius: 3,
                        background: `linear-gradient(135deg, ${feature.color}18, ${feature.color}08)`,
                        color: feature.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        '&:hover': { transform: 'scale(1.1) rotate(5deg)' }, transition: 'all 0.3s ease',
                      }}>
                        {feature.icon}
                      </Box>
                      <Typography variant="h6" fontWeight={800} sx={{ mb: 1, fontSize: '1.1rem', color: feature.color }}>
                        {feature.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.7 }}>
                        {feature.desc}
                      </Typography>
                    </Box>
                    <CardContent sx={{ pt: 0, pb: 3, px: 3, flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <List dense disablePadding sx={{ flex: 1 }}>
                        {feature.details.map((detail, i) => (
                          <ListItem key={i} disableGutters sx={{ py: 0.6 }}>
                            <ListItemIcon sx={{ minWidth: 26 }}>
                              <Box sx={{ width: 18, height: 18, borderRadius: '50%', background: `${feature.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <CheckCircleIcon sx={{ fontSize: 11, color: feature.color }} />
                              </Box>
                            </ListItemIcon>
                            <ListItemText primary={detail} primaryTypographyProps={{ variant: 'caption', fontWeight: 500, color: 'text.primary', sx: { lineHeight: 1.4 } }} />
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                  </Card>
                </Fade>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── Specialized Modules ── */}
      <Box sx={{ bgcolor: '#f1f5f9', py: 12, position: 'relative', overflow: 'hidden' }}>
        <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ mb: 8, textAlign: 'center' }}>
            <Chip label="SPECIALIZED MODULES" sx={{ mb: 3, background: 'linear-gradient(135deg, #1F4E79, #2E7D32)', color: 'white', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.15em', px: 2.5, py: 1, borderRadius: '50px' }} />
            <Typography variant="h4" fontWeight={800} sx={{ mb: 2 }}>
              Purpose-Built Tools
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
              Focused modules that extend the platform for specific user needs
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {extraModules.map((mod, idx) => (
              <Grid key={idx} size={{ xs: 12, sm: 6, md: 4 }}>
                <Fade in timeout={500 + idx * 100}>
                  <Card elevation={0} sx={{
                    height: '100%', borderRadius: 4,
                    bgcolor: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.9)', borderTop: `4px solid ${mod.color}`,
                    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                    animation: `${fadeInUp} 0.5s ease-out ${idx * 0.1}s both`,
                    '&:hover': { transform: 'translateY(-8px)', boxShadow: `0 24px 48px ${mod.color}18` },
                    transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
                  }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{
                        color: mod.color, mb: 2, width: 52, height: 52, borderRadius: 3,
                        background: `linear-gradient(135deg, ${mod.color}18, ${mod.color}08)`,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        '&:hover': { transform: 'scale(1.1) rotate(5deg)' }, transition: 'all 0.3s ease',
                      }}>
                        {mod.icon}
                      </Box>
                      <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1, color: mod.color }}>
                        {mod.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                        {mod.desc}
                      </Typography>
                    </CardContent>
                  </Card>
                </Fade>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── CTA Band ── */}
      <Box sx={{
        py: 14,
        background: 'linear-gradient(135deg, #060d1a 0%, #0d2435 40%, #0a1e14 100%)',
        color: 'white', textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
          <RocketLaunchIcon sx={{ fontSize: 60, mb: 3, opacity: 0.9, animation: `${float} 4s ease-in-out infinite` }} />
          <Typography variant="h3" fontWeight={900} sx={{ mb: 3, fontSize: { xs: '1.6rem', md: '2.5rem' } }}>
            See It Working With Real Data
          </Typography>
          <Typography variant="h6" sx={{ mb: 6, opacity: 0.8, fontWeight: 300, lineHeight: 1.7 }}>
            Hyundai, Foxconn, Tata Electronics, Renault Nissan and 7 other major industries are already
            filing quarterly data through THOZHIRPORUL. See the dashboards, forecasts, and anomaly detection in action.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button variant="contained" size="large" onClick={() => navigate('/pricing')} endIcon={<ArrowForwardIcon />}
              sx={{ px: 5, py: 2, fontWeight: 700, bgcolor: 'white', color: '#0d2435', borderRadius: 3, '&:hover': { bgcolor: '#f1f8f2', transform: 'translateY(-4px)' } }}>
              View Pricing
            </Button>
            <Button variant="outlined" size="large" onClick={() => navigate('/about')} endIcon={<ArrowForwardIcon />}
              sx={{ px: 5, py: 2, fontWeight: 700, color: 'white', borderColor: 'rgba(255,255,255,0.3)', borderRadius: 3, '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.05)' } }}>
              About the Platform
            </Button>
          </Box>
        </Container>
      </Box>

      <UnifiedFooter />
    </Box>
  );
}
