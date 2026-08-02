import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Button,
  Snackbar,
  Alert
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import PeopleIcon from '@mui/icons-material/People';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { workspaceService, submissionService } from '../services/api';
import { downloadIndustryReport } from '../utils/reportGenerator';

// Recharts components
import {
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

function IndustryDashboard() {
  const [overview, setOverview] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportSnack, setReportSnack] = useState({ open: false, message: '', severity: 'success' });
  const [downloadingReport, setDownloadingReport] = useState(false);

  const handleDownloadReport = async () => {
    setDownloadingReport(true);
    setReportSnack({ open: true, message: 'Generating your report…', severity: 'info' });
    try {
      const id = await downloadIndustryReport();
      setReportSnack({ open: true, message: `Report ${id} generated & downloaded.`, severity: 'success' });
    } catch (err) {
      console.error('Report generation failed', err);
      setReportSnack({ open: true, message: 'Failed to generate report.', severity: 'error' });
    } finally {
      setDownloadingReport(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [ovRes, subRes] = await Promise.all([
          workspaceService.getOverview(),
          submissionService.getMySubmissions(),
        ]);
        if (!active) return;
        setOverview(ovRes.data);
        setSubmissions(Array.isArray(subRes.data) ? subRes.data : []);
      } catch (err) {
        console.error('Failed to load industry dashboard', err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const companyName = overview?.company?.name
    || localStorage.getItem('companyName') || localStorage.getItem('userName') || 'My Company';

  const score = overview?.compliance_score?.overall ?? 0;
  const complianceStatus = score >= 75 ? 'Compliant' : score >= 50 ? 'Needs Attention' : 'Non-Compliant';
  const complianceOk = score >= 75;

  const stats = overview?.quick_stats || {};
  const latestPeriod = submissions[0]?.period || 'latest filing';

  const kpiCards = [
    { title: 'Total Employees', value: (stats.employees ?? 0).toLocaleString('en-IN'), sub: latestPeriod, icon: <PeopleIcon color="primary" fontSize="large" />, color: 'primary.main' },
    { title: 'Investment Declared', value: `₹${Number(stats.investment_cr ?? 0).toLocaleString('en-IN')} Cr`, sub: latestPeriod, icon: <AttachMoneyIcon color="success" fontSize="large" />, color: 'success.main' },
    { title: 'Power Usage', value: `${Number(stats.power_usage_kwh ?? 0).toLocaleString('en-IN')} kWh`, sub: latestPeriod, icon: <FlashOnIcon color="warning" fontSize="large" />, color: 'warning.main' },
    { title: 'Water Usage', value: `${Number(stats.water_usage_kl ?? 0).toLocaleString('en-IN')} KL`, sub: latestPeriod, icon: <WaterDropIcon color="info" fontSize="large" />, color: 'info.main' },
  ];

  // Build the resource-consumption chart from real submissions (chronological).
  const chartData = [...submissions]
    .filter(s => s.data && (s.data.powerUsage != null || s.data.waterConsumption != null))
    .reverse()
    .map(s => ({
      month: s.period,
      power: Number(s.data.powerUsage || 0),
      water: Number(s.data.waterConsumption || 0),
    }));

  const recentSubmissions = submissions.slice(0, 3).map(s => ({
    report: `${s.period} Data Submission`,
    date: s.submitted,
    status: s.status,
  }));

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Header Area */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: { xs: 2, md: 4 }, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4" color="primary.main" fontWeight="bold" sx={{ fontSize: { xs: '1.4rem', sm: '1.75rem', md: '2.125rem' } }}>
          {companyName} Dashboard
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', color: complianceOk ? 'secondary.main' : 'warning.main', bgcolor: complianceOk ? '#e8f5e9' : '#fff3e0', px: 2, py: 0.5, borderRadius: 1 }}>
            <CheckCircleIcon fontSize="small" sx={{ mr: 1 }} />
            <Typography variant="body2" fontWeight="bold">{complianceStatus}{score ? ` (${score}%)` : ''}</Typography>
          </Box>
          <Button
            variant="outlined"
            color="success"
            startIcon={<PictureAsPdfIcon />}
            onClick={handleDownloadReport}
            disabled={downloadingReport}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            {downloadingReport ? 'Generating…' : 'Download Report'}
          </Button>
        </Box>
      </Box>

      {/* KPI Cards Row */}
      <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: { xs: 2, md: 4 } }}>
        {kpiCards.map((kpi, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
            <Card
              elevation={2}
              sx={{
                height: '100%',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 100%)',
                backdropFilter: 'blur(10px)',
                borderTop: `4px solid ${kpi.color}`,
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: `0 16px 40px ${kpi.color}25`,
                },
              }}
            >
              <CardContent sx={{ display: 'flex', alignItems: 'center', p: { xs: 2, sm: 3 } }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom fontWeight={600}>
                    {kpi.title}
                  </Typography>
                  <Typography component="div" fontWeight="bold" color="text.primary" sx={{ fontSize: { xs: '1rem', sm: '1.1rem', md: '1.2rem', lg: '1.35rem' }, lineHeight: 1.2 }}>
                    {kpi.value}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 'bold' }}>
                    {kpi.sub}
                  </Typography>
                </Box>
                <Box sx={{
                  bgcolor: `${kpi.color}12`,
                  p: 1.8,
                  borderRadius: 2.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'scale(1.1) rotate(5deg)',
                    bgcolor: kpi.color,
                    '& svg': { color: 'white' },
                  },
                }}>
                  {kpi.icon}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Charts & Tasks Row */}
      <Grid container spacing={{ xs: 2, md: 3 }}>
        {/* Main Chart Area */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 }, height: '100%', minHeight: { xs: 300, md: 400 } }}>
            <Typography variant="h6" color="text.primary" gutterBottom>
              Resource Consumption Trajectory
            </Typography>
            <Divider sx={{ mb: 3 }} />
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E0E0" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: 20 }} />
                  <Line type="monotone" name="Power (kWh)" dataKey="power" stroke="#F57C00" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 8 }} />
                  <Line type="monotone" name="Water (KL)" dataKey="water" stroke="#1F4E79" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'text.secondary' }}>
                <Typography variant="body2">No submission data available yet. Submit resource data to see your consumption trend.</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Recent Data Submissions Feed */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card elevation={2} sx={{ height: '100%' }}>
            <CardHeader title="Recent Data Submissions" titleTypographyProps={{ variant: 'h6' }} />
            <Divider />
            <CardContent>
              {recentSubmissions.length > 0 ? (
                <List>
                  {recentSubmissions.map((item, index) => {
                    const isApproved = String(item.status).toLowerCase() === 'approved';
                    return (
                      <ListItem key={index} divider={index !== recentSubmissions.length - 1}>
                        <ListItemIcon>
                          <AssignmentIcon color={isApproved ? 'success' : 'warning'} />
                        </ListItemIcon>
                        <ListItemText
                          primary={item.report}
                          secondary={`Submitted: ${item.date}`}
                          primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                        />
                        <Typography variant="caption" sx={{
                          color: isApproved ? 'secondary.main' : 'warning.main',
                          bgcolor: isApproved ? '#e8f5e9' : '#fff3e0',
                          px: 1, py: 0.5, borderRadius: 1, fontWeight: 'bold', textTransform: 'capitalize'
                        }}>
                          {item.status}
                        </Typography>
                      </ListItem>
                    );
                  })}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                  No submissions yet.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Snackbar
        open={reportSnack.open}
        autoHideDuration={5000}
        onClose={() => setReportSnack({ ...reportSnack, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setReportSnack({ ...reportSnack, open: false })} severity={reportSnack.severity} variant="filled">
          {reportSnack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default IndustryDashboard;
