export default function AdminLoading() {
  return (
    <div className="flex min-h-[50dvh] items-center justify-center" role="status" aria-label="Loading">
      <span className="relative flex size-10">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-teal-300 opacity-60" />
        <span className="relative inline-flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
            <path d="M12 2.5c3.6 4.2 6 7.4 6 10.6a6 6 0 1 1-12 0c0-3.2 2.4-6.4 6-10.6Z" />
          </svg>
        </span>
      </span>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
