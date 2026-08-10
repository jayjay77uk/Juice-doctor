import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Marketing-surface persistence — public contact messages and newsletter
 * subscribers (tables ship in migration 0031, service-role only). Until that
 * migration is applied every write reports `available: false` and the forms
 * keep their honest "not available yet" state — nothing is simulated.
 */

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  status: string;
  createdAt: string;
}

export const marketingRepo = {
  async createContactMessage(input: { name: string; email: string; subject: string; message: string }): Promise<{ available: boolean; id: string | null }> {
    const sb = createAdminClient();
    if (!sb) return { available: false, id: null };
    const { data, error } = await sb
      .from('contact_messages')
      .insert({ name: input.name, email: input.email, subject: input.subject, message: input.message, status: 'new' })
      .select('id')
      .single();
    if (error || !data) return { available: false, id: null };
    return { available: true, id: String(data.id) };
  },

  async listContactMessages(limit = 50): Promise<{ available: boolean; rows: ContactMessage[] }> {
    const sb = createAdminClient();
    if (!sb) return { available: false, rows: [] };
    const { data, error } = await sb.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(limit);
    if (error) return { available: false, rows: [] };
    return {
      available: true,
      rows: (data ?? []).map((r) => ({
        id: String(r.id),
        name: String(r.name),
        email: String(r.email),
        subject: String(r.subject ?? ''),
        message: String(r.message),
        status: String(r.status),
        createdAt: String(r.created_at),
      })),
    };
  },

  async setContactMessageStatus(id: string, status: 'new' | 'seen' | 'replied'): Promise<boolean> {
    const sb = createAdminClient();
    if (!sb) return false;
    const { data, error } = await sb.from('contact_messages').update({ status }).eq('id', id).select('id').maybeSingle();
    return !error && Boolean(data);
  },

  /** Idempotent subscribe — re-subscribing an existing address is a no-op success. */
  async subscribeNewsletter(email: string): Promise<{ available: boolean; subscribed: boolean }> {
    const sb = createAdminClient();
    if (!sb) return { available: false, subscribed: false };
    const { error } = await sb
      .from('newsletter_subscribers')
      .upsert({ email: email.toLowerCase(), status: 'subscribed' }, { onConflict: 'email' });
    if (error) return { available: false, subscribed: false };
    return { available: true, subscribed: true };
  },

  async listNewsletterSubscribers(limit = 100): Promise<{ available: boolean; rows: NewsletterSubscriber[] }> {
    const sb = createAdminClient();
    if (!sb) return { available: false, rows: [] };
    const { data, error } = await sb.from('newsletter_subscribers').select('*').order('created_at', { ascending: false }).limit(limit);
    if (error) return { available: false, rows: [] };
    return {
      available: true,
      rows: (data ?? []).map((r) => ({ id: String(r.id), email: String(r.email), status: String(r.status), createdAt: String(r.created_at) })),
    };
  },
};
