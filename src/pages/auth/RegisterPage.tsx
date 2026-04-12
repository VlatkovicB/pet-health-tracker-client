import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Button, TextField, Typography, Alert, Paper, Divider } from '@mui/material';
import { Pets } from '@mui/icons-material';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';

export function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const mutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: ({ token }) => {
      login(token);
      navigate('/');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ name, email, password });
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
      <Paper
        elevation={2}
        sx={{
          px: { xs: 3, sm: 4 },
          py: 4.5,
          width: '100%',
          maxWidth: 400,
          borderRadius: 3,
        }}
      >
        {/* Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 3.5 }}>
          <Box
            sx={{
              width: 40, height: 40, borderRadius: 2,
              bgcolor: 'primary.main',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(42,157,143,0.3)',
            }}
          >
            <Pets sx={{ color: '#fff', fontSize: 21 }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '-0.3px' }} color="text.primary">
            Pet Health
          </Typography>
        </Box>

        <Typography variant="h5" sx={{ fontWeight: 700 }} color="text.primary" gutterBottom>
          Create account
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Start tracking your pets' health for free
        </Typography>

        {mutation.isError && (
          <Alert severity="error" sx={{ mb: 2.5 }}>
            Registration failed. Please try again.
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            fullWidth
            autoComplete="name"
            autoFocus
          />
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            fullWidth
            autoComplete="email"
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
            autoComplete="new-password"
          />
          <Button
            type="submit"
            variant="contained"
            loading={mutation.isPending}
            fullWidth
            size="large"
            sx={{ mt: 0.5, py: 1.3 }}
          >
            Create account
          </Button>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#2a9d8f', textDecoration: 'none', fontWeight: 600 }}>
            Sign in
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
}
