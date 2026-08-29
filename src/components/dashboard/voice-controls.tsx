'use client';

import * as React from 'react';
import { Mic, Square, Loader2, Volume2, Pause, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { VoiceMode } from '@/lib/voice/modes';

/**
 * Voice controls — a thin input/output layer over the REAL conversation:
 * recordings are transcribed server-side and land in the normal message input;
 * read-aloud speaks the stored specialist reply. When the voice services are
 * not connected the controls state that clearly and do nothing else.
 */

const MAX_RECORDING_MS = 60_000;

/** Pick a MediaRecorder format the browser supports (Safari needs mp4). */
function pickMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  for (const type of ['audio/webm', 'audio/mp4', 'audio/ogg']) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return null;
}

type RecordingState = 'idle' | 'recording' | 'processing';

export function VoiceInputButton({
  enabled,
  disabled,
  onTranscript,
  endpoint = '/api/voice/transcribe',
}: {
  enabled: boolean;
  disabled?: boolean;
  onTranscript: (text: string) => void;
  /** STT endpoint — the public receptionist console uses its own rate-limited route. */
  endpoint?: string;
}) {
  const [state, setState] = React.useState<RecordingState>('idle');
  const [error, setError] = React.useState<string | null>(null);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const cancelledRef = React.useRef(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanupStream = React.useCallback(() => {
    recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    recorderRef.current = null;
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  React.useEffect(() => () => cleanupStream(), [cleanupStream]);

  async function startRecording() {
    setError(null);
    const mimeType = pickMimeType();
    if (!mimeType || !navigator.mediaDevices?.getUserMedia) {
      setError('Voice recording is not supported in this browser — please type your message.');
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError('Microphone access was declined. Allow microphone access in your browser settings to use voice.');
      return;
    }
    const recorder = new MediaRecorder(stream, { mimeType });
    recorderRef.current = recorder;
    chunksRef.current = [];
    cancelledRef.current = false;
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      cleanupStream();
      if (cancelledRef.current || blob.size === 0) {
        setState('idle');
        return;
      }
      setState('processing');
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': mimeType },
          body: blob,
        });
        const body = (await res.json().catch(() => ({}))) as { transcript?: string; error?: string };
        if (!res.ok || !body.transcript) {
          setError(body.error ?? 'Transcription failed — please try again or type your message.');
        } else {
          onTranscript(body.transcript);
        }
      } catch {
        setError('Transcription failed — please check your connection and try again.');
      } finally {
        setState('idle');
      }
    };
    recorder.start();
    setState('recording');
    timerRef.current = setTimeout(() => {
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    }, MAX_RECORDING_MS);
  }

  function stopAndSend() {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }

  function cancelRecording() {
    cancelledRef.current = true;
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }

  if (!enabled) {
    return (
      <Button
        type="button"
        intent="outline"
        size="sm"
        disabled
        title="Voice input is not available yet — the speech service is not connected."
        aria-label="Voice input not available yet"
      >
        <Mic className="size-4" />
      </Button>
    );
  }

  return (
    <span className="flex items-center gap-1.5">
      {error && (
        <span className="max-w-48 text-xs text-danger" role="alert">
          {error}
        </span>
      )}
      {state === 'idle' && (
        <Button type="button" intent="outline" size="sm" onClick={startRecording} disabled={disabled} aria-label="Record a voice message">
          <Mic className="size-4" />
        </Button>
      )}
      {state === 'recording' && (
        <>
          <Button type="button" size="sm" onClick={stopAndSend} aria-label="Stop recording and transcribe">
            <Square className="size-4 motion-safe:animate-pulse" /> Stop
          </Button>
          <Button type="button" intent="ghost" size="sm" onClick={cancelRecording} aria-label="Cancel recording">
            <X className="size-4" />
          </Button>
        </>
      )}
      {state === 'processing' && (
        <Button type="button" intent="outline" size="sm" disabled aria-label="Transcribing">
          <Loader2 className="size-4 animate-spin" />
        </Button>
      )}
    </span>
  );
}

