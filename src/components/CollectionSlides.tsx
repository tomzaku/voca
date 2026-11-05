import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { FormattedMessage, useIntl } from 'react-intl';
import toast from 'react-hot-toast';
import { generateWordData, warmWordData } from '../lib/wordService';
import { getMotherLanguage } from '../lib/languages';
import { DOODLE_BATCH_MAX, DOODLE_SHEET_SIZE, doodleKey, fetchDoodles, lookUpDoodles } from '../lib/doodles';
import { useIsPro } from '../hooks/useProStatus';
import {
  availableSlideThemes, doodleFilter, loadShowExampleTranslations, loadSlideTheme, saveShowExampleTranslations,
  saveSlideTheme, slideTheme, slideThemeStyle,
  type SlideTheme, type SlideThemeId,
} from '../lib/slideThemes';
import { SlideDecor, WordAccent } from './SlideDecor';
import { speakText, stopSpeaking } from '../lib/tts';
import type { VocabularyWord } from '../types';

/** Words fetched ahead of the one on screen, so clicking on never waits. */
const LOOKAHEAD = 2;

/** How close an undrawn word has to be before a sheet is drawn for it. A
 *  sheet takes a while, so this starts it a few slides early. */
const DRAW_AHEAD = 4;

/**
 * Doodles for the deck, keyed by `doodleKey(word)`, fetched in windows of
 * DOODLE_BATCH_MAX words ahead of the slide on screen — a few requests for a
 * whole deck, not one per slide.
 *
 * Looking up what's already drawn is free, so everyone gets those. A Pro
 * presenter also gets the missing ones drawn, a sheet at a time, starting from
 * the slides coming up — the same economics as the flash card (useWordDoodle).
 * Nothing waits on a doodle; each fades in when it exists.
 */
function useDeckDoodles(words: string[], index: number, isPro: boolean): Record<string, string> {
  const [doodles, setDoodles] = useState<Record<string, string>>({});
  // Mutable bookkeeping, not state: none of it is rendered.
  const st = useRef({
    asked: new Set<string>(),   // a lookup has been sent
    checked: new Set<string>(), // …and has come back
    have: new Set<string>(),    // doodleKeys we hold an image for
    offered: new Set<string>(), // sent to be drawn — never offered twice
    drawing: false,
    live: true,
  });
  useEffect(() => {
    const s = st.current;
    s.live = true;
    return () => { s.live = false; };
  }, []);

  useEffect(() => {
    if (index < 0 || index >= words.length) return;
    const s = st.current;
    const keep = (found: Record<string, string>) => {
      const keys = Object.keys(found);
      for (const k of keys) s.have.add(k);
      if (s.live && keys.length) setDoodles((d) => ({ ...d, ...found }));
    };
    const ahead = words.slice(index, index + DOODLE_BATCH_MAX);
    const soon = words.slice(index, index + DRAW_AHEAD);

    void (async () => {
      if (soon.some((w) => !s.asked.has(w))) {
        const batch = ahead.filter((w) => !s.asked.has(w));
        for (const w of batch) s.asked.add(w);
        keep(await lookUpDoodles(batch));
        for (const w of batch) s.checked.add(w);
      }

      // Only words the cache has answered for: anything still in flight may
      // turn out to be drawn already.
      const undrawn = (w: string) => s.checked.has(w) && !s.have.has(doodleKey(w)) && !s.offered.has(w);
      if (!isPro || s.drawing || !s.live || !soon.some(undrawn)) return;
      const candidates = ahead.filter(undrawn);
      // The server draws the first sheet's worth; only those count as offered,
      // so the rest are still candidates for the next sheet.
      for (const w of candidates.slice(0, DOODLE_SHEET_SIZE)) s.offered.add(w);
      s.drawing = true;
      try {
        keep(await fetchDoodles(candidates.map((word) => ({ word })), { generate: true }));
      } catch (err) {
        console.warn(`[doodle] slides: ${(err as Error).message}`);
      } finally {
        s.drawing = false;
      }
    })();
  }, [words, index, isPro]);

  return doodles;
}

