import { Icon } from '@iconify/react';
import { FormattedMessage, useIntl } from 'react-intl';
import type { CaptionLine } from '../lib/captions';
import type { DictationGrade } from '../lib/listeningRules';
import { KARAOKE_HIT, type KaraokeSummary } from '../lib/karaoke';

// What video karaoke shows: the two ways to start it, the stage while a run
// is on (the line, whose turn it is, the last line's score) and the score card
// at the end. VideoShadowTab runs the song and the recorder; these only draw it.

export type KaraokeStep = 'listen' | 'sing' | 'check' | 'paused';

const VERDICT = ['speaking.karaokeVerdict0', 'speaking.karaokeVerdict1', 'speaking.karaokeVerdict2', 'speaking.karaokeVerdict3'];

const tone = (accuracy: number) => (accuracy >= KARAOKE_HIT ? 'text-accent-green' : accuracy >= 50 ? 'text-accent-orange' : 'text-accent-red');

/** A sing-along's transcript runs the whole song; show only what was just sung. */
const TAIL_WORDS = 8;
function tail(text: string): string {
  const words = text.trim().split(/\s+/);
  return words.length > TAIL_WORDS ? `… ${words.slice(-TAIL_WORDS).join(' ')}` : text;
}

const ghost ='flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-bg-tertiary text-text-secondary hover:text-text-primary transition-all cursor-pointer';

/** The way in: sing back line by line, or along with the song in headphones. */
export function KaraokeModes({ ready, onLineByLine, onAlong }: {
  /** The player can play — before that, a run would stall on its first line. */
  ready: boolean;
  onLineByLine: () => void;
  onAlong: () => void;
}) {
  const mode = 'group flex items-start gap-3 text-left rounded-xl border-2 border-border bg-bg-tertiary/40 p-3 hover:border-accent-orange/60 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait';
  return (
    <div className="mt-4 rounded-xl border-2 border-border bg-bg-card p-4">
      <p className="flex items-center gap-1.5 text-sm font-bold text-text-primary mb-3">
        <Icon icon="lucide:mic-vocal" className="text-accent-orange" /><FormattedMessage id="speaking.karaoke" />
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <button onClick={onLineByLine} disabled={!ready} className={mode}>
          <Icon icon="lucide:list-music" className="text-xl text-accent-orange shrink-0 mt-0.5" />
          <span>
            <span className="block text-sm font-bold text-text-primary group-hover:text-accent-orange"><FormattedMessage id="speaking.karaokeLineMode" /></span>
            <span className="block text-xs text-text-muted mt-0.5"><FormattedMessage id="speaking.karaokeLineModeHint" /></span>
          </span>
        </button>
        <button onClick={onAlong} disabled={!ready} className={mode}>
          <Icon icon="lucide:headphones" className="text-xl text-accent-cyan shrink-0 mt-0.5" />
          <span>
            <span className="block text-sm font-bold text-text-primary group-hover:text-accent-orange"><FormattedMessage id="speaking.karaokeAlongMode" /></span>
            <span className="block text-xs text-text-muted mt-0.5"><FormattedMessage id="speaking.karaokeAlongModeHint" /></span>
          </span>
        </button>
      </div>
    </div>
  );
}

