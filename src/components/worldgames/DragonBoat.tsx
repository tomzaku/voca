import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { comprehensionClips, dictationSentences } from '../../data/englishListening';
import { gradeDictation, scoreAnswers, type DictationGrade } from '../../lib/listeningRules';
import { shuffle } from '../../lib/learnRules';
import { speakText, stopSpeaking } from '../../lib/tts';
import { playCorrect, playSelect, playWrong } from '../../lib/sfx';
import { HudActionBar, HudBanner, HudCenter, HudDock, HudSlot, HudTop, PixelButton, PixelChip, PixelIcon } from './pixel';

// The Listening building — a dragon boat moored off Lê Lợi park. Two of the
// Listen page's drills, on the same sentences and clips and graded by the
// same rules (lib/listeningRules): Dictation, where the boatman says a
// sentence and you type it, and Comprehension, where a clip plays and its
// questions sit on hotkeys 1–4. Switch between them in the top bar.

export type Mode = 'dictation' | 'comprehension';

export function DragonBoat({ initialMode = 'dictation' }: { initialMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [score, setScore] = useState<ReactNode>(null);

  useEffect(() => () => stopSpeaking(), []);

  const switchTo = (m: Mode) => { stopSpeaking(); setScore(null); setMode(m); };

  const top = (
    <HudTop>
      <div className="flex items-center gap-2">
        <PixelChip on={mode === 'dictation'} onClick={() => switchTo('dictation')}>
          <FormattedMessage id="listening.tabDictation" />
        </PixelChip>
        <PixelChip on={mode === 'comprehension'} onClick={() => switchTo('comprehension')}>
          <FormattedMessage id="listening.tabComprehension" />
        </PixelChip>
        <span className="flex-1" />
        {score && <span className="px-num text-[18px] text-[var(--px-gold)]">{score}</span>}
      </div>
    </HudTop>
  );

  return (
    <>
      {top}
      {mode === 'dictation' ? <Dictation onScore={setScore} /> : <Comprehension onScore={setScore} />}
    </>
  );
}

/** Play/stop for a line of speech, tracking whether it's playing. */
function useSpeech() {
  const [playing, setPlaying] = useState(false);
  const toggle = (text: string) => {
    if (playing) { stopSpeaking(); setPlaying(false); return; }
    setPlaying(true);
    void speakText(text, { onEnd: () => setPlaying(false) }).catch(() => setPlaying(false));
  };
  return { playing, toggle, stop: () => { stopSpeaking(); setPlaying(false); } };
}

// ── Dictation ──
function Dictation({ onScore }: { onScore: (n: ReactNode) => void }) {
  const intl = useIntl();
  const order = useMemo(() => shuffle(dictationSentences), []);
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const [grade, setGrade] = useState<DictationGrade | null>(null);
  const [tally, setTally] = useState({ passed: 0, attempted: 0 });
  const speech = useSpeech();
  const inputRef = useRef<HTMLInputElement>(null);
  const current = order[index % order.length];

  // The boatman says each new sentence as it comes up.
  useEffect(() => {
    speech.toggle(current.text);
    inputRef.current?.focus();
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  const check = () => {
    if (!typed.trim() || grade) return;
    speech.stop();
    const g = gradeDictation(current.text, typed);
    setGrade(g);
    (g.passed ? playCorrect : playWrong)();
    const next = { passed: tally.passed + (g.passed ? 1 : 0), attempted: tally.attempted + 1 };
    setTally(next);
    onScore(intl.formatMessage({ id: 'world.boatPassed' }, next));
  };
  const next = () => {
    playSelect();
    setTyped('');
    setGrade(null);
    setIndex((i) => i + 1);
  };

  return (
    <>
      <HudBanner key={current.id} label={<FormattedMessage id="world.boatSays" />} aside={`${current.level} · ${current.topic}`}>
        <PixelButton tone="sky" onClick={() => speech.toggle(current.text)}>
          <PixelIcon name="speaker" size={2} />
          <FormattedMessage id={speech.playing ? 'listening.stop' : 'listening.play'} />
        </PixelButton>
        {grade && <p className="mt-3 text-[17px]">{current.text}</p>}
      </HudBanner>

      <HudDock>
        {grade && (
          <div>
            <p className={`px-title mb-2 ${grade.passed ? 'text-[var(--px-good)]' : 'text-[var(--px-bad)]'}`}>
              <FormattedMessage id="listening.wordAccuracy" values={{ accuracy: grade.accuracy / 100 }} />
            </p>
            <div className="flex flex-wrap gap-1.5">
              {grade.words.map((w, i) => (
                <span
                  key={i}
                  className="px-notch px-2 py-0.5 text-[15px] font-bold"
                  style={{
                    background: w.ok ? '#1f4a25' : '#4d1a16',
                    boxShadow: `inset 0 0 0 2px var(--px-ink), inset 0 0 0 3px ${w.ok ? 'var(--px-good)' : 'var(--px-bad)'}`,
                  }}
                >
                  {w.word}
                </span>
              ))}
            </div>
          </div>
        )}
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (grade) next(); else check(); }}>
          <input
            ref={inputRef}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            readOnly={!!grade}
            placeholder={intl.formatMessage({ id: 'listening.typeWhatYouHear' })}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="px-inset px-notch flex-1 min-w-0 px-3 py-2.5 text-[18px] font-bold text-[var(--px-text)] placeholder:text-[var(--px-muted)] focus:outline-none"
          />
          {grade ? (
            <PixelButton type="submit" tone="red">
              <FormattedMessage id="flashcard.next" /> ↵
            </PixelButton>
          ) : (
            <PixelButton type="submit" tone="jade" disabled={!typed.trim()}>
              <FormattedMessage id="listening.check" />
            </PixelButton>
          )}
        </form>
      </HudDock>
    </>
  );
}

// ── Comprehension ──
function Comprehension({ onScore }: { onScore: (n: ReactNode) => void }) {
  const intl = useIntl();
  const order = useMemo(() => shuffle(comprehensionClips), []);
  const [index, setIndex] = useState(0);
  const clip = order[index % order.length];
  const [answers, setAnswers] = useState<(number | null)[]>(() => clip.questions.map(() => null));
  const [q, setQ] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [transcript, setTranscript] = useState(false);
  const speech = useSpeech();
  const done = q >= clip.questions.length;
  const question = clip.questions[q];

  useEffect(() => () => stopSpeaking(), []);

  const pick = (i: number) => {
    if (picked !== null || done) return;
    playSelect();
    setPicked(i);
    (i === question.correctIndex ? playCorrect : playWrong)();
    const nextAnswers = answers.map((a, k) => (k === q ? i : a));
    setAnswers(nextAnswers);
    // Let the right/wrong show before the next question.
    setTimeout(() => {
      setPicked(null);
      setQ((n) => n + 1);
      if (q + 1 >= clip.questions.length) {
        speech.stop();
        onScore(intl.formatMessage({ id: 'listening.scoreCorrect' }, { score: scoreAnswers(clip.questions, nextAnswers), total: clip.questions.length }));
      }
    }, 900);
  };

  const nextClip = () => {
    const c = order[(index + 1) % order.length];
    speech.stop();
    setIndex((i) => i + 1);
    setAnswers(c.questions.map(() => null));
    setQ(0);
    setTranscript(false);
  };

  // Answers on hotkeys 1–4; Enter for the next clip at the end.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done && e.key === 'Enter') { e.preventDefault(); nextClip(); return; }
      const n = Number(e.key) - 1;
      if (!done && question && n >= 0 && n < question.options.length) { e.preventDefault(); pick(n); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const player = (
    <PixelButton tone="sky" onClick={() => speech.toggle(clip.script)}>
      <PixelIcon name="speaker" size={2} />
      <FormattedMessage id={speech.playing ? 'listening.stop' : 'listening.play'} />
      <span className="opacity-70">· {clip.duration}</span>
    </PixelButton>
  );

  if (done) {
    const score = scoreAnswers(clip.questions, answers);
    return (
      <HudCenter wide>
        <p className="px-title text-[var(--px-accent)]">{clip.title}</p>
        <p className={`px-num text-[40px] leading-none mt-2 ${score === clip.questions.length ? 'text-[var(--px-good)]' : 'text-[var(--px-gold)]'}`}>
          {score} / {clip.questions.length}
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          {player}
          <PixelButton tone={transcript ? 'jade' : 'paper'} onClick={() => setTranscript((v) => !v)}>
            <FormattedMessage id={transcript ? 'listening.hideTranscript' : 'listening.showTranscript'} />
          </PixelButton>
        </div>
        {transcript && <p className="mt-3 text-[15px] leading-relaxed text-[var(--px-muted)]">{clip.script}</p>}
        <PixelButton tone="red" block className="mt-5" onClick={nextClip}>
          <FormattedMessage id="world.boatNextClip" /> ↵
        </PixelButton>
      </HudCenter>
    );
  }

  return (
    <>
      <HudBanner key={`${clip.id}-${q}`} label={clip.title} aside={`${q + 1} / ${clip.questions.length} · ${clip.level}`}>
        <div className="mb-3">{player}</div>
        {question.question}
      </HudBanner>
      <HudActionBar key={`${clip.id}-a${q}`}>
        {question.options.map((opt, i) => {
          const state = picked === null ? 'idle' : i === question.correctIndex ? 'good' : i === picked ? 'bad' : 'dim';
          return <HudSlot key={opt} hotkey={String(i + 1)} state={state} onClick={() => pick(i)}>{opt}</HudSlot>;
        })}
      </HudActionBar>
    </>
  );
}
