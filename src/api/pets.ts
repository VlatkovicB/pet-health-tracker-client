import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';
import type { Pet, PaginatedResult } from '../types';

export const petsApi = {
  list: ({ pageParam = 1 }: { pageParam?: number } = {}) =>
    apiClient.get<PaginatedResult<Pet>>('/pets', { params: { page: pageParam, limit: 20 } }).then((r) => r.data),

  get: (petId: string) =>
    apiClient.get<Pet>(`/pets/${petId}`).then((r) => r.data),

  create: (data: Omit<Pet, 'id' | 'userId' | 'createdAt'>) =>
    apiClient.post<Pet>('/pets', data).then((r) => r.data),

  update: (petId: string, data: Partial<Omit<Pet, 'id' | 'userId' | 'createdAt' | 'photoUrl'>>) =>
    apiClient.put<Pet>(`/pets/${petId}`, data).then((r) => r.data),

  uploadPhoto: (petId: string, file: File) => {
    const form = new FormData();
    form.append('photo', file);
    return apiClient.post<Pet>(`/pets/${petId}/photo`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
};

export function usePets() {
  return useQuery({
    queryKey: ['pets', 'all'],
    queryFn: () => petsApi.list({ pageParam: 1 }).then((r) => r.items),
  });
}
