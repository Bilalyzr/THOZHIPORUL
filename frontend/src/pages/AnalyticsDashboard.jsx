import React from 'react';
import { 
  Box, 
  Grid, 
  Paper, 
  Typography, 
  Divider,
} from '@mui/material';

import { 
  BarChart, Bar, 
  LineChart, Line, 
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

function AnalyticsDashboard() {

  const investmentByParkData = [
    { park: 'Oragadam', investment: 15400 },
    { park: 'Sriperumbudur', investment: 12200 },
    { park: 'Hosur', investment: 8500 },
    { park: 'Cheyyar', investment: 3200 },
    { park: 'Thoothukudi', investment: 2800 },
    { park: 'Gangaikondan', investment: 1500 }
  ];

  const employmentGrowthData = [
    { year: '2021', jobs: 105000 },
    { year: '2022', jobs: 118000 },
    { year: '2023', jobs: 130000 },
    { year: '2024', jobs: 142000 },
    { year: '2025', jobs: 150000 }
  ];

  const industryTypeData = [
    { name: 'Automotive', value: 450 },
    { name: 'Electronics', value: 320 },
    { name: 'Textiles', value: 210 },
    { name: 'Pharmaceuticals', value: 140 },
    { name: 'Chemicals', value: 90 },
    { name: 'Others', value: 40 }
  ];

  const COLORS = ['#1F4E79', '#2E7D32', '#F57C00', '#0288D1', '#7B1FA2', '#D32F2F'];

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ mb: { xs: 2, md: 4 } }}>
        <Typography variant="h4" color="primary.main" fontWeight="bold" sx={{ fontSize: { xs: '1.4rem', sm: '1.75rem', md: '2.125rem' } }}>
          Industrial Analytics
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Deep dive visualizations for NEXORA and Government Policy Planning.
        </Typography>
      </Box>

      {/* Row 1: Bar Chart (Investment by Park) */}
      <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: { xs: 2, md: 4 } }}>
        <Grid size={{ xs: 12 }}>
          <Paper elevation={2} sx={{ p: { xs: 2, sm: 3, md: 4 }, height: '100%', minHeight: { xs: 300, md: 450 } }}>
            <Typography variant="h6" color="primary.main" gutterBottom>
              Total Investment by Industrial Park (in Crores)
            </Typography>
            <Divider sx={{ mb: { xs: 2, md: 4 } }} />
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={investmentByParkData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E0E0" />
                <XAxis dataKey="park" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: 8, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="investment" fill="#1F4E79" radius={[8, 8, 0, 0]} barSize={60} name="Investment (Cr)" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Row 2: Line Chart & Pie Chart */}
      <Grid container spacing={{ xs: 2, md: 3 }}>
        {/* Line Chart (Employment) */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper elevation={2} sx={{ p: { xs: 2, sm: 3, md: 4 }, height: '100%', minHeight: { xs: 280, md: 400 } }}>
            <Typography variant="h6" color="secondary.main" gutterBottom>
              Employment Growth Over Time
            </Typography>
            <Divider sx={{ mb: { xs: 2, md: 4 } }} />
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={employmentGrowthData} margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E0E0" />
                <XAxis dataKey="year" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8 }} />
                <Line type="monotone" dataKey="jobs" stroke="#2E7D32" strokeWidth={5} dot={{ r: 6, fill: "#2E7D32", strokeWidth: 2, stroke: "#FFF" }} activeDot={{ r: 8 }} name="Total Jobs Generated" />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Pie Chart (Industry Types) */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper elevation={2} sx={{ p: { xs: 2, sm: 3, md: 4 }, height: '100%', minHeight: { xs: 280, md: 400 } }}>
            <Typography variant="h6" color="warning.main" gutterBottom>
              Industry Type Distribution
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={industryTypeData}
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  innerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                >
                  {industryTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8 }} />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

    </Box>
  );
}

export default AnalyticsDashboard;
