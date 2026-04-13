export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Pet {
  id: string;
  name: string;
  species: string;
  breed?: string;
  birthDate?: string;
  photoUrl?: string;
  userId: string;
  createdAt: string;
}

export interface VetVisit {
  id: string;
  petId: string;
  type: 'logged' | 'scheduled';
  vetId?: string;
  clinic?: string;
  vetName?: string;
  reason: string;
  notes?: string;
  visitDate: string;
  imageUrls: string[];
  createdAt: string;
}

export type DayOfWeek = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

export type ReminderScheduleProps =
  | { type: 'daily'; times: string[] }
  | { type: 'weekly'; days: DayOfWeek[]; times: string[] }
  | { type: 'monthly'; daysOfMonth: number[]; times: string[] };

export interface Reminder {
  id: string;
  entityType: 'medication' | 'vet_visit';
  entityId: string;
  schedule: ReminderScheduleProps;
  enabled: boolean;
  notifyUserIds: string[];
  createdAt: string;
}

export interface Medication {
  id: string;
  petId: string;
  name: string;
  dosage: { amount: number; unit: string };
  frequency: { type: string; interval: number; label: string };
  startDate: string;
  endDate?: string;
  notes?: string;
  active: boolean;
  createdAt: string;
}

export interface Vet {
  id: string;
  userId: string;
  name: string;
  address?: string;
  phone?: string;
  workHours?: string;
  googleMapsUrl?: string;
  notes?: string;
  createdAt: string;
}

export interface AuthTokens {
  token: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  nextPage: number | null;
}
