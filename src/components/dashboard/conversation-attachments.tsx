'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Download, FileText, Paperclip, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { uploadConversationAttachmentAction, deleteConversationAttachmentAction } from '@/services/conversation-attachment-actions';
import { idleAction } from '@/services/result';
import type { ConversationAttachment } from '@/services/repositories/conversation-attachments-repo';
import { Button } from '@/components/ui/button';

function UploadButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      <Paperclip className="size-4" /> {pending ? 'Uploading…' : 'Attach file'}
    </Button>
  );
}

function bytesLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ConversationAttachments({
  conversationId,
  attachments,
}: {
  conversationId: string;
  attachments: ConversationAttachment[];
}) {
  const [state, action] = useActionState(uploadConversationAttachmentAction, idleAction);

  return (
    <section className="rounded-2xl border border-border bg-surface p-5" aria-labelledby="attachments-heading">
      <div className="flex flex-col gap-1">
        <h2 id="attachments-heading" className="text-sm font-semibold text-foreground">Conversation files</h2>
        <p className="text-xs text-muted-foreground">Private files shared in this conversation. Attachments are not automatically read by the AI.</p>
      </div>

      <form action={action} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <input type="hidden" name="conversationId" value={conversationId} />
        <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium text-foreground">
          Choose file
          <input
            type="file"
            name="file"
            required
            accept=".pdf,.docx,.txt,.csv,.png,.jpg,.jpeg,.webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/csv,image/png,image/jpeg,image/webp"
            className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium"
          />
          <span className="text-xs font-normal text-muted-foreground">PDF, DOCX, TXT, CSV or image · max 10 MB</span>
        </label>
        <UploadButton />
      </form>

      {state.status === 'error' ? (
        <p className="mt-3 flex items-center gap-2 text-xs text-danger"><AlertCircle className="size-4" /> {state.message}</p>
      ) : state.status === 'success' ? (
        <p className="mt-3 flex items-center gap-2 text-xs text-primary"><CheckCircle2 className="size-4" /> {state.message}</p>
      ) : null}

      {attachments.length > 0 ? (
        <ul className="mt-5 divide-y divide-border border-t border-border">
          {attachments.map((file) => (
            <li key={file.id} className="flex items-center gap-3 py-3">
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{file.filename}</p>
                <p className="text-xs text-muted-foreground">{bytesLabel(file.byteSize)} · {new Date(file.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</p>
              </div>
              {file.downloadUrl ? (
                <a
                  href={file.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground"
                  aria-label={`Download ${file.filename}`}
                >
                  <Download className="size-4" />
                </a>
              ) : null}
              <form action={deleteConversationAttachmentAction}>
                <input type="hidden" name="conversationId" value={conversationId} />
                <input type="hidden" name="id" value={file.id} />
                <button
                  type="submit"
                  className="inline-flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-danger"
                  aria-label={`Delete ${file.filename}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">No files attached to this conversation.</p>
      )}
    </section>
  );
}
