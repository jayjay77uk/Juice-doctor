'use client';
import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import { Menu, X, Search, ArrowLeft } from 'lucide-react';
import { NewConversationButton } from './new-conversation-button';

export function ChatWorkspace({ children, conversations, specialists }: {
 children: React.ReactNode; conversations: { id: string; title: string }[]; specialists: { id: string; name: string; concierge?: boolean }[];
}) {
 const pathname = usePathname();
 const [open,setOpen] = React.useState(false), [search,setSearch] = React.useState('');
 const nav = <div className="flex h-full min-h-0 flex-col gap-5 bg-[#f6f6f3] p-4">
  <Link href="/dashboard" className="flex items-center gap-2 py-2 text-sm font-medium"><ArrowLeft className="size-4" />Ask Juice Doctor</Link>
  <NewConversationButton specialists={specialists} />
  <label className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2"><Search className="size-4 text-muted-foreground"/><input type="search" aria-label="Search conversations" placeholder="Search chats" value={search} onChange={e=>setSearch(e.target.value)} className="w-full bg-transparent text-sm outline-none" /></label>
  <nav aria-label="Conversation history" className="min-h-0 flex-1 space-y-1 overflow-y-auto">
   <p className="px-2 pb-2 text-xs text-muted-foreground">Your conversations</p>
   {conversations.filter(c=>c.title.toLowerCase().includes(search.toLowerCase())).map(c=><Link key={c.id} onClick={()=>setOpen(false)} href={`/dashboard/conversations/${c.id}`} aria-current={pathname.endsWith(c.id) ? 'page':undefined} className={`block truncate rounded-lg px-3 py-2.5 text-sm hover:bg-black/5 ${pathname.endsWith(c.id)?'bg-black/5 font-medium':''}`}>{c.title}</Link>)}
   {!conversations.length && <p className="px-2 text-sm text-muted-foreground">Your conversations will appear here.</p>}
  </nav>
  <div className="flex flex-col gap-2 border-t border-border pt-3 text-sm"><Link href="/dashboard/specialists">Your specialists</Link><Link href="/dashboard/settings">Settings and privacy</Link><Link href="/dashboard">Back to dashboard</Link></div>
 </div>;
 return <div className="flex h-dvh min-h-0 overflow-hidden bg-white">
  <aside className="hidden w-64 shrink-0 border-r border-border md:block">{nav}</aside>
  <div className="flex min-w-0 flex-1 flex-col">
   <div className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-3 md:hidden">
    <Dialog.Root open={open} onOpenChange={setOpen}><Dialog.Trigger aria-label="Open conversation history" className="rounded-lg p-2"><Menu className="size-5" /></Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-black/30"/><Dialog.Content className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw]"><Dialog.Title className="sr-only">Conversation history</Dialog.Title><Dialog.Description className="sr-only">Search and open your saved conversations.</Dialog.Description><Dialog.Close aria-label="Close history" className="absolute right-2 top-2 z-10 rounded p-2"><X className="size-4" /></Dialog.Close>{nav}</Dialog.Content></Dialog.Portal></Dialog.Root>
    <span className="text-sm font-medium">Ask Juice Doctor</span>
   </div>
   <div className="flex min-h-0 flex-1 flex-col">{children}</div>
  </div>
 </div>;
}
