import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
import { usersApi } from '../api/users';

interface AuthContextValue {
  token: string | null;
  user: User | null;
  login: (token: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(null);

  const login = useCallback(async (t: string) => {
    localStorage.setItem('token', t);
    setToken(t);
    try {
      const me = await usersApi.getMe();
      setUser(me);
    } catch {
      // Non-fatal — user stays null until next getMe resolves
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  // On mount: if token exists (returning user), populate user state
  useEffect(() => {
    if (token) {
      usersApi.getMe().then(setUser).catch(() => {});
    }
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
