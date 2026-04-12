import { apiClient } from './client';
import type { VetVisit, Medication, PaginatedResult } from '../types';

export const healthApi = {
  // Vet Visits
  listVetVisits: (petId: string, { pageParam = 1 }: { pageParam?: number } = {}) =>
    apiClient.get<PaginatedResult<VetVisit>>(`/pets/${petId}/vet-visits`, { params: { page: pageParam, limit: 20 } }).then((r) => r.data),

  createVetVisit: (petId: string, data: Omit<VetVisit, 'id' | 'petId' | 'createdAt' | 'imageUrls'>) =>
    apiClient.post<VetVisit>(`/pets/${petId}/vet-visits`, data).then((r) => r.data),

  updateVetVisit: (petId: string, visitId: string, data: Partial<Omit<VetVisit, 'id' | 'petId' | 'createdAt' | 'imageUrls'>>) =>
    apiClient.put<VetVisit>(`/pets/${petId}/vet-visits/${visitId}`, data).then((r) => r.data),

  uploadVetVisitImage: (petId: string, visitId: string, file: File) => {
    const form = new FormData();
    form.append('image', file);
    return apiClient.post<VetVisit>(`/pets/${petId}/vet-visits/${visitId}/images`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },

  listUpcomingVetVisits: () =>
    apiClient.get<VetVisit[]>('/vet-visits/upcoming').then((r) => r.data),

  // Medications
  createMedication: (petId: string, data: Omit<Medication, 'id' | 'petId' | 'createdAt'>) =>
    apiClient.post<Medication>(`/pets/${petId}/medications`, data).then((r) => r.data),
};
