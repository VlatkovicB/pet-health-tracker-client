import { Box, Chip } from '@mui/material';
import type { CalendarEvent, Pet } from '../../types';

interface PetFilterChipsProps {
  pets: Pet[];
  petColors: Record<string, string>;
  selectedPetId: string | null;
  onChange: (petId: string | null) => void;
  showInactiveMeds?: boolean;
  onToggleInactiveMeds?: () => void;
  sharedPetIds?: Set<string>;
  visibleKinds: Set<CalendarEvent['kind']>;
  onToggleKind: (kind: CalendarEvent['kind']) => void;
}

const TYPE_FILTERS: { kind: CalendarEvent['kind']; label: string }[] = [
  { kind: 'vet-visit', label: '🏥 Vet Visits' },
  { kind: 'medication', label: '💊 Meds' },
  { kind: 'note', label: '📝 Notes' },
  { kind: 'birthday', label: '🎂 Birthdays' },
];

export function PetFilterChips({
  pets, petColors, selectedPetId, onChange,
  showInactiveMeds, onToggleInactiveMeds, sharedPetIds,
  visibleKinds, onToggleKind,
}: PetFilterChipsProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', px: { xs: 2, sm: 3 }, pt: 1.5, pb: 0.5, gap: 0.75 }}>
      {/* Pet filter row */}
      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
        <Chip
          label="All"
          size="small"
          onClick={() => onChange(null)}
          color={selectedPetId === null ? 'primary' : 'default'}
          variant={selectedPetId === null ? 'filled' : 'outlined'}
          sx={selectedPetId === null
            ? { fontWeight: 800, bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }
            : { fontWeight: 800 }
          }
        />
        {pets.map((pet) => {
          const isShared = sharedPetIds?.has(pet.id) ?? false;
          const chipColor = isShared ? '#c0a830' : petColors[pet.id];
          const isSelected = selectedPetId === pet.id;
          return (
            <Chip
              key={pet.id}
              label={isShared ? `${pet.name} · shared` : pet.name}
              size="small"
              onClick={() => onChange(pet.id)}
              variant={isSelected ? 'filled' : 'outlined'}
              sx={isSelected
                ? { fontWeight: 800, bgcolor: chipColor, color: 'white', '&:hover': { opacity: 0.9 } }
                : { fontWeight: 800, borderColor: chipColor, color: chipColor }
              }
            />
          );
        })}
        {onToggleInactiveMeds && (
          <Chip
            label="Show inactive meds"
            size="small"
            onClick={onToggleInactiveMeds}
            variant={showInactiveMeds ? 'filled' : 'outlined'}
            sx={showInactiveMeds
              ? { fontWeight: 800, bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }
              : { fontWeight: 800 }
            }
          />
        )}
      </Box>

      {/* Event type filter row */}
      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
        {TYPE_FILTERS.map(({ kind, label }) => {
          const active = visibleKinds.has(kind);
          return (
            <Chip
              key={kind}
              label={label}
              size="small"
              onClick={() => onToggleKind(kind)}
              variant={active ? 'filled' : 'outlined'}
              sx={active
                ? { fontWeight: 700, fontSize: '0.7rem', bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }
                : { fontWeight: 700, fontSize: '0.7rem', opacity: 0.5 }
              }
            />
          );
        })}
      </Box>
    </Box>
  );
}
