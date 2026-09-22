import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/authorize';
import { createAdminClient } from '@/lib/supabase/admin';
import { PermissionOverrideForm } from '@/components/admin/permission-override-form';
export default async function UserPermissionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requirePermission('permissions.manage');
  const { id } = await params;
  if (
    user.role !== 'super_administrator' ||
    !user.organisationId ||
    id === user.id ||
    !z.string().uuid().safeParse(id).success
  )
    notFound();
  const sb = createAdminClient();
  if (!sb) return <p role="alert">Permission storage is unavailable.</p>;
  const target = await sb
    .from('profiles')
    .select('full_name, role')
    .eq('id', id)
    .eq('organisation_id', user.organisationId)
    .maybeSingle();
  if (!target.data || target.data.role === 'super_administrator') notFound();
  const overrides = await sb
    .from('user_permission_overrides')
    .select('permission_key, effect, reason, expires_at')
    .eq('user_id', id)
    .order('permission_key');
  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/users">Back to users</Link>
      <h1 className="text-2xl font-semibold">Permissions: {target.data.full_name ?? 'User'}</h1>
      <p>Role: {target.data.role}. Deny overrides take priority. Expired overrides are ignored.</p>
      {overrides.error ? (
        <p role="alert">Overrides could not be loaded.</p>
      ) : (
        <ul className="space-y-3">
          {overrides.data.map((row) => (
            <li key={row.permission_key} className="rounded border p-3">
              <strong>
                {row.permission_key}: {row.effect}
              </strong>
              <p>{row.reason}</p>
              <p>{row.expires_at ? `Expires ${row.expires_at}` : 'No expiry'}</p>
            </li>
          ))}
        </ul>
      )}
      <PermissionOverrideForm userId={id} />
    </div>
  );
}
