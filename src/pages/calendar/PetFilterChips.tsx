import { Box, Chip } from '@mui/material';
import type { Pet } from '../../types';

interface PetFilterChipsProps {
  pets: Pet[];
  petColors: Record<string, string>;
  selectedPetId: string | null;
  onChange: (petId: string | null) => void;
  showInactiveMeds?: boolean;
  onToggleInactiveMeds?: () => void;
  sharedPetIds?: Set<string>;
}

export function PetFilterChips({
  pets, petColors, selectedPetId, onChange,
  showInactiveMeds, onToggleInactiveMeds, sharedPetIds,
}: PetFilterChipsProps) {
  return (
    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', px: { xs: 2, sm: 3 }, pt: 1.5, pb: 0.5 }}>
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
  );
}
