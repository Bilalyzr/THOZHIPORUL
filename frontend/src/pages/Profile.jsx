import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, TextField, Button, Avatar, Chip, Divider,
  CircularProgress, Alert, Snackbar, Card, CardContent, IconButton, Tooltip
} from '@mui/material';
import {
  Edit, Save, Cancel, Person, Email, Phone, Factory, LocationOn,
  Business, Assessment, Group, Security, Badge, Schedule, CheckCircle,
  AdminPanelSettings, AccountBalance, Shield
} from '@mui/icons-material';
import { accountService } from '../services/api';
import { useSubscription } from '../hooks/useSubscription';
import { createDashboardStyles } from '../utils/dashboardStyles';

// ── Standalone field renderer (defined OUTSIDE the component to satisfy
//    react-hooks/static-components rule — defining a component inside render
//    resets its state on every parent re-render) ──
function ProfileField({ icon, label, value, editKey, type = 'text', editable = true, editing, form, setForm, color }) {
  return (
    <Grid size={{ xs: 12, sm: 6 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ color, display: 'flex' }}>{icon}</Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.65rem' }}>
            {label}
          </Typography>
          {editing && editable ? (
            <TextField
              size="small" fullWidth
              type={type}
              value={form[editKey] || ''}
              onChange={(e) => setForm({ ...form, [editKey]: e.target.value })}
              sx={{ mt: 0.3 }}
            />
          ) : (
            <Typography variant="body2" fontWeight={600} sx={{ color: '#1e293b' }}>
              {value || '—'}
            </Typography>
          )}
        </Box>
      </Box>
    </Grid>
  );
}

