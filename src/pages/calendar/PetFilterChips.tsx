import { Box, Chip } from '@mui/material';
import type { Pet } from '../../types';

interface PetFilterChipsProps {
  pets: Pet[];
  petColors: Record<string, string>;
  selectedPetId: string | null;
  onChange: (petId: string | null) => void;
}

export function PetFilterChips({ pets, petColors, selectedPetId, onChange }: PetFilterChipsProps) {
  return (
    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', px: { xs: 2, sm: 3 }, pt: 1.5, pb: 0.5 }}>
      <Chip
        label="All"
        size="small"
        onClick={() => onChange(null)}
        color={selectedPetId === null ? 'primary' : 'default'}
        variant={selectedPetId === null ? 'filled' : 'outlined'}
        sx={{ fontWeight: 600, fontSize: '0.75rem' }}
      />
      {pets.map((pet) => (
        <Chip
          key={pet.id}
          label={pet.name}
          size="small"
          onClick={() => onChange(pet.id)}
          variant={selectedPetId === pet.id ? 'filled' : 'outlined'}
          sx={{
            fontWeight: selectedPetId === pet.id ? 700 : 400,
            fontSize: '0.75rem',
            borderColor: petColors[pet.id],
            color: selectedPetId === pet.id ? '#fff' : petColors[pet.id],
            bgcolor: selectedPetId === pet.id ? petColors[pet.id] : 'transparent',
            '&:hover': { bgcolor: selectedPetId === pet.id ? petColors[pet.id] : `${petColors[pet.id]}22` },
          }}
        />
      ))}
    </Box>
  );
}
