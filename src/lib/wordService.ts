import { callAI } from './aiProviders';
import type { VocabularyWord } from '../types';

// ─── Built-in word list ─────────────────────────────────────────────

export const WORD_LIST: { word: string; level: VocabularyWord['level'] }[] = [
  // Beginner
  { word: 'abundant', level: 'beginner' },
  { word: 'achieve', level: 'beginner' },
  { word: 'adapt', level: 'beginner' },
  { word: 'advocate', level: 'beginner' },
  { word: 'ambiguous', level: 'beginner' },
  { word: 'analyze', level: 'beginner' },
  { word: 'anxious', level: 'beginner' },
  { word: 'appreciate', level: 'beginner' },
  { word: 'approach', level: 'beginner' },
  { word: 'assure', level: 'beginner' },
  { word: 'benefit', level: 'beginner' },
  { word: 'capable', level: 'beginner' },
  { word: 'challenge', level: 'beginner' },
  { word: 'commit', level: 'beginner' },
  { word: 'confident', level: 'beginner' },
  { word: 'consistent', level: 'beginner' },
  { word: 'contribute', level: 'beginner' },
  { word: 'crucial', level: 'beginner' },
  { word: 'curious', level: 'beginner' },
  { word: 'decisive', level: 'beginner' },
  { word: 'dedicate', level: 'beginner' },
  { word: 'deliberate', level: 'beginner' },
  { word: 'diverse', level: 'beginner' },
  { word: 'efficient', level: 'beginner' },
  { word: 'emerge', level: 'beginner' },
  { word: 'empower', level: 'beginner' },
  { word: 'encourage', level: 'beginner' },
  { word: 'establish', level: 'beginner' },
  { word: 'evaluate', level: 'beginner' },
  { word: 'evolve', level: 'beginner' },
  { word: 'flexible', level: 'beginner' },
  { word: 'focus', level: 'beginner' },
  { word: 'genuine', level: 'beginner' },
  { word: 'grateful', level: 'beginner' },
  { word: 'humble', level: 'beginner' },
  { word: 'impact', level: 'beginner' },
  { word: 'initiative', level: 'beginner' },
  { word: 'inspire', level: 'beginner' },
  { word: 'integrate', level: 'beginner' },
  { word: 'invest', level: 'beginner' },
  // Intermediate
  { word: 'acquiesce', level: 'intermediate' },
  { word: 'affable', level: 'intermediate' },
  { word: 'alacrity', level: 'intermediate' },
  { word: 'altruistic', level: 'intermediate' },
  { word: 'ambivalent', level: 'intermediate' },
  { word: 'ameliorate', level: 'intermediate' },
  { word: 'anomaly', level: 'intermediate' },
  { word: 'apathy', level: 'intermediate' },
  { word: 'apprehensive', level: 'intermediate' },
  { word: 'arbitrary', level: 'intermediate' },
  { word: 'articulate', level: 'intermediate' },
  { word: 'astute', level: 'intermediate' },
  { word: 'audacious', level: 'intermediate' },
  { word: 'austere', level: 'intermediate' },
  { word: 'benevolent', level: 'intermediate' },
  { word: 'candid', level: 'intermediate' },
  { word: 'circumspect', level: 'intermediate' },
  { word: 'cogent', level: 'intermediate' },
  { word: 'complacent', level: 'intermediate' },
  { word: 'concise', level: 'intermediate' },
  { word: 'convoluted', level: 'intermediate' },
  { word: 'corroborate', level: 'intermediate' },
  { word: 'credulous', level: 'intermediate' },
  { word: 'culpable', level: 'intermediate' },
  { word: 'daunting', level: 'intermediate' },
  { word: 'debilitate', level: 'intermediate' },
  { word: 'deft', level: 'intermediate' },
  { word: 'delicate', level: 'intermediate' },
  { word: 'denounce', level: 'intermediate' },
  { word: 'deplete', level: 'intermediate' },
  { word: 'desolate', level: 'intermediate' },
  { word: 'diligent', level: 'intermediate' },
  { word: 'discern', level: 'intermediate' },
  { word: 'disparate', level: 'intermediate' },
  { word: 'eloquent', level: 'intermediate' },
  { word: 'elusive', level: 'intermediate' },
  { word: 'empirical', level: 'intermediate' },
  { word: 'enigmatic', level: 'intermediate' },
  { word: 'ephemeral', level: 'intermediate' },
  { word: 'equivocal', level: 'intermediate' },
  // Advanced
  { word: 'abstruse', level: 'advanced' },
  { word: 'acrimony', level: 'advanced' },
  { word: 'adumbrate', level: 'advanced' },
  { word: 'anachronism', level: 'advanced' },
  { word: 'anodyne', level: 'advanced' },
  { word: 'antipathy', level: 'advanced' },
  { word: 'aphorism', level: 'advanced' },
  { word: 'apotheosis', level: 'advanced' },
  { word: 'capricious', level: 'advanced' },
  { word: 'chicanery', level: 'advanced' },
  { word: 'corollary', level: 'advanced' },
  { word: 'corpulent', level: 'advanced' },
  { word: 'dearth', level: 'advanced' },
  { word: 'dilettante', level: 'advanced' },
  { word: 'ebullient', level: 'advanced' },
  { word: 'effulgent', level: 'advanced' },
  { word: 'egregious', level: 'advanced' },
  { word: 'enervate', level: 'advanced' },
  { word: 'equanimity', level: 'advanced' },
  { word: 'erudite', level: 'advanced' },
  { word: 'esoteric', level: 'advanced' },
  { word: 'fastidious', level: 'advanced' },
  { word: 'fatuous', level: 'advanced' },
  { word: 'feckless', level: 'advanced' },
  { word: 'felicitous', level: 'advanced' },
  { word: 'fractious', level: 'advanced' },
  { word: 'garrulous', level: 'advanced' },
  { word: 'grandiloquent', level: 'advanced' },
  { word: 'ignominious', level: 'advanced' },
  { word: 'impecunious', level: 'advanced' },
  { word: 'implacable', level: 'advanced' },
  { word: 'inchoate', level: 'advanced' },
  { word: 'inimical', level: 'advanced' },
  { word: 'inveterate', level: 'advanced' },
  { word: 'laconic', level: 'advanced' },
  { word: 'loquacious', level: 'advanced' },
  { word: 'magnanimous', level: 'advanced' },
  { word: 'mendacious', level: 'advanced' },
  { word: 'obsequious', level: 'advanced' },
  { word: 'perfidious', level: 'advanced' },
  { word: 'perspicacious', level: 'advanced' },
  { word: 'proclivity', level: 'advanced' },
  { word: 'propitious', level: 'advanced' },
  { word: 'recalcitrant', level: 'advanced' },
  { word: 'sanguine', level: 'advanced' },
  { word: 'sycophant', level: 'advanced' },
  { word: 'temerity', level: 'advanced' },
  { word: 'tenacious', level: 'advanced' },
  { word: 'truculent', level: 'advanced' },
  { word: 'vicarious', level: 'advanced' },
];

