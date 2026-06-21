import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip } from '@mui/material';
import { History } from '@mui/icons-material';
const mockLogs = [
  { id: 10842, timestamp: '2026-06-20 21:45:12', action: 'USER_LOGIN', user: 'admin_nexora', target: 'Portal Entry', status: 'SUCCESS' },
  { id: 10841, timestamp: '2026-06-20 21:20:05', action: 'APPROVE_SUBMISSION', user: 'admin_nexora', target: 'Q4 Financial Data (Renault)', status: 'SUCCESS' },
  { id: 10840, timestamp: '2026-06-20 21:05:43', action: 'RESOLVE_GRIEVANCE', user: 'govt_officer_kancheepuram', target: 'Water leakage complain #832', status: 'SUCCESS' },
  { id: 10839, timestamp: '2026-06-20 20:30:19', action: 'SUBMIT_DATA', user: 'industry_foxconn', target: 'Q1 Employment Form', status: 'SUCCESS' },
  { id: 10838, timestamp: '2026-06-20 20:15:10', action: 'PLOT_ALLOTMENT', user: 'admin_nexora', target: 'Plot 42 (Sriperumbudur Hub)', status: 'SUCCESS' },
  { id: 10837, timestamp: '2026-06-20 19:40:02', action: 'UPDATE_COMPLIANCE', user: 'System Engine', target: 'Compliance Rules Recalculation', status: 'SUCCESS' }
];

export default function AuditLogViewer() {
  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Typography variant="h4" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <History sx={{ mr: 2, fontSize: 36, color: 'primary.main' }} /> System Audit Logs
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Immutable record of all critical administrative actions and system events.
      </Typography>

      <TableContainer component={Paper} sx={{ mt: 3 }}>
        <Table>
          <TableHead sx={{ bgcolor: 'background.default' }}>
            <TableRow>
              <TableCell>Log ID</TableCell>
              <TableCell>Timestamp</TableCell>
              <TableCell>Action Type</TableCell>
              <TableCell>User/Agent</TableCell>
              <TableCell>Target Entity</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {mockLogs.map(log => (
              <TableRow key={log.id} hover>
                <TableCell>#{log.id}</TableCell>
                <TableCell>{log.timestamp}</TableCell>
                <TableCell><Chip label={log.action} size="small" variant="outlined" /></TableCell>
                <TableCell>{log.user}</TableCell>
                <TableCell>{log.target}</TableCell>
                <TableCell>
                  <Chip 
                    label={log.status} 
                    size="small" 
                    color={log.status === 'SUCCESS' ? 'success' : 'warning'} 
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
