import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import { FormattedMessage, useIntl } from 'react-intl';
import type { PublicQuestion } from '../../lib/huntsApi';
import { playCorrect, playSelect, playWrong } from '../../lib/sfx';
import { TEST_THEMES, themeLook, type TestTheme } from '../../lib/testThemes';
import type { Check } from '../../lib/testsApi';
import { HuntQuestion } from '../hunt/HuntQuestion';

/**
 * The world a themed test is played in: its background, and a handful of
 * pieces drifting about behind the question card. Classic has neither — it's
 * the app as it always looked.
 *
 * The pieces are placed by their index, not at random, so the layout is the
 * same on every render and the same for every student.
 */
export function ThemedStage({ theme, children }: { theme: TestTheme; children: React.ReactNode }) {
  const look = themeLook(theme);
  const pieces = useMemo(
    () => Array.from({ length: look.deco.length ? 14 : 0 }, (_, i) => ({
      icon: look.deco[i % look.deco.length],
      left: `${(i * 37 + 7) % 96}%`,
      top: `${(i * 53 + 11) % 90}%`,
      size: 18 + ((i * 7) % 4) * 8,
      duration: `${9 + ((i * 5) % 7)}s`,
      delay: `${-((i * 1.7) % 9)}s`,
    })),
    [look],
  );
  if (!look.background) return <div className="space-y-5">{children}</div>;
  return (
    <div className="relative overflow-hidden rounded-3xl p-4 sm:p-6 min-h-[70vh] text-white" style={{ background: look.background }}>
      <div aria-hidden className="absolute inset-0">
        {pieces.map((p, i) => (
          <Icon
            key={i}
            icon={p.icon}
            className="theme-deco"
            data-motion={look.motion}
            style={{
              left: p.left,
              // Rising and falling pieces travel the full height; the others stay put.
              ...(look.motion === 'twinkle' || look.motion === 'sway' ? { top: p.top } : {}),
              width: p.size,
              height: p.size,
              animationDuration: p.duration,
              animationDelay: p.delay,
            }}
          />
        ))}
      </div>
      <div className="relative space-y-5">{children}</div>
    </div>
  );
}

/** The progress track, with the theme's runner moving along it. */
export function ThemedProgress({ theme, at, total }: { theme: TestTheme; at: number; total: number }) {
  const look = themeLook(theme);
  const pct = total ? (at / total) * 100 : 0;
  return (
    <div className="relative flex-1 h-3 rounded-full bg-black/20 dark:bg-white/10">
      <div className="h-full rounded-full bg-accent-green transition-all duration-500" style={{ width: `${pct}%` }} />
      <Icon
        icon={look.runner}
        aria-hidden
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-2xl animate-bob transition-all duration-500 drop-shadow"
        style={{ left: `${Math.max(3, pct)}%`, color: look.background ? '#fff' : 'var(--color-accent-cyan)' }}
      />
    </div>
  );
}

