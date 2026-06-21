import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Divider,
  List, ListItem, Button, Chip, Switch, FormControlLabel, Alert
} from '@mui/material';
import FactoryIcon from '@mui/icons-material/Factory';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import EngineeringIcon from '@mui/icons-material/Engineering';
import BoltIcon from '@mui/icons-material/Bolt';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ElectricBoltIcon from '@mui/icons-material/ElectricBolt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import OpacityIcon from '@mui/icons-material/Opacity';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import SettingsIcon from '@mui/icons-material/Settings';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import StorageIcon from '@mui/icons-material/Storage';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  IconButton, 
  Snackbar 
} from '@mui/material';
import { submissionService, grievanceService } from '../services/api';

import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

import {
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

// Add pulse animation to global styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.7; transform: scale(1.1); }
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

function AdminDashboard() {
  const [isFetchingCloud, setIsFetchingCloud] = useState(false);
  const [cloudSyncResult, setCloudSyncResult] = useState(null);
  const [dashboardMetrics, setDashboardMetrics] = useState({
    industries: 0,
    investment: 0,
    employment: 0,
    power: 0
  });
  const [submissions, setSubmissions] = useState([]);
  const [grievances, setGrievances] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const fetchDashboardData = async () => {
    try {
      // 1. Fetch compliance data/submissions
      const complianceRes = await submissionService.getCompliance();
      const complianceData = complianceRes.data;
      setSubmissions(complianceData);

      // Aggregate KPI metrics
      let totalInvestment = 0;
      let totalEmployment = 0;
      let totalPower = 0;
      
      complianceData.forEach(item => {
        totalInvestment += Number(item.investmentAmount || 0);
        totalEmployment += Number(item.totalEmployees || 0);
        totalPower += Number(item.powerUsage || 0);
      });

      setDashboardMetrics({
        industries: complianceData.length,
        investment: totalInvestment / 10000000,
        employment: totalEmployment,
        power: totalPower
      });
    } catch (err) {
      console.error("Failed to load compliance data", err);
    }

    try {
      // 2. Fetch grievances
      const grievanceRes = await grievanceService.getAll();
      setGrievances(grievanceRes.data);
    } catch (err) {
      console.error("Failed to load grievances", err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleApproveSubmission = async (submissionId) => {
    if (!submissionId) return;
    try {
      await submissionService.updateStatus(submissionId, 'Approved');
      setSnackbar({ open: true, message: 'Submission successfully approved!', severity: 'success' });
      fetchDashboardData();
    } catch (err) {
      console.error("Failed to approve submission", err);
      setSnackbar({ open: true, message: 'Failed to approve submission.', severity: 'error' });
    }
  };

  const handleRejectSubmission = async (submissionId) => {
    if (!submissionId) return;
    try {
      await submissionService.updateStatus(submissionId, 'Rejected');
      setSnackbar({ open: true, message: 'Submission rejected.', severity: 'warning' });
      fetchDashboardData();
    } catch (err) {
      console.error("Failed to reject submission", err);
      setSnackbar({ open: true, message: 'Failed to reject submission.', severity: 'error' });
    }
  };

  const handleResolveGrievance = async (grievanceId) => {
    if (!grievanceId) return;
    try {
      await grievanceService.updateStatus(grievanceId, 'Resolved');
      setSnackbar({ open: true, message: 'Grievance resolved successfully!', severity: 'success' });
      fetchDashboardData();
    } catch (err) {
      console.error("Failed to resolve grievance", err);
      setSnackbar({ open: true, message: 'Failed to resolve grievance.', severity: 'error' });
    }
  };

  const handleInProgressGrievance = async (grievanceId) => {
    if (!grievanceId) return;
    try {
      await grievanceService.updateStatus(grievanceId, 'In Progress');
      setSnackbar({ open: true, message: 'Grievance status updated to In Progress.', severity: 'info' });
      fetchDashboardData();
    } catch (err) {
      console.error("Failed to update grievance status", err);
      setSnackbar({ open: true, message: 'Failed to update grievance status.', severity: 'error' });
    }
  };

  const handleFetchCloudData = async () => {
    setIsFetchingCloud(true);
    setCloudSyncResult(null);
    try {
      // Fetching mock data from a public Cloud API (JSONPlaceholder) for easy integration
      const res = await fetch('https://jsonplaceholder.typicode.com/users');

      if (!res.ok) throw new Error('Cloud fetch failed');

      const externalData = await res.json();

      // Simulate transforming the external cloud data into our dashboard metrics format
      const mappedData = {
        compliant: { count: externalData.length * 45 + 12 }, // Generating mock count from cloud data length
        violation: { count: externalData.length * 2 + 5 }    // Generating mock count from cloud data length
      };

      setTimeout(() => {
        setCloudSyncResult({
          status: 'success',
          message: 'Mock data successfully fetched and synced from External Cloud API.',
          timestamp: new Date().toLocaleTimeString(),
          data: mappedData
        });

        // Add the fetched data count directly to the existing dashboard KPI fields
        const userCount = externalData.length || 10;
        setDashboardMetrics(prev => ({
          industries: prev.industries + userCount, // Adding fetched count to Total Industries
          investment: prev.investment + (userCount * 5), // Simulating addition to Total Investment
          employment: prev.employment + (userCount * 12), // Simulating addition to Total Employment
          power: prev.power + Math.floor(userCount * 1.5) // Simulating addition to Total Power
        }));

        setIsFetchingCloud(false);
      }, 1500);
    } catch {
      setTimeout(() => {
        setCloudSyncResult({
          status: 'error',
          message: 'Cloud Sync Failed. Check network connection.',
          timestamp: new Date().toLocaleTimeString()
        });
        setIsFetchingCloud(false);
      }, 1500);
    }
  };

  const [autoActionsEnabled, setAutoActionsEnabled] = useState(() => {
    return localStorage.getItem('autoActionsEnabled') === 'true';
  });

  const [aiTasks, setAiTasks] = useState(() => {
    const saved = localStorage.getItem('aiTasks');
    if (saved) return JSON.parse(saved);
    return [];
  });

  const handleToggleAutoActions = (e) => {
    const isChecked = e.target.checked;
    setAutoActionsEnabled(isChecked);
    localStorage.setItem('autoActionsEnabled', isChecked);
  };

  const handleAiAction = (taskId, actionName) => {
    const newTasks = aiTasks.filter(t => t.id !== taskId);
    setAiTasks(newTasks);
    localStorage.setItem('aiTasks', JSON.stringify(newTasks));
    alert(`AI Action Executed: ${actionName}`);
  };

  // Real-Time Utility Monitoring with IoT-Ready Structure
  const [utilityData, setUtilityData] = useState({
    electricity: {
      currentFlow: 0, // MW
      peakFlow: 0,
      minFlow: 0,
      tariff: 7.50, // ₹ per kWh
      tariffType: 'Industrial LT-II',
      lastUpdated: new Date().toISOString(),
      trend: 'stable',
      alerts: []
    },
    water: {
      currentFlow: 0, // ML/d
      peakFlow: 0,
      minFlow: 0,
      tariff: 45.00, // ₹ per kL
      tariffType: 'Industrial Water',
      lastUpdated: new Date().toISOString(),
      trend: 'stable',
      alerts: []
    }
  });



  // Animation state
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // Simulate real-time IoT data updates (Replace with WebSocket in production)
  useEffect(() => {
    const interval = setInterval(() => {
      setUtilityData(prev => {
        const elecChange = (Math.random() - 0.5) * 3;
        const waterChange = (Math.random() - 0.5) * 1;

        const newElecFlow = Math.max(0, Math.min(500, Number((prev.electricity.currentFlow + elecChange).toFixed(2))));
        const newWaterFlow = Math.max(0, Math.min(160, Number((prev.water.currentFlow + waterChange).toFixed(2))));

        // Determine trend
        const elecTrend = elecChange > 0.5 ? 'rising' : elecChange < -0.5 ? 'falling' : 'stable';
        const waterTrend = waterChange > 0.3 ? 'rising' : waterChange < -0.3 ? 'falling' : 'stable';

        // Generate alerts for anomalies
        const elecAlerts = newElecFlow > 480 ? ['High consumption alert: Exceeding 480MW threshold'] : [];
        const waterAlerts = newWaterFlow > 140 ? ['High consumption alert: Exceeding 140ML/d threshold'] : [];



        return {
          electricity: {
            ...prev.electricity,
            currentFlow: newElecFlow,
            peakFlow: Math.max(prev.electricity.peakFlow, newElecFlow),
            minFlow: Math.min(prev.electricity.minFlow, newElecFlow),
            lastUpdated: new Date().toISOString(),
            trend: elecTrend,
            alerts: elecAlerts
          },
          water: {
            ...prev.water,
            currentFlow: newWaterFlow,
            peakFlow: Math.max(prev.water.peakFlow, newWaterFlow),
            minFlow: Math.min(prev.water.minFlow, newWaterFlow),
            lastUpdated: new Date().toISOString(),
            trend: waterTrend,
            alerts: waterAlerts
          }
        };
      });
    }, 3000); // Update every 3 seconds

    return () => clearInterval(interval);
  }, []);

  // Calculate costs
  const currentElectricityCostPerHour = (utilityData.electricity.currentFlow * 1000 * utilityData.electricity.tariff) / 100000; // Lakhs/hr
  const currentWaterCostPerDay = (utilityData.water.currentFlow * 1000 * utilityData.water.tariff) / 100000; // Lakhs/day

  const kpiData = [
    { title: "Total Industries", value: dashboardMetrics.industries.toLocaleString(), change: `+${Math.floor(dashboardMetrics.industries / 100)}% growth`, icon: <FactoryIcon fontSize="large" color="primary" />, color: "primary.main" },
    { title: "Total Investment", value: `₹${dashboardMetrics.investment.toLocaleString()} Cr`, change: "+8% this year", icon: <AccountBalanceIcon fontSize="large" color="success" />, color: "success.main" },
    { title: "Total Employment", value: dashboardMetrics.employment.toLocaleString(), change: "+4% this quarter", icon: <EngineeringIcon fontSize="large" color="info" />, color: "info.main" },
    { title: "Total Power Consumption", value: `${dashboardMetrics.power} MW`, change: "-2% efficiency", icon: <BoltIcon fontSize="large" color="warning" />, color: "warning.main" }
  ];

  const industryGrowthData = [
    { year: '2021', units: 850 },
    { year: '2022', units: 940 },
    { year: '2023', units: 1050 },
    { year: '2024', units: 1180 },
    { year: '2025', units: 1250 }
  ];

  const resourceData = [
    { park: 'Oragadam', power: 380, water: 120 },
    { park: 'Sriperumbudur', power: 340, water: 105 },
    { park: 'Hosur', power: 220, water: 85 },
    { park: 'Cheyyar', power: 150, water: 60 },
    { park: 'Thoothukudi', power: 120, water: 45 },
    { park: 'Gangaikondan', power: 80, water: 30 }
  ];

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{
        mb: { xs: 2, md: 3 },
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'flex-start', sm: 'center' },
        gap: 2
      }}>
        <Box>
          <Typography variant="h4" color="primary.main" fontWeight="bold" sx={{ fontSize: { xs: '1.4rem', sm: '1.75rem', md: '2.125rem' } }}>
            NEXORA Administrative Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '1rem' } }}>
            Global overview of all industrial park metrics.
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={handleFetchCloudData}
          disabled={isFetchingCloud}
          startIcon={isFetchingCloud ? <CloudSyncIcon sx={{ animation: 'spin 2s linear infinite' }} /> : <CloudDownloadIcon />}
          sx={{
            background: 'linear-gradient(135deg, #1F4E79 0%, #1565C0 100%)',
            color: 'white',
            fontWeight: 700,
            px: 3,
            py: 1,
            borderRadius: 2,
            boxShadow: '0 4px 14px 0 rgba(31, 78, 121, 0.39)',
            '&:hover': {
              background: 'linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)',
              boxShadow: '0 6px 20px rgba(31, 78, 121, 0.23)',
            }
          }}
        >
          {isFetchingCloud ? 'Syncing Cloud Data...' : 'Fetch from Cloud'}
        </Button>
      </Box>

      {cloudSyncResult && (
        <Alert
          severity={cloudSyncResult.status}
          sx={{ mb: 3, borderRadius: 2, alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
          onClose={() => setCloudSyncResult(null)}
        >
          <Typography variant="body2" fontWeight={700}>{cloudSyncResult.message}</Typography>
          <Typography variant="caption" display="block" sx={{ mb: cloudSyncResult.data ? 1 : 0 }}>
            Last Sync: {cloudSyncResult.timestamp}
          </Typography>
          {cloudSyncResult.data && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip size="small" icon={<StorageIcon />} label={`Compliant Industries: ${cloudSyncResult.data.compliant?.count || 0}`} color="success" variant="outlined" />
              <Chip size="small" icon={<StorageIcon />} label={`Active Violations: ${cloudSyncResult.data.violation?.count || 0}`} color="error" variant="outlined" />
            </Box>
          )}
        </Alert>
      )}

      {/* KPI Cards Row */}
      <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: { xs: 2, md: 4 } }}>
        {kpiData.map((kpi, index) => (
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
                animation: isLoaded ? `fadeInUp 0.5s ease-out ${index * 0.1}s both` : 'none',
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
                  <Typography variant="caption" sx={{ color: kpi.change.includes('+') ? 'success.main' : 'error.main', fontWeight: 'bold' }}>
                    {kpi.change}
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

      {/* Global Charts Row */}
      <Grid container spacing={{ xs: 2, md: 3 }}>
        {/* Industry Growth Line Chart */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 }, height: '100%', minHeight: { xs: 300, md: 400 } }}>
            <Typography variant="h6" color="text.primary" gutterBottom>
              Aggregated Industrial Growth (2021-2025)
            </Typography>
            <Divider sx={{ mb: 3 }} />
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={industryGrowthData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E0E0" />
                <XAxis dataKey="year" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8 }} />
                <Line type="monotone" dataKey="units" stroke="#1F4E79" strokeWidth={4} dot={{ r: 6 }} activeDot={{ r: 8 }} name="Active Industries" />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Resource Consumption Bar Chart */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 }, height: '100%', minHeight: { xs: 300, md: 400 } }}>
            <Typography variant="h6" color="text.primary" gutterBottom>
              Resource Consumption By Park Comparison
            </Typography>
            <Divider sx={{ mb: 3 }} />
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={resourceData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E0E0" />
                <XAxis dataKey="park" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(31, 78, 121, 0.05)' }} contentStyle={{ borderRadius: 8 }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: 20 }} />
                <Bar dataKey="power" fill="#F57C00" radius={[4, 4, 0, 0]} name="Power (MW)" />
                <Bar dataKey="water" fill="#2E7D32" radius={[4, 4, 0, 0]} name="Water (ML)" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Real-time Utility Tariffs & Flow */}
      <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mt: 1, mb: 1 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper
            elevation={2}
            sx={{
              p: { xs: 2, sm: 3 },
              height: '100%',
              borderTop: '4px solid #F57C00',
              position: 'relative',
              overflow: 'hidden',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,247,240,0.9) 100%)',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: '0 12px 32px rgba(245, 124, 0, 0.2)',
                transform: 'translateY(-4px)',
              },
            }}
          >
            {/* Live Indicator */}
            <Box sx={{ position: 'absolute', top: 16, right: 16, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#4CAF50', animation: 'pulse 1.5s infinite' }} />
              <Typography variant="caption" color="text.secondary">LIVE</Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Box sx={{ bgcolor: '#F57C0015', p: 1, borderRadius: 1.5, mr: 1.5 }}>
                <ElectricBoltIcon sx={{ color: '#F57C00' }} />
              </Box>
              <Typography variant="h6" fontWeight={700}>Electricity - Real-Time Flow & Tariffs</Typography>
            </Box>
            <Divider sx={{ mb: 2, borderColor: 'rgba(245, 124, 0, 0.1)' }} />

            {/* Alerts */}
            {utilityData.electricity.alerts.length > 0 && (
              <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                {utilityData.electricity.alerts[0]}
              </Alert>
            )}

            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <Typography variant="body2" color="text.secondary" fontWeight={600}>Tariff Type</Typography>
                <Typography variant="body1" fontWeight={700} color="primary.main">{utilityData.electricity.tariffType}</Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="body2" color="text.secondary" fontWeight={600}>Gov Rate</Typography>
                <Typography variant="body1" fontWeight={700} color="primary.main">₹ {utilityData.electricity.tariff.toFixed(2)}/unit</Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="body2" color="text.secondary" fontWeight={600}>Current Flow</Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                  <Typography variant="h5" fontWeight={800} color={utilityData.electricity.trend === 'rising' ? 'error.main' : utilityData.electricity.trend === 'falling' ? 'success.main' : 'warning.main'}>
                    {utilityData.electricity.currentFlow.toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">MW</Typography>
                  {utilityData.electricity.trend === 'rising' && <ArrowUpwardIcon fontSize="small" color="error" />}
                  {utilityData.electricity.trend === 'falling' && <ArrowDownwardIcon fontSize="small" color="success" />}
                </Box>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="body2" color="text.secondary" fontWeight={600}>Peak / Min (24h)</Typography>
                <Typography variant="body2" fontWeight={700}>
                  {utilityData.electricity.peakFlow.toFixed(1)} / {utilityData.electricity.minFlow.toFixed(1)} MW
                </Typography>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Box sx={{ bgcolor: '#FFF3E0', p: 1.5, borderRadius: 2, mt: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" fontWeight={700}>Estimated Run Rate</Typography>
                    <Typography variant="subtitle1" fontWeight={800} color="error.main">₹ {currentElectricityCostPerHour.toFixed(2)} Lakhs/hr</Typography>
                  </Box>
                  <Box sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                    <Box sx={{
                      height: '100%',
                      width: `${(utilityData.electricity.currentFlow / 500) * 100}%`,
                      bgcolor: utilityData.electricity.currentFlow > 480 ? 'error.main' : utilityData.electricity.currentFlow > 450 ? 'warning.main' : 'success.main',
                      transition: 'all 0.5s ease',
                      borderRadius: 3,
                    }} />
                  </Box>
                </Box>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography variant="caption" color="text.secondary">
                  Last updated: {new Date(utilityData.electricity.lastUpdated).toLocaleTimeString()}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper
            elevation={2}
            sx={{
              p: { xs: 2, sm: 3 },
              height: '100%',
              borderTop: '4px solid #0288d1',
              position: 'relative',
              overflow: 'hidden',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(225, 245, 254, 0.9) 100%)',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: '0 12px 32px rgba(2, 136, 209, 0.2)',
                transform: 'translateY(-4px)',
              },
            }}
          >
            {/* Live Indicator */}
            <Box sx={{ position: 'absolute', top: 16, right: 16, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#4CAF50', animation: 'pulse 1.5s infinite' }} />
              <Typography variant="caption" color="text.secondary">LIVE</Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Box sx={{ bgcolor: '#0288d115', p: 1, borderRadius: 1.5, mr: 1.5 }}>
                <OpacityIcon sx={{ color: '#0288d1' }} />
              </Box>
              <Typography variant="h6" fontWeight={700}>Water - Real-Time Flow & Tariffs</Typography>
            </Box>
            <Divider sx={{ mb: 2, borderColor: 'rgba(2, 136, 209, 0.1)' }} />

            {/* Alerts */}
            {utilityData.water.alerts.length > 0 && (
              <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                {utilityData.water.alerts[0]}
              </Alert>
            )}

            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <Typography variant="body2" color="text.secondary" fontWeight={600}>Tariff Type</Typography>
                <Typography variant="body1" fontWeight={700} color="primary.main">{utilityData.water.tariffType}</Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="body2" color="text.secondary" fontWeight={600}>Gov Rate</Typography>
                <Typography variant="body1" fontWeight={700} color="primary.main">₹ {utilityData.water.tariff.toFixed(2)}/kL</Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="body2" color="text.secondary" fontWeight={600}>Current Flow</Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                  <Typography variant="h5" fontWeight={800} color={utilityData.water.trend === 'rising' ? 'error.main' : utilityData.water.trend === 'falling' ? 'success.main' : 'info.main'}>
                    {utilityData.water.currentFlow.toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">ML/d</Typography>
                  {utilityData.water.trend === 'rising' && <ArrowUpwardIcon fontSize="small" color="error" />}
                  {utilityData.water.trend === 'falling' && <ArrowDownwardIcon fontSize="small" color="success" />}
                </Box>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="body2" color="text.secondary" fontWeight={600}>Peak / Min (24h)</Typography>
                <Typography variant="body2" fontWeight={700}>
                  {utilityData.water.peakFlow.toFixed(1)} / {utilityData.water.minFlow.toFixed(1)} ML
                </Typography>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Box sx={{ bgcolor: '#E1F5FE', p: 1.5, borderRadius: 2, mt: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" fontWeight={700}>Estimated Run Rate</Typography>
                    <Typography variant="subtitle1" fontWeight={800} color="error.main">₹ {currentWaterCostPerDay.toFixed(2)} Lakhs/day</Typography>
                  </Box>
                  <Box sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                    <Box sx={{
                      height: '100%',
                      width: `${(utilityData.water.currentFlow / 160) * 100}%`,
                      bgcolor: utilityData.water.currentFlow > 140 ? 'error.main' : utilityData.water.currentFlow > 125 ? 'warning.main' : 'info.main',
                      transition: 'all 0.5s ease',
                      borderRadius: 3,
                    }} />
                  </Box>
                </Box>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography variant="caption" color="text.secondary">
                  Last updated: {new Date(utilityData.water.lastUpdated).toLocaleTimeString()}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      {/* AI Decision Support & Workflow Engine */}
      <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper
            elevation={2}
            sx={{
              p: { xs: 2, sm: 3 },
              height: '100%',
              borderTop: '4px solid #9c27b0',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(251, 234, 255, 0.9) 100%)',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: '0 12px 32px rgba(156, 39, 176, 0.2)',
                transform: 'translateY(-4px)',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ bgcolor: '#9c27b015', p: 1, borderRadius: 1.5, mr: 1.5 }}>
                  <SmartToyIcon sx={{ color: '#9c27b0' }} />
                </Box>
                <Typography variant="h6" fontWeight={700}>AI Decision Support</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Chip label="Live" size="small" color="success" variant="filled" sx={{ fontWeight: 700, fontSize: '0.65rem' }} />
                <Chip label="v2.0" size="small" sx={{ fontSize: '0.65rem', bgcolor: '#9c27b0', color: 'white' }} />
              </Box>
            </Box>

            {/* Risk Distribution Summary */}
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              <Chip label={`Critical: 15`} size="small" sx={{ bgcolor: '#d32f2f', color: 'white', fontWeight: 600 }} />
              <Chip label={`High: 78`} size="small" sx={{ bgcolor: '#f57c00', color: 'white', fontWeight: 600 }} />
              <Chip label={`Medium: 234`} size="small" sx={{ bgcolor: '#1976d2', color: 'white', fontWeight: 600 }} />
              <Chip label={`Low: 923`} size="small" sx={{ bgcolor: '#388e3c', color: 'white', fontWeight: 600 }} />
            </Box>

            <List dense>
              {aiTasks.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>No pending AI actions.</Typography>
              ) : (
                aiTasks.map(task => (
                  <ListItem
                    key={task.id}
                    sx={{
                      bgcolor: task.type === 'critical' ? '#FFEBEE' : '#E8F5E9',
                      borderRadius: 2, mb: 1, flexDirection: 'column', alignItems: 'flex-start',
                      transition: 'all 0.2s ease',
                      '&:hover': { transform: 'translateX(4px)' },
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', mb: 0.5 }}>
                      <Typography variant="subtitle2" fontWeight={700} color={task.type === 'critical' ? 'error' : 'success.main'}>{task.title}</Typography>
                      <Chip
                        label={task.type === 'critical' ? 'URGENT' : 'LOW RISK'}
                        size="small"
                        color={task.type === 'critical' ? 'error' : 'success'}
                        variant="filled"
                        sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
                      />
                    </Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>{task.desc}</Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {task.actions.map(action => (
                        <Button
                          key={action}
                          variant={action.includes('Warning') ? 'outlined' : 'contained'}
                          color={task.type === 'critical' ? (action.includes('Warning') ? 'error' : 'primary') : 'success'}
                          size="small"
                          onClick={() => handleAiAction(task.id, action)}
                          disabled={task.type === 'success' && autoActionsEnabled}
                          sx={{
                            fontSize: '0.7rem', px: 1.5, py: 0.5, fontWeight: 600,
                            '&:hover': { transform: 'translateY(-2px)' },
                          }}
                        >
                          {action}
                        </Button>
                      ))}
                    </Box>
                  </ListItem>
                ))
              )}
            </List>

            <Divider sx={{ my: 2, borderColor: 'rgba(156, 39, 176, 0.1)' }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>93 actions pending</Typography>
              <Button size="small" variant="text" sx={{ fontSize: '0.75rem', color: '#9c27b0', fontWeight: 700 }}>View All →</Button>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper
            elevation={2}
            sx={{
              p: { xs: 2, sm: 3 },
              height: '100%',
              borderTop: '4px solid #00acc1',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(224, 247, 250, 0.9) 100%)',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: '0 12px 32px rgba(0, 172, 193, 0.2)',
                transform: 'translateY(-4px)',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ bgcolor: '#00acc115', p: 1, borderRadius: 1.5, mr: 1.5 }}>
                  <SettingsIcon sx={{ color: '#00acc1' }} />
                </Box>
                <Typography variant="h6" fontWeight={700}>Workflow Automation Engine</Typography>
              </Box>
              <Chip
                label={autoActionsEnabled ? 'ACTIVE' : 'PAUSED'}
                size="small"
                color={autoActionsEnabled ? 'success' : 'default'}
                variant={autoActionsEnabled ? 'filled' : 'outlined'}
                sx={{ fontWeight: 700, fontSize: '0.65rem' }}
              />
            </Box>

            <Typography variant="body2" color="text.secondary" paragraph sx={{ fontWeight: 500 }}>
              Configure automated rules for approvals, escalations, and notifications.
            </Typography>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>Auto-Approved (Today)</Typography>
                <Typography variant="h6" fontWeight={800} color="success.main">12</Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>Escalated (Today)</Typography>
                <Typography variant="h6" fontWeight={800} color="warning.main">3</Typography>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2, borderColor: 'rgba(0, 172, 193, 0.1)' }} />

            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Active Rules</Typography>
            <List dense>
              {[
                { name: 'Auto-approve NOC (Compliance > 90%)', status: 'active', executions: 45 },
                { name: 'Lease renewal good standing', status: 'active', executions: 23 },
                { name: 'Escalate critical violations', status: 'active', executions: 8 },
                { name: 'Payment overdue notices', status: 'active', executions: 67 }
              ].map((rule, i) => (
                <ListItem
                  key={i}
                  sx={{
                    px: 0, py: 0.5,
                    transition: 'all 0.2s ease',
                    '&:hover': { bgcolor: 'rgba(0, 172, 193, 0.05)', borderRadius: 1 },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <Typography variant="body2" fontWeight={500}>{rule.name}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip label={`${rule.executions} runs`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }} />
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: rule.status === 'active' ? '#4CAF50' : '#9e9e9e' }} />
                    </Box>
                  </Box>
                </ListItem>
              ))}
            </List>

            <FormControlLabel
              control={<Switch checked={autoActionsEnabled} onChange={handleToggleAutoActions} color="info" />}
              label={autoActionsEnabled ? "Automation: ENABLED" : "Automation: PAUSED"}
              sx={{ mt: 1 }}
            />

            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              <Button size="small" variant="outlined" fullWidth sx={{ fontWeight: 600 }}>View Activity Log</Button>
              <Button size="small" variant="outlined" fullWidth sx={{ fontWeight: 600 }}>Configure Rules</Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Industry Data Submissions & Compliance Section */}
      <Paper
        elevation={3}
        sx={{
          p: { xs: 2, sm: 3 },
          mt: 4,
          borderTop: '4px solid #1F4E79',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(244, 247, 250, 0.9) 100%)',
          backdropFilter: 'blur(10px)',
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box sx={{ bgcolor: '#1F4E7915', p: 1, borderRadius: 1.5, mr: 1.5 }}>
            <FactoryIcon sx={{ color: '#1F4E79' }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700} color="primary.main">
              Industry Compliance Data Submissions
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Review and approve periodic industrial data submitted by registered industries.
            </Typography>
          </Box>
        </Box>
        <Divider sx={{ mb: 2, borderColor: 'rgba(31, 78, 121, 0.1)' }} />

        <TableContainer sx={{ maxHeight: 400, overflowY: 'auto' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'rgba(31, 78, 121, 0.05)' }}>Company Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'rgba(31, 78, 121, 0.05)' }}>Location</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'rgba(31, 78, 121, 0.05)' }}>Period</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'rgba(31, 78, 121, 0.05)' }}>Submitted Date</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'rgba(31, 78, 121, 0.05)' }}>Status</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: 'rgba(31, 78, 121, 0.05)' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {submissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                    <Typography color="text.secondary">No submissions recorded.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                submissions.map((sub) => (
                  <TableRow key={sub.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{sub.name}</TableCell>
                    <TableCell>{sub.location}</TableCell>
                    <TableCell>{sub.period}</TableCell>
                    <TableCell>{sub.lastSubmission}</TableCell>
                    <TableCell>
                      <Chip
                        label={sub.status}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          bgcolor: 
                            sub.status === 'Compliant' || sub.status === 'Approved' ? '#E8F5E9' :
                            sub.status === 'Pending Review' || sub.status === 'Submitted' ? '#FFF3E0' : '#FFEBEE',
                          color:
                            sub.status === 'Compliant' || sub.status === 'Approved' ? '#2E7D32' :
                            sub.status === 'Pending Review' || sub.status === 'Submitted' ? '#F57C00' : '#C62828',
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      {(sub.status === 'Pending Review' || sub.status === 'Submitted') ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            onClick={() => handleApproveSubmission(sub.submissionId)}
                            sx={{ fontSize: '0.75rem', fontWeight: 600 }}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="contained"
                            color="error"
                            size="small"
                            onClick={() => handleRejectSubmission(sub.submissionId)}
                            sx={{ fontSize: '0.75rem', fontWeight: 600 }}
                          >
                            Reject
                          </Button>
                        </Box>
                      ) : sub.status === 'Compliant' || sub.status === 'Approved' ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, color: '#2E7D32' }}>
                          <CheckCircleIcon fontSize="small" />
                          <Typography variant="body2" fontWeight={600}>Verified</Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">-</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Public & Industrial Grievances Redressal Section */}
      <Paper
        elevation={3}
        sx={{
          p: { xs: 2, sm: 3 },
          mt: 4,
          mb: 4,
          borderTop: '4px solid #b38f00',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255, 253, 240, 0.9) 100%)',
          backdropFilter: 'blur(10px)',
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box sx={{ bgcolor: '#b38f0015', p: 1, borderRadius: 1.5, mr: 1.5 }}>
            <ReportProblemIcon sx={{ color: '#b38f00' }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700} color="warning.main" sx={{ color: '#b38f00' }}>
              Public & Industrial Grievance Redressal
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Review, track, and resolve complaints submitted from the public and industrial staff.
            </Typography>
          </Box>
        </Box>
        <Divider sx={{ mb: 2, borderColor: 'rgba(179, 143, 0, 0.1)' }} />

        <TableContainer sx={{ maxHeight: 400, overflowY: 'auto' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'rgba(179, 143, 0, 0.05)' }}>Grievance / Issue</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'rgba(179, 143, 0, 0.05)' }}>Submitted By</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'rgba(179, 143, 0, 0.05)' }}>Location</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'rgba(179, 143, 0, 0.05)' }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'rgba(179, 143, 0, 0.05)' }}>Status</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: 'rgba(179, 143, 0, 0.05)' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {grievances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                    <Typography color="text.secondary">No grievances submitted.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                grievances.map((griv) => (
                  <TableRow key={griv.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>{griv.title}</Typography>
                        {griv.description && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {griv.description}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{griv.name}</TableCell>
                    <TableCell>{griv.location}</TableCell>
                    <TableCell>{griv.submitted_at}</TableCell>
                    <TableCell>
                      <Chip
                        label={griv.status}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          bgcolor: 
                            griv.status === 'Resolved' ? '#E8F5E9' :
                            griv.status === 'In Progress' ? '#E3F2FD' : '#FFEBEE',
                          color:
                            griv.status === 'Resolved' ? '#2E7D32' :
                            griv.status === 'In Progress' ? '#1976D2' : '#C62828',
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      {griv.status !== 'Resolved' ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                          {griv.status === 'Open' && (
                            <Button
                              variant="outlined"
                              color="info"
                              size="small"
                              onClick={() => handleInProgressGrievance(griv.id)}
                              sx={{ fontSize: '0.75rem', fontWeight: 600 }}
                            >
                              In Progress
                            </Button>
                          )}
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            onClick={() => handleResolveGrievance(griv.id)}
                            sx={{ fontSize: '0.75rem', fontWeight: 600 }}
                          >
                            Resolve
                          </Button>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, color: '#2E7D32' }}>
                          <CheckCircleIcon fontSize="small" />
                          <Typography variant="body2" fontWeight={600}>Resolved</Typography>
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Snackbar alerts */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%', borderRadius: 2 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default AdminDashboard;
