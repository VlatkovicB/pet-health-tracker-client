import { apiClient } from './client';
import type { Pet, PaginatedResult } from '../types';

export const petsApi = {
  list: (groupId: string, { pageParam = 1 }: { pageParam?: number } = {}) =>
    apiClient.get<PaginatedResult<Pet>>(`/groups/${groupId}/pets`, { params: { page: pageParam, limit: 20 } }).then((r) => r.data),

  get: (groupId: string, petId: string) =>
    apiClient.get<Pet>(`/groups/${groupId}/pets/${petId}`).then((r) => r.data),

  create: (groupId: string, data: Omit<Pet, 'id' | 'groupId' | 'createdAt'>) =>
    apiClient.post<Pet>(`/groups/${groupId}/pets`, data).then((r) => r.data),

  update: (groupId: string, petId: string, data: Partial<Omit<Pet, 'id' | 'groupId' | 'createdAt' | 'photoUrl'>>) =>
    apiClient.put<Pet>(`/groups/${groupId}/pets/${petId}`, data).then((r) => r.data),

  uploadPhoto: (groupId: string, petId: string, file: File) => {
    const form = new FormData();
    form.append('photo', file);
    return apiClient.post<Pet>(`/groups/${groupId}/pets/${petId}/photo`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
};
