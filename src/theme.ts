import { createTheme } from '@mui/material';

const shadows = [
  'none',
  '0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)',
  '0 2px 6px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)',
  '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
  '0 6px 16px rgba(0,0,0,0.09), 0 2px 6px rgba(0,0,0,0.05)',
  '0 8px 20px rgba(0,0,0,0.09), 0 3px 8px rgba(0,0,0,0.05)',
  '0 10px 24px rgba(0,0,0,0.1), 0 4px 10px rgba(0,0,0,0.05)',
  '0 12px 28px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.05)',
  '0 14px 32px rgba(0,0,0,0.11), 0 5px 14px rgba(0,0,0,0.06)',
  '0 16px 36px rgba(0,0,0,0.11), 0 6px 16px rgba(0,0,0,0.06)',
  '0 18px 40px rgba(0,0,0,0.11), 0 6px 18px rgba(0,0,0,0.06)',
  '0 20px 44px rgba(0,0,0,0.12), 0 7px 20px rgba(0,0,0,0.06)',
  '0 22px 48px rgba(0,0,0,0.12), 0 8px 22px rgba(0,0,0,0.06)',
  '0 24px 52px rgba(0,0,0,0.13), 0 8px 24px rgba(0,0,0,0.07)',
  '0 26px 56px rgba(0,0,0,0.13), 0 9px 26px rgba(0,0,0,0.07)',
  '0 28px 60px rgba(0,0,0,0.13), 0 10px 28px rgba(0,0,0,0.07)',
  '0 30px 64px rgba(0,0,0,0.14), 0 10px 30px rgba(0,0,0,0.07)',
  '0 32px 68px rgba(0,0,0,0.14), 0 11px 32px rgba(0,0,0,0.07)',
  '0 34px 72px rgba(0,0,0,0.15), 0 12px 34px rgba(0,0,0,0.08)',
  '0 36px 76px rgba(0,0,0,0.15), 0 12px 36px rgba(0,0,0,0.08)',
  '0 38px 80px rgba(0,0,0,0.15), 0 13px 38px rgba(0,0,0,0.08)',
  '0 40px 84px rgba(0,0,0,0.16), 0 14px 40px rgba(0,0,0,0.08)',
  '0 42px 88px rgba(0,0,0,0.16), 0 14px 42px rgba(0,0,0,0.09)',
  '0 44px 92px rgba(0,0,0,0.17), 0 15px 44px rgba(0,0,0,0.09)',
  '0 46px 96px rgba(0,0,0,0.18), 0 16px 46px rgba(0,0,0,0.10)',
// eslint-disable-next-line @typescript-eslint/no-explicit-any
] as any;

export function createAppTheme(mode: 'light' | 'dark') {
  const isDark = mode === 'dark';

  const bg = isDark
    ? { default: '#0f1923', paper: '#1a2738' }
    : { default: '#f0f4f6', paper: '#ffffff' };

  const textPrimary = isDark ? '#e2e8f0' : '#1a2332';
  const textSecondary = isDark ? '#94a3b8' : '#64748b';
  const divider = isDark ? '#2d3d50' : '#e2e8f0';

  return createTheme({
    palette: {
      mode,
      primary: { main: '#2a9d8f', dark: '#1f7368', light: '#52b2a7', contrastText: '#fff' },
      secondary: { main: '#e76f51', dark: '#bf5a3f', light: '#eb8a72', contrastText: '#fff' },
      background: bg,
      text: { primary: textPrimary, secondary: textSecondary },
      divider,
      error: { main: isDark ? '#ef5350' : '#e53935' },
      warning: { main: '#f59e0b' },
      success: { main: isDark ? '#4caf50' : '#2e7d32' },
      info: { main: '#3b82f6' },
    },
    shape: { borderRadius: 12 },
    shadows,
    typography: {
      fontFamily: [
        '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif',
      ].join(','),
      h5: { fontWeight: 700, letterSpacing: '-0.3px' },
      h6: { fontWeight: 600, letterSpacing: '-0.2px' },
      subtitle1: { fontWeight: 600 },
      subtitle2: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: bg.default },
        },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundColor: bg.paper,
            color: textPrimary,
            borderBottom: `1px solid ${divider}`,
          },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 1 },
        styleOverrides: {
          root: { transition: 'box-shadow 0.18s ease' },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 8,
            paddingLeft: 16,
            paddingRight: 16,
            '&.MuiButton-containedPrimary:hover': { backgroundColor: '#1f7368' },
            '&.MuiButton-outlined': { borderColor: isDark ? '#3d5166' : '#c8d6df' },
            '&.MuiButton-outlined:hover': {
              borderColor: isDark ? '#64748b' : '#94a3b8',
              backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: { borderRadius: 16, boxShadow: '0 24px 64px rgba(0,0,0,0.15)' },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: { fontWeight: 700, fontSize: '1.1rem', paddingBottom: 8 },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 500 },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 600, minHeight: 44 },
        },
      },
      MuiAvatar: {
        styleOverrides: {
          colorDefault: {
            backgroundColor: isDark ? '#1f4040' : '#e6f4f2',
            color: '#2a9d8f',
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: { borderRadius: 6, fontSize: '0.75rem' },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            '&:hover': {
              backgroundColor: isDark ? 'rgba(42,157,143,0.1)' : 'rgba(42,157,143,0.06)',
            },
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: { borderColor: divider },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 10 },
        },
      },
    },
  });
}
