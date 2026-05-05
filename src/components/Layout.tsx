import { type ReactNode } from 'react';
import {
  Box, Badge, BottomNavigation, BottomNavigationAction, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import {
  CalendarMonth, Pets, LocalHospital, Person, PhotoLibrary, AdminPanelSettings,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../api/users';
import { useListPendingShares } from '../api/shares';
import { useListPendingTransfers } from '../api/transfers';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS_BASE = [
  { label: 'Calendar', icon: <CalendarMonth />, path: '/' },
  { label: 'Pets',     icon: <Pets />,          path: '/pets' },
  { label: 'Vets',     icon: <LocalHospital />, path: '/vets' },
  { label: 'Photos',   icon: <PhotoLibrary />,  path: '/photos' },
];

const PROFILE_NAV = { label: 'Profile', icon: <Person />, path: '/profile' };

function getActiveIndex(pathname: string): number {
  const allItems = [...NAV_ITEMS_BASE, PROFILE_NAV];
  return allItems.findIndex((item) =>
    item.path === '/'
      ? pathname === '/'
      : pathname.startsWith(item.path),
  );
}

function usePendingCount(): number {
  const { data: shares = [] } = useListPendingShares();
  const { data: transfers = [] } = useListPendingTransfers();
  return shares.length + transfers.length;
}

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const activeNav = isDark ? '#3d3580' : '#ede9fe';
  const primaryMain = isDark ? '#a78bfa' : '#6c63ff';

  const activeIndex = getActiveIndex(location.pathname);
  const isProfileActive = location.pathname.startsWith('/profile');
  const pendingCount = usePendingCount();

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: usersApi.getMe });
  const displayName = user?.name ?? 'Account';
  const initials = user?.name ? user.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() : 'U';

  const { user: authUser } = useAuth();
  const isAdmin = authUser?.role === 'admin';

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
      {NAV_ITEMS_BASE.map((item, i) => {
        const isPets = item.label === 'Pets';
        const iconEl = isPets && pendingCount > 0
          ? <Badge badgeContent={pendingCount} color="error" max={99}>{item.icon}</Badge>
          : item.icon;
        return (
          <Box
            key={item.path}
            onClick={() => navigate(item.path)}
            sx={{
              display: 'flex', alignItems: 'center', gap: 1.5,
              px: 1.5, py: 1.25,
              borderRadius: 1.5,
              mb: 0.5,
              cursor: 'pointer',
              bgcolor: activeIndex === i ? activeNav : 'transparent',
              color: activeIndex === i ? primaryMain : 'text.secondary',
              fontWeight: activeIndex === i ? 800 : 700,
              fontSize: '0.875rem',
              transition: 'background 0.18s ease, color 0.18s ease',
              '&:hover': { bgcolor: activeNav },
            }}
          >
            <Box sx={{ color: 'inherit', display: 'flex', fontSize: 20 }}>{iconEl}</Box>
            <Typography sx={{ fontWeight: 'inherit', fontSize: 'inherit', color: 'inherit' }}>
              {item.label}
            </Typography>
          </Box>
        );
      })}

      {isAdmin && (
        <Box
          onClick={() => navigate('/admin')}
          sx={{
            display: 'flex', alignItems: 'center', gap: 1.5,
            px: 1.5, py: 1.25,
            borderRadius: 1.5,
            mb: 0.5,
            cursor: 'pointer',
            bgcolor: location.pathname.startsWith('/admin') ? activeNav : 'transparent',
            color: location.pathname.startsWith('/admin') ? primaryMain : 'text.secondary',
            fontWeight: location.pathname.startsWith('/admin') ? 800 : 700,
            fontSize: '0.875rem',
            transition: 'background 0.18s ease, color 0.18s ease',
            '&:hover': { bgcolor: activeNav },
          }}
        >
          <Box sx={{ color: 'inherit', display: 'flex', fontSize: 20 }}>
            <AdminPanelSettings />
          </Box>
          <Typography sx={{ fontWeight: 'inherit', fontSize: 'inherit', color: 'inherit' }}>
            Admin
          </Typography>
        </Box>
      )}

      <Box sx={{ flex: 1 }} />

      {/* User / Profile button */}
      <Box
        onClick={() => navigate('/profile')}
        sx={{
          display: 'flex', alignItems: 'center', gap: 1,
          px: 1.5, py: 1.25,
          borderRadius: 1.5,
          cursor: 'pointer',
          bgcolor: isProfileActive ? activeNav : 'transparent',
          transition: 'background 0.18s ease',
          '&:hover': { bgcolor: activeNav },
        }}
      >
        <Box
          sx={{
            width: 28, height: 28, borderRadius: 1, flexShrink: 0,
            background: 'linear-gradient(135deg, #6c63ff, #a78bfa)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 900, fontSize: '0.7rem',
          }}
        >
          {initials}
        </Box>
        <Typography
          sx={{
            fontWeight: isProfileActive ? 800 : 700,
            fontSize: '0.875rem',
            color: isProfileActive ? primaryMain : 'text.secondary',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            transition: 'color 0.18s ease',
          }}
        >
          {displayName}
        </Typography>
      </Box>
    </Box>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const pendingCount = usePendingCount();

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: usersApi.getMe });
  const firstName = user?.name?.split(' ')[0] ?? 'Profile';

  const { user: authUser } = useAuth();
  const isAdmin = authUser?.role === 'admin';

  const mobileNavItems = [
    ...NAV_ITEMS_BASE,
    ...(isAdmin ? [{ label: 'Admin', icon: <AdminPanelSettings />, path: '/admin' }] : []),
    { ...PROFILE_NAV, label: firstName },
  ];
  const activeIndex = getActiveIndex(location.pathname);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Desktop sidebar */}
      {isDesktop && <Sidebar />}

      {/* Page content with fade transition */}
      <Box
        key={location.pathname}
        sx={{
          flex: 1, minWidth: 0, pb: { xs: 8, md: 0 },
          '@keyframes pageFadeIn': {
            from: { opacity: 0, transform: 'translateY(6px)' },
            to:   { opacity: 1, transform: 'translateY(0)' },
          },
          animation: 'pageFadeIn 0.2s ease',
        }}
      >
        {children}
      </Box>

      {/* Mobile bottom nav */}
      {!isDesktop && (
        <BottomNavigation
          value={activeIndex === -1 ? false : activeIndex}
          onChange={(_, v) => navigate(mobileNavItems[v].path)}
          sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100 }}
        >
          {mobileNavItems.map((item) => {
            const isPets = item.label === 'Pets';
            const iconEl = isPets && pendingCount > 0
              ? <Badge badgeContent={pendingCount} color="error" max={99}>{item.icon}</Badge>
              : item.icon;
            return <BottomNavigationAction key={item.path} label={item.label} icon={iconEl} />;
          })}
        </BottomNavigation>
      )}
    </Box>
  );
}
