import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import TextareaAutosize from 'react-textarea-autosize';
import toast from 'react-hot-toast';
import { speakingQuestions, speakingTopics, type SpeakingDifficulty } from '../data/englishSpeaking';
import { ieltsConversations, ieltsTopics, type IeltsConversation } from '../data/englishIelts';
import { dialogues, dialogueTopics } from '../data/englishDialogues';
import { ReadAloud } from './ReadAloud';
import { PracticeButton } from './PracticeButton';
import { Selector } from './Selector';
import { speakText, stopSpeaking, preloadTts, CONV_VOICE_A, CONV_VOICE_B } from '../lib/tts';
import { useTtsSettings, KOKORO_VOICES, PIPER_VOICES } from '../hooks/useTtsSettings';

type Tab = 'conversation' | 'dialogue' | 'ielts' | 'read';

// Voice mapping for IELTS multi-speaker playback
// Examiner: British female (Emma), Candidate: American male (Michael)
const IELTS_VOICES = {
  examiner: 'bf_emma',
  candidate: 'am_michael',
} as const;

// Voice mapping for two-speaker dialogues: A is female (Sarah), B is male (Michael)
const DIALOGUE_VOICES = {
  a: CONV_VOICE_A,
  b: CONV_VOICE_B,
} as const;

function hasSelection() {
  const sel = window.getSelection();
  return sel && sel.toString().trim().length >= 2;
}

/** Floating popup on text selection to read it aloud */
function SelectionSpeaker({ containerRef }: { containerRef: React.RefObject<HTMLElement | null> }) {
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
          {state === 'playing' ? 'Stop' : state === 'loading' ? 'Loading...' : 'Listen'}
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
          <span className="text-[11px] font-medium">Repeat</span>
        </button>
      )}
    </div>
  );
}

/* ─── Tab: Short Conversation ────────────────────────────────── */
const DIFFICULTIES: SpeakingDifficulty[] = ['easy', 'medium', 'hard'];
const DIFFICULTY_LABEL: Record<SpeakingDifficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
const difficultyColor = (level: SpeakingDifficulty) => {
  switch (level) {
    case 'easy': return 'text-accent-green bg-accent-green/10 border-accent-green/20';
    case 'medium': return 'text-accent-orange bg-accent-orange/10 border-accent-orange/20';
    case 'hard': return 'text-accent-red bg-accent-red/10 border-accent-red/20';
  }
};

