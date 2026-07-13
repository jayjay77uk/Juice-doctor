import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { HERNE_ORG } from './records';
import { HERNE_SHARED_DNA } from '@/data/herne/specialist-content';

/**
 * Read models + safe writes for the HERNE admin surfaces. Everything is org-scoped
 * (organisation_id = HERNE_ORG) and read via the admin client. Where a table has no
 * data yet the reads return empty/zero — the admin pages render honest empty states
 * rather than inventing rows. The only write here is the shared DNA (already stored
 * in system_settings and safe to edit); all other collaboration/wearable rows are
 * produced by the runtime engines, so admin views are read-only.
 */

async function countRows(table: string, eqs: [string, string | boolean][] = []): Promise<number> {
  const sb = createAdminClient();
  if (!sb) return 0;
  let q = sb.from(table).select('id', { count: 'exact', head: true }).eq('organisation_id', HERNE_ORG);
  for (const [col, val] of eqs) q = q.eq(col, val);
  const { count: c } = await q;
  return c ?? 0;
}

export interface HerneAdminOverview {
  configured: boolean;
  specialists: number;
  evidenceRecords: number;
  ingestionAudit: number;
  referralRules: number;
  humanEscalationRules: number;
  activeCarePlans: number;
  carePlanActions: number;
  referrals: number;
  escalations: number;
  timelineEvents: number;
  wearableMetrics: number;
  wearableConnections: number;
  grantedConsents: number;
  measurements: number;
  aiAccessLogs: number;
}

export async function herneAdminOverview(): Promise<HerneAdminOverview> {
  const sb = createAdminClient();
  if (!sb) {
    return {
      configured: false,
      specialists: 0, evidenceRecords: 0, ingestionAudit: 0, referralRules: 0, humanEscalationRules: 0,
      activeCarePlans: 0, carePlanActions: 0, referrals: 0, escalations: 0, timelineEvents: 0,
      wearableMetrics: 0, wearableConnections: 0, grantedConsents: 0, measurements: 0, aiAccessLogs: 0,
    };
  }

  const [
    specialists, evidenceRecords, ingestionAudit, referralRules, humanEscalationRules,
    activeCarePlans, referrals, escalations, timelineEvents,
    wearableMetrics, wearableConnections, grantedConsents, measurements, aiAccessLogs,
  ] = await Promise.all([
    // Specialists carry a herne_config; count agents that have one.
    sb.from('ai_agents').select('id', { count: 'exact', head: true }).eq('organisation_id', HERNE_ORG).not('herne_config', 'is', null).then((r) => r.count ?? 0),
    sb.from('herne_evidence_records').select('id', { count: 'exact', head: true }).eq('organisation_id', HERNE_ORG).then((r) => r.count ?? 0),
    // herne_ingestion_audit is not org-scoped (no organisation_id column).
    sb.from('herne_ingestion_audit').select('id', { count: 'exact', head: true }).then((r) => r.count ?? 0),
    countRows('herne_referral_rules'),
    countRows('herne_referral_rules', [['is_human_escalation', true]]),
    countRows('herne_care_plans', [['status', 'active']]),
    countRows('herne_referrals'),
    countRows('herne_escalations'),
    countRows('herne_timeline_events'),
    countRows('wearable_metric_catalog'),
    countRows('user_wearable_connections'),
    countRows('wearable_consents', [['status', 'granted']]),
    countRows('wearable_measurements'),
    countRows('wearable_ai_context_logs'),
  ]);

  const carePlanActions = await sb.from('herne_care_plan_actions').select('id', { count: 'exact', head: true }).then((r) => r.count ?? 0);

  return {
    configured: true,
    specialists, evidenceRecords, ingestionAudit, referralRules, humanEscalationRules,
    activeCarePlans, carePlanActions, referrals, escalations, timelineEvents,
    wearableMetrics, wearableConnections, grantedConsents, measurements, aiAccessLogs,
  };
}

export interface AdminReferral {
  id: string;
  fromSpecialist: string;
  toSpecialist: string | null;
  toHumanRole: string | null;
  trigger: string | null;
  reason: string | null;
  urgency: string | null;
  status: string;
  createdAt: string;
}

export async function listReferrals(limit = 25): Promise<AdminReferral[]> {
  const sb = createAdminClient();
  if (!sb) return [];
  const { data } = await sb.from('herne_referrals').select('*').eq('organisation_id', HERNE_ORG).order('created_at', { ascending: false }).limit(limit);
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: String(r.id),
    fromSpecialist: String(r.from_specialist),
    toSpecialist: (r.to_specialist as string | null) ?? null,
    toHumanRole: (r.to_human_role as string | null) ?? null,
    trigger: (r.trigger as string | null) ?? null,
    reason: (r.reason as string | null) ?? null,
    urgency: (r.urgency as string | null) ?? null,
    status: String(r.status ?? 'open'),
    createdAt: String(r.created_at),
  }));
}

export interface AdminEscalation {
  id: string;
  trigger: string;
  reason: string | null;
  specialist: string | null;
  destination: string | null;
  urgency: string | null;
  createdAt: string;
}

