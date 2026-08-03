import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  FormControl,
  InputLabel,
  Snackbar,
  Alert,
  Tooltip,
  Divider,
  CircularProgress
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import LoginIcon from '@mui/icons-material/Login';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import FactoryIcon from '@mui/icons-material/Factory';
import { userService, authService, industryService } from '../services/api';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [viewUser, setViewUser] = useState(null); // industry account being viewed
  const [viewDetails, setViewDetails] = useState(null); // full profile data
  const [viewLoading, setViewLoading] = useState(false);

  // T2-impersonation: admin logs in AS an industry user to view their workspace.
  const handleImpersonate = async (user) => {
    try {
      const res = await authService.impersonate(user.id);
      if (res.data && res.data.token) {
        // Save the admin token so we can return to it.
        const adminToken = localStorage.getItem('token');
        if (adminToken) localStorage.setItem('adminToken', adminToken);
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('role', res.data.role);
        localStorage.setItem('userName', res.data.name || user.name);
        localStorage.setItem('impersonating', 'true');
        setViewUser(null); // close dialog if open
        setSnackbar({ open: true, message: `Now viewing as ${res.data.name || user.name}.`, severity: 'success' });
        // Full page load so the workspace mounts fresh with the new token.
        setTimeout(() => { window.location.href = '/workspace'; }, 500);
      } else {
        setSnackbar({ open: true, message: 'Impersonation failed — no token issued.', severity: 'error' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Impersonation failed.', severity: 'error' });
    }
  };

  // View industry account details in a dialog.
  const handleViewIndustry = async (user) => {
    setViewUser(user);
    setViewDetails(null);
    setViewLoading(true);
    try {
      // The users table row carries industry_id / profileId linking to
      // industry_profiles. Fall back to id if the join key isn't present.
      const profileId = user.industry_id || user.profileId || user.id;
      const res = await industryService.getById(profileId);
      setViewDetails(res.data);
    } catch {
      setSnackbar({ open: true, message: 'Could not load industry details.', severity: 'error' });
      setViewUser(null);
    } finally {
      setViewLoading(false);
    }
  };
  
  // Dialog States
  const [openAddEdit, setOpenAddEdit] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({ name: '', rootEmail: '', role: 'Industry', status: 'Pending' });

  // Snackbar States
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const fetchUsers = async () => {
    try {
      const response = await userService.getAll();
      setUsers(response.data);
    } catch {
      showSnackbar('Failed to fetch users', 'error');
    }
  };

  useEffect(() => {
    let active = true;
    userService.getAll()
      .then(response => {
        if (active) setUsers(response.data);
      })
      .catch(() => {
        if (active) showSnackbar('Failed to fetch users', 'error');
      });
    return () => { active = false; };
  }, []);

  const handleMenuClick = (event, user) => {
    setAnchorEl(event.currentTarget);
    setSelectedUser(user);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleOpenAdd = () => {
    setIsEditMode(false);
    setFormData({ name: '', rootEmail: '', role: 'Industry', status: 'Pending' });
    setOpenAddEdit(true);
  };

  const handleOpenEditFromMenu = () => {
    setIsEditMode(true);
    setFormData({ ...selectedUser });
    setOpenAddEdit(true);
    handleMenuClose();
  };

  const handleDeleteFromMenu = async () => {
    try {
      await userService.delete(selectedUser.id);
      showSnackbar(`User ${selectedUser.name || selectedUser.rootEmail} deleted successfully`);
      fetchUsers();
    } catch {
      showSnackbar('Failed to delete user', 'error');
    }
    handleMenuClose();
  };

  const handleApproveFromMenu = async () => {
    try {
      await userService.updateStatus(selectedUser.id, 'Active');
      showSnackbar(`User ${selectedUser.name || selectedUser.rootEmail} access approved!`);
      fetchUsers();
    } catch {
      showSnackbar('Failed to approve user', 'error');
    }
    handleMenuClose();
  };

  const handleSaveUser = async () => {
    try {
      if (isEditMode) {
        await userService.update(formData.id, formData);
        showSnackbar("User updated successfully");
      } else {
        await userService.create(formData);
        showSnackbar("New user added successfully");
      }
      fetchUsers();
      setOpenAddEdit(false);
    } catch (err) {
      showSnackbar(err.response?.data?.msg || 'Failed to save user', 'error');
    }
  };

  const getStatusChip = (status) => {
    switch(status) {
      case 'Active': return <Chip label={status} color="success" size="small" icon={<VerifiedUserIcon fontSize="small"/>} sx={{ fontWeight: 'bold' }} />;
      case 'Pending': return <Chip label={status} color="warning" size="small" sx={{ fontWeight: 'bold' }} />;
      default: return <Chip label={status} size="small" />;
    }
  };

  const getRoleChip = (role) => {
    switch(role) {
      case 'Admin': return <Chip label={role} color="primary" variant="outlined" size="small" sx={{ fontWeight: 'bold' }} />;
      case 'Industry': return <Chip label={role} color="secondary" variant="outlined" size="small" sx={{ fontWeight: 'bold' }} />;
      case 'Govt': return <Chip label={role} color="info" variant="outlined" size="small" sx={{ fontWeight: 'bold' }} />;
      default: return <Chip label={role} size="small" />;
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: { xs: 2, md: 4 }, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h4" color="primary.main" fontWeight="bold" sx={{ fontSize: { xs: '1.4rem', sm: '1.75rem', md: '2.125rem' } }}>
            Platform User Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage roles, approvals, and platform access control.
          </Typography>
        </Box>
        <Button variant="contained" color="primary" startIcon={<PersonAddIcon />} onClick={handleOpenAdd}>
          Add New User
        </Button>
      </Box>

      <Paper elevation={3} sx={{ width: '100%', borderRadius: 2 }}>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table aria-label="user management table">
            <TableHead sx={{ bgcolor: 'rgba(31, 78, 121, 0.05)' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>User Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Account Email</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Status</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', color: 'primary.main' }}>Login As</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', color: 'primary.main' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell component="th" scope="row" sx={{ fontWeight: 500 }}>
                    {user.name}
                  </TableCell>
                  <TableCell>{user.rootEmail}</TableCell>
                  <TableCell>{getRoleChip(user.role)}</TableCell>
                  <TableCell>{getStatusChip(user.status)}</TableCell>
                  <TableCell align="center">
                    {String(user.role).toLowerCase() === 'industry' ? (
                      <Tooltip title="View / login as this industry">
                        <IconButton
                          aria-label="view industry account"
                          color="info"
                          size="small"
                          onClick={() => handleViewIndustry(user)}
                        >
                          <VisibilityOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Typography variant="caption" color="text.disabled">—</Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton aria-label="settings" onClick={(e) => handleMenuClick(e, user)}>
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Action Menu attached to each row's 3-dot icon */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          {selectedUser && selectedUser.status === 'Pending' && (
            <MenuItem onClick={handleApproveFromMenu} sx={{ color: 'success.main' }}>
              <VerifiedUserIcon sx={{ mr: 1, fontSize: 'small' }} /> Approve Access
            </MenuItem>
          )}
          <MenuItem onClick={handleOpenEditFromMenu}>
            <EditIcon sx={{ mr: 1, fontSize: 'small', color: 'primary.main' }} /> Edit User
          </MenuItem>
          <MenuItem onClick={handleDeleteFromMenu} sx={{ color: 'error.main' }}>
            <DeleteIcon sx={{ mr: 1, fontSize: 'small' }} /> Delete User
          </MenuItem>
        </Menu>
      </Paper>

      {/* Add / Edit Dialog */}
      <Dialog open={openAddEdit} onClose={() => setOpenAddEdit(false)} fullWidth maxWidth="sm">
        <DialogTitle>{isEditMode ? 'Edit User' : 'Add New User'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            <TextField 
              label="Full Name" 
              fullWidth 
              value={formData.name} 
              onChange={(e) => setFormData({...formData, name: e.target.value})} 
            />
            <TextField 
              label="Email Address" 
              fullWidth 
              value={formData.rootEmail} 
              onChange={(e) => setFormData({...formData, rootEmail: e.target.value})} 
            />
            <FormControl fullWidth>
              <InputLabel>User Role</InputLabel>
              <Select 
                label="User Role"
                value={formData.role} 
                onChange={(e) => setFormData({...formData, role: e.target.value})}
              >
                <MenuItem value="Admin">Admin</MenuItem>
                <MenuItem value="Industry">Industry</MenuItem>
                <MenuItem value="Govt">Govt</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select 
                label="Status"
                value={formData.status} 
                onChange={(e) => setFormData({...formData, status: e.target.value})}
              >
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Pending">Pending</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenAddEdit(false)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleSaveUser}>
            {isEditMode ? 'Save Changes' : 'Create User'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for Notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* ===== View Industry Account Dialog ===== */}
      <Dialog
        open={Boolean(viewUser)}
        onClose={() => setViewUser(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: 'primary.main', color: 'white' }}>
          <FactoryIcon /> Industry Account Details
        </DialogTitle>
        <DialogContent dividers>
          {viewLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : viewDetails ? (
            <Box>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                {viewDetails.company_name || '—'}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <DetailField label="Contact Person" value={viewDetails.contact_person} />
                <DetailField label="Phone Number" value={viewDetails.phone_number} />
                <DetailField label="Email" value={viewDetails.email} />
                <DetailField label="Industry Type" value={viewDetails.industry_type} />
                <DetailField label="Location" value={viewDetails.location} />
                <DetailField label="Plot ID" value={viewDetails.plot_id} />
                <DetailField label="GSTIN" value={viewDetails.gstin} />
                <DetailField label="Status" value={viewDetails.status} />
                <DetailField label="Registered On" value={viewDetails.created_at ? new Date(viewDetails.created_at).toLocaleDateString() : '—'} />
              </Box>
            </Box>
          ) : (
            <Typography color="text.secondary">No details available.</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setViewUser(null)} variant="outlined">Close</Button>
          {viewDetails && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<LoginIcon />}
              onClick={() => { const u = viewUser; setViewUser(null); handleImpersonate(u); }}
            >
              Login As This Industry
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// Small helper for the read-only field grid in the view dialog.
function DetailField({ label, value }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600}>
        {value || '—'}
      </Typography>
    </Box>
  );
}

export default UserManagement;
