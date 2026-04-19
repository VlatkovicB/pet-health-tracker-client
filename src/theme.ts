import { createTheme } from '@mui/material';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const shadows = [
  'none',
  '0 2px 12px rgba(108,99,255,0.08)',
  '0 2px 16px rgba(108,99,255,0.10)',
  '0 4px 20px rgba(108,99,255,0.12)',
  '0 6px 24px rgba(108,99,255,0.14)',
  '0 8px 28px rgba(108,99,255,0.14)',
  '0 10px 32px rgba(108,99,255,0.15)',
  '0 12px 36px rgba(108,99,255,0.15)',
  '0 14px 40px rgba(108,99,255,0.16)',
  '0 16px 44px rgba(108,99,255,0.16)',
  '0 18px 48px rgba(108,99,255,0.17)',
  '0 20px 52px rgba(108,99,255,0.18)',
  '0 22px 56px rgba(108,99,255,0.18)',
  '0 24px 60px rgba(108,99,255,0.19)',
  '0 26px 64px rgba(108,99,255,0.19)',
  '0 28px 68px rgba(108,99,255,0.20)',
  '0 30px 72px rgba(108,99,255,0.20)',
  '0 32px 76px rgba(108,99,255,0.21)',
  '0 34px 80px rgba(108,99,255,0.21)',
  '0 36px 84px rgba(108,99,255,0.22)',
  '0 38px 88px rgba(108,99,255,0.22)',
  '0 40px 92px rgba(108,99,255,0.23)',
  '0 42px 96px rgba(108,99,255,0.23)',
  '0 44px 100px rgba(108,99,255,0.24)',
  '0 46px 104px rgba(108,99,255,0.25)',
] as any;

export function createAppTheme(mode: 'light' | 'dark') {
  const isDark = mode === 'dark';

  const bg = isDark
    ? { default: '#1a1828', paper: '#252240' }
    : { default: '#f0f4ff', paper: '#ffffff' };

  const textPrimary   = isDark ? '#e8e3ff' : '#1a1340';
  const textSecondary = isDark ? '#9ca3af' : '#6b7280';
  const divider       = isDark ? '#2a2840' : '#e0daf8';
  const activeNav     = isDark ? '#3d3580' : '#ede9fe';
  const primaryMain   = isDark ? '#a78bfa' : '#6c63ff';

  return createTheme({
    palette: {
      mode,
      primary: {
        main:          primaryMain,
        dark:          isDark ? '#8b75e8' : '#5a52d5',
        light:         isDark ? '#c4b5fd' : '#a78bfa',
        contrastText:  '#ffffff',
      },
      secondary: { main: '#fb7185', contrastText: '#ffffff' },
      success:   { main: '#34d399', contrastText: '#064e3b' },
      warning:   { main: '#fbbf24', contrastText: '#451a03' },
      error:     { main: '#f43f5e', contrastText: '#ffffff' },
      background: bg,
      text: { primary: textPrimary, secondary: textSecondary },
      divider,
    },
    shape: { borderRadius: 16 },
    shadows,
    typography: {
      fontFamily: "'Nunito', sans-serif",
      h1: { fontWeight: 900, letterSpacing: '-1px' },
      h2: { fontWeight: 800, letterSpacing: '-0.5px' },
      h3: { fontWeight: 800, letterSpacing: '-0.3px' },
      h4: { fontWeight: 800 },
      h5: { fontWeight: 800, letterSpacing: '-0.3px' },
      h6: { fontWeight: 800, letterSpacing: '-0.2px' },
      subtitle1: { fontWeight: 700 },
      subtitle2: { fontWeight: 700 },
      body1:  { fontWeight: 600 },
      body2:  { fontWeight: 600 },
      caption: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 800 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: { body: { backgroundColor: bg.default } },
      },
      MuiCard: {
        defaultProps: { elevation: 1 },
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: isDark
              ? '0 2px 12px rgba(0,0,0,0.25)'
              : '0 2px 12px rgba(108,99,255,0.08)',
            transition: 'box-shadow 0.18s ease, transform 0.15s ease',
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 14, fontWeight: 800, paddingLeft: 20, paddingRight: 20 },
          contained: {
            background: 'linear-gradient(135deg, #6c63ff, #a78bfa)',
            color: '#ffffff',
            '&:hover': { background: 'linear-gradient(135deg, #5a52d5, #9270f0)' },
          },
          outlined: {
            borderColor: isDark ? '#3d3580' : '#d4d0f8',
            borderWidth: 2,
            color: primaryMain,
            '&:hover': { borderWidth: 2, backgroundColor: activeNav },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: { borderRadius: 24, boxShadow: '0 20px 60px rgba(108,99,255,0.15)' },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: { fontWeight: 800, fontSize: '1.1rem', paddingBottom: 8 },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 12,
              '& fieldset': { borderColor: divider, borderWidth: '1.5px' },
              '&:hover fieldset': { borderColor: primaryMain },
              '&.Mui-focused fieldset': { borderColor: primaryMain },
            },
            '& .MuiInputLabel-root.Mui-focused': { color: primaryMain },
          },
        },
      },
      MuiChip: {
        styleOverrides: { root: { fontWeight: 800, borderRadius: 20 } },
      },
      MuiTab: {
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 800, minHeight: 44 },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: { backgroundColor: primaryMain, height: 3, borderRadius: 2 },
        },
      },
      MuiBottomNavigation: {
        styleOverrides: {
          root: {
            backgroundColor: bg.paper,
            borderTop: `1px solid ${divider}`,
            height: 60,
          },
        },
      },
      MuiBottomNavigationAction: {
        styleOverrides: {
          root: {
            color: isDark ? '#5a5478' : '#9ca3af',
            minWidth: 0,
            padding: '6px 0',
            '&.Mui-selected': {
              color: primaryMain,
              backgroundColor: activeNav,
              borderRadius: 12,
              margin: '4px 2px',
            },
            '& .MuiBottomNavigationAction-label': {
              fontWeight: 800,
              fontSize: '0.625rem',
              '&.Mui-selected': { fontSize: '0.625rem' },
            },
          },
        },
      },
      MuiAlert: {
        styleOverrides: { root: { borderRadius: 12, fontWeight: 600 } },
      },
      MuiDivider: {
        styleOverrides: { root: { borderColor: divider } },
      },
      MuiTooltip: {
        styleOverrides: { tooltip: { borderRadius: 8, fontWeight: 600 } },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            '&:hover': { backgroundColor: activeNav },
          },
        },
      },
    },
  });
}
