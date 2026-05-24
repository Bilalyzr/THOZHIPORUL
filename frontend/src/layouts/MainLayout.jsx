import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar, Box, CssBaseline, Drawer, IconButton,
  List, ListItem, ListItemButton, ListItemIcon,
  ListItemText, Toolbar, Typography, Avatar, Badge,
  Menu, MenuItem, Tooltip, Collapse
} from '@mui/material';
import { notificationService, authService } from '../services/api';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import FactoryIcon from '@mui/icons-material/Factory';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AssessmentIcon from '@mui/icons-material/Assessment';
import GavelIcon from '@mui/icons-material/Gavel';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
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
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import logoTransparent from '../assets/logo-transparent.png';
import LoadingScreen from '../components/LoadingScreen';

const drawerWidth = 280;
const miniDrawerWidth = 80;

const ROLE_THEMES = {
  admin: {
    primary: '#1F4E79',
    light: '#3A74A7',
    dark: '#163A5F',
    gradient: 'linear-gradient(135deg, #1F4E79 0%, #3A74A7 100%)',
    bgGradient: 'linear-gradient(180deg, #1F4E79 0%, #0f2744 100%)',
  },
  industry: {
    primary: '#2E7D32',
    light: '#4CAF50',
    dark: '#1B5E20',
    gradient: 'linear-gradient(135deg, #2E7D32 0%, #4CAF50 100%)',
    bgGradient: 'linear-gradient(180deg, #2E7D32 0%, #1a4d25 100%)',
  },
  govt: {
    primary: '#E67E22',
    light: '#F5A623',
    dark: '#D35400',
    gradient: 'linear-gradient(135deg, #E67E22 0%, #F5A623 100%)',
    bgGradient: 'linear-gradient(180deg, #E67E22 0%, #b35c12 100%)',
  },
};

function MainLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifAnchorEl, setNotifAnchorEl] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [profileAnchorEl, setProfileAnchorEl] = useState(null);
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role') || 'admin';

  useEffect(() => {
    if (!token) {
      navigate('/home', { replace: true });
    }
  }, [token, navigate]);

  const location = useLocation();

  if (!token) return null;

  const theme = ROLE_THEMES[userRole] || ROLE_THEMES.admin;

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

  const handleProfileClick = (event) => {
    setProfileAnchorEl(event.currentTarget);
  };

  const handleProfileClose = () => {
    setProfileAnchorEl(null);
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigate = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  const handleLogout = () => {
    setIsLoggingOut(true);
    setTimeout(() => {
      authService.logout();
      navigate('/home');
    }, 1500);
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
        { section: 'Secure Vault' },
        { text: 'Document Vault', icon: <FolderIcon />, path: '/secure-vault' },
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
        { section: 'Secure Vault' },
        { text: 'Document Vault', icon: <FolderIcon />, path: '/secure-vault' },
        { section: 'Reports' },
        { text: 'Report Center', icon: <DescriptionIcon />, path: '/report-center' },
      ];
    } else {
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
        { section: 'Secure Vault' },
        { text: 'Document Vault', icon: <FolderIcon />, path: '/secure-vault' },
        { section: 'System' },
        { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
      ];
    }
  };

  const menuItems = getMenuItems();
  const userName = localStorage.getItem('userName') || localStorage.getItem('name') || 'User';
  const userInitial = userName.charAt(0).toUpperCase();

  const mobileDrawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: theme.primary }}>
      <Toolbar sx={{ gap: 1.5, borderBottom: '1px solid rgba(255,255,255,0.2)', py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 2.5, bgcolor: 'rgba(255,255,255,0.2)', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
          <img src={logoTransparent} alt="NEXORA Logo" style={{ width: '75%', height: '75%', objectFit: 'contain' }} />
        </Box>
        <Box>
          <Typography variant="h6" noWrap sx={{ fontWeight: 900, fontSize: '1.1rem', lineHeight: 1.1, color: 'white' }}>
            THOZHIRPORUL
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em' }}>BY NEXORA</Typography>
        </Box>
      </Toolbar>

      <List sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', py: 2 }}>
        {menuItems.map((item, index) => (
          item.section ? (
            <Typography key={`section-${index}`} variant="overline" sx={{ px: 3, pt: index === 0 ? 2 : 2.5, pb: 1, display: 'block', color: 'rgba(255,255,255,0.8)', fontSize: '0.7rem', fontWeight: 800, letterSpacing: 1.5 }}>
              {item.section}
            </Typography>
          ) : (
            <ListItem key={item.text} disablePadding sx={{ px: 2 }}>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => handleNavigate(item.path)}
                sx={{
                  py: 1.2, px: 2, borderRadius: 2, mb: 0.5,
                  transition: 'all 0.2s ease',
                  color: 'white',
                  '&.Mui-selected': {
                    background: 'rgba(255, 255, 255, 0.25)',
                    color: 'white',
                    '& .MuiListItemIcon-root': { color: 'white' },
                    '&::before': {
                      content: '""',
                      position: 'absolute', left: 0, top: '15%', bottom: '15%', width: 4,
                      bgcolor: 'white', borderRadius: '0 4px 4px 0',
                    },
                  },
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.15)',
                  },
                  position: 'relative',
                }}
              >
                <ListItemIcon sx={{ color: 'rgba(255,255,255,0.9)', minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 600, color: 'white' }} />
              </ListItemButton>
            </ListItem>
          )
        ))}
      </List>

      <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout} sx={{ borderRadius: 2, '&:hover': { bgcolor: 'rgba(244, 67, 54, 0.25)' } }}>
            <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Logout" primaryTypographyProps={{ fontWeight: 600, color: 'white' }} />
          </ListItemButton>
        </ListItem>
      </Box>
    </Box>
  );

  const desktopDrawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: theme.primary }}>
      <Toolbar sx={{ gap: 1.5, justifyContent: collapsed ? 'center' : 'flex-start', px: collapsed ? 0 : 2.5, borderBottom: '1px solid rgba(255,255,255,0.2)', py: 2 }}>
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: collapsed ? 48 : 52, height: collapsed ? 48 : 52, borderRadius: 2.5,
          bgcolor: 'rgba(255,255,255,0.2)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          transition: 'all 0.3s ease',
        }}>
          <img src={logoTransparent} alt="NEXORA Logo" style={{ width: '75%', height: '75%', objectFit: 'contain' }} />
        </Box>
        {!collapsed && (
          <Collapse in orientation="horizontal" timeout={300}>
            <Box sx={{ minWidth: 150 }}>
              <Typography variant="h6" noWrap sx={{ fontWeight: 900, fontSize: '1.1rem', lineHeight: 1.1, color: 'white' }}>
                THOZHIRPORUL
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em' }}>BY NEXORA</Typography>
            </Box>
          </Collapse>
        )}
      </Toolbar>

      <List sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', py: 2 }}>
        {menuItems.map((item, index) => (
          item.section ? (
            !collapsed ? (
              <Typography key={`section-${index}`} variant="overline" sx={{ px: 3, pt: index === 0 ? 2 : 2.5, pb: 1, display: 'block', color: 'rgba(255,255,255,0.8)', fontSize: '0.7rem', fontWeight: 800, letterSpacing: 1.5 }}>
                {item.section}
              </Typography>
            ) : (
              <Box key={`section-${index}`} sx={{ my: 1.5, mx: 'auto', width: 32, borderTop: 1, borderColor: 'rgba(255,255,255,0.3)' }} />
            )
          ) : (
            <ListItem key={item.text} disablePadding sx={{ px: 2 }}>
              <Tooltip title={collapsed ? item.text : ''} placement="right" arrow TransitionProps={{ timeout: 300 }}>
                <ListItemButton
                  selected={location.pathname === item.path}
                  onClick={() => handleNavigate(item.path)}
                  sx={{
                    py: 1.2,
                    minHeight: 48,
                    justifyContent: collapsed ? 'center' : 'initial',
                    px: collapsed ? 1.5 : 2.5,
                    borderRadius: 2,
                    mb: 0.5,
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    color: 'white',
                    '&.Mui-selected': {
                      background: 'rgba(255, 255, 255, 0.25)',
                      color: 'white',
                      '& .MuiListItemIcon-root': { color: 'white' },
                      '&::before': {
                        content: '""',
                        position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 4,
                        bgcolor: 'white', borderRadius: '0 4px 4px 0',
                      },
                    },
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.15)',
                    },
                  }}
                >
                  <ListItemIcon sx={{
                    color: 'rgba(255,255,255,0.9)',
                    minWidth: 0,
                    mr: collapsed ? 0 : 2,
                    justifyContent: 'center',
                  }}>
                    {item.icon}
                  </ListItemIcon>
                  {!collapsed && (
                    <Collapse in orientation="horizontal" timeout={300}>
                      <Box sx={{ minWidth: 140 }}>
                        <ListItemText primary={item.text} primaryTypographyProps={{
                          fontSize: '0.875rem',
                          noWrap: true,
                          fontWeight: 600,
                          color: 'white',
                        }} />
                      </Box>
                    </Collapse>
                  )}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          )
        ))}
      </List>

      <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.2)', p: 1 }}>
        <List disablePadding>
          <ListItem disablePadding>
            <Tooltip title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} placement="right" arrow>
              <ListItemButton
                onClick={() => setCollapsed(!collapsed)}
                sx={{
                  py: 1.2,
                  justifyContent: collapsed ? 'center' : 'initial',
                  px: collapsed ? 1.5 : 2.5,
                  borderRadius: 2,
                  mx: 1,
                  mb: 0.5,
                  '&:hover': { background: 'rgba(255, 255, 255, 0.15)' },
                }}
              >
                <ListItemIcon sx={{ minWidth: 0, mr: collapsed ? 0 : 2, justifyContent: 'center', color: 'white' }}>
                  {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                </ListItemIcon>
                {!collapsed && (
                  <ListItemText primary="Collapse" primaryTypographyProps={{ fontSize: '0.8rem', color: 'white', fontWeight: 600 }} />
                )}
              </ListItemButton>
            </Tooltip>
          </ListItem>
          <ListItem disablePadding>
            <Tooltip title={collapsed ? 'Logout' : ''} placement="right" arrow>
              <ListItemButton
                onClick={handleLogout}
                sx={{
                  py: 1.2,
                  justifyContent: collapsed ? 'center' : 'initial',
                  px: collapsed ? 1.5 : 2.5,
                  borderRadius: 2,
                  mx: 1,
                  '&:hover': { background: 'rgba(244, 67, 54, 0.25)' },
                }}
              >
                <ListItemIcon sx={{ minWidth: 0, mr: collapsed ? 0 : 2, justifyContent: 'center', color: 'white' }}>
                  <LogoutIcon />
                </ListItemIcon>
                {!collapsed && (
                  <ListItemText primary="Logout" primaryTypographyProps={{ fontSize: '0.875rem', color: 'white', fontWeight: 700 }} />
                )}
              </ListItemButton>
            </Tooltip>
          </ListItem>
        </List>
      </Box>
    </Box>
  );

  return (
    <>
      {isLoggingOut && <LoadingScreen message="Securely logging out..." />}
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
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            borderBottom: '1px solid',
            borderColor: 'divider',
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            height: 64,
          }}
        >
          <Toolbar sx={{ height: 64 }}>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>

            {/* Breadcrumb/Title */}
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" fontWeight={700} sx={{ color: theme.primary }}>
                {menuItems.find(item => item.path === location.pathname)?.text || 'Dashboard'}
              </Typography>
            </Box>

            {/* Right side actions */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton
                size="large"
                aria-label="show new notifications"
                onClick={handleNotifClick}
                sx={{
                  color: 'text.secondary',
                  '&:hover': { bgcolor: `${theme.primary}15` },
                }}
              >
                <Badge badgeContent={notifications.length} max={99} sx={{ '& .MuiBadge-badge': { bgcolor: theme.primary } }}>
                  {notifications.length > 0 ? <NotificationsActiveIcon sx={{ color: theme.primary }} /> : <NotificationsIcon />}
                </Badge>
              </IconButton>
              <Menu
                anchorEl={notifAnchorEl}
                open={Boolean(notifAnchorEl)}
                onClose={handleNotifClose}
                PaperProps={{
                  sx: { width: { xs: 280, sm: 340 }, maxHeight: 400, borderRadius: 2, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: `${theme.primary}08` }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: theme.primary }}>Notifications</Typography>
                </Box>
                {notifications.length > 0 ? notifications.map(n => (
                  <MenuItem key={n.id} onClick={handleNotifClose} sx={{ whiteSpace: 'normal', py: 1.5, borderBottom: '1px solid #eee' }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: n.severity === 'error' ? 700 : 500 }}>{n.message}</Typography>
                      <Typography variant="caption" color="text.secondary">{n.time}</Typography>
                    </Box>
                  </MenuItem>
                )) : <MenuItem disabled><Typography variant="body2" color="text.secondary">No new notifications</Typography></MenuItem>}
              </Menu>

              <Tooltip title="Profile" arrow>
                <IconButton
                  sx={{ p: 0, ml: 1 }}
                  onClick={handleProfileClick}
                >
                  <Avatar sx={{
                    bgcolor: theme.gradient,
                    fontWeight: 700,
                    boxShadow: `0 2px 8px ${theme.primary}40`,
                    transition: 'all 0.2s ease',
                    '&:hover': { transform: 'scale(1.05)', boxShadow: `0 4px 12px ${theme.primary}50` },
                  }}>
                    {userInitial}
                  </Avatar>
                </IconButton>
              </Tooltip>
              <Menu
                anchorEl={profileAnchorEl}
                open={Boolean(profileAnchorEl)}
                onClose={handleProfileClose}
                PaperProps={{
                  sx: { width: 220, borderRadius: 2, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{userName}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>{userRole} Account</Typography>
                </Box>
                <MenuItem onClick={() => { handleProfileClose(); navigate('/settings'); }}>
                  <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
                  <ListItemText>Settings</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => { handleProfileClose(); handleLogout(); }} sx={{ color: 'error.main' }}>
                  <ListItemIcon><LogoutIcon fontSize="small" sx={{ color: 'error.main' }} /></ListItemIcon>
                  <ListItemText>Logout</ListItemText>
                </MenuItem>
              </Menu>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Sidebar Navigation */}
        <Box
          component="nav"
          sx={{ width: { sm: currentWidth }, flexShrink: { sm: 0 }, transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
          aria-label="sidebar navigation"
        >
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
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', sm: 'block' },
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: currentWidth,
                transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                overflowX: 'hidden',
                borderRight: 'none',
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
            p: { xs: 2, sm: 2.5, md: 3.5 },
            width: { sm: `calc(100% - ${currentWidth}px)` },
            backgroundColor: 'background.default',
            minHeight: '100vh',
            overflow: 'hidden',
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <Toolbar />
          <Box className="page-transition">
            <Outlet />
          </Box>
        </Box>
      </Box>
    </>
  );
}

export default MainLayout;
