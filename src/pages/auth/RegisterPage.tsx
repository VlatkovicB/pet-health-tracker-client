import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Button, TextField, Typography, Alert, Paper } from '@mui/material';
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
        background: 'linear-gradient(135deg, #0d1b2a 0%, #1b2d45 40%, #1e3a5f 70%, #0d2137 100%)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(32,178,170,0.08) 0%, transparent 70%)',
          top: '-150px',
          right: '-100px',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(100,149,237,0.1) 0%, transparent 70%)',
          bottom: '-100px',
          left: '-50px',
        },
      }}
    >
      <Paper
        elevation={0}
        sx={{
          px: 4,
          py: 5,
          width: '100%',
          maxWidth: 400,
          mx: 2,
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 3,
          boxShadow: '0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #20b2aa, #6495ed)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(32,178,170,0.4)',
            }}
          >
            <Pets sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Typography variant="h6" fontWeight={700} sx={{ color: '#e8f4f8', letterSpacing: '-0.3px' }}>
            Pet Health Tracker
          </Typography>
        </Box>

        <Typography variant="h5" fontWeight={700} sx={{ color: '#fff', mb: 0.5 }}>
          Create account
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mb: 3 }}>
          Start tracking your pets' health
        </Typography>

        {mutation.isError && (
          <Alert severity="error" sx={{ mb: 2, background: 'rgba(211,47,47,0.15)', color: '#ff8a80', border: '1px solid rgba(211,47,47,0.3)', '& .MuiAlert-icon': { color: '#ff8a80' } }}>
            Registration failed. Try again.
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} required fullWidth  />
          <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required fullWidth  />
          <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required fullWidth  />
          <Button
            type="submit"
            variant="contained"
            loading={mutation.isPending}
            fullWidth
            sx={{
              mt: 1,
              py: 1.4,
              background: 'linear-gradient(135deg, #20b2aa, #6495ed)',
              borderRadius: 2,
              fontWeight: 600,
              letterSpacing: '0.3px',
              boxShadow: '0 4px 15px rgba(32,178,170,0.3)',
              '&:hover': {
                background: 'linear-gradient(135deg, #1a9e97, #5585d5)',
                boxShadow: '0 6px 20px rgba(32,178,170,0.45)',
              },
            }}
          >
            Register
          </Button>
        </Box>

        <Typography variant="body2" sx={{ mt: 3, color: 'rgba(255,255,255,0.45)', textAlign: 'center' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#20b2aa', textDecoration: 'none', fontWeight: 600 }}>
            Sign in
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
}

