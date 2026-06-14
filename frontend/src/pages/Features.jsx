import React from 'react';
import {
  Box, Container, Typography, Grid, Paper, Chip, Card, CardContent, List, ListItem, ListItemIcon, ListItemText
} from '@mui/material';
import { keyframes } from '@emotion/react';
import BarChartIcon from '@mui/icons-material/BarChart';
import SecurityIcon from '@mui/icons-material/Security';
import AssessmentIcon from '@mui/icons-material/Assessment';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import MapIcon from '@mui/icons-material/Map';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DescriptionIcon from '@mui/icons-material/Description';
import UnifiedNav from '../components/UnifiedNav';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
`;

const features = [
  {
    icon: <BarChartIcon sx={{ fontSize: 48 }} />,
    title: 'Real-time Industrial Surveillance',
    desc: 'Monitor every industrial unit across Tamil Nadu with live data feeds and automated alerting systems.',
    color: '#1F4E79',
    details: ['Live KPI dashboards for state-wide monitoring', 'Resource consumption tracking (water, power, waste)', 'Automated anomaly detection with severity alerts', 'District-level investment heatmaps'],
  },
  {
    icon: <SecurityIcon sx={{ fontSize: 48 }} />,
    title: 'Compliance Governance Engine',
    desc: 'Automated compliance tracking with violation flagging, deadline monitoring, and enforcement workflows.',
    color: '#2E7D32',
    details: ['Quarterly and annual submission tracking', 'Auto-flagging missed deadlines and violations', 'Compliance health scores for every industry (0-100)', 'Bulk reminder dispatch to non-compliant units'],
  },
  {
    icon: <AssessmentIcon sx={{ fontSize: 48 }} />,
    title: 'Data-Driven Analytics & Predictions',
    desc: 'Transform raw industrial data into actionable intelligence with trend analysis and growth forecasting.',
    color: '#F57C00',
    details: ['5-year investment and employment trend charts', 'Predictive growth modeling for key metrics', 'Park performance ranking and comparison', 'Exportable reports in PDF, Excel, and CSV formats'],
  },
  {
    icon: <VerifiedUserIcon sx={{ fontSize: 48 }} />,
    title: 'Digital Verification & Document Vault',
    desc: 'Secure document management with expiry tracking, verification workflows, and audit-grade storage.',
    color: '#7B1FA2',
    details: ['GST, NOC, and lease document upload & verification', 'Automatic expiry alerts for certificates', 'Officer-verified document status tracking', 'Complete audit trail for all document actions'],
  },
];

const extraModules = [
  { icon: <MapIcon />, title: 'GIS Parks Explorer', desc: 'Interactive map with real OpenStreetMap tiles, clickable park markers, plot availability overlays, and infrastructure heatmaps.', color: '#00838F' },
  { icon: <DashboardIcon />, title: 'Command Center', desc: 'CEO-style dashboard for government officers with 5 KPI cards, district heatmaps, park rankings, and real-time alert feeds.', color: '#1F4E79' },
  { icon: <DescriptionIcon />, title: 'Report Export Center', desc: 'Self-service report builder with filter-based querying, branded PDF templates, Excel export, and saved configurations.', color: '#455A64' },
];

export default function Features() {
  return (
    <Box sx={{ bgcolor: '#f8fafc' }}>
      <UnifiedNav transparent={false} />
      {/* Hero */}
      <Box sx={{
        pt: { xs: 16, md: 22 }, pb: { xs: 10, md: 14 }, textAlign: 'center', overflow: 'hidden',
        background: `linear-gradient(135deg, rgba(15,23,42,0.92) 0%, rgba(31,78,121,0.85) 60%, rgba(46,125,50,0.8) 100%),
          url("https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=2000")`,
        backgroundSize: 'cover', backgroundPosition: 'center', color: 'white',
      }}>
        <Container maxWidth="md">
          <Chip label="THOZHIRPORUL CAPABILITIES" sx={{ mb: 3, bgcolor: 'rgba(255,255,255,0.12)', color: 'white', fontWeight: 800, letterSpacing: '0.15em', py: 2.5, border: '1px solid rgba(255,255,255,0.2)' }} />
          <Typography variant="h2" fontWeight={900} sx={{ mb: 3, letterSpacing: '-0.03em', animation: `${fadeIn} 0.8s ease-out`, fontSize: { xs: '2.2rem', md: '3.5rem' } }}>
            Platform Features & Modules
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 300, opacity: 0.85, lineHeight: 1.8, maxWidth: 650, mx: 'auto' }}>
            Every feature in THOZHIRPORUL is designed to solve a specific pain point in industrial governance - from data collection to executive decision-making.
          </Typography>
        </Container>
      </Box>

      {/* Main Features */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 14 } }}>
        <Grid container spacing={5}>
          {features.map((feature, idx) => (
            <Grid key={idx} size={{ xs: 12, md: 6 }}>
              <Card elevation={0} sx={{
                height: '100%', p: 0, overflow: 'hidden',
                transition: 'all 0.3s ease',
                '&:hover': { transform: 'translateY(-6px)', boxShadow: '0 16px 40px rgba(0,0,0,0.08)' },
              }}>
                <Box sx={{ bgcolor: `${feature.color}08`, p: 4, pb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                    <Box sx={{
                      width: 72, height: 72, borderRadius: 4, flexShrink: 0,
                      bgcolor: `${feature.color}12`, color: feature.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {feature.icon}
                    </Box>
                    <Box>
                      <Typography variant="h5" fontWeight={800} sx={{ mb: 0.5 }}>{feature.title}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>{feature.desc}</Typography>
                    </Box>
                  </Box>
                </Box>
                <CardContent sx={{ pt: 1, pb: 3 }}>
                  <List dense disablePadding>
                    {feature.details.map((detail, i) => (
                      <ListItem key={i} disableGutters sx={{ py: 0.4 }}>
                        <ListItemIcon sx={{ minWidth: 28 }}>
                          <CheckCircleIcon sx={{ fontSize: 16, color: feature.color }} />
                        </ListItemIcon>
                        <ListItemText primary={detail} primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }} />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Extra Modules */}
      <Box sx={{ bgcolor: 'white', py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Box textAlign="center" sx={{ mb: 8 }}>
            <Typography variant="h3" fontWeight={900} sx={{ mb: 2 }}>
              Specialized{' '}
              <Box component="span" sx={{ color: 'secondary.main' }}>Modules</Box>
            </Typography>
            <Typography variant="h6" color="text.secondary" fontWeight={400}>Purpose-built tools that extend the THOZHIRPORUL platform</Typography>
          </Box>
          <Grid container spacing={4}>
            {extraModules.map((mod, idx) => (
              <Grid key={idx} size={{ xs: 12, md: 4 }}>
                <Paper sx={{
                  p: 4, height: '100%', borderRadius: 4, textAlign: 'center',
                  borderTop: `4px solid ${mod.color}`,
                  transition: 'all 0.3s ease', '&:hover': { transform: 'translateY(-6px)', boxShadow: '0 12px 32px rgba(0,0,0,0.06)' },
                }}>
                  <Box sx={{ color: mod.color, mb: 2 }}>{React.cloneElement(mod.icon, { sx: { fontSize: 44 } })}</Box>
                  <Typography variant="h6" fontWeight={800} gutterBottom>{mod.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>{mod.desc}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Trust Quote */}
      <Box sx={{ py: 10, background: 'linear-gradient(135deg, #0f172a, #1F4E79)' }}>
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Typography variant="h4" color="white" fontWeight={300} sx={{ fontStyle: 'italic', lineHeight: 1.8, mb: 4 }}>
            "THOZHIRPORUL represents the future of industrial governance - transparent, data-driven, and accessible to every stakeholder in the ecosystem."
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
            - Department of Industrial Policy & Promotion, Government of Tamil Nadu
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
