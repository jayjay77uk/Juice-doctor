-- 0026_crm_production.sql
-- Productionise the CRM: bring the live lead_status enum up to the app's 10-stage
-- pipeline, and add the columns the CRM UI works with (slug/name references,
-- review-closed flag, reminder). Additive + idempotent; preserves all data.

-- Enum additions (safe, additive). Existing values new/qualified/recommended/
-- subscribed/escalated/lost remain valid for any historical rows.
alter type lead_status add value if not exists 'consultation';
alter type lead_status add value if not exists 'human_review';
alter type lead_status add value if not exists 'awaiting_subscription';
alter type lead_status add value if not exists 'active';
alter type lead_status add value if not exists 'follow_up';
alter type lead_status add value if not exists 'inactive';
alter type lead_status add value if not exists 'closed';

alter table public.crm_leads add column if not exists recommended_specialist_slug text;
alter table public.crm_leads add column if not exists recommended_specialist_name text;
alter table public.crm_leads add column if not exists assigned_specialist_slug text;
alter table public.crm_leads add column if not exists escalated_to_name text;
alter table public.crm_leads add column if not exists responsible_admin_name text;
alter table public.crm_leads add column if not exists review_closed boolean not null default false;
alter table public.crm_leads add column if not exists reminder_at timestamptz;

create index if not exists crm_leads_org_status_idx
  on public.crm_leads (organisation_id, status, created_at desc);
create index if not exists crm_lead_events_lead_idx
  on public.crm_lead_events (lead_id, created_at desc);
