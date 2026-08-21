import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  podcasts, podcastTopics,
  dictationSentences, dictationTopics, type DictationSentence,
  comprehensionClips, comprehensionTopics, type ComprehensionQuestion,
  ieltsListeningSections, ieltsListeningTopics,
} from '../data/englishListening';
import { ReadAloud } from './ReadAloud';
import { PracticeButton } from './PracticeButton';
import { ReadAloudVoice, PlaySequence } from './EnglishSpeakingPage';
import { speakText, stopSpeaking, preloadTts, CONV_VOICE_A, CONV_VOICE_B } from '../lib/tts';
import { playCorrect, playWrong } from '../lib/sfx';

type Tab = 'podcast' | 'comprehension' | 'dictation' | 'ielts';

/* ─── Tab: Podcast ───────────────────────────────────────────── */
function PodcastTab() {
  const [selectedTopic, setSelectedTopic] = useState<string | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(
    () => selectedTopic === 'all' ? podcasts : podcasts.filter((p) => p.topic === selectedTopic),
    [selectedTopic],
  );

  const topicCounts = useMemo(() => {
    const map: Record<string, number> = {};
    podcasts.forEach((p) => { map[p.topic] = (map[p.topic] || 0) + 1; });
    return map;
  }, []);

  const levelColor = (level: string) => {
    switch (level) {
      case 'Intermediate': return 'text-accent-green bg-accent-green/10 border-accent-green/20';
      case 'Upper-Intermediate': return 'text-accent-orange bg-accent-orange/10 border-accent-orange/20';
      case 'Advanced': return 'text-accent-red bg-accent-red/10 border-accent-red/20';
      default: return 'text-text-muted bg-bg-tertiary border-transparent';
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-text-muted">
          {selectedTopic === 'all' ? `${podcasts.length} episodes` : `${filtered.length} episodes · ${selectedTopic}`}
        </span>
        <PracticeButton
          topic={selectedTopic === 'all' ? 'Podcast Topics' : selectedTopic}
          label={selectedTopic === 'all' ? 'Practice' : 'Practice this topic'}
        />
      </div>

      <div className="flex flex-wrap gap-1.5 mb-6">
        <button
          onClick={() => setSelectedTopic('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${
            selectedTopic === 'all'
              ? 'bg-accent-purple/10 text-accent-purple border-accent-purple/20'
              : 'bg-bg-tertiary text-text-muted border-transparent hover:text-text-secondary'
          }`}
        >
          All <span className="ml-1 opacity-60">{podcasts.length}</span>
        </button>
        {podcastTopics.map((topic) => (
          <button
            key={topic}
            onClick={() => setSelectedTopic(topic)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${
              selectedTopic === topic
                ? 'bg-accent-purple/10 text-accent-purple border-accent-purple/20'
                : 'bg-bg-tertiary text-text-muted border-transparent hover:text-text-secondary'
            }`}
          >
            {topic} <span className="ml-1 opacity-60">{topicCounts[topic] || 0}</span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((p) => {
          const isExpanded = expandedId === p.id;
          return (
            <div key={p.id} className="rounded-lg border border-border bg-bg-card overflow-hidden transition-all">
              <button
                onClick={() => setExpandedId(isExpanded ? null : p.id)}
                className="w-full text-left px-5 py-4 flex items-start gap-3 cursor-pointer hover:bg-bg-hover/50 transition-colors"
              >
                <span className="w-7 h-7 rounded-md bg-accent-purple/15 text-accent-purple flex items-center justify-center shrink-0 mt-0.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium text-text-primary leading-relaxed">{p.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-text-muted">{p.topic}</span>
                    <span className="text-[10px] text-text-muted">·</span>
                    <span className="text-[11px] text-text-muted flex items-center gap-1">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      {p.duration}
                    </span>
                    <span className="text-[10px] text-text-muted">·</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${levelColor(p.level)}`}>{p.level}</span>
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
                  <div className="px-5 py-3 bg-bg-tertiary/50 flex items-start justify-between gap-3">
                    <p className="text-xs text-text-secondary leading-relaxed">{p.description}</p>
                    <PracticeButton
                      topic={p.topic}
                      focus={p.discussionQuestions?.[0]
                        ?? `What are your thoughts on the podcast "${p.title}"?`}
                      label="Discuss this episode"
                      size="sm"
                    />
                  </div>
                  <div className="px-5 py-3 flex items-center justify-between border-b border-border">
                    <span className="text-xs font-semibold text-accent-purple">Full Script</span>
                    <ReadAloud text={p.script} />
                  </div>
                  <div className="px-5 py-4">
                    <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">{p.script}</p>
                  </div>

                  {p.vocabulary && p.vocabulary.length > 0 && (
                    <div className="px-5 py-3 bg-accent-cyan/5 border-t border-accent-cyan/10">
                      <p className="text-xs font-semibold text-accent-cyan mb-2">Key Vocabulary</p>
                      <div className="space-y-1.5">
                        {p.vocabulary.map((v, i) => (
                          <div key={i} className="flex items-baseline gap-2">
                            <span className="text-xs font-medium text-text-primary">{v.word}</span>
                            <span className="text-[11px] text-text-muted">— {v.definition}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {p.discussionQuestions && p.discussionQuestions.length > 0 && (
                    <div className="px-5 py-3 bg-accent-yellow/5 border-t border-accent-yellow/10">
                      <p className="text-xs font-semibold text-accent-yellow mb-2">Discussion Questions</p>
                      <ul className="space-y-1">
                        {p.discussionQuestions.map((q, i) => (
                          <li key={i} className="text-xs text-text-secondary flex items-start gap-2">
                            <span className="text-accent-yellow/60 mt-0.5 shrink-0">{i + 1}.</span>
                            {q}
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
          <p className="text-sm">No podcasts found for this topic.</p>
        </div>
      )}
    </>
  );
}

/* ─── Shared: multiple-choice question block, self-graded ───────
 * Used by Comprehension and IELTS Listening — a clip's questions are answered
 * locally (no server round-trip; there's nothing here worth persisting past
 * the session) and checked all at once, matching how a real listening test
 * is marked at the end of a section rather than question by question. */
function QuestionBlock({ questions, tone }: {
  questions: ComprehensionQuestion[];
  tone: 'cyan' | 'pink';
}) {
  // No reset-on-prop-change effect needed: the card that owns this only
  // renders it while expanded (`{isExpanded && ...}` below), so it mounts
  // fresh — with fresh initial state — every time a different clip/section
  // is opened.
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [checked, setChecked] = useState(false);

  const score = useMemo(
    () => answers.reduce<number>((n, a, i) => n + (a === questions[i].correctIndex ? 1 : 0), 0),
    [answers, questions],
  );
  const allAnswered = answers.every((a) => a !== null);

  const check = () => {
    setChecked(true);
    (score === questions.length ? playCorrect : playWrong)();
  };

  const toneClass = tone === 'pink'
    ? { ring: 'border-accent-pink/30 bg-accent-pink/5', btn: 'bg-accent-pink text-bg-primary border-accent-pink hover:bg-accent-pink/90' }
    : { ring: 'border-accent-cyan/30 bg-accent-cyan/5', btn: 'bg-accent-cyan text-bg-primary border-accent-cyan hover:bg-accent-cyan/90' };

  return (
    <div className="space-y-4">
      {questions.map((q, qi) => (
        <div key={qi} className={`rounded-lg border p-4 ${checked ? 'border-transparent' : 'border-border bg-bg-tertiary/30'}`}>
          <p className="text-sm font-medium text-text-primary mb-2.5">
            <span className="text-text-muted mr-1.5">{qi + 1}.</span>{q.question}
          </p>
          <div className="space-y-1.5">
            {q.options.map((opt, oi) => {
              const picked = answers[qi] === oi;
              const isCorrect = oi === q.correctIndex;
              let cls = 'border-border bg-bg-card text-text-secondary hover:border-text-muted/40';
              if (checked) {
                if (isCorrect) cls = 'border-accent-green/40 bg-accent-green/10 text-accent-green';
                else if (picked) cls = 'border-accent-red/40 bg-accent-red/10 text-accent-red';
                else cls = 'border-border bg-bg-card text-text-muted';
              } else if (picked) {
                cls = toneClass.ring + ' text-text-primary';
              }
              return (
                <button
                  key={oi}
                  onClick={() => !checked && setAnswers((a) => { const next = [...a]; next[qi] = oi; return next; })}
                  disabled={checked}
                  className={`w-full text-left px-3 py-2 rounded-md border text-xs transition-all cursor-pointer disabled:cursor-default flex items-center gap-2 ${cls}`}
                >
                  {checked && isCorrect && <span>✓</span>}
                  {checked && !isCorrect && picked && <span>✗</span>}
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="flex items-center gap-3">
        {!checked ? (
          <button
            onClick={check}
            disabled={!allAnswered}
            className={`px-4 py-2 rounded-lg text-sm font-bold border-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${toneClass.btn}`}
          >
            Check Answers
          </button>
        ) : (
          <span className={`text-sm font-bold ${score === questions.length ? 'text-accent-green' : 'text-text-primary'}`}>
            {score}/{questions.length} correct
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── Tab: Comprehension — listen, then answer ───────────────── */
function ComprehensionTab() {
  const [selectedTopic, setSelectedTopic] = useState<string | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState<Record<string, boolean>>({});

  const filtered = useMemo(
    () => selectedTopic === 'all' ? comprehensionClips : comprehensionClips.filter((c) => c.topic === selectedTopic),
    [selectedTopic],
  );

  const topicCounts = useMemo(() => {
    const map: Record<string, number> = {};
    comprehensionClips.forEach((c) => { map[c.topic] = (map[c.topic] || 0) + 1; });
    return map;
  }, []);

  const levelColor = (level: string) => {
    switch (level) {
      case 'Intermediate': return 'text-accent-green bg-accent-green/10 border-accent-green/20';
      case 'Upper-Intermediate': return 'text-accent-orange bg-accent-orange/10 border-accent-orange/20';
      case 'Advanced': return 'text-accent-red bg-accent-red/10 border-accent-red/20';
      default: return 'text-text-muted bg-bg-tertiary border-transparent';
    }
  };

  return (
    <>
      <p className="text-xs text-text-muted mb-3">
        Listen to a short clip, then answer the questions from memory — check the transcript afterward if you want to see what you missed.
      </p>

      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-text-muted">
          {selectedTopic === 'all' ? `${comprehensionClips.length} clips` : `${filtered.length} clips · ${selectedTopic}`}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-6">
        <button
          onClick={() => { setSelectedTopic('all'); setExpandedId(null); }}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${
            selectedTopic === 'all'
              ? 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20'
              : 'bg-bg-tertiary text-text-muted border-transparent hover:text-text-secondary'
          }`}
        >
          All <span className="ml-1 opacity-60">{comprehensionClips.length}</span>
        </button>
        {comprehensionTopics.map((topic) => (
          <button
            key={topic}
            onClick={() => { setSelectedTopic(topic); setExpandedId(null); }}
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
                <span className="w-7 h-7 rounded-md bg-accent-cyan/15 text-accent-cyan flex items-center justify-center shrink-0 mt-0.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                  </svg>
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium text-text-primary leading-relaxed">{c.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-text-muted">{c.topic}</span>
                    <span className="text-[10px] text-text-muted">·</span>
                    <span className="text-[11px] text-text-muted">{c.duration}</span>
                    <span className="text-[10px] text-text-muted">·</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${levelColor(c.level)}`}>{c.level}</span>
                    <span className="text-[10px] text-text-muted">·</span>
                    <span className="text-[11px] text-text-muted">{c.questions.length} questions</span>
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
                  <div className="px-5 py-3 flex items-center justify-between border-b border-border bg-bg-tertiary/50">
                    <span className="text-xs font-semibold text-accent-cyan">Listen</span>
                    <ReadAloud text={c.script} />
                  </div>

                  <div className="px-5 py-4">
                    <QuestionBlock questions={c.questions} tone="cyan" />
                  </div>

                  <div className="border-t border-border">
                    <button
                      onClick={() => setShowTranscript((s) => ({ ...s, [c.id]: !s[c.id] }))}
                      className="w-full text-left px-5 py-2.5 text-xs font-semibold text-text-muted hover:text-text-secondary cursor-pointer flex items-center gap-1.5"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${showTranscript[c.id] ? 'rotate-90' : ''}`}>
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                      {showTranscript[c.id] ? 'Hide transcript' : 'Show transcript'}
                    </button>
                    {showTranscript[c.id] && (
                      <p className="px-5 pb-4 text-sm text-text-secondary leading-relaxed whitespace-pre-line">{c.script}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-text-muted">
          <p className="text-sm">No clips found for this topic.</p>
        </div>
      )}
    </>
  );
}

/* ─── Tab: Dictation — hear it, type it, check it ────────────── */
const LEVELS: DictationSentence['level'][] = ['Beginner', 'Intermediate', 'Advanced'];
const levelColorDict = (level: DictationSentence['level']) => {
  switch (level) {
    case 'Beginner': return 'text-accent-green bg-accent-green/10 border-accent-green/20';
    case 'Intermediate': return 'text-accent-orange bg-accent-orange/10 border-accent-orange/20';
    case 'Advanced': return 'text-accent-red bg-accent-red/10 border-accent-red/20';
  }
};

// Strips punctuation and case so "Well done!" typed as "well done" still
// matches — this is a dictation drill, not a punctuation test.
function normalizeWords(s: string): string[] {
  return s.toLowerCase().replace(/[.,!?;:"'()]/g, '').trim().split(/\s+/).filter(Boolean);
}

function DictationTab() {
  const [selectedTopic, setSelectedTopic] = useState<string | 'all'>('all');
  const [selectedLevel, setSelectedLevel] = useState<DictationSentence['level'] | 'all'>('all');
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const [checked, setChecked] = useState(false);
  const [session, setSession] = useState({ attempted: 0, correct: 0 });
  const [playState, setPlayState] = useState<'idle' | 'loading' | 'playing'>('idle');
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; stopSpeaking(); };
  }, []);

  const filtered = useMemo(
    () => dictationSentences.filter((d) => {
      if (selectedTopic !== 'all' && d.topic !== selectedTopic) return false;
      if (selectedLevel !== 'all' && d.level !== selectedLevel) return false;
      return true;
    }),
    [selectedTopic, selectedLevel],
  );

  useEffect(() => { setIndex(0); setTyped(''); setChecked(false); }, [selectedTopic, selectedLevel]);

  const current = filtered[index] as DictationSentence | undefined;

  const play = useCallback(async () => {
    if (!current) return;
    if (playState === 'loading' || playState === 'playing') {
      stopSpeaking();
      setPlayState('idle');
      return;
    }
    setPlayState('loading');
    try {
      await speakText(current.text, {
        onStart: () => { if (mountedRef.current) setPlayState('playing'); },
        onEnd: () => { if (mountedRef.current) setPlayState('idle'); },
      });
    } catch { /* ignore */ } finally {
      if (mountedRef.current) setPlayState('idle');
    }
  }, [current, playState]);

  const { correctWords, matches, accuracy } = useMemo(() => {
    if (!current) return { correctWords: [] as string[], matches: [] as boolean[], accuracy: 0 };
    const correctW = normalizeWords(current.text);
    const typedW = normalizeWords(typed);
    const m = correctW.map((w, i) => w === typedW[i]);
    const acc = correctW.length ? Math.round((m.filter(Boolean).length / correctW.length) * 100) : 0;
    return { correctWords: correctW, matches: m, accuracy: acc };
  }, [current, typed]);

  const check = () => {
    if (!typed.trim() || !current) return;
    stopSpeaking();
    setChecked(true);
    setSession((s) => ({ attempted: s.attempted + 1, correct: s.correct + (accuracy >= 90 ? 1 : 0) }));
    (accuracy >= 90 ? playCorrect : playWrong)();
  };

  const next = () => {
    setTyped('');
    setChecked(false);
    setIndex((i) => (i + 1 < filtered.length ? i + 1 : 0));
  };

  if (filtered.length === 0) {
    return (
      <div className="text-center py-12 text-text-muted">
        <p className="text-sm">No sentences found for this filter.</p>
      </div>
    );
  }

  return (
    <>
      <p className="text-xs text-text-muted mb-3">
        Listen to a sentence and type exactly what you hear. Punctuation and capitalization don't matter — the words do.
      </p>

      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-text-muted">
          Sentence {index + 1} of {filtered.length}
          {selectedTopic !== 'all' ? ` · ${selectedTopic}` : ''}
          {selectedLevel !== 'all' ? ` · ${selectedLevel}` : ''}
        </span>
        {session.attempted > 0 && (
          <span className="text-xs font-medium text-text-secondary">
            Session: {session.correct}/{session.attempted} correct
          </span>
        )}
      </div>

      <div className="flex gap-1.5 mb-3">
        {(['all', ...LEVELS] as const).map((level) => (
          <button
            key={level}
            onClick={() => setSelectedLevel(level)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${
              selectedLevel === level
                ? 'bg-accent-green/10 text-accent-green border-accent-green/20'
                : 'bg-bg-tertiary text-text-muted border-transparent hover:text-text-secondary'
            }`}
          >
            {level === 'all' ? 'All Levels' : level}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-6">
        <button
          onClick={() => setSelectedTopic('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${
            selectedTopic === 'all'
              ? 'bg-accent-green/10 text-accent-green border-accent-green/20'
              : 'bg-bg-tertiary text-text-muted border-transparent hover:text-text-secondary'
          }`}
        >
          All
        </button>
        {dictationTopics.map((topic) => (
          <button
            key={topic}
            onClick={() => setSelectedTopic(topic)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${
              selectedTopic === topic
                ? 'bg-accent-green/10 text-accent-green border-accent-green/20'
                : 'bg-bg-tertiary text-text-muted border-transparent hover:text-text-secondary'
            }`}
          >
            {topic}
          </button>
        ))}
      </div>

      {current && (
        <div className="rounded-xl border-2 border-border bg-bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${levelColorDict(current.level)}`}>{current.level}</span>
            <button
              onClick={play}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all cursor-pointer ${
                playState === 'playing'
                  ? 'bg-accent-green/10 text-accent-green border-accent-green/30'
                  : 'bg-accent-green text-bg-primary border-accent-green hover:bg-accent-green/90'
              }`}
            >
              {playState === 'loading' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" className="animate-spin" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
              ) : playState === 'playing' ? (
                <svg width="12" height="12" viewBox="0 0 10 10" fill="currentColor">
                  <rect x="0" y="0" width="10" height="10" rx="1" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              )}
              {playState === 'playing' ? 'Stop' : playState === 'loading' ? 'Loading…' : 'Play'}
            </button>
          </div>

          <textarea
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            disabled={checked}
            placeholder="Type what you hear…"
            rows={2}
            className="w-full bg-transparent border-2 border-border rounded-xl px-4 py-3 text-base text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-green/60 resize-none leading-relaxed disabled:opacity-70"
          />

          {checked && (
            <div className="mt-3 p-3 rounded-lg bg-bg-tertiary/50 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-bold ${accuracy >= 90 ? 'text-accent-green' : accuracy >= 60 ? 'text-accent-orange' : 'text-accent-red'}`}>
                  {accuracy}% word accuracy
                </span>
              </div>
              <p className="text-sm leading-relaxed">
                {correctWords.map((w, i) => (
                  <span key={i} className={matches[i] ? 'text-accent-green' : 'text-accent-red underline decoration-wavy'}>
                    {w}{' '}
                  </span>
                ))}
              </p>
            </div>
          )}

          <div className="flex items-center gap-3 mt-4">
            {!checked ? (
              <button
                onClick={check}
                disabled={!typed.trim()}
                className="px-4 py-2 rounded-lg text-sm font-bold border-2 border-accent-green bg-accent-green text-bg-primary hover:bg-accent-green/90 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Check
              </button>
            ) : (
              <button
                onClick={next}
                className="px-4 py-2 rounded-lg text-sm font-bold border-2 border-accent-green bg-accent-green text-bg-primary hover:bg-accent-green/90 transition-all cursor-pointer"
              >
                Next Sentence →
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Tab: IELTS Listening — sectioned audio + questions ─────── */
const IELTS_SECTIONS = ['Section 1', 'Section 2', 'Section 3', 'Section 4'] as const;
// Cycles through voices as new speakers appear in a section's transcript, so
// each speaker keeps one consistent voice for the whole section without the
// data needing to hand-assign one — same trick as DIALOGUE_VOICES elsewhere,
// generalized past a fixed two-speaker pair.
const VOICE_POOL = [CONV_VOICE_A, CONV_VOICE_B, 'bf_emma', 'bm_george'];

// Classes spelled out in full per tone — Tailwind only keeps classes it can
// find as complete strings in the source, so `bg-${tone}/30` would silently
// render nothing (see PracticeButton.tsx's MODES for the same rule).
type SpeakerTone = 'orange' | 'cyan' | 'green' | 'pink';
const TONE_POOL: SpeakerTone[] = ['orange', 'cyan', 'green', 'pink'];
const TONE_CLASSES: Record<SpeakerTone, { dot: string; badgeBg: string; badgeText: string; readAloud: 'orange' | 'cyan' }> = {
  orange: { dot: 'bg-accent-orange/30', badgeBg: 'bg-accent-orange/15', badgeText: 'text-accent-orange', readAloud: 'orange' },
  cyan: { dot: 'bg-accent-cyan/30', badgeBg: 'bg-accent-cyan/15', badgeText: 'text-accent-cyan', readAloud: 'cyan' },
  green: { dot: 'bg-accent-green/30', badgeBg: 'bg-accent-green/15', badgeText: 'text-accent-green', readAloud: 'cyan' },
  pink: { dot: 'bg-accent-pink/30', badgeBg: 'bg-accent-pink/15', badgeText: 'text-accent-pink', readAloud: 'orange' },
};

function speakerAssignments(transcript: { speaker: string }[]) {
  const voice: Record<string, string> = {};
  const tone: Record<string, SpeakerTone> = {};
  let i = 0;
  for (const t of transcript) {
    if (!voice[t.speaker]) {
      voice[t.speaker] = VOICE_POOL[i % VOICE_POOL.length];
      tone[t.speaker] = TONE_POOL[i % TONE_POOL.length];
      i++;
    }
  }
  return { voice, tone };
}

function IeltsListeningTab() {
  const [selectedTopic, setSelectedTopic] = useState<string | 'all'>('all');
  const [selectedSection, setSelectedSection] = useState<string | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(
    () => ieltsListeningSections.filter((s) => {
      if (selectedTopic !== 'all' && s.topic !== selectedTopic) return false;
      if (selectedSection !== 'all' && s.section !== selectedSection) return false;
      return true;
    }),
    [selectedTopic, selectedSection],
  );

  const topicCounts = useMemo(() => {
    const map: Record<string, number> = {};
    ieltsListeningSections.forEach((s) => { map[s.topic] = (map[s.topic] || 0) + 1; });
    return map;
  }, []);

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-text-muted">
          {filtered.length} sections
          {selectedTopic !== 'all' ? ` · ${selectedTopic}` : ''}
          {selectedSection !== 'all' ? ` · ${selectedSection}` : ''}
        </span>
      </div>

      <div className="flex gap-1.5 mb-3">
        {(['all', ...IELTS_SECTIONS] as const).map((section) => (
          <button
            key={section}
            onClick={() => setSelectedSection(section)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${
              selectedSection === section
                ? 'bg-accent-pink/10 text-accent-pink border-accent-pink/20'
                : 'bg-bg-tertiary text-text-muted border-transparent hover:text-text-secondary'
            }`}
          >
            {section === 'all' ? 'All Sections' : section}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-6">
        <button
          onClick={() => setSelectedTopic('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${
            selectedTopic === 'all'
              ? 'bg-accent-pink/10 text-accent-pink border-accent-pink/20'
              : 'bg-bg-tertiary text-text-muted border-transparent hover:text-text-secondary'
          }`}
        >
          All <span className="ml-1 opacity-60">{ieltsListeningSections.length}</span>
        </button>
        {ieltsListeningTopics.map((topic) => (
          <button
            key={topic}
            onClick={() => setSelectedTopic(topic)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${
              selectedTopic === topic
                ? 'bg-accent-pink/10 text-accent-pink border-accent-pink/20'
                : 'bg-bg-tertiary text-text-muted border-transparent hover:text-text-secondary'
            }`}
          >
            {topic} <span className="ml-1 opacity-60">{topicCounts[topic] || 0}</span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((s) => {
          const isExpanded = expandedId === s.id;
          const { voice, tone } = speakerAssignments(s.transcript);
          return (
            <div key={s.id} className="rounded-lg border border-border bg-bg-card overflow-hidden transition-all">
              <button
                onClick={() => setExpandedId(isExpanded ? null : s.id)}
                className="w-full text-left px-5 py-4 flex items-start gap-3 cursor-pointer hover:bg-bg-hover/50 transition-colors"
              >
                <span className="px-2 py-1 rounded-md text-[10px] font-bold shrink-0 mt-0.5 border text-accent-pink bg-accent-pink/10 border-accent-pink/20">
                  {s.section}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium text-text-primary leading-relaxed">{s.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-text-muted">{s.topic}</span>
                    <span className="text-[10px] text-text-muted">·</span>
                    <span className="text-[11px] text-text-muted flex items-center gap-1">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      {s.duration}
                    </span>
                    <span className="text-[10px] text-text-muted">·</span>
                    <span className="text-[11px] text-text-muted">{s.questions.length} questions</span>
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
                      <p className="text-xs text-text-secondary leading-relaxed">{s.description}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        {Object.keys(voice).map((sp) => (
                          <div key={sp} className="flex items-center gap-1.5">
                            <span className={`w-2.5 h-2.5 rounded-full ${TONE_CLASSES[tone[sp]].dot}`} />
                            <span className="text-[10px] text-text-muted">{sp}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <PlaySequence lines={s.transcript.map((t) => ({ text: t.text, voice: voice[t.speaker] }))} />
                  </div>

                  <div className="px-5 py-4 space-y-4 border-b border-border">
                    {s.transcript.map((t, i) => {
                      const tc = TONE_CLASSES[tone[t.speaker]];
                      return (
                        <div key={i} className="flex gap-3">
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${tc.badgeBg} ${tc.badgeText}`}>
                            {t.speaker.charAt(0).toUpperCase()}
                          </span>
                          <div className="flex-1 min-w-0">
                            <span className={`text-[10px] font-semibold block mb-1 ${tc.badgeText}`}>{t.speaker}</span>
                            <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">{t.text}</p>
                          </div>
                          <div className="shrink-0 mt-5">
                            <ReadAloudVoice
                              text={t.text}
                              voice={voice[t.speaker]}
                              tone={tc.readAloud}
                              voiceLabel={t.speaker}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="px-5 py-4">
                    <p className="text-xs font-semibold text-accent-pink mb-3">Questions</p>
                    <QuestionBlock questions={s.questions} tone="pink" />
                  </div>

                  {s.tips && s.tips.length > 0 && (
                    <div className="px-5 py-3 bg-accent-green/5 border-t border-accent-green/10">
                      <p className="text-xs font-semibold text-accent-green mb-2">Tips</p>
                      <ul className="space-y-1">
                        {s.tips.map((tip, i) => (
                          <li key={i} className="text-xs text-text-secondary flex items-start gap-2">
                            <span className="text-accent-green/60 mt-0.5 shrink-0">•</span>
                            {tip}
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
          <p className="text-sm">No sections found for this filter.</p>
        </div>
      )}
    </>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */
// Sub-page metadata — just enough to resolve `?tab=` and label the
// breadcrumb. The Rail drawer owns each one's icon/color for navigation —
// same split as EnglishSpeakingPage.
const tabs: { key: Tab; label: string }[] = [
  { key: 'podcast', label: 'Podcast' },
  { key: 'comprehension', label: 'Comprehension' },
  { key: 'dictation', label: 'Dictation' },
  { key: 'ielts', label: 'IELTS Listening' },
];

function useListeningTab(): Tab {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get('tab');
  const resolved = (tabs.find((t) => t.key === raw)?.key ?? 'podcast') as Tab;
  useEffect(() => {
    if (raw !== resolved) setSearchParams({ tab: resolved }, { replace: true });
  }, [raw, resolved, setSearchParams]);
  return resolved;
}

export function EnglishListeningPage() {
  const activeTab = useListeningTab();
  const activeMeta = tabs.find((t) => t.key === activeTab)!;

  // Warms up the TTS engine ahead of the first Play tap, same as the other
  // audio-heavy tabs on Speak.
  useEffect(() => {
    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(() => preloadTts(), { timeout: 3000 });
      return () => cancelIdleCallback(id);
    } else {
      const id = setTimeout(() => preloadTts(), 3000);
      return () => clearTimeout(id);
    }
  }, []);

  return (
    <div className="max-w-page mx-auto px-4 py-8 relative">
      <h1 className="flex items-center gap-1.5 mb-6 text-base">
        <Link to="/listening" className="font-medium text-text-muted hover:text-text-secondary transition-colors">
          Listen
        </Link>
        <span className="text-text-muted/50">/</span>
        <span className="font-bold text-text-primary">{activeMeta.label}</span>
      </h1>

      {activeTab === 'podcast' && <PodcastTab />}
      {activeTab === 'comprehension' && <ComprehensionTab />}
      {activeTab === 'dictation' && <DictationTab />}
      {activeTab === 'ielts' && <IeltsListeningTab />}
    </div>
  );
}
