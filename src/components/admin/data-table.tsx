import * as React from 'react';
import { cn } from '@/lib/cn';

export interface Column<T> {
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
  align?: 'left' | 'right';
}

/**
 * A generic, accessible data table. Columns declare how to render each cell, so
 * every admin list (agents, prompts, documents, users…) shares one component.
 */
export function DataTable<T>({
  columns,
  rows,
  getKey,
  empty,
}: {
  columns: Column<T>[];
  rows: T[];
  getKey: (row: T, index: number) => string;
  empty?: React.ReactNode;
}) {
  if (rows.length === 0 && empty) {
    return <div className="p-8">{empty}</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-[0.1em] text-muted-foreground">
            {columns.map((col, i) => (
              <th
                key={i}
                className={cn('px-5 py-3 font-medium sm:px-6', col.align === 'right' && 'text-right', col.className)}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={getKey(row, ri)} className="border-b border-border last:border-0 hover:bg-surface-muted/40">
              {columns.map((col, ci) => (
                <td
                  key={ci}
                  className={cn('px-5 py-4 align-middle text-foreground sm:px-6', col.align === 'right' && 'text-right', col.className)}
                >
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
