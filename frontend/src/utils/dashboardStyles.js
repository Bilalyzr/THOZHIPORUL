// ============================================================
// dashboardStyles.js — Shared, role-themed style objects for all
// dashboard sections. Ensures visual consistency across every
// Paper, Card, header, and table in all 3 role dashboards.
//
// Usage in a page:
//   import { createDashboardStyles } from '../utils/dashboardStyles';
//   const ds = createDashboardStyles('admin'); // or 'govt', 'industry'
//   <Paper sx={ds.paper}>...</Paper>
//   <Typography sx={ds.sectionTitle}>...</Typography>
// ============================================================

const ROLE_THEMES = {
  admin: {
    primary: '#1F4E79',
    primaryLight: '#E3F2FD',
    accent: '#3A74A7',
    pageBg: 'linear-gradient(180deg, #f0f5fb 0%, #f8fafc 30%, #ffffff 100%)',
    stripe: '#1F4E79',
  },
  govt: {
    primary: '#E67E22',
    primaryLight: '#FFF3E0',
    accent: '#F39C12',
    pageBg: 'linear-gradient(180deg, #fef5ed 0%, #f8fafc 30%, #ffffff 100%)',
    stripe: '#E67E22',
  },
  industry: {
    primary: '#2E7D32',
    primaryLight: '#E8F5E9',
    accent: '#4CAF50',
    pageBg: 'linear-gradient(180deg, #f0f8f1 0%, #f8fafc 30%, #ffffff 100%)',
    stripe: '#2E7D32',
  },
};

/**
 * createDashboardStyles(role) — returns a consistent set of sx style
 * objects themed to the given role. Use these instead of inline sx
 * on every Paper/Card/header to keep all sections uniform.
 */
export function createDashboardStyles(role = 'admin') {
  const theme = ROLE_THEMES[role] || ROLE_THEMES.admin;

  return {
    // ── Page container ──
    page: {
      flexGrow: 1,
      minHeight: '100vh',
      background: theme.pageBg,
      p: { xs: 1, sm: 2, md: 3 },
    },

    // ── Standard section Paper (charts, tables, panels) ──
    paper: {
      p: { xs: 2, sm: 3 },
      borderRadius: 3,
      border: '1.5px solid #cbd5e1',
      background: '#ffffff',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      transition: 'all 0.3s ease',
      '&:hover': {
        borderColor: '#94a3b8',
        boxShadow: '0 6px 20px rgba(0,0,0,0.1)',
        transform: 'translateY(-3px)',
      },
    },

    // ── Section Paper WITH a colored top stripe ──
    paperStriped: (color) => ({
      p: { xs: 2, sm: 3 },
      borderRadius: 3,
      borderTop: `4px solid ${color || theme.stripe}`,
      border: '1.5px solid #cbd5e1',
      background: '#ffffff',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      transition: 'all 0.3s ease',
      '&:hover': {
        borderColor: '#94a3b8',
        boxShadow: '0 6px 20px rgba(0,0,0,0.1)',
        transform: 'translateY(-3px)',
      },
    }),

    // ── KPI Card ──
    kpiCard: (color) => ({
      height: '100%',
      borderRadius: 3,
      overflow: 'hidden',
      borderTop: `4px solid ${color || theme.primary}`,
      border: '1.5px solid #cbd5e1',
      background: '#ffffff',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      transition: 'all 0.3s ease',
      '&:hover': {
        borderColor: '#94a3b8',
        transform: 'translateY(-5px)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      },
    }),

    // ── Section title (h6-level heading) ──
    sectionTitle: {
      fontWeight: 700,
      fontFamily: '"Outfit", sans-serif',
      fontSize: { xs: '1rem', sm: '1.15rem' },
      color: '#0f172a',
    },

    // ── Page title (h4-level) ──
    pageTitle: {
      fontWeight: 800,
      fontFamily: '"Outfit", sans-serif',
      fontSize: { xs: '1.4rem', sm: '1.75rem', md: '2.125rem' },
      color: theme.primary,
    },

    // ── Table header row ──
    tableHead: {
      bgcolor: '#f8fafc',
      '& .MuiTableCell-head': {
        fontWeight: 800,
        color: '#1e293b',
        fontSize: '0.75rem',
      },
    },

    // ── Hero/Company header banner ──
    heroBanner: {
      p: { xs: 2, sm: 3 },
      mb: { xs: 2, md: 3 },
      borderRadius: 3,
      background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.accent} 100%)`,
      color: 'white',
      boxShadow: `0 4px 20px ${theme.primary}30`,
    },

    // ── Small info/stat tile (inside grids) ──
    statTile: {
      textAlign: 'center',
      p: 1.5,
      borderRadius: 2,
      bgcolor: '#f8fafc',
      border: '1px solid #e2e8f0',
    },

    // ── Divider between sections ──
    divider: {
      borderColor: '#f1f5f9',
      mb: 2,
    },

    // ── Role theme colors (for custom use) ──
    colors: theme,
  };
}

export { ROLE_THEMES };