/**
 * A word's slide. It opens on the word alone — the class can guess, or say it
 * back — and the next press reveals the meaning, unless the presenter turned
 * that off.
 */
function WordSlide({ word, revealed, doodle, inkFilter, theme, showExampleTranslations }: {
  word: string;
  revealed: boolean;
  doodle?: string;
  /** Set by a slide theme; undefined keeps the app's own `doodle-ink`. */
  inkFilter?: string;
  theme: SlideTheme;
  /** Off when the class should work the examples out for themselves. */
  showExampleTranslations: boolean;
}) {
  const intl = useIntl();
  const [data, setData] = useState<VocabularyWord | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    // No reset here: the deck keys this by word, so a new word is a new mount.
    let live = true;
    generateWordData(word)
      .then((d) => { if (live) setData(d); })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [word]);

  const headword = data?.headword || word;
  const ipa = data?.phonetics?.['en-US'] || data?.phonetics?.['en-GB'];
  const definition = data?.shortDefinition || data?.definition;

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center text-center gap-6">
      <div className="flex flex-col items-center gap-3">
        {/* With the word, before the meaning: the picture is the clue the
            class guesses from. */}
        {doodle && (
          <img
            src={doodle}
            alt={intl.formatMessage({ id: 'word.doodleAlt' }, { word })}
            className={`w-40 h-40 sm:w-56 sm:h-56 lg:w-64 lg:h-64 object-contain animate-fade-in ${inkFilter === undefined ? 'doodle-ink' : ''}`}
            style={inkFilter === undefined ? undefined : { filter: inkFilter }}
          />
        )}
        {data?.partOfSpeech && (
          <span className="px-3 py-1 rounded-full bg-accent-purple/15 text-accent-purple text-sm sm:text-base font-bold italic">
            {data.partOfSpeech}
          </span>
        )}
        <button
          onClick={() => void speakText(headword, { phonetics: data?.phonetics })}
          className={`group flex items-center gap-4 font-display text-text-primary text-5xl sm:text-7xl lg:text-8xl break-words leading-tight hover:text-accent-cyan transition-colors ${
            theme.wordFont ? 'font-normal' : 'font-extrabold'
          }`}
          // A handwriting face has one weight; asking for bold only smears it.
          style={theme.wordFont ? { fontFamily: theme.wordFont } : undefined}
        >
          <span className="relative isolate">
            {headword}
            {theme.accent && <WordAccent kind={theme.accent} color={theme.accentColor} />}
          </span>
          <Icon icon="lucide:volume-2" className="text-3xl sm:text-4xl text-text-muted group-hover:text-accent-cyan shrink-0" />
        </button>
        {ipa && <p className="font-code text-xl sm:text-2xl text-text-muted">{ipa}</p>}
      </div>

      {failed ? (
        <p className="text-text-muted"><FormattedMessage id="word.couldNotLoad" values={{ word }} /></p>
      ) : !data ? (
        <div className="w-6 h-6 rounded-full border-2 border-accent-cyan/30 border-t-accent-cyan animate-spin" />
      ) : revealed ? (
        <div className="w-full flex flex-col items-center gap-5 animate-fade-in">
          {definition && (
            <p className="text-2xl sm:text-3xl lg:text-4xl font-medium text-text-primary leading-snug max-w-3xl">
              {definition}
            </p>
          )}
          {data.translation && (
            <p className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-accent-cyan/10 border border-accent-cyan/25 text-xl sm:text-2xl font-bold text-accent-cyan">
              <Icon icon="lucide:languages" className="shrink-0" />
              <span className="sr-only">{getMotherLanguage()}: </span>
              {data.translation}
            </p>
          )}
          {data.examples.length > 0 && (
            <ul className="flex flex-col gap-2 max-w-3xl">
              {data.examples.slice(0, 2).map((ex, i) => (
                <li key={ex} className="flex flex-col items-center gap-0.5">
                  <button
                    onClick={() => void speakText(ex)}
                    className="text-lg sm:text-xl text-text-secondary italic hover:text-accent-cyan transition-colors"
                  >
                    “{ex}”
                  </button>
                  {showExampleTranslations && data.exampleTranslations?.[i] && (
                    <span className="text-base sm:text-lg text-text-muted">{data.exampleTranslations[i]}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {data.synonyms && data.synonyms.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {data.synonyms.slice(0, 5).map((s) => (
                <span key={s} className="px-3 py-1 rounded-full bg-bg-tertiary border border-border text-sm sm:text-base text-text-muted">
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-text-muted"><FormattedMessage id="collections.slidesTapToReveal" /></p>
      )}
    </div>
  );
}

/** One switch in the Options menu. */
function OptionToggle({ icon, on, onToggle, labelId, hintId }: {
  icon: string;
  on: boolean;
  onToggle: () => void;
  labelId: string;
  hintId: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-left hover:bg-bg-tertiary transition-colors"
    >
      <Icon icon={icon} className={`text-base shrink-0 ${on ? 'text-accent-cyan' : 'text-text-muted'}`} />
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-bold text-text-primary"><FormattedMessage id={labelId} /></span>
        <span className="block text-[11px] leading-snug text-text-muted"><FormattedMessage id={hintId} /></span>
      </span>
      <span className={`relative w-8 h-5 shrink-0 rounded-full transition-colors ${on ? 'bg-accent-cyan' : 'bg-bg-tertiary ring-1 ring-border'}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${on ? 'left-3.5' : 'left-0.5'}`} />
      </span>
    </button>
  );
}

/** Matches listed at once — enough to find a word, few enough to scan. */
const SEARCH_LIMIT = 8;

/**
 * Find a word in the deck and jump to it — for "can we go back to the one
 * about…?" mid-lesson. It moves the deck, never filters it: the slides stay in
 * the order the class has been seeing them.
 */
function SlideSearch({ words, current, onPick, onClose }: {
  words: string[];
  /** The word on screen, marked in the list. */
  current: number;
  /** Called with the word's index in `words`. */
  onPick: (index: number) => void;
  onClose: () => void;
}) {
  const intl = useIntl();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const q = query.trim().toLowerCase();
  // Words starting with what's typed come first, then any containing it.
  const matches = useMemo(() => {
    if (!q) return [];
    const starts: number[] = [];
    const contains: number[] = [];
    words.forEach((w, i) => {
      const lw = w.toLowerCase();
      if (lw.startsWith(q)) starts.push(i);
      else if (lw.includes(q)) contains.push(i);
    });
    return [...starts, ...contains].slice(0, SEARCH_LIMIT);
  }, [words, q]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, matches.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && matches[active] !== undefined) { e.preventDefault(); onPick(matches[active]); }
  };

  return (
    <div className="absolute right-0 top-full mt-2 z-10 w-72 rounded-xl border border-border bg-bg-card shadow-xl p-2">
      <label className="flex items-center gap-2 px-2.5 rounded-lg bg-bg-tertiary focus-within:ring-2 focus-within:ring-accent-cyan/30">
        <Icon icon="lucide:search" className="text-text-muted shrink-0" />
        <input
          autoFocus
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActive(0); }}
          onKeyDown={onKeyDown}
          placeholder={intl.formatMessage({ id: 'collections.slidesSearchPlaceholder' })}
          aria-label={intl.formatMessage({ id: 'collections.slidesSearch' })}
          className="flex-1 min-w-0 py-2 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
        />
      </label>
      {q && (
        matches.length === 0 ? (
          <p className="px-2.5 pt-2.5 pb-1 text-xs text-text-muted"><FormattedMessage id="collections.noWordsMatch" /></p>
        ) : (
          <ul className="mt-1.5 flex flex-col gap-0.5" role="listbox">
            {matches.map((i, n) => (
              <li key={i} role="option" aria-selected={n === active}>
                <button
                  onClick={() => onPick(i)}
                  onMouseEnter={() => setActive(n)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-sm font-bold transition-colors ${
                    n === active ? 'bg-accent-cyan/10 text-accent-cyan' : 'text-text-secondary'
                  }`}
                >
                  <span className="flex-1 min-w-0 truncate">{words[i]}</span>
                  {i === current && <Icon icon="lucide:map-pin" className="text-xs shrink-0" />}
                  <span className="text-[11px] tabular-nums text-text-muted shrink-0">{i + 1} / {words.length}</span>
                </button>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}

/**
 * The collection as a slide deck, for a teacher putting the list up on a
 * projector before the class studies it: a title slide, one slide per word,
 * and an end slide. Arrow keys, Space, and presentation clickers (which send
 * PageUp/PageDown) all drive it.
 *
 * Each word is two steps — the word, then its meaning — so "next" walks
 * through a reveal before moving on, the way a teacher would with cards.
 */
export function CollectionSlides({
  name, description, words, photo, suggestedTheme, linkTheme, onThemeChange, initialSlide = 0, onSlideChange, shareUrl, onClose,
}: {
  name: string;
  description?: string | null;
  words: string[];
  /** The collection's cover photo, which the Photo theme sits on. */
  photo?: string;
  /** The theme made for this collection's topic — used until the presenter
   *  picks one of their own, and marked in the menu. */
  suggestedTheme?: SlideThemeId;
  /** A theme the link asked for (`?theme=`) — it wins over the presenter's
   *  saved pick, so a shared link looks the way its sender set it up. */
  linkTheme?: SlideThemeId;
  /** A theme picked from the menu, for the caller to put in the URL. */
  onThemeChange?: (id: SlideThemeId) => void;
  /** Where to open — the page keeps this in the URL, so a reload stays put. */
  initialSlide?: number;
  onSlideChange?: (slide: number) => void;
  /** The deck's own link, offered as "Copy link". */
  shareUrl?: string;
  onClose: () => void;
}) {
  const intl = useIntl();
  // Slide 0 is the title, 1..n the words, n+1 the end.
  const [slide, setSlide] = useState(() => Math.min(Math.max(initialSlide, 0), words.length + 1));
  const [revealed, setRevealed] = useState(false);
  const [revealFirst, setRevealFirst] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  // Remembered per device, like the theme: a teacher who hides them for one
  // class usually teaches the next the same way.
  const [showExampleTranslations, setShowExampleTranslations] = useState(loadShowExampleTranslations);
  const toggleExampleTranslations = useCallback(() => setShowExampleTranslations((on) => {
    saveShowExampleTranslations(!on);
    return !on;
  }), []);
  const [themeId, setThemeId] = useState<SlideThemeId>(() => linkTheme ?? loadSlideTheme() ?? suggestedTheme ?? 'app');
  // One menu open at a time.
  const [menu, setMenu] = useState<'search' | 'theme' | 'options' | null>(null);
  const toggleMenu = (m: 'search' | 'theme' | 'options') => setMenu((cur) => (cur === m ? null : m));
  const theme = slideTheme(themeId, !!photo);
  const themes = availableSlideThemes(!!photo);
  // Only a pick made here is remembered on the device; one that arrived in a
  // link is that link's, and shouldn't become the presenter's default.
  const pickTheme = (id: SlideThemeId) => { setThemeId(id); saveSlideTheme(id); onThemeChange?.(id); };
  const last = words.length + 1;
  const word = slide >= 1 && slide <= words.length ? words[slide - 1] : null;
  const showMeaning = revealed || revealFirst;
  const { isPro } = useIsPro();
  // From the title slide on, so the first word's doodle is in hand by the time
  // it's shown.
  const doodles = useDeckDoodles(words, Math.max(slide - 1, 0), isPro);

  const next = useCallback(() => {
    if (word && !showMeaning) { setRevealed(true); return; }
    setSlide((s) => Math.min(s + 1, last));
    setRevealed(false);
  }, [word, showMeaning, last]);

  const prev = useCallback(() => {
    if (word && revealed && !revealFirst) { setRevealed(false); return; }
    setSlide((s) => Math.max(s - 1, 0));
    // Stepping back lands on a slide already seen, so show it whole.
    setRevealed(true);
  }, [word, revealed, revealFirst]);

  const goTo = (s: number) => { setSlide(s); setRevealed(false); };

  // Reported from an effect, not the setters: `next`/`prev` change the slide
  // through an updater, and the caller's URL write doesn't belong in there.
  const reportSlide = useRef(onSlideChange);
  useEffect(() => { reportSlide.current = onSlideChange; });
  useEffect(() => { reportSlide.current?.(slide); }, [slide]);

  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      // The link carries the look on screen, however it was arrived at — a
      // pick, a saved default or the topic's suggestion.
      const url = new URL(shareUrl);
      url.searchParams.set('theme', themeId);
      await navigator.clipboard.writeText(url.toString());
      toast.success(intl.formatMessage({ id: 'collections.slidesLinkCopied' }));
    } catch {
      toast.error(intl.formatMessage({ id: 'collections.couldNotShare' }));
    }
  };

  useEffect(() => {
    for (let i = 0; i < LOOKAHEAD; i++) {
      const w = words[slide + i];
      if (w) warmWordData(w);
    }
  }, [slide, words]);

  useEffect(() => {
    if (word && autoSpeak) void speakText(word);
  }, [word, autoSpeak]);
  useEffect(() => () => stopSpeaking(), []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  };
  // Leaving the deck shouldn't leave the browser stuck in fullscreen.
  useEffect(() => () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  }, []);

  // Captured at the window and stopped there: the deck covers the app, so the
  // app's own shortcuts — the Navbar's "/" and ⌘K search — would open behind
  // it, invisible, and take the keyboard away from the slides.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault(); e.stopPropagation(); setMenu('search');
        return;
      }
      if (mod || e.altKey) return;
      // Typing in the search box is typing, not driving the deck.
      if ((e.target as HTMLElement | null)?.closest?.('input, textarea')) return;
      let handled = true;
      switch (e.key) {
        case 'ArrowRight': case 'ArrowDown': case 'PageDown': case ' ': case 'Enter':
          e.preventDefault(); next(); break;
        case 'ArrowLeft': case 'ArrowUp': case 'PageUp': case 'Backspace':
          e.preventDefault(); prev(); break;
        case 'Home': e.preventDefault(); goTo(0); break;
        case 'End': e.preventDefault(); goTo(last); break;
        case 's': case 'S': if (word) void speakText(word); break;
        case 'f': case 'F': toggleFullscreen(); break;
        case 't': case 'T': toggleExampleTranslations(); break;
        case '/': e.preventDefault(); setMenu('search'); break;
        case 'Escape':
          // An open menu closes first; fullscreen's own Escape exits that.
          if (menu) setMenu(null);
          else if (!document.fullscreenElement) onClose();
          break;
        default: handled = false;
      }
      if (handled) e.stopPropagation();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [next, prev, last, word, onClose, toggleExampleTranslations, menu]);

  const pct = (slide / last) * 100;
  const chip = (on: boolean) =>
    `flex items-center gap-1.5 px-2.5 h-8 rounded-lg text-xs font-bold border transition-colors ${
      on ? 'border-accent-cyan/40 bg-accent-cyan/10 text-accent-cyan' : 'border-border text-text-muted hover:text-text-primary'
    }`;

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-bg-primary text-text-primary select-none"
      style={slideThemeStyle(theme)}
      role="dialog"
      aria-modal
      aria-label={name}
    >
      <SlideDecor kind={theme.decor} photo={photo} />

      {/* Positioned, so they paint above the decor. */}
      <div className="relative h-1 bg-bg-tertiary">
        <div className="h-full bg-accent-cyan transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>

      <div className="relative z-20 flex items-center gap-2 px-4 py-3">
        <span className="flex-1 min-w-0 truncate text-sm font-bold text-text-muted">{name}</span>
        <div className="relative">
          <button onClick={() => toggleMenu('search')} aria-expanded={menu === 'search'} className={chip(menu === 'search')}
            title={intl.formatMessage({ id: 'collections.slidesSearchTitle' })}>
            <Icon icon="lucide:search" />
          </button>
          {menu === 'search' && (
            <SlideSearch
              words={words}
              current={slide - 1}
              onPick={(i) => { goTo(i + 1); setMenu(null); }}
              onClose={() => setMenu(null)}
            />
          )}
        </div>
        <div className="relative">
          <button onClick={() => toggleMenu('theme')} aria-expanded={menu === 'theme'} className={chip(menu === 'theme')}
            title={intl.formatMessage({ id: 'collections.slidesTheme' })}>
            <Icon icon="lucide:palette" />
            <span className="hidden sm:inline"><FormattedMessage id="collections.slidesTheme" /></span>
          </button>
          {menu === 'theme' && (
            <div className="absolute right-0 top-full mt-2 z-10 w-56 max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-bg-card shadow-xl p-1.5 flex flex-col gap-0.5">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { pickTheme(t.id); setMenu(null); }}
                  aria-pressed={t.id === themeId}
                  className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm font-bold text-left transition-colors ${
                    t.id === themeId ? 'bg-accent-cyan/10 text-accent-cyan' : 'text-text-secondary hover:bg-bg-tertiary'
                  }`}
                >
                  <Icon icon={t.icon} className="text-base shrink-0" />
                  <span className="flex-1"><FormattedMessage id={t.labelId} /></span>
                  {t.id === suggestedTheme && t.id !== themeId && (
                    <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-px rounded bg-accent-cyan/15 text-accent-cyan">
                      <FormattedMessage id="collections.slidesThemeSuggested" />
                    </span>
                  )}
                  {t.id === themeId && <Icon icon="lucide:check" />}
                </button>
              ))}
            </div>
          )}
        </div>
        {/* The settings a presenter sets once and leaves — out of the way, so
            the bar stays quiet on the projector. */}
        <div className="relative">
          <button onClick={() => toggleMenu('options')} aria-expanded={menu === 'options'} className={chip(menu === 'options')}
            title={intl.formatMessage({ id: 'collections.slidesOptions' })}>
            <Icon icon="lucide:settings-2" />
          </button>
          {menu === 'options' && (
            <div className="absolute right-0 top-full mt-2 z-10 w-64 rounded-xl border border-border bg-bg-card shadow-xl p-1.5 flex flex-col gap-0.5">
              <OptionToggle icon="lucide:eye" on={revealFirst} onToggle={() => setRevealFirst((v) => !v)}
                labelId="collections.slidesShowMeaning" hintId="collections.slidesShowMeaningTitle" />
              <OptionToggle icon="lucide:volume-2" on={autoSpeak} onToggle={() => setAutoSpeak((v) => !v)}
                labelId="collections.slidesAutoSpeak" hintId="collections.slidesAutoSpeakTitle" />
              <OptionToggle icon="lucide:languages" on={showExampleTranslations} onToggle={toggleExampleTranslations}
                labelId="collections.slidesExampleTranslations" hintId="collections.slidesExampleTranslationsTitle" />
              {shareUrl && (
                <>
                  <div className="my-1 h-px bg-border" />
                  <button
                    onClick={() => { void copyLink(); setMenu(null); }}
                    className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm font-bold text-left text-text-secondary hover:bg-bg-tertiary transition-colors"
                  >
                    <Icon icon="lucide:link" className="text-base shrink-0" />
                    <span className="flex-1"><FormattedMessage id="collections.slidesCopyLink" /></span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        <button onClick={toggleFullscreen} className={chip(false)} title={intl.formatMessage({ id: 'collections.slidesFullscreen' })}>
          <Icon icon="lucide:maximize" />
        </button>
        <button onClick={onClose} className={chip(false)} title={intl.formatMessage({ id: 'collections.close' })}>
          <Icon icon="lucide:x" />
        </button>
      </div>

      {/* Clicking the stage advances, like a clicker — buttons inside it
          (speak the word, an example) stop that themselves. */}
      <div
        className="relative flex-1 min-h-0 overflow-y-auto flex items-center px-6 py-8 cursor-pointer"
        onClick={(e) => {
          // A click away from an open menu only closes it.
          if (menu) { setMenu(null); return; }
          if (!(e.target as HTMLElement).closest('button')) next();
        }}
      >
        {slide === 0 ? (
          <div className="w-full max-w-3xl mx-auto text-center flex flex-col items-center gap-4">
            <Icon icon="lucide:presentation" className="text-5xl text-accent-cyan" />
            <h1 className="font-display font-extrabold text-text-primary text-4xl sm:text-6xl break-words">{name}</h1>
            {description && <p className="text-xl sm:text-2xl text-text-secondary">{description}</p>}
            <p className="text-lg text-text-muted"><FormattedMessage id="collections.wordCount" values={{ count: words.length }} /></p>
            <p className="text-sm text-text-muted mt-6"><FormattedMessage id="collections.slidesKeysHint" /></p>
          </div>
        ) : word ? (
          <WordSlide key={word} word={word} revealed={showMeaning} doodle={doodles[doodleKey(word)]} inkFilter={doodleFilter(theme)} theme={theme} showExampleTranslations={showExampleTranslations} />
        ) : (
          <div className="w-full max-w-3xl mx-auto text-center flex flex-col items-center gap-5">
            <Icon icon="lucide:party-popper" className="text-5xl text-accent-yellow" />
            <h2 className="font-display font-extrabold text-text-primary text-3xl sm:text-5xl">
              <FormattedMessage id="collections.slidesDone" values={{ count: words.length }} />
            </h2>
            <div className="flex flex-wrap justify-center gap-3">
              <button onClick={() => goTo(1)} className="btn-3d px-5 py-2.5 text-sm font-bold bg-accent-cyan text-bg-primary">
                <FormattedMessage id="collections.slidesRestart" />
              </button>
              <button onClick={onClose} className="btn-3d px-5 py-2.5 text-sm font-bold bg-bg-tertiary text-text-primary">
                <FormattedMessage id="collections.close" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="relative flex items-center justify-between gap-3 px-4 py-3">
        <button onClick={prev} disabled={slide === 0}
          className="w-11 h-11 rounded-xl border border-border bg-bg-tertiary text-text-secondary flex items-center justify-center hover:text-text-primary disabled:opacity-30"
          title={intl.formatMessage({ id: 'collections.slidesPrev' })}>
          <Icon icon="lucide:chevron-left" className="text-xl" />
        </button>
        {/* Backed, so a theme's grass or tablecloth never runs through it. */}
        <span className={`text-sm font-bold tabular-nums text-text-muted ${word ? 'px-2.5 py-0.5 rounded-full bg-bg-primary/80 backdrop-blur-sm' : ''}`}>
          {word ? `${slide} / ${words.length}` : ''}
        </span>
        <button onClick={next} disabled={slide === last}
          className="w-11 h-11 rounded-xl border border-border bg-bg-tertiary text-text-secondary flex items-center justify-center hover:text-text-primary disabled:opacity-30"
          title={intl.formatMessage({ id: 'collections.next' })}>
          <Icon icon="lucide:chevron-right" className="text-xl" />
        </button>
      </div>
    </div>
  );
}