export default function Profile() {
  const role = localStorage.getItem('role') || 'admin';
  const ds = createDashboardStyles(role);
  const { tier, displayName } = useSubscription();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    accountService.getProfile()
      .then(res => { setProfile(res.data); setForm(res.data); })
      .catch(() => setSnackbar({ open: true, message: 'Failed to load profile.', severity: 'error' }))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await accountService.updateProfile(form);
      setProfile(form);
      setEditing(false);
      setSnackbar({ open: true, message: 'Profile updated successfully!', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Update failed.', severity: 'error' });
    }
    setSaving(false);
  };

  if (loading) return <Box display="flex" justifyContent="center" p={6}><CircularProgress /></Box>;
  if (!profile) return <Alert severity="error">Could not load profile.</Alert>;

  const roleMeta = {
    admin: { label: 'Administrator', icon: <AdminPanelSettings />, color: '#1F4E79' },
    govt: { label: 'Government Officer', icon: <AccountBalance />, color: '#E67E22' },
    industry: { label: 'Industry', icon: <Factory />, color: '#2E7D32' },
  };
  const meta = roleMeta[role] || roleMeta.admin;
  const initial = (profile.companyName || profile.officerName || profile.name || profile.email || 'U').charAt(0).toUpperCase();

  return (
    <Box sx={ds.page}>
      {/* ── Header banner ── */}
      <Paper sx={{ ...ds.heroBanner, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Avatar sx={{
            width: 64, height: 64, fontSize: '1.8rem', fontWeight: 800,
            bgcolor: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.3)',
          }}>
            {initial}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography variant="h5" fontWeight={800} sx={{ fontFamily: '"Outfit",sans-serif' }}>
              {profile.companyName || profile.officerName || profile.name || 'User'}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
              <Chip icon={meta.icon} label={meta.label} size="small"
                sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white', fontWeight: 600, fontSize: '0.7rem' }} />
              {tier && tier !== 'internal' && displayName && (
                <Chip label={displayName} size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 700, fontSize: '0.7rem' }} />
              )}
              <Chip icon={<CheckCircle sx={{ fontSize: 14 }} />} label={profile.status || 'Active'} size="small"
                sx={{ bgcolor: 'rgba(76,175,80,0.2)', color: '#a5d6a7', fontWeight: 600, fontSize: '0.7rem' }} />
            </Box>
          </Box>
          {!editing ? (
            <Button variant="contained" startIcon={<Edit />} onClick={() => setEditing(true)}
              sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 600, textTransform: 'none',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}>
              Edit Profile
            </Button>
          ) : (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />}
                onClick={handleSave} disabled={saving}
                sx={{ bgcolor: '#2E7D32', color: 'white', fontWeight: 600, textTransform: 'none',
                  '&:hover': { bgcolor: '#1B5E20' } }}>
                Save
              </Button>
              <Button variant="outlined" startIcon={<Cancel />} onClick={() => { setEditing(false); setForm(profile); }}
                sx={{ borderColor: 'rgba(255,255,255,0.4)', color: 'white', textTransform: 'none' }}>
                Cancel
              </Button>
            </Box>
          )}
        </Box>
      </Paper>

      {/* ── Account Info ── */}
      <Paper sx={{ ...ds.paper, mb: 3 }}>
        <Typography sx={{ ...ds.sectionTitle, mb: 2 }}>Account Information</Typography>
        <Divider sx={{ mb: 2.5 }} />
        <Grid container spacing={2.5}>
          <ProfileField editing={editing} form={form} setForm={setForm} color={meta.color} icon={<Email fontSize="small" />} label="Email Address" value={profile.email} editKey="email" editable={false} />
          <ProfileField editing={editing} form={form} setForm={setForm} color={meta.color} icon={<Person fontSize="small" />} label="Role" value={meta.label} editable={false} />
          <ProfileField editing={editing} form={form} setForm={setForm} color={meta.color} icon={<Badge fontSize="small" />} label="Account Status" value={profile.status} editable={false} />
          {tier && tier !== 'internal' && (
            <ProfileField editing={editing} form={form} setForm={setForm} color={meta.color} icon={<Shield fontSize="small" />} label="Subscription Tier" value={displayName} editable={false} />
          )}
        </Grid>
      </Paper>

      {/* ── Role-specific sections ── */}
      {role === 'industry' && (
        <Paper sx={{ ...ds.paper, mb: 3 }}>
          <Typography sx={{ ...ds.sectionTitle, mb: 2 }}>Company Details</Typography>
          <Divider sx={{ mb: 2.5 }} />
          <Grid container spacing={2.5}>
            <ProfileField editing={editing} form={form} setForm={setForm} color={meta.color} icon={<Business fontSize="small" />} label="Company Name" value={profile.companyName} editKey="companyName" />
            <ProfileField editing={editing} form={form} setForm={setForm} color={meta.color} icon={<Factory fontSize="small" />} label="Industry Type" value={profile.industryType} editKey="industryType" />
            <ProfileField editing={editing} form={form} setForm={setForm} color={meta.color} icon={<LocationOn fontSize="small" />} label="Location" value={profile.location} editKey="location" />
            <ProfileField editing={editing} form={form} setForm={setForm} color={meta.color} icon={<Person fontSize="small" />} label="Contact Person" value={profile.contactPerson} editKey="contactPerson" />
            <ProfileField editing={editing} form={form} setForm={setForm} color={meta.color} icon={<Phone fontSize="small" />} label="Phone Number" value={profile.phoneNumber} editKey="phoneNumber" />
            <ProfileField editing={editing} form={form} setForm={setForm} color={meta.color} icon={<LocationOn fontSize="small" />} label="Assigned Park" value={profile.parkName} editable={false} />
          </Grid>
        </Paper>
      )}

      {role === 'govt' && (
        <Paper sx={{ ...ds.paper, mb: 3 }}>
          <Typography sx={{ ...ds.sectionTitle, mb: 2 }}>Officer Details</Typography>
          <Divider sx={{ mb: 2.5 }} />
          <Grid container spacing={2.5}>
            <ProfileField editing={editing} form={form} setForm={setForm} color={meta.color} icon={<Person fontSize="small" />} label="Officer Name" value={profile.officerName} editKey="officerName" />
            <ProfileField editing={editing} form={form} setForm={setForm} color={meta.color} icon={<Badge fontSize="small" />} label="Designation" value={profile.designation} editKey="designation" />
            <ProfileField editing={editing} form={form} setForm={setForm} color={meta.color} icon={<Business fontSize="small" />} label="Department" value={profile.department} editKey="department" />
            <ProfileField editing={editing} form={form} setForm={setForm} color={meta.color} icon={<LocationOn fontSize="small" />} label="Jurisdiction" value={profile.jurisdiction} editKey="jurisdiction" />
          </Grid>
        </Paper>
      )}

      {role === 'admin' && (
        <Paper sx={{ ...ds.paper, mb: 3 }}>
          <Typography sx={{ ...ds.sectionTitle, mb: 2 }}>Admin Details</Typography>
          <Divider sx={{ mb: 2.5 }} />
          <Grid container spacing={2.5}>
            <ProfileField editing={editing} form={form} setForm={setForm} color={meta.color} icon={<Person fontSize="small" />} label="Admin Name" value={profile.name || 'Administrator'} editKey="name" />
            <ProfileField editing={editing} form={form} setForm={setForm} color={meta.color} icon={<Security fontSize="small" />} label="2FA Status" value="Enabled (Mandatory)" editable={false} />
          </Grid>
        </Paper>
      )}

      {/* ── Industry stats (read-only) ── */}
      {role === 'industry' && (
        <Grid container spacing={{ xs: 2, md: 3 }}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Paper sx={{ ...ds.paper, textAlign: 'center' }}>
              <Assessment sx={{ fontSize: 32, color: '#2E7D32', mb: 1 }} />
              <Typography variant="h5" fontWeight={800} color="#2E7D32">{profile.complianceScore || 0}</Typography>
              <Typography variant="caption" color="text.secondary">Compliance Score</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Paper sx={{ ...ds.paper, textAlign: 'center' }}>
              <Typography variant="h5" fontWeight={800} color="#1F4E79" sx={{ mt: 1.5 }}>₹{profile.totalInvestmentCr || 0} Cr</Typography>
              <Typography variant="caption" color="text.secondary">Total Investment</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Paper sx={{ ...ds.paper, textAlign: 'center' }}>
              <Group sx={{ fontSize: 32, color: '#E67E22', mb: 1 }} />
              <Typography variant="h5" fontWeight={800} color="#E67E22">{profile.totalEmployees || 0}</Typography>
              <Typography variant="caption" color="text.secondary">Total Employees</Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      <Snackbar open={snackbar.open} autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} sx={{ borderRadius: 2 }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
