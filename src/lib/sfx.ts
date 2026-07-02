// Lightweight game sound effects, synthesized with the Web Audio API — no audio
// files to ship or download. Sounds are short blips/arpeggios built from
// oscillators, so the whole thing is a couple hundred bytes of code.
//
// Muteable via a localStorage flag (on by default). All play() calls are
// triggered from user gestures (clicks), so the AudioContext resumes cleanly
// under browser autoplay policies.

const SFX_KEY = 'voca-sfx';

let ctx: AudioContext | null = null;

export function isSfxEnabled(): boolean {
  return localStorage.getItem(SFX_KEY) !== 'off';
}

export function setSfxEnabled(on: boolean): void {
  localStorage.setItem(SFX_KEY, on ? 'on' : 'off');
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

interface ToneOpts {
  freq: number;
  start: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  slideTo?: number;
}

function tone(c: AudioContext, { freq, start, dur, type = 'triangle', gain = 0.15, slideTo }: ToneOpts) {
  const osc = c.createOscillator();
  const g = c.createGain();
  const t0 = c.currentTime + start;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  // Quick attack, exponential decay — a clean plucky envelope.
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function play(fn: (c: AudioContext) => void) {
  if (!isSfxEnabled()) return;
  const c = getCtx();
  if (!c) return;
  try { fn(c); } catch { /* ignore */ }
}

/** Soft blip — picking/choosing an option or tile. */
export function playSelect() {
  play((c) => tone(c, { freq: 587.33, start: 0, dur: 0.08, type: 'triangle', gain: 0.1 }));
}

/** Cheerful rising triad — a correct answer / placement. */
export function playCorrect() {
  play((c) => {
    tone(c, { freq: 659.25, start: 0.0, dur: 0.11, gain: 0.14 });   // E5
    tone(c, { freq: 783.99, start: 0.08, dur: 0.13, gain: 0.14 });  // G5
    tone(c, { freq: 1046.5, start: 0.16, dur: 0.16, gain: 0.14 });  // C6
  });
}

/** Descending buzzer — a wrong answer. */
export function playWrong() {
  play((c) => {
    tone(c, { freq: 233.08, start: 0.0, dur: 0.16, type: 'sawtooth', gain: 0.09, slideTo: 155.56 });
    tone(c, { freq: 174.61, start: 0.11, dur: 0.2, type: 'sawtooth', gain: 0.08, slideTo: 110 });
  });
}

/** Little fanfare — completing a round. */
export function playWin() {
  play((c) => {
    [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((f, i) =>
      tone(c, { freq: f, start: i * 0.09, dur: 0.2, gain: 0.14 }),
    );
  });
}
