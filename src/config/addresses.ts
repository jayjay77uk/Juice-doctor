import 'server-only';

/**
 * Business email addresses — single source of truth, ALL env-driven. Nothing
 * here hardcodes a mailbox: until the client's domain mailboxes (Zoho) exist
 * and the variables are set, each address is null and every consumer must
 * treat its workflow as honestly unavailable rather than inventing a sender
 * or destination.
 */

function address(value: string): string | null {
  const v = value.trim();
  return v.includes('@') ? v : null;
}

export interface BusinessAddresses {
  /** From-address for all outbound platform mail (MAIL_FROM_ADDRESS). */
  from: string | null;
  /** Reply-to on outbound mail; falls back to the from-address. */
  replyTo: string | null;
  /** Destination for contact-form messages (CONTACT_INBOX_ADDRESS). */
  contactInbox: string | null;
  /** Destination for staff alerts — escalations, due follow-ups (STAFF_ALERTS_ADDRESS). */
  staffAlerts: string | null;
}

export function businessAddresses(): BusinessAddresses {
  // Read per call (not at module load) so config changes and tests apply.
  const from = address(process.env.MAIL_FROM_ADDRESS ?? '');
  return {
    from,
    replyTo: address(process.env.MAIL_REPLY_TO_ADDRESS ?? '') ?? from,
    contactInbox: address(process.env.CONTACT_INBOX_ADDRESS ?? ''),
    staffAlerts: address(process.env.STAFF_ALERTS_ADDRESS ?? '') ?? address(process.env.CONTACT_INBOX_ADDRESS ?? ''),
  };
}
