import { apiClient } from './client';
import type { Vet, PaginatedResult } from '../types';

export const vetsApi = {
  list: (groupId: string, { pageParam = 1 }: { pageParam?: number } = {}) =>
    apiClient.get<PaginatedResult<Vet>>(`/groups/${groupId}/vets`, { params: { page: pageParam, limit: 20 } }).then((r) => r.data),

  listAll: (groupId: string) =>
    apiClient.get<PaginatedResult<Vet>>(`/groups/${groupId}/vets`, { params: { page: 1, limit: 100 } }).then((r) => r.data.items),

  create: (groupId: string, data: Omit<Vet, 'id' | 'groupId' | 'createdAt'>) =>
    apiClient.post<Vet>(`/groups/${groupId}/vets`, data).then((r) => r.data),
};
