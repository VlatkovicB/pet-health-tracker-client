import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Button, TextField, Typography, Alert } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email,    setEmail]    = useState(import.meta.env.DEV ? 'alex@example.com' : '');
  const [password, setPassword] = useState(import.meta.env.DEV ? 'password123'      : '');

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: ({ token }) => { login(token); navigate('/'); },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ email, password });
  };

  return (
    <Box
      sx={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', bgcolor: 'background.default', p: 2,
      }}
    >
      <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Logo */}
        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ fontSize: '2.5rem', mb: 1 }}>🐾</Typography>
          <Typography sx={{ fontWeight: 900, fontSize: '1.5rem', color: 'text.primary', letterSpacing: '-1px' }}>
            PetPal
          </Typography>
          <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'text.secondary', mt: 0.5 }}>
            Your pets' health, organised
          </Typography>
        </Box>

        {/* Card */}
        <Box
          sx={{
            background: (t) => t.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(108,99,255,0.12), rgba(167,139,250,0.08))'
              : 'linear-gradient(135deg, rgba(108,99,255,0.06), rgba(167,139,250,0.04))',
            borderRadius: 3, p: 3, display: 'flex', flexDirection: 'column', gap: 2,
          }}
        >
          {mutation.isError && (
            <Alert severity="error">Invalid email or password</Alert>
          )}

          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: '0.6875rem', color: 'primary.main', letterSpacing: '1.5px', textTransform: 'uppercase', mb: 0.75 }}>
              Email
            </Typography>
            <TextField
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              required fullWidth autoComplete="email" size="small"
            />
          </Box>

          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: '0.6875rem', color: 'primary.main', letterSpacing: '1.5px', textTransform: 'uppercase', mb: 0.75 }}>
              Password
            </Typography>
            <TextField
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              required fullWidth autoComplete="current-password" size="small"
            />
          </Box>

          <Button
            type="submit" variant="contained" fullWidth size="large"
            loading={mutation.isPending}
            sx={{ mt: 0.5, py: 1.25, fontSize: '0.9375rem' }}
          >
            Sign In
          </Button>
        </Box>

        <Typography sx={{ textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: 'text.secondary' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: '#6c63ff', textDecoration: 'none', fontWeight: 800 }}>
            Sign up
          </Link>
        </Typography>
      </Box>
    </Box>
  );
}
