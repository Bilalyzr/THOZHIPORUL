import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, CircularProgress, Alert } from '@mui/material';
import { History } from '@mui/icons-material';
import { auditService } from '../services/api';

const formatTimestamp = (ts) => {
  if (!ts) return '—';
  const d = new Date(ts);
  return isNaN(d.getTime()) ? ts : d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

// Split "ACTION_TYPE — target detail" into a chip label + target cell.
const parseAction = (action) => {
  if (!action) return { type: 'EVENT', target: '—' };
  const parts = action.split(/\s+—\s+/);
  return { type: parts[0], target: parts[1] || '—' };
};

export default function AuditLogViewer() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await auditService.getLogs(200);
        if (active) setLogs(res.data.logs || []);
      } catch (err) {
        console.error('Failed to load audit logs', err);
        if (active) setError('Unable to load audit logs. Please ensure you are signed in with an administrative account.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Typography variant="h4" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <History sx={{ mr: 2, fontSize: 36, color: 'primary.main' }} /> System Audit Logs
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Immutable record of all critical administrative actions and system events.
      </Typography>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

      {!loading && !error && logs.length === 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>No audit events recorded yet.</Alert>
      )}

      {!loading && !error && logs.length > 0 && (
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
              {logs.map(log => {
                const { type, target } = parseAction(log.action);
                return (
                  <TableRow key={log.id} hover>
                    <TableCell>#{log.id}</TableCell>
                    <TableCell>{formatTimestamp(log.timestamp)}</TableCell>
                    <TableCell><Chip label={type} size="small" variant="outlined" /></TableCell>
                    <TableCell>{log.user}</TableCell>
                    <TableCell>{target}</TableCell>
                    <TableCell>
                      <Chip
                        label={log.status}
                        size="small"
                        color={log.status === 'SUCCESS' ? 'success' : 'warning'}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
