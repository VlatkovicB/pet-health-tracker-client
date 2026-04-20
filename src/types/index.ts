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
  color?: string;
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

export interface VetWorkHours {
  dayOfWeek: DayOfWeek;
  open: boolean;
  startTime?: string;
  endTime?: string;
}

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

export interface AdvanceNotice {
  amount: number;
  unit: 'minutes' | 'hours' | 'days';
}

export interface Medication {
  id: string;
  petId: string;
  name: string;
  dosage: { amount: number; unit: string };
  schedule: ReminderScheduleProps;
  startDate: string;
  endDate?: string;
  notes?: string;
  active: boolean;
  reminderEnabled: boolean;
  advanceNotice?: AdvanceNotice;
  createdAt: string;
}

export interface Vet {
  id: string;
  userId: string;
  name: string;
  address?: string;
  phone?: string;
  workHours?: VetWorkHours[];
  googleMapsUrl?: string;
  rating?: number;
  placeId?: string;
  notes?: string;
  createdAt: string;
}

export type CalendarEvent =
  | {
      kind: 'vet-visit';
      id: string;
      petId: string;
      date: string;
      type: 'logged' | 'scheduled';
      reason: string;
      vetName?: string;
      clinic?: string;
    }
  | {
      kind: 'medication';
      id: string;
      petId: string;
      startDate: string;
      endDate?: string;
      name: string;
      dosageLabel: string;
      frequencyLabel: string;
      hasReminder: boolean;
    };

export interface AuthTokens {
  token: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  nextPage: number | null;
}
