import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, Chip, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
  ToggleButton, ToggleButtonGroup, List, ListItem, ListItemIcon,
  ListItemText, Divider, Button, Select, MenuItem, FormControl, InputLabel,
  Switch, FormControlLabel
} from '@mui/material';
import {
  TrendingUp, TrendingDown, Warning, Error as ErrorIcon,
  Info, CheckCircle, Assessment, Map as MapIcon,
  Flag, Business, People, CurrencyRupee, NotificationsActive,
  SmartToy, ElectricBolt, Opacity
} from '@mui/icons-material';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const SEVERITY_COLORS = {
  critical: '#d32f2f',
  high: '#f57c00',
  medium: '#fbc02d',
  low: '#2196f3',
};

const ALERT_ICONS = {
  critical: <ErrorIcon sx={{ color: '#d32f2f' }} />,
  high: <Warning sx={{ color: '#f57c00' }} />,
  medium: <Info sx={{ color: '#fbc02d' }} />,
  low: <Info sx={{ color: '#2196f3' }} />,
};

const KPICard = ({ title, value, unit, growth, icon, color }) => (
  <Card
    sx={{
      height: '100%',
      borderTop: `4px solid ${color}`,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 100%)',
      backdropFilter: 'blur(10px)',
      '&:hover': {
        transform: 'translateY(-6px)',
        boxShadow: `0 16px 40px ${color}25`,
      },
    }}
  >
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="body2" color="text.secondary" fontWeight={600}>{title}</Typography>
          <Typography variant="h4" fontWeight={800} sx={{ my: 1 }}>
            {typeof value === 'number' ? value.toLocaleString() : value}
            {unit && <Typography component="span" variant="body2" color="text.secondary"> {unit}</Typography>}
          </Typography>
          <Chip
            size="small"
            icon={growth >= 0 ? <TrendingUp /> : <TrendingDown />}
            label={`${growth >= 0 ? '+' : ''}${growth}%`}
            color={growth >= 0 ? 'success' : 'error'}
            variant="outlined"
            sx={{ fontWeight: 700 }}
          />
        </Box>
        <Box sx={{
          color,
          opacity: 0.8,
          fontSize: 40,
          bgcolor: `${color}12`,
          p: 1.5,
          borderRadius: 2.5,
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'scale(1.1) rotate(5deg)',
            bgcolor: color,
            '& > svg': { color: 'white' },
          },
        }}>{icon}</Box>
      </Box>
    </CardContent>
  </Card>
);

