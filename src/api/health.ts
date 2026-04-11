import { apiClient } from './client';
import type { VetVisit, Medication, Symptom, HealthCheck, PaginatedResult } from '../types';

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

  // Medications
  createMedication: (petId: string, data: Omit<Medication, 'id' | 'petId' | 'createdAt'>) =>
    apiClient.post<Medication>(`/pets/${petId}/medications`, data).then((r) => r.data),

  updateReminder: (medicationId: string, reminder: Medication['reminder']) =>
    apiClient.put(`/medications/${medicationId}/reminder`, { reminder }).then((r) => r.data),

  toggleReminder: (medicationId: string) =>
    apiClient.patch(`/medications/${medicationId}/reminder/toggle`).then((r) => r.data),

  listUpcomingVetVisits: (groupId: string) =>
    apiClient.get<VetVisit[]>(`/groups/${groupId}/upcoming-vet-visits`).then((r) => r.data),

  // Symptoms
  listSymptoms: (petId: string, { pageParam = 1 }: { pageParam?: number } = {}) =>
    apiClient.get<PaginatedResult<Symptom>>(`/pets/${petId}/symptoms`, { params: { page: pageParam, limit: 20 } }).then((r) => r.data),

  createSymptom: (petId: string, data: Omit<Symptom, 'id' | 'petId' | 'createdAt'>) =>
    apiClient.post<Symptom>(`/pets/${petId}/symptoms`, data).then((r) => r.data),

  // Health Checks
  listHealthChecks: (petId: string, { pageParam = 1 }: { pageParam?: number } = {}) =>
    apiClient.get<PaginatedResult<HealthCheck>>(`/pets/${petId}/health-checks`, { params: { page: pageParam, limit: 20 } }).then((r) => r.data),

  createHealthCheck: (petId: string, data: Omit<HealthCheck, 'id' | 'petId' | 'createdAt'>) =>
    apiClient.post<HealthCheck>(`/pets/${petId}/health-checks`, data).then((r) => r.data),
};
