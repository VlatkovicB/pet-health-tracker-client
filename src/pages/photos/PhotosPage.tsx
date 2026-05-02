import { useState } from 'react';
import { Box, Typography, Chip, Fab } from '@mui/material';
import { Add } from '@mui/icons-material';
import { usePhotoTimeline, usePhotoYears } from '../../api/photos';
import { usePets } from '../../api/pets';
import { YearScrapbook } from './YearScrapbook';
import { MonthGrid } from './MonthGrid';
import { PhotoLightbox } from './PhotoLightbox';
import { UploadPhotoDialog } from './UploadPhotoDialog';
import { FilterToolbar } from './FilterToolbar';
import type { Photo, PhotoSourceType } from '../../types/photo';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ALL_SOURCE_TYPES: PhotoSourceType[] = ['standalone', 'vet-visit', 'note', 'weight-entry'];

export function PhotosPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [excludedPets, setExcludedPets] = useState<string[]>([]);
  const [excludedTypes, setExcludedTypes] = useState<PhotoSourceType[]>([]);

  const { data: pets = [] } = usePets();

  const activePetIds = excludedPets.length > 0
    ? pets.filter((p) => !excludedPets.includes(p.id)).map((p) => p.id)
    : undefined;

  const activeSourceTypes = excludedTypes.length > 0
    ? ALL_SOURCE_TYPES.filter((t) => !excludedTypes.includes(t))
    : undefined;

  const nothingToShow =
    (activePetIds !== undefined && activePetIds.length === 0) ||
    (activeSourceTypes !== undefined && activeSourceTypes.length === 0);

  const { data: years = [] } = usePhotoYears(activePetIds, activeSourceTypes, { enabled: !nothingToShow });
  const { data: timeline, isLoading: timelineLoading } = usePhotoTimeline(year, activePetIds, activeSourceTypes, { enabled: !nothingToShow });

  const togglePet = (petId: string) => {
    setExcludedPets((prev) =>
      prev.includes(petId) ? prev.filter((id) => id !== petId) : [...prev, petId],
    );
  };

  const toggleType = (type: PhotoSourceType) => {
    setExcludedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const handleYearChange = (newYear: number) => {
    setYear(newYear);
    setSelectedMonth(null);
  };

  const minYear = years.length ? Math.min(...years) : currentYear - 5;
  const maxYear = years.length ? Math.max(...years, currentYear) : currentYear;

  const monthLabel = selectedMonth
    ? `${MONTH_LABELS[parseInt(selectedMonth, 10) - 1]} ${year}`
    : null;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: 'auto', position: 'relative', minHeight: '100vh' }}>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>
        Photo Timeline
      </Typography>

      <FilterToolbar
        pets={pets}
        excludedPets={excludedPets}
        excludedTypes={excludedTypes}
        year={year}
        minYear={minYear}
        maxYear={maxYear}
        loading={timelineLoading}
        onTogglePet={togglePet}
        onToggleType={toggleType}
        onYearChange={handleYearChange}
      />

      {monthLabel && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Chip
            label={monthLabel}
            size="small"
            onDelete={() => setSelectedMonth(null)}
            color="primary"
          />
        </Box>
      )}

      {selectedMonth === null ? (
        <YearScrapbook
          year={year}
          timeline={timeline}
          loading={timelineLoading}
          onMonthClick={setSelectedMonth}
          selectedMonth={selectedMonth}
        />
      ) : (
        <MonthGrid
          year={year}
          month={selectedMonth}
          timeline={timeline}
          onPhotoClick={setLightboxPhoto}
        />
      )}

      <Fab
        color="primary"
        aria-label="Upload photo"
        onClick={() => setUploadOpen(true)}
        sx={{ position: 'fixed', bottom: { xs: 72, md: 32 }, right: 24 }}
      >
        <Add />
      </Fab>

      <PhotoLightbox photo={lightboxPhoto} onClose={() => setLightboxPhoto(null)} />

      <UploadPhotoDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        pets={pets}
      />
    </Box>
  );
}
