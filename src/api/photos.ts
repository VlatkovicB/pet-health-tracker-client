import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type { Photo, PhotoTimeline } from '../types/photo';

const photoApi = {
  getTimeline: (year: number, petIds?: string[]): Promise<PhotoTimeline> => {
    const params: Record<string, unknown> = { year };
    if (petIds?.length) params['petIds[]'] = petIds;
    return apiClient.get<PhotoTimeline>('/photos/timeline', { params }).then((r) => r.data);
  },
  getYears: (petIds?: string[]): Promise<number[]> => {
    const params: Record<string, unknown> = {};
    if (petIds?.length) params['petIds[]'] = petIds;
    return apiClient.get<number[]>('/photos/years', { params }).then((r) => r.data);
  },
  upload: (data: FormData): Promise<Photo> =>
    apiClient
      .post<Photo>('/photos/', data, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data),
  delete: (photoId: string): Promise<void> =>
    apiClient.delete(`/photos/${photoId}`).then(() => undefined),
};

export function usePhotoTimeline(year: number, petIds?: string[]) {
  return useQuery({
    queryKey: ['photos', 'timeline', year, petIds],
    queryFn: () => photoApi.getTimeline(year, petIds),
  });
}

export function usePhotoYears(petIds?: string[]) {
  return useQuery({
    queryKey: ['photos', 'years', petIds],
    queryFn: () => photoApi.getYears(petIds),
  });
}

export function useUploadPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: FormData) => photoApi.upload(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos'] });
    },
  });
}

export function useDeletePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (photoId: string) => photoApi.delete(photoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos'] });
    },
  });
}

export function useAttachPhotoToVisit(visitId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: FormData) =>
      apiClient.post<Photo>(`/photos/vet-visits/${visitId}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['photos'] }); },
  });
}

export function useAttachPhotoToNote(noteId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: FormData) =>
      apiClient.post<Photo>(`/photos/notes/${noteId}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['photos'] }); },
  });
}

export function useAttachPhotoToWeightEntry(entryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: FormData) =>
      apiClient.post<Photo>(`/photos/weight-entries/${entryId}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['photos'] }); },
  });
}
