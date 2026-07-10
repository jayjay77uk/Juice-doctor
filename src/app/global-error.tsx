'use client';

import * as React from 'react';

/** Top-level fallback — replaces the root layout, so it renders its own document. */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'system-ui, sans-serif',
          background: '#f6f3ec',
          color: '#1c2321',
          textAlign: 'center',
          padding: '2rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>Something went wrong</h1>
          <p style={{ color: '#5b6b66', marginBottom: '1.5rem' }}>
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={reset}
            style={{
              background: '#0e5c63',
              color: '#f6f3ec',
              border: 0,
              borderRadius: '999px',
              padding: '0.7rem 1.5rem',
              fontSize: '0.95rem',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
