import { createTheme } from '@mui/material';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#20b2aa' },
    secondary: { main: '#6495ed' },
    background: {
      default: '#0d1b2a',
      paper: 'rgba(255,255,255,0.05)',
    },
    text: {
      primary: '#e8f4f8',
      secondary: 'rgba(255,255,255,0.5)',
    },
    divider: 'rgba(255,255,255,0.1)',
  },
  shape: { borderRadius: 10 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: 'linear-gradient(135deg, #0d1b2a 0%, #1b2d45 40%, #1e3a5f 70%, #0d2137 100%)',
          minHeight: '100vh',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
          backgroundImage: 'none',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'rgba(13,27,42,0.8)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          boxShadow: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        containedPrimary: {
          background: 'linear-gradient(135deg, #20b2aa, #6495ed)',
          boxShadow: '0 4px 15px rgba(32,178,170,0.3)',
          '&:hover': {
            background: 'linear-gradient(135deg, #1a9e97, #5585d5)',
            boxShadow: '0 6px 20px rgba(32,178,170,0.45)',
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
          '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
          '&.Mui-focused fieldset': { borderColor: '#20b2aa' },
        },
        input: { color: '#e8f4f8' },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: 'rgba(255,255,255,0.45)',
          '&.Mui-focused': { color: '#20b2aa' },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          color: 'rgba(255,255,255,0.45)',
          '&.Mui-selected': { color: '#20b2aa' },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: { backgroundColor: '#20b2aa' },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(255,255,255,0.15)',
          color: '#e8f4f8',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          background: '#1b2d45',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
        },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: { color: '#e8f4f8' },
        secondary: { color: 'rgba(255,255,255,0.45)' },
      },
    },
  },
});
