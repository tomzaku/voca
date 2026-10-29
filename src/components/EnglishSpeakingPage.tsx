import { useState, useCallback, useRef, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import TextareaAutosize from 'react-textarea-autosize';
import toast from 'react-hot-toast';
import { FormattedMessage, useIntl } from 'react-intl';
import { ShortConversationTab } from './ShortConversationTab';
import { DailyDialogueTab } from './DailyDialogueTab';
import { IeltsSpeakingTab } from './IeltsSpeakingTab';
import { Selector } from './Selector';
import { speakText, stopSpeaking, preloadTts } from '../lib/tts';
import { useTtsSettings, KOKORO_VOICES, PIPER_VOICES } from '../hooks/useTtsSettings';

type Tab = 'conversation' | 'dialogue' | 'ielts' | 'read';

function hasSelection() {
  const sel = window.getSelection();
  return sel && sel.toString().trim().length >= 2;
}

/** Floating popup on text selection to read it aloud */
function SelectionSpeaker({ containerRef }: { containerRef: React.RefObject<HTMLElement | null> }) {
  const intl = useIntl();
  const [popup, setPopup] = useState<{ x: number; y: number; text: string } | null>(null);
  const [state, setState] = useState<'idle' | 'done' | 'loading' | 'playing'>('idle');
  const mountedRef = useRef(true);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseUp = () => {
      requestAnimationFrame(() => {
        const sel = window.getSelection();
        const text = sel?.toString().trim();
        if (!text || text.length < 2) {
          if (state !== 'loading' && state !== 'playing') setPopup(null);
          return;
        }
        const range = sel!.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        setState('idle');
        setPopup({
          x: rect.left + rect.width / 2 - containerRect.left,
          y: rect.top - containerRect.top - 8,
          text,
        });
      });
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (popupRef.current?.contains(e.target as Node)) return;
      if (state !== 'loading' && state !== 'playing') {
        setPopup(null);
        setState('idle');
      }
    };

    container.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      container.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [containerRef, state]);

  const play = useCallback(async () => {
    if (!popup) return;
    stopSpeaking();
    setState('loading');
    try {
      await speakText(popup.text, {
        onStart: () => { if (mountedRef.current) setState('playing'); },
        onEnd: () => { if (mountedRef.current) setState(hasSelection() ? 'done' : 'idle'); },
      });
    } catch {
      if (mountedRef.current) setState(hasSelection() ? 'done' : 'idle');
    }
  }, [popup]);

  const stop = useCallback(() => {
    stopSpeaking();
    setState(hasSelection() ? 'done' : 'idle');
  }, []);

  if (!popup) return null;

  const isActive = state === 'loading' || state === 'playing';
  const isDone = state === 'done';

  return (
    <div
      ref={popupRef}
      className="absolute z-50 flex items-center rounded-lg shadow-lg border bg-bg-card border-border -translate-x-1/2 -translate-y-full"
      style={{ left: popup.x, top: popup.y }}
    >
      <button
        onClick={isActive ? stop : play}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 transition-all cursor-pointer ${
          isActive ? 'text-accent-cyan' : isDone ? 'text-accent-green hover:text-accent-cyan' : 'text-text-secondary hover:text-accent-cyan'
        } ${isActive || isDone ? 'rounded-l-lg' : 'rounded-lg'}`}
      >
        {state === 'loading' ? (
          <svg width="12" height="12" viewBox="0 0 24 24" className="animate-spin" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 2a10 10 0 0 1 10 10" />
          </svg>
        ) : state === 'playing' ? (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <rect x="0" y="0" width="10" height="10" rx="1" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
        )}
        <span className="text-xs font-medium">
          {intl.formatMessage({ id: state === 'playing' ? 'speaking.stop' : state === 'loading' ? 'speaking.loading' : 'speaking.listen' })}
        </span>
      </button>
      {(isActive || isDone) && (
        <button
          onClick={play}
          className="flex items-center gap-1 px-2 py-1.5 rounded-r-lg border-l border-border text-text-muted hover:text-accent-green transition-all cursor-pointer"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          <span className="text-[11px] font-medium"><FormattedMessage id="speaking.repeat" /></span>
        </button>
      )}
    </div>
  );
}

/* ─── Speaker-specific read-aloud button (IELTS + dialogues) ─── */
export function ReadAloudVoice({ text, voice, tone, voiceLabel }: {
  text: string;
  voice: string;
  tone: 'orange' | 'cyan';
  voiceLabel: string;
}) {
  const intl = useIntl();
  const [state, setState] = useState<'idle' | 'loading' | 'playing'>('idle');
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; stopSpeaking(); };
  }, []);

  useEffect(() => { stopSpeaking(); setState('idle'); }, [text]);

  const speak = useCallback(async () => {
    if (state === 'loading' || state === 'playing') {
      stopSpeaking();
      setState('idle');
      return;
    }
    setState('loading');
    try {
      await speakText(text, {
        voice,
        onStart: () => { if (mountedRef.current) setState('playing'); },
        onEnd: () => { if (mountedRef.current) setState('idle'); },
      });
    } catch { /* ignore */ } finally {
      if (mountedRef.current) setState('idle');
    }
  }, [text, state, voice]);

  const colorClass = tone === 'orange'
    ? { active: 'bg-accent-orange/10 text-accent-orange border-accent-orange/20', loading: 'bg-accent-orange/5 text-accent-orange/60 border-accent-orange/10', idle: 'bg-bg-tertiary text-text-muted border-border hover:text-accent-orange hover:border-accent-orange/30' }
    : { active: 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20', loading: 'bg-accent-cyan/5 text-accent-cyan/60 border-accent-cyan/10', idle: 'bg-bg-tertiary text-text-muted border-border hover:text-accent-cyan hover:border-accent-cyan/30' };

  return (
    <button
      onClick={speak}
      className={`w-7 h-7 rounded-md flex items-center justify-center border transition-all cursor-pointer ${
        state === 'playing' ? colorClass.active : state === 'loading' ? colorClass.loading : colorClass.idle
      }`}
      title={intl.formatMessage({ id: state === 'playing' ? 'speaking.stopVoice' : 'speaking.listenVoice' }, { voice: voiceLabel })}
    >
      {state === 'loading' ? (
        <svg width="12" height="12" viewBox="0 0 24 24" className="animate-spin" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 2a10 10 0 0 1 10 10" />
        </svg>
      ) : state === 'playing' ? (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
          <rect x="0" y="0" width="10" height="10" rx="1" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
      )}
    </button>
  );
}

/* ─── Play a multi-voice conversation line by line ───────────── */
export function PlaySequence({ lines, tone = 'cyan' }: {
  lines: { text: string; voice: string }[];
  tone?: 'green' | 'cyan';
}) {
  const intl = useIntl();
  const [state, setState] = useState<'idle' | 'loading' | 'playing'>('idle');
  const [currentIndex, setCurrentIndex] = useState(-1);
  const mountedRef = useRef(true);
  const cancelledRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; stopSpeaking(); };
  }, []);

  useEffect(() => {
    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(() => preloadTts(), { timeout: 3000 });
      return () => cancelIdleCallback(id);
    } else {
      const id = setTimeout(() => preloadTts(), 3000);
      return () => clearTimeout(id);
    }
  }, []);

  const playAll = useCallback(async () => {
    if (state === 'loading' || state === 'playing') {
      stopSpeaking();
      cancelledRef.current = true;
      setState('idle');
      setCurrentIndex(-1);
      return;
    }

    cancelledRef.current = false;
    setState('loading');

    for (let i = 0; i < lines.length; i++) {
      if (cancelledRef.current || !mountedRef.current) break;
      const line = lines[i];
      if (mountedRef.current) setCurrentIndex(i);
      await new Promise<void>((resolve) => {
        speakText(line.text, {
          voice: line.voice,
          onStart: () => { if (mountedRef.current && i === 0) setState('playing'); },
          onEnd: () => resolve(),
        }).catch(() => resolve());
      });
    }

    if (mountedRef.current) { setState('idle'); setCurrentIndex(-1); }
  }, [state, lines]);

  return (
    <div className="flex items-center gap-2">
      {state === 'playing' && currentIndex >= 0 && (
        <span className="text-[10px] text-text-muted">{currentIndex + 1}/{lines.length}</span>
      )}
      <button
        onClick={playAll}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border transition-all cursor-pointer text-xs font-medium ${
          tone === 'green'
            ? state === 'playing'
              ? 'bg-accent-green/10 text-accent-green border-accent-green/20'
              : state === 'loading'
                ? 'bg-accent-green/5 text-accent-green/60 border-accent-green/10'
                : 'bg-bg-tertiary text-text-muted border-border hover:text-accent-green hover:border-accent-green/30'
            : state === 'playing'
              ? 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20'
              : state === 'loading'
                ? 'bg-accent-cyan/5 text-accent-cyan/60 border-accent-cyan/10'
                : 'bg-bg-tertiary text-text-muted border-border hover:text-accent-cyan hover:border-accent-cyan/30'
        }`}
        title={intl.formatMessage({ id: state === 'playing' ? 'speaking.stopConversation' : 'speaking.playConversationTitle' })}
      >
        {state === 'loading' ? (
          <svg width="12" height="12" viewBox="0 0 24 24" className="animate-spin" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 2a10 10 0 0 1 10 10" />
          </svg>
        ) : state === 'playing' ? (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <rect x="0" y="0" width="10" height="10" rx="1" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        )}
        {intl.formatMessage({ id: state === 'playing' ? 'speaking.stop' : state === 'loading' ? 'speaking.loading' : 'speaking.playAll' })}
      </button>
    </div>
  );
}

