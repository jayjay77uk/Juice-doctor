'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { LEAD_STATUS_ORDER, LEAD_STATUS_LABELS } from '@/types/crm';

const inputClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus-visible:border-primary';

export function CrmFilters({ q = '', status = '' }: { q?: string; status?: string }) {
  const router = useRouter();
  const [search, setSearch] = React.useState(q);
  const [statusValue, setStatusValue] = React.useState(status);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.set('q', search.trim());
    if (statusValue) params.set('status', statusValue);
    const query = params.toString();
    router.push(query ? `/admin/crm?${query}` : '/admin/crm');
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name or email…"
        aria-label="Search leads"
        className={`${inputClass} sm:max-w-xs`}
      />
      <select
        value={statusValue}
        onChange={(e) => setStatusValue(e.target.value)}
        aria-label="Filter by status"
        className={`${inputClass} sm:max-w-xs`}
      >
        <option value="">All statuses</option>
        {LEAD_STATUS_ORDER.map((s) => (
          <option key={s} value={s}>
            {LEAD_STATUS_LABELS[s]}
          </option>
        ))}
      </select>
      <Button type="submit" size="sm">
        Apply
      </Button>
    </form>
  );
}
