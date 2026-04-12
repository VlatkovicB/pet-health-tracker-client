import { useState } from 'react';
import {
  AppBar, Box, Breadcrumbs, IconButton, Link, Menu, MenuItem,
  Toolbar, Tooltip, Typography, Avatar, Switch, FormControlLabel,
} from '@mui/material';
import { NavigateNext, Pets } from '@mui/icons-material';
import { Link as RouterLink, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { petsApi } from '../api/pets';

function AppBreadcrumbs() {
  const { petId } = useParams<{ petId?: string }>();
  const location = useLocation();

  const { data: pet } = useQuery({
    queryKey: ['pet', petId],
    queryFn: () => petsApi.get(petId!),
    enabled: !!petId,
  });

  const isVets = location.pathname === '/vets';

  if (!petId && !isVets) return null;

  return (
    <Box sx={{ px: { xs: 2, sm: 3 }, py: 0.75, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
      <Breadcrumbs separator={<NavigateNext sx={{ fontSize: 14, color: 'text.disabled' }} />}>
        <Link
          component={RouterLink}
          to="/"
          underline="hover"
          color="text.secondary"
          sx={{ fontSize: '0.8125rem', fontWeight: 500 }}
        >
          Pets
        </Link>
        {petId && (
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'text.primary' }}>
            {pet?.name ?? '…'}
          </Typography>
        )}
        {isVets && (
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'text.primary' }}>Vets</Typography>
        )}
      </Breadcrumbs>
    </Box>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { mode, toggleTheme } = useAppTheme();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" sx={{ zIndex: 10 }}>
        <Toolbar sx={{ px: { xs: 2, sm: 3 } }}>
          <Box
            sx={{
              width: 34, height: 34, borderRadius: 2, mr: 1.5, flexShrink: 0,
              bgcolor: 'primary.main',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(42,157,143,0.3)',
            }}
            onClick={() => navigate('/')}
          >
            <Pets sx={{ color: '#fff', fontSize: 19 }} />
          </Box>
          <Typography
            variant="h6"
            sx={{ flexGrow: 1, cursor: 'pointer', color: 'text.primary', letterSpacing: '-0.3px', fontSize: '1rem', fontWeight: 700 }}
            onClick={() => navigate('/')}
          >
            Pet Health
          </Typography>
          <Tooltip title="Account">
            <IconButton
              onClick={(e) => setMenuAnchor(e.currentTarget)}
              size="small"
              sx={{ ml: 1 }}
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.light', fontSize: 14, fontWeight: 700, color: '#fff' }}>
                U
              </Avatar>
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={menuAnchor}
            open={!!menuAnchor}
            onClose={() => setMenuAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            slotProps={{ paper: { sx: { mt: 0.5, minWidth: 160, borderRadius: 2, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' } } }}
          >
            <MenuItem onClick={() => { setMenuAnchor(null); navigate('/'); }} sx={{ fontSize: '0.9rem' }}>My Pets</MenuItem>
            <MenuItem onClick={toggleTheme} sx={{ fontSize: '0.9rem' }}>
              <FormControlLabel
                control={<Switch checked={mode === 'dark'} size="small" sx={{ ml: 0, mr: 1 }} />}
                label="Dark mode"
                sx={{ m: 0, pointerEvents: 'none', fontSize: '0.9rem' }}
              />
            </MenuItem>
            <MenuItem
              onClick={() => { setMenuAnchor(null); logout(); navigate('/login'); }}
              sx={{ color: 'error.main', fontSize: '0.9rem' }}
            >
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <AppBreadcrumbs />

      <Box sx={{ pb: 8 }}>
        {children}
      </Box>
    </Box>
  );
}
