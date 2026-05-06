import React, { useState } from 'react';
import { 
  Box, 
  Container, 
  Paper, 
  Typography, 
  TextField, 
  Button, 
  Grid, 
  Switch, 
  FormControlLabel, 
  Divider, 
  Alert,
  List,
  ListItem,
  ListItemText,
  Stack,
  Snackbar,
  CircularProgress
} from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import BackupIcon from '@mui/icons-material/Backup';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';

function Settings() {
  const [isApplying, setIsApplying] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSave = () => {
    setIsApplying(true);
    setTimeout(() => {
        setIsApplying(false);
        showSnackbar("System settings have been successfully applied.");
    }, 1500);
  };

  const handleManualBackup = () => {
    setIsBackingUp(true);
    setTimeout(() => {
        setIsBackingUp(false);
        showSnackbar("Manual database synchronization initiated.");
    }, 2000);
  };

  const handleViewLogs = () => {
    showSnackbar("Retrieving security and audit logs...", "info");
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" color="primary.main" fontWeight="bold" gutterBottom sx={{ fontSize: { xs: '1.4rem', sm: '1.75rem', md: '2.125rem' } }}>
        System Settings
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: { xs: 2, md: 4 } }}>
        Manage platform-wide configurations, security protocols, and backups.
      </Typography>

      <Grid container spacing={{ xs: 2, md: 4 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper elevation={2} sx={{ mb: 4, borderRadius: 4, overflow: 'hidden' }}>
            <Box sx={{ bgcolor: 'secondary.main', color: 'white', px: { xs: 2, sm: 3 }, py: 1.5, display: 'flex', alignItems: 'center' }}>
              <SecurityIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Security Configurations</Typography>
            </Box>
            <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
              <Stack spacing={3}>
                <FormControlLabel control={<Switch defaultChecked />} label="Two-Factor Authentication (2FA) for Admins" />
                <FormControlLabel control={<Switch defaultChecked />} label="Strict Password Policy (Length/Complexity)" />
                <FormControlLabel control={<Switch />} label="Restrict Login to Government IP Ranges" />
                <TextField select fullWidth label="Session Timeout Duration" defaultValue="8h" SelectProps={{ native: true }}>
                  <option value="1h">1 Hour</option>
                  <option value="4h">4 Hours</option>
                  <option value="8h">8 Hours</option>
                  <option value="24h">24 Hours</option>
                </TextField>
              </Stack>
            </Box>
          </Paper>

          <Paper elevation={2} sx={{ borderRadius: 4, overflow: 'hidden' }}>
            <Box sx={{ bgcolor: 'primary.main', color: 'white', px: { xs: 2, sm: 3 }, py: 1.5, display: 'flex', alignItems: 'center' }}>
              <BackupIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Data Backup & Recovery</Typography>
            </Box>
            <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
              <Typography variant="body2" color="text.secondary" paragraph>
                Automated backups are scheduled every 24 hours to the secure NEXORA Government Cloud. 
              </Typography>
              <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
                <Button 
                    variant="outlined" 
                    color="primary" 
                    startIcon={isBackingUp ? <CircularProgress size={18} /> : <BackupIcon />} 
                    onClick={handleManualBackup}
                    disabled={isBackingUp}
                >
                  {isBackingUp ? 'Backing Up...' : 'Trigger Manual Backup'}
                </Button>
                <Button variant="outlined" color="secondary" onClick={handleViewLogs}>View Backup Logs</Button>
              </Stack>
              <FormControlLabel control={<Switch defaultChecked />} label="Enable Email notifications for backup success/failure" />
            </Box>
          </Paper>

          <Box sx={{ mt: 4, textAlign: 'right' }}>
            <Button 
                variant="contained" 
                color="primary" 
                size="large" 
                onClick={handleSave} 
                sx={{ px: 6 }}
                disabled={isApplying}
                startIcon={isApplying && <CircularProgress size={20} color="inherit" />}
            >
              {isApplying ? 'Applying...' : 'Apply Settings'}
            </Button>
          </Box>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 4 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <SettingsSuggestIcon sx={{ mr: 1, color: 'primary.main' }} /> System Info
            </Typography>
            <Divider sx={{ my: 2 }} />
            <List dense>
              <ListItem>
                <ListItemText primary="Software Version" secondary="THOZHIRPORUL v1.0.4-production" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Build Date" secondary="March 16, 2026" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Environment" secondary="Gov-Cloud Environment" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Uptime" secondary="99.98% (Past 30 Days)" />
              </ListItem>
            </List>
          </Paper>
        </Grid>
      </Grid>
      
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

export default Settings;
