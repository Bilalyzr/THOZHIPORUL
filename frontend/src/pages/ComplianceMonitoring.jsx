import React, { useState } from 'react';
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
  Alert
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SendIcon from '@mui/icons-material/Send';
import VisibilityIcon from '@mui/icons-material/Visibility';

const initialComplianceData = [
  { id: 1, name: "ABC Industries", location: "Oragadam", lastSubmission: "Jan 15, 2026", status: "Compliant" },
  { id: 2, name: "XYZ Manufacturing", location: "Sriperumbudur", lastSubmission: "Missing", status: "Alert" },
  { id: 3, name: "LMN Textiles", location: "Hosur", lastSubmission: "Feb 02, 2026", status: "Compliant" },
  { id: 4, name: "Global Auto Parts", location: "Cheyyar", lastSubmission: "Dec 30, 2025", status: "Warning" },
  { id: 5, name: "TechNova IT", location: "Siruseri", lastSubmission: "Missing", status: "Alert" },
  { id: 6, name: "Sunrise Foods", location: "Thoothukudi", lastSubmission: "Feb 10, 2026", status: "Compliant" },
];

function ComplianceMonitoring() {
  const [data] = useState(initialComplianceData);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Dialog States
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState(null);
  
  // Snackbar States
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const filteredData = data.filter(row => 
    row.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    row.location.toLowerCase().includes(searchTerm.toLowerCase())
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
