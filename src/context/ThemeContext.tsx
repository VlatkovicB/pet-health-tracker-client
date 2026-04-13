import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material';
import { createAppTheme } from '../theme';
import { usersApi } from '../api/users';

type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>(null!);

export function ThemeContextProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(
    () => (localStorage.getItem('theme') as ThemeMode) ?? 'light',
  );

  // Fetch saved preference from server on mount (if authenticated)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    usersApi.getMe()
      .then((user) => {
        setMode(user.theme);
        localStorage.setItem('theme', user.theme);
      })
      .catch(() => {/* not authenticated or network error — keep local value */});
  }, []);

  const toggleTheme = () => {
    const next: ThemeMode = mode === 'light' ? 'dark' : 'light';
    setMode(next);
    localStorage.setItem('theme', next);
    const token = localStorage.getItem('token');
    if (token) {
      usersApi.updateTheme(next).catch(() => {/* best-effort */});
    }
  };

  const muiTheme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <MuiThemeProvider theme={muiTheme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

export const useAppTheme = () => useContext(ThemeContext);
