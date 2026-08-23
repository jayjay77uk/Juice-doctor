'use server';

import { revalidatePath } from 'next/cache';
import { assertRole } from '@/lib/auth/authorize';
import { memoryRepo } from './repositories/memory-repo';
import { auditRepo } from './repositories/audit-repo';

/**
 * Delete one stored memory from the governance console. This is intentionally
 * administrator-only because memory content can contain sensitive member context.
 * The deletion is audit-logged with metadata only — never duplicate the memory
 * content into audit_logs after it has been deliberately erased.
 */
export async function adminDeleteMemoryAction(formData: FormData): Promise<void> {
  const session = await assertRole('administrator');
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  const deleted = await memoryRepo.adminForget(id);
  if (deleted) {
    await auditRepo.log({
      actorId: session.user.id,
      action: 'memory.admin_delete',
      entityType: 'ai_memory',
      entityId: deleted.id,
      after: {
        scope: deleted.scope,
        kind: deleted.kind,
        key: deleted.key,
        userId: deleted.userId,
        conversationId: deleted.conversationId,
        source: deleted.source,
      },
    });
  }
  revalidatePath('/admin/ai/memory');
}
