import { notFound } from 'next/navigation';
import { createMetadata } from '@/config/metadata';
import { AdminHeader } from '@/components/admin/admin-header';
import { Panel } from '@/components/admin/panel';
import { member } from '@/services/member';

export const metadata = createMetadata({ title: 'Assessment details' });
export const dynamic = 'force-dynamic';

export default async function AssessmentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await member.assessments();
  const assessment = result.ok ? result.data.find((item) => item.id === id) : undefined;
  if (!assessment) notFound();
  return <div className="mx-auto flex max-w-3xl flex-col gap-8"><AdminHeader title={assessment.title} description="A read-only record of this check-in." breadcrumbs={[{ label: 'Assessments', href: '/dashboard/assessments' }, { label: assessment.title }]} /><Panel title="Result"><dl className="grid gap-4 sm:grid-cols-2"><div><dt className="text-sm text-muted-foreground">Type</dt><dd className="font-medium capitalize">{assessment.type.replace(/_/g, ' ')}</dd></div><div><dt className="text-sm text-muted-foreground">Status</dt><dd className="font-medium capitalize">{assessment.status}</dd></div><div><dt className="text-sm text-muted-foreground">Date</dt><dd className="font-medium">{assessment.createdAt.slice(0, 10)}</dd></div><div><dt className="text-sm text-muted-foreground">Score</dt><dd className="font-serif text-3xl text-primary">{assessment.score === null ? 'Not scored' : `${assessment.score}/100`}</dd></div></dl></Panel><p className="text-sm text-muted-foreground">This record is informational and is not a diagnosis. Discuss concerning results with a qualified healthcare professional.</p></div>;
}
