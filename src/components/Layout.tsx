import { AppBar, Box, Button, Toolbar, Typography } from '@mui/material';
import { Pets } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { logout } = useAuth();

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
          <Button
            onClick={() => { logout(); navigate('/login'); }}
            sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: '#fff' } }}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ position: 'relative', zIndex: 1, pb: 10 }}>
        {children}
      </Box>
    </Box>
  );
}
