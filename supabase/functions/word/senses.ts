// A word's other parts of speech — "live" the verb (/lɪv/) and "live" the
// adjective (/laɪv/). The prompt text lives here, free of Deno APIs, because
// two callers ask for the same thing: the full generation in generate.ts, and
// scripts/backfill-senses.mjs for words cached before senses existed. One copy
// of the wording means both produce the same shape.

/** The JSON field the model fills, as it appears inside a larger object. */
export function sensesField(translationLangs: string[]): string {
  const translation = translationLangs.length === 1
    ? `"translation": "this meaning in ${translationLangs[0]}"`
    : `"translations": { ${translationLangs.map((l) => `"${l.toLowerCase()}": "this meaning in ${l}"`).join(', ')} }`;
  return `"otherSenses": [{ "partOfSpeech": "noun | verb | adjective | adverb | etc — never the primary one", "definition": "1 sentence", "shortDefinition": "max 12 words", ${translation}, "examples": ["natural sentence using the word as this part of speech", "another"] }]`;
}

/** The rule that goes with the field. */
export const SENSES_RULE =
  'For "otherSenses", list every OTHER part of speech that a standard learner\'s dictionary (Oxford, Cambridge) gives this exact spelling, most common first, at most 3. ' +
  'Many everyday words are both noun and verb and MUST list the other: use, project, cast, record, present, object, produce, tear, live, change, work, play, cook, plan. ' +
  'Do NOT list: a noun merely used before another noun ("convention center" does not make "convention" an adjective); an inflected form that shares the spelling ("left" as past tense of leave); rare, archaic or technical uses. ' +
  'Use an empty array only when the dictionary gives just one part of speech.';

/** A standalone prompt for a word already cached with one meaning. */
export function sensesOnlyPrompt(word: string, primaryPos: string, primaryDefinition: string, translationLangs: string[]): string {
  return `The English word "${word}" is already described as a ${primaryPos}: "${primaryDefinition}". Return ONLY this JSON (no markdown):
{ ${sensesField(translationLangs)} }

${SENSES_RULE}`;
}

// ─── IPA per part of speech ────────────────────────────────────────
//
// eSpeak reads a bare word one way — "use" comes out /juːs/, the noun — but
// picks the right reading from the word before it: "to use" /juːz/, "the
// use" /juːs/, "is content" /kəntˈɛnt/, "the content" /kˈɑːntɛnt/. So each
// sense is phonemized behind a lead-in word for its part of speech, which is
// then dropped. Deterministic, unlike asking the model, which gets heteronyms
// wrong and writes symbols Kokoro doesn't read. Used only for words with
// several senses; a one-meaning word keeps its bare-word IPA.

const LEAD_INS: [RegExp, string][] = [
  [/^verb|phrasal verb/, 'to'],
  [/^noun/, 'the'],
  [/^adj/, 'is'],
];

/** The text to phonemize for `word` read as `pos`, and how many leading words to drop. */
export function ipaContext(word: string, pos: string | undefined): { text: string; drop: number } {
  const lead = LEAD_INS.find(([re]) => re.test((pos ?? '').toLowerCase().trim()))?.[1];
  return lead ? { text: `${lead} ${word}`, drop: 1 } : { text: word, drop: 0 };
}

/** eSpeak's output for `ipaContext(...).text`, minus the lead-in, as /ipa/. */
export function stripLeadIn(phonemes: string, drop: number): string | null {
  const words = phonemes.trim().split(/\s+/).slice(drop).join(' ');
  return words ? `/${words}/` : null;
}
