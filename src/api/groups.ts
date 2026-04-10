import { apiClient } from './client';
import type { Group, PaginatedResult } from '../types';

export const groupsApi = {
  list: ({ pageParam = 1 }: { pageParam?: number } = {}) =>
    apiClient.get<PaginatedResult<Group>>('/groups', { params: { page: pageParam, limit: 20 } }).then((r) => r.data),

  create: (data: { name: string }) =>
    apiClient.post<Group>('/groups', data).then((r) => r.data),

  invite: (groupId: string, email: string) =>
    apiClient.post(`/groups/${groupId}/invite`, { email }),
};
