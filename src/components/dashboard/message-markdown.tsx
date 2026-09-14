'use client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function safeSourceUrl(value?: string | null): string | undefined {
 try { const url = new URL(value ?? ''); return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined; } catch { return undefined; }
}
export function MessageMarkdown({text}:{text:string}) {
 return <div className="chat-markdown min-w-0 text-[15px] leading-7 text-foreground"><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={{
  a: ({href,children}) => safeSourceUrl(href) ? <a href={safeSourceUrl(href)} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">{children}</a> : <span>{children}</span>,
  img: ({src,alt}) => typeof src === 'string' && safeSourceUrl(src) ? <a href={safeSourceUrl(src)} target="_blank" rel="noopener noreferrer">{alt || 'Open linked image'}</a> : null,
  table: ({children}) => <div className="overflow-x-auto"><table>{children}</table></div>,
 }}>{text}</ReactMarkdown></div>;
}
