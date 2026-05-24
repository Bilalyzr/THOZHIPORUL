import React from 'react';
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
  ListItemIcon
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AssignmentIcon from '@mui/icons-material/Assignment';

// Recharts components
import { 
  LineChart, Line, 
  BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

function IndustryDashboard() {
  // Get user's company name from localStorage or use default
  const companyName = localStorage.getItem('companyName') || localStorage.getItem('userName') || 'My Company';

  // Mock Data for the Industry Layout
  const complianceStatus = "Compliant";
  
  const mockChartData = [
    { month: 'Jan', power: 4200, water: 2400 },
    { month: 'Feb', power: 3000, water: 1398 },
    { month: 'Mar', power: 2000, water: 9800 },
    { month: 'Apr', power: 2780, water: 3908 },
    { month: 'May', power: 1890, water: 4800 },
    { month: 'Jun', power: 2390, water: 3800 },
    { month: 'Jul', power: 3490, water: 4300 },
  ];

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Header Area */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: { xs: 2, md: 4 }, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4" color="primary.main" fontWeight="bold" sx={{ fontSize: { xs: '1.4rem', sm: '1.75rem', md: '2.125rem' } }}>
          {companyName} Dashboard
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body1" color="text.secondary">Compliance Status:</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', color: 'secondary.main', bgcolor: '#e8f5e9', px: 2, py: 0.5, borderRadius: 1 }}>
            <CheckCircleIcon fontSize="small" sx={{ mr: 1 }} />
            <Typography variant="body2" fontWeight="bold">{complianceStatus}</Typography>
          </Box>
        </Box>
      </Box>

      {/* KPI Cards Row */}
      <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: { xs: 2, md: 4 } }}>
        {[
          { title: "Total Employees", value: "350", change: "+12%", icon: <PeopleIcon color="primary" fontSize="large" />, color: "primary.main" },
          { title: "Investment Data", value: "₹45 Cr", change: "+5%", icon: <AttachMoneyIcon color="success" fontSize="large" />, color: "success.main" },
          { title: "Power Usage", value: "145 kWh", change: "-2%", icon: <FlashOnIcon color="warning" fontSize="large" />, color: "warning.main" },
          { title: "Water Usage", value: "850 KL", change: "+4%", icon: <WaterDropIcon color="info" fontSize="large" />, color: "info.main" }
        ].map((kpi, index) => (
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
                  <Typography variant="h5" component="div" fontWeight="bold" color="text.primary">
                    {kpi.value}
                  </Typography>
                  <Typography variant="caption" sx={{ color: kpi.change.includes('+') ? 'success.main' : 'error.main', fontWeight: 'bold' }}>
                    {kpi.change} this quarter
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
              Resource Consumption Trajectory (2025)
            </Typography>
            <Divider sx={{ mb: 3 }} />
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E0E0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: 20 }} />
                <Line type="monotone" dataKey="power" stroke="#F57C00" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="water" stroke="#1F4E79" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Recent Data Submissions Feed */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card elevation={2} sx={{ height: '100%' }}>
            <CardHeader title="Recent Data Submissions" titleTypographyProps={{ variant: 'h6' }} />
            <Divider />
            <CardContent>
              <List>
                {[
                  { report: "Q4 Power Consumption", date: "Jan 15, 2026", status: "Approved" },
                  { report: "Annual CSR Filing", date: "Jan 10, 2026", status: "Approved" },
                  { report: "Q1 Employment Update", date: "Mar 1, 2026", status: "Pending" },
                ].map((item, index) => (
                  <ListItem key={index} divider={index !== 2}>
                    <ListItemIcon>
                      <AssignmentIcon color={item.status === 'Approved' ? 'success' : 'warning'} />
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.report} 
                      secondary={`Submitted: ${item.date}`}
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                    />
                    <Typography variant="caption" sx={{ 
                      color: item.status === 'Approved' ? 'secondary.main' : 'warning.main',
                      bgcolor: item.status === 'Approved' ? '#e8f5e9' : '#fff3e0',
                      px: 1, py: 0.5, borderRadius: 1, fontWeight: 'bold'
                    }}>
                      {item.status}
                    </Typography>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default IndustryDashboard;
