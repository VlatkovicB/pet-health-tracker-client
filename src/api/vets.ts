import { apiClient } from './client';
import type { Vet, PaginatedResult } from '../types';

export const vetsApi = {
  list: ({ pageParam = 1 }: { pageParam?: number } = {}) =>
    apiClient.get<PaginatedResult<Vet>>('/vets', { params: { page: pageParam, limit: 20 } }).then((r) => r.data),

  listAll: () =>
    apiClient.get<PaginatedResult<Vet>>('/vets', { params: { page: 1, limit: 100 } }).then((r) => r.data.items),

  create: (data: Omit<Vet, 'id' | 'userId' | 'createdAt'>) =>
    apiClient.post<Vet>('/vets', data).then((r) => r.data),

  update: (id: string, data: Omit<Vet, 'id' | 'userId' | 'createdAt'>) =>
    apiClient.put<Vet>(`/vets/${id}`, data).then((r) => r.data),
};
