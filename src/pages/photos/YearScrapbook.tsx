import { Box, Grid, Typography, Chip, Skeleton } from '@mui/material';
import type { PhotoTimeline } from '../../types/photo';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface Props {
  year: number;
  timeline: PhotoTimeline | undefined;
  loading: boolean;
  onMonthClick: (month: string) => void;
  selectedMonth: string | null;
}

export function YearScrapbook({ year, timeline, loading, onMonthClick, selectedMonth }: Props) {
  const monthData = timeline?.[String(year)] ?? {};

  return (
    <Grid container spacing={1.5}>
      {MONTH_LABELS.map((label, i) => {
        const month = String(i + 1).padStart(2, '0');
        const photos = monthData[month] ?? [];
        const thumb = photos[0];
        const isEmpty = photos.length === 0;
        const isSelected = selectedMonth === month;

        return (
          <Grid size={{ xs: 6, sm: 4, md: 3 }} key={month}>
            <Box
              onClick={() => !isEmpty && onMonthClick(month)}
              sx={{
                borderRadius: 2,
                overflow: 'hidden',
                border: '2px solid',
                borderColor: isSelected ? 'primary.main' : isEmpty ? 'divider' : 'transparent',
                cursor: isEmpty ? 'default' : 'pointer',
                opacity: isEmpty ? 0.4 : 1,
                transition: 'all 0.15s',
                '&:hover': isEmpty ? {} : { borderColor: 'primary.light', transform: 'scale(1.02)' },
              }}
            >
              {loading ? (
                <Skeleton variant="rectangular" height={100} />
              ) : thumb ? (
                <Box
                  component="img"
                  src={thumb.url}
                  alt={`${label} ${year}`}
                  sx={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <Box
                  sx={{
                    height: 100,
                    bgcolor: 'action.hover',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                    —
                  </Typography>
                </Box>
              )}
              <Box
                sx={{
                  px: 1,
                  py: 0.5,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  bgcolor: 'background.paper',
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  {label}
                </Typography>
                {photos.length > 0 && (
                  <Chip label={photos.length} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                )}
              </Box>
            </Box>
          </Grid>
        );
      })}
    </Grid>
  );
}