export function SpeakButton({ messageId }: { messageId: string }) {
  const [state, setState] = React.useState<'idle' | 'loading' | 'playing' | 'paused'>('idle');
  const [error, setError] = React.useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const urlRef = React.useRef<string | null>(null);

  const teardown = React.useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setState('idle');
  }, []);

  React.useEffect(() => () => teardown(), [teardown]);

  async function play() {
    setError(null);
    if (audioRef.current && state === 'paused') {
      await audioRef.current.play();
      setState('playing');
      return;
    }
    setState('loading');
    try {
      const res = await fetch('/api/voice/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? 'Read-aloud failed.');
        setState('idle');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = teardown;
      audio.onerror = () => {
        setError('Playback failed.');
        teardown();
      };
      await audio.play();
      setState('playing');
    } catch {
      setError('Read-aloud failed — please try again.');
      setState('idle');
    }
  }

  function pause() {
    audioRef.current?.pause();
    setState('paused');
  }

  return (
    <span className="flex items-center gap-1">
      {error && <span className="text-xs text-danger">{error}</span>}
      {state === 'loading' ? (
        <span className="p-1 text-muted-foreground" aria-label="Preparing audio">
          <Loader2 className="size-3.5 animate-spin" />
        </span>
      ) : state === 'playing' ? (
        <>
          <button type="button" aria-label="Pause read-aloud" onClick={pause} className="rounded p-1 text-primary hover:text-foreground">
            <Pause className="size-3.5" />
          </button>
          <button type="button" aria-label="Stop read-aloud" onClick={teardown} className="rounded p-1 text-muted-foreground hover:text-foreground">
            <Square className="size-3.5" />
          </button>
        </>
      ) : (
        <button type="button" aria-label={state === 'paused' ? 'Resume read-aloud' : 'Read this reply aloud'} onClick={play} className="rounded p-1 text-muted-foreground hover:text-foreground">
          <Volume2 className="size-3.5" />
        </button>
      )}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Voice modes — shared machinery for T-T (spoken replies) and V-V (voice loop)
// ─────────────────────────────────────────────────────────────────────────────

export type ReplyAudioState = 'idle' | 'loading' | 'playing';

/**
 * Plays one fetched audio response at a time. `play` resolves when playback
 * ENDS (or fails) — V-V uses that to re-arm the microphone only after the AI
 * has finished speaking, so the mic can never capture the AI's own voice.
 */
export function useReplyAudio() {
  const [state, setState] = React.useState<ReplyAudioState>('idle');
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const urlRef = React.useRef<string | null>(null);

  const stop = React.useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setState('idle');
  }, []);

  React.useEffect(() => () => stop(), [stop]);

  const play = React.useCallback(
    async (fetcher: () => Promise<Response>): Promise<boolean> => {
      stop();
      setState('loading');
      try {
        const res = await fetcher();
        if (!res.ok) {
          setState('idle');
          return false;
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        const audio = new Audio(url);
        audioRef.current = audio;
        setState('playing');
        await new Promise<void>((resolve) => {
          audio.onended = () => resolve();
          audio.onerror = () => resolve();
          void audio.play().catch(() => resolve());
        });
        stop();
        return true;
      } catch {
        stop();
        return false;
      }
    },
    [stop],
  );

  return { state, play, stop };
}

export type VoiceLoopPhase = 'idle' | 'listening' | 'processing';

/**
 * Hands-free capture for V-V: records, watches the microphone level, and after
 * ~1.6s of silence following speech stops and transcribes. The caller decides
 * when to (re)start — never while reply audio is playing.
 */
export function useVoiceLoop({ endpoint, onTranscript, onError }: {
  endpoint: string;
  onTranscript: (text: string) => void;
  onError: (message: string) => void;
}) {
  const [phase, setPhase] = React.useState<VoiceLoopPhase>('idle');
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const ctxRef = React.useRef<AudioContext | null>(null);
  const stoppingRef = React.useRef(false);

  const teardown = React.useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    recorderRef.current = null;
    void ctxRef.current?.close().catch(() => undefined);
    ctxRef.current = null;
  }, []);

  React.useEffect(() => () => teardown(), [teardown]);

  const stop = React.useCallback(() => {
    stoppingRef.current = true;
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    teardown();
    setPhase('idle');
  }, [teardown]);

  const start = React.useCallback(async () => {
    const mimeType = pickMimeType();
    if (!mimeType || !navigator.mediaDevices?.getUserMedia) {
      onError('Voice conversation is not supported in this browser.');
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      onError('Microphone access was declined — allow it in your browser settings to use voice conversation.');
      return;
    }
    stoppingRef.current = false;
    const recorder = new MediaRecorder(stream, { mimeType });
    recorderRef.current = recorder;
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = async () => {
      teardown();
      if (stoppingRef.current) {
        setPhase('idle');
        return;
      }
      const blob = new Blob(chunks, { type: mimeType });
      if (blob.size < 2000) {
        // Nothing meaningful captured — return to idle quietly.
        setPhase('idle');
        return;
      }
      setPhase('processing');
      try {
        const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': mimeType }, body: blob });
        const body = (await res.json().catch(() => ({}))) as { transcript?: string; error?: string };
        setPhase('idle');
        if (res.ok && body.transcript) onTranscript(body.transcript);
        else if (res.status !== 422) onError(body.error ?? 'Transcription failed.');
      } catch {
        setPhase('idle');
        onError('Transcription failed — check your connection.');
      }
    };

    // Silence detection: stop ~1.6s after speech pauses (max 30s per turn).
    const ctx = new AudioContext();
    ctxRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    let spokeAt = 0;
    const startedAt = Date.now();
    const tick = () => {
      if (recorder.state !== 'recording') return;
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const v of data) sum += (v - 128) * (v - 128);
      const rms = Math.sqrt(sum / data.length);
      const nowMs = Date.now();
      if (rms > 6) spokeAt = nowMs;
      const tooLong = nowMs - startedAt > 30_000;
      const silentAfterSpeech = spokeAt > 0 && nowMs - spokeAt > 1_600;
      if (tooLong || silentAfterSpeech) {
        recorder.stop();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    recorder.start();
    setPhase('listening');
    rafRef.current = requestAnimationFrame(tick);
  }, [endpoint, onTranscript, onError, teardown]);

  return { phase, start, stop };
}

