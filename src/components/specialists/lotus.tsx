/** The HERNE gold lotus emblem (matches the client hero card). */
export function Lotus({ className = 'size-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 40" fill="none" className={className} aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M24 6c-3 6-3 12 0 20 3-8 3-14 0-20Z" />
        <path d="M24 26c-4-4-9-6-14-6 2 6 7 9 14 9" />
        <path d="M24 26c4-4 9-6 14-6-2 6-7 9-14 9" />
        <path d="M24 26c-2-5-6-9-11-11 0 6 4 10 11 12" />
        <path d="M24 26c2-5 6-9 11-11 0 6-4 10-11 12" />
      </g>
    </svg>
  );
}
