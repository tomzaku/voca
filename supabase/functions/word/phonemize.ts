// Deterministic English phonetics via eSpeak-ng (WASM), instead of trusting
// the model to invent IPA in the same JSON call as everything else. Verified
// by hand against real US/GB minimal pairs — same word in, same
// transcription out, every time, which a model asked to "just know" IPA
// isn't: it drops stress marks, invents symbols, or gives US and GB the
// same answer.
import { phonemize } from 'npm:phonemizer@1.2.1';

// eSpeak's short "en-gb" code silently resolves to the same voice as
// "en-us" in this build (a bug/quirk in the compiled voice data, not a typo
// here) — only the explicit Received Pronunciation identifier actually
// produces British phonetics. Confirmed by hand: "water" -> en-us "wɔːɾɚ"
// (rhotic, flapped t) vs en-gb-x-rp "wɔːtɐ" (non-rhotic, no flap) — the real
// US/GB distinction "en-gb" alone fails to make.
const VOICES: Record<'en-US' | 'en-GB', string> = {
  'en-US': 'en-us',
  'en-GB': 'en-gb-x-rp',
};

async function tryPhonemize(word: string, voice: string): Promise<string | null> {
  try {
    const [out] = await phonemize(word, voice);
    const trimmed = out?.trim();
    return trimmed ? `/${trimmed}/` : null;
  } catch (err) {
    console.warn(`[word] phonemize failed for "${word}" (${voice}):`, (err as Error).message);
    return null;
  }
}

/**
 * Fill `phonetics` with eSpeak's transcription wherever it succeeds; keep
 * whatever the model already generated for any locale it fails on — a name
 * eSpeak mangles, an odd token, or the module failing to load at all — so a
 * phonemizer miss degrades to the old AI-generated value instead of leaving
 * the locale blank.
 */
export async function withPhonemizedIpa(
  seedWord: string,
  aiPhonetics: Record<string, string> | undefined,
): Promise<Record<string, string>> {
  const result: Record<string, string> = { ...aiPhonetics };
  const entries = await Promise.all(
    (Object.entries(VOICES) as [keyof typeof VOICES, string][])
      .map(async ([locale, voice]) => [locale, await tryPhonemize(seedWord, voice)] as const),
  );
  for (const [locale, ipa] of entries) {
    if (ipa) result[locale] = ipa;
  }
  return result;
}