/** The teacher's choice of look: a small preview of each theme. */
export function ThemePicker({ value, onChange }: { value: TestTheme; onChange: (t: TestTheme) => void }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
      {TEST_THEMES.map((t) => {
        const look = themeLook(t);
        const on = value === t;
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            aria-pressed={on}
            className={`relative h-20 rounded-xl overflow-hidden flex flex-col items-center justify-center gap-1 border-[3px] transition-transform hover:-translate-y-0.5 ${
              on ? 'border-accent-cyan scale-[1.03]' : 'border-transparent'
            } ${look.background ? 'text-white' : 'bg-bg-tertiary text-text-primary'}`}
            style={look.background ? { background: look.background } : undefined}
          >
            <Icon icon={look.icon} className={`text-2xl ${on ? 'animate-bob' : ''}`} />
            <span className="text-[11px] font-bold"><FormattedMessage id={`tests.theme.${t}`} /></span>
            <span className="absolute bottom-1 inset-x-2 flex gap-0.5">
              {look.tiles.map((c) => <span key={c} className="flex-1 h-1 rounded-full" style={{ background: c }} />)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

const BURST_COLORS = ['#22d3ee', '#34e39b', '#ff9f43', '#b98bff', '#ffd23f', '#ff6ec7'];

/** A one-off shower of confetti, for a right answer or a handed-in test. */
export function Confetti({ count = 28 }: { count?: number }) {
  // Random once per burst — a new burst is a new component.
  const [pieces] = useState(() =>
    Array.from({ length: count }, () => ({
      dx: `${(Math.random() * 2 - 1) * 220}px`,
      dy: `${40 + Math.random() * 170}px`,
      rot: `${(Math.random() * 2 - 1) * 540}deg`,
      delay: `${Math.random() * 0.12}s`,
      color: BURST_COLORS[Math.floor(Math.random() * BURST_COLORS.length)],
    })));
  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{ background: p.color, '--dx': p.dx, '--dy': p.dy, '--rot': p.rot, animationDelay: p.delay } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

/** Counts up from 0 to `to` — the score landing. */
export function CountUp({ to, ms = 900 }: { to: number; ms?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      setN(Math.round(to * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [to, ms]);
  return <>{n}</>;
}

/**
 * How an instant-feedback answer went: a green burst and the streak for a
 * hit, the right answer for a miss. Shown quietly (no burst) when coming back
 * to a question marked earlier.
 */
export function Marked({ check, fresh, streak }: { check: Check; fresh: boolean; streak: number }) {
  return (
    <div className={`mt-5 flex items-center gap-3 rounded-2xl p-3 ${check.correct ? 'bg-accent-green/15' : 'bg-accent-red/10'} ${fresh ? 'animate-pop-in' : ''}`}>
      <span className="relative shrink-0 w-11 h-11 flex items-center justify-center">
        {fresh && <span aria-hidden className={`absolute inset-0 rounded-full animate-answer-burst ${check.correct ? 'bg-accent-green' : 'bg-accent-red'}`} />}
        <Icon icon={check.correct ? 'lucide:circle-check' : 'lucide:circle-x'} className={`relative text-4xl ${check.correct ? 'text-accent-green' : 'text-accent-red'}`} />
      </span>
      <div className="flex-1 min-w-0">
        <p className={`font-display font-extrabold text-lg ${check.correct ? 'text-accent-green' : 'text-accent-red'}`}>
          <FormattedMessage id={check.correct ? 'tests.markRight' : 'tests.markWrong'} />
        </p>
        {!check.correct && (
          <p className="text-sm text-text-secondary">
            <FormattedMessage id="tests.theAnswerWas" values={{ answer: <b className="text-accent-green">{check.answer}</b> }} />
          </p>
        )}
      </div>
      {streak >= 2 && (
        <span className="shrink-0 flex items-center gap-1 rounded-full bg-accent-orange/20 px-3 py-1 font-display font-extrabold text-accent-orange">
          <Icon icon="lucide:flame" className="animate-flame" /> {streak}
        </span>
      )}
    </div>
  );
}

/** A question the preview can mark by itself — the student's view plus its answer. */
export interface PreviewQuestion {
  question: PublicQuestion & { id: string };
  answer: string;
  accept?: string[];
  /** Matching: the word for each meaning, in order. */
  slots?: string[];
}

const norm = (x: string) => x.trim().toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, ' ');

/** Grades like the server (`isCorrect` in _shared/hunts.ts) — near enough for a preview. */
function previewCorrect(p: PreviewQuestion, given: string | string[]): boolean {
  if (p.slots) return Array.isArray(given) && p.slots.every((s, i) => norm(given[i] ?? '') === norm(s));
  return typeof given === 'string' && [p.answer, ...(p.accept ?? [])].some((a) => norm(a) === norm(given));
}

/**
 * The teacher's look at a theme before students get it: a button that opens
 * the test full-size, playable — tiles, animations, and (with instant
 * feedback on) the burst, the shake and the streak. Nothing is sent or saved.
 */
export function ThemePreviewButton({ theme, instant, questions, loadImage }: {
  theme: TestTheme;
  instant: boolean;
  /** Her own questions when she has some; a few samples otherwise. */
  questions: PreviewQuestion[];
  loadImage?: (key: string) => Promise<string>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 rounded-xl bg-bg-tertiary text-xs font-bold text-text-primary flex items-center gap-1.5 hover:text-accent-cyan"
      >
        <Icon icon="lucide:eye" /> <FormattedMessage id="tests.preview" />
      </button>
      {open && <ThemePreview theme={theme} instant={instant} questions={questions} loadImage={loadImage} onClose={() => setOpen(false)} />}
    </>
  );
}

function ThemePreview({ theme, instant, questions, loadImage, onClose }: {
  theme: TestTheme;
  instant: boolean;
  questions: PreviewQuestion[];
  loadImage?: (key: string) => Promise<string>;
  onClose: () => void;
}) {
  const intl = useIntl();
  const list = questions.length ? questions.slice(0, 10) : SAMPLES;
  const [at, setAt] = useState(0);
  const [marks, setMarks] = useState<Record<string, Check>>({});
  const look = themeLook(theme);
  const onStage = !!look.background;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const answer = useCallback((p: PreviewQuestion, given: string | string[]) => {
    if (!instant) { playSelect(); setAt((i) => i + 1); return; }
    const correct = previewCorrect(p, given);
    if (correct) playCorrect(); else playWrong();
    setMarks((m) => ({
      ...m,
      [p.question.id]: { questionId: p.question.id, given: Array.isArray(given) ? given.join(' | ') : given, correct, answer: p.slots ? p.slots.join(' · ') : p.answer },
    }));
  }, [instant]);

  const streakAt = (i: number) => {
    let n = 0;
    for (let k = i; k >= 0 && marks[list[k].question.id]?.correct; k--) n++;
    return n;
  };

  const p = list[at];
  const mark = p ? marks[p.question.id] : undefined;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-full overflow-y-auto rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <ThemedStage theme={theme}>
          <div className="flex items-center gap-2">
            <span className={`flex-1 text-xs font-bold uppercase tracking-wider ${onStage ? 'text-white/90' : 'text-text-muted'}`}>
              <Icon icon="lucide:eye" className="inline -mt-0.5 mr-1" />
              <FormattedMessage id="tests.previewBanner" />
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label={intl.formatMessage({ id: 'tests.previewClose' })}
              className={`w-9 h-9 rounded-full flex items-center justify-center ${onStage ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-bg-tertiary text-text-primary'}`}
            >
              <Icon icon="lucide:x" />
            </button>
          </div>

          {p ? (
            <>
              <div className="flex items-center gap-3">
                <ThemedProgress theme={theme} at={at} total={list.length} />
                <span className={`text-xs font-bold tabular-nums ${onStage ? 'text-white' : 'text-text-muted'}`}>{at + 1}/{list.length}</span>
              </div>
              <div key={p.question.id} className={`relative rounded-3xl border border-border bg-bg-card p-5 shadow-xl animate-question-in ${mark && !mark.correct ? 'animate-shake' : ''}`}>
                {mark?.correct && <Confetti />}
                <HuntQuestion
                  question={p.question}
                  cooldown={0}
                  busy={!!mark}
                  onAnswer={(a) => answer(p, a)}
                  loadImage={loadImage}
                  tileColors={look.tiles}
                  reveal={mark ? { given: mark.given, answer: mark.answer } : undefined}
                />
                {mark && <Marked check={mark} fresh streak={mark.correct ? streakAt(at) : 0} />}
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setAt(at + 1)}
                  className={mark
                    ? 'btn-3d px-5 py-2.5 bg-accent-green text-bg-primary font-display font-extrabold flex items-center gap-1 animate-pop-in'
                    : `px-3 py-2 text-sm font-bold flex items-center gap-1 ${onStage ? 'text-white/85 hover:text-white' : 'text-text-muted hover:text-text-primary'}`}
                >
                  <FormattedMessage id={mark ? 'tests.next' : 'tests.skip'} /> <Icon icon="lucide:chevron-right" />
                </button>
              </div>
            </>
          ) : (
            <div className="relative overflow-hidden rounded-3xl bg-bg-card p-6 text-center space-y-3 animate-bounce-in">
              <Confetti count={40} />
              <p className="text-lg font-display font-extrabold text-text-primary"><FormattedMessage id="tests.previewDone" /></p>
              <button type="button" onClick={() => { setAt(0); setMarks({}); }} className="btn-3d px-5 py-2.5 bg-accent-cyan text-bg-primary font-bold">
                <FormattedMessage id="tests.previewAgain" />
              </button>
            </div>
          )}
        </ThemedStage>
      </div>
    </div>,
    document.body,
  );
}

const sample = (id: string, prompt: string, answer: string, options: string[]): PreviewQuestion => ({
  question: { id, type: 'definition', prompt, options, image: null, slotPrompts: null, say: null, scrambled: null, length: null },
  answer,
});

/** For a teacher who hasn't written questions yet — or the owner's view of a sent test. */
const SAMPLES: PreviewQuestion[] = [
  sample('s1', 'A journey for pleasure, often to another country', 'trip', ['trip', 'ticket', 'luggage', 'border']),
  sample('s2', 'The bags you take with you when you travel', 'luggage', ['passport', 'luggage', 'souvenir', 'hostel']),
  sample('s3', 'A small object you buy to remember a place', 'souvenir', ['map', 'guide', 'souvenir', 'visa']),
];
