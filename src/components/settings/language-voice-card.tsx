'use client';

import * as React from 'react';
import { Globe, Mic, Check, Loader2 } from 'lucide-react';
import { Panel } from '@/components/admin/panel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';
import { HERNE_LANGUAGES, herneLanguage, isRtlLanguage } from '@/data/herne/languages';
import { HERNE_CAPABILITIES, type LanguagePreference } from '@/services/herne/language';
import { saveLanguagePreferenceAction } from '@/services/herne/language-actions';

const controlClass =
  'w-full rounded-xl border border-border bg-surface px-4 py-3 text-foreground focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-ring)]';

function statusBadge(status: 'live' | 'prototype' | 'planned') {
  if (status === 'live') return <Badge tone="secondary">Available now</Badge>;
  if (status === 'prototype') return <Badge tone="accent">Prototype</Badge>;
  return <Badge tone="outline">Planned</Badge>;
}

/**
 * Language & voice preference card. Lets a person choose the language (and, where
 * offered, a regional variety) their specialists reply in, and register interest in
 * voice. Honest throughout: replies are AI-generated and not clinically reviewed;
 * the voice toggle is disabled and labelled planned.
 */
export function LanguageVoiceCard({ initial }: { initial: LanguagePreference }) {
  const [language, setLanguage] = React.useState(initial.language);
  const [dialect, setDialect] = React.useState<string | null>(initial.dialect);
  const [voice, setVoice] = React.useState(initial.voice);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  const lang = herneLanguage(language);
  const dialects = lang?.dialects ?? [];

  function onLanguageChange(code: string) {
    setLanguage(code);
    setDialect(null); // dialect belongs to a language; reset when the language changes
    setSaved(false);
  }

  async function onSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await saveLanguagePreferenceAction({ language, dialect, voice });
      if (res.ok) {
        setLanguage(res.preference.language);
        setDialect(res.preference.dialect);
        setVoice(res.preference.voice);
        setSaved(true);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel
      title="Language & voice"
      description="Choose the language your specialists speak with you. Every specialist shares one evidence base — only the language of the conversation changes."
    >
      <div className="flex flex-col gap-6">
        {/* Language */}
        <div className="flex flex-col gap-2">
          <label htmlFor="herne-language" className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Globe className="size-4 text-primary" /> Preferred language
            {statusBadge(HERNE_CAPABILITIES.language.status)}
          </label>
          <select
            id="herne-language"
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            className={controlClass}
          >
            {HERNE_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.englishName}
                {l.nativeName !== l.englishName ? ` — ${l.nativeName}` : ''}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">{HERNE_CAPABILITIES.language.note}</p>
        </div>

        {/* Dialect (only when the language offers varieties) */}
        {dialects.length > 0 && (
          <div className="flex flex-col gap-2">
            <label htmlFor="herne-dialect" className="flex items-center gap-2 text-sm font-medium text-foreground">
              Regional variety {statusBadge(HERNE_CAPABILITIES.dialect.status)}
            </label>
            <select
              id="herne-dialect"
              value={dialect ?? ''}
              onChange={(e) => {
                setDialect(e.target.value || null);
                setSaved(false);
              }}
              className={controlClass}
            >
              <option value="">No preference</option>
              {dialects.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">{HERNE_CAPABILITIES.dialect.note}</p>
          </div>
        )}

        {/* Sample line in the chosen language, RTL-aware */}
        {lang && lang.code !== 'en-GB' && (
          <p
            dir={isRtlLanguage(language) ? 'rtl' : 'ltr'}
            className="rounded-xl border border-dashed border-border bg-surface-muted px-4 py-3 text-sm text-muted-foreground"
          >
            {lang.nativeName}
          </p>
        )}

        {/* Voice — planned, disabled */}
        <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-surface-muted/60 px-4 py-3">
          <span className="flex items-start gap-3">
            <Mic className="mt-0.5 size-4 shrink-0 text-primary" />
            <span className="flex flex-col gap-0.5">
              <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                Voice conversations {statusBadge(HERNE_CAPABILITIES.voice.status)}
              </span>
              <span className="text-xs text-muted-foreground">{HERNE_CAPABILITIES.voice.note}</span>
            </span>
          </span>
          <label className="mt-0.5 inline-flex cursor-not-allowed items-center" title="Voice is planned — not yet available">
            <input
              type="checkbox"
              checked={voice}
              disabled
              onChange={(e) => setVoice(e.target.checked)}
              className={cn('size-4 shrink-0 accent-[var(--color-primary)]', 'opacity-50')}
            />
          </label>
        </div>

        <div className="flex items-center gap-3">
          <Button type="button" onClick={onSave} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : saved ? <Check className="size-4" /> : null}
            {saved ? 'Saved' : 'Save language'}
          </Button>
          {saved && <span className="text-sm text-muted-foreground">Your specialists will reply in this language.</span>}
        </div>
      </div>
    </Panel>
  );
}
