import React from 'react';
import {
  Box, Container, Typography, Grid, Paper, Chip, Card, CardContent, List, ListItem,
  ListItemIcon, ListItemText, Stack, Fade
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
import SettingsApplicationsIcon from '@mui/icons-material/SettingsApplications';
import SupportIcon from '@mui/icons-material/Support';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
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
    icon: <BarChartIcon sx={{ fontSize: 40 }} />,
    title: 'Real-time Industrial Surveillance',
    desc: 'Monitor every industrial unit across Tamil Nadu with live data feeds and automated alerting systems.',
    color: '#1F4E79',
    details: ['Live KPI dashboards for state-wide monitoring', 'Resource consumption tracking (water, power, waste)', 'Automated anomaly detection with severity alerts', 'District-level investment heatmaps'],
  },
  {
    icon: <SecurityIcon sx={{ fontSize: 40 }} />,
    title: 'Compliance Governance Engine',
    desc: 'Automated compliance tracking with violation flagging, deadline monitoring, and enforcement workflows.',
    color: '#2E7D32',
    details: ['Quarterly and annual submission tracking', 'Auto-flagging missed deadlines and violations', 'Compliance health scores for every industry (0-100)', 'Bulk reminder dispatch to non-compliant units'],
  },
  {
    icon: <AssessmentIcon sx={{ fontSize: 40 }} />,
    title: 'Data-Driven Analytics & Predictions',
    desc: 'Transform raw industrial data into actionable intelligence with trend analysis and growth forecasting.',
    color: '#2E7D32',
    details: ['5-year investment and employment trend charts', 'Predictive growth modeling for key metrics', 'Park performance ranking and comparison', 'Exportable reports in PDF, Excel, and CSV formats'],
  },
  {
    icon: <VerifiedUserIcon sx={{ fontSize: 40 }} />,
    title: 'Digital Verification & Document Vault',
    desc: 'Secure document management with expiry tracking, verification workflows, and audit-grade storage.',
    color: '#1F4E79',
    details: ['GST, NOC, and lease document upload & verification', 'Automatic expiry alerts for certificates', 'Officer-verified document status tracking', 'Complete audit trail for all document actions'],
  },
];

const extraModules = [
  { icon: <MapIcon sx={{ fontSize: 40 }} />, title: 'GIS Parks Explorer', desc: 'Interactive map with real OpenStreetMap tiles, clickable park markers, and infrastructure heatmaps.', color: '#2E7D32' },
  { icon: <DashboardIcon sx={{ fontSize: 40 }} />, title: 'Command Center', desc: 'CEO-style dashboard for government officers with KPI cards and real-time alert feeds.', color: '#1F4E79' },
  { icon: <DescriptionIcon sx={{ fontSize: 40 }} />, title: 'Report Export Center', desc: 'Self-service report builder with filter-based querying and exportable formats.', color: '#1F4E79' },
];

