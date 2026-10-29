import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { useWordSearch } from '../hooks/useWordSearch';
import { getLearnLanguage, getMotherLanguage } from '../lib/languages';
import { recentCachedWords } from '../lib/wordService';
import { CatMascot } from './CatMascot';

// Well-known idioms to show when none of the recent words bring one of their
// own — English only, since that's the language they're in.
const FALLBACK_IDIOMS = ['break the ice', 'piece of cake', 'under the weather'];

/**
 * What the placeholder types out: a mix of the learner's own recent words,
 * idioms, and a recent word's meaning in their mother language — so it shows
 * each kind of thing the box takes (a word, a phrase, the other language),
 * not just says so. Picked once, when the box opens.
 */
function placeholderExamples(): string[] {
  const recent = recentCachedWords(8).reverse(); // newest first
  const words = recent.slice(0, 3).map((w) => w.headword || w.word);
  const idioms = recent.flatMap((w) => w.idioms?.slice(0, 1).map((i) => i.idiom) ?? []).slice(0, 2);
  if (idioms.length < 2 && getLearnLanguage() === 'English') {
    idioms.push(...FALLBACK_IDIOMS.filter((i) => !idioms.includes(i)).slice(0, 2 - idioms.length));
  }
  // A translation like "không ngừng, liên tục" — the first sense reads as a
  // search on its own.
  const meaning = recent.find((w) => w.translation)?.translation?.split(/[,;]/)[0].trim();
  const out: string[] = [];
  for (let i = 0; i < 3; i++) {
    if (words[i]) out.push(words[i]);
    if (idioms[i]) out.push(idioms[i]);
    if (i === 0 && meaning) out.push(meaning);
  }
  return out;
}

const TYPE_MS = 70;
const DELETE_MS = 35;
const HOLD_MS = 1600;
const GAP_MS = 350;

/**
 * Types each example out, holds it, deletes it, and moves to the next, for as
 * long as `active`. Returns the text so far — '' between examples — or null
 * before the first one starts. Nothing runs, and null comes back, with no
 * examples or when the reader has asked for reduced motion.
 */
function useTypedExample(examples: string[], active: boolean): string | null {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    if (!active || examples.length === 0) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let index = 0;
    let len = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      const target = examples[index];
      if (!deleting) {
        len += 1;
        setText(target.slice(0, len));
        if (len < target.length) { timer = setTimeout(step, TYPE_MS); return; }
        deleting = true;
        timer = setTimeout(step, HOLD_MS);
        return;
      }
      len -= 1;
      setText(target.slice(0, len));
      if (len > 0) { timer = setTimeout(step, DELETE_MS); return; }
      deleting = false;
      index = (index + 1) % examples.length;
      timer = setTimeout(step, GAP_MS);
    };
    timer = setTimeout(step, GAP_MS);
    return () => { clearTimeout(timer); setText(null); };
  }, [examples, active]);
  return text;
}

/**
 * Spotlight-style word lookup, opened from the header's Search button or
 * ⌘K/Ctrl+K/"/" from anywhere. An overlay rather than an input that grows
 * out of the header in place — that approach left the input squeezed to
 * near-nothing on narrow phones once it had to share the row with the menu
 * and profile buttons either side of it.
 */
export function SearchModal({ onClose }: { onClose: () => void }) {
  const intl = useIntl();
  const navigate = useNavigate();
  const requestSearch = useWordSearch((s) => s.requestSearch);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [examples] = useState(placeholderExamples);
  // Only while the box is empty — once the learner types, the placeholder is
  // hidden anyway, so there's nothing to animate.
  const typed = useTypedExample(examples, query === '');
  const fixedPlaceholder = intl.formatMessage({ id: 'common.searchPlaceholder' }, { learn: getLearnLanguage(), mother: getMotherLanguage() });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Capture phase + stopPropagation: Rail's own Escape handler also
      // listens on window, and without this, closing the modal while the
      // mobile drawer sits open behind it would collapse the drawer too —
      // capture-phase listeners on window run before bubble-phase ones on
      // the same node, so stopping it here keeps this Escape ours alone.
      e.stopPropagation();
      onClose();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Keep the whole phrase — phrasal verbs and idioms ("go on", "give up")
    // are valid lookups; just collapse stray whitespace.
    const word = query.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!word) return;
    navigate('/');          // ensure the flashcard page is mounted
    requestSearch(word);    // FlashCard picks this up and loads the word
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div className="w-full max-w-xl flex flex-col items-center">
        <div className="w-24 h-24 -mb-4 z-10 pointer-events-none">
          <CatMascot pose="search" size={96} />
        </div>
        <form
          onSubmit={handleSubmit}
          onClick={(e) => e.stopPropagation()}
          className="w-full rounded-2xl border-2 border-accent-cyan bg-bg-card shadow-2xl overflow-hidden animate-pop-in"
        >
          <div className="relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              // The fixed line until the first example starts typing, then
              // "Try “…|”" — the caret keeps the frame from flashing back to
              // the fixed line between examples. Screen readers get the fixed
              // line throughout rather than every keystroke.
              placeholder={typed === null ? fixedPlaceholder : intl.formatMessage({ id: 'common.searchTry' }, { example: `${typed}|` })}
              aria-label={fixedPlaceholder}
              className="w-full bg-transparent px-5 py-5 text-lg text-text-primary font-semibold focus:outline-none placeholder:text-text-muted"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          <div className="flex items-center justify-between gap-2 px-5 py-2.5 border-t-2 border-border text-xs text-text-muted font-bold">
            <span><FormattedMessage id="common.searchEnterHint" /></span>
            <span className="flex items-center gap-1.5">
              <FormattedMessage
                id="common.searchEscHint"
                values={{ kbd: (chunks) => <kbd className="px-1.5 py-0.5 rounded bg-bg-tertiary font-mono">{chunks}</kbd> }}
              />
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
