// The browser's own speech recognition (the Web Speech API — Chrome, Edge,
// Safari): words appear as you say them. Chrome does the recognising on
// Google's servers. Where it's missing (Firefox) or fails, useVoiceRecorder
// falls back to Whisper on the device.

interface Alternative { transcript: string }
interface Result { isFinal: boolean; 0: Alternative; length: number }
interface ResultList { length: number; [i: number]: Result }

export interface LiveRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: { results: ResultList }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

export function liveRecognition(): (new () => LiveRecognition) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as (new () => LiveRecognition) | null;
}

/** Everything heard so far, said and still being said, as one line. */
export function joinResults(results: ResultList): string {
  const parts: string[] = [];
  for (let i = 0; i < results.length; i++) {
    const t = results[i][0]?.transcript.trim();
    if (t) parts.push(t);
  }
  return parts.join(' ');
}

/** Errors that mean "nothing heard", not "this can't work here". */
export const HARMLESS_ERRORS = new Set(['no-speech', 'aborted']);
