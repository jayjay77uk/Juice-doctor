import { ChatWorkspace } from '@/components/dashboard/chat-workspace';
import { assertSession } from '@/lib/auth/authorize';
import { conversations_service } from '@/services/conversations';
import { member } from '@/services/member';

export default async function ConversationLayout({children}:{children:React.ReactNode}) {
 const {user} = await assertSession();
 const [threads, available] = await Promise.all([conversations_service.list(user.id),member.mySpecialists()]);
 return <ChatWorkspace conversations={threads.ok ? threads.data.filter(c=>c.status==='active').map(c=>({id:c.id,title:c.title})) : []}
  specialists={available.ok ? available.data.map(a=>({id:a.id,name:a.name,concierge:a.slug==='makela'})):[]}>
  {children}
 </ChatWorkspace>;
}