function ConversationTab() {
  const [selectedTopic, setSelectedTopic] = useState<string | 'all'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<SpeakingDifficulty | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);

  const filtered = useMemo(
    () => speakingQuestions.filter((q) => {
      if (selectedTopic !== 'all' && q.topic !== selectedTopic) return false;
      if (selectedDifficulty !== 'all' && q.difficulty !== selectedDifficulty) return false;
      return true;
    }),
    [selectedTopic, selectedDifficulty],
  );

  const topicCounts = useMemo(() => {
    const map: Record<string, number> = {};
    speakingQuestions.forEach((q) => { map[q.topic] = (map[q.topic] || 0) + 1; });
    return map;
  }, []);

  const difficultyCounts = useMemo(() => {
    const map: Record<SpeakingDifficulty, number> = { easy: 0, medium: 0, hard: 0 };
    speakingQuestions.forEach((q) => { map[q.difficulty]++; });
    return map;
  }, []);

  const pickRandomTopic = useCallback(() => {
    const others = speakingTopics.filter((t) => t !== selectedTopic);
    const pool = others.length > 0 ? others : [...speakingTopics];
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setSpinning(true);
    setSelectedTopic(pick);
    setExpandedId(null);
    setTimeout(() => setSpinning(false), 500);
  }, [selectedTopic]);

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-text-muted">
          {selectedTopic === 'all' ? `${speakingQuestions.length} questions` : `${filtered.length} questions · ${selectedTopic}`}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={pickRandomTopic}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-accent-orange/20 bg-accent-orange/5 text-accent-orange hover:bg-accent-orange/10 transition-all cursor-pointer"
          >
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              className={spinning ? 'animate-spin' : ''}
            >
              <polyline points="16 3 21 3 21 8" />
              <line x1="4" y1="20" x2="21" y2="3" />
              <polyline points="21 16 21 21 16 21" />
              <line x1="15" y1="15" x2="21" y2="21" />
            </svg>
            Random Topic
          </button>
          <PracticeButton
            topic={selectedTopic === 'all' ? 'Everyday Speaking' : selectedTopic}
            label={selectedTopic === 'all' ? 'Practice' : 'Practice this topic'}
          />
        </div>
      </div>

      <div className="flex gap-1.5 mb-3">
        <button
          onClick={() => { setSelectedDifficulty('all'); setExpandedId(null); }}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${
            selectedDifficulty === 'all'
              ? 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20'
              : 'bg-bg-tertiary text-text-muted border-transparent hover:text-text-secondary'
          }`}
        >
          All Levels
        </button>
        {DIFFICULTIES.map((level) => (
          <button
            key={level}
            onClick={() => { setSelectedDifficulty(level); setExpandedId(null); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${
              selectedDifficulty === level
                ? difficultyColor(level)
                : 'bg-bg-tertiary text-text-muted border-transparent hover:text-text-secondary'
            }`}
          >
            {DIFFICULTY_LABEL[level]} <span className="ml-1 opacity-60">{difficultyCounts[level]}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-6">
        <button
          onClick={() => { setSelectedTopic('all'); setExpandedId(null); }}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${
            selectedTopic === 'all'
              ? 'bg-accent-green/10 text-accent-green border-accent-green/20'
              : 'bg-bg-tertiary text-text-muted border-transparent hover:text-text-secondary'
          }`}
        >
          All <span className="ml-1 opacity-60">{speakingQuestions.length}</span>
        </button>
        {speakingTopics.map((topic) => (
          <button
            key={topic}
            onClick={() => { setSelectedTopic(topic); setExpandedId(null); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${
              selectedTopic === topic
                ? 'bg-accent-green/10 text-accent-green border-accent-green/20'
                : 'bg-bg-tertiary text-text-muted border-transparent hover:text-text-secondary'
            }`}
          >
            {topic} <span className="ml-1 opacity-60">{topicCounts[topic] || 0}</span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((q) => {
          const isExpanded = expandedId === q.id;
          return (
            <div key={q.id} className="rounded-lg border border-border bg-bg-card overflow-hidden transition-all">
              <button
                onClick={() => setExpandedId(isExpanded ? null : q.id)}
                className="w-full text-left px-5 py-4 flex items-start gap-3 cursor-pointer hover:bg-bg-hover/50 transition-colors"
              >
                <span className="w-7 h-7 rounded-md bg-accent-green/15 text-accent-green flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  Q
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium text-text-primary leading-relaxed">{q.question}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-text-muted">{q.topic}</span>
                    <span className="text-[10px] text-text-muted">·</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${difficultyColor(q.difficulty)}`}>
                      {DIFFICULTY_LABEL[q.difficulty]}
                    </span>
                  </div>
                </div>
                <svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className={`text-text-muted shrink-0 mt-1 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {isExpanded && (
                <div className="border-t border-border animate-fade-in">
                  <div className="px-5 py-3 flex items-center justify-between gap-3 bg-bg-tertiary/50 border-b border-border">
                    <span className="text-xs text-text-muted">Answer it yourself with an AI partner</span>
                    <PracticeButton topic={q.topic} focus={q.question} label="Practice this question" size="sm" />
                  </div>
                  <div className="px-5 py-4 space-y-4">
                    {q.sampleAnswers.map((sa, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-accent-cyan">Sample Answer</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-tertiary text-text-muted">{sa.label}</span>
                          </div>
                          <ReadAloud text={sa.answer} />
                        </div>
                        <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">{sa.answer}</p>
                      </div>
                    ))}
                  </div>

                  {q.usefulPhrases && q.usefulPhrases.length > 0 && (
                    <div className="px-5 py-3 bg-accent-yellow/5 border-t border-accent-yellow/10">
                      <p className="text-xs font-semibold text-accent-yellow mb-2">Useful Phrases</p>
                      <div className="flex flex-wrap gap-1.5">
                        {q.usefulPhrases.map((phrase, i) => (
                          <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-accent-yellow/10 text-text-secondary border border-accent-yellow/15">
                            {phrase}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-text-muted">
          <p className="text-sm">No questions found for this filter.</p>
        </div>
      )}
    </>
  );
}

/* ─── Speaker-specific read-aloud button (IELTS + dialogues) ─── */
export function ReadAloudVoice({ text, voice, tone, voiceLabel }: {
  text: string;
  voice: string;
  tone: 'orange' | 'cyan';
  voiceLabel: string;
}) {
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
      title={`${state === 'playing' ? 'Stop' : 'Listen'} (${voiceLabel})`}
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
        title={state === 'playing' ? 'Stop conversation' : 'Play full conversation with different voices'}
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
        {state === 'playing' ? 'Stop' : state === 'loading' ? 'Loading...' : 'Play All'}
      </button>
    </div>
  );
}

/**
 * What the AI partner should open an IELTS practice session with: the
 * examiner's first question, or the card's title when that question is a long
 * Part 2 cue card (the server only keeps the first 400 characters).
 */
function ieltsOpener(c: IeltsConversation): string {
  const question = c.exchanges.find((ex) => ex.role === 'examiner')?.text ?? '';
  return question && question.length <= 300 ? question : `${c.part}: ${c.title}`;
}

/* ─── Tab: IELTS Speaking ─────────────────────────────────────── */
function IeltsTab() {
  const [selectedTopic, setSelectedTopic] = useState<string | 'all'>('all');
  const [selectedPart, setSelectedPart] = useState<string | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(
    () => ieltsConversations.filter((c) => {
      if (selectedTopic !== 'all' && c.topic !== selectedTopic) return false;
      if (selectedPart !== 'all' && c.part !== selectedPart) return false;
      return true;
    }),
    [selectedTopic, selectedPart],
  );

  const topicCounts = useMemo(() => {
    const map: Record<string, number> = {};
    ieltsConversations.forEach((c) => { map[c.topic] = (map[c.topic] || 0) + 1; });
    return map;
  }, []);

  const partColor = (part: string) => {
    switch (part) {
      case 'Part 1': return 'text-accent-green bg-accent-green/10 border-accent-green/20';
      case 'Part 2': return 'text-accent-orange bg-accent-orange/10 border-accent-orange/20';
      case 'Part 3': return 'text-accent-red bg-accent-red/10 border-accent-red/20';
      default: return 'text-text-muted bg-bg-tertiary border-transparent';
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-text-muted">
          {filtered.length} conversations
          {selectedTopic !== 'all' ? ` · ${selectedTopic}` : ''}
          {selectedPart !== 'all' ? ` · ${selectedPart}` : ''}
        </span>
        <PracticeButton
          topic={selectedTopic === 'all' ? 'IELTS Speaking' : `IELTS Speaking — ${selectedTopic}`}
          focus={selectedPart === 'all' ? undefined : `Run a mock IELTS Speaking ${selectedPart} on this topic.`}
          label="Practice this topic"
        />
      </div>

      <div className="flex gap-1.5 mb-3">
        {['all', 'Part 1', 'Part 2', 'Part 3'].map((part) => (
          <button
            key={part}
            onClick={() => setSelectedPart(part)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${
              selectedPart === part
                ? 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20'
                : 'bg-bg-tertiary text-text-muted border-transparent hover:text-text-secondary'
            }`}
          >
            {part === 'all' ? 'All Parts' : part}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-6">
        <button
          onClick={() => setSelectedTopic('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${
            selectedTopic === 'all'
              ? 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20'
              : 'bg-bg-tertiary text-text-muted border-transparent hover:text-text-secondary'
          }`}
        >
          All <span className="ml-1 opacity-60">{ieltsConversations.length}</span>
        </button>
        {ieltsTopics.map((topic) => (
          <button
            key={topic}
            onClick={() => setSelectedTopic(topic)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${
              selectedTopic === topic
                ? 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20'
                : 'bg-bg-tertiary text-text-muted border-transparent hover:text-text-secondary'
            }`}
          >
            {topic} <span className="ml-1 opacity-60">{topicCounts[topic] || 0}</span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((c) => {
          const isExpanded = expandedId === c.id;
          return (
            <div key={c.id} className="rounded-lg border border-border bg-bg-card overflow-hidden transition-all">
              <button
                onClick={() => setExpandedId(isExpanded ? null : c.id)}
                className="w-full text-left px-5 py-4 flex items-start gap-3 cursor-pointer hover:bg-bg-hover/50 transition-colors"
              >
                <span className={`px-2 py-1 rounded-md text-[10px] font-bold shrink-0 mt-0.5 border ${partColor(c.part)}`}>
                  {c.part}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium text-text-primary leading-relaxed">{c.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-text-muted">{c.topic}</span>
                    <span className="text-[10px] text-text-muted">·</span>
                    <span className="text-[11px] text-text-muted flex items-center gap-1">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      {c.duration}
                    </span>
                  </div>
                </div>
                <svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className={`text-text-muted shrink-0 mt-1 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {isExpanded && (
                <div className="border-t border-border animate-fade-in">
                  <div className="px-5 py-3 bg-bg-tertiary/50 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-text-secondary leading-relaxed">{c.description}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-accent-orange/30" />
                          <span className="text-[10px] text-text-muted">Examiner — Emma (British)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-accent-cyan/30" />
                          <span className="text-[10px] text-text-muted">Candidate — Michael (American)</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <PracticeButton
                        topic={`IELTS ${c.part} — ${c.topic}`}
                        focus={ieltsOpener(c)}
                        label="Practice as candidate"
                        size="sm"
                      />
                      <PlaySequence lines={c.exchanges.map((ex) => ({ text: ex.text, voice: IELTS_VOICES[ex.role] }))} />
                    </div>
                  </div>

                  <div className="px-5 py-4 space-y-4">
                    {c.exchanges.map((ex, i) => (
                      <div key={i} className="flex gap-3">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                          ex.role === 'examiner' ? 'bg-accent-orange/15 text-accent-orange' : 'bg-accent-cyan/15 text-accent-cyan'
                        }`}>
                          {ex.role === 'examiner' ? 'E' : 'C'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className={`text-[10px] font-semibold block mb-1 ${
                            ex.role === 'examiner' ? 'text-accent-orange' : 'text-accent-cyan'
                          }`}>
                            {ex.role === 'examiner' ? 'Examiner' : 'Candidate'}
                          </span>
                          <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">{ex.text}</p>
                        </div>
                        <div className="shrink-0 mt-5">
                          <ReadAloudVoice
                            text={ex.text}
                            voice={IELTS_VOICES[ex.role]}
                            tone={ex.role === 'examiner' ? 'orange' : 'cyan'}
                            voiceLabel={ex.role === 'examiner' ? 'Emma — British' : 'Michael — American'}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {c.tips && c.tips.length > 0 && (
                    <div className="px-5 py-3 bg-accent-green/5 border-t border-accent-green/10">
                      <p className="text-xs font-semibold text-accent-green mb-2">Tips</p>
                      <ul className="space-y-1">
                        {c.tips.map((tip, i) => (
                          <li key={i} className="text-xs text-text-secondary flex items-start gap-2">
                            <span className="text-accent-green/60 mt-0.5 shrink-0">•</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {c.keyPhrases && c.keyPhrases.length > 0 && (
                    <div className="px-5 py-3 bg-accent-yellow/5 border-t border-accent-yellow/10">
                      <p className="text-xs font-semibold text-accent-yellow mb-2">Key Phrases</p>
                      <div className="flex flex-wrap gap-1.5">
                        {c.keyPhrases.map((phrase, i) => (
                          <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-accent-yellow/10 text-text-secondary border border-accent-yellow/15">
                            {phrase}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-text-muted">
          <p className="text-sm">No conversations found for this filter.</p>
        </div>
      )}
    </>
  );
}

/* ─── Tab: Daily Dialogue ────────────────────────────────────── */
function DialogueTab() {
  const [selectedTopic, setSelectedTopic] = useState<string | 'all'>('all');
  const [selectedLevel, setSelectedLevel] = useState<string | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(
    () => dialogues.filter((d) => {
      if (selectedTopic !== 'all' && d.topic !== selectedTopic) return false;
      if (selectedLevel !== 'all' && d.level !== selectedLevel) return false;
      return true;
    }),
    [selectedTopic, selectedLevel],
  );

  const topicCounts = useMemo(() => {
    const map: Record<string, number> = {};
    dialogues.forEach((d) => { map[d.topic] = (map[d.topic] || 0) + 1; });
    return map;
  }, []);

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-text-muted">
          {filtered.length} dialogues
          {selectedTopic !== 'all' ? ` · ${selectedTopic}` : ''}
          {selectedLevel !== 'all' ? ` · ${selectedLevel}` : ''}
        </span>
        <PracticeButton
          topic={selectedTopic === 'all' ? 'Everyday Dialogues' : selectedTopic}
          focus="Role-play a short everyday conversation with me. You start."
          label="Practice a role-play"
        />
      </div>

      <div className="flex gap-1.5 mb-3">
        {['all', 'Easy', 'Medium'].map((level) => (
          <button
            key={level}
            onClick={() => { setSelectedLevel(level); setExpandedId(null); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${
              selectedLevel === level
                ? 'bg-accent-yellow/10 text-accent-yellow border-accent-yellow/20'
                : 'bg-bg-tertiary text-text-muted border-transparent hover:text-text-secondary'
            }`}
          >
            {level === 'all' ? 'All Levels' : level}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-6">
        <button
          onClick={() => { setSelectedTopic('all'); setExpandedId(null); }}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${
            selectedTopic === 'all'
              ? 'bg-accent-yellow/10 text-accent-yellow border-accent-yellow/20'
              : 'bg-bg-tertiary text-text-muted border-transparent hover:text-text-secondary'
          }`}
        >
          All <span className="ml-1 opacity-60">{dialogues.length}</span>
        </button>
        {dialogueTopics.map((topic) => (
          <button
            key={topic}
            onClick={() => { setSelectedTopic(topic); setExpandedId(null); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${
              selectedTopic === topic
                ? 'bg-accent-yellow/10 text-accent-yellow border-accent-yellow/20'
                : 'bg-bg-tertiary text-text-muted border-transparent hover:text-text-secondary'
            }`}
          >
            {topic} <span className="ml-1 opacity-60">{topicCounts[topic] || 0}</span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((d) => {
          const isExpanded = expandedId === d.id;
          return (
            <div key={d.id} className="rounded-lg border border-border bg-bg-card overflow-hidden transition-all">
              <button
                onClick={() => setExpandedId(isExpanded ? null : d.id)}
                className="w-full text-left px-5 py-4 flex items-start gap-3 cursor-pointer hover:bg-bg-hover/50 transition-colors"
              >
                <span className={`px-2 py-1 rounded-md text-[10px] font-bold shrink-0 mt-0.5 border ${
                  d.level === 'Easy'
                    ? 'text-accent-green bg-accent-green/10 border-accent-green/20'
                    : 'text-accent-orange bg-accent-orange/10 border-accent-orange/20'
                }`}>
                  {d.level}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium text-text-primary leading-relaxed">{d.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-text-muted">{d.topic}</span>
                    <span className="text-[10px] text-text-muted">·</span>
                    <span className="text-[11px] text-text-muted">{d.lines.length} lines</span>
                    <span className="text-[10px] text-text-muted">·</span>
                    <span className="text-[11px] text-text-muted flex items-center gap-1">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      {d.duration}
                    </span>
                  </div>
                </div>
                <svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className={`text-text-muted shrink-0 mt-1 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {isExpanded && (
                <div className="border-t border-border animate-fade-in">
                  <div className="px-5 py-3 bg-bg-tertiary/50 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-text-secondary leading-relaxed">{d.situation}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-accent-green/30" />
                          <span className="text-[10px] text-text-muted">{d.speakers.a} — Sarah</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-accent-cyan/30" />
                          <span className="text-[10px] text-text-muted">{d.speakers.b} — Michael</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <PracticeButton
                        topic={`${d.topic} — ${d.title}`}
                        focus={`Role-play this situation with me: ${d.situation} You are the ${d.speakers.a.toLowerCase()}, I am the ${d.speakers.b.toLowerCase()}. Start the conversation.`}
                        label={`Practice as ${d.speakers.b.toLowerCase()}`}
                        size="sm"
                      />
                      <PlaySequence
                        lines={d.lines.map((l) => ({ text: l.text, voice: DIALOGUE_VOICES[l.speaker] }))}
                        tone="green"
                      />
                    </div>
                  </div>

                  <div className="px-5 py-4 space-y-4">
                    {d.lines.map((l, i) => (
                      <div key={i} className="flex gap-3">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                          l.speaker === 'a' ? 'bg-accent-green/15 text-accent-green' : 'bg-accent-cyan/15 text-accent-cyan'
                        }`}>
                          {(l.speaker === 'a' ? d.speakers.a : d.speakers.b).charAt(0).toUpperCase()}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className={`text-[10px] font-semibold block mb-1 ${
                            l.speaker === 'a' ? 'text-accent-green' : 'text-accent-cyan'
                          }`}>
                            {l.speaker === 'a' ? d.speakers.a : d.speakers.b}
                          </span>
                          <p className="text-sm text-text-secondary leading-relaxed">{l.text}</p>
                        </div>
                        <div className="shrink-0 mt-5">
                          <ReadAloudVoice
                            text={l.text}
                            voice={DIALOGUE_VOICES[l.speaker]}
                            tone={l.speaker === 'a' ? 'orange' : 'cyan'}
                            voiceLabel={l.speaker === 'a' ? 'Sarah — American' : 'Michael — American'}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {d.usefulPhrases && d.usefulPhrases.length > 0 && (
                    <div className="px-5 py-3 bg-accent-yellow/5 border-t border-accent-yellow/10">
                      <p className="text-xs font-semibold text-accent-yellow mb-2">Useful Phrases</p>
                      <div className="flex flex-wrap gap-1.5">
                        {d.usefulPhrases.map((phrase, i) => (
                          <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-accent-yellow/10 text-text-secondary border border-accent-yellow/15">
                            {phrase}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {d.notes && d.notes.length > 0 && (
                    <div className="px-5 py-3 bg-accent-green/5 border-t border-accent-green/10">
                      <p className="text-xs font-semibold text-accent-green mb-2">Language Notes</p>
                      <ul className="space-y-1">
                        {d.notes.map((note, i) => (
                          <li key={i} className="text-xs text-text-secondary flex items-start gap-2">
                            <span className="text-accent-green/60 mt-0.5 shrink-0">•</span>
                            {note}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-text-muted">
          <p className="text-sm">No dialogues found for this filter.</p>
        </div>
      )}
    </>
  );
}

/* ─── Tab: Read Aloud — paste your own text, pick a voice, practice ── */
const MAX_READ_TEXT = 4000;

function ReadAloudTab() {
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
    toast.success('Copied!');
  };

  return (
    <div>
      <p className="text-xs text-text-muted mb-3">
        Paste a paragraph or a few sentences, listen to a voice read it correctly, then copy it out to practice saying it yourself.
      </p>

      <div className="rounded-xl border-2 border-border bg-bg-card p-4 mb-4">
        <TextareaAutosize
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_READ_TEXT))}
          placeholder="Paste or type a paragraph to practice…"
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
            title="Copy text"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-bg-tertiary text-text-secondary hover:text-text-primary disabled:opacity-50 transition-all cursor-pointer"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Copy
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
          {state === 'playing' ? 'Stop' : state === 'loading' ? 'Loading…' : 'Read Aloud'}
        </button>

        {engine === 'native' ? (
          <span className="text-xs text-text-muted">
            Using your device's voice — pick an AI voice in Settings to choose one here.
          </span>
        ) : (
          <Selector
            value={voice}
            options={voices.map((v) => ({ value: v.id, label: `${v.name} · ${v.accent} ${v.gender}` }))}
            onChange={setVoice}
            ariaLabel="Voice"
          />
        )}
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */
// Sub-page metadata — just enough to resolve `?tab=` and label the
// breadcrumb. The Rail drawer owns each one's icon/color for navigation.
const tabs: { key: Tab; label: string }[] = [
  { key: 'conversation', label: 'Short Conversation' },
  { key: 'dialogue', label: 'Daily Dialogue' },
  { key: 'ielts', label: 'IELTS Speaking' },
  { key: 'read', label: 'Read Aloud' },
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
          Speak
        </Link>
        <span className="text-text-muted/50">/</span>
        <span className="font-bold text-text-primary">{activeMeta.label}</span>
      </h1>

      {activeTab === 'conversation' && <ConversationTab />}
      {activeTab === 'dialogue' && <DialogueTab />}
      {activeTab === 'ielts' && <IeltsTab />}
      {activeTab === 'read' && <ReadAloudTab />}
    </div>
  );
}
