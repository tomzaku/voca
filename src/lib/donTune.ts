// The tune drifting off the cải lương stage on Phố đi bộ: a plucked string in
// the style of the đàn kìm (moon lute) and đàn tranh, made in the browser
// (Web Audio) — no recording, nobody's performance. It wanders through the
// five notes of the southern scale, hò xự xang xê cống (here C D F G A), in
// short phrases that bend into their last note and rest, the way đờn ca
// phrases breathe. Quiet, and silent when game sounds are muted (lib/sfx).

import { isSfxEnabled } from './sfx';

let ctx: AudioContext | null = null;
let timer: number | null = null;
let master: GainNode | null = null;

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

/** hò xự xang xê cống, over two octaves: C4 D4 F4 G4 A4 C5 D5 F5 G5 A5 (MIDI). */
export const DON_SCALE = [60, 62, 65, 67, 69, 72, 74, 77, 79, 81] as const;

const freq = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/**
 * One plucked note: a bright attack that dies away, a touch of the octave,
 * and — for a phrase's last note — the slow bend up into pitch (nhấn) that
 * gives the music its sigh.
 */
function pluck(c: AudioContext, out: AudioNode, midi: number, at: number, length: number, bend: boolean) {
  const t0 = c.currentTime + at;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.5, t0 + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + length);
  const tone = c.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.setValueAtTime(freq(midi) * 8, t0);
  tone.frequency.exponentialRampToValueAtTime(freq(midi) * 1.8, t0 + 0.35);
  tone.connect(g).connect(out);
  for (const [mult, type, gain] of [[1, 'triangle', 1], [2, 'sine', 0.18]] as const) {
    const o = c.createOscillator();
    const og = c.createGain();
    o.type = type;
    const f = freq(midi) * mult;
    if (bend) {
      o.frequency.setValueAtTime(f * 0.94, t0);
      o.frequency.exponentialRampToValueAtTime(f, t0 + 0.28);
      // …and a slow vibrato as it rings.
      const lfo = c.createOscillator();
      const depth = c.createGain();
      lfo.frequency.value = 5.2;
      depth.gain.value = f * 0.012;
      lfo.connect(depth).connect(o.frequency);
      lfo.start(t0 + 0.3);
      lfo.stop(t0 + length);
    } else {
      o.frequency.setValueAtTime(f, t0);
    }
    og.gain.value = gain;
    o.connect(og).connect(tone);
    o.start(t0);
    o.stop(t0 + length + 0.05);
  }
}

/**
 * A phrase: a walk of 4–7 notes, mostly by step through the scale, now and
 * then a leap; the last note held and bent. Returns its notes and their
 * start times (seconds), and how long the phrase takes with its rest.
 */
export function makePhrase(rand: () => number = Math.random): { notes: { midi: number; at: number; length: number; bend: boolean }[]; seconds: number } {
  const count = 4 + Math.floor(rand() * 4);
  let i = 2 + Math.floor(rand() * 5);
  let t = 0;
  const notes = [];
  for (let n = 0; n < count; n++) {
    const last = n === count - 1;
    const beat = last ? 1.4 + rand() * 0.8 : [0.28, 0.42, 0.56][Math.floor(rand() * 3)];
    notes.push({ midi: DON_SCALE[i], at: t, length: last ? 2.4 : 0.9, bend: last });
    t += beat;
    const step = rand() < 0.75 ? (rand() < 0.5 ? -1 : 1) : (rand() < 0.5 ? -2 : 2);
    i = Math.max(0, Math.min(DON_SCALE.length - 1, i + step));
  }
  return { notes, seconds: t + 0.6 + rand() * 0.8 };
}

/** Start the tune (no-op if it's playing, or sounds are off). `volume` 0–1. */
export function startDonTune(volume = 0.18) {
  if (timer !== null || !isSfxEnabled()) return;
  const c = audio();
  if (!c) return;
  master = c.createGain();
  master.gain.value = volume;
  master.connect(c.destination);
  const next = () => {
    if (!master) return;
    const p = makePhrase();
    for (const n of p.notes) pluck(c, master, n.midi, n.at, n.length, n.bend);
    timer = window.setTimeout(next, p.seconds * 1000);
  };
  next();
}

/** Fade the tune out and stop. */
export function stopDonTune() {
  if (timer !== null) window.clearTimeout(timer);
  timer = null;
  const m = master;
  master = null;
  if (m && ctx) {
    m.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.3);
    window.setTimeout(() => m.disconnect(), 1500);
  }
}

/** A small firework pop and crackle — the launch pad's. */
export function playFireworkPop(big = false) {
  if (!isSfxEnabled()) return;
  const c = audio();
  if (!c) return;
  const t0 = c.currentTime;
  const len = big ? 1.2 : 0.7;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * len), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / data.length;
    // A thump, then sparse crackle.
    const crackle = Math.random() < 0.02 * (1 - t) ? (Math.random() * 2 - 1) : 0;
    data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 18) * 0.8 + crackle * 0.6;
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  g.gain.value = big ? 0.32 : 0.22;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2400;
  src.connect(lp).connect(g).connect(c.destination);
  src.start(t0);
}
