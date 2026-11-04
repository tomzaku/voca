import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  dictationSentences, dictationTopics, type DictationSentence,
  comprehensionClips, comprehensionTopics, type ComprehensionQuestion, type ComprehensionClip,
  ieltsListeningSections, ieltsListeningTopics, type IeltsListeningSection,
} from '../data/englishListening';
import { Icon } from '@iconify/react';
import { useComprehensionProgress, useIeltsListeningProgress } from '../hooks/useListeningProgress';
import { LEVEL_CHIPS, LEVEL_CLASS } from '../lib/listeningLevels';
import { ListeningBank, type BankChip, type BankLabels } from './ListeningBank';
import { assignVoices, gradeDictation, scoreAnswers } from '../lib/listeningRules';
import { ReadAloud } from './ReadAloud';
import { PodcastTab } from './PodcastTab';
import { ReadAloudVoice, PlaySequence } from './EnglishSpeakingPage';
import { speakText, stopSpeaking, preloadTts, RECORDING_VOICES } from '../lib/tts';
import { playCorrect, playWrong } from '../lib/sfx';

type Tab = 'podcast' | 'comprehension' | 'dictation' | 'ielts';

/* ─── Shared: multiple-choice question block, self-graded ───────
 * Used by Comprehension and IELTS Listening — a clip's questions are answered
 * locally (no server round-trip; there's nothing here worth persisting past
 * the session) and checked all at once, matching how a real listening test
 * is marked at the end of a section rather than question by question. */
