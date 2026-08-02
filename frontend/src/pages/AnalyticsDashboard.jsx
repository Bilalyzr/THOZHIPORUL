import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Divider,
  CircularProgress,
} from '@mui/material';

import {
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

import { parkService } from '../services/api';

// Strip the common "Industrial Park" / "IT Park" suffix for cleaner chart labels
const shortenParkName = (name = '') =>
  name.replace(/\s+(Industrial Park|IT Park|Park)$/i, '').trim() || name;

function AnalyticsDashboard() {

  const [loading, setLoading] = useState(true);
  const [investmentByParkData, setInvestmentByParkData] = useState([]);
  const [employmentByParkData, setEmploymentByParkData] = useState([]);
  const [industriesByDistrictData, setIndustriesByDistrictData] = useState([]);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        // Use park-level totals (same source as the GIS Explorer & homepage) so
        // per-park figures are consistent across every macro view of the platform.
        const { data } = await parkService.getAll();
        if (!isMounted) return;

        const parks = Array.isArray(data) ? data : (data?.parks || []);

        // Bar chart: Total investment (Cr) by industrial park (highest first)
        setInvestmentByParkData(
          parks
            .map((p) => ({
              park: shortenParkName(p.name),
              investment: Math.round(parseFloat(p.total_investment_cr) || 0),
            }))
            .sort((a, b) => b.investment - a.investment)
        );

        // Line chart: Employment generated per industrial park
        setEmploymentByParkData(
          parks.map((p) => ({
            park: shortenParkName(p.name),
            jobs: parseInt(p.total_employment, 10) || 0,
          }))
        );

        // Pie chart: Industries distributed across districts (aggregated from parks)
        const byDistrict = {};
        parks.forEach((p) => {
          const district = p.district || 'Other';
          byDistrict[district] = (byDistrict[district] || 0) + (parseInt(p.total_industries, 10) || 0);
        });
        setIndustriesByDistrictData(
          Object.entries(byDistrict)
            .map(([name, value]) => ({ name, value }))
            .filter((d) => d.value > 0)
        );
      } catch (err) {
        console.error('Failed to load analytics dashboard data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  const COLORS = ['#1F4E79', '#2E7D32', '#F57C00', '#0288D1', '#7B1FA2', '#D32F2F'];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

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
            {investmentByParkData.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={investmentByParkData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E0E0" />
                  <XAxis dataKey="park" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: 8, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="investment" fill="#1F4E79" radius={[8, 8, 0, 0]} barSize={60} name="Investment (Cr)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 8 }}>
                No investment data available.
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Row 2: Line Chart & Pie Chart */}
      <Grid container spacing={{ xs: 2, md: 3 }}>
        {/* Line Chart (Employment by Park) */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper elevation={2} sx={{ p: { xs: 2, sm: 3, md: 4 }, height: '100%', minHeight: { xs: 280, md: 400 } }}>
            <Typography variant="h6" color="secondary.main" gutterBottom>
              Employment Generated by Industrial Park
            </Typography>
            <Divider sx={{ mb: { xs: 2, md: 4 } }} />
            {employmentByParkData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={employmentByParkData} margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E0E0" />
                  <XAxis dataKey="park" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8 }} />
                  <Line type="monotone" dataKey="jobs" stroke="#2E7D32" strokeWidth={5} dot={{ r: 6, fill: "#2E7D32", strokeWidth: 2, stroke: "#FFF" }} activeDot={{ r: 8 }} name="Total Jobs Generated" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 8 }}>
                No employment data available.
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Pie Chart (Industries by District) */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper elevation={2} sx={{ p: { xs: 2, sm: 3, md: 4 }, height: '100%', minHeight: { xs: 280, md: 400 } }}>
            <Typography variant="h6" color="warning.main" gutterBottom>
              Industries by District
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {industriesByDistrictData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={industriesByDistrictData}
                    cx="50%"
                    cy="50%"
                    outerRadius={110}
                    innerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                  >
                    {industriesByDistrictData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8 }} />
                  <Legend iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 8 }}>
                No district data available.
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

    </Box>
  );
}

export default AnalyticsDashboard;