export function KaraokeStage({ mode, lines, queue, pos, step, level, heard, modelProgress, last, score, onSkip, onStop, onResume }: {
  mode: 'line' | 'along';
  lines: CaptionLine[];
  queue: number[];
  pos: number;
  step: KaraokeStep;
  /** Mic loudness 0–1, while singing. */
  level: number;
  /** What the recogniser has heard so far, while singing. */
  heard: string;
  modelProgress: number;
  /** The line just sung, for a moment after it's scored. */
  last: { grade: DictationGrade } | null;
  /** Mean so far; null before the first line. */
  score: number | null;
  onSkip: () => void;
  onStop: () => void;
  onResume: () => void;
}) {
  const intl = useIntl();
  const i = queue[pos];
  const line = lines[i];
  const prev = pos > 0 ? lines[queue[pos - 1]] : null;
  const next = pos + 1 < queue.length ? lines[queue[pos + 1]] : null;

  return (
    <div className="mt-4 rounded-xl border-2 border-accent-orange/40 bg-bg-card p-4">
      <div className="flex items-center gap-3 mb-3">
        <span className="flex items-center gap-1.5 text-xs font-bold text-accent-orange">
          <Icon icon={mode === 'along' ? 'lucide:headphones' : 'lucide:mic-vocal'} />
          <FormattedMessage id={mode === 'along' ? 'speaking.karaokeAlongMode' : 'speaking.karaoke'} />
        </span>
        <div className="flex-1 h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
          <div className="h-full bg-accent-orange transition-[width] duration-300" style={{ width: `${(pos / queue.length) * 100}%` }} />
        </div>
        <span className="text-xs tabular-nums text-text-muted">{pos + 1} / {queue.length}</span>
        {score !== null && <span className={`text-xs font-bold tabular-nums ${tone(score)}`}>{score}%</span>}
      </div>

      <div className="text-center py-2 space-y-2">
        {prev && <p className="text-sm text-text-muted/70 line-clamp-1">{prev.text}</p>}
        <p className={`text-xl sm:text-2xl font-bold leading-snug transition-colors ${step === 'sing' ? 'text-accent-orange' : 'text-text-primary'}`}>
          {line?.text}
        </p>
        {next && <p className="text-sm text-text-muted/70 line-clamp-1">{next.text}</p>}
      </div>

      <div className="mt-3 min-h-[3.25rem] flex flex-col items-center justify-center gap-2 text-sm">
        {step === 'listen' && (
          <span className="flex items-center gap-2 text-text-secondary">
            <Icon icon="lucide:headphones" className="text-accent-cyan" />
            <FormattedMessage id={mode === 'along' ? 'speaking.karaokeAlongReady' : 'speaking.karaokeListen'} />
          </span>
        )}
        {step === 'sing' && (
          <>
            <span className="flex items-center gap-2 font-bold text-accent-orange">
              <Icon icon="lucide:mic" className="animate-pulse" />
              <FormattedMessage id={mode === 'along' ? 'speaking.karaokeAlongSing' : 'speaking.karaokeSing'} />
            </span>
            <span className="flex items-end gap-0.5 h-4" aria-hidden>
              {[0.15, 0.3, 0.45, 0.6, 0.75, 0.9].map((t) => (
                <span key={t} className={`w-1.5 rounded-sm transition-colors ${level >= t ? 'bg-accent-orange' : 'bg-bg-tertiary'}`} style={{ height: `${t * 100}%` }} />
              ))}
            </span>
            {heard && <span className="text-xs italic text-text-muted line-clamp-1">“{mode === 'along' ? tail(heard) : heard}”</span>}
          </>
        )}
        {step === 'check' && (
          <span className="flex items-center gap-2 text-text-muted">
            <span className="w-3.5 h-3.5 rounded-full border-2 border-accent-orange/30 border-t-accent-orange animate-spin" />
            {modelProgress > 0 && modelProgress < 100
              ? intl.formatMessage({ id: 'games.speakPreparingModel' }, { pct: Math.round(modelProgress) })
              : <FormattedMessage id="speaking.karaokeChecking" />}
          </span>
        )}
        {step === 'paused' && (
          <>
            <span className="text-text-secondary text-center"><FormattedMessage id="speaking.karaokePaused" /></span>
            <button onClick={onResume} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-accent-orange text-bg-primary cursor-pointer hover:bg-accent-orange/90">
              <Icon icon="lucide:play" /><FormattedMessage id="speaking.karaokeResume" />
            </button>
          </>
        )}
      </div>

      {mode === 'line' && last && step === 'listen' && (
        <div className="mt-1 flex flex-wrap justify-center gap-1 animate-fade-in">
          <span className={`text-xs font-bold mr-1 ${tone(last.grade.accuracy)}`}>{last.grade.accuracy}%</span>
          {last.grade.words.map((w, k) => (
            <span key={k} className={`text-xs ${w.ok ? 'text-accent-green' : 'text-accent-red line-through'}`}>{w.word}</span>
          ))}
        </div>
      )}

      <div className="mt-4 flex justify-center gap-2">
        {mode === 'line' && step !== 'paused' && (
          <button onClick={onSkip} className={ghost}>
            <Icon icon="lucide:skip-forward" /><FormattedMessage id="speaking.karaokeSkip" />
          </button>
        )}
        <button onClick={onStop} className={ghost}>
          <Icon icon="lucide:flag" /><FormattedMessage id="speaking.karaokeStop" />
        </button>
      </div>
      <p className="mt-2 text-center text-[11px] text-text-muted max-sm:hidden">
        <FormattedMessage id={mode === 'along' ? 'speaking.karaokeAlongKeys' : 'speaking.karaokeKeys'} />
      </p>
    </div>
  );
}