function QuestionBlock({ questions, tone, onChecked }: {
  questions: ComprehensionQuestion[];
  tone: 'cyan' | 'pink';
  /** Called with the number correct each time the answers are checked. */
  onChecked?: (correct: number) => void;
}) {
  // No reset-on-prop-change effect needed: the card that owns this only
  // renders it while expanded (`{isExpanded && ...}` below), so it mounts
  // fresh — with fresh initial state — every time a different clip/section
  // is opened.
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [checked, setChecked] = useState(false);

  const score = useMemo(() => scoreAnswers(questions, answers), [answers, questions]);
  const allAnswered = answers.every((a) => a !== null);

  const check = () => {
    setChecked(true);
    (score === questions.length ? playCorrect : playWrong)();
    onChecked?.(score);
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
            <FormattedMessage id="listening.checkAnswers" />
          </button>
        ) : (
          <span className={`text-sm font-bold ${score === questions.length ? 'text-accent-green' : 'text-text-primary'}`}>
            <FormattedMessage id="listening.scoreCorrect" values={{ score, total: questions.length }} />
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── Tab: Comprehension — listen, then answer ───────────────── */
// Laid out like Podcasts (ListeningBank). A clip counts as done once its
// answers are checked, and keeps the last score.
type ComprehensionTopic = (typeof comprehensionTopics)[number];
const COMPREHENSION_ICON: Record<ComprehensionTopic, string> = {
  'Daily Life': 'lucide:coffee',
  Announcements: 'lucide:megaphone',
  Work: 'lucide:briefcase',
  Travel: 'lucide:plane',
  Science: 'lucide:flask-conical',
  Health: 'lucide:heart-pulse',
  Culture: 'lucide:landmark',
};
const comprehensionIcon = (t: string) => COMPREHENSION_ICON[t as ComprehensionTopic] ?? 'lucide:headphones';

// Comprehension and IELTS are both graded quizzes, so they share the words.
const QUIZ_LABELS = {
  allDoneReview: 'listening.allAnsweredReview',
  todo: 'listening.statusNotAnswered',
  done: 'listening.statusAnswered',
  markDone: 'listening.markAnswered',
  markNotDone: 'listening.markNotAnswered',
  doneAgo: 'listening.answeredAgo',
  emptySaved: 'listening.emptySavedQuiz',
  emptyDone: 'listening.emptyAnswered',
  emptyTodo: 'listening.emptyNotAnswered',
};

const COMPREHENSION_LABELS: BankLabels = {
  ...QUIZ_LABELS,
  search: 'listening.searchClips',
  nextTitle: 'listening.nextClipTitle',
  backToList: 'listening.backToClips',
  count: 'listening.clipCount',
  emptyMatch: 'listening.noClips',
};

const clipLevel = (c: ComprehensionClip) => c.level;
const clipMatches = (c: ComprehensionClip, needle: string) =>
  c.title.toLowerCase().includes(needle) || c.topic.toLowerCase().includes(needle);

function QuestionCount({ count }: { count: number }) {
  return (
    <span className="flex items-center gap-1 text-[11px] text-text-muted">
      <Icon icon="lucide:list-checks" width={11} />
      <FormattedMessage id="listening.questionCount" values={{ count }} />
    </span>
  );
}

function Duration({ value }: { value: string }) {
  return (
    <span className="flex items-center gap-1 text-[11px] text-text-muted">
      <Icon icon="lucide:clock" width={11} /> {value}
    </span>
  );
}

function ComprehensionBody({ clip, onChecked }: { clip: ComprehensionClip; onChecked: (correct: number) => void }) {
  const [showTranscript, setShowTranscript] = useState(false);
  return (
    <>
      <div className="px-3 sm:px-5 py-3 flex items-center justify-between gap-3 bg-bg-tertiary/50">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-accent-cyan">
          <Icon icon="lucide:headphones" width={14} /> <FormattedMessage id="listening.listen" />
        </span>
        <ReadAloud text={clip.script} />
      </div>

      <div className="px-3 sm:px-5 py-4 border-t border-border">
        <QuestionBlock questions={clip.questions} tone="cyan" onChecked={onChecked} />
      </div>

      <div className="border-t border-border">
        <button
          onClick={() => setShowTranscript((s) => !s)}
          className="w-full text-left px-3 sm:px-5 py-2.5 text-xs font-semibold text-text-muted hover:text-text-secondary cursor-pointer flex items-center gap-1.5"
          aria-expanded={showTranscript}
        >
          <Icon icon="lucide:chevron-right" width={13} className={`transition-transform ${showTranscript ? 'rotate-90' : ''}`} />
          <FormattedMessage id={showTranscript ? 'listening.hideTranscript' : 'listening.showTranscript'} />
        </button>
        {showTranscript && (
          <p className="px-3 sm:px-5 pb-4 text-sm text-text-secondary leading-relaxed whitespace-pre-line">{clip.script}</p>
        )}
      </div>
    </>
  );
}

function ComprehensionTab() {
  return (
    <ListeningBank
      items={comprehensionClips}
      topics={comprehensionTopics}
      topicIcon={comprehensionIcon}
      store={useComprehensionProgress}
      labels={COMPREHENSION_LABELS}
      chips={LEVEL_CHIPS}
      chipOf={clipLevel}
      matches={clipMatches}
      intro={<FormattedMessage id="listening.comprehensionIntro" />}
      meta={(c) => (
        <>
          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${LEVEL_CLASS[c.level]}`}>{c.level}</span>
          <Duration value={c.duration} />
          <QuestionCount count={c.questions.length} />
        </>
      )}
      body={(c, { markDone }) => (
        <ComprehensionBody key={c.id} clip={c} onChecked={(correct) => markDone({ correct, total: c.questions.length })} />
      )}
    />
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

function DictationTab() {
  const intl = useIntl();
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

  // Graded by lib/listeningRules (shared with the world's royal theatre).
  const { words: gradedWords, accuracy, passed } = useMemo(
    () => (current ? gradeDictation(current.text, typed) : { words: [], accuracy: 0, passed: false }),
    [current, typed],
  );

  const check = () => {
    if (!typed.trim() || !current) return;
    stopSpeaking();
    setChecked(true);
    setSession((s) => ({ attempted: s.attempted + 1, correct: s.correct + (passed ? 1 : 0) }));
    (passed ? playCorrect : playWrong)();
  };

  const next = () => {
    setTyped('');
    setChecked(false);
    setIndex((i) => (i + 1 < filtered.length ? i + 1 : 0));
  };

  if (filtered.length === 0) {
    return (
      <div className="text-center py-12 text-text-muted">
        <p className="text-sm"><FormattedMessage id="listening.noSentences" /></p>
      </div>
    );
  }

  return (
    <>
      <p className="text-xs text-text-muted mb-3">
        <FormattedMessage id="listening.dictationIntro" />
      </p>

      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-text-muted">
          <FormattedMessage id="listening.sentenceOf" values={{ index: index + 1, total: filtered.length }} />
          {selectedTopic !== 'all' ? ` · ${selectedTopic}` : ''}
          {selectedLevel !== 'all' ? ` · ${selectedLevel}` : ''}
        </span>
        {session.attempted > 0 && (
          <span className="text-xs font-medium text-text-secondary">
            <FormattedMessage id="listening.sessionScore" values={{ correct: session.correct, attempted: session.attempted }} />
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
            {level === 'all' ? intl.formatMessage({ id: 'listening.allLevels' }) : level}
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
          <FormattedMessage id="listening.all" />
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
              <FormattedMessage id={playState === 'playing' ? 'listening.stop' : playState === 'loading' ? 'listening.loading' : 'listening.play'} />
            </button>
          </div>

          <textarea
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            disabled={checked}
            placeholder={intl.formatMessage({ id: 'listening.typeWhatYouHear' })}
            rows={2}
            className="w-full bg-transparent border-2 border-border rounded-xl px-4 py-3 text-base text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-green/60 resize-none leading-relaxed disabled:opacity-70"
          />

          {checked && (
            <div className="mt-3 p-3 rounded-lg bg-bg-tertiary/50 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-bold ${passed ? 'text-accent-green' : accuracy >= 60 ? 'text-accent-orange' : 'text-accent-red'}`}>
                  <FormattedMessage id="listening.wordAccuracy" values={{ accuracy: accuracy / 100 }} />
                </span>
              </div>
              <p className="text-sm leading-relaxed">
                {gradedWords.map(({ word: w, ok }, i) => (
                  <span key={i}>
                    <button
                      onClick={() => void speakText(w)}
                      className={`cursor-pointer hover:bg-bg-tertiary rounded ${ok ? 'text-accent-green' : 'text-accent-red underline decoration-wavy'}`}
                    >
                      {w}
                    </button>{' '}
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
                <FormattedMessage id="listening.check" />
              </button>
            ) : (
              <button
                onClick={next}
                className="px-4 py-2 rounded-lg text-sm font-bold border-2 border-accent-green bg-accent-green text-bg-primary hover:bg-accent-green/90 transition-all cursor-pointer"
              >
                <FormattedMessage id="listening.nextSentence" />
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
  const speakers = transcript.map((t) => t.speaker);
  const voice = assignVoices(speakers, RECORDING_VOICES);
  const tone = assignVoices(speakers, TONE_POOL) as Record<string, SpeakerTone>;
  return { voice, tone };
}

// Laid out like Podcasts (ListeningBank), with the section number as the
// filter chip in place of level. Done once the answers are checked.
type IeltsTopic = (typeof ieltsListeningTopics)[number];
type IeltsSection = IeltsListeningSection['section'];
const IELTS_ICON: Record<IeltsTopic, string> = {
  'Everyday Services': 'lucide:phone',
  'Campus Life': 'lucide:graduation-cap',
  'Academic Discussion': 'lucide:messages-square',
  Lecture: 'lucide:presentation',
};
const ieltsIcon = (t: string) => IELTS_ICON[t as IeltsTopic] ?? 'lucide:headphones';
const SECTION_CLASS = 'text-accent-pink bg-accent-pink/10 border-accent-pink/20';
const SECTION_CHIPS: BankChip<IeltsSection>[] = IELTS_SECTIONS.map((s) => ({ key: s, label: s, className: SECTION_CLASS }));

const IELTS_LABELS: BankLabels = {
  ...QUIZ_LABELS,
  search: 'listening.searchSections',
  nextTitle: 'listening.nextSectionTitle',
  backToList: 'listening.backToSections',
  count: 'listening.sectionCount',
  emptyMatch: 'listening.noSections',
};

const sectionOf = (s: IeltsListeningSection) => s.section;
const sectionMatches = (s: IeltsListeningSection, needle: string) =>
  s.title.toLowerCase().includes(needle) || s.description.toLowerCase().includes(needle);

function IeltsBody({ s, onChecked }: { s: IeltsListeningSection; onChecked: (correct: number) => void }) {
  const { voice, tone } = useMemo(() => speakerAssignments(s.transcript), [s.transcript]);
  return (
    <>
      <div className="px-3 sm:px-5 py-3 bg-bg-tertiary/50 flex items-center justify-between gap-3">
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

      <div className="px-3 sm:px-5 py-4 space-y-4 border-t border-border">
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
                <ReadAloudVoice text={t.text} voice={voice[t.speaker]} tone={tc.readAloud} voiceLabel={t.speaker} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-3 sm:px-5 py-4 border-t border-border">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-accent-pink mb-3">
          <Icon icon="lucide:list-checks" width={14} /> <FormattedMessage id="listening.questions" />
        </p>
        <QuestionBlock questions={s.questions} tone="pink" onChecked={onChecked} />
      </div>

      {s.tips && s.tips.length > 0 && (
        <div className="px-3 sm:px-5 py-3 bg-accent-green/5 border-t border-accent-green/10">
          <p className="text-xs font-semibold text-accent-green mb-2"><FormattedMessage id="listening.tips" /></p>
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
    </>
  );
}

function IeltsListeningTab() {
  return (
    <ListeningBank
      items={ieltsListeningSections}
      topics={ieltsListeningTopics}
      topicIcon={ieltsIcon}
      store={useIeltsListeningProgress}
      labels={IELTS_LABELS}
      chips={SECTION_CHIPS}
      chipOf={sectionOf}
      matches={sectionMatches}
      meta={(s) => (
        <>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${SECTION_CLASS}`}>{s.section}</span>
          <Duration value={s.duration} />
          <QuestionCount count={s.questions.length} />
        </>
      )}
      body={(s, { markDone }) => (
        <IeltsBody key={s.id} s={s} onChecked={(correct) => markDone({ correct, total: s.questions.length })} />
      )}
    />
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */
// Sub-page metadata — just enough to resolve `?tab=` and label the
// breadcrumb. The Rail drawer owns each one's icon/color for navigation —
// same split as EnglishSpeakingPage.
const tabs: { key: Tab; labelId: string }[] = [
  { key: 'podcast', labelId: 'listening.tabPodcast' },
  { key: 'comprehension', labelId: 'listening.tabComprehension' },
  { key: 'dictation', labelId: 'listening.tabDictation' },
  { key: 'ielts', labelId: 'listening.tabIelts' },
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
          <FormattedMessage id="listening.breadcrumb" />
        </Link>
        <span className="text-text-muted/50">/</span>
        <span className="font-bold text-text-primary"><FormattedMessage id={activeMeta.labelId} /></span>
      </h1>

      {activeTab === 'podcast' && <PodcastTab />}
      {activeTab === 'comprehension' && <ComprehensionTab />}
      {activeTab === 'dictation' && <DictationTab />}
      {activeTab === 'ielts' && <IeltsListeningTab />}
    </div>
  );
}
