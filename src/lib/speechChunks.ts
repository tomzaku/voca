// How a read-aloud becomes clips: cut short first so playback starts quickly,
// then sentence-sized, and named by a hash of what each says. Its own module,
// free of browser APIs, because scripts/pregen-speech.mjs must reproduce all
// of it exactly — a pre-recorded clip is found by that hash, so one differing
// space is a miss. The speech function hashes the same way (speech/index.ts).

const FIRST_CHUNK_CHARS = 120;
const MAX_CHUNK_CHARS = 300;

export function splitIntoChunks(text: string): string[] {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  for (const para of paragraphs) {
    const limit = chunks.length === 0 ? FIRST_CHUNK_CHARS : MAX_CHUNK_CHARS;
    if (para.length <= limit) { chunks.push(para); continue; }
    const sentences = para.match(/[^.!?]+[.!?]+\s*/g) || [para];
    let current = '';
    for (const sentence of sentences) {
      const curLimit = chunks.length === 0 && current === '' ? FIRST_CHUNK_CHARS : MAX_CHUNK_CHARS;
      if (current.length + sentence.length > curLimit && current) { chunks.push(current.trim()); current = ''; }
      current += sentence;
    }
    if (current.trim()) chunks.push(current.trim());
  }
  return chunks.length > 0 ? chunks : [text];
}

/** IPA without its slashes — the form sent to the server and hashed. */
export function bareIpa(ipa: string): string {
  return ipa.replace(/^\/|\/$/g, '').trim();
}

/**
 * What a clip's name is the SHA-256 of: the chunk with whitespace collapsed,
 * plus the IPA when one was sent, so each reading of "live" is its own clip.
 */
export function clipHashInput(text: string, ipa?: string): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return ipa ? `${t}\n${ipa}` : t;
}

/**
 * IPA as Kokoro's tokenizer wants it: the stored IPA is eSpeak's, and these
 * are the few substitutions kokoro-js makes to eSpeak output itself.
 */
export function kokoroPhonemes(ipa: string): string {
  return ipa.replace(/ʲ/g, 'j').replace(/r/g, 'ɹ').replace(/x/g, 'k').replace(/ɬ/g, 'l');
}
