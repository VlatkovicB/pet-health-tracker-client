import { Box, Typography, Skeleton, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import type { VetVisit } from '../../types';

interface CalendarSidebarProps {
  upcomingVisit: VetVisit | null;
  petNames: Record<string, string>;
  petColors: Record<string, string>;
  loading: boolean;
}

function daysUntil(dateStr: string): number {
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function CalendarSidebar({ upcomingVisit, petNames, petColors, loading }: CalendarSidebarProps) {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      sx={{
        width: 200,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        borderRight: '1px solid',
        borderColor: 'divider',
        px: 2,
        pt: 2,
        pb: 2,
        overflowY: 'auto',
      }}
    >
      <Box>
        <Typography
          sx={{
            fontSize: '0.6875rem',
            fontWeight: 800,
            color: 'primary.main',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            mb: 1.25,
          }}
        >
          Next Visit
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="80%" />
            <Skeleton variant="text" width="50%" />
          </Box>
        ) : upcomingVisit ? (
          <Box
            onClick={() => navigate(`/pets/${upcomingVisit.petId}?tab=vet-visits&visitId=${upcomingVisit.id}`)}
            sx={{
              borderRadius: 1.5,
              p: 1.5,
              bgcolor: isDark ? '#1a1630' : '#f5f3ff',
              border: '1.5px solid',
              borderColor: isDark ? '#3d3580' : '#d4d0f8',
              borderLeft: `3px solid ${petColors[upcomingVisit.petId] ?? '#6c63ff'}`,
              cursor: 'pointer',
              '&:hover': { bgcolor: isDark ? '#2a2450' : '#ede9fe' },
              transition: 'background 0.12s',
            }}
          >
            <Typography
              sx={{
                fontSize: '0.8125rem',
                fontWeight: 800,
                color: petColors[upcomingVisit.petId] ?? 'primary.main',
                mb: 0.25,
              }}
            >
              {petNames[upcomingVisit.petId] ?? 'Pet'}
            </Typography>
            <Typography
              sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'text.primary', mb: 0.5 }}
            >
              {upcomingVisit.reason}
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mb: 0.25 }}>
              {format(new Date(upcomingVisit.visitDate.slice(0, 10) + 'T12:00:00'), 'MMM d, yyyy')}
            </Typography>
            {upcomingVisit.vetName && (
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mb: 0.5 }}>
                {upcomingVisit.vetName}
                {upcomingVisit.clinic ? ` · ${upcomingVisit.clinic}` : ''}
              </Typography>
            )}
            {(() => {
              const days = daysUntil(upcomingVisit.visitDate);
              const label = days < 0
                ? 'Overdue'
                : days === 0
                ? 'Today'
                : days === 1
                ? 'Tomorrow'
                : `in ${days} day${days !== 1 ? 's' : ''}`;
              return (
                <Box
                  sx={{
                    mt: 0.75,
                    display: 'inline-block',
                    px: 1,
                    py: 0.25,
                    borderRadius: 1,
                    bgcolor: isDark ? '#3d358022' : '#6c63ff15',
                    border: '1px solid',
                    borderColor: isDark ? '#5a5478' : '#d4d0f8',
                  }}
                >
                  <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: 'primary.main' }}>
                    {label}
                  </Typography>
                </Box>
              );
            })()}
          </Box>
        ) : (
          <Typography sx={{ fontSize: '0.8125rem', color: 'text.disabled', fontStyle: 'italic' }}>
            No upcoming visits
          </Typography>
        )}
      </Box>
    </Box>
  );
}
