import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import { useWordPeek, type PeekAnchor } from '../hooks/useWordPeek';
import { useWordSearch } from '../hooks/useWordSearch';
import { cachedWordData, generateWordData, UnknownWordError } from '../lib/wordService';
import { getMotherLanguage } from '../lib/languages';
import { mergeSuggestions } from '../lib/spellSuggest';
import { speakText, stopSpeaking } from '../lib/tts';
import type { VocabularyWord } from '../types';

/**
 * The mini popup behind every word chip — a synonym, a common phrase, a
 * word-family form, an idiom.
 *
 * The point is to answer "what does that one mean?" without losing the card
 * you're on: the meaning in your own language, one example, and a link out to
 * the full word if you want it. Tapping a chip used to swap the whole flashcard
 * for that word, which quietly abandoned the word being learned.
 *
 * Data comes from the same cache-first `word` function the flashcard uses, so a
 * peek costs nothing for a word this device (or the shared server cache)
 * already holds — and it warms that cache for the full lookup that follows if
 * the learner does click through.
 *
 * Mounted once at the app root: chips sit inside scrolling cards that would
 * clip a popup of their own.
 */
export function WordPeek() {
  const word = useWordPeek((s) => s.word);
  const anchor = useWordPeek((s) => s.anchor);
  const close = useWordPeek((s) => s.close);

  // Keyed on the word so peeking at a second word starts clean — no stale
  // definition showing under a new headword while the next one loads.
  if (!word) return null;
  return <PeekCard key={word} word={word} anchor={anchor} onClose={close} />;
}

/** Popup width on desktop, in px. */
const PEEK_WIDTH = 320;
/** Gap between the chip and the popup, and the minimum margin to the viewport. */
const GAP = 8;