export default function GovCommandCenter() {
  const [trendMetric, setTrendMetric] = useState('investment');
  const [sortBy, setSortBy] = useState('infrastructure_score');
  const [autoActionsEnabled, setAutoActionsEnabled] = useState(() => {
    return localStorage.getItem('autoActionsEnabled') === 'true';
  });

  const [aiTasks, setAiTasks] = useState(() => {
    const saved = localStorage.getItem('aiTasks');
    if (saved) return JSON.parse(saved);
    return [
      { id: 1, type: 'critical', title: 'Critical Issue: Oragadam Water Usage', desc: 'Multiple industries reported >200% water usage spike.', actions: ['Schedule Inspection', 'Issue Warning'] },
      { id: 2, type: 'success', title: 'Low Risk: 12 Lease Renewals', desc: 'Consistent high compliance scores for these industries.', actions: ['Auto-Approve Batch'] }
    ];
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

  const [electricityFlow, setElectricityFlow] = useState(450.5); // MW
  const [waterFlow, setWaterFlow] = useState(125.2); // ML/d

  useEffect(() => {
    const interval = setInterval(() => {
      setElectricityFlow(prev => {
        const change = (Math.random() - 0.5) * 5;
        return Math.max(0, Number((prev + change).toFixed(2)));
      });
      setWaterFlow(prev => {
        const change = (Math.random() - 0.5) * 1.5;
        return Math.max(0, Number((prev + change).toFixed(2)));
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const govElectricityRate = 7.50; // ₹ per kWh (unit)
  const govWaterRate = 45.00; // ₹ per kL

  // 1 MW = 1000 kW -> per hour it's 1000 kWh. Cost per hr = flow(MW) * 1000 * rate
  const currentElectricityCostPerHour = electricityFlow * 1000 * govElectricityRate;
  
  // 1 ML = 1000 kL. Cost per day = flow(ML) * 1000 * rate
  const currentWaterCostPerDay = waterFlow * 1000 * govWaterRate;

  // Mock data
  const kpis = {
    total_capex_cr: 24500, capex_growth_pct: 4.2,
    total_revenue_cr: 18200, revenue_growth_pct: 2.1,
    direct_employment: 89000, direct_growth_pct: 1.8,
    indirect_employment: 56000, indirect_growth_pct: 3.1,
    red_flags: 12, red_flags_change: -2,
  };

  const rankings = [
    { rank: 1, name: 'Oragadam', infrastructure_score: 94, total_industries: 187, total_investment_cr: 4200, total_employment: 23400 },
    { rank: 2, name: 'Siruseri IT Park', infrastructure_score: 92, total_industries: 95, total_investment_cr: 5600, total_employment: 42000 },
    { rank: 3, name: 'Sriperumbudur', infrastructure_score: 91, total_industries: 156, total_investment_cr: 3800, total_employment: 19800 },
    { rank: 4, name: 'Hosur', infrastructure_score: 88, total_industries: 143, total_investment_cr: 3200, total_employment: 18500 },
    { rank: 5, name: 'Gangaikondan', infrastructure_score: 72, total_industries: 34, total_investment_cr: 850, total_employment: 4200 },
  ];

  const alerts = [
    { id: 1, severity: 'critical', message: '12 industries missed Q1 2026 data submission deadline', count: 12 },
    { id: 2, severity: 'high', message: '3 parks operating below 70% infrastructure capacity', count: 3 },
    { id: 3, severity: 'high', message: '5 NOC service requests overdue by 15+ days', count: 5 },
    { id: 4, severity: 'medium', message: 'LMN Textiles reported 300% water usage spike', count: 1 },
    { id: 5, severity: 'low', message: '8 new industry registration requests pending', count: 8 },
  ];

  const investmentTrend = [
    { year: '2021', value: 16800 }, { year: '2022', value: 18500 },
    { year: '2023', value: 20200 }, { year: '2024', value: 22100 },
    { year: '2025', value: 24500 },
  ];

  const employmentTrend = [
    { year: '2021', value: 112000 }, { year: '2022', value: 121000 },
    { year: '2023', value: 130000 }, { year: '2024', value: 138000 },
    { year: '2025', value: 145000 },
  ];

  const heatmapData = [
    { district: 'Kancheepuram', parks: 4, industries: 373, investment_cr: 8700 },
    { district: 'Chengalpattu', parks: 1, industries: 95, investment_cr: 5600 },
    { district: 'Krishnagiri', parks: 1, industries: 143, investment_cr: 3200 },
    { district: 'Tirunelveli', parks: 1, industries: 34, investment_cr: 850 },
    { district: 'Tiruvannamalai', parks: 1, industries: 5, investment_cr: 120 },
  ];

  const activityFeed = [
    { id: 1, type: 'submission', message: 'ABC Industries submitted Q1 2026 data', severity: 'info', time: '10:30 AM' },
    { id: 2, type: 'violation', message: 'LMN Textiles flagged for water usage spike', severity: 'warning', time: '9:15 AM' },
    { id: 3, type: 'registration', message: 'Sunrise Foods completed registration', severity: 'info', time: 'Yesterday' },
    { id: 4, type: 'service', message: 'NOC Fire Safety approved for PQR Auto', severity: 'success', time: 'Yesterday' },
  ];

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: { xs: 2, md: 3 } }}>
        <Typography variant="h4" fontWeight={700} sx={{ fontSize: { xs: '1.4rem', sm: '1.75rem', md: '2.125rem' } }}>State Industrial Command Center</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '1rem' } }}>
          Real-time oversight of Tamil Nadu's industrial ecosystem
        </Typography>
      </Box>

      {/* KPI Row */}
      <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: { xs: 2, md: 3 } }}>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <KPICard title="Total CapEx" value={kpis.total_capex_cr} unit="Cr" growth={kpis.capex_growth_pct} icon={<CurrencyRupee fontSize="inherit" />} color="#1F4E79" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <KPICard title="Total Revenue" value={kpis.total_revenue_cr} unit="Cr" growth={kpis.revenue_growth_pct} icon={<Assessment fontSize="inherit" />} color="#2E7D32" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <KPICard title="Direct Jobs" value={kpis.direct_employment} unit="" growth={kpis.direct_growth_pct} icon={<People fontSize="inherit" />} color="#1565C0" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <KPICard title="Indirect Jobs" value={kpis.indirect_employment} unit="" growth={kpis.indirect_growth_pct} icon={<People fontSize="inherit" />} color="#00897B" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <KPICard title="Red Flags" value={kpis.red_flags} unit="" growth={kpis.red_flags_change} icon={<Flag fontSize="inherit" />} color="#d32f2f" />
        </Grid>
      </Grid>

      {/* Middle Section: Heatmap + Rankings */}
      <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: { xs: 2, md: 3 } }}>
        {/* District Investment Distribution */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: { xs: 2, sm: 3 }, height: '100%' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>District-wise Investment Distribution</Typography>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={heatmapData} layout="vertical" margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="district" type="category" width={100} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => [`Rs. ${value} Cr`, 'Investment']} />
                <Bar dataKey="investment_cr" fill="#1F4E79" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Park Rankings */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: { xs: 2, sm: 3 }, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="h6" fontWeight={600} sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>Park Performance Rankings</Typography>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Sort By</InputLabel>
                <Select value={sortBy} label="Sort By" onChange={(e) => setSortBy(e.target.value)}>
                  <MenuItem value="infrastructure_score">Infra Score</MenuItem>
                  <MenuItem value="total_investment_cr">Investment</MenuItem>
                  <MenuItem value="total_employment">Employment</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: { xs: 400, sm: 'auto' } }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Rank</TableCell>
                    <TableCell>Park</TableCell>
                    <TableCell align="right">Score</TableCell>
                    <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Industries</TableCell>
                    <TableCell align="right">Investment (Cr)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rankings.map((row) => (
                    <TableRow key={row.rank} hover>
                      <TableCell>
                        <Chip label={`#${row.rank}`} size="small" color={row.rank <= 3 ? 'primary' : 'default'} />
                      </TableCell>
                      <TableCell fontWeight={600}>{row.name}</TableCell>
                      <TableCell align="right">
                        <Chip label={`${row.infrastructure_score}/100`} size="small"
                          color={row.infrastructure_score >= 90 ? 'success' : row.infrastructure_score >= 70 ? 'warning' : 'error'} />
                      </TableCell>
                      <TableCell align="right" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{row.total_industries}</TableCell>
                      <TableCell align="right">{row.total_investment_cr.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Real-time Utility Tariffs & Flow */}
      <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: { xs: 2, md: 3 } }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: { xs: 2, sm: 3 }, height: '100%', borderTop: '4px solid #F57C00' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <ElectricBolt sx={{ mr: 1, color: '#F57C00' }} />
              <Typography variant="h6" fontWeight={600}>Electricity - Real-Time Flow & Tariffs</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <Typography variant="body2" color="text.secondary">Gov Allotted Charge</Typography>
                <Typography variant="h5" fontWeight={700} color="primary.main">₹ {govElectricityRate.toFixed(2)} <Typography component="span" variant="body2" color="text.secondary">/ unit (kWh)</Typography></Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="body2" color="text.secondary">Current Grid Flow</Typography>
                <Typography variant="h5" fontWeight={700} color="warning.main">{electricityFlow.toFixed(2)} <Typography component="span" variant="body2" color="text.secondary">MW</Typography></Typography>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Box sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: 1, mt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" fontWeight={600}>Estimated Run Rate</Typography>
                  <Typography variant="subtitle1" fontWeight={700} color="error.main">₹ {(currentElectricityCostPerHour / 100000).toFixed(2)} Lakhs / hr</Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: { xs: 2, sm: 3 }, height: '100%', borderTop: '4px solid #0288d1' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Opacity sx={{ mr: 1, color: '#0288d1' }} />
              <Typography variant="h6" fontWeight={600}>Water - Real-Time Flow & Tariffs</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <Typography variant="body2" color="text.secondary">Gov Allotted Charge</Typography>
                <Typography variant="h5" fontWeight={700} color="primary.main">₹ {govWaterRate.toFixed(2)} <Typography component="span" variant="body2" color="text.secondary">/ kL</Typography></Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="body2" color="text.secondary">Current Water Flow</Typography>
                <Typography variant="h5" fontWeight={700} color="info.main">{waterFlow.toFixed(2)} <Typography component="span" variant="body2" color="text.secondary">ML/d</Typography></Typography>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Box sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: 1, mt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" fontWeight={600}>Estimated Run Rate</Typography>
                  <Typography variant="subtitle1" fontWeight={700} color="error.main">₹ {(currentWaterCostPerDay / 100000).toFixed(2)} Lakhs / day</Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      {/* AI Decision Support & Workflow Engine */}
      <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: { xs: 2, md: 3 } }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: { xs: 2, sm: 3 }, height: '100%', borderTop: '4px solid #9c27b0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <SmartToy sx={{ mr: 1, color: '#9c27b0' }} />
                <Typography variant="h6" fontWeight={600}>AI Decision Support</Typography>
              </Box>
              <Chip label="Beta" size="small" color="secondary" variant="outlined" />
            </Box>
            <List dense>
              {aiTasks.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>No pending AI actions.</Typography>
              ) : (
                aiTasks.map(task => (
                  <ListItem key={task.id} sx={{ bgcolor: 'action.hover', borderRadius: 1, mb: 1, flexDirection: 'column', alignItems: 'flex-start' }}>
                    <Typography variant="subtitle2" fontWeight={600} color={task.type === 'critical' ? 'error' : 'success.main'}>{task.title}</Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>{task.desc}</Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {task.actions.map(action => (
                        <Button 
                          key={action} 
                          variant={action.includes('Warning') ? 'outlined' : 'contained'} 
                          color={task.type === 'critical' ? (action.includes('Warning') ? 'error' : 'primary') : 'success'} 
                          size="small"
                          onClick={() => handleAiAction(task.id, action)}
                          disabled={task.type === 'success' && autoActionsEnabled}
                        >
                          {action}
                        </Button>
                      ))}
                    </Box>
                  </ListItem>
                ))
              )}
            </List>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
           <Paper sx={{ p: { xs: 2, sm: 3 }, height: '100%', borderTop: '4px solid #00acc1' }}>
             <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
               <ElectricBolt sx={{ mr: 1, color: '#00acc1' }} />
               <Typography variant="h6" fontWeight={600}>Workflow Automation Engine</Typography>
             </Box>
             <Typography variant="body2" color="text.secondary" paragraph>
               Enable the rules-engine to automatically approve low-risk data submissions and escalate delayed requests.
             </Typography>
             
             <FormControlLabel 
                control={<Switch checked={autoActionsEnabled} onChange={handleToggleAutoActions} color="info" />} 
                label={autoActionsEnabled ? "Automated Actions: ENABLED" : "Automated Actions: PAUSED"} 
             />
             
             {autoActionsEnabled && (
                <Box sx={{ mt: 2, p: 1.5, bgcolor: 'info.light', color: 'info.contrastText', borderRadius: 1 }}>
                   <Typography variant="body2">
                      <CheckCircle fontSize="inherit" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                      Auto-approving NOCs for industries with compliance score &gt; 90.
                   </Typography>
                </Box>
             )}
           </Paper>
        </Grid>
      </Grid>

      {/* Bottom Section: Alerts + Trends */}
      <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: { xs: 2, md: 3 } }}>
        {/* Alerts */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper sx={{ p: { xs: 2, sm: 3 }, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <NotificationsActive sx={{ mr: 1, color: '#d32f2f' }} />
              <Typography variant="h6" fontWeight={600}>Alerts & Action Items</Typography>
            </Box>
            <List dense>
              {alerts.map((alert) => (
                <Box key={alert.id}>
                  <ListItem sx={{ borderLeft: `3px solid ${SEVERITY_COLORS[alert.severity]}`, mb: 1, borderRadius: 1, bgcolor: 'action.hover' }}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      {ALERT_ICONS[alert.severity]}
                    </ListItemIcon>
                    <ListItemText
                      primary={alert.message}
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                    <Chip label={alert.count} size="small" sx={{ bgcolor: SEVERITY_COLORS[alert.severity], color: 'white' }} />
                  </ListItem>
                </Box>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Trend Analysis */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: { xs: 2, sm: 3 }, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="h6" fontWeight={600} sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>5-Year Growth Trend</Typography>
              <ToggleButtonGroup size="small" value={trendMetric} exclusive onChange={(e, v) => v && setTrendMetric(v)}>
                <ToggleButton value="investment">Investment</ToggleButton>
                <ToggleButton value="employment">Employment</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendMetric === 'investment' ? investmentTrend : employmentTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip formatter={(value) => [
                  trendMetric === 'investment' ? `Rs. ${value.toLocaleString()} Cr` : value.toLocaleString(),
                  trendMetric === 'investment' ? 'Investment' : 'Employment'
                ]} />
                <Line type="monotone" dataKey="value" stroke="#1F4E79" strokeWidth={3} dot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Activity Feed */}
      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>Recent Activity Feed</Typography>
        <List dense>
          {activityFeed.map((item) => (
            <ListItem key={item.id} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                {item.severity === 'warning' ? <Warning color="warning" /> :
                 item.severity === 'success' ? <CheckCircle color="success" /> :
                 <Info color="info" />}
              </ListItemIcon>
              <ListItemText primary={item.message} secondary={item.time} />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Box>
  );
}
