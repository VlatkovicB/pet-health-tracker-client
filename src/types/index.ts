export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  members: GroupMember[];
  createdAt: string;
}

export interface GroupMember {
  userId: string;
  role: 'owner' | 'member';
  joinedAt: string;
}

export interface Pet {
  id: string;
  name: string;
  species: string;
  breed?: string;
  birthDate?: string;
  photoUrl?: string;
  groupId: string;
  createdAt: string;
}

export interface VetVisit {
  id: string;
  petId: string;
  vetId?: string;
  clinic?: string;
  vetName?: string;
  reason: string;
  notes?: string;
  visitDate: string;
  nextVisitDate?: string;
  imageUrls: string[];
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

export interface Symptom {
  id: string;
  petId: string;
  description: string;
  severity: 'mild' | 'moderate' | 'severe';
  observedAt: string;
  notes?: string;
  createdAt: string;
}

export interface HealthCheck {
  id: string;
  petId: string;
  weight?: number;
  temperature?: number;
  notes?: string;
  checkedAt: string;
  createdAt: string;
}

export interface Vet {
  id: string;
  groupId: string;
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