function PeekCard({ word, anchor, onClose }: {
  word: string;
  anchor: PeekAnchor | null;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  // A word already on this device paints on the first frame — no spinner for
  // something we can answer immediately.
  const [data, setData] = useState<VocabularyWord | null>(() => cachedWordData(word));
  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  // Only silence TTS on close if this popup is what started it — a peek opened
  // and dismissed mid-sentence shouldn't cut off the card behind it.
  const startedSpeech = useRef(false);

  // A phone gets a bottom sheet — a 320px popover pinned to a chip is unusable
  // on a narrow screen, and thumbs are at the bottom anyway.
  const [isPhone, setIsPhone] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const onChange = () => setIsPhone(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // `attempt` is the retry button: bumping it re-runs the fetch. Cache-first,
  // so this only ever hits the network for a word this device hasn't seen.
  useEffect(() => {
    if (cachedWordData(word)) return; // already shown from cache
    const controller = new AbortController();
    let live = true;
    generateWordData(word, controller.signal)
      .then((d) => { if (live) setData(d); })
      .catch((err: unknown) => {
        if (!live || (err as Error).name === 'AbortError') return;
        if (err instanceof UnknownWordError) setSuggestions(mergeSuggestions(word, err.suggestions));
        else setError((err as Error).message || 'Could not load that word.');
      });
    return () => {
      live = false;
      controller.abort();
    };
  }, [word, attempt]);

  // Escape closes, as does scrolling the page under the popup — a popover
  // anchored to a chip that has since scrolled away points at nothing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    if (!isPhone) {
      window.addEventListener('scroll', onClose, true);
      window.addEventListener('resize', onClose);
    }
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onClose, true);
      window.removeEventListener('resize', onClose);
    };
  }, [isPhone, onClose]);

  // Whatever the popup was pronouncing stops with it.
  useEffect(() => () => { if (startedSpeech.current) stopSpeaking(); }, []);

  // Place the popover under its chip, flipping above when there's no room and
  // clamping to the viewport so it never hangs off an edge. Re-measured as the
  // content lands, since a loading popup is shorter than a loaded one.
  //
  // Written straight to the node rather than held in state: the position is a
  // function of the rendered height, so routing it back through a render would
  // paint the popup once at the wrong place before correcting it. The card
  // starts at `opacity-0`, and the inline opacity set here reveals it in the
  // same frame it's positioned.
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el || isPhone) return;
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const a = anchor ?? { top: vh / 2, left: vw / 2, width: 0, height: 0 };
    const below = a.top + a.height + GAP;
    const height = el.offsetHeight;
    const top = below + height <= vh - GAP ? below : Math.max(GAP, a.top - GAP - height);
    const left = Math.min(
      Math.max(GAP, a.left + a.width / 2 - PEEK_WIDTH / 2),
      Math.max(GAP, vw - PEEK_WIDTH - GAP),
    );
    el.style.top = `${top}px`;
    el.style.left = `${left}px`;
    el.style.opacity = '1';
  }, [anchor, isPhone, data, suggestions, error]);

  const headword = data?.headword || data?.word || word;
  const meaning = data?.shortDefinition || data?.definition;
  const example = data?.examples?.[0];

  const handleSpeak = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    startedSpeech.current = true;
    speakText(headword, { onEnd: () => setSpeaking(false) }).catch(() => setSpeaking(false));
  };

  // The way out to the whole word: the flashcard page loads it, exactly as the
  // header search does. This is the only path that leaves the current card, and
  // it's now a deliberate choice rather than the cost of a curious tap.
  const openFull = () => {
    navigate('/');
    useWordSearch.getState().requestSearch(word);
    onClose();
  };

  return (
    <div
      className={`fixed inset-0 z-[70] ${isPhone ? 'bg-black/50 backdrop-blur-[2px] animate-fade-in' : ''}`}
      onClick={onClose}
    >
      <div
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`Meaning of ${headword}`}
        style={isPhone ? undefined : { width: PEEK_WIDTH }}
        className={
          isPhone
            ? 'absolute inset-x-2 bottom-2 rounded-2xl border border-border bg-bg-card shadow-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))] animate-bounce-in'
            : 'absolute top-0 left-0 opacity-0 rounded-2xl border border-border bg-bg-card shadow-2xl p-4'
        }
      >
        {/* Header — the word, what kind of word it is, and how it sounds */}
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-title text-lg text-text-primary break-words leading-tight">{headword}</h3>
            {data?.partOfSpeech && (
              <span className="text-[11px] text-text-muted italic">{data.partOfSpeech}</span>
            )}
          </div>
          <button
            onClick={handleSpeak}
            title={speaking ? 'Stop' : 'Hear it'}
            className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center transition-colors ${
              speaking ? 'bg-accent-cyan text-bg-primary' : 'bg-bg-tertiary text-text-muted hover:text-accent-cyan'
            }`}
          >
            <Icon icon={speaking ? 'lucide:square' : 'lucide:volume-2'} className="text-sm" />
          </button>
          <button
            onClick={onClose}
            title="Close"
            className="w-8 h-8 shrink-0 rounded-full bg-bg-tertiary text-text-muted flex items-center justify-center hover:text-text-primary"
          >
            <Icon icon="lucide:x" className="text-sm" />
          </button>
        </div>

        {/* Body */}
        {suggestions ? (
          <div className="mt-3">
            <p className="text-xs text-text-muted mb-2">We couldn't find that one.</p>
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={(e) => useWordPeek.getState().open(s, e.currentTarget)}
                    className="text-xs px-2.5 py-1 rounded-full bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/25 hover:bg-accent-cyan/20"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : error ? (
          <div className="mt-3">
            <p className="text-xs text-accent-red">{error}</p>
            <button
              onClick={() => { setError(null); setAttempt((n) => n + 1); }}
              className="mt-2 text-xs font-bold text-text-muted hover:text-accent-cyan transition-colors"
            >
              Try again
            </button>
          </div>
        ) : !data ? (
          <div className="mt-3 space-y-2 animate-pulse">
            <div className="h-9 rounded-xl bg-bg-tertiary" />
            <div className="h-3 w-4/5 rounded bg-bg-tertiary" />
            <div className="h-3 w-3/5 rounded bg-bg-tertiary" />
          </div>
        ) : (
          <>
            {/* The mother-language meaning — the reason the popup exists, so it
                leads rather than sitting under the English definition. */}
            {data.translation && (
              <div className="mt-3 flex items-center gap-2.5 px-3 py-2 rounded-xl bg-accent-cyan/10 border border-accent-cyan/25">
                <Icon icon="lucide:languages" className="text-accent-cyan text-lg shrink-0" />
                <div className="min-w-0">
                  <span className="block text-[10px] font-bold text-accent-cyan/70 uppercase tracking-wider">
                    {getMotherLanguage()}
                  </span>
                  <span className="text-sm font-bold text-accent-cyan break-words">{data.translation}</span>
                </div>
              </div>
            )}
            {meaning && <p className="mt-2.5 text-sm text-text-secondary leading-relaxed">{meaning}</p>}
            {example && (
              <p className="mt-2 text-xs text-text-muted italic leading-relaxed">“{example}”</p>
            )}
          </>
        )}

        {/* Full details stays available in every state — a word we failed to
            gloss is exactly one you might want the whole card for. */}
        <button
          onClick={openFull}
          className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-bg-tertiary text-xs font-bold text-text-secondary hover:text-accent-cyan transition-colors"
        >
          See full details
          <Icon icon="lucide:arrow-right" className="text-sm" />
        </button>
      </div>
    </div>
  );
}
