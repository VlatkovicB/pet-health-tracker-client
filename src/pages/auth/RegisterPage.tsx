import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Button, TextField, Typography, Alert } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';

export function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');

  const mutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: ({ token }) => { login(token); navigate('/'); },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ name, email, password });
  };

  return (
    <Box
      sx={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', bgcolor: 'background.default', p: 2,
      }}
    >
      <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box>
          <Typography sx={{ fontWeight: 900, fontSize: '1.5rem', color: 'text.primary', letterSpacing: '-0.8px' }}>
            Create account
          </Typography>
          <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'text.secondary', mt: 0.5 }}>
            Join PetPal today
          </Typography>
        </Box>

        <Box
          sx={{
            background: (t) => t.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(108,99,255,0.12), rgba(167,139,250,0.08))'
              : 'linear-gradient(135deg, rgba(108,99,255,0.06), rgba(167,139,250,0.04))',
            borderRadius: 3, p: 3, display: 'flex', flexDirection: 'column', gap: 2,
          }}
        >
          {mutation.isError && (
            <Alert severity="error">Registration failed. Please try again.</Alert>
          )}

          {[
            { label: 'Name',     value: name,     setter: setName,     type: 'text',     ac: 'name' },
            { label: 'Email',    value: email,    setter: setEmail,    type: 'email',    ac: 'email' },
            { label: 'Password', value: password, setter: setPassword, type: 'password', ac: 'new-password' },
          ].map(({ label, value, setter, type, ac }) => (
            <Box key={label}>
              <Typography sx={{ fontWeight: 800, fontSize: '0.6875rem', color: 'primary.main', letterSpacing: '1.5px', textTransform: 'uppercase', mb: 0.75 }}>
                {label}
              </Typography>
              <TextField
                type={type} value={value} onChange={(e) => setter(e.target.value)}
                required fullWidth autoComplete={ac} size="small"
              />
            </Box>
          ))}

          <Button
            type="submit" variant="contained" fullWidth size="large"
            loading={mutation.isPending}
            sx={{ mt: 0.5, py: 1.25, fontSize: '0.9375rem' }}
          >
            Create Account
          </Button>
        </Box>

        <Typography sx={{ textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: 'text.secondary' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#6c63ff', textDecoration: 'none', fontWeight: 800 }}>
            Sign in
          </Link>
        </Typography>
      </Box>
    </Box>
  );
}
