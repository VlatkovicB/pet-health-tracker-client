import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type { WeightEntry, CreateWeightEntryDto, UpdateWeightEntryDto } from '../types';

// ─── API functions ──────────────────────────────────────────────────────────

export const weightApi = {
  list: (petId: string): Promise<WeightEntry[]> =>
    apiClient.get<WeightEntry[]>(`/pets/${petId}/weight`).then((r) => r.data),

  create: (petId: string, data: CreateWeightEntryDto): Promise<WeightEntry> =>
    apiClient.post<WeightEntry>(`/pets/${petId}/weight`, data).then((r) => r.data),

  update: (petId: string, entryId: string, data: UpdateWeightEntryDto): Promise<WeightEntry> =>
    apiClient.put<WeightEntry>(`/pets/${petId}/weight/${entryId}`, data).then((r) => r.data),

  delete: (petId: string, entryId: string): Promise<void> =>
    apiClient.delete(`/pets/${petId}/weight/${entryId}`).then(() => undefined),
};

// ─── React Query hooks ──────────────────────────────────────────────────────

export function useWeightEntries(petId: string) {
  return useQuery({
    queryKey: ['weight', petId],
    queryFn: () => weightApi.list(petId),
    enabled: !!petId,
  });
}

export function useAddWeightEntry(petId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateWeightEntryDto) => weightApi.create(petId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weight', petId] });
    },
  });
}

export function useUpdateWeightEntry(petId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, data }: { entryId: string; data: UpdateWeightEntryDto }) =>
      weightApi.update(petId, entryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weight', petId] });
    },
  });
}

export function useDeleteWeightEntry(petId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entryId: string) => weightApi.delete(petId, entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weight', petId] });
    },
  });
}
