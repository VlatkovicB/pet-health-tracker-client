import { apiClient } from './client';
import type { Medication } from '../types';

export interface CreateMedicationInput {
  name: string;
  dosageAmount: number;
  dosageUnit: string;
  frequency: { type: string; interval: number };
  startDate: string;
  endDate?: string;
  notes?: string;
}

export interface UpdateMedicationInput {
  name?: string;
  dosageAmount?: number;
  dosageUnit?: string;
  frequency?: { type: string; interval: number };
  startDate?: string;
  endDate?: string | null;
  notes?: string | null;
  active?: boolean;
}

export const medicationsApi = {
  list(petId: string): Promise<Medication[]> {
    return apiClient.get(`/pets/${petId}/medications`).then((r) => r.data);
  },

  create(petId: string, data: CreateMedicationInput): Promise<Medication> {
    return apiClient.post(`/pets/${petId}/medications`, data).then((r) => r.data);
  },

  update(petId: string, medicationId: string, data: UpdateMedicationInput): Promise<Medication> {
    return apiClient.put(`/pets/${petId}/medications/${medicationId}`, data).then((r) => r.data);
  },
};
