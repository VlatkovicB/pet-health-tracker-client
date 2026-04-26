import { Box, Typography, Switch, useTheme } from '@mui/material';
import { ChevronRight, Logout } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { usersApi } from '../../api/users';

export function ProfilePage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { toggleTheme } = useAppTheme();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: usersApi.getMe });
  const displayName = user?.name ?? 'My Account';
  const initials = user?.name ? user.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() : '🐾';

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box sx={{ maxWidth: 480, mx: 'auto' }}>
      {/* Gradient hero */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #6c63ff, #a78bfa)',
          px: 3, pt: 4, pb: 7,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
          borderRadius: '0 0 32px 32px',
        }}
      >
        <Box
          sx={{
            width: 64, height: 64, borderRadius: 2.5,
            background: 'rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 900, fontSize: initials === '🐾' ? '1.5rem' : '1.25rem',
            mb: 0.5,
          }}
        >
          {initials}
        </Box>
        <Typography sx={{ fontWeight: 900, fontSize: '1.25rem', color: 'white', letterSpacing: '-0.5px' }}>
          {displayName}
        </Typography>
      </Box>

      {/* Settings */}
      <Box sx={{ px: 2, mt: -3, position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {/* Dark mode */}
        <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, overflow: 'hidden' }}>
          <Box
            sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              px: 2, py: 1.5,
            }}
          >
            <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', color: 'text.primary' }}>
              🌙 Dark Mode
            </Typography>
            <Switch
              checked={isDark}
              onChange={toggleTheme}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': { color: '#6c63ff' },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#a78bfa' },
              }}
            />
          </Box>
        </Box>

        {/* Sign out */}
        <Box
          onClick={handleSignOut}
          sx={{
            bgcolor: 'background.paper', borderRadius: 2,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            px: 2, py: 1.75, cursor: 'pointer',
            '&:hover': { bgcolor: isDark ? '#3d1c2e' : '#fff5f5' },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Logout sx={{ fontSize: 18, color: 'secondary.main' }} />
            <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', color: 'secondary.main' }}>
              Sign Out
            </Typography>
          </Box>
          <ChevronRight sx={{ color: 'secondary.main', fontSize: 20 }} />
        </Box>
      </Box>
    </Box>
  );
}
