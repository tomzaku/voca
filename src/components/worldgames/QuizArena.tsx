import { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { speakText, stopSpeaking } from '../../lib/tts';
import { playCorrect, playWrong, playSelect, playWin } from '../../lib/sfx';
import {
  QUESTION_TYPES, QUESTION_TYPE_META, SECONDS_PER_WORD, makeQuizConfig,
  type QuestionType, type QuizConfig, type RevealMode,
} from '../../lib/quizConfig';
import {
  buildQuiz, gradeMatch, gradeMcq, loadQuizData, recordResults,
  type Question, type WordResult,
} from '../../lib/quizEngine';
import {
  PixelButton, PixelCells, PixelChip, PixelHeading, PixelHearts, PixelIcon, PixelLoader, PixelOption, PixelStat,
} from './pixel';
import { PixelMatchBoard } from './pixel/PixelMatchBoard';
import { useVocabularyStore } from '../../hooks/useVocabulary';
import { useAuth } from '../../hooks/useAuth';

// The Quizzes building (Quốc Học). Same setup options as the full Quiz page
// (src/components/QuizSetup.tsx) — question types, when answers show, a time
// limit and which words — and the same rules (src/lib/quizEngine.ts), but
// drawn with the world's pixel kit and played as an arena run: lives, a combo
// multiplier and a score. Answers feed the real SRS.

const MIN_WORDS = 2;
const LIVES = 3;
const BASE = 100;

interface Summary { score: number; correct: number; total: number; bestCombo: number; outOfLives: boolean; }

type Phase =
  | { name: 'setup' }
  | { name: 'loading' }
  | { name: 'error' }
  | { name: 'playing' }
  | { name: 'over'; summary: Summary };

function fmtTime(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
}

export function QuizArena({ words }: { words: string[] }) {
  const intl = useIntl();
  const markWord = useVocabularyStore((s) => s.markWord);
  const { user } = useAuth();

  // ── Setup (same knobs as the Quiz page) ──
  const [chosen, setChosen] = useState<Set<string>>(() => new Set(words));
  const [qTypes, setQTypes] = useState<Set<QuestionType>>(() => new Set(QUESTION_TYPES));
  const [reveal, setReveal] = useState<RevealMode>('each');
  const [autoTime, setAutoTime] = useState(true);
  const [durationSec, setDurationSec] = useState(() => words.length * SECONDS_PER_WORD);
  useEffect(() => { if (autoTime) setDurationSec(chosen.size * SECONDS_PER_WORD); }, [autoTime, chosen]);

  // The pool can arrive after mount (collections load async) — start with
  // everything selected whenever it changes.
  const wordsKey = words.join('|');
  useEffect(() => { setChosen(new Set(words)); }, [wordsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Run ──
  const [phase, setPhase] = useState<Phase>({ name: 'setup' });
  const [config, setConfig] = useState<QuizConfig | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [gain, setGain] = useState<number | null>(null);

  const correctRef = useRef(0);
  const scoreRef = useRef(0);
  const bestRef = useRef(0);
  const livesRef = useRef(LIVES);
  const doneRef = useRef(false);

  const toggleType = (t: QuestionType) => setQTypes((prev) => {
    const next = new Set(prev);
    if (next.has(t)) { if (next.size > 1) next.delete(t); } else { next.add(t); playSelect(); }
    return next;
  });
  const toggleWord = (w: string) => setChosen((prev) => {
    const next = new Set(prev);
    if (next.has(w)) next.delete(w); else { next.add(w); playSelect(); }
    return next;
  });

  const start = useCallback(async () => {
    const cfg = makeQuizConfig([...chosen], QUESTION_TYPES.filter((t) => qTypes.has(t)), reveal, durationSec);
    setConfig(cfg);
    setPhase({ name: 'loading' });
    const { dataMap, loaded } = await loadQuizData(cfg.words);
    if (loaded.length < MIN_WORDS) { setPhase({ name: 'error' }); return; }

    correctRef.current = 0; scoreRef.current = 0; bestRef.current = 0;
    livesRef.current = LIVES; doneRef.current = false;
    setQuestions(buildQuiz(cfg, loaded, dataMap));
    setIndex(0); setPicked(null); setScore(0); setCombo(0); setLives(LIVES); setGain(null);
    setRemaining(cfg.durationSec > 0 ? cfg.durationSec : null);
    setPhase({ name: 'playing' });
  }, [chosen, qTypes, reveal, durationSec]);

  const question = questions[index];
  const total = questions.length;

  const finish = useCallback((outOfLives = false) => {
    if (doneRef.current) return;
    doneRef.current = true;
    stopSpeaking();
    playWin();
    setPhase({ name: 'over', summary: {
      score: scoreRef.current, correct: correctRef.current, total, bestCombo: bestRef.current, outOfLives,
    } });
  }, [total]);

  /** Shared bookkeeping for a resolved question. */
  const resolve = useCallback((correct: boolean, wordsAnswered: WordResult[]) => {
    if (correct) {
      const points = BASE + combo * 25;
      playCorrect();
      setGain(points);
      setScore((s) => { const v = s + points; scoreRef.current = v; return v; });
      setCombo((c) => { const v = c + 1; bestRef.current = Math.max(bestRef.current, v); return v; });
      correctRef.current += 1;
    } else {
      playWrong();
      setCombo(0);
      livesRef.current -= 1;
      setLives(livesRef.current);
    }
    recordResults(markWord, wordsAnswered, user?.id);

    const dead = !correct && livesRef.current <= 0;
    const last = index + 1 >= total;
    setTimeout(() => {
      setGain(null);
      if (dead) finish(true);
      else if (last) finish();
      else { setIndex((i) => i + 1); setPicked(null); }
    }, reveal === 'each' ? (correct ? 750 : 1200) : 350);
  }, [combo, index, total, reveal, finish, markWord, user?.id]);

  const answerMcq = (option: string) => {
    if (phase.name !== 'playing' || picked !== null || question?.kind !== 'mcq') return;
    setPicked(option);
    const result = gradeMcq(question, option);
    resolve(result.ok, [result]);
  };

  const completeMatch = (mistakes: number, links: Record<string, string>) => {
    if (phase.name !== 'playing' || question?.kind !== 'match') return;
    setPicked('__match__');
    resolve(mistakes === 0, gradeMatch(question, links));
  };

  // ── Total countdown (0 = untimed), matching the Quiz page's semantics ──
  useEffect(() => {
    if (phase.name !== 'playing' || !config || config.durationSec <= 0) return;
    const deadline = Date.now() + config.durationSec * 1000;
    const id = setInterval(() => {
      const rem = Math.max(0, (deadline - Date.now()) / 1000);
      setRemaining(rem);
      if (rem <= 0) { clearInterval(id); finish(); }
    }, 200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase.name, config]);

  // ── Speak Listen questions ──
  useEffect(() => {
    if (phase.name !== 'playing') return;
    const q = questions[index];
    if (q?.kind === 'mcq' && q.type === 'listen') { stopSpeaking(); speakText(q.word); }
  }, [phase.name, index, questions]);

  useEffect(() => () => stopSpeaking(), []);

  // ── Setup screen ──
  if (phase.name === 'setup') {
    return (
      <div className="space-y-4">
        <section>
          <PixelHeading
            aside={qTypes.size === QUESTION_TYPES.length
              ? intl.formatMessage({ id: 'games.arenaRandomMix' })
              : intl.formatMessage({ id: 'games.arenaSelected' }, { count: qTypes.size })}
          >
            <FormattedMessage id="games.arenaQuestionTypes" />
          </PixelHeading>
          <div className="grid grid-cols-2 gap-1.5">
            {QUESTION_TYPES.map((t) => (
              <PixelOption
                key={t}
                on={qTypes.has(t)}
                onClick={() => toggleType(t)}
                label={intl.formatMessage({ id: QUESTION_TYPE_META[t].labelId })}
                hint={intl.formatMessage({ id: QUESTION_TYPE_META[t].hintId })}
              />
            ))}
          </div>
        </section>

        <section>
          <PixelHeading><FormattedMessage id="games.arenaShowAnswers" /></PixelHeading>
          <div className="grid grid-cols-2 gap-1.5">
            <PixelOption
              on={reveal === 'each'}
              onClick={() => setReveal('each')}
              label={intl.formatMessage({ id: 'games.arenaAfterEach' })}
              hint={intl.formatMessage({ id: 'games.arenaAfterEachHint' })}
            />
            <PixelOption
              on={reveal === 'end'}
              onClick={() => setReveal('end')}
              label={intl.formatMessage({ id: 'games.arenaAtEnd' })}
              hint={intl.formatMessage({ id: 'games.arenaAtEndHint' })}
            />
          </div>
        </section>

        <section>
          <PixelHeading
            aside={
              <PixelChip on={autoTime} onClick={() => setAutoTime(true)}>
                <FormattedMessage id="games.arenaAutoTime" values={{ sec: SECONDS_PER_WORD }} />
              </PixelChip>
            }
          >
            <FormattedMessage id="games.arenaTimeLimit" />
          </PixelHeading>
          <div className="flex items-center gap-2">
            <PixelIcon name="hourglass" size={2} className="text-[var(--px-gold)]" />
            <input
              type="number"
              min={0}
              value={durationSec}
              onChange={(e) => { setAutoTime(false); setDurationSec(Math.max(0, Math.floor(Number(e.target.value) || 0))); }}
              className="px-inset px-notch w-20 px-2 py-0.5 text-[20px] text-[var(--px-text)] focus:outline-none"
            />
            <span className="text-[18px] text-[var(--px-muted)]"><FormattedMessage id="games.arenaSec" /></span>
            <span className="text-[18px] text-[var(--px-muted)] ml-auto">
              {durationSec === 0 ? intl.formatMessage({ id: 'games.arenaNoLimit' }) : `≈ ${fmtTime(durationSec)}`}
            </span>
          </div>
        </section>

        <section>
          <PixelHeading
            aside={
              <span className="flex gap-1.5">
                <PixelChip on={chosen.size === words.length} onClick={() => setChosen(new Set(words))}><FormattedMessage id="games.all" /></PixelChip>
                <PixelChip on={chosen.size === 0} onClick={() => setChosen(new Set())}><FormattedMessage id="games.none" /></PixelChip>
              </span>
            }
          >
            <FormattedMessage id="games.arenaWords" values={{ chosen: chosen.size, total: words.length }} />
          </PixelHeading>
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-0.5">
            {words.map((w) => (
              <PixelChip key={w} on={chosen.has(w)} onClick={() => toggleWord(w)}>{w}</PixelChip>
            ))}
          </div>
        </section>

        <PixelButton tone="red" block onClick={start} disabled={chosen.size < MIN_WORDS}>
          <PixelIcon name="sword" size={2} />
          <FormattedMessage id="games.arenaEnter" />
        </PixelButton>
        {chosen.size < MIN_WORDS && (
          <p className="text-[17px] text-[var(--px-muted)] text-center">
            <FormattedMessage id="games.arenaPickAtLeast" values={{ count: MIN_WORDS }} />
          </p>
        )}
      </div>
    );
  }

  if (phase.name === 'loading') {
    return <PixelLoader label={<FormattedMessage id="games.arenaEntering" />} />;
  }

  if (phase.name === 'error') {
    return (
      <div className="py-6 text-center">
        <PixelIcon name="heartEmpty" size={5} className="text-[var(--px-bad)] mb-3" />
        <p className="text-[20px] text-[var(--px-muted)] mb-4"><FormattedMessage id="games.arenaLoadFailed" /></p>
        <PixelButton onClick={() => setPhase({ name: 'setup' })}>
          <FormattedMessage id="games.arenaBackToSetup" />
        </PixelButton>
      </div>
    );
  }

  // ── Results ──
  if (phase.name === 'over') {
    const { score: sc, correct, total: tot, bestCombo: bc, outOfLives } = phase.summary;
    const pct = tot ? Math.round((correct / tot) * 100) : 0;
    const msgId = outOfLives ? 'games.arenaOutOfLives' : pct >= 100 ? 'games.arenaFlawless' : pct >= 75 ? 'games.arenaGreatRun' : pct >= 50 ? 'games.arenaNotBad' : 'games.arenaKeepTraining';
    return (
      <div className="text-center">
        <p className={`px-title mb-2 ${outOfLives ? 'text-[var(--px-bad)]' : 'text-[var(--px-accent)]'}`}>
          <FormattedMessage id={outOfLives ? 'games.arenaDefeated' : 'games.arenaCleared'} />
        </p>
        <div className="flex items-center justify-center gap-2 mb-1">
          <PixelIcon name="star" size={4} className="text-[var(--px-gold)]" />
          <span className="text-[56px] leading-none tabular-nums">{sc}</span>
        </div>
        <p className="text-[20px] text-[var(--px-muted)] mb-4">
          <FormattedMessage id="games.arenaPointsMsg" values={{ msg: intl.formatMessage({ id: msgId }) }} />
        </p>
        <div className="grid grid-cols-3 gap-2 mb-5">
          <PixelStat icon="check" label={intl.formatMessage({ id: 'games.statCorrect' })} value={`${correct}/${tot}`} color="text-[var(--px-good)]" />
          <PixelStat icon="flame" label={intl.formatMessage({ id: 'games.statCombo' })} value={`×${bc}`} color="text-[var(--px-gold)]" />
          <PixelStat icon="percent" label={intl.formatMessage({ id: 'games.statAccuracy' })} value={`${pct}%`} color="text-[var(--px-sky)]" />
        </div>
        <div className="flex gap-2">
          <PixelButton tone="red" className="flex-1" onClick={start}>
            <PixelIcon name="retry" size={2} /> <FormattedMessage id="games.again" />
          </PixelButton>
          <PixelButton
            tone="paper"
            onClick={() => setPhase({ name: 'setup' })}
            title={intl.formatMessage({ id: 'games.changeSettings' })}
            aria-label={intl.formatMessage({ id: 'games.changeSettings' })}
          >
            <PixelIcon name="sliders" size={2} />
          </PixelButton>
        </div>
      </div>
    );
  }

  // ── Playing ──
  if (!question) return null;
  const timed = remaining !== null;
  const timePct = timed && config?.durationSec ? (remaining / config.durationSec) * 100 : 100;
  const low = timed && remaining <= 5;

  return (
    <div>
      {/* Lives · combo · score */}
      <div className="flex items-center justify-between mb-2">
        <PixelHearts lives={lives} max={LIVES} />
        <div className="relative flex items-center gap-2">
          {combo >= 2 && (
            <span className="flex items-center gap-1 text-[20px] text-[var(--px-gold)]">
              <PixelIcon name="flame" size={2} />×{combo}
            </span>
          )}
          <span className="flex items-center gap-1 text-[26px] leading-none tabular-nums">
            <PixelIcon name="star" size={2} className="text-[var(--px-gold)]" />{score}
          </span>
          {gain != null && <span className="absolute -top-5 right-0 text-[20px] text-[var(--px-good)] px-rise">+{gain}</span>}
        </div>
      </div>

      {/* Time, as a row of cells (only when a limit is set) */}
      {timed && (
        <div className="flex items-center gap-2 mb-3">
          <PixelIcon name="hourglass" size={2} className={low ? 'text-[var(--px-bad)] px-blink' : 'text-[var(--px-muted)]'} />
          <PixelCells pct={timePct} color={low ? 'var(--px-bad)' : 'var(--px-jade)'} />
          <span className={`text-[18px] tabular-nums ${low ? 'text-[var(--px-bad)]' : 'text-[var(--px-muted)]'}`}>{fmtTime(remaining)}</span>
        </div>
      )}

      <div className="flex items-center justify-between mb-1.5">
        <span className="px-title text-[var(--px-accent)]">
          {intl.formatMessage({ id: question.kind === 'match' ? QUESTION_TYPE_META.match.askId : QUESTION_TYPE_META[question.type].askId })}
        </span>
        <span className="text-[18px] text-[var(--px-muted)] tabular-nums">{index + 1}/{total}</span>
      </div>

      {question.kind === 'match' ? (
        <PixelMatchBoard key={index} pairs={question.pairs} reveal={reveal === 'each'} onComplete={completeMatch} />
      ) : (
        <>
          {question.type === 'listen' ? (
            <PixelButton
              tone="sky"
              block
              className="mb-3 !py-4"
              onClick={() => { stopSpeaking(); speakText(question.word); }}
            >
              <PixelIcon name="speaker" size={3} /> <FormattedMessage id="games.replaySound" />
            </PixelButton>
          ) : (
            <p className="px-inset px-notch text-[22px] leading-[1] px-3 py-2.5 mb-3 min-h-[3.5rem]">{question.prompt}</p>
          )}

          <div className="grid grid-cols-1 gap-2">
            {question.options.map((opt) => {
              const decided = picked !== null;
              const show = decided && reveal === 'each';
              const isAnswer = opt === question.word;
              // Feedback shows on the buttons themselves: green for the answer,
              // red (with a shake) for a wrong pick, everything else greyed.
              const tone = !show ? 'paper' : isAnswer ? 'good' : picked === opt ? 'bad' : 'paper';
              return (
                <PixelButton
                  key={opt}
                  tone={tone}
                  block
                  onClick={() => { if (!decided) { playSelect(); answerMcq(opt); } }}
                  disabled={decided && tone === 'paper'}
                  className={`!justify-start !normal-case !font-['VT323'] !text-[22px] !tracking-normal ${show && picked === opt && !isAnswer ? 'px-shake' : ''}`}
                >
                  {opt}
                </PixelButton>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
