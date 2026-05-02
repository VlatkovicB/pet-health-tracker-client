import { useState } from 'react';
import {
  Box, IconButton, Tooltip, Popover, Typography, CircularProgress,
} from '@mui/material';
import {
  LocalHospital, Notes, FitnessCenter, CameraAlt, ChevronLeft, ChevronRight,
} from '@mui/icons-material';
import type { Pet } from '../../types';
import type { PhotoSourceType } from '../../types/photo';

const PET_COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#10b981', '#f97316'];

const SOURCE_TYPES: { type: PhotoSourceType; label: string; Icon: React.ElementType }[] = [
  { type: 'vet-visit', label: 'Vet visits', Icon: LocalHospital },
  { type: 'note', label: 'Notes', Icon: Notes },
  { type: 'weight-entry', label: 'Weight', Icon: FitnessCenter },
  { type: 'standalone', label: 'Uploads', Icon: CameraAlt },
];

interface Props {
  pets: Pet[];
  excludedPets: string[];
  excludedTypes: PhotoSourceType[];
  year: number;
  minYear: number;
  maxYear: number;
  loading: boolean;
  onTogglePet: (petId: string) => void;
  onToggleType: (type: PhotoSourceType) => void;
  onYearChange: (year: number) => void;
}

export function FilterToolbar({
  pets, excludedPets, excludedTypes, year, minYear, maxYear, loading,
  onTogglePet, onToggleType, onYearChange,
}: Props) {
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null);
  const popoverOpen = Boolean(popoverAnchor);

  const activePetNames = pets.filter((p) => !excludedPets.includes(p.id)).map((p) => p.name);
  const petLabel = excludedPets.length === 0 ? 'All pets' : activePetNames.join(', ') || 'No pets';

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        px: 1.5,
        py: 0.75,
        mb: 2,
      }}
    >
      {/* Left: pet filter */}
      <Box
        onClick={(e) => pets.length > 0 && setPopoverAnchor(e.currentTarget as HTMLElement)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          pr: 1.5,
          borderRight: '1px solid',
          borderColor: 'divider',
          cursor: pets.length > 0 ? 'pointer' : 'default',
          color: excludedPets.length > 0 ? 'primary.main' : 'text.secondary',
          userSelect: 'none',
          '&:hover': pets.length > 0 ? { color: 'primary.main' } : {},
        }}
      >
        <Typography variant="body2">🐾</Typography>
        <Typography variant="caption" sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
          {petLabel}
        </Typography>
        {pets.length > 0 && (
          <Typography variant="caption" sx={{ opacity: 0.5, ml: 0.25, fontSize: '0.6rem' }}>
            ▾
          </Typography>
        )}
      </Box>

      {/* Centre: source type icon toggles */}
      <Box sx={{ display: 'flex', gap: 0.25, flex: 1, justifyContent: 'center' }}>
        {SOURCE_TYPES.map(({ type, label, Icon }) => {
          const excluded = excludedTypes.includes(type);
          return (
            <Tooltip key={type} title={label} placement="bottom">
              <IconButton
                size="small"
                onClick={() => onToggleType(type)}
                sx={{
                  opacity: excluded ? 0.3 : 1,
                  filter: excluded ? 'grayscale(1)' : 'none',
                  color: excluded ? 'text.disabled' : 'primary.main',
                  transition: 'opacity 0.15s, filter 0.15s',
                }}
              >
                <Icon fontSize="small" />
              </IconButton>
            </Tooltip>
          );
        })}
      </Box>

      {/* Right: year navigation */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.25,
          pl: 1.5,
          borderLeft: '1px solid',
          borderColor: 'divider',
        }}
      >
        <IconButton size="small" onClick={() => onYearChange(year - 1)} disabled={year <= minYear}>
          <ChevronLeft fontSize="small" />
        </IconButton>
        <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 36, textAlign: 'center' }}>
          {year}
        </Typography>
        <IconButton size="small" onClick={() => onYearChange(year + 1)} disabled={year >= maxYear}>
          <ChevronRight fontSize="small" />
        </IconButton>
        {loading && <CircularProgress size={14} sx={{ ml: 0.5 }} />}
      </Box>

      {/* Pet popover */}
      <Popover
        open={popoverOpen}
        anchorEl={popoverAnchor}
        onClose={() => setPopoverAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: { sx: { mt: 0.5, p: 1.5, borderRadius: 2, display: 'flex', gap: 1 } },
        }}
      >
        {pets.map((pet, i) => {
          const excluded = excludedPets.includes(pet.id);
          const color = PET_COLORS[i % PET_COLORS.length];
          return (
            <Box
              key={pet.id}
              onClick={() => onTogglePet(pet.id)}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.5,
                p: 1,
                borderRadius: 1.5,
                cursor: 'pointer',
                minWidth: 60,
                border: '1.5px solid',
                borderColor: excluded ? 'transparent' : color,
                bgcolor: excluded ? 'transparent' : `${color}20`,
                opacity: excluded ? 0.35 : 1,
                transition: 'all 0.15s',
                '&:hover': { opacity: 1, borderColor: color },
              }}
            >
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  bgcolor: color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                }}
              >
                {pet.name[0].toUpperCase()}
              </Box>
              <Typography variant="caption" sx={{ fontWeight: 500 }}>
                {pet.name}
              </Typography>
            </Box>
          );
        })}
      </Popover>
    </Box>
  );
}
