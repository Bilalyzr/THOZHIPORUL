import React from 'react';
import {
  Box, Container, Typography, Grid, Paper, Button, Chip, Card, CardContent, Fade
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { keyframes } from '@emotion/react';
import SecurityIcon from '@mui/icons-material/Security';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import BusinessIcon from '@mui/icons-material/Business';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import GroupsIcon from '@mui/icons-material/Groups';
import EmojiObjectsIcon from '@mui/icons-material/EmojiObjects';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import MemoryIcon from '@mui/icons-material/Memory';
import VerifiedIcon from '@mui/icons-material/Verified';
import ScheduleIcon from '@mui/icons-material/Schedule';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import LanguageIcon from '@mui/icons-material/Language';
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

const slideInLeft = keyframes`
  from { opacity: 0; transform: translateX(-30px); }
  to { opacity: 1; transform: translateX(0); }
`;

const slideInRight = keyframes`
  from { opacity: 0; transform: translateX(30px); }
  to { opacity: 1; transform: translateX(0); }
`;

const sectionPattern = {
  backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.04) 1px, transparent 0)',
  backgroundSize: '28px 28px'
};

export default function About() {
  const navigate = useNavigate();

  return (
    <Box sx={{ bgcolor: '#f8fafc' }}>
      <UnifiedNav transparent={false} />

      {/* ── Hero ── */}
      <PageHero
        icon={<EmojiObjectsIcon />}
        label="About THOZHIRPORUL"
        title="Industrial Intelligence &"
        titleHighlight="Data Reliability"
        subtitle="A sovereign digital platform for SIPCOT that continuously collects, validates, monitors, and analyses changing industrial data — reducing manual follow-up and enabling timely planning decisions across Tamil Nadu."
        accentColor="#2E7D32"
        accentColor2="#1F4E79"
        bgImage="https://images.unsplash.com/photo-1606765962248-7ff407b51667?auto=format&fit=crop&q=60&w=1600"
      >
        <Button
          variant="contained" size="large"
          onClick={() => navigate('/role-selection')}
          endIcon={<ArrowForwardIcon />}
          sx={{
            px: 5, py: 2, fontWeight: 700,
            background: 'linear-gradient(135deg, #2E7D32, #1B5E20)',
            borderRadius: 3, fontSize: '1rem',
            boxShadow: '0 8px 24px rgba(46,125,50,0.45)',
            '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 16px 36px rgba(46,125,50,0.5)' }
}}
        >
          Access Platform
        </Button>
      </PageHero>

      {/* ── SIPCOT Stats (verified from TN Policy Note 2025-26) ── */}
      <Container maxWidth="xl" sx={{ mt: { xs: -6, md: -10 }, position: 'relative', zIndex: 2, pb: 8 }}>
        <Grid container spacing={3}>
          {[
            { icon: <BusinessIcon sx={{ fontSize: 36 }} />, value: '50+', label: 'Industrial Parks', color: '#1F4E79' },
            { icon: <AnalyticsIcon sx={{ fontSize: 36 }} />, value: '₹1.99 Lakh Cr', label: 'Investment Attracted', color: '#2E7D32' },
            { icon: <GroupsIcon sx={{ fontSize: 36 }} />, value: '8.79 Lakh', label: 'Jobs Generated', color: '#2E7D32' },
            { icon: <AutoAwesomeIcon sx={{ fontSize: 36 }} />, value: '3,390', label: 'Industrial Units', color: '#1F4E79' },
          ].map((stat, idx) => (
            <Grid key={idx} size={{ xs: 6, md: 3 }}>
              <Fade in timeout={300 + idx * 100}>
                <Paper elevation={0} sx={{
                  p: 3.5, borderRadius: 4,
                  bgcolor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.8)',
                  boxShadow: '0 8px 40px rgba(0,0,0,0.08)', textAlign: 'center',
                  animation: `${fadeInUp} 0.6s ease-out ${idx * 0.1}s both`,
                  '&:hover': { transform: 'translateY(-8px)', boxShadow: `0 24px 48px ${stat.color}18`, borderColor: `${stat.color}30` }
}}>
                  <Box sx={{ color: stat.color, mb: 1.5, display: 'inline-flex', p: 1.5, borderRadius: 2.5, bgcolor: `${stat.color}0d` }}>
                    {stat.icon}
                  </Box>
                  <Typography variant="h3" fontWeight={800} color={stat.color} sx={{ mb: 0.5, fontSize: '2rem' }}>
                    {stat.value}
                  </Typography>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {stat.label}
                  </Typography>
                </Paper>
              </Fade>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* ── Vision ── */}
      <Box sx={{ bgcolor: '#ffffff', py: 14, ...sectionPattern }}>
        <Container maxWidth="xl">
          <Grid container spacing={8} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ animation: `${slideInLeft} 0.8s ease-out` }}>
                <Chip label="OUR VISION" sx={{ mb: 3, background: 'linear-gradient(135deg, #1F4E79, #2E7D32)', color: 'white', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.15em', px: 2.5, py: 1, borderRadius: '50px' }} />
                <Typography variant="h3" fontWeight={900} sx={{ mb: 4, fontSize: { xs: '1.75rem', md: '2.5rem' }, lineHeight: 1.2 }}>
                  Not Just a Data-Entry App.{' '}
                  <Box component="span" sx={{ background: 'linear-gradient(90deg, #2E7D32, #1F4E79)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    An Intelligence Platform.
                  </Box>
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.8, fontSize: '1.05rem' }}>
                  SIPCOT needs a reliable mechanism to continuously collect, validate, monitor, and analyse
                  changing operational and economic data from 3,390+ industries across 50+ parks.
                  THOZHIRPORUL solves this with an end-to-end pipeline:
                </Typography>
                <Box component="ul" sx={{ mb: 4, pl: 3, '& li': { mb: 1.5, color: 'text.secondary', fontSize: '1rem', lineHeight: 1.6 } }}>
                  <li><strong>Collection</strong> — quarterly filings across 8 data domains, from web forms, CSV bulk upload, or API push</li>
                  <li><strong>Validation</strong> — server-side field-level checks, cross-metric consistency, unit canonicalisation</li>
                  <li><strong>Monitoring</strong> — period-based filing calendar with escalating automated reminders</li>
                  <li><strong>Intelligence</strong> — anomaly detection, quarterly forecasting, park capacity planning</li>
                  <li><strong>Decision Support</strong> — agentic AI workflows with human approval gates</li>
                </Box>
                <Button variant="outlined" size="large" onClick={() => navigate('/features')} endIcon={<ArrowForwardIcon />}
                  sx={{
                    px: 4, py: 1.5, fontWeight: 700, borderColor: '#1F4E79', color: '#1F4E79',
                    borderRadius: 3, borderWidth: 2,
                    '&:hover': { bgcolor: '#1F4E79', color: 'white', transform: 'translateX(4px)' }
}}>
                  Explore All Features
                </Button>
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ animation: `${slideInRight} 0.8s ease-out` }}>
                <Card elevation={0} sx={{
                  borderRadius: 5, overflow: 'hidden', border: '1px solid #e2e8f0',
                  boxShadow: '0 24px 64px rgba(0,0,0,0.08)',
                  '&:hover': { transform: 'translateY(-10px)', boxShadow: '0 40px 80px rgba(0,0,0,0.14)' },
                  transition: 'all 0.4s ease'
}}>
                  <Box sx={{ p: 4, bgcolor: 'linear-gradient(135deg, #0d2435 0%, #1a3a12 100%)', background: 'linear-gradient(135deg, #0d2435 0%, #143656 100%)', color: 'white' }}>
                    <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>
                      The Problem We Solve
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.85, lineHeight: 1.7 }}>
                      When an industry reports employment jumping from 740 to 1,250, the system should
                      detect that +68.9% change, check whether investment and power also increased,
                      flag it for review if they didn't, and give the officer the full evidence trail.
                    </Typography>
                  </Box>
                  <CardContent sx={{ p: 4, bgcolor: 'white' }}>
                    {[
                      { icon: <HistoryEduIcon sx={{ color: '#1F4E79', fontSize: 22 }} />, title: 'Versioned History', desc: 'Every revision preserved — nothing is ever silently overwritten' },
                      { icon: <VerifiedIcon sx={{ color: '#2E7D32', fontSize: 22 }} />, title: 'Explainable Anomalies', desc: 'Each finding includes the rule, old value, new value, and change %' },
                      { icon: <MemoryIcon sx={{ color: '#1F4E79', fontSize: 22 }} />, title: 'Agentic AI', desc: '11 specialist agents coordinate trusted capabilities — never replacing them' },
                    ].map((item, i) => (
                      <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: i < 2 ? 2.5 : 0 }}>
                        <Box sx={{ mt: 0.5 }}>{item.icon}</Box>
                        <Box>
                          <Typography variant="subtitle2" fontWeight={700}>{item.title}</Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>{item.desc}</Typography>
                        </Box>
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ── Five Pillars ── */}
      <Box sx={{ bgcolor: '#f1f5f9', py: 14, position: 'relative', overflow: 'hidden' }}>
        <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ mb: 8, textAlign: 'center', animation: `${fadeInUp} 0.8s ease-out` }}>
            <Chip label="PLATFORM CAPABILITIES" sx={{ mb: 3, background: 'linear-gradient(135deg, #2E7D32, #1F4E79)', color: 'white', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.15em', px: 2.5, py: 1, borderRadius: '50px' }} />
            <Typography variant="h3" fontWeight={900} sx={{ fontSize: { xs: '1.75rem', md: '2.5rem' }, mb: 2 }}>
              Five Pillars of Industrial Intelligence
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 640, mx: 'auto', lineHeight: 1.7 }}>
              Each pillar is a working capability — not a roadmap item. All are live, tested, and verified by 61 automated tests.
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {[
              {
                icon: <VerifiedIcon sx={{ fontSize: 40 }} />, title: 'Data Reliability',
                desc: 'Server-side validation with field-level errors, cross-metric consistency checks, unit canonicalisation (INR/KL/kWh), and versioned history that never loses data.',
                color: '#1F4E79', tags: ['Validation', 'Versioning', 'Anomaly Detection']
},
              {
                icon: <TrendingUpIcon sx={{ fontSize: 40 }} />, title: 'Industrial Intelligence',
                desc: 'Quarterly forecasting with Holt-Winters ETS and confidence bands, park-level demand analysis, capacity planning (water/power gap + risk), and growth analytics (QoQ/YoY).',
                color: '#2E7D32', tags: ['Forecasting', 'Capacity Planning', 'Growth Analytics']
},
              {
                icon: <MemoryIcon sx={{ fontSize: 40 }} />, title: 'Agentic AI',
                desc: 'LangGraph.js orchestration with 11 specialist agents, 16 registered tools, 6 workflows, and human approval gates. Agents coordinate trusted services — they never become the source of truth.',
                color: '#7B1FA2', tags: ['LangGraph', '11 Agents', 'Human Gates']
},
              {
                icon: <ScheduleIcon sx={{ fontSize: 40 }} />, title: 'Automation',
                desc: 'Admin-configurable reporting calendar with 5-stage escalating reminders, daily compliance scoring, anomaly batch detection, scheduled report generation, and notification digest batching.',
                color: '#E65100', tags: ['Calendar', 'Reminders', 'Escalation']
},
              {
                icon: <SecurityIcon sx={{ fontSize: 40 }} />, title: 'Security & Sovereignty',
                desc: 'Role-based access with encrypted TOTP 2FA, hash-chained audit trails with change payloads, self-hosted LLM runtime (Ollama/vLLM), and zero allottee data egress to third-party AI.',
                color: '#B71C1C', tags: ['RBAC + 2FA', 'Audit Chain', 'Zero Egress']
},
            ].map((feature, idx) => (
              <Grid key={idx} size={{ xs: 12, sm: 6, md: idx < 3 ? 4 : 6 }}>
                <Fade in timeout={400 + idx * 120}>
                  <Card elevation={0} sx={{
                    height: '100%', borderRadius: 4,
                    bgcolor: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.9)',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                    animation: `${fadeInUp} 0.6s ease-out ${idx * 0.12}s both`,
                    '&:hover': { transform: 'translateY(-10px)', boxShadow: `0 28px 56px ${feature.color}18`, borderColor: `${feature.color}30` },
                    transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)'
}}>
                    <CardContent sx={{ p: 3.5 }}>
                      <Box sx={{
                        color: feature.color, mb: 2.5, width: 64, height: 64, borderRadius: 3,
                        bgcolor: `${feature.color}0d`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        '&:hover': { transform: 'scale(1.1) rotate(5deg)' }, transition: 'all 0.3s ease'
}}>
                        {feature.icon}
                      </Box>
                      <Typography variant="h6" fontWeight={800} sx={{ mb: 1.5, fontSize: '1.15rem', color: feature.color }}>
                        {feature.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.7 }}>
                        {feature.desc}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
                        {feature.tags.map((tag, i) => (
                          <Chip key={i} label={tag} size="small"
                            sx={{ fontSize: '0.65rem', fontWeight: 600, bgcolor: `${feature.color}10`, color: feature.color, height: 22 }} />
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Fade>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── Real Industries ── */}
      <Box sx={{ bgcolor: '#ffffff', py: 12, ...sectionPattern }}>
        <Container maxWidth="lg">
          <Box sx={{ mb: 6, textAlign: 'center' }}>
            <Chip label="TRUSTED BY REAL INDUSTRIES" sx={{ mb: 3, background: 'linear-gradient(135deg, #1F4E79, #2E7D32)', color: 'white', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.15em', px: 2.5, py: 1, borderRadius: '50px' }} />
            <Typography variant="h4" fontWeight={800} sx={{ mb: 2 }}>
              Powering Data for Major Industrial Units
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Real companies filing real data across SIPCOT parks
            </Typography>
          </Box>
          <Grid container spacing={2} justifyContent="center">
            {[
              'Hyundai Motor India', 'Foxconn India', 'Tata Electronics', 'Renault Nissan',
              'TVS Motor Company', 'Ashok Leyland', 'Tata Consultancy Services',
              'Asian Paints', 'Saint-Gobain India', 'Royal Enfield', 'Dell Technologies',
            ].map((name, idx) => (
              <Grid key={idx} size={{ xs: 6, sm: 4, md: 3 }}>
                <Paper elevation={0} sx={{
                  p: 2, borderRadius: 2, textAlign: 'center',
                  border: '1px solid #e2e8f0', bgcolor: 'white',
                  '&:hover': { borderColor: '#1F4E7930', boxShadow: '0 4px 16px rgba(31,78,121,0.1)' },
                  transition: 'all 0.2s ease'
}}>
                  <Typography variant="body2" fontWeight={600} color="text.primary" sx={{ fontSize: '0.85rem' }}>
                    {name}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── Tech Stack ── */}
      <Box sx={{ bgcolor: '#f1f5f9', py: 12 }}>
        <Container maxWidth="lg">
          <Box sx={{ mb: 5, textAlign: 'center' }}>
            <Chip label="TECHNOLOGY" sx={{ mb: 2, background: 'linear-gradient(135deg, #0d2435, #143656)', color: 'white', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.15em', px: 2.5, py: 1, borderRadius: '50px' }} />
            <Typography variant="h5" fontWeight={700}>
              Built with proven, self-hostable technology
            </Typography>
          </Box>
          <Grid container spacing={2} justifyContent="center">
            {[
              { name: 'React 19', desc: 'Frontend' },
              { name: 'Express 5', desc: 'API' },
              { name: 'PostgreSQL', desc: 'Database' },
              { name: 'LangGraph.js', desc: 'AI Orchestration' },
              { name: 'Ollama / vLLM', desc: 'LLM Runtime' },
              { name: 'Razorpay', desc: 'Payments' },
              { name: 'Zod', desc: 'Schema Validation' },
              { name: 'Docker', desc: 'Deployment' },
            ].map((tech, idx) => (
              <Grid key={idx} size={{ xs: 6, sm: 3, md: 1.5 }}>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 2, textAlign: 'center', border: '1px solid #e2e8f0', bgcolor: 'white' }}>
                  <Typography variant="body2" fontWeight={700} color="#1F4E79" sx={{ fontSize: '0.8rem' }}>{tech.name}</Typography>
                  <Typography variant="caption" color="text.disabled">{tech.desc}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── CTA ── */}
      <Box sx={{
        py: 16,
        background: 'linear-gradient(135deg, #060d1a 0%, #0d2435 40%, #0a1e14 100%)',
        color: 'white', textAlign: 'center', position: 'relative', overflow: 'hidden'
}}>
        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
          <AutoAwesomeIcon sx={{ fontSize: 64, mb: 3, opacity: 0.9, animation: `${float} 4s ease-in-out infinite` }} />
          <Typography variant="h3" fontWeight={900} sx={{ mb: 3, fontSize: { xs: '1.75rem', md: '2.75rem' } }}>
            Ready to File Smarter?
          </Typography>
          <Typography variant="h6" sx={{ mb: 6, opacity: 0.8, fontWeight: 300, fontSize: '1.1rem', lineHeight: 1.7 }}>
            Join Hyundai, Foxconn, Tata Electronics and 8 other major industries already using THOZHIRPORUL
            for quarterly compliance, forecasting, and park-level intelligence.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button variant="contained" size="large" onClick={() => navigate('/industry-registration')} endIcon={<ArrowForwardIcon />}
              sx={{ px: 5, py: 2, fontWeight: 700, bgcolor: 'white', color: '#0d2435', borderRadius: 3, '&:hover': { bgcolor: '#f1f5f9', transform: 'translateY(-4px)' } }}>
              Register Your Industry
            </Button>
            <Button variant="outlined" size="large" onClick={() => navigate('/pricing')} endIcon={<ArrowForwardIcon />}
              sx={{ px: 5, py: 2, fontWeight: 700, color: 'white', borderColor: 'rgba(255,255,255,0.3)', borderRadius: 3, '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.05)' } }}>
              View Pricing
            </Button>
          </Box>
        </Container>
      </Box>

      <UnifiedFooter />
    </Box>
  );
}
