import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip } from '@mui/material';
import { History } from '@mui/icons-material';

const mockLogs = [
  { id: 101, timestamp: "2026-05-06 14:22", action: "UPDATE_COMPLIANCE", user: "Admin (ID: 4)", target: "Industry ID 12", status: "SUCCESS" },
  { id: 102, timestamp: "2026-05-06 11:15", action: "APPROVE_NOC", user: "Gov Officer (ID: 2)", target: "Industry ID 8", status: "SUCCESS" },
  { id: 103, timestamp: "2026-05-05 09:45", action: "DELETE_RECORD", user: "Admin (ID: 4)", target: "Submission ID 450", status: "WARNING" },
  { id: 104, timestamp: "2026-05-04 16:30", action: "SYSTEM_BACKUP", user: "System", target: "Database", status: "SUCCESS" }
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