export async function listEscalations(limit = 25): Promise<AdminEscalation[]> {
  const sb = createAdminClient();
  if (!sb) return [];
  const { data } = await sb.from('herne_escalations').select('*').eq('organisation_id', HERNE_ORG).order('created_at', { ascending: false }).limit(limit);
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: String(r.id),
    trigger: String(r.trigger),
    reason: (r.reason as string | null) ?? null,
    specialist: (r.specialist as string | null) ?? null,
    destination: (r.destination as string | null) ?? null,
    urgency: (r.urgency as string | null) ?? null,
    createdAt: String(r.created_at),
  }));
}

export interface AdminCarePlan {
  id: string;
  userId: string;
  status: string;
  goals: string[];
  assignedSpecialists: string[];
  actionCount: number;
  updatedAt: string;
}

export async function listCarePlans(limit = 25): Promise<AdminCarePlan[]> {
  const sb = createAdminClient();
  if (!sb) return [];
  const { data } = await sb.from('herne_care_plans').select('*').eq('organisation_id', HERNE_ORG).order('updated_at', { ascending: false }).limit(limit);
  const plans = data ?? [];
  // Count actions per plan (one query per plan is fine at admin list sizes).
  const withCounts = await Promise.all(
    plans.map(async (p: Record<string, unknown>) => {
      const { count: c } = await sb.from('herne_care_plan_actions').select('id', { count: 'exact', head: true }).eq('care_plan_id', String(p.id));
      return {
        id: String(p.id),
        userId: String(p.user_id),
        status: String(p.status ?? 'active'),
        goals: Array.isArray(p.goals) ? (p.goals as string[]) : [],
        assignedSpecialists: Array.isArray(p.assigned_specialists) ? (p.assigned_specialists as string[]) : [],
        actionCount: c ?? 0,
        updatedAt: String(p.updated_at),
      };
    }),
  );
  return withCounts;
}

export interface AdminWearableMetric {
  metricId: string;
  name: string;
  category: string | null;
  unit: string | null;
  specialistAccess: string[];
  sensitivity: string;
  trendSuitable: boolean;
  status: string;
}

export async function listWearableCatalog(): Promise<AdminWearableMetric[]> {
  const sb = createAdminClient();
  if (!sb) return [];
  const { data } = await sb.from('wearable_metric_catalog').select('*').eq('organisation_id', HERNE_ORG).order('metric_id');
  return (data ?? []).map((r: Record<string, unknown>) => ({
    metricId: String(r.metric_id),
    name: String(r.name),
    category: (r.category as string | null) ?? null,
    unit: (r.unit as string | null) ?? null,
    specialistAccess: Array.isArray(r.specialist_access) ? (r.specialist_access as string[]) : [],
    sensitivity: String(r.sensitivity ?? 'standard'),
    trendSuitable: Boolean(r.trend_suitable),
    status: String(r.status ?? 'client_supplied'),
  }));
}

export interface AdminConsent {
  id: string;
  userId: string;
  providerKey: string;
  status: string;
  categories: string[];
  version: number;
  createdAt: string;
}

export async function listConsents(limit = 25): Promise<AdminConsent[]> {
  const sb = createAdminClient();
  if (!sb) return [];
  const { data } = await sb.from('wearable_consents').select('*').eq('organisation_id', HERNE_ORG).order('created_at', { ascending: false }).limit(limit);
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: String(r.id),
    userId: String(r.user_id),
    providerKey: String(r.provider_key),
    status: String(r.status ?? 'granted'),
    categories: Array.isArray(r.categories) ? (r.categories as string[]) : [],
    version: Number(r.version ?? 1),
    createdAt: String(r.created_at),
  }));
}

export interface AdminAiAccessLog {
  id: string;
  specialist: string;
  metricCount: number;
  createdAt: string;
}

export async function listAiAccessLogs(limit = 25): Promise<AdminAiAccessLog[]> {
  const sb = createAdminClient();
  if (!sb) return [];
  const { data } = await sb.from('wearable_ai_context_logs').select('id, specialist, metric_count, created_at').eq('organisation_id', HERNE_ORG).order('created_at', { ascending: false }).limit(limit);
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: String(r.id),
    specialist: String(r.specialist ?? '—'),
    metricCount: Number(r.metric_count ?? 0),
    createdAt: String(r.created_at),
  }));
}

/** Read the org shared DNA (admin-editable) with a bundled fallback. */
export async function getSharedDna(): Promise<{ dna: string[]; stored: boolean }> {
  const sb = createAdminClient();
  if (!sb) return { dna: HERNE_SHARED_DNA, stored: false };
  const { data } = await sb.from('system_settings').select('value').eq('organisation_id', HERNE_ORG).eq('key', 'herne_shared_dna').maybeSingle();
  const value = data?.value as { dna?: unknown } | null;
  if (Array.isArray(value?.dna)) return { dna: value?.dna as string[], stored: true };
  return { dna: HERNE_SHARED_DNA, stored: false };
}

/** Persist the org shared DNA. Trims + drops empties; never writes an empty list. */
export async function setSharedDna(items: string[]): Promise<{ ok: boolean; dna: string[]; reason?: string }> {
  const clean = items.map((s) => s.trim()).filter(Boolean);
  const dna = clean.length ? clean : HERNE_SHARED_DNA;
  const sb = createAdminClient();
  if (!sb) return { ok: false, dna, reason: 'unavailable' };
  const { error } = await sb
    .from('system_settings')
    .upsert({ organisation_id: HERNE_ORG, key: 'herne_shared_dna', value: { dna } }, { onConflict: 'organisation_id,key' });
  if (error) return { ok: false, dna, reason: error.message };
  return { ok: true, dna };
}
