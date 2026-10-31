// The street piano's voice, made in the browser (Web Audio): a struck tone —
// a bright attack that mellows as it decays, a quieter octave above for the
// shimmer — rather than samples to download. Good enough for a street piano.

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

const freq = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/** Strike a key. `at` is seconds from now (for playing a melody back). */
export function playNote(midi: number, at = 0, length = 1.6): void {
  const c = audio();
  if (!c) return;
  const t0 = c.currentTime + at;
  const out = c.createGain();
  out.gain.setValueAtTime(0.0001, t0);
  out.gain.exponentialRampToValueAtTime(0.32, t0 + 0.006);
  out.gain.exponentialRampToValueAtTime(0.12, t0 + 0.25);
  out.gain.exponentialRampToValueAtTime(0.0001, t0 + length);
  const tone = c.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.setValueAtTime(Math.min(9000, freq(midi) * 10), t0);
  tone.frequency.exponentialRampToValueAtTime(Math.max(400, freq(midi) * 2.5), t0 + 0.6);
  tone.connect(out).connect(c.destination);
  for (const [mult, type, gain] of [[1, 'triangle', 1], [2, 'sine', 0.25], [1.003, 'sawtooth', 0.08]] as const) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq(midi) * mult;
    g.gain.value = gain;
    o.connect(g).connect(tone);
    o.start(t0);
    o.stop(t0 + length + 0.05);
  }
}
