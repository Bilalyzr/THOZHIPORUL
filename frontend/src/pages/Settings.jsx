import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, TextField, Button, Grid, Switch,
  FormControlLabel, Divider, Alert, List, ListItem, ListItemText,
  Stack, Snackbar, CircularProgress, MenuItem
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PaletteIcon from '@mui/icons-material/Palette';
import TranslateIcon from '@mui/icons-material/Translate';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import { accountService } from '../services/api';
import { useLanguage } from '../context/useLanguage';

function Settings() {
  const { lang, setLang } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Real persisted preferences.
  const [prefs, setPrefs] = useState({
    notifications: { email: true, sms: false, portal: true },
    ui: { theme: 'light', language: 'en' }
  });

  useEffect(() => {
    let active = true;
    accountService.getSettings()
      .then((res) => {
        if (!active) return;
        if (res.data) setPrefs({
          notifications: { email: true, sms: false, portal: true, ...res.data.notifications },
          ui: { theme: 'light', language: 'en', ...res.data.ui }
        });
      })
      .catch(() => setSnackbar({ open: true, message: 'Failed to load settings.', severity: 'error' }))
      .finally(() => setLoading(false));
    return () => { active = false; };
  }, []);

  const toggleNotif = (key) => (e) => {
    setPrefs((p) => ({ ...p, notifications: { ...p.notifications, [key]: e.target.checked } }));
  };

  // Returns a change-handler for a UI pref field (theme / language).
  const handleUIChange = (field) => (e) => {
    const val = e.target.value;
    setPrefs((prev) => {
      const nextUi = { ...prev.ui, [field]: val };
      return { ...prev, ui: nextUi };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await accountService.updateSettings(prefs);
      // Reflect the language choice immediately across the app.
      if (prefs.ui.language !== lang) setLang(prefs.ui.language);
      setSnackbar({ open: true, message: 'Settings saved successfully.', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Failed to save settings.', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" color="primary.main" fontWeight="bold" gutterBottom sx={{ fontSize: { xs: '1.4rem', sm: '1.75rem', md: '2.125rem' } }}>
        Settings
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: { xs: 2, md: 4 } }}>
        Manage your notification preferences, appearance, and language. Changes are saved to your account.
      </Typography>

      <Grid container spacing={{ xs: 2, md: 4 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          {/* Notification preferences — real, persisted */}
          <Paper elevation={2} sx={{ mb: 4, borderRadius: 4, overflow: 'hidden' }}>
            <Box sx={{ bgcolor: 'primary.main', color: 'white', px: { xs: 2, sm: 3 }, py: 1.5, display: 'flex', alignItems: 'center' }}>
              <NotificationsIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Notification Preferences</Typography>
            </Box>
            <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
              <Typography variant="body2" color="text.secondary" paragraph>
                Choose how you want to be notified about compliance alerts, document expiries, and service updates.
              </Typography>
              <Stack spacing={2}>
                <FormControlLabel
                  control={<Switch checked={!!prefs.notifications.email} onChange={toggleNotif('email')} />}
                  label="Email notifications"
                />
                <FormControlLabel
                  control={<Switch checked={!!prefs.notifications.portal} onChange={toggleNotif('portal')} />}
                  label="In-app / portal notifications"
                />
                <FormControlLabel
                  control={<Switch checked={!!prefs.notifications.sms} onChange={toggleNotif('sms')} />}
                  label="SMS notifications"
                />
              </Stack>
            </Box>
          </Paper>

          {/* Appearance + language — real, persisted */}
          <Paper elevation={2} sx={{ borderRadius: 4, overflow: 'hidden' }}>
            <Box sx={{ bgcolor: 'secondary.main', color: 'white', px: { xs: 2, sm: 3 }, py: 1.5, display: 'flex', alignItems: 'center' }}>
              <PaletteIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Appearance &amp; Language</Typography>
            </Box>
            <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                <TextField
                  select
                  fullWidth
                  label="Theme"
                  value={prefs.ui.theme}
                  onChange={handleUIChange('theme')}
                >
                  <MenuItem value="light">Light</MenuItem>
                  <MenuItem value="dark">Dark</MenuItem>
                </TextField>
                <TextField
                  select
                  fullWidth
                  label="Language"
                  value={prefs.ui.language}
                  onChange={handleUIChange('language')}
                  InputProps={{ startAdornment: <TranslateIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
                >
                  <MenuItem value="en">English</MenuItem>
                  <MenuItem value="ta">தமிழ் (Tamil)</MenuItem>
                </TextField>
              </Stack>
            </Box>
          </Paper>

          <Box sx={{ mt: 4, textAlign: 'right' }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={handleSave}
              sx={{ px: 6 }}
              disabled={saving}
              startIcon={saving && <CircularProgress size={20} color="inherit" />}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </Box>
        </Grid>

        {/* System info — informational */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 4 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <SettingsSuggestIcon sx={{ mr: 1, color: 'primary.main' }} /> System Info
            </Typography>
            <Divider sx={{ my: 2 }} />
            <List dense>
              <ListItem><ListItemText primary="Software Version" secondary="THOZHIRPORUL v1.1.0" /></ListItem>
              <ListItem><ListItemText primary="Environment" secondary="Production" /></ListItem>
              <ListItem><ListItemText primary="Status" secondary="All systems operational" /></ListItem>
            </List>
          </Paper>
        </Grid>
      </Grid>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}

export default Settings;
