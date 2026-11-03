// Choosing a voice for the native (speechSynthesis) engine.
//
// Left to itself the browser speaks `en-US` in its default voice, which on an
// iPhone is the compact Samantha — the robotic one. iOS 17+ and macOS also
// list any Enhanced/Premium voices the user has downloaded, and those sound
// close to the neural engines, so rank what's installed and speak with the
// best unless the user picked one. Phones land on native through Auto, so this
// is the voice most iPhone users hear.

export type VoiceTier = 'premium' | 'enhanced' | 'standard' | 'novelty';

/** The fields we read, so the ranking can be tested without a browser. */
export type VoiceLike = Pick<SpeechSynthesisVoice, 'name' | 'voiceURI' | 'lang'>;

const TIER_SCORE: Record<VoiceTier, number> = { premium: 3, enhanced: 2, standard: 1, novelty: 0 };

// Apple's joke voices, plus the Eloquence set (Eddy, Flo, Grandma…) iOS 17
// added for screen-reader users — fine for VoiceOver, wrong for teaching
// pronunciation. Hidden from the picker and never chosen.
const NOVELTY = /^(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Junior|Ralph|Fred|Kathy|Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley)\b/i;

export function voiceTier(v: VoiceLike): VoiceTier {
  const uri = v.voiceURI.toLowerCase();
  if (uri.includes('eloquence') || uri.includes('speech.synthesis.voice') || NOVELTY.test(v.name)) return 'novelty';
  if (uri.includes('.premium.') || /\(premium\)/i.test(v.name)) return 'premium';
  // Edge's "Online (Natural)" voices are neural and stream from Azure.
  if (uri.includes('.enhanced.') || /\((enhanced|natural)\)|neural/i.test(v.name)) return 'enhanced';
  return 'standard';
}

/** `en_US` (Android) and `en-us` both mean `en-US`. */
function normLang(lang: string): string {
  return lang.replace('_', '-').toLowerCase();
}

function langScore(v: VoiceLike): number {
  const l = normLang(v.lang);
  if (l === 'en-us') return 2;
  if (l === 'en-gb') return 1;
  return 0;
}

/** English voices worth offering, best first. Novelty voices are dropped. */
export function rankEnglishVoices<V extends VoiceLike>(voices: readonly V[]): V[] {
  return voices
    .filter((v) => normLang(v.lang).startsWith('en') && voiceTier(v) !== 'novelty')
    .sort((a, b) =>
      TIER_SCORE[voiceTier(b)] - TIER_SCORE[voiceTier(a)]
      || langScore(b) - langScore(a)
      || a.name.localeCompare(b.name));
}

/** The user's pick if it's still installed, else the best English voice. */
export function chooseVoice<V extends VoiceLike>(voices: readonly V[], preferredUri?: string): V | null {
  if (preferredUri) {
    const picked = voices.find((v) => v.voiceURI === preferredUri);
    if (picked) return picked;
  }
  return rankEnglishVoices(voices)[0] ?? null;
}

/** Apple devices can download better voices; others can't, so only they get the tip. */
export function isAppleDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);
}

// ─── Live voice list ───────────────────────────────────────────────
//
// getVoices() is empty until the browser has loaded its list (always on the
// first call in Safari and Chrome), and the list changes when the user
// downloads a voice. Keep one copy updated from `voiceschanged`.

let cached: SpeechSynthesisVoice[] = [];
const listeners = new Set<() => void>();

function refresh() {
  if (typeof speechSynthesis === 'undefined') return;
  cached = speechSynthesis.getVoices();
  listeners.forEach((l) => l());
}

if (typeof speechSynthesis !== 'undefined') {
  refresh();
  speechSynthesis.addEventListener?.('voiceschanged', refresh);
}

export function getNativeVoices(): SpeechSynthesisVoice[] {
  // Quietly retry an empty list: no notify, since this runs during render.
  if (cached.length === 0 && typeof speechSynthesis !== 'undefined') {
    const now = speechSynthesis.getVoices();
    if (now.length > 0) cached = now;
  }
  return cached;
}

/** For useSyncExternalStore. */
export function subscribeNativeVoices(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