// ─── Cache ──────────────────────────────────────────────────────────

const CACHE_KEY_PREFIX = 'voca-word-v2-';

function getCachedWord(word: string): VocabularyWord | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX + word);
    if (raw) return JSON.parse(raw) as VocabularyWord;
  } catch { /* ignore */ }
  return null;
}

function cacheWord(word: VocabularyWord) {
  try {
    localStorage.setItem(CACHE_KEY_PREFIX + word.word, JSON.stringify(word));
  } catch { /* ignore */ }
}

// ─── AI generation ──────────────────────────────────────────────────

export async function generateWordData(
  word: string,
  level: VocabularyWord['level'],
  signal?: AbortSignal,
): Promise<VocabularyWord> {
  const cached = getCachedWord(word);
  if (cached) return cached;

  const system = `You are a vocabulary tutor. Return ONLY valid JSON, no markdown, no explanation.`;

  const prompt = `Generate vocabulary data for the word "${word}" (level: ${level}).

Return this exact JSON structure (no markdown, no extra text):
{
  "word": "${word}",
  "phonetic": "IPA phonetic notation like /wɜːrd/",
  "partOfSpeech": "noun | verb | adjective | adverb | etc",
  "definition": "Clear, concise definition in 1-2 sentences",
  "examples": [
    "Natural example sentence showing the word in context.",
    "Another example with different usage.",
    "A third example if the word has notable nuance."
  ],
  "synonyms": ["synonym1", "synonym2", "synonym3"],
  "level": "${level}",
  "hints": [
    "Vague contextual clue — describe when or how this word is used without naming it",
    "More specific clue about its core meaning or feeling",
    "Strong clue — etymology, first letter, or a very close synonym"
  ],
  "imageKeywords": ["concrete visual noun 1", "concept 2"]
}

For imageKeywords, provide 1-2 simple concrete nouns or short phrases that visually represent the word's meaning (used for image search).`;

  const raw = await callAI({
    system,
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 700,
    signal,
  });

  // Parse JSON — strip markdown fences if present
  const jsonText = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const data = JSON.parse(jsonText) as VocabularyWord;
  cacheWord(data);
  return data;
}

// ─── Word selection ─────────────────────────────────────────────────

export function pickNextWord(
  knownWords: Set<string>,
  skippedWords: Set<string>,
  exclude: Set<string> = new Set(),
): { word: string; level: VocabularyWord['level'] } {
  const available = WORD_LIST.filter(
    (w) => !knownWords.has(w.word) && !exclude.has(w.word),
  );

  if (available.length === 0) {
    // All words known — fall back to unskipped
    const fallback = WORD_LIST.filter((w) => !skippedWords.has(w.word) && !exclude.has(w.word));
    if (fallback.length === 0) return WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
    return fallback[Math.floor(Math.random() * fallback.length)];
  }

  // Prefer words not yet skipped
  const notSkipped = available.filter((w) => !skippedWords.has(w.word));
  const pool = notSkipped.length > 0 ? notSkipped : available;
  return pool[Math.floor(Math.random() * pool.length)];
}
