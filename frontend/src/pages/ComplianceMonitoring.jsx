import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  InputAdornment,
  TablePagination,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Grid,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  CircularProgress
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SendIcon from '@mui/icons-material/Send';
import VisibilityIcon from '@mui/icons-material/Visibility';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import HistoryIcon from '@mui/icons-material/History';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { submissionService, workspaceService } from '../services/api';

function ComplianceMonitoring() {
  const [role, setRole] = useState('admin');
  const [data, setData] = useState([]);
  const [industryScore, setIndustryScore] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);

  // Dialog States
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState(null);
  
  // Snackbar States
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const userRole = localStorage.getItem('role') || 'admin';
    setRole(userRole);

    const fetchData = async () => {
      try {
        if (userRole === 'industry') {
          const response = await workspaceService.getComplianceScore();
          setIndustryScore(response.data);
        } else {
          const response = await submissionService.getCompliance();
          setData(response.data);
        }
      } catch (error) {
        console.error("Error fetching compliance data:", error);
        setSnackbar({ open: true, message: 'Failed to fetch compliance data from server.', severity: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredData = data.filter(row =>
    (row.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (row.location || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSendReminder = (industryName) => {
    setSnackbar({ open: true, message: `Reminder sent to ${industryName} successfully!`, severity: 'info' });
  };

  const handleViewProfile = (row) => {
    setSelectedIndustry(row);
    setViewDialogOpen(true);
  };

  const handleExport = () => {
    setSnackbar({ open: true, message: 'Downloading compliance report...', severity: 'success' });
  };

  const getStatusChip = (status) => {
    switch(status) {
      case 'Compliant': return <Chip label={status} color="success" size="small" sx={{ fontWeight: 'bold' }} />;
      case 'Alert': return <Chip label={status} color="error" size="small" icon={<NotificationsActiveIcon fontSize="small"/>} sx={{ fontWeight: 'bold' }} />;
      case 'Warning': return <Chip label={status} color="warning" size="small" sx={{ fontWeight: 'bold' }} />;
      default: return <Chip label={status} size="small" />;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // ------------------------------------------------------------
  // Industry Perspective View
  // ------------------------------------------------------------
  if (role === 'industry') {
    if (!industryScore) {
      return (
        <Box sx={{ p: 3 }}>
          <Alert severity="warning">No compliance details available for your company profile.</Alert>
        </Box>
      );
    }

    const { current, history, tips } = industryScore;

    const getScoreColor = (score) => {
      if (score >= 80) return '#2E7D32'; // Green
      if (score >= 60) return '#4CAF50'; // Light Green
      if (score >= 40) return '#F57C00'; // Orange
      return '#d32f2f'; // Red
    };

    const getScoreLabel = (score) => {
      if (score >= 80) return 'Excellent';
      if (score >= 60) return 'Good';
      if (score >= 40) return 'Needs Attention';
      return 'Critical';
    };

    return (
      <Box sx={{ flexGrow: 1 }}>
        <Box sx={{ mb: { xs: 2, md: 4 } }}>
          <Typography variant="h4" color="primary.main" fontWeight="bold" sx={{ mb: 1, fontSize: { xs: '1.4rem', sm: '1.75rem', md: '2.125rem' } }}>
            My Compliance Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            View your real-time compliance health score, sub-category details, historical trends, and actionable recommendations.
          </Typography>
        </Box>

        <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: 4 }}>
          {/* Left: Score Overview & Category Breakdown */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper elevation={3} sx={{ p: 3, borderRadius: 3, height: '100%', border: '1px solid rgba(0,0,0,0.06)' }}>
              <Typography variant="h6" fontWeight={700} color="text.primary" sx={{ mb: 3 }}>
                Compliance Health
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
                <Box sx={{ 
                  position: 'relative', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  width: 140, 
                  height: 140, 
                  borderRadius: '50%', 
                  border: `8px solid ${getScoreColor(current.overall)}`,
                  boxShadow: `0 8px 24px ${getScoreColor(current.overall)}20`,
                  mb: 2,
                  background: 'rgba(255, 255, 255, 0.9)',
                }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" fontWeight={800} color={getScoreColor(current.overall)} sx={{ lineHeight: 1 }}>
                      {current.overall}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      /100
                    </Typography>
                  </Box>
                </Box>
                <Chip 
                  label={getScoreLabel(current.overall)} 
                  sx={{ 
                    bgcolor: getScoreColor(current.overall), 
                    color: 'white', 
                    fontWeight: 700, 
                    fontSize: '0.9rem', 
                    px: 1.5,
                    boxShadow: `0 4px 12px ${getScoreColor(current.overall)}40` 
                  }} 
                />
              </Box>

              <Divider sx={{ my: 3 }} />

              <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Category Breakdown
              </Typography>

              {[
                { label: 'Reporting & Submission', value: current.submission },
                { label: 'Environmental Standards', value: current.environmental },
                { label: 'Financial Compliance', value: current.financial },
                { label: 'Workplace Safety', value: current.safety },
              ].map((item, index) => (
                <Box key={index} sx={{ mb: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" fontWeight={600} color="text.primary">{item.label}</Typography>
                    <Typography variant="body2" fontWeight={700} color={getScoreColor(item.value)}>{item.value}/100</Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={item.value} 
                    sx={{ 
                      height: 8, 
                      borderRadius: 4, 
                      bgcolor: 'grey.100', 
                      '& .MuiLinearProgress-bar': { 
                        bgcolor: getScoreColor(item.value), 
                        borderRadius: 4 
                      } 
                    }} 
                  />
                </Box>
              ))}
            </Paper>
          </Grid>

          {/* Right: Trend Chart & Actionable Tips */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, height: '100%' }}>
              {/* Compliance Trend Chart */}
              <Paper elevation={3} sx={{ p: 3, borderRadius: 3, border: '1px solid rgba(0,0,0,0.06)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <HistoryIcon color="primary" />
                  <Typography variant="h6" fontWeight={700} color="text.primary">
                    Historical Compliance Trend
                  </Typography>
                </Box>
                <Box sx={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
                      <XAxis 
                        dataKey="month" 
                        stroke="rgba(0,0,0,0.4)" 
                        fontWeight={500}
                        fontSize={12}
                        tickLine={false}
                      />
                      <YAxis 
                        domain={[40, 100]} 
                        stroke="rgba(0,0,0,0.4)" 
                        fontWeight={500}
                        fontSize={12}
                        tickLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                          borderRadius: 12, 
                          border: '1px solid #E2E8F0',
                          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)'
                        }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="overall" 
                        name="Overall Score"
                        stroke="#1F4E79" 
                        strokeWidth={3} 
                        activeDot={{ r: 8 }} 
                        dot={{ r: 4, strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>

              {/* Recommendations/Tips */}
              <Paper elevation={3} sx={{ p: 3, borderRadius: 3, flex: 1, border: '1px solid rgba(0,0,0,0.06)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <LightbulbIcon sx={{ color: '#F57C00' }} />
                  <Typography variant="h6" fontWeight={700} color="text.primary">
                    Actionable Improvement Plan
                  </Typography>
                </Box>
                
                <List sx={{ p: 0 }}>
                  {tips.map((tip, index) => (
                    <ListItem 
                      key={index} 
                      sx={{ 
                        p: 2, 
                        mb: 1.5, 
                        borderRadius: 2.5, 
                        bgcolor: 'rgba(245, 124, 0, 0.04)',
                        border: '1px solid rgba(245, 124, 0, 0.1)',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                        '&:hover': {
                          transform: 'translateY(-1px)',
                          boxShadow: '0 4px 12px rgba(245, 124, 0, 0.08)'
                        }
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          width: 28, 
                          height: 28, 
                          borderRadius: '50%', 
                          bgcolor: 'rgba(245, 124, 0, 0.12)',
                          color: '#F57C00'
                        }}>
                          <TrendingUpIcon fontSize="small" />
                        </Box>
                      </ListItemIcon>
                      <ListItemText 
                        primary={tip} 
                        primaryTypographyProps={{ 
                          variant: 'body2', 
                          fontWeight: 600, 
                          color: 'text.primary' 
                        }} 
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Box>
          </Grid>
        </Grid>
      </Box>
    );
  }

  // ------------------------------------------------------------
  // Government/Admin Perspective View
  // ------------------------------------------------------------
  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: { xs: 2, md: 4 }, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h4" color="primary.main" fontWeight="bold" sx={{ fontSize: { xs: '1.4rem', sm: '1.75rem', md: '2.125rem' } }}>
            Compliance Monitoring
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Global view of industrial reporting compliance and delays.
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={handleExport}>
          Export Non-Compliant Report
        </Button>
      </Box>

      <Paper elevation={3} sx={{ width: '100%', mb: 2, borderRadius: 2 }}>
        {/* Toolbar / Search */}
        <Box sx={{ p: { xs: 1.5, sm: 2 }, display: 'flex', alignItems: 'center', borderBottom: '1px solid #E0E0E0' }}>
          <TextField
            variant="outlined"
            placeholder="Search industries by name or location..."
            size="small"
            fullWidth
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
            sx={{ maxWidth: { xs: '100%', sm: 400 } }}
          />
        </Box>

        {/* Data Table */}
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table aria-label="compliance monitoring table">
            <TableHead sx={{ bgcolor: 'rgba(31, 78, 121, 0.05)' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Industry Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Location</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Last Submission Date</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Compliance Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', color: 'primary.main' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredData
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell component="th" scope="row" sx={{ fontWeight: 500 }}>
                    {row.name}
                  </TableCell>
                  <TableCell>{row.location}</TableCell>
                  <TableCell sx={{ color: row.lastSubmission === 'Missing' ? 'error.main' : 'inherit', fontWeight: row.lastSubmission === 'Missing' ? 'bold' : 'normal' }}>
                    {row.lastSubmission}
                  </TableCell>
                  <TableCell>
                    {getStatusChip(row.status)}
                  </TableCell>
                  <TableCell align="right">
                    {row.status !== 'Compliant' && (
                      <IconButton color="primary" onClick={() => handleSendReminder(row.name)} title="Send Reminder">
                        <SendIcon />
                      </IconButton>
                    )}
                    <IconButton color="secondary" onClick={() => handleViewProfile(row)} title="View Details">
                      <VisibilityIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {filteredData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                    <Typography color="text.secondary">No matching records found.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ bgcolor: 'secondary.main', color: 'white' }}>Industry Details</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedIndustry && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="h6"><strong>{selectedIndustry.name}</strong></Typography>
              <Typography><strong>Location:</strong> {selectedIndustry.location}</Typography>
              <Typography><strong>Compliance:</strong> {selectedIndustry.status}</Typography>
              <Typography><strong>Last Submission:</strong> {selectedIndustry.lastSubmission}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Full historical data and submission logs are available in the specific Industry profile section.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          <Button variant="contained" color="primary" onClick={() => setViewDialogOpen(false)}>Download Profile PDF</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}

export default ComplianceMonitoring;
