'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { assertPermission, assertSession } from '@/lib/auth/authorize';
import { createAdminClient } from '@/lib/supabase/admin';
import { auditRepo } from './repositories/audit-repo';
export type ProgrammeResult = { ok: boolean; message?: string };
const uuid = z.string().uuid();
const catalogue = z.object({
  title: z.string().trim().min(1).max(160),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(100),
  summary: z.string().trim().min(1).max(500),
  description: z.string().trim().min(1).max(10000),
  format: z.enum(['one_to_one', 'group', 'corporate', 'self_paced']),
  duration_label: z.string().max(120),
  price_label: z.string().max(120),
});
export async function manageProgramme(
  _prev: ProgrammeResult,
  form: FormData,
): Promise<ProgrammeResult> {
  try {
    const { user } = await assertPermission('programmes.manage');
    const sb = createAdminClient();
    if (!sb || !user.organisationId)
      return { ok: false, message: 'Programme storage is unavailable.' };
    const operation = String(form.get('operation'));
    let entityId = String(form.get('programmeId') ?? '');
    if (operation === 'create') {
      const parsed = catalogue.safeParse(Object.fromEntries(form));
      if (!parsed.success)
        return { ok: false, message: 'Complete the programme fields. Use a lowercase URL slug.' };
      const created = await sb
        .from('programmes')
        .insert({
          ...parsed.data,
          organisation_id: user.organisationId,
          owner_id: user.id,
          publish_status: 'draft',
        })
        .select('id')
        .single();
      if (created.error || !created.data)
        return {
          ok: false,
          message: 'Could not create programme. Check whether the slug is already used.',
        };
      entityId = created.data.id;
    } else {
      if (!uuid.safeParse(entityId).success) return { ok: false, message: 'Invalid programme.' };
      const programme = await sb
        .from('programmes')
        .select('id, publish_status')
        .eq('id', entityId)
        .eq('organisation_id', user.organisationId)
        .maybeSingle();
      if (programme.error || !programme.data) return { ok: false, message: 'Programme not found.' };
      if (['module', 'edit_module', 'remove_module'].includes(operation)) {
        const moduleInput = z
          .object({
            title: z.string().trim().min(1).max(160),
            body: z.string().trim().min(1).max(20000),
            position: z.coerce.number().int().min(1).max(1000),
          })
          .safeParse(Object.fromEntries(form));
        if (
          (operation !== 'remove_module' && !moduleInput.success) ||
          programme.data.publish_status !== 'draft'
        )
          return {
            ok: false,
            message: 'Modules can be edited in draft programmes only. Check the fields.',
          };
        const enrolled = await sb
          .from('programme_enrollments')
          .select('id', { count: 'exact', head: true })
          .eq('programme_id', entityId);
        if (enrolled.error || enrolled.count !== 0)
          return {
            ok: false,
            message:
              'Enrolled programmes have a fixed curriculum. Create a new programme version to change it.',
          };
        const moduleId = String(form.get('moduleId'));
        if (operation !== 'module' && !uuid.safeParse(moduleId).success)
          return { ok: false, message: 'Invalid module.' };
        const result =
          operation === 'remove_module'
            ? await sb
                .from('programme_modules')
                .delete()
                .eq('id', moduleId)
                .eq('programme_id', entityId)
                .select('id')
                .single()
            : operation === 'edit_module'
              ? await sb
                  .from('programme_modules')
                  .update(moduleInput.data!)
                  .eq('id', moduleId)
                  .eq('programme_id', entityId)
                  .select('id')
                  .single()
              : await sb
                  .from('programme_modules')
                  .insert({ ...moduleInput.data!, programme_id: entityId });
        if (result.error)
          return { ok: false, message: 'Module could not be saved. Use a unique position.' };
      } else if (operation === 'edit') {
        const parsed = catalogue.safeParse(Object.fromEntries(form));
        if (!parsed.success || programme.data.publish_status !== 'draft')
          return { ok: false, message: 'Unpublish the programme before editing its details.' };
        const result = await sb
          .from('programmes')
          .update(parsed.data)
          .eq('id', entityId)
          .eq('organisation_id', user.organisationId);
        if (result.error) return { ok: false, message: 'Programme details could not be saved.' };
      } else if (operation === 'enrolment_status') {
        const enrolmentId = String(form.get('enrolmentId'));
        const status = z.enum(['active', 'paused', 'cancelled']).safeParse(form.get('status'));
        if (!uuid.safeParse(enrolmentId).success || !status.success)
          return { ok: false, message: 'Invalid enrolment status.' };
        const enrolment = await sb
          .from('programme_enrollments')
          .select('progress')
          .eq('id', enrolmentId)
          .eq('programme_id', entityId)
          .eq('organisation_id', user.organisationId)
          .maybeSingle();
        if (enrolment.error || !enrolment.data)
          return { ok: false, message: 'Enrolment not found.' };
        const result = await sb
          .from('programme_enrollments')
          .update({
            status:
              status.data === 'active' && enrolment.data.progress === 100
                ? 'completed'
                : status.data,
          })
          .eq('id', enrolmentId)
          .eq('programme_id', entityId)
          .eq('organisation_id', user.organisationId);
        if (result.error) return { ok: false, message: 'Enrolment could not be updated.' };
      } else if (operation === 'publish' || operation === 'unpublish') {
        await assertPermission('programmes.publish');
        if (operation === 'publish') {
          const modules = await sb
            .from('programme_modules')
            .select('id', { count: 'exact', head: true })
            .eq('programme_id', entityId);
          if (modules.error || !modules.count)
            return { ok: false, message: 'Add at least one reviewed module before publication.' };
        }
        const result = await sb
          .from('programmes')
          .update({ publish_status: operation === 'publish' ? 'published' : 'draft' })
          .eq('id', entityId)
          .eq('organisation_id', user.organisationId);
        if (result.error) return { ok: false, message: 'Publication could not be changed.' };
      } else if (operation === 'enrol') {
        const memberId = String(form.get('memberId'));
        if (!uuid.safeParse(memberId).success || programme.data.publish_status !== 'published')
          return { ok: false, message: 'Choose a member and a published programme.' };
        const member = await sb
          .from('profiles')
          .select('id')
          .eq('id', memberId)
          .eq('organisation_id', user.organisationId)
          .eq('status', 'active')
          .maybeSingle();
        if (member.error || !member.data)
          return { ok: false, message: 'Active member not found in your organisation.' };
        const result = await sb
          .from('programme_enrollments')
          .insert({
            programme_id: entityId,
            member_id: memberId,
            organisation_id: user.organisationId,
          });
        if (result.error)
          return {
            ok: false,
            message: 'Enrolment could not be created; the member may already be enrolled.',
          };
      } else return { ok: false, message: 'Unknown programme action.' };
    }
    await auditRepo.log({
      actorId: user.id,
      action: `programmes.${operation}`,
      entityType: 'programme',
      entityId,
    });
    revalidatePath('/admin/programmes');
    revalidatePath('/dashboard/programmes');
    revalidatePath('/programmes');
    return { ok: true, message: 'Programme updated.' };
  } catch {
    return { ok: false, message: 'Not authorised or programme storage is unavailable.' };
  }
}
export async function completeProgrammeModule(
  _prev: ProgrammeResult,
  form: FormData,
): Promise<ProgrammeResult> {
  try {
    const { user } = await assertSession();
    const parsed = z
      .object({ moduleId: uuid, complete: z.enum(['true', 'false']) })
      .safeParse(Object.fromEntries(form));
    const sb = createAdminClient();
    if (!parsed.success || !sb) return { ok: false, message: 'Progress could not be saved.' };
    const { error } = await sb.rpc('set_programme_module_complete', {
      p_member: user.id,
      p_module: parsed.data.moduleId,
      p_complete: parsed.data.complete === 'true',
    });
    if (error)
      return {
        ok: false,
        message: 'Progress could not be saved. Check that the programme is active and available.',
      };
    revalidatePath('/dashboard/programmes');
    return { ok: true, message: 'Progress saved.' };
  } catch {
    return { ok: false, message: 'Please sign in again.' };
  }
}
