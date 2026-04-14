import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar, Box, CssBaseline, Drawer, IconButton,
  List, ListItem, ListItemButton, ListItemIcon,
  ListItemText, Toolbar, Typography, Avatar, Badge,
  Menu, MenuItem, Tooltip
} from '@mui/material';
import { notificationService, authService } from '../services/api';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import FactoryIcon from '@mui/icons-material/Factory';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AssessmentIcon from '@mui/icons-material/Assessment';
import GavelIcon from '@mui/icons-material/Gavel';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import MapIcon from '@mui/icons-material/Map';
import MonitorIcon from '@mui/icons-material/Monitor';
import SecurityIcon from '@mui/icons-material/Security';
import SpaceDashboardIcon from '@mui/icons-material/SpaceDashboard';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import DescriptionIcon from '@mui/icons-material/Description';
import FolderIcon from '@mui/icons-material/Folder';
import PeopleIcon from '@mui/icons-material/People';
import VerifiedIcon from '@mui/icons-material/Verified';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import logoTransparent from '../assets/logo-transparent.png';

const drawerWidth = 260;
const miniDrawerWidth = 72;

function MainLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifAnchorEl, setNotifAnchorEl] = useState(null);
  const navigate = useNavigate();

  // Route guard: redirect to home if not logged in
  const token = localStorage.getItem('token');
  useEffect(() => {
    if (!token) {
      navigate('/home', { replace: true });
    }
  }, [token, navigate]);
  const location = useLocation();

  const userRole = localStorage.getItem('role') || 'admin';
  const isIndustry = userRole === 'industry';

  useEffect(() => {
    if (userRole === 'admin' && token) {
      notificationService.getNotifications().then(res => {
        setNotifications(res.data);
      }).catch(() => {});
    }
  }, [userRole, token]);

  const handleNotifClick = (event) => {
    setNotifAnchorEl(event.currentTarget);
  };

  const handleNotifClose = () => {
    setNotifAnchorEl(null);
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigate = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/home');
  };

  const currentWidth = collapsed ? miniDrawerWidth : drawerWidth;

  const getMenuItems = () => {
    if (userRole === 'industry') {
      return [
        { section: 'My Workspace' },
        { text: 'Workspace', icon: <SpaceDashboardIcon />, path: '/workspace' },
        { text: 'Company Profile', icon: <AccountCircleIcon />, path: '/industry-profile' },
        { section: 'Compliance' },
        { text: 'Submit Data', icon: <UploadFileIcon />, path: '/submit-data' },
        { text: 'My Compliance', icon: <VerifiedIcon />, path: '/compliance' },
        { text: 'Service Requests', icon: <SupportAgentIcon />, path: '/services' },
        { section: 'Reports' },
        { text: 'Report Center', icon: <DescriptionIcon />, path: '/report-center' },
        { text: 'Parks Explorer', icon: <MapIcon />, path: '/parks-explorer' },
      ];
    } else if (userRole === 'govt') {
      return [
        { section: 'Command & Control' },
        { text: 'Command Center', icon: <MonitorIcon />, path: '/command-center' },
        { text: 'Parks Explorer', icon: <MapIcon />, path: '/parks-explorer' },
        { text: 'Services Overview', icon: <AssignmentIcon />, path: '/services' },
        { section: 'Monitoring' },
        { text: 'Compliance Engine', icon: <SecurityIcon />, path: '/compliance-engine' },
        { text: 'Analytics', icon: <AutoGraphIcon />, path: '/analytics' },
        { section: 'Reports' },
        { text: 'Report Center', icon: <DescriptionIcon />, path: '/report-center' },
      ];
    } else {
      // Admin
      return [
        { section: 'Overview' },
        { text: 'Admin Dashboard', icon: <DashboardIcon />, path: '/admin-dashboard' },
        { text: 'Command Center', icon: <MonitorIcon />, path: '/command-center' },
        { section: 'Management' },
        { text: 'Parks Explorer', icon: <MapIcon />, path: '/parks-explorer' },
        { text: 'Services Tracker', icon: <AssignmentIcon />, path: '/services' },
        { text: 'User Management', icon: <PeopleIcon />, path: '/user-management' },
        { section: 'Analytics & Compliance' },
        { text: 'Compliance Engine', icon: <SecurityIcon />, path: '/compliance-engine' },
        { text: 'Analytics', icon: <AutoGraphIcon />, path: '/analytics' },
        { text: 'Report Center', icon: <DescriptionIcon />, path: '/report-center' },
        { section: 'System' },
        { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
      ];
    }
  };

  const menuItems = getMenuItems();

  // Full drawer content (used for both mobile and desktop expanded)
  const mobileDrawer = (
    <div>
      <Toolbar sx={{ gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40 }}>
          <img src={logoTransparent} alt="NEXORA Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </Box>
        <Box>
          <Typography variant="h6" noWrap sx={{ fontWeight: 900, fontSize: '1.2rem', lineHeight: 1.1, background: 'linear-gradient(90deg, #1F4E79, #2E7D32)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            THOZHIPORUL
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.55rem', fontWeight: 600, letterSpacing: '0.08em' }}>BY NEXORA</Typography>
        </Box>
      </Toolbar>
      <List>
        {menuItems.map((item, index) => (
          item.section ? (
            <Typography key={`section-${index}`} variant="overline" sx={{ px: 2, pt: index === 0 ? 0 : 1.5, pb: 0.5, display: 'block', color: 'text.secondary', fontSize: '0.65rem', fontWeight: 700, letterSpacing: 1.2 }}>
              {item.section}
            </Typography>
          ) : (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => handleNavigate(item.path)}
                sx={{
                  py: 0.8,
                  '&.Mui-selected': {
                    backgroundColor: 'primary.light',
                    color: 'primary.contrastText',
                    '& .MuiListItemIcon-root': { color: 'primary.contrastText' },
                  },
                  '&:hover': { backgroundColor: 'rgba(31, 78, 121, 0.08)' }
                }}
              >
                <ListItemIcon sx={{ color: location.pathname === item.path ? 'inherit' : 'primary.main', minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} primaryTypographyProps={{ fontSize: '0.875rem' }} />
              </ListItemButton>
            </ListItem>
          )
        ))}
      </List>
      <Box sx={{ position: 'absolute', bottom: 0, width: '100%', borderTop: 1, borderColor: 'divider' }}>
        <List>
          <ListItem disablePadding>
            <ListItemButton onClick={handleLogout}>
              <ListItemIcon sx={{ color: 'error.main' }}>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText primary="Logout" sx={{ color: 'error.main' }} />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
    </div>
  );

  // Desktop drawer content (supports collapsed state)
  const desktopDrawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Toolbar sx={{ gap: 1.5, justifyContent: collapsed ? 'center' : 'flex-start', px: collapsed ? 0 : 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40 }}>
          <img src={logoTransparent} alt="NEXORA Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </Box>
        {!collapsed && (
          <Box>
            <Typography variant="h6" noWrap sx={{ fontWeight: 900, fontSize: '1.2rem', lineHeight: 1.1, background: 'linear-gradient(90deg, #1F4E79, #2E7D32)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              THOZHIPORUL
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.55rem', fontWeight: 600, letterSpacing: '0.08em' }}>BY NEXORA</Typography>
          </Box>
        )}
      </Toolbar>

      {/* Menu Items */}
      <List sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {menuItems.map((item, index) => (
          item.section ? (
            !collapsed ? (
              <Typography key={`section-${index}`} variant="overline" sx={{ px: 2, pt: index === 0 ? 0 : 1.5, pb: 0.5, display: 'block', color: 'text.secondary', fontSize: '0.65rem', fontWeight: 700, letterSpacing: 1.2 }}>
                {item.section}
              </Typography>
            ) : (
              <Box key={`section-${index}`} sx={{ my: 1, mx: 'auto', width: 24, borderTop: 1, borderColor: 'divider' }} />
            )
          ) : (
            <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
              <Tooltip title={collapsed ? item.text : ''} placement="right" arrow>
                <ListItemButton
                  selected={location.pathname === item.path}
                  onClick={() => handleNavigate(item.path)}
                  sx={{
                    py: 0.8,
                    minHeight: 44,
                    justifyContent: collapsed ? 'center' : 'initial',
                    px: collapsed ? 1 : 2.5,
                    '&.Mui-selected': {
                      backgroundColor: 'primary.light',
                      color: 'primary.contrastText',
                      '& .MuiListItemIcon-root': { color: 'primary.contrastText' },
                    },
                    '&:hover': { backgroundColor: 'rgba(31, 78, 121, 0.08)' }
                  }}
                >
                  <ListItemIcon sx={{
                    color: location.pathname === item.path ? 'inherit' : 'primary.main',
                    minWidth: 0,
                    mr: collapsed ? 0 : 2,
                    justifyContent: 'center',
                  }}>
                    {item.icon}
                  </ListItemIcon>
                  {!collapsed && (
                    <ListItemText primary={item.text} primaryTypographyProps={{ fontSize: '0.875rem', noWrap: true }} />
                  )}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          )
        ))}
      </List>

      {/* Bottom: Collapse toggle + Logout */}
      <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
        <List disablePadding>
          {/* Collapse/Expand toggle */}
          <ListItem disablePadding>
            <Tooltip title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} placement="right" arrow>
              <ListItemButton
                onClick={() => setCollapsed(!collapsed)}
                sx={{
                  py: 1,
                  justifyContent: collapsed ? 'center' : 'initial',
                  px: collapsed ? 1 : 2.5,
                  '&:hover': { backgroundColor: 'rgba(31, 78, 121, 0.08)' }
                }}
              >
                <ListItemIcon sx={{ minWidth: 0, mr: collapsed ? 0 : 2, justifyContent: 'center', color: 'text.secondary' }}>
                  {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                </ListItemIcon>
                {!collapsed && (
                  <ListItemText primary="Collapse" primaryTypographyProps={{ fontSize: '0.85rem', color: 'text.secondary' }} />
                )}
              </ListItemButton>
            </Tooltip>
          </ListItem>
          {/* Logout */}
          <ListItem disablePadding>
            <Tooltip title={collapsed ? 'Logout' : ''} placement="right" arrow>
              <ListItemButton
                onClick={handleLogout}
                sx={{
                  py: 1,
                  justifyContent: collapsed ? 'center' : 'initial',
                  px: collapsed ? 1 : 2.5,
                }}
              >
                <ListItemIcon sx={{ minWidth: 0, mr: collapsed ? 0 : 2, justifyContent: 'center', color: 'error.main' }}>
                  <LogoutIcon />
                </ListItemIcon>
                {!collapsed && (
                  <ListItemText primary="Logout" primaryTypographyProps={{ fontSize: '0.875rem' }} sx={{ color: 'error.main' }} />
                )}
              </ListItemButton>
            </Tooltip>
          </ListItem>
        </List>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />

      {/* Top Header */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${currentWidth}px)` },
          ml: { sm: `${currentWidth}px` },
          backgroundColor: 'background.paper',
          color: 'text.primary',
          boxShadow: 1,
          transition: 'width 0.25s ease, margin-left 0.25s ease',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }} />
          <IconButton
            size="large"
            aria-label="show new notifications"
            color="inherit"
            onClick={handleNotifClick}
          >
            <Badge badgeContent={notifications.length} color="error">
              <NotificationsIcon sx={{ color: 'primary.main' }} />
            </Badge>
          </IconButton>
          <Menu
            anchorEl={notifAnchorEl}
            open={Boolean(notifAnchorEl)}
            onClose={handleNotifClose}
            PaperProps={{ sx: { width: { xs: 280, sm: 320 }, maxHeight: 400 } }}
          >
            <Typography variant="subtitle1" sx={{ px: 2, py: 1, fontWeight: 'bold' }}>Notifications</Typography>
            {notifications.length > 0 ? notifications.map(n => (
              <MenuItem key={n.id} onClick={handleNotifClose} sx={{ whiteSpace: 'normal', py: 1.5, borderBottom: '1px solid #eee' }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: n.severity === 'error' ? 'bold' : 'normal' }}>{n.message}</Typography>
                  <Typography variant="caption" color="text.secondary">{n.time}</Typography>
                </Box>
              </MenuItem>
            )) : <MenuItem disabled>No new notifications</MenuItem>}
          </Menu>
          <IconButton sx={{ p: 0, ml: 2 }}>
            <Avatar sx={{ bgcolor: 'secondary.main' }}>{userRole.charAt(0).toUpperCase()}</Avatar>
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Sidebar Navigation */}
      <Box
        component="nav"
        sx={{ width: { sm: currentWidth }, flexShrink: { sm: 0 }, transition: 'width 0.25s ease' }}
        aria-label="sidebar navigation"
      >
        {/* Mobile: temporary full drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {mobileDrawer}
        </Drawer>
        {/* Desktop: permanent drawer with collapse */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: currentWidth,
              transition: 'width 0.25s ease',
              overflowX: 'hidden',
            },
          }}
          open
        >
          {desktopDrawer}
        </Drawer>
      </Box>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1.5, sm: 2, md: 3 },
          width: { sm: `calc(100% - ${currentWidth}px)` },
          backgroundColor: 'background.default',
          minHeight: '100vh',
          overflow: 'hidden',
          transition: 'width 0.25s ease',
        }}
      >
        <Toolbar /> {/* Spacer for AppBar */}
        <Outlet />
      </Box>
    </Box>
  );
}

export default MainLayout;
