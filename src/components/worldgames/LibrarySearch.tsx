import { useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useAuth } from '../../hooks/useAuth';
import { useTypedExample } from '../../hooks/useTypedExample';
import { useVocabularyStore } from '../../hooks/useVocabulary';
import { getLearnLanguage, getMotherLanguage } from '../../lib/languages';
import { lookupWord, normalizeQuery, placeholderExamples } from '../../lib/wordSearch';
import { stopSpeaking } from '../../lib/tts';
import type { VocabularyWord } from '../../types';
import { HudCenter, PixelButton, PixelChip, PixelIcon, PixelLoader } from './pixel';
import { WordPage } from './WordPage';

// The Search building — Tàng Thư Lâu, the royal library. The same lookup as
// the header's search (lib/wordSearch: query clean-up, cache-first lookup,
// "did you mean" for non-words, the typed-out examples), but drawn as a HUD
// in the world: the search bar docked on top, the word's page opening in the
// middle, and "learn it" sending the word to the Đông Ba stall instead of
// leaving the game for the flash card.

type State =
  | { name: 'idle' }
  | { name: 'loading'; query: string }
  | { name: 'found'; data: VocabularyWord }
  | { name: 'unknown'; word: string; suggestions: string[] }
  | { name: 'error'; query: string };

export function LibrarySearch({ onLearn }: { onLearn: (word: string) => void }) {
  const intl = useIntl();
  const { user } = useAuth();
  const recordView = useVocabularyStore((s) => s.recordView);
  const [query, setQuery] = useState('');
  const [state, setState] = useState<State>({ name: 'idle' });
  const [examples] = useState(placeholderExamples);
  const typed = useTypedExample(examples, query === '');
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    return () => { abortRef.current?.abort(); stopSpeaking(); };
  }, []);

  const search = async (raw: string) => {
    const word = normalizeQuery(raw);
    if (!word) return;
    setQuery(word);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setState({ name: 'loading', query: word });
    try {
      const result = await lookupWord(word, ctrl.signal);
      if (ctrl.signal.aborted) return;
      if (result.kind === 'unknown') {
        setState({ name: 'unknown', word: result.word, suggestions: result.suggestions });
        return;
      }
      // Opening a word's page counts as seeing it, as on the flash card.
      recordView(result.data.word, user?.id);
      setState({ name: 'found', data: result.data });
    } catch (err) {
      if ((err as Error).name === 'AbortError' || ctrl.signal.aborted) return;
      setState({ name: 'error', query: word });
    }
  };

  const fixedPlaceholder = intl.formatMessage({ id: 'common.searchPlaceholder' }, { learn: getLearnLanguage(), mother: getMotherLanguage() });

  return (
    <>
      {/* The search bar, docked where the vitals sit in a game. */}
      <div className="px absolute top-[3.75rem] xl:top-2 left-1/2 -translate-x-1/2 w-[min(620px,calc(100%-1rem))] pointer-events-auto px-in-down">
        <form
          className="px-notch px-frame p-2.5 flex items-center gap-2"
          onSubmit={(e) => { e.preventDefault(); void search(query); }}
        >
          <PixelIcon name="search" size={3} className="text-[var(--px-gold)] ml-1.5 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={typed === null ? fixedPlaceholder : intl.formatMessage({ id: 'common.searchTry' }, { example: `${typed}|` })}
            aria-label={fixedPlaceholder}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="flex-1 min-w-0 bg-transparent px-1 py-2 text-[20px] font-bold text-[var(--px-text)] placeholder:text-[var(--px-muted)] placeholder:font-semibold focus:outline-none"
          />
          <PixelButton type="submit" tone="gold" disabled={!query.trim()}>
            <FormattedMessage id="navbar.search" />
          </PixelButton>
        </form>
        {state.name === 'idle' && (
          <p className="px-title !text-[12px] text-[var(--px-muted)] text-center mt-1.5"><FormattedMessage id="world.searchHint" /></p>
        )}
      </div>

      {state.name === 'loading' && <HudCenter><PixelLoader label={state.query} /></HudCenter>}

      {state.name === 'error' && (
        <HudCenter>
          <p className="text-center"><FormattedMessage id="flashcard.couldNotFind" values={{ word: state.query }} /></p>
        </HudCenter>
      )}

      {state.name === 'unknown' && (
        <HudCenter>
          <p className="text-center mb-3"><FormattedMessage id="flashcard.couldNotFind" values={{ word: state.word }} /></p>
          {state.suggestions.length > 0 && (
            <>
              <p className="px-title text-[var(--px-accent)] text-center mb-2"><FormattedMessage id="word.didYouMean" /></p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {state.suggestions.map((s) => <PixelChip key={s} on={false} onClick={() => void search(s)}>{s}</PixelChip>)}
              </div>
            </>
          )}
        </HudCenter>
      )}

      {state.name === 'found' && <WordPage data={state.data} onLearn={onLearn} onSearch={(w) => void search(w)} />}
    </>
  );
}
