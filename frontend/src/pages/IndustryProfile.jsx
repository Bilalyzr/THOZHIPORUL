import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, TextField, Button, Grid, Avatar, Divider,
  Alert, Snackbar, CircularProgress, Stack, Chip
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import BadgeIcon from '@mui/icons-material/Badge';
import { accountService } from '../services/api';

function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    let active = true;
    accountService.getProfile()
      .then((res) => {
        if (!active) return;
        const p = res.data;
        setProfile(p);
        // Seed the editable form from the fetched profile.
        if (p.role === 'industry') {
          setForm({
            companyName: p.companyName || '',
            industryType: p.industryType || '',
            location: p.location || '',
            contactPerson: p.contactPerson || '',
            phoneNumber: p.phoneNumber || ''
          });
        } else if (p.role === 'govt') {
          setForm({
            officerName: p.officerName || '',
            designation: p.designation || '',
            department: p.department || '',
            jurisdiction: p.jurisdiction || ''
          });
        }
      })
      .catch(() => setSnackbar({ open: true, message: 'Failed to load profile.', severity: 'error' }))
      .finally(() => setLoading(false));
    return () => { active = false; };
  }, []);

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await accountService.updateProfile(form);
      setSnackbar({ open: true, message: 'Profile updated successfully.', severity: 'success' });
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to update profile.';
      setSnackbar({ open: true, message: msg, severity: 'error' });
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

  if (!profile) {
    return <Alert severity="error">Could not load your profile.</Alert>;
  }

  const isIndustry = profile.role === 'industry';
  const isGovt = profile.role === 'govt';
  const themeColor = isIndustry ? '#2E7D32' : isGovt ? '#E67E22' : '#1F4E79';

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ color: themeColor, fontSize: { xs: '1.4rem', sm: '1.75rem', md: '2.125rem' } }}>
        My Profile
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: { xs: 2, md: 4 } }}>
        View and update your {profile.role} account details.
      </Typography>

      <Grid container spacing={{ xs: 2, md: 4 }}>
        {/* Identity card */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 4, textAlign: 'center' }}>
            <Avatar sx={{
              width: 84, height: 84, mx: 'auto', mb: 2,
              bgcolor: themeColor, fontSize: '2rem', fontWeight: 800
            }}>
              {isIndustry ? <BusinessIcon sx={{ fontSize: 40 }} /> : <AccountCircleIcon sx={{ fontSize: 40 }} />}
            </Avatar>
            <Typography variant="h6" fontWeight="bold">
              {isIndustry ? profile.companyName : isGovt ? profile.officerName : 'Administrator'}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>{profile.email}</Typography>
            <Chip
              label={profile.role.toUpperCase()}
              size="small"
              sx={{ mt: 1, bgcolor: themeColor, color: 'white', fontWeight: 700 }}
            />
            <Divider sx={{ my: 2 }} />
            <Stack spacing={1.5}>
              {isIndustry && (
                <>
                  <Row label="Industry Type" value={profile.industryType} />
                  <Row label="Location" value={profile.location} />
                  <Row label="Park" value={profile.parkName} />
                  {profile.plotNumber && <Row label="Plot" value={profile.plotNumber} />}
                  <Row label="Compliance Score" value={profile.complianceScore != null ? `${profile.complianceScore}/100` : '—'} />
                </>
              )}
              {isGovt && (
                <>
                  <Row label="Designation" value={profile.designation} />
                  <Row label="Department" value={profile.department} />
                  <Row label="Jurisdiction" value={profile.jurisdiction} />
                </>
              )}
            </Stack>
          </Paper>
        </Grid>

        {/* Editable details */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper elevation={2} sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: 4 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <BadgeIcon sx={{ mr: 1, color: themeColor }} /> Editable Details
            </Typography>
            <Divider sx={{ mb: 3 }} />

            {isIndustry && (
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Field label="Company Name" value={form.companyName} onChange={handleChange('companyName')} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Field label="Industry Type" value={form.industryType} onChange={handleChange('industryType')} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Field label="Location" value={form.location} onChange={handleChange('location')} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Field label="Contact Person" value={form.contactPerson} onChange={handleChange('contactPerson')} required />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Field label="Phone Number" value={form.phoneNumber} onChange={handleChange('phoneNumber')} required />
                </Grid>
              </Grid>
            )}

            {isGovt && (
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Field label="Officer Name" value={form.officerName} onChange={handleChange('officerName')} required />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Field label="Designation" value={form.designation} onChange={handleChange('designation')} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Field label="Department" value={form.department} onChange={handleChange('department')} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Field label="Jurisdiction" value={form.jurisdiction} onChange={handleChange('jurisdiction')} />
                </Grid>
              </Grid>
            )}

            {profile.role === 'admin' && (
              <Alert severity="info">
                Administrator identity is managed at the platform level. Your login email is{' '}
                <strong>{profile.email}</strong>. Contact a super-admin to change core identity fields.
              </Alert>
            )}

            {(isIndustry || isGovt) && (
              <Box sx={{ mt: 3, textAlign: 'right' }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleSave}
                  disabled={saving}
                  startIcon={saving && <CircularProgress size={20} color="inherit" />}
                  sx={{ bgcolor: themeColor, '&:hover': { bgcolor: themeColor, filter: 'brightness(0.9)' }, px: 5 }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </Box>
            )}
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

// Small presentational helpers keep the JSX readable.
function Row({ label, value }) {
  return (
    <Box display="flex" justifyContent="space-between">
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={600}>{value || '—'}</Typography>
    </Box>
  );
}

function Field({ label, value, onChange, required }) {
  return (
    <TextField
      fullWidth
      label={label}
      value={value}
      onChange={onChange}
      required={required}
      variant="outlined"
      size="small"
    />
  );
}

export default Profile;
