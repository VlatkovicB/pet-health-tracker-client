import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type { Note, CreateNoteDto, UpdateNoteDto } from '../types';

// ─── API functions ──────────────────────────────────────────────────────────

export const notesApi = {
  list: (params: { petId?: string; from?: string; to?: string } = {}): Promise<Note[]> =>
    apiClient.get<Note[]>('/notes', { params }).then((r) => r.data),

  create: (data: CreateNoteDto): Promise<Note> =>
    apiClient.post<Note>('/notes', data).then((r) => r.data),

  update: (noteId: string, data: UpdateNoteDto): Promise<Note> =>
    apiClient.put<Note>(`/notes/${noteId}`, data).then((r) => r.data),

  delete: (noteId: string): Promise<void> =>
    apiClient.delete(`/notes/${noteId}`).then(() => undefined),

  addImage: (noteId: string, file: File): Promise<Note> => {
    const form = new FormData();
    form.append('image', file);
    return apiClient
      .post<Note>(`/notes/${noteId}/images`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },
};

// ─── React Query hooks ──────────────────────────────────────────────────────

export function useNotes(params: { petId?: string; from?: string; to?: string } = {}) {
  return useQuery({
    queryKey: ['notes', params],
    queryFn: () => notesApi.list(params),
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateNoteDto) => notesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, data }: { noteId: string; data: UpdateNoteDto }) =>
      notesApi.update(noteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) => notesApi.delete(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}

export function useAddNoteImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, file }: { noteId: string; file: File }) =>
      notesApi.addImage(noteId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}
