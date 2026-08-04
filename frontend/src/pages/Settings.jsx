import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Switch, FormControlLabel, Button, Divider,
  CircularProgress, Alert, Snackbar, TextField, Chip, List, ListItem,
  ListItemIcon, ListItemText, MenuItem, Select, FormControl, InputLabel
} from '@mui/material';
import {
  Notifications, Palette, Security, Lock,
  VpnKey, Devices, Save, Download, CheckCircle
} from '@mui/icons-material';
import { accountService } from '../services/api';
import { createDashboardStyles } from '../utils/dashboardStyles';

export default function Settings() {
  const role = localStorage.getItem('role') || 'admin';
  const ds = createDashboardStyles(role);

  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    accountService.getSettings()
      .then(res => setSettings(res.data))
      .catch(() => setSnackbar({ open: true, message: 'Failed to load settings.', severity: 'error' }))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await accountService.updateSettings(settings);
      setSnackbar({ open: true, message: 'Settings saved!', severity: 'success' });
    } catch { setSnackbar({ open: true, message: 'Failed to save.', severity: 'error' }); }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setSnackbar({ open: true, message: 'Passwords do not match.', severity: 'error' }); return;
    }
    if (pwForm.newPassword.length < 6) {
      setSnackbar({ open: true, message: 'Password must be 6+ characters.', severity: 'error' }); return;
    }
    setPwSaving(true);
    try {
      await accountService.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setSnackbar({ open: true, message: 'Password changed!', severity: 'success' });
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed.', severity: 'error' });
    }
    setPwSaving(false);
  };

  const handleExport = () => {
    const data = { email: localStorage.getItem('userEmail'), role, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'thozhirporul_data.json'; a.click();
    URL.revokeObjectURL(url);
    setSnackbar({ open: true, message: 'Data exported.', severity: 'success' });
  };

  if (loading) return <Box display="flex" justifyContent="center" p={6}><CircularProgress /></Box>;

  return (
    <Box sx={ds.page}>
      <Box sx={{ mb: 3 }}>
        <Typography sx={ds.pageTitle}>Settings</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Manage your notifications, security, and preferences.</Typography>
      </Box>

      {/* Notifications */}
      <Paper sx={{ ...ds.paper, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Notifications sx={{ color: ds.colors.primary }} />
          <Typography sx={{ ...ds.sectionTitle, mb: 0 }}>Notification Preferences</Typography>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <FormControlLabel control={<Switch checked={settings?.notifications?.email !== false}
          onChange={(e) => { const n = { ...settings.notifications, email: e.target.checked }; setSettings({ ...settings, notifications: n }); }} />}
          label={<Box><Typography variant="body2" fontWeight={600}>Email Notifications</Typography><Typography variant="caption" color="text.secondary">Compliance alerts & reminders</Typography></Box>} />
        <br />
        <FormControlLabel control={<Switch checked={settings?.notifications?.sms === true}
          onChange={(e) => { const n = { ...settings.notifications, sms: e.target.checked }; setSettings({ ...settings, notifications: n }); }} />}
          label={<Box><Typography variant="body2" fontWeight={600}>SMS Notifications</Typography><Typography variant="caption" color="text.secondary">Critical alerts via SMS</Typography></Box>} />
        <br />
        <FormControlLabel control={<Switch checked={settings?.notifications?.portal !== false}
          onChange={(e) => { const n = { ...settings.notifications, portal: e.target.checked }; setSettings({ ...settings, notifications: n }); }} />}
          label={<Box><Typography variant="body2" fontWeight={600}>Portal Notifications</Typography><Typography variant="caption" color="text.secondary">In-app bell icon</Typography></Box>} />
        <Box sx={{ mt: 2 }}>
          <Button variant="contained" size="small" startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <Save />}
            onClick={handleSave} disabled={saving}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, bgcolor: ds.colors.primary }}>
            Save Preferences
          </Button>
        </Box>
      </Paper>

      {/* Display */}
      <Paper sx={{ ...ds.paper, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Palette sx={{ color: ds.colors.primary }} />
          <Typography sx={{ ...ds.sectionTitle, mb: 0 }}>Display & Language</Typography>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Language</InputLabel>
              <Select value={settings?.ui?.language || 'en'}
                onChange={(e) => setSettings({ ...settings, ui: { ...settings.ui, language: e.target.value } })} label="Language">
                <MenuItem value="en">English</MenuItem>
                <MenuItem value="ta">தமிழ் (Tamil)</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Theme</InputLabel>
              <Select value={settings?.ui?.theme || 'light'}
                onChange={(e) => setSettings({ ...settings, ui: { ...settings.ui, theme: e.target.value } })} label="Theme">
                <MenuItem value="light">Light</MenuItem>
                <MenuItem value="dark">Dark</MenuItem>
                <MenuItem value="system">System</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        <Box sx={{ mt: 2 }}>
          <Button variant="contained" size="small" startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <Save />}
            onClick={handleSave} disabled={saving}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, bgcolor: ds.colors.primary }}>
            Save Display
          </Button>
        </Box>
      </Paper>

      {/* Security */}
      <Paper sx={{ ...ds.paper, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Security sx={{ color: ds.colors.primary }} />
          <Typography sx={{ ...ds.sectionTitle, mb: 0 }}>Security</Typography>
        </Box>
        <Divider sx={{ mb: 2 }} />
        {/* 2FA status */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, borderRadius: 2, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', mb: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <VpnKey sx={{ color: '#2E7D32', fontSize: 20 }} />
            <Box>
              <Typography variant="body2" fontWeight={700}>Two-Factor Authentication</Typography>
              <Typography variant="caption" color="text.secondary">{role === 'admin' ? 'Enabled (Mandatory)' : 'Optional'}</Typography>
            </Box>
          </Box>
          <Chip icon={<CheckCircle sx={{ fontSize: 14 }} />} label={role === 'admin' ? 'Active' : 'Optional'}
            size="small" sx={{ fontWeight: 700, bgcolor: role === 'admin' ? '#bbf7d0' : '#fef3c7', color: role === 'admin' ? '#2E7D32' : '#d97706' }} />
        </Box>
        {/* Change password */}
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>Change Password</Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth size="small" type="password" label="Current Password" value={pwForm.currentPassword}
              onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" type="password" label="New Password" value={pwForm.newPassword}
              onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" type="password" label="Confirm Password" value={pwForm.confirmPassword}
              onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })} />
          </Grid>
        </Grid>
        <Box sx={{ mt: 2 }}>
          <Button variant="outlined" size="small" startIcon={pwSaving ? <CircularProgress size={14} color="inherit" /> : <Lock />}
            onClick={handleChangePassword} disabled={pwSaving || !pwForm.currentPassword || !pwForm.newPassword}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, borderColor: ds.colors.primary, color: ds.colors.primary }}>
            Change Password
          </Button>
        </Box>
      </Paper>

      {/* Account */}
      <Paper sx={{ ...ds.paper, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Devices sx={{ color: ds.colors.primary }} />
          <Typography sx={{ ...ds.sectionTitle, mb: 0 }}>Account Management</Typography>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <ListItem sx={{ borderRadius: 2, '&:hover': { bgcolor: 'action.hover' } }}>
          <ListItemIcon><Download /></ListItemIcon>
          <ListItemText primary="Export My Data" secondary="Download profile + submissions as JSON" />
          <Button size="small" variant="outlined" onClick={handleExport} sx={{ textTransform: 'none' }}>Export</Button>
        </ListItem>
      </Paper>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} sx={{ borderRadius: 2 }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
