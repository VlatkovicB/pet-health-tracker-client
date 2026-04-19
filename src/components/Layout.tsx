import {
  Box, BottomNavigation, BottomNavigationAction, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import {
  CalendarMonth, Pets, LocalHospital, Person,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { label: 'Calendar', icon: <CalendarMonth />, path: '/' },
  { label: 'Pets',     icon: <Pets />,          path: '/pets' },
  { label: 'Vets',     icon: <LocalHospital />, path: '/vets' },
  { label: 'Profile',  icon: <Person />,        path: '/profile' },
];

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth() as any;
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const activeNav = isDark ? '#3d3580' : '#ede9fe';
  const primaryMain = isDark ? '#a78bfa' : '#6c63ff';

  const activeIndex = NAV_ITEMS.findIndex((item) =>
    item.path === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(item.path),
  );

  const initials = user?.name
    ? user.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <Box
      sx={{
        width: 220,
        flexShrink: 0,
        height: '100vh',
        position: 'sticky',
        top: 0,
        bgcolor: 'background.paper',
        borderRight: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        py: 2.5,
        px: 1.5,
      }}
    >
      {/* Logo */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, pb: 2.5 }}>
        <Box
          sx={{
            width: 32, height: 32, borderRadius: 1.5, flexShrink: 0,
            background: 'linear-gradient(135deg, #6c63ff, #a78bfa)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18,
          }}
        >
          🐾
        </Box>
        <Typography sx={{ fontWeight: 900, fontSize: '1rem', letterSpacing: '-0.5px', color: 'text.primary' }}>
          PetPal
        </Typography>
      </Box>

      {/* Nav items */}
      {NAV_ITEMS.map((item, i) => (
        <Box
          key={item.path}
          onClick={() => navigate(item.path)}
          sx={{
            display: 'flex', alignItems: 'center', gap: 1.25,
            px: 1.5, py: 1.125,
            borderRadius: 1.5,
            mb: 0.25,
            cursor: 'pointer',
            bgcolor: activeIndex === i ? activeNav : 'transparent',
            color: activeIndex === i ? primaryMain : 'text.secondary',
            fontWeight: activeIndex === i ? 800 : 700,
            fontSize: '0.875rem',
            transition: 'background 0.15s',
            '&:hover': { bgcolor: activeNav },
          }}
        >
          <Box sx={{ color: 'inherit', display: 'flex', fontSize: 20 }}>{item.icon}</Box>
          <Typography sx={{ fontWeight: 'inherit', fontSize: 'inherit', color: 'inherit' }}>
            {item.label}
          </Typography>
        </Box>
      ))}

      <Box sx={{ flex: 1 }} />

      {/* User section */}
      <Box
        sx={{
          display: 'flex', alignItems: 'center', gap: 1,
          px: 1, pt: 2, borderTop: '1px solid', borderColor: 'divider',
          cursor: 'pointer',
        }}
        onClick={() => navigate('/profile')}
      >
        <Box
          sx={{
            width: 32, height: 32, borderRadius: 1.5, flexShrink: 0,
            background: 'linear-gradient(135deg, #6c63ff, #a78bfa)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 900, fontSize: '0.75rem',
          }}
        >
          {initials}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'text.primary', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {user?.name ?? 'Account'}
          </Typography>
          <Typography
            sx={{ fontWeight: 600, fontSize: '0.65rem', color: 'text.secondary', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {user?.email ?? ''}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  const activeIndex = NAV_ITEMS.findIndex((item) =>
    item.path === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(item.path),
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Desktop sidebar */}
      {isDesktop && <Sidebar />}

      {/* Page content */}
      <Box sx={{ flex: 1, minWidth: 0, pb: { xs: 8, md: 0 } }}>
        {children}
      </Box>

      {/* Mobile bottom nav */}
      {!isDesktop && (
        <BottomNavigation
          value={activeIndex === -1 ? false : activeIndex}
          onChange={(_, v) => navigate(NAV_ITEMS[v].path)}
          sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100 }}
        >
          {NAV_ITEMS.map((item) => (
            <BottomNavigationAction key={item.path} label={item.label} icon={item.icon} />
          ))}
        </BottomNavigation>
      )}
    </Box>
  );
}
