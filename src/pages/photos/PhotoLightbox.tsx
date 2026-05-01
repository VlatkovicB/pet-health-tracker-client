import { Dialog, DialogContent, Box, Typography, IconButton, Chip } from '@mui/material';
import { Close } from '@mui/icons-material';
import type { Photo } from '../../types/photo';

const SOURCE_LABELS: Record<string, string> = {
  'standalone': 'Photo',
  'vet-visit': 'Vet visit',
  'note': 'Note',
};

interface Props {
  photo: Photo | null;
  onClose: () => void;
}

export function PhotoLightbox({ photo, onClose }: Props) {
  if (!photo) return null;

  return (
    <Dialog
      open={!!photo}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{ paper: { sx: { bgcolor: 'background.default', borderRadius: 3 } } }}
    >
      <DialogContent sx={{ p: 0, position: 'relative' }}>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 10,
            bgcolor: 'rgba(0,0,0,0.5)',
            color: 'white',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' },
          }}
        >
          <Close fontSize="small" />
        </IconButton>

        <Box
          component="img"
          src={photo.url}
          alt={photo.caption ?? 'Photo'}
          sx={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', display: 'block' }}
        />

        <Box sx={{ px: 2.5, py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {new Date(photo.takenAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Typography>
            <Chip
              label={SOURCE_LABELS[photo.sourceType] ?? photo.sourceType}
              size="small"
              variant="outlined"
              sx={{ height: 20, fontSize: '0.65rem' }}
            />
            {photo.pet && (
              <Chip
                label={photo.pet.name}
                size="small"
                sx={{ height: 20, fontSize: '0.65rem' }}
              />
            )}
          </Box>
          {photo.caption && (
            <Typography variant="body1" sx={{ color: 'text.primary' }}>
              {photo.caption}
            </Typography>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
