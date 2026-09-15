/** Temporary entitlement for the explicitly designated test account only. */
export function hasDemoAccess(email: string | null | undefined): boolean {
  return email?.trim().toLowerCase() === 'jimohmujeeb8204@gmail.com';
}
