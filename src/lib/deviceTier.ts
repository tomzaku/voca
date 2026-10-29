// How much speech synthesis this device can take, for the "Auto" voice engine.
//
// The engines differ by orders of magnitude: native speech is free, Piper is a
// ~60MB model whose inference runs on the main thread (piper-tts-web has no
// worker, so a slow synth freezes the page), and Kokoro is ~160MB run in a
// worker — no freeze, but heavy on memory and slow without WebGPU. Picking the
// wrong one is how a phone ends up hanging, so Auto picks from what the
// browser tells us, and steps down later if a voice proves too slow
// (see `demoteAutoEngine` in useTtsSettings).
//
// No imports from tts.ts or the settings store — both depend on this.

import type { TtsEngine } from '../hooks/useTtsSettings';

export type DeviceTier = 'low' | 'mid' | 'high';

export interface DeviceSignals {
  mobile: boolean;
  /** navigator.deviceMemory — Chromium only, rounded and capped at 8. */
  memoryGb?: number;
  cores?: number;
  /** Data Saver on, or a 2G-class connection: don't pull a 60–160MB model. */
  constrainedNetwork: boolean;
  webgpu: boolean;
  safari: boolean;
}

/** Heaviest last — the order Auto steps down through. */
export const ENGINE_WEIGHT: TtsEngine[] = ['native', 'piper', 'kokoro'];

export function classifyDevice(s: DeviceSignals): DeviceTier {
  if (s.mobile || s.constrainedNetwork) return 'low';
  if (s.memoryGb !== undefined && s.memoryGb < 4) return 'low';
  if (s.cores !== undefined && s.cores <= 2) return 'low';
  // Kokoro on WASM is too slow to feel live, so "high" needs WebGPU. Without a
  // memory reading (Firefox, Safari), lean on core count instead.
  const roomy = s.memoryGb !== undefined ? s.memoryGb >= 8 : (s.cores ?? 0) >= 8;
  if (s.webgpu && !s.safari && roomy && (s.cores ?? 0) >= 6) return 'high';
  return 'mid';
}

const TIER_ENGINE: Record<DeviceTier, TtsEngine> = { low: 'native', mid: 'piper', high: 'kokoro' };

/** The engine Auto runs on this device, never heavier than `cap`. */
export function recommendEngine(s: DeviceSignals, cap?: TtsEngine | null): TtsEngine {
  const pick = TIER_ENGINE[classifyDevice(s)];
  if (!cap) return pick;
  return ENGINE_WEIGHT.indexOf(pick) > ENGINE_WEIGHT.indexOf(cap) ? cap : pick;
}

/** True when `engine` is heavier than what this device should run. */
export function isHeavyFor(engine: TtsEngine, recommended: TtsEngine): boolean {
  return ENGINE_WEIGHT.indexOf(engine) > ENGINE_WEIGHT.indexOf(recommended);
}

export function isSafariBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua);
}

/** Everything but WebGPU, which needs an async adapter request. */
export function readDeviceSignals(webgpu = false): DeviceSignals {
  if (typeof navigator === 'undefined') {
    return { mobile: false, constrainedNetwork: false, webgpu, safari: false };
  }
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  // iPadOS reports a desktop Mac UA; touch points give it away.
  const ipad = /Macintosh/.test(nav.userAgent) && nav.maxTouchPoints > 1;
  return {
    mobile: ipad || /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(nav.userAgent),
    memoryGb: typeof nav.deviceMemory === 'number' ? nav.deviceMemory : undefined,
    cores: typeof nav.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : undefined,
    constrainedNetwork: !!nav.connection?.saveData || /(^|-)2g$/.test(nav.connection?.effectiveType ?? ''),
    webgpu,
    safari: isSafariBrowser(),
  };
}

export async function hasWebGPU(): Promise<boolean> {
  try {
    const gpu = (navigator as unknown as { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
    if (!gpu) return false;
    return !!(await gpu.requestAdapter());
  } catch {
    return false;
  }
}
