import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-[80dvh] flex-col items-center justify-center gap-6 bg-cream-50 px-5 text-center">
      <p className="font-serif text-7xl text-primary">404</p>
      <div className="flex flex-col gap-2">
        <h1 className="text-h2">Page not found</h1>
        <p className="measure text-muted-foreground">
          This is placeholder text in clear English. The page you are looking for could not be found. Final wording will be supplied later.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <Link href="/">Back to home</Link>
        </Button>
        <Button asChild intent="outline">
          <Link href="/programmes">Browse programmes</Link>
        </Button>
      </div>
    </div>
  );
}
