import { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Fab,
  CircularProgress,
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Add,
} from '@mui/icons-material';
import { usePhotoTimeline, usePhotoYears } from '../../api/photos';
import { usePets } from '../../api/pets';
import { YearScrapbook } from './YearScrapbook';
import { MonthGrid } from './MonthGrid';
import { PhotoLightbox } from './PhotoLightbox';
import { UploadPhotoDialog } from './UploadPhotoDialog';
import type { Photo } from '../../types/photo';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const SOURCE_TYPE_OPTIONS = [
  { value: 'vet-visit', label: 'Vet visits' },
  { value: 'note', label: 'Notes' },
  { value: 'weight-entry', label: 'Weight' },
  { value: 'standalone', label: 'Standalone' },
] as const;

export function PhotosPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [petFilter, setPetFilter] = useState<string[]>([]);
  const [sourceFilter, setSourceFilter] = useState<string[]>([]);

  const { data: pets = [] } = usePets();
  const { data: years = [] } = usePhotoYears(petFilter.length ? petFilter : undefined);
  const {
    data: timeline,
    isLoading: timelineLoading,
  } = usePhotoTimeline(year, petFilter.length ? petFilter : undefined);

  const togglePet = (petId: string) => {
    setPetFilter((prev) =>
      prev.includes(petId) ? prev.filter((id) => id !== petId) : [...prev, petId],
    );
  };

  const toggleSource = (value: string) => {
    setSourceFilter((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value],
    );
  };

  // Apply sourceType filter client-side
  const filteredTimeline: typeof timeline = timeline
    ? Object.fromEntries(
        Object.entries(timeline).map(([yr, months]) => [
          yr,
          Object.fromEntries(
            Object.entries(months).map(([month, photos]) => [
              month,
              sourceFilter.length
                ? photos.filter((p) => sourceFilter.includes(p.sourceType))
                : photos,
            ]),
          ),
        ]),
      )
    : undefined;

  const minYear = years.length ? Math.min(...years) : currentYear - 5;
  const maxYear = years.length ? Math.max(...years, currentYear) : currentYear;

  const monthLabel = selectedMonth
    ? `${MONTH_LABELS[parseInt(selectedMonth, 10) - 1]} ${year}`
    : null;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: 'auto', position: 'relative', minHeight: '100vh' }}>
      {/* Header */}
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
        Photo Timeline
      </Typography>

      {/* Pet filter chips */}
      {pets.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
          {pets.map((pet) => (
            <Chip
              key={pet.id}
              label={pet.name}
              onClick={() => togglePet(pet.id)}
              variant={petFilter.includes(pet.id) ? 'filled' : 'outlined'}
              color={petFilter.includes(pet.id) ? 'primary' : 'default'}
              size="small"
            />
          ))}
        </Box>
      )}

      {/* Source type filter chips */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        {SOURCE_TYPE_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            onClick={() => toggleSource(opt.value)}
            variant={sourceFilter.includes(opt.value) ? 'filled' : 'outlined'}
            color={sourceFilter.includes(opt.value) ? 'secondary' : 'default'}
            size="small"
          />
        ))}
      </Box>

      {/* Year navigation */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <IconButton
          size="small"
          onClick={() => { setYear((y) => y - 1); setSelectedMonth(null); }}
          disabled={year <= minYear}
        >
          <ChevronLeft />
        </IconButton>
        <Typography variant="h6" sx={{ fontWeight: 700, minWidth: 60, textAlign: 'center' }}>
          {year}
        </Typography>
        <IconButton
          size="small"
          onClick={() => { setYear((y) => y + 1); setSelectedMonth(null); }}
          disabled={year >= maxYear}
        >
          <ChevronRight />
        </IconButton>

        {/* Month breadcrumb */}
        {monthLabel && (
          <>
            <Typography variant="body2" sx={{ color: 'text.disabled', mx: 0.5 }}>/</Typography>
            <Chip
              label={monthLabel}
              size="small"
              onDelete={() => setSelectedMonth(null)}
              color="primary"
            />
          </>
        )}

        {timelineLoading && <CircularProgress size={16} sx={{ ml: 1 }} />}
      </Box>

      {/* Content: scrapbook or month grid */}
      {selectedMonth === null ? (
        <YearScrapbook
          year={year}
          timeline={filteredTimeline}
          loading={timelineLoading}
          onMonthClick={setSelectedMonth}
          selectedMonth={selectedMonth}
        />
      ) : (
        <MonthGrid
          year={year}
          month={selectedMonth}
          timeline={filteredTimeline}
          onPhotoClick={setLightboxPhoto}
        />
      )}

      {/* Upload FAB */}
      <Fab
        color="primary"
        aria-label="Upload photo"
        onClick={() => setUploadOpen(true)}
        sx={{ position: 'fixed', bottom: { xs: 72, md: 32 }, right: 24 }}
      >
        <Add />
      </Fab>

      {/* Lightbox */}
      <PhotoLightbox photo={lightboxPhoto} onClose={() => setLightboxPhoto(null)} />

      {/* Upload dialog */}
      <UploadPhotoDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        pets={pets}
      />
    </Box>
  );
}
