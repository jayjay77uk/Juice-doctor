import { z } from 'zod';
export const journalSchema = z.object({
  id: z.string().uuid().optional(),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, 'Choose a valid date.'),
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(5000),
});
export type JournalEntry = { id: string; entry_date: string; title: string; body: string };