export default function Features() {
  return (
    <Box sx={{ bgcolor: '#f8fafc' }}>
      <UnifiedNav transparent={false} />

      {/* ── Hero ── */}
      <PageHero
        icon={<SettingsApplicationsIcon />}
        label="Platform Features"
        title="Enterprise-Grade"
        titleHighlight="Capabilities"
        subtitle="Every feature in THOZHIRPORUL is designed to solve specific pain points in industrial governance — from data collection to executive decision-making."
        accentColor="#2E7D32"
        accentColor2="#1F4E79"
        bgImage="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=60&w=1600"
      />

      {/* ── Core Features ── */}
      <Box sx={{ bgcolor: '#ffffff', py: 14, ...sectionPattern }}>
        <Container maxWidth="xl">
          <Box sx={{ mb: 10, textAlign: 'center', animation: `${fadeInUp} 0.8s ease-out` }}>
            <Chip
              label="CORE FEATURES"
              sx={{ mb: 3, background: 'linear-gradient(135deg, #1F4E79, #2E7D32)', color: 'white', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.15em', px: 2.5, py: 1, borderRadius: '50px' }}
            />
            <Typography variant="h3" fontWeight={900} sx={{ fontSize: { xs: '1.75rem', md: '2.5rem' }, mb: 2, letterSpacing: '-0.02em' }}>
              Powerful Features for Industrial Governance
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 650, mx: 'auto', lineHeight: 1.7 }}>
              Enterprise-grade capabilities designed to streamline operations and ensure compliance
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {features.map((feature, idx) => (
              <Grid key={idx} size={{ xs: 12, md: 6 }}>
                <Fade in timeout={400 + idx * 150}>
                  <Card
                    elevation={0}
                    sx={{
                      height: '100%', borderRadius: 4,
                      bgcolor: 'rgba(255,255,255,0.9)',
                      backdropFilter: 'blur(16px)',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 24px rgba(0,0,0,0.05)',
                      transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
                      animation: `${fadeInUp} 0.6s ease-out ${idx * 0.15}s both`,
                      overflow: 'visible',
                      '&:hover': { transform: 'translateY(-12px)', boxShadow: `0 32px 64px ${feature.color}18`, borderColor: `${feature.color}40` },
                    }}
                  >
                    <Box sx={{ p: 4, pb: 3, borderBottom: `3px solid ${feature.color}` }}>
                      <Box sx={{ display: 'flex', gap: 3, mb: 2 }}>
                        <Box sx={{
                          width: 68, height: 68, flexShrink: 0, borderRadius: 3,
                          background: `linear-gradient(135deg, ${feature.color}18, ${feature.color}08)`,
                          color: feature.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: `0 4px 16px ${feature.color}20`,
                          transition: 'all 0.3s ease', '&:hover': { transform: 'scale(1.1) rotate(5deg)' }
                        }}>
                          {feature.icon}
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" fontWeight={800} sx={{ mb: 1, fontSize: '1.2rem' }}>{feature.title}</Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>{feature.desc}</Typography>
                        </Box>
                      </Box>
                    </Box>
                    <CardContent sx={{ pt: 3, pb: 4, px: 4 }}>
                      <List dense disablePadding>
                        {feature.details.map((detail, i) => (
                          <ListItem key={i} disableGutters sx={{ py: 1 }}>
                            <ListItemIcon sx={{ minWidth: 28 }}>
                              <Box sx={{ width: 20, height: 20, borderRadius: '50%', background: `${feature.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <CheckCircleIcon sx={{ fontSize: 12, color: feature.color }} />
                              </Box>
                            </ListItemIcon>
                            <ListItemText primary={detail} primaryTypographyProps={{ variant: 'body2', fontWeight: 600, color: 'text.primary' }} />
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
      <Box sx={{ bgcolor: '#f1f5f9', py: 14, position: 'relative', overflow: 'hidden' }}>
        <Box sx={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(31,78,121,0.07) 0%, transparent 55%), radial-gradient(ellipse at 80% 50%, rgba(46,125,50,0.07) 0%, transparent 55%)',
          pointerEvents: 'none',
        }} />

        <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ mb: 10, textAlign: 'center', animation: `${fadeInUp} 0.8s ease-out` }}>
            <Chip
              label="SPECIALIZED MODULES"
              sx={{ mb: 3, background: 'linear-gradient(135deg, #1F4E79, #2E7D32)', color: 'white', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.15em', px: 2.5, py: 1, borderRadius: '50px' }}
            />
            <Typography variant="h3" fontWeight={900} sx={{ fontSize: { xs: '1.75rem', md: '2.5rem' }, mb: 2, letterSpacing: '-0.02em' }}>
              Purpose-Built Tools
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto', lineHeight: 1.7 }}>
              Specialized modules that extend the THOZHIRPORUL platform capabilities
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {extraModules.map((mod, idx) => (
              <Grid key={idx} size={{ xs: 12, md: 4 }}>
                <Fade in timeout={500 + idx * 150}>
                  <Card
                    elevation={0}
                    sx={{
                      height: '100%', borderRadius: 4,
                      bgcolor: 'rgba(255,255,255,0.88)',
                      backdropFilter: 'blur(16px)',
                      border: '1px solid rgba(255,255,255,0.9)',
                      borderTop: `4px solid ${mod.color}`,
                      boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                      transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
                      animation: `${fadeInUp} 0.6s ease-out ${idx * 0.15}s both`,
                      '&:hover': { transform: 'translateY(-12px)', boxShadow: `0 28px 56px ${mod.color}20` },
                    }}
                  >
                    <CardContent sx={{ p: 4 }}>
                      <Box sx={{
                        color: mod.color, mb: 3, width: 68, height: 68, borderRadius: 3,
                        background: `linear-gradient(135deg, ${mod.color}18, ${mod.color}08)`,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: `0 4px 16px ${mod.color}20`,
                        transition: 'all 0.3s ease', '&:hover': { transform: 'scale(1.1) rotate(5deg)' }
                      }}>
                        {mod.icon}
                      </Box>
                      <Typography variant="h6" fontWeight={800} sx={{ mb: 2, fontSize: '1.2rem' }}>{mod.title}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.75 }}>{mod.desc}</Typography>
                    </CardContent>
                  </Card>
                </Fade>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── Quote CTA Band ── */}
      <Box sx={{
        py: 16,
        background: 'linear-gradient(135deg, #060d1a 0%, #0d2435 40%, #0a1e14 100%)',
        color: 'white', textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        <Box sx={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 30% 70%, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '40px 40px', opacity: 0.6, pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', top: '20%', right: '8%', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(31,78,121,0.35) 0%, transparent 65%)', filter: 'blur(60px)', pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', bottom: '15%', left: '5%', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(46,125,50,0.3) 0%, transparent 65%)', filter: 'blur(55px)', pointerEvents: 'none' }} />

        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
          <SupportIcon sx={{ fontSize: 64, mb: 3, opacity: 0.9, animation: `${float} 4s ease-in-out infinite` }} />
          <Typography variant="h4" fontWeight={300} sx={{ fontStyle: 'italic', lineHeight: 1.8, mb: 4, fontSize: { xs: '1.25rem', md: '1.65rem' } }}>
            "THOZHIRPORUL represents the future of industrial governance — transparent, data-driven, and accessible to every stakeholder."
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '0.85rem', opacity: 0.75 }}>
            — Department of Industrial Policy & Promotion, Government of Tamil Nadu
          </Typography>
        </Container>
      </Box>

      <UnifiedFooter />
    </Box>
  );
}
