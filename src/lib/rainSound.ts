// Soft rain for the Focus Zone, made in the browser (Web Audio): brown noise,
// low-passed for the steady hush of rain on leaves, with a faint high band
// over it for the patter. No files to load. Fades in and out.

let ctx: AudioContext | null = null;
let out: GainNode | null = null;
let source: AudioBufferSourceNode | null = null;

function noise(c: AudioContext): AudioBuffer {
  const buf = c.createBuffer(1, c.sampleRate * 4, c.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;                // brown: the hush
    data[i] = last * 3.5 + white * 0.04;                // a touch of white: the patter
  }
  return buf;
}

export function setRainSound(on: boolean): void {
  if (typeof window === 'undefined') return;
  if (on) {
    if (source) return;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    source = ctx.createBufferSource();
    source.buffer = noise(ctx);
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1800;
    out = ctx.createGain();
    out.gain.setValueAtTime(0, ctx.currentTime);
    out.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 1.5);
    source.connect(filter).connect(out).connect(ctx.destination);
    source.start();
  } else if (source && ctx && out) {
    const s = source;
    out.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
    setTimeout(() => s.stop(), 1100);
    source = null;
  }
}
