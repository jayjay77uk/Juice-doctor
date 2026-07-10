/**
 * Application mode — the single source of truth for prototype vs production.
 *
 * `NEXT_PUBLIC_APP_MODE` is COSMETIC ONLY. It drives the "Prototype
 * Environment" banner and other client-visible prototype affordances. It is
 * safe to expose to the browser.
 *
 * The DATA-provider selection (mock vs Supabase) is made separately, in the
 * server-only service layer, off the non-public `APP_MODE` env — so a Supabase
 * client can never be tree-shaken into a client bundle. See `src/services/`.
 */
export type AppMode = 'prototype' | 'production';

const rawMode = process.env.NEXT_PUBLIC_APP_MODE;
export const appMode: AppMode = rawMode === 'production' ? 'production' : 'prototype';

export const config = {
  appMode,
  /** True in every non-production environment. Drives the banner + preview affordances. */
  isPrototype: appMode !== 'production',
} as const;

/** Copy shown in the prototype banner. Approved wording (approval-gate item #6). */
export const PROTOTYPE_BANNER_TEXT =
  'Prototype Environment — For Demonstration Purposes Only';
