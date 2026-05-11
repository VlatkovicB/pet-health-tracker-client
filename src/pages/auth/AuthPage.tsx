import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Button,
  Divider,
  Tab,
  Tabs,
  TextField,
  Typography,
  Alert,
} from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../api/client';

const ERROR_MESSAGES: Record<string, string> = {
  oauth_email_missing: 'Your account did not share an email address. Please use email/password login.',
  oauth_failed: 'Social login failed. Please try again.',
  server_error: 'Something went wrong. Please try again.',
};

export function AuthPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [searchParams] = useSearchParams();
  const oauthError = searchParams.get('error');

  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState(import.meta.env.DEV ? 'alex@example.com' : '');
  const [password, setPassword] = useState(import.meta.env.DEV ? 'password123' : '');

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: async () => { await login(); navigate('/'); },
  });

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: async () => { await login(); navigate('/'); },
  });

  const mutation = tab === 'login' ? loginMutation : registerMutation;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === 'login') {
      loginMutation.mutate({ email, password });
    } else {
      registerMutation.mutate({ name, email, password });
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 400,
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}
      >
        {/* Logo */}
        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ fontSize: '2.5rem', mb: 1 }}>🐾</Typography>
          <Typography
            sx={{
              fontWeight: 900,
              fontSize: '1.5rem',
              color: 'text.primary',
              letterSpacing: '-1px',
            }}
          >
            PetPal
          </Typography>
          <Typography
            sx={{
              fontWeight: 600,
              fontSize: '0.875rem',
              color: 'text.secondary',
              mt: 0.5,
            }}
          >
            Your pets' health, organised
          </Typography>
        </Box>

        {/* OAuth error from redirect */}
        {oauthError && (
          <Alert severity="error">
            {ERROR_MESSAGES[oauthError] ?? 'Social login failed. Please try again.'}
          </Alert>
        )}

        {/* Tab toggle */}
        <Tabs
          value={tab}
          onChange={(_, v) => {
            setTab(v);
            loginMutation.reset();
            registerMutation.reset();
          }}
          variant="fullWidth"
          sx={{ borderRadius: 2, bgcolor: 'action.hover' }}
        >
          <Tab value="login" label="Sign In" />
          <Tab value="register" label="Sign Up" />
        </Tabs>

        {/* Card */}
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            background: (t) =>
              t.palette.mode === 'dark'
                ? 'linear-gradient(135deg, rgba(108,99,255,0.12), rgba(167,139,250,0.08))'
                : 'linear-gradient(135deg, rgba(108,99,255,0.06), rgba(167,139,250,0.04))',
            borderRadius: 3,
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {mutation.isError && (
            <Alert severity="error">
              {tab === 'login' ? 'Invalid email or password' : 'Registration failed. Please try again.'}
            </Alert>
          )}

          {tab === 'register' && (
            <Box>
              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: '0.6875rem',
                  color: 'primary.main',
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  mb: 0.75,
                }}
              >
                Name
              </Typography>
              <TextField
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                fullWidth
                autoComplete="name"
                size="small"
              />
            </Box>
          )}

          {(['Email', 'Password'] as const).map((label) => {
            const isPassword = label === 'Password';
            return (
              <Box key={label}>
                <Typography
                  sx={{
                    fontWeight: 800,
                    fontSize: '0.6875rem',
                    color: 'primary.main',
                    letterSpacing: '1.5px',
                    textTransform: 'uppercase',
                    mb: 0.75,
                  }}
                >
                  {label}
                </Typography>
                <TextField
                  type={isPassword ? 'password' : 'email'}
                  value={isPassword ? password : email}
                  onChange={(e) =>
                    isPassword ? setPassword(e.target.value) : setEmail(e.target.value)
                  }
                  required
                  fullWidth
                  autoComplete={
                    isPassword
                      ? tab === 'login'
                        ? 'current-password'
                        : 'new-password'
                      : 'email'
                  }
                  size="small"
                />
              </Box>
            );
          })}

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            loading={mutation.isPending}
            sx={{ mt: 0.5, py: 1.25, fontSize: '0.9375rem' }}
          >
            {tab === 'login' ? 'Sign In' : 'Create Account'}
          </Button>

          <Divider sx={{ my: 0.5 }}>
            <Typography
              sx={{ fontSize: '0.75rem', color: 'text.secondary', fontWeight: 600 }}
            >
              or continue with
            </Typography>
          </Divider>

          {/* OAuth buttons */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => { window.location.href = `${API_BASE_URL}/auth/google`; }}
              sx={{ justifyContent: 'flex-start', pl: 2, gap: 1.5 }}
            >
              <Box
                component="img"
                src="https://www.google.com/favicon.ico"
                alt=""
                sx={{ width: 18, height: 18 }}
              />
              Continue with Google
            </Button>

          </Box>
        </Box>
      </Box>
    </Box>
  );
}
