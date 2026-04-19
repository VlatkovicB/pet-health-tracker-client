import { Box, Typography } from '@mui/material';
import type { DayOfWeek, VetWorkHours } from '../types';

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: 'MON', label: 'Mon' },
  { key: 'TUE', label: 'Tue' },
  { key: 'WED', label: 'Wed' },
  { key: 'THU', label: 'Thu' },
  { key: 'FRI', label: 'Fri' },
  { key: 'SAT', label: 'Sat' },
  { key: 'SUN', label: 'Sun' },
];

function formatEntry(entry: VetWorkHours | undefined): { label: string; variant: 'open' | 'allday' | 'closed' } {
  if (!entry || !entry.open) return { label: 'Closed', variant: 'closed' };
  if (entry.startTime === '00:00' && (entry.endTime === '23:59' || entry.endTime === '00:00')) {
    return { label: 'Open 24 hours', variant: 'allday' };
  }
  return { label: `${entry.startTime} – ${entry.endTime}`, variant: 'open' };
}

interface Props {
  hours: VetWorkHours[];
}

export function WorkHoursDisplay({ hours }: Props) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.375 }}>
      {DAYS.map(({ key, label }) => {
        const entry = hours.find((h) => h.dayOfWeek === key);
        const { label: hoursLabel, variant } = formatEntry(entry);
        return (
          <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.8125rem', color: 'text.secondary', width: 32, flexShrink: 0 }}>
              {label}
            </Typography>
            <Typography
              sx={{
                fontWeight: variant === 'closed' ? 600 : 700,
                fontSize: '0.8125rem',
                color: variant === 'closed' ? 'text.disabled' : variant === 'allday' ? 'success.main' : 'text.primary',
                fontStyle: variant === 'closed' ? 'italic' : 'normal',
              }}
            >
              {hoursLabel}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}