const MODE_LABELS: Record<VoiceMode, string> = { ts: 'Chat', tt: 'Voice replies', vv: 'Voice chat' };
const MODE_TITLES: Record<VoiceMode, string> = {
  ts: 'Type or dictate; replies arrive as text',
  tt: 'Type or dictate; replies are spoken aloud too',
  vv: 'Hands-free voice conversation',
};

/**
 * Communication-mode switch. Only the modes this AI is PERMITTED to offer are
 * rendered; a permitted mode that needs an unconnected provider is shown
 * disabled with an honest reason. Switching modes never touches the thread.
 */
export function VoiceModeSwitch({
  modes,
  mode,
  onChange,
  providers,
}: {
  modes: VoiceMode[];
  mode: VoiceMode;
  onChange: (mode: VoiceMode) => void;
  providers: { stt: boolean; tts: boolean };
}) {
  if (modes.length <= 1) return null;
  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-surface p-1" role="radiogroup" aria-label="Communication mode">
      {modes.map((m) => {
        const available = m === 'ts' || (providers.stt && providers.tts);
        const active = mode === m;
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={!available}
            title={available ? MODE_TITLES[m] : 'Not available yet — the voice service is not connected.'}
            onClick={() => onChange(m)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              active ? 'bg-primary text-primary-foreground' : available ? 'text-muted-foreground hover:text-foreground' : 'text-muted-foreground/50'
            }`}
          >
            {MODE_LABELS[m]}
          </button>
        );
      })}
    </div>
  );
}
