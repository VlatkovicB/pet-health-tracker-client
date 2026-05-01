import { Box, Grid, Typography, Chip } from '@mui/material';
import type { Photo, PhotoTimeline } from '../../types/photo';

const SOURCE_LABELS: Record<string, string> = {
  'vet-visit': 'Vet visit',
  'note': 'Note',
};

interface Props {
  year: number;
  month: string;
  timeline: PhotoTimeline | undefined;
  onPhotoClick: (photo: Photo) => void;
}

export function MonthGrid({ year, month, timeline, onPhotoClick }: Props) {
  const photos = timeline?.[String(year)]?.[month] ?? [];

  if (photos.length === 0) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          No photos for this month.
        </Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={1.5}>
      {photos.map((photo) => (
        <Grid size={{ xs: 6, sm: 4, md: 3 }} key={photo.id}>
          <Box
            onClick={() => onPhotoClick(photo)}
            sx={{
              borderRadius: 2,
              overflow: 'hidden',
              cursor: 'pointer',
              position: 'relative',
              transition: 'transform 0.15s',
              '&:hover': { transform: 'scale(1.02)' },
              '&:hover .photo-overlay': { opacity: 1 },
            }}
          >
            <Box
              component="img"
              src={photo.url}
              alt={photo.caption ?? 'Photo'}
              sx={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }}
            />
            <Box
              className="photo-overlay"
              sx={{
                position: 'absolute',
                inset: 0,
                bgcolor: 'rgba(0,0,0,0.35)',
                opacity: 0,
                transition: 'opacity 0.15s',
                display: 'flex',
                alignItems: 'flex-end',
                p: 1,
              }}
            >
              {photo.caption && (
                <Typography
                  variant="caption"
                  sx={{ color: 'white', lineClamp: 2, overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2 }}
                >
                  {photo.caption}
                </Typography>
              )}
            </Box>
            <Box
              sx={{
                px: 1,
                py: 0.5,
                bgcolor: 'background.paper',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {new Date(photo.takenAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </Typography>
              {SOURCE_LABELS[photo.sourceType] && (
                <Chip
                  label={SOURCE_LABELS[photo.sourceType]}
                  size="small"
                  sx={{ height: 16, fontSize: '0.6rem' }}
                />
              )}
            </Box>
          </Box>
        </Grid>
      ))}
    </Grid>
  );
}