export function KaraokeResult({ summary, lines, best, newBest, onRetryHardest, onAgain, onBack }: {
  summary: KaraokeSummary;
  lines: CaptionLine[];
  /** The best score on this video before this run; null the first time. */
  best: number | null;
  newBest: boolean;
  onRetryHardest: () => void;
  onAgain: () => void;
  onBack: () => void;
}) {
  return (
    <div className="mt-4 rounded-xl border-2 border-accent-orange/40 bg-bg-card p-5 text-center animate-fade-in">
      <p className="text-xs font-bold text-accent-orange flex items-center justify-center gap-1.5">
        <Icon icon="lucide:mic-vocal" /><FormattedMessage id="speaking.karaoke" />
      </p>
      <div className="mt-2 flex justify-center gap-1 text-3xl">
        {[1, 2, 3].map((n) => (
          <Icon key={n} icon="lucide:star" className={n <= summary.stars ? 'text-accent-orange fill-current' : 'text-border'} />
        ))}
      </div>
      <p className={`mt-1 text-5xl font-black tabular-nums ${tone(summary.score)}`}>{summary.score}%</p>
      <p className="mt-1 text-sm font-bold text-text-primary"><FormattedMessage id={VERDICT[summary.stars]} /></p>
      <p className="mt-1 text-xs text-text-muted">
        <FormattedMessage id="speaking.karaokeHits" values={{ hits: summary.hits, sung: summary.sung }} />
        {newBest
          ? <span className="ml-2 font-bold text-accent-green"><FormattedMessage id="speaking.karaokeNewBest" /></span>
          : best !== null && <span className="ml-2"><FormattedMessage id="speaking.karaokeBest" values={{ score: best }} /></span>}
      </p>

      {summary.hardest.length > 0 && (
        <div className="mt-4 text-left">
          <p className="text-xs font-semibold text-text-muted mb-1.5"><FormattedMessage id="speaking.karaokeHardest" /></p>
          <ul className="space-y-1">
            {summary.hardest.map((t) => (
              <li key={t.index} className="flex gap-2 text-sm">
                <span className={`shrink-0 w-10 text-right font-bold tabular-nums ${tone(t.accuracy)}`}>{t.accuracy}%</span>
                <span className="text-text-secondary">{lines[t.index]?.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {summary.hardest.length > 0 && (
          <button onClick={onRetryHardest} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-accent-orange text-bg-primary cursor-pointer hover:bg-accent-orange/90">
            <Icon icon="lucide:target" /><FormattedMessage id="speaking.karaokeRetryHard" />
          </button>
        )}
        <button onClick={onAgain} className={ghost}>
          <Icon icon="lucide:rotate-ccw" /><FormattedMessage id="speaking.karaokeAgain" />
        </button>
        <button onClick={onBack} className={ghost}>
          <Icon icon="lucide:list" /><FormattedMessage id="speaking.karaokeBack" />
        </button>
      </div>
    </div>
  );
}
