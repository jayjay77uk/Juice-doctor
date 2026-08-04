import { createMetadata } from '@/config/metadata';
import { AdminHeader } from '@/components/admin/admin-header';
import { BookingManager } from '@/components/dashboard/booking-manager';
import { memberRepo } from '@/services/repositories/member-repo';
import { getSession } from '@/services/auth';
import { isSupabaseAdminConfigured } from '@/lib/env';
import { consultations } from '@/content/programmes';

export const metadata = createMetadata({ title: 'Your bookings', path: '/dashboard/bookings' });
export const dynamic = 'force-dynamic';

export default async function BookingsPage() {
  const session = await getSession();
  const userId = session?.user.id;
  const { upcoming, past } =
    userId && isSupabaseAdminConfigured()
      ? await memberRepo.appointments(userId)
      : { upcoming: [], past: [] };
  const services = consultations.map((c) => ({ slug: c.slug, title: c.title }));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <AdminHeader
        title="Your bookings"
        description="Book a session, and manage your upcoming appointments."
      />

      <BookingManager upcoming={upcoming} past={past} services={services} />

      <p className="text-sm text-muted-foreground">
        New and moved bookings show as <strong>requested</strong> until a member of the team confirms
        them. You can cancel or reschedule any upcoming session here.
      </p>
    </div>
  );
}
