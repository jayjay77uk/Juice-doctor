import type { AppRole } from '@/lib/auth/roles';

/**
 * Identity & tenancy model — mirrors migrations 0002–0005. String-union enums
 * mirror the Postgres enums so the mock and Supabase providers share one shape.
 */

export type RecordStatus = 'draft' | 'active' | 'archived' | 'deleted';
export type ProfileStatus = 'invited' | 'active' | 'suspended' | 'deactivated';

export interface Organisation {
  id: string;
  slug: string;
  name: string;
  legalName: string | null;
  status: RecordStatus;
  defaultLocale: string;
  locales: string[];
  createdAt: string;
}

export interface Clinic {
  id: string;
  organisationId: string;
  slug: string;
  name: string;
  timezone: string;
  status: RecordStatus;
}

export interface Profile {
  id: string;
  organisationId: string | null;
  role: AppRole;
  email: string | null;
  fullName: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  phone: string | null;
  locale: string;
  timezone: string;
  status: ProfileStatus;
  onboardingCompleted: boolean;
  lastSeenAt: string | null;
  createdAt: string;
}

export interface OrganisationMembership {
  id: string;
  organisationId: string;
  userId: string;
  role: AppRole;
  clinicId: string | null;
  status: RecordStatus;
}

export type ConsentType =
  | 'terms_of_service'
  | 'privacy_policy'
  | 'medical_disclaimer'
  | 'data_processing'
  | 'marketing'
  | 'cookies'
  | 'ai_processing'
  | 'health_data_sharing';

export interface UserConsent {
  id: string;
  userId: string;
  consentType: ConsentType;
  documentVersion: string;
  granted: boolean;
  createdAt: string;
}

export interface UserPreferences {
  userId: string;
  theme: 'system' | 'light' | 'dark';
  locale: string;
  timezone: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  marketingOptIn: boolean;
}
