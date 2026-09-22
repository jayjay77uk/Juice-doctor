import { createHash } from 'node:crypto';
export function followUpId(key: string): string {
  const hex = createHash('sha256').update(key).digest('hex').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export function followUpPeriods(now = new Date()) {
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - ((now.getUTCDay() + 6) % 7));
  return { day: now.toISOString().slice(0, 10), week: monday.toISOString().slice(0, 10) };
}
