import { z } from 'zod';

/**
 * Validation schemas — the SAME schema validates on the client (react-hook-form)
 * and inside the Server Action. One definition, enforced on both sides.
 */

export const contactSchema = z.object({
  name: z.string().min(2, 'Please tell us your name.'),
  email: z.string().email('Please enter a valid email address.'),
  subject: z.string().min(2, 'Please add a subject.').optional().or(z.literal('')),
  message: z.string().min(10, 'Please add a little more detail (10+ characters).'),
});
export type ContactInput = z.infer<typeof contactSchema>;

export const newsletterSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
});
export type NewsletterInput = z.infer<typeof newsletterSchema>;

export const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(6, 'Passwords are at least 6 characters.'),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const registerSchema = z
  .object({
    name: z.string().min(2, 'Please tell us your name.'),
    email: z.string().email('Please enter a valid email address.'),
    password: z.string().min(8, 'Choose a password of at least 8 characters.'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: 'Passwords do not match.',
    path: ['confirm'],
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const bookingSchema = z.object({
  service: z.string().min(1, 'Please choose a service.'),
  slot: z.string().min(1, 'Please choose a time.'),
  name: z.string().min(2, 'Please tell us your name.'),
  email: z.string().email('Please enter a valid email address.'),
  notes: z.string().optional().or(z.literal('')),
});
export type BookingInput = z.infer<typeof bookingSchema>;
