import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1F4E79',
      light: '#3A74A7',
      dark: '#143656',
    },
    secondary: {
      main: '#2E7D32',
      light: '#4CAF50',
      dark: '#1B5E20',
    },
    warning: {
      main: '#F57C00',
      light: '#FFB74D',
      dark: '#E65100',
    },
    error: {
      main: '#D32F2F',
      light: '#EF5350',
      dark: '#C62828',
    },
    success: {
      main: '#2E7D32',
      light: '#4CAF50',
      dark: '#1B5E20',
    },
    info: {
      main: '#1565C0',
      light: '#42A5F5',
      dark: '#0D47A1',
    },
    background: {
      default: '#F8FAFC',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#0F172A',
      secondary: '#64748B',
    },
    divider: '#E2E8F0',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", sans-serif',
    fontSize: 12,
    htmlFontSize: 14,
    h1: { fontFamily: '"Outfit", sans-serif', fontWeight: 900, letterSpacing: '-0.03em' },
    h2: { fontFamily: '"Outfit", sans-serif', fontWeight: 800, letterSpacing: '-0.02em' },
    h3: { fontFamily: '"Outfit", sans-serif', fontWeight: 800, letterSpacing: '-0.02em' },
    h4: { fontFamily: '"Outfit", sans-serif', fontWeight: 700, letterSpacing: '-0.01em' },
    h5: { fontFamily: '"Outfit", sans-serif', fontWeight: 700 },
    h6: { fontFamily: '"Outfit", sans-serif', fontWeight: 600 },
    subtitle1: { fontFamily: '"Outfit", sans-serif', fontWeight: 600 },
    subtitle2: { fontFamily: '"Outfit", sans-serif', fontWeight: 600 },
    button: { fontFamily: '"Outfit", sans-serif', fontWeight: 600 },
  },
  shape: {
    borderRadius: 12,
  },
  spacing: 7, // Default is 8px. Set to 7px to reduce all paddings and margins by ~12.5%
  shadows: [
    'none',
    '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
    '0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.04)',
    '0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.04)',
    ...Array(20).fill('0 4px 6px -1px rgb(0 0 0 / 0.05)')
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          overflowX: 'hidden',
        },
        body: {
          overflowX: 'hidden',
          scrollbarWidth: 'thin',
          scrollbarColor: '#CBD5E1 transparent',
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': { background: '#CBD5E1', borderRadius: 3 },
        },
        '#root': {
          overflowX: 'hidden',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          padding: '6px 16px',
          borderRadius: 8,
          fontWeight: 600,
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #1F4E79 0%, #143656 100%)',
          boxShadow: '0 4px 14px 0 rgba(31, 78, 121, 0.3)',
          '&:hover': {
            boxShadow: '0 6px 20px rgba(31, 78, 121, 0.2)',
          },
        },
        sizeSmall: {
          padding: '4px 12px',
          fontSize: '0.8125rem',
        },
        sizeLarge: {
          padding: '10px 22px',
          fontSize: '1rem',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.06)',
          border: '1px solid #E2E8F0',
          transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
        outlined: {
          border: '1px solid #E2E8F0',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
        sizeSmall: {
          height: 24,
          fontSize: '0.75rem',
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          overflowX: 'auto',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-root': {
            fontWeight: 700,
            fontSize: '0.8125rem',
            color: '#475569',
            borderBottom: '2px solid #E2E8F0',
            padding: '10px 12px',
            whiteSpace: 'nowrap',
            '@media (min-width: 600px)': {
              padding: '12px 16px',
            },
          },
        },
      },
    },
    MuiTableBody: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-root': {
            padding: '8px 12px',
            fontSize: '0.875rem',
            borderBottom: '1px solid #F1F5F9',
            '@media (min-width: 600px)': {
              padding: '10px 16px',
            },
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: '#F8FAFC',
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          fontSize: '1.25rem',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          height: 6,
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: '8px !important',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
  },
});

export default theme;