/* ─── Tab: Read Aloud — paste your own text, pick a voice, practice ── */
const MAX_READ_TEXT = 4000;

function ReadAloudTab() {
  const intl = useIntl();
  const { engine } = useTtsSettings();
  const voices = engine === 'piper' ? PIPER_VOICES : KOKORO_VOICES;
  const [text, setText] = useState('');
  const [voice, setVoice] = useState(voices[0].id);
  const [state, setState] = useState<'idle' | 'loading' | 'playing'>('idle');
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; stopSpeaking(); };
  }, []);

  // The voice list depends on the engine chosen in Settings — if it changes
  // out from under this tab, fall back to that engine's first voice rather
  // than keep a picked id that no longer belongs to either list.
  useEffect(() => {
    if (!voices.some((v) => v.id === voice)) setVoice(voices[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine]);

  const play = useCallback(async () => {
    if (state === 'loading' || state === 'playing') {
      stopSpeaking();
      setState('idle');
      return;
    }
    if (!text.trim()) return;
    setState('loading');
    try {
      await speakText(text, {
        voice,
        onStart: () => { if (mountedRef.current) setState('playing'); },
        onEnd: () => { if (mountedRef.current) setState('idle'); },
      });
    } catch { /* ignore */ } finally {
      if (mountedRef.current) setState('idle');
    }
  }, [text, voice, state]);

  const copy = async () => {
    if (!text.trim()) return;
    await navigator.clipboard.writeText(text);
    toast.success(intl.formatMessage({ id: 'speaking.copied' }));
  };

  return (
    <div>
      <p className="text-xs text-text-muted mb-3">
        <FormattedMessage id="speaking.readAloudHint" />
      </p>

      <div className="rounded-xl border-2 border-border bg-bg-card p-4 mb-4">
        <TextareaAutosize
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_READ_TEXT))}
          placeholder={intl.formatMessage({ id: 'speaking.readAloudPlaceholder' })}
          minRows={4}
          rows={4}
          maxRows={16}
          className="w-full bg-transparent border-2 border-border rounded-xl px-4 py-3.5 text-base text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-orange/60 resize-none leading-relaxed"
        />
        <div className="flex items-center justify-between mt-2.5">
          <span className="text-xs text-text-muted">{text.length}/{MAX_READ_TEXT}</span>
          <button
            onClick={copy}
            disabled={!text.trim()}
            title={intl.formatMessage({ id: 'speaking.copyText' })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-bg-tertiary text-text-secondary hover:text-text-primary disabled:opacity-50 transition-all cursor-pointer"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            <FormattedMessage id="speaking.copy" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={play}
          disabled={!text.trim()}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
            state === 'playing'
              ? 'bg-accent-orange/10 text-accent-orange border-accent-orange/30'
              : 'bg-accent-orange text-bg-primary border-accent-orange hover:bg-accent-orange/90'
          }`}
        >
          {state === 'loading' ? (
            <svg width="14" height="14" viewBox="0 0 24 24" className="animate-spin" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
          ) : state === 'playing' ? (
            <svg width="12" height="12" viewBox="0 0 10 10" fill="currentColor">
              <rect x="0" y="0" width="10" height="10" rx="1" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          )}
          {intl.formatMessage({ id: state === 'playing' ? 'speaking.stop' : state === 'loading' ? 'speaking.loading' : 'speaking.readAloud' })}
        </button>

        {engine === 'native' ? (
          <span className="text-xs text-text-muted">
            <FormattedMessage id="speaking.deviceVoiceHint" />
          </span>
        ) : (
          <Selector
            value={voice}
            options={voices.map((v) => ({ value: v.id, label: `${v.name} · ${v.accent} ${v.gender}` }))}
            onChange={setVoice}
            ariaLabel={intl.formatMessage({ id: 'speaking.voice' })}
          />
        )}
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */
// Sub-page metadata — just enough to resolve `?tab=` and label the
// breadcrumb. The Rail drawer owns each one's icon/color for navigation.
const tabs: { key: Tab; labelId: string }[] = [
  { key: 'conversation', labelId: 'speaking.tabShortConversation' },
  { key: 'dialogue', labelId: 'speaking.tabDailyDialogue' },
  { key: 'ielts', labelId: 'speaking.tabIelts' },
  { key: 'read', labelId: 'speaking.readAloud' },
];

// Which sub-page this is — picked from the Vocabulary-style group in the Rail
// drawer now, not an in-page tab bar. `?tab=` is canonicalized on load so the
// Rail's own active-link check (an exact `to` + `tab` match) always agrees
// with what's actually showing.
function useSpeakingTab(): Tab {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get('tab');
  const resolved = (tabs.find((t) => t.key === raw)?.key ?? 'conversation') as Tab;
  useEffect(() => {
    if (raw !== resolved) setSearchParams({ tab: resolved }, { replace: true });
  }, [raw, resolved, setSearchParams]);
  return resolved;
}

export function EnglishSpeakingPage() {
  const activeTab = useSpeakingTab();
  const activeMeta = tabs.find((t) => t.key === activeTab)!;
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div className="max-w-page mx-auto px-4 py-8 relative" ref={contentRef}>
      <SelectionSpeaker containerRef={contentRef} />

      <h1 className="flex items-center gap-1.5 mb-6 text-base">
        <Link to="/speaking" className="font-medium text-text-muted hover:text-text-secondary transition-colors">
          <FormattedMessage id="speaking.speak" />
        </Link>
        <span className="text-text-muted/50">/</span>
        <span className="font-bold text-text-primary"><FormattedMessage id={activeMeta.labelId} /></span>
      </h1>

      {activeTab === 'conversation' && <ShortConversationTab />}
      {activeTab === 'dialogue' && <DailyDialogueTab />}
      {activeTab === 'ielts' && <IeltsSpeakingTab />}
      {activeTab === 'read' && <ReadAloudTab />}
    </div>
  );
}
