'use client';

import * as React from 'react';
import { Mic, Square, Loader2, Volume2, Pause, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

export function VoiceInputButton({ enabled, disabled, onTranscript }: { enabled: boolean; disabled?: boolean; onTranscript: (text: string) => void }) {
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
        const res = await fetch('/api/voice/transcribe', {
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
