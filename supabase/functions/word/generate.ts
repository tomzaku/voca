// The AI calls: full word generation, and the cheap translate-only top-up.
// This is the only module in the `word` function that spends tokens.

import { callProvider, stripFences, type ChatMessage } from '../_shared/ai.ts';
import { asSuggestions, isVerdict } from './sanitize.ts';
import type { Generated } from './types.ts';

const GENERATE_ATTEMPTS = 4;

const SYSTEM = 'You are a vocabulary tutor. Return ONLY valid JSON, no markdown, no explanation.';

/**
 * Generate a word's data, or judge that it isn't a real word.
 *
 * One call answers both questions. A separate "is this real?" pre-flight would
 * be cleaner to read but would tax every valid lookup with an extra round trip,
 * and validity is something the model already has to settle to generate at all.
 *
 * The seed `word` is always English — a non-English `learnLang` translates it —
 * so validity is always judged as English.
 */
export async function generateWordData(word: string, learnLang: string, motherLang: string): Promise<Generated> {
  const prompt = buildPrompt(word, learnLang, motherLang);
  const messages: ChatMessage[] = [{ role: 'user', content: prompt }];

  let lastError: unknown;
  for (let attempt = 1; attempt <= GENERATE_ATTEMPTS; attempt++) {
    try {
      // Generous budget: the word JSON (examples, collocations, family, idioms
      // with examples, two phonetics) can exceed 1000 tokens and truncate into
      // invalid JSON.
      const raw = await callProvider(SYSTEM, messages, 2600);
      const data = JSON.parse(stripFences(raw)) as Generated;

      // A verdict is a complete answer — retrying only buys the same one.
      if (isVerdict(data)) return { valid: false, suggestions: asSuggestions(data.suggestions, word) };
      if (typeof data.definition === 'string' && data.definition) return data;
      throw new Error('Model returned incomplete word data.');
    } catch (err) {
      lastError = err;
      const msg = (err as Error).message ?? '';
      console.warn(`[word] generate attempt ${attempt}/${GENERATE_ATTEMPTS} failed for "${word}":`, msg);
      if (attempt < GENERATE_ATTEMPTS) {
        // Back off before retrying — hammering a rate-limited provider (429)
        // just burns the remaining attempts. Longer waits for 429s.
        const base = msg.includes('429') ? 2500 : 700;
        await new Promise((r) => setTimeout(r, base * attempt));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Failed to generate word data.');
}

/** Cheap translate-only call: reuse cached English content, fetch just the mother-tongue word. */
export async function translateWord(word: string, definition: string, motherLang: string): Promise<string> {
  const system = 'You are a translator. Return ONLY the translation — no quotes, no notes, no extra text.';
  const messages: ChatMessage[] = [{
    role: 'user',
    content: `Translate the English word "${word}" (meaning: ${definition}) into ${motherLang}. Give the single most natural ${motherLang} equivalent (one word or short phrase). Return only the translation.`,
  }];
  const text = await callProvider(system, messages, 40);
  return text.trim().replace(/^["']|["']$/g, '').slice(0, 200);
}

function buildPrompt(word: string, learnLang: string, motherLang: string): string {
  const isEnglish = learnLang.toLowerCase() === 'english';

  const headwordSpec = isEnglish
    ? `"word": "${word}",`
    : `"word": "the single ${learnLang} word that best translates the English word \\"${word}\\"",`;

  // Idioms are English-only: the shared `idioms` table (unique on idiom text)
  // must not be polluted with learn-language phrases.
  const idiomsSpec = isEnglish
    ? `\n  "idioms": [{ "idiom": "popular idiom containing the word", "meaning": "short plain-English meaning", "example": "one natural example sentence" }],`
    : '';

  return `Generate vocabulary data for ${
    isEnglish ? `the English word "${word}"` : `the ${learnLang} equivalent of the English word "${word}"`
  }.

FIRST, decide whether "${word}" is a real word or phrase. If it is NOT — a typo, a misspelling, or nonsense — do NOT invent data for it and do NOT silently correct it to a similar word. Instead return ONLY this JSON and nothing else:
{ "valid": false, "suggestions": ["up to 5 real words it was most likely meant to be, closest first"] }
Judge this strictly on whether the word exists, not on how common it is: rare, archaic, technical, dialectal, and proper nouns are all real words, as are inflected forms (plurals, past tenses) and multi-word phrasal verbs and idioms. When in doubt, treat it as real and generate it.

Otherwise return this exact JSON structure (no markdown, no extra text):
{
  ${headwordSpec}
  "phonetics": { "en-US": "US IPA like /wɜːrd/", "en-GB": "UK IPA like /wɜːd/" },
  "partOfSpeech": "noun | verb | adjective | adverb | etc",
  "definition": "Clear, concise definition in 1-2 sentences${isEnglish ? '' : `, written in ${learnLang}`}",
  "shortDefinition": "very short plain-English definition (max 12 words), phrased like a quick handwritten note next to the word on a study mind map — punchy and memorable, e.g. 'too willing to believe things; easily fooled'",
  "translation": "the word's meaning translated into ${motherLang} (the most natural equivalent)",
  "examples": [
    "Natural example sentence showing the word in context.",
    "Another example with different usage.",
    "A third example if the word has notable nuance."
  ],
  "synonyms": ["synonym1", "synonym2", "synonym3"],
  "antonyms": ["antonym1", "antonym2"],
  "collocations": ["natural phrase 1", "natural phrase 2", "phrase 3", "phrase 4", "phrase 5"],
  "wordFamily": [{ "word": "related form", "pos": "noun | verb | adjective | adverb" }],${idiomsSpec}
  "level": "beginner | intermediate | advanced",
  "imageKeywords": ["concrete visual noun 1", "concept 2"]
}

Set "level" to how hard this word is for someone learning English: "beginner" for everyday core vocabulary, "intermediate" for words a confident learner would meet in books or news, "advanced" for rare, literary, or technical words. Provide 5 to 15 "collocations": short, natural word pairings that commonly go with the word (e.g. for "decision": "make a decision", "tough decision", "final decision"). Give more for very common words with many natural pairings (e.g. "go", "make"), fewer for rare or specialized words. ${
    isEnglish
      ? 'Provide 3-6 "idioms": well-known English idioms or fixed expressions that contain the word or an inflected form of it, ordered by how often they are actually heard in everyday modern speech — most common FIRST (e.g. for "dog": "work like a dog" before rarer ones like "a dog\'s life") — ONLY genuinely established, widely used idioms, never invented ones; use an empty array if the word has no well-known idioms. '
      : ''
  }For "wordFamily", list 2-6 derivationally related forms across OTHER parts of speech (e.g. for "decide": decision/noun, decisive/adjective, decidedly/adverb) — do NOT include the word itself; use an empty array if none exist. The "translation" field MUST be written in ${motherLang}. The "shortDefinition" MUST always be in simple English${
    isEnglish ? '' : `, even though the "word", "definition", "examples", "synonyms", "antonyms", "collocations", and "wordFamily" MUST all be written in ${learnLang}`
  }. For imageKeywords, always use 1-2 simple concrete English nouns or short phrases that visually represent the meaning (used for image search).`;
}
