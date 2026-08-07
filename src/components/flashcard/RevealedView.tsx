import { useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { SynAnt } from '../SynAnt';
import { PeekText } from '../PeekText';
import { WordTest } from '../WordTest';
import { WordNotes } from '../WordNotes';
import { BuddyBadge } from '../BuddyBadge';
import { AnswerTally } from './AnswerTally';
import { BucketTag } from './BucketTag';
import { DefLengthToggle, ExampleList, PosChip } from './parts';
import { LEVEL_COLOR } from './constants';
import { peekWord } from '../../hooks/useWordPeek';
import { getMotherLanguage } from '../../lib/languages';
import { isKokoroSupported } from '../../lib/tts';
import { getTtsEngine } from '../../hooks/useTtsSettings';
import type { CardSpeech } from './useCardSpeech';
import type { VocabularyWord, WordProgress } from '../../types';

/**
 * The card once the word is on screen — whether it was solved, given up on, or
 * opened straight from a link.
 *
 * Everything here is the full picture: the word with its doodle and
 * pronunciation, the meaning in both languages, and the material that only
 * makes sense with the answer known (phrases, family, idioms, your own answer
 * history). The left column is the word itself; the right column is what
 * surrounds it.
 */
export function RevealedView({
  wordData, doodle, definition, fullDef, onToggleFullDef, speech, progress,
  isBookmarked, showKnowIt, busy, onNext, onBookmark, onKnow,
}: {
  wordData: VocabularyWord;
  /** The word's sketch, once it has been drawn (never waited on). */
  doodle: string | null;
  /** The chosen definition text — short or full, per the toggle. */
  definition: string;
  fullDef: boolean;
  onToggleFullDef: () => void;
  speech: CardSpeech;
  progress: WordProgress | undefined;
  isBookmarked: boolean;
  /** Only offered when the word was neither solved nor given up on. */
  showKnowIt: boolean;
  busy: boolean;
  onNext: () => void;
  onBookmark: () => void;
  onKnow: () => void;
}) {
  const headword = wordData.headword || wordData.word;
  console.log(">wordData", wordData)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[2.2fr_1fr] gap-4 sm:gap-5 items-start">
      {/* ── Left column ── */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="card-game border-accent-purple p-6 animate-bounce-in">
          <div className="flex items-start justify-between gap-4">
            {/* The doodle sits beside the word, filling space this card
                already had spare — rather than pushing the word down
                the page from a band of its own. */}
            <div className="flex items-start gap-3 sm:gap-4 min-w-0">
              {doodle && (
                <img
                  src={doodle}
                  alt={`Doodle showing the meaning of ${wordData.word}`}
                  className="shrink-0 object-contain doodle-ink animate-fade-in w-16 h-16 sm:w-24 sm:h-24"
                />
              )}
              <div className="min-w-0">
                <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mb-1">
                  <h1 className="text-2xl sm:text-4xl font-title text-accent-purple tracking-tight drop-shadow-[0_2px_0_var(--btn-lip)] break-words">
                    {headword}
                  </h1>
                  {wordData.partOfSpeech && <PosChip pos={wordData.partOfSpeech} className="text-xs" />}
                </div>
                <PhoneticList wordData={wordData} />
              </div>
            </div>
            <button
              onClick={speech.speakWord}
              className={`btn-3d w-11 h-11 rounded-xl flex items-center justify-center shrink-0 mt-1 ${speech.isSpeaking
                  ? 'bg-accent-cyan text-bg-primary'
                  : 'bg-bg-tertiary text-text-secondary hover:text-accent-cyan'
                }`}
              title={
                getTtsEngine() === 'kokoro' && isKokoroSupported()
                  ? 'Hear pronunciation — click again for another voice'
                  : speech.isSpeaking ? 'Stop' : 'Hear pronunciation'
              }
            >
              {speech.isSpeaking ? (
                <svg width="14" height="14" viewBox="0 0 10 10" fill="currentColor">
                  <rect x="0" y="0" width="4" height="10" rx="1" />
                  <rect x="6" y="0" width="4" height="10" rx="1" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Definition + synonyms/antonyms — kept together with the word so the
            full meaning is front and center */}
        <div className="card-game p-5">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xs font-display font-bold text-text-muted uppercase tracking-wider">
              Definition
            </h3>
            {/* Where this word stands — and a way into the other words that
                stand there with it. */}
            <BucketTag word={wordData.word} progress={progress} />
            <span className={`ml-auto text-[10px] font-medium px-2 py-0.5 rounded ${LEVEL_COLOR[wordData.level]}`}>
              {wordData.level}
            </span>
            <DefLengthToggle show={Boolean(wordData.shortDefinition)} fullDef={fullDef} onToggle={onToggleFullDef} />
          </div>
          <p className="text-text-primary leading-relaxed">
            <PeekText text={definition} highlight={headword} />
          </p>
          {wordData.translation && (
            <div className="mt-3 flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-accent-cyan/10 border border-accent-cyan/25">
              <Icon icon="lucide:languages" className="text-accent-cyan text-xl shrink-0" />
              <div className="min-w-0">
                <span className="block text-[10px] font-bold text-accent-cyan/70 uppercase tracking-wider">
                  {getMotherLanguage()}
                </span>
                <span className="text-base font-bold text-accent-cyan">{wordData.translation}</span>
              </div>
            </div>
          )}
          <ExampleList
            wordData={wordData}
            speakingExample={speech.speakingExample}
            onSpeak={speech.speakExample}
          />
          <SynAnt wordData={wordData} />
          <AnswerTally progress={progress} />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onNext}
            disabled={busy}
            className="btn-3d flex-1 flex flex-col items-center gap-1 py-3 bg-accent-cyan text-bg-primary"
            title="Next word — keeps this word saved"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
            <span className="text-xs">Next</span>
          </button>
          <button
            onClick={onBookmark}
            className={`btn-3d flex-1 flex flex-col items-center gap-1 py-3 ${isBookmarked
                ? 'bg-accent-yellow text-bg-primary'
                : 'bg-bg-card text-text-secondary hover:text-accent-yellow'
              }`}
            title={isBookmarked ? 'Remove bookmark' : 'Bookmark this word'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            <span className="text-xs">{isBookmarked ? 'Saved' : 'Save'}</span>
          </button>
          {/* "Know it" only makes sense when you actually solved it.
              If you gave up, you don't know it — just move on. */}
          {showKnowIt && (
            <button
              onClick={onKnow}
              className="btn-3d flex-1 flex flex-col items-center gap-1 py-3 bg-accent-green text-bg-primary"
              title="I know this word!"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-xs">Know it</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Right column ── */}
      <div className="space-y-4">
        {/* Collocations — natural word pairings */}
        {(wordData.collocations?.length ?? 0) > 0 && (
          <div className="card-game p-4 sm:p-5">
            <h3 className="text-xs font-display font-bold text-text-muted uppercase tracking-wider mb-3">
              Common phrases
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {wordData.collocations!.map((c) => (
                <button
                  key={c}
                  onClick={(e) => peekWord(c, e.currentTarget)}
                  title={`What does “${c}” mean?`}
                  className="text-xs px-2.5 py-1 rounded-full bg-accent-purple/10 text-accent-purple border border-accent-purple/20 hover:bg-accent-purple/20 hover:border-accent-purple/40 transition-all cursor-pointer"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Word family — related forms across parts of speech */}
        {(wordData.wordFamily?.length ?? 0) > 0 && (
          <div className="card-game p-4 sm:p-5">
            <h3 className="text-xs font-display font-bold text-text-muted uppercase tracking-wider mb-3">
              Word family
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {wordData.wordFamily!.map((f) => (
                <button
                  key={`${f.word}-${f.pos}`}
                  onClick={(e) => peekWord(f.word, e.currentTarget)}
                  title={`What does “${f.word}” mean?`}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-accent-orange/10 border border-accent-orange/20 hover:bg-accent-orange/20 hover:border-accent-orange/40 transition-all cursor-pointer"
                >
                  <span className="font-bold text-accent-orange">{f.word}</span>
                  <span className="text-text-muted">{f.pos}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Idioms — popular fixed expressions containing the word */}
        {(wordData.idioms?.length ?? 0) > 0 && (
          <IdiomsCard key={`${wordData.word}-${wordData.idioms?.[0].idiom}`} idioms={wordData.idioms!} />
        )}

        <BuddyBadge />

        {/* Real-world usage — clips of the word in videos and movies */}
        <div className="card-game p-5">
          <h3 className="text-xs font-display font-bold text-text-muted uppercase tracking-wider mb-3">
            See it used
          </h3>
          <div className="flex flex-col gap-2">
            <a
              href={`https://youglish.com/pronounce/${encodeURIComponent(wordData.word)}/english`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border bg-bg-tertiary hover:border-accent-red/40 hover:bg-accent-red/5 transition-all group"
            >
              <span className="w-8 h-8 rounded-lg bg-accent-red/10 text-accent-red flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23 12s0-3.9-.5-5.8a3 3 0 0 0-2.1-2.1C18.5 3.6 12 3.6 12 3.6s-6.5 0-8.4.5A3 3 0 0 0 1.5 6.2C1 8.1 1 12 1 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 8.4.5 8.4.5s6.5 0 8.4-.5a3 3 0 0 0 2.1-2.1C23 15.9 23 12 23 12zM9.8 15.3V8.7l5.7 3.3-5.7 3.3z" />
                </svg>
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary">Real videos (YouGlish)</p>
                <p className="text-xs text-text-muted">Hear “{wordData.word}” spoken in real YouTube clips</p>
              </div>
            </a>
            <a
              href={`https://www.playphrase.me/#/search?q=${encodeURIComponent(wordData.word)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border bg-bg-tertiary hover:border-accent-purple/40 hover:bg-accent-purple/5 transition-all"
            >
              <span className="w-8 h-8 rounded-lg bg-accent-purple/10 text-accent-purple flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary">Movie clips (PlayPhrase)</p>
                <p className="text-xs text-text-muted">Scenes from films using “{wordData.word}”</p>
              </div>
            </a>
          </div>
        </div>

        {/* Reset to the AI intro card on each new word so no AI call
            fires until the learner opts in */}
        <WordTest key={wordData.word} wordData={wordData} />
        <WordNotes word={wordData.word} />
      </div>
    </div>
  );
}

// Preferred accents to show, with a flag + label per locale.
const ACCENT_LABELS: { locale: string; label: string; flag: string }[] = [
  { locale: 'en-US', label: 'US', flag: '🇺🇸' },
  { locale: 'en-GB', label: 'UK', flag: '🇬🇧' },
];

/** Per-accent pronunciations, keyed by locale. Accents that share the same IPA
 *  are combined (both flags, one transcription). */
function PhoneticList({ wordData }: { wordData: VocabularyWord }) {
  const map = wordData.phonetics ?? {};
  // Group accents by identical IPA, preserving the ACCENT_LABELS order.
  const groups: { ipa: string; accents: typeof ACCENT_LABELS }[] = [];
  for (const a of ACCENT_LABELS) {
    const ipa = map[a.locale];
    if (!ipa) continue;
    const existing = groups.find((g) => g.ipa === ipa);
    if (existing) existing.accents.push(a);
    else groups.push({ ipa, accents: [a] });
  }
  if (groups.length === 0) return null;
  return (
    <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm font-code text-text-muted">
      {groups.map((g) => (
        <span key={g.ipa} className="flex items-center gap-1.5" title={g.accents.map((a) => a.label).join(' / ')}>
          <span className="text-base leading-none" aria-label={g.accents.map((a) => a.label).join(' / ')}>
            {g.accents.map((a) => a.flag).join('')}
          </span>
          {g.ipa}
        </span>
      ))}
    </div>
  );
}

/**
 * Popular idioms containing the word. The server returns them ranked by how
 * often they're heard in everyday speech, so the top 2 are shown and the rest
 * sit behind a toggle. Rendered with key={word} so the toggle resets on every
 * new card.
 */
function IdiomsCard({ idioms }: { idioms: NonNullable<VocabularyWord['idioms']> }) {
  const [showAll, setShowAll] = useState(false);
  // A word's idiom links accumulate across generations and the backfill, so the
  // same expression can arrive twice under slightly different text ("a piece of
  // cake" / "piece of cake"). Two entries that only differ in an article or
  // punctuation read as a bug, so keep the first (highest ranked) of each.
  const list = useMemo(() => {
    const seen = new Set<string>();
    return idioms.filter((i) => {
      const key = i.idiom
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\b(?:a|an|the|to|one'?s|someone'?s)\b/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [idioms]);
  const visible = showAll ? list : list.slice(0, 2);
  const hidden = list.length - 2;
  return (
    <div className="card-game p-4 sm:p-5">
      <h3 className="text-xs font-display font-bold text-text-muted uppercase tracking-wider mb-3">
        Idioms
      </h3>
      <div className="space-y-3">
        {visible.map((i) => (
          <div key={i.idiom}>
            <button
              onClick={(e) => peekWord(i.idiom, e.currentTarget)}
              title={`What does “${i.idiom}” mean?`}
              className="text-sm font-bold text-accent-pink hover:underline text-left cursor-pointer"
            >
              {i.idiom}
            </button>
            <p className="text-xs text-text-secondary">{i.meaning}</p>
            {i.example && (
              <p className="text-xs text-text-muted italic mt-0.5">“{i.example}”</p>
            )}
          </div>
        ))}
      </div>
      {hidden > 0 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-3 text-xs font-bold text-text-muted hover:text-accent-pink transition-colors cursor-pointer"
        >
          {showAll ? 'Show less' : `Show ${hidden} more`}
        </button>
      )}
    </div>
  );
}
