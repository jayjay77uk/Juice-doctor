import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-[80dvh] flex-col items-center justify-center gap-6 bg-cream-50 px-5 text-center">
      <p className="font-serif text-7xl text-primary">404</p>
      <div className="flex flex-col gap-2">
        <h1 className="text-h2">This page has flowed away</h1>
        <p className="measure text-muted-foreground">
          We couldn’t find what you were looking for. Let’s get you back on track.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <Link href="/">Back to home</Link>
        </Button>
        <Button asChild intent="outline">
          <Link href="/programmes">Explore programmes</Link>
        </Button>
      </div>
    </div>
  );
}
