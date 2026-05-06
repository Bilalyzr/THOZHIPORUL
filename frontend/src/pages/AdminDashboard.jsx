import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Grid, 
  Paper, 
  Typography, 
  Card, 
  CardContent, 
  Divider,
  List, ListItem, Button, Chip, Switch, FormControlLabel
} from '@mui/material';
import FactoryIcon from '@mui/icons-material/Factory';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import EngineeringIcon from '@mui/icons-material/Engineering';
import BoltIcon from '@mui/icons-material/Bolt';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ElectricBoltIcon from '@mui/icons-material/ElectricBolt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import OpacityIcon from '@mui/icons-material/Opacity';

import { 
  BarChart, Bar, 
  LineChart, Line, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

function AdminDashboard() {
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

  const currentElectricityCostPerHour = electricityFlow * 1000 * govElectricityRate;
  const currentWaterCostPerDay = waterFlow * 1000 * govWaterRate;

  const kpiData = [
    { title: "Total Industries", value: "1,250", change: "+12% growth", icon: <FactoryIcon fontSize="large" color="primary" />, color: "primary.main" },
    { title: "Total Investment", value: "₹24,500 Cr", change: "+8% this year", icon: <AccountBalanceIcon fontSize="large" color="success" />, color: "success.main" },
    { title: "Total Employment", value: "145,000", change: "+4% this quarter", icon: <EngineeringIcon fontSize="large" color="info" />, color: "info.main" },
    { title: "Total Power Consumption", value: "450 MW", change: "-2% efficiency", icon: <BoltIcon fontSize="large" color="warning" />, color: "warning.main" }
  ];

  const industryGrowthData = [
    { year: '2021', units: 850 },
    { year: '2022', units: 920 },
    { year: '2023', units: 1050 },
    { year: '2024', units: 1150 },
    { year: '2025', units: 1250 }
  ];

  const resourceData = [
    { park: 'Oragadam', power: 120, water: 80 },
    { park: 'Sriperumbudur', power: 150, water: 110 },
    { park: 'Hosur', power: 90, water: 60 },
    { park: 'Cheyyar', power: 60, water: 45 },
    { park: 'Thoothukudi', power: 30, water: 25 },
  ];

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ mb: { xs: 2, md: 4 } }}>
        <Typography variant="h4" color="primary.main" fontWeight="bold" sx={{ fontSize: { xs: '1.4rem', sm: '1.75rem', md: '2.125rem' } }}>
          NEXORA Administrative Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '1rem' } }}>
          Global overview of all industrial park metrics.
        </Typography>
      </Box>

      {/* KPI Cards Row */}
      <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: { xs: 2, md: 4 } }}>
        {kpiData.map((kpi, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
            <Card elevation={2}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', p: { xs: 2, sm: 3 } }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {kpi.title}
                  </Typography>
                  <Typography variant="h5" component="div" fontWeight="bold" color="text.primary">
                    {kpi.value}
                  </Typography>
                  <Typography variant="caption" sx={{ color: kpi.change.includes('+') ? 'success.main' : 'error.main', fontWeight: 'bold' }}>
                    {kpi.change}
                  </Typography>
                </Box>
                <Box sx={{ 
                  bgcolor: `${kpi.color}15`, 
                  p: 1.5, 
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
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
                <Tooltip cursor={{fill: 'rgba(31, 78, 121, 0.05)'}} contentStyle={{ borderRadius: 8 }} />
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
          <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 }, height: '100%', borderTop: '4px solid #F57C00' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <ElectricBoltIcon sx={{ mr: 1, color: '#F57C00' }} />
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
          <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 }, height: '100%', borderTop: '4px solid #0288d1' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <OpacityIcon sx={{ mr: 1, color: '#0288d1' }} />
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
      <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 }, height: '100%', borderTop: '4px solid #9c27b0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <SmartToyIcon sx={{ mr: 1, color: '#9c27b0' }} />
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
           <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 }, height: '100%', borderTop: '4px solid #00acc1' }}>
             <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
               <ElectricBoltIcon sx={{ mr: 1, color: '#00acc1' }} />
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
                      <CheckCircleIcon fontSize="inherit" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                      Auto-approving NOCs for industries with compliance score &gt; 90.
                   </Typography>
                </Box>
             )}
           </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default AdminDashboard;
