// How a read-aloud is cut into clips: short first so playback starts quickly,
// then sentence-sized. Its own module, free of browser APIs, because
// scripts/pregen-speech.mjs must cut text exactly the way the app does — a
// pre-recorded clip is found by the hash of its chunk, so one differing space
// is a miss.

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
