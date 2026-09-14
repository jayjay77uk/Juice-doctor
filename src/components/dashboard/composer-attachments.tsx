'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Paperclip, X, FileText } from 'lucide-react';
import { uploadConversationAttachmentAction, deleteConversationAttachmentAction } from '@/services/conversation-attachment-actions';
import { idleAction } from '@/services/result';
import type { ConversationAttachment } from '@/services/repositories/conversation-attachments-repo';

export function ComposerAttachments({conversationId,files,disabled,onBusy}:{conversationId:string;files:ConversationAttachment[];disabled:boolean;onBusy:(busy:boolean)=>void}) {
 const router=useRouter(), input=React.useRef<HTMLInputElement>(null);
 const [busy,setBusy]=React.useState(false),[error,setError]=React.useState<string|null>(null);
 async function upload(file:File) {
  setBusy(true);onBusy(true);setError(null);
  try {const data=new FormData();data.set('conversationId',conversationId);data.set('file',file);const r=await uploadConversationAttachmentAction(idleAction,data);if(r.status==='error')setError(r.message ?? 'Upload failed.');else router.refresh();}
  catch {setError('Your file could not be uploaded.');}finally{setBusy(false);onBusy(false);if(input.current)input.current.value='';}
 }
 async function remove(id:string) {
  setBusy(true);onBusy(true);setError(null);
  try {const data=new FormData();data.set('conversationId',conversationId);data.set('id',id);await deleteConversationAttachmentAction(data);router.refresh();}
  catch {setError('The file could not be removed.');}finally{setBusy(false);onBusy(false);}
 }
 return <div className="flex min-w-0 flex-wrap items-center gap-2">
  <button type="button" title="Attach a file" aria-label="Attach a file" disabled={disabled||busy} onClick={()=>input.current?.click()} className="rounded-full p-2 text-muted-foreground hover:bg-black/5 disabled:opacity-40"><Paperclip className="size-5"/></button>
  <input ref={input} type="file" className="hidden" accept=".pdf,.docx,.txt,.csv,.png,.jpg,.jpeg,.webp" onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file);}} />
  {files.map(f=><div key={f.id} className="flex max-w-52 items-center gap-1 rounded-lg border border-border bg-white px-2 py-1 text-xs"><FileText className="size-3 shrink-0"/><a href={f.downloadUrl ?? undefined} target="_blank" rel="noreferrer" className="truncate" title={`${f.filename} · ${f.extractionState}`}>{f.filename}</a><button type="button" aria-label={`Remove ${f.filename}`} onClick={()=>remove(f.id)} disabled={disabled||busy}><X className="size-3"/></button></div>)}
  {busy&&<span role="status" className="text-xs">Saving file…</span>}{error&&<span role="alert" className="text-xs text-danger">{error}</span>}
 </div>;
}
