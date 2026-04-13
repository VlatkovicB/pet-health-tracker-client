import { Drawer, Box, List, ListItemButton, ListItemIcon, ListItemText, Divider, Typography } from '@mui/material';
import { Home, Pets, MedicalServices, Logout } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

interface NavigationDrawerProps {
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
}

const NAV_ITEMS = [
  { label: 'Home', icon: <Home />, path: '/' },
  { label: 'Pets', icon: <Pets />, path: '/pets' },
  { label: 'Vets', icon: <MedicalServices />, path: '/vets' },
] as const;

export function NavigationDrawer({ open, onClose, onLogout }: NavigationDrawerProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  function handleNav(path: string) {
    navigate(path);
    onClose();
  }

  function handleLogout() {
    onLogout();
    onClose();
  }

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: 220 } } }}
    >
      <Box sx={{ pt: 2, pb: 1, px: 2 }}>
        <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Menu
        </Typography>
      </Box>
      <List disablePadding>
        {NAV_ITEMS.map(({ label, icon, path }) => {
          const active = pathname === path;
          return (
            <ListItemButton
              key={path}
              onClick={() => handleNav(path)}
              selected={active}
              sx={{ mx: 1, borderRadius: 1.5, mb: 0.5 }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: active ? 'primary.main' : 'text.secondary' }}>
                {icon}
              </ListItemIcon>
              <ListItemText
                primary={label}
                slotProps={{ primary: { sx: { fontSize: '0.9rem', fontWeight: active ? 700 : 400 } } }}
              />
            </ListItemButton>
          );
        })}
      </List>
      <Divider sx={{ mt: 1 }} />
      <List disablePadding sx={{ mt: 0.5 }}>
        <ListItemButton onClick={handleLogout} sx={{ mx: 1, borderRadius: 1.5, color: 'error.main' }}>
          <ListItemIcon sx={{ minWidth: 36, color: 'error.main' }}>
            <Logout />
          </ListItemIcon>
          <ListItemText primary="Logout" slotProps={{ primary: { sx: { fontSize: '0.9rem' } } }} />
        </ListItemButton>
      </List>
    </Drawer>
  );
}
