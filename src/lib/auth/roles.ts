/**
 * The platform role hierarchy — the single source of truth for roles in code.
 *
 * Mirrors the `app_role` enum in db/migrations/0001. Roles are ORDERED: a higher
 * rank implicitly satisfies any lower-rank requirement (`hasMinRole`). This is
 * the backbone of both the permission matrix (src/config/permissions.ts) and the
 * route/action guards (src/lib/auth/authorize.ts).
 */

export const APP_ROLES = [
  'guest',
  'member',
  'practitioner',
  'staff',
  'administrator',
  'super_administrator',
] as const;

export type AppRole = (typeof APP_ROLES)[number];

/** Ordinal rank per role. Higher = more privileged. Must match db role_rank(). */
export const ROLE_RANK: Record<AppRole, number> = {
  guest: 0,
  member: 1,
  practitioner: 2,
  staff: 3,
  administrator: 4,
  super_administrator: 5,
};

export interface RoleMeta {
  role: AppRole;
  label: string;
  description: string;
  /** True for roles that operate the platform (staff and above). */
  isStaff: boolean;
}

export const ROLE_META: Record<AppRole, RoleMeta> = {
  guest: {
    role: 'guest',
    label: 'Guest',
    description: 'An unauthenticated visitor. Can view public content only.',
    isStaff: false,
  },
  member: {
    role: 'member',
    label: 'Member',
    description: 'A registered client. Manages their own profile, health data and bookings.',
    isStaff: false,
  },
  practitioner: {
    role: 'practitioner',
    label: 'Practitioner',
    description: 'A coach or clinician delivering care to assigned members.',
    isStaff: true,
  },
  staff: {
    role: 'staff',
    label: 'Staff',
    description: 'Operational staff managing bookings, content and day-to-day operations.',
    isStaff: true,
  },
  administrator: {
    role: 'administrator',
    label: 'Administrator',
    description: 'Manages users, roles, knowledge, programmes and settings for the organisation.',
    isStaff: true,
  },
  super_administrator: {
    role: 'super_administrator',
    label: 'Super Administrator',
    description: 'Platform owner with cross-organisation control. Holds every permission.',
    isStaff: true,
  },
};

export function roleRank(role: AppRole): number {
  return ROLE_RANK[role];
}

/** True when `role` is at least as privileged as `minimum`. */
export function hasMinRole(role: AppRole, minimum: AppRole): boolean {
  return roleRank(role) >= roleRank(minimum);
}

export function isStaffRole(role: AppRole): boolean {
  return hasMinRole(role, 'staff');
}

export function isAdminRole(role: AppRole): boolean {
  return hasMinRole(role, 'administrator');
}

export function isSuperAdminRole(role: AppRole): boolean {
  return role === 'super_administrator';
}
