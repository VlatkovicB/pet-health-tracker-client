import { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  MenuItem,
  Typography,
} from '@mui/material';
import { useUploadPhoto } from '../../api/photos';
import type { Pet } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  pets: Pet[];
}

export function UploadPhotoDialog({ open, onClose, pets }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [petId, setPetId] = useState('');
  const [takenAt, setTakenAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [caption, setCaption] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutate: upload, isPending } = useUploadPhoto();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setPetId('');
    setTakenAt(new Date().toISOString().slice(0, 10));
    setCaption('');
    onClose();
  };

  const handleUpload = () => {
    if (!file || !petId || !takenAt) return;
    const form = new FormData();
    form.append('file', file);
    form.append('petId', petId);
    form.append('takenAt', takenAt);
    if (caption.trim()) form.append('caption', caption.trim());
    upload(form, { onSuccess: handleClose });
  };

  const isValid = !!file && !!petId && !!takenAt;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Upload Photo</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
        {/* File picker / preview */}
        <Box
          onClick={() => fileInputRef.current?.click()}
          sx={{
            border: '2px dashed',
            borderColor: preview ? 'primary.main' : 'divider',
            borderRadius: 2,
            height: 180,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            overflow: 'hidden',
            bgcolor: 'action.hover',
            '&:hover': { borderColor: 'primary.light' },
          }}
        >
          {preview ? (
            <Box
              component="img"
              src={preview}
              alt="preview"
              sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          ) : (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Click to select an image
            </Typography>
          )}
        </Box>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {/* Pet selector */}
        <TextField
          select
          label="Pet"
          value={petId}
          onChange={(e) => setPetId(e.target.value)}
          size="small"
          required
        >
          {pets.map((pet) => (
            <MenuItem key={pet.id} value={pet.id}>
              {pet.name}
            </MenuItem>
          ))}
        </TextField>

        {/* Date */}
        <TextField
          label="Date taken"
          type="date"
          value={takenAt}
          onChange={(e) => setTakenAt(e.target.value)}
          size="small"
          required
          slotProps={{ inputLabel: { shrink: true } }}
        />

        {/* Caption */}
        <TextField
          label="Caption (optional)"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          multiline
          minRows={2}
          size="small"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isPending}>
          Cancel
        </Button>
        <Button
          onClick={handleUpload}
          variant="contained"
          disabled={!isValid || isPending}
        >
          {isPending ? 'Uploading…' : 'Upload'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
