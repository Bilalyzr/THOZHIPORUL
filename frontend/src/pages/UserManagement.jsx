import React, { useState } from 'react';
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
  Alert
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';

const initialUsers = [
  { id: 1, name: "Ravi Kumar", rootEmail: "tech@abc-industry.com", role: "Industry", status: "Active" },
  { id: 2, name: "Meena Devi", rootEmail: "m.devi@sipcot.com", role: "Admin", status: "Active" },
  { id: 3, name: "Suresh", rootEmail: "suresh@tn.gov.in", role: "Govt", status: "Pending" },
  { id: 4, name: "Arun Prakash", rootEmail: "admin@xyz-mfg.com", role: "Industry", status: "Active" },
];

function UserManagement() {
  const [users, setUsers] = useState(initialUsers);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Dialog States
  const [openAddEdit, setOpenAddEdit] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({ name: '', rootEmail: '', role: 'Industry', status: 'Pending' });

  // Snackbar States
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  const handleMenuClick = (event, user) => {
    setAnchorEl(event.currentTarget);
    setSelectedUser(user);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
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

  const handleDeleteFromMenu = () => {
    setUsers(users.filter(u => u.id !== selectedUser.id));
    showSnackbar(`User ${selectedUser.name} deleted successfully`, 'error');
    handleMenuClose();
  };

  const handleApproveFromMenu = () => {
    setUsers(users.map(u => u.id === selectedUser.id ? { ...u, status: 'Active' } : u));
    showSnackbar(`User ${selectedUser.name} access approved!`);
    handleMenuClose();
  };

  const handleSaveUser = () => {
    if (isEditMode) {
      setUsers(users.map(u => u.id === formData.id ? formData : u));
      showSnackbar("User updated successfully");
    } else {
      const newUser = { ...formData, id: Date.now() };
      setUsers([...users, newUser]);
      showSnackbar("New user added successfully");
    }
    setOpenAddEdit(false);
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
    </Box>
  );
}

export default UserManagement;
