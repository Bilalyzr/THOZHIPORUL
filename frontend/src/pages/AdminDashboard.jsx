import React from 'react';
import { 
  Box, 
  Grid, 
  Paper, 
  Typography, 
  Card, 
  CardContent, 
  Divider,
} from '@mui/material';
import FactoryIcon from '@mui/icons-material/Factory';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import EngineeringIcon from '@mui/icons-material/Engineering';
import BoltIcon from '@mui/icons-material/Bolt';

import { 
  BarChart, Bar, 
  LineChart, Line, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

function AdminDashboard() {
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
    </Box>
  );
}

export default AdminDashboard;
