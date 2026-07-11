import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ph } from '@/content/placeholder';

export default function NotFound() {
  return (
    <div className="flex min-h-[80dvh] flex-col items-center justify-center gap-6 bg-cream-50 px-5 text-center">
      <p className="font-serif text-7xl text-primary">404</p>
      <div className="flex flex-col gap-2">
        <h1 className="text-h2">{ph.heading}</h1>
        <p className="measure text-muted-foreground">
          {ph.body}
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <Link href="/">{ph.cta}</Link>
        </Button>
        <Button asChild intent="outline">
          <Link href="/programmes">{ph.cta}</Link>
        </Button>
      </div>
    </div>
  );
}
