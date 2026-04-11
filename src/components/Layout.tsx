import { useState } from 'react';
import {
  AppBar, Box, Breadcrumbs, IconButton, Link, Menu, MenuItem,
  Toolbar, Tooltip, Typography,
} from '@mui/material';
import { AccountCircle, NavigateNext, Pets } from '@mui/icons-material';
import { Link as RouterLink, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { groupsApi } from '../api/groups';
import { petsApi } from '../api/pets';

function AppBreadcrumbs() {
  const { groupId, petId } = useParams<{ groupId?: string; petId?: string }>();
  const location = useLocation();

  const { data: group } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => groupsApi.get(groupId!),
    enabled: !!groupId,
  });

  const { data: pet } = useQuery({
    queryKey: ['pet', groupId, petId],
    queryFn: () => petsApi.get(groupId!, petId!),
    enabled: !!groupId && !!petId,
  });

  const isVets = location.pathname.endsWith('/vets');

  if (!groupId) return null;

  return (
    <Breadcrumbs
      separator={<NavigateNext sx={{ fontSize: 16 }} />}
      sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}
    >
      <Link component={RouterLink} to="/" underline="hover" color="text.secondary" variant="caption">
        Groups
      </Link>
      {petId ? (
        <Link
          component={RouterLink}
          to={`/groups/${groupId}`}
          underline="hover"
          color="text.secondary"
          variant="caption"
        >
          {group?.name ?? '…'}
        </Link>
      ) : (
        <Typography variant="caption" color="text.primary">
          {group?.name ?? '…'}
        </Typography>
      )}
      {petId && (
        <Typography variant="caption" color="text.primary">
          {pet?.name ?? '…'}
        </Typography>
      )}
      {isVets && !petId && (
        <Typography variant="caption" color="text.primary">Vets</Typography>
      )}
    </Breadcrumbs>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  return (
    <Box sx={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Background glows */}
      <Box sx={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        '&::before': {
          content: '""', position: 'absolute',
          width: '600px', height: '600px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(32,178,170,0.07) 0%, transparent 70%)',
          top: '-150px', right: '-100px',
        },
        '&::after': {
          content: '""', position: 'absolute',
          width: '400px', height: '400px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(100,149,237,0.08) 0%, transparent 70%)',
          bottom: '-100px', left: '-50px',
        },
      }} />

      <AppBar position="sticky" sx={{ zIndex: 10 }}>
        <Toolbar>
          <Box
            sx={{
              width: 32, height: 32, borderRadius: 1.5, mr: 1.5,
              background: 'linear-gradient(135deg, #20b2aa, #6495ed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(32,178,170,0.4)',
              cursor: 'pointer',
            }}
            onClick={() => navigate('/')}
          >
            <Pets sx={{ color: '#fff', fontSize: 18 }} />
          </Box>
          <Typography
            variant="h6"
            fontWeight={700}
            letterSpacing="-0.3px"
            sx={{ flexGrow: 1, cursor: 'pointer', color: '#e8f4f8' }}
            onClick={() => navigate('/')}
          >
            Pet Health Tracker
          </Typography>
          <Tooltip title="Account">
            <IconButton
              onClick={(e) => setMenuAnchor(e.currentTarget)}
              sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#fff' } }}
            >
              <AccountCircle />
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={menuAnchor}
            open={!!menuAnchor}
            onClose={() => setMenuAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem onClick={() => { setMenuAnchor(null); navigate('/'); }}>My Groups</MenuItem>
            <MenuItem
              onClick={() => { setMenuAnchor(null); logout(); navigate('/login'); }}
              sx={{ color: 'error.main' }}
            >
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <AppBreadcrumbs />

      <Box sx={{ position: 'relative', zIndex: 1, pb: 10 }}>
        {children}
      </Box>
    </Box>
  );
}
