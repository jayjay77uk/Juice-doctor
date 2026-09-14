import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
export default function ConversationsPage() {
 return <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center"><MessageCircle className="size-10 text-primary"/><h1 className="text-h2">What would you like support with?</h1><p className="max-w-md text-muted-foreground">Start a conversation with one of your specialists, or open a saved chat from your history.</p><Link href="/dashboard/specialists" className="rounded-xl bg-primary px-5 py-3 text-sm text-white">Choose a specialist</Link></div>;
}
