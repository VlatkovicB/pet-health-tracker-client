import { Popover, Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import type { CalendarEvent } from '../types';

interface CalendarEventPopupProps {
  event: CalendarEvent | null;
  anchor: HTMLElement | null;
  petNames: Record<string, string>;
  onClose: () => void;
}

export function CalendarEventPopup({ event, anchor, petNames, onClose }: CalendarEventPopupProps) {
  const navigate = useNavigate();
  const open = Boolean(anchor && event);

  function handleViewDetails() {
    if (!event) return;
    if (event.kind === 'vet-visit') {
      navigate(`/pets/${event.petId}?tab=vet-visits&visitId=${event.id}`);
    } else {
      navigate(`/pets/${event.petId}?tab=medications`);
    }
    onClose();
  }

  function formatDate(iso: string) {
    return format(new Date(iso), 'MMM d, yyyy');
  }

  if (!event) return null;

  const petName = petNames[event.petId] ?? '';

  return (
    <Popover
      open={open}
      anchorEl={anchor}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      transformOrigin={{ vertical: 'top', horizontal: 'center' }}
      slotProps={{ paper: { sx: { mt: 0.5, p: 1.5, borderRadius: 2, minWidth: 200, maxWidth: 260, boxShadow: '0 8px 24px rgba(0,0,0,0.14)' } } }}
    >
      {event.kind === 'vet-visit' ? (
        <>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {event.reason}{petName ? ` · ${petName}` : ''}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            {formatDate(event.date)}{event.vetName ? ` · ${event.vetName}` : event.clinic ? ` · ${event.clinic}` : ''}
          </Typography>
        </>
      ) : (
        <>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {event.name}{petName ? ` · ${petName}` : ''}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            {event.dosageLabel} · {event.frequencyLabel}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Started {formatDate(event.startDate)}
            {event.endDate ? ` · ends ${formatDate(event.endDate)}` : ''}
          </Typography>
        </>
      )}
      <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
        <Button size="small" variant="contained" onClick={handleViewDetails} sx={{ fontSize: '0.75rem' }}>
          View details →
        </Button>
      </Box>
    </Popover>
  );
}
