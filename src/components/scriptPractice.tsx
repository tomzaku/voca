import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { FormattedMessage, useIntl } from 'react-intl';
import { speakText, stopSpeaking } from '../lib/tts';
import { AnswerPanel, Playback, RecordButton, useAnswerRecorder } from './AnswerRecorder';
import { SentenceScorePanel } from './pronunciation/SentenceScore';
import type { SilenceStop } from '../hooks/useVoiceRecorder';
import { gradeDictation } from '../lib/listeningRules';
import { TEXT, tone } from './pronunciation/styles';
import type { SentenceScore } from '../lib/phonemeScore';

// Shared pieces for practising a two-person script — Daily Dialogue and IELTS
// Speaking. A script is read like a chat; it can be listened to with two
// voices, or role-played: the learner takes one side, those lines are hidden,
// and playback stops on each one so they say it first.

import type { Speaker, Mode, ScriptLine, ScriptPlayer } from '../hooks/useScriptPlayer';
export type Tone = 'green' | 'cyan' | 'orange';

// Spelled out in full — Tailwind only keeps classes it finds as whole strings.
const TONE: Record<Tone, { avatar: string; name: string; bubble: string; ring: string }> = {
  green: { avatar: 'bg-accent-green/15 text-accent-green', name: 'text-accent-green', bubble: 'bg-bg-card border-border', ring: 'ring-accent-green/60' },
  orange: { avatar: 'bg-accent-orange/15 text-accent-orange', name: 'text-accent-orange', bubble: 'bg-bg-card border-border', ring: 'ring-accent-orange/60' },
  cyan: { avatar: 'bg-accent-cyan/15 text-accent-cyan', name: 'text-accent-cyan', bubble: 'bg-accent-cyan/[0.07] border-accent-cyan/20', ring: 'ring-accent-cyan/60' },
};

/* ─── Mode switch + play button (sticky) ─────────────────────── */
export function PlayerBar({ modes, mode, onMode, player, total, shadow, onShadow, handsFree, onHandsFree, onStart }: {
  modes: { id: Mode; label: string; icon: string }[];
  mode: Mode;
  onMode: (m: Mode) => void;
  player: ScriptPlayer;
  total: number;
  /** Shadowing — offered only while role-playing. */
  shadow?: boolean;
  onShadow?: (on: boolean) => void;
  /** No Continue to press — each turn moves on once it's been heard. */
  handsFree?: boolean;
  onHandsFree?: (on: boolean) => void;
  /** A run from the top is starting. */
  onStart?: () => void;
}) {
  const intl = useIntl();
  const starting = player.status === 'loading' && player.index === 0;
  return (
    <div className="sticky top-[calc(4.5rem+env(safe-area-inset-top))] z-[5] mt-3 p-2 rounded-xl border border-border bg-bg-card/90 backdrop-blur shadow-sm flex flex-wrap items-center gap-2">
      <div className="flex gap-0.5 p-0.5 rounded-lg bg-bg-tertiary overflow-x-auto [scrollbar-width:none]" role="radiogroup" aria-label={intl.formatMessage({ id: 'speaking.howToPractice' })}>
        {modes.map((m) => (
          <button
            key={m.id}
            role="radio"
            aria-checked={mode === m.id}
            onClick={() => onMode(m.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              mode === m.id ? 'bg-bg-card text-accent-cyan shadow-sm' : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            <Icon icon={m.icon} width={13} /> {m.label}
          </button>
        ))}
      </div>
      {mode !== 'listen' && onShadow && (
        <button
          onClick={() => onShadow(!shadow)}
          aria-pressed={!!shadow}
          title={intl.formatMessage({ id: 'speaking.shadowTitle' })}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            shadow ? 'bg-accent-cyan/10 text-accent-cyan' : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          <Icon icon={shadow ? 'lucide:eye' : 'lucide:eye-off'} width={13} />
          <FormattedMessage id="speaking.shadow" />
        </button>
      )}
      {mode !== 'listen' && onHandsFree && (
        <button
          onClick={() => onHandsFree(!handsFree)}
          aria-pressed={!!handsFree}
          title={intl.formatMessage({ id: 'speaking.handsFreeTitle' })}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            handsFree ? 'bg-accent-cyan/10 text-accent-cyan' : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          <Icon icon={handsFree ? 'lucide:toggle-right' : 'lucide:toggle-left'} width={14} />
          <FormattedMessage id="speaking.handsFree" />
        </button>
      )}
      <div className="ml-auto flex items-center gap-2">
        {player.running && player.index >= 0 && (
          <span className="text-[11px] tabular-nums text-text-muted">{player.index + 1}/{total}</span>
        )}
        <button
          onClick={() => { if (player.running) player.stop(); else { onStart?.(); void player.playFrom(0); } }}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
            player.running ? 'bg-bg-tertiary text-text-primary hover:bg-bg-hover' : 'bg-accent-cyan text-bg-primary hover:opacity-90'
          }`}
        >
          <Icon
            icon={starting ? 'lucide:loader-circle' : player.running ? 'lucide:square' : 'lucide:play'}
            width={13}
            className={starting ? 'animate-spin' : ''}
          />
          {intl.formatMessage({ id: player.running ? 'speaking.stop' : mode === 'listen' ? 'speaking.playAll' : 'speaking.startRolePlay' })}
        </button>
      </div>
    </div>
  );
}

/* ─── The transcript ─────────────────────────────────────────── */
export function Transcript({ lines, names, tones, mode, player, revealed, onReveal, renderText, showAll = false }: {
  lines: ScriptLine[];
  names: Record<Speaker, string>;
  tones: Record<Speaker, Tone>;
  mode: Mode;
  player: ScriptPlayer;
  revealed: Set<number>;
  onReveal: (i: number) => void;
  /** Custom body for a line (e.g. a cue card); `null` keeps the plain text. */
  renderText?: (line: ScriptLine, i: number) => React.ReactNode | null;
  /** Shadowing — the learner's lines are shown, not hidden. */
  showAll?: boolean;
}) {
  const intl = useIntl();
  // Keep the line being spoken (or waited on) in view.
  useEffect(() => {
    if (player.index < 0) return;
    document.getElementById(`script-line-${player.index}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [player.index]);

  return (
    <div className="mt-4 space-y-3 rounded-xl border border-border bg-bg-tertiary/30 px-3 py-4 sm:px-5">
      {lines.map((line, i) => {
        const tone = TONE[tones[line.speaker]];
        const name = names[line.speaker];
        const mine = mode === line.speaker;
        const hidden = mine && !showAll && !revealed.has(i);
        const waiting = player.status === 'waiting' && player.index === i;
        const active = player.index === i && (player.status === 'playing' || player.status === 'loading');
        const right = line.speaker === 'b';
        const custom = renderText?.(line, i) ?? null;

        return (
          <div key={i} id={`script-line-${i}`} className={`flex items-end gap-2 scroll-mt-40 ${right ? 'flex-row-reverse' : ''}`}>
            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${tone.avatar}`} aria-hidden>
              {mine ? <Icon icon="lucide:user-round" width={15} /> : name.charAt(0).toUpperCase()}
            </span>
            <div className={`max-w-[85%] sm:max-w-[78%] flex flex-col ${right ? 'items-end' : 'items-start'}`}>
              <span className={`text-[10px] font-semibold mb-1 px-1 ${tone.name}`}>
                {mine ? intl.formatMessage({ id: 'speaking.nameYou' }, { name }) : name}
              </span>
              {hidden ? (
                <button
                  onClick={() => onReveal(i)}
                  className={`group rounded-2xl border border-dashed px-3.5 py-2.5 text-left transition-all cursor-pointer ${
                    right ? 'rounded-br-md' : 'rounded-bl-md'
                  } ${waiting ? 'border-accent-yellow/60 bg-accent-yellow/10 ring-2 ring-accent-yellow/40' : 'border-border bg-bg-tertiary/60 hover:border-text-muted'}`}
                >
                  {/* Only the first stretch is blurred — a long answer would be a wall of blur. */}
                  <span className="text-sm text-text-secondary blur-[5px] select-none line-clamp-3" aria-hidden>{line.text}</span>
                  <span className={`flex items-center gap-1.5 mt-1.5 text-[11px] font-semibold ${waiting ? 'text-accent-yellow' : 'text-text-muted group-hover:text-text-secondary'}`}>
                    <Icon icon={waiting ? 'lucide:mic' : 'lucide:eye'} width={12} />
                    {intl.formatMessage({ id: waiting ? 'speaking.yourTurnReveal' : 'speaking.tapToReveal' })}
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => player.playLine(i)}
                  title={intl.formatMessage({ id: 'speaking.listenLine' })}
                  className={`rounded-2xl border px-3.5 py-2.5 text-left text-sm leading-relaxed text-text-primary whitespace-pre-line transition-all cursor-pointer hover:brightness-[1.03] ${tone.bubble} ${
                    right ? 'rounded-br-md' : 'rounded-bl-md'
                  } ${active ? `ring-2 ${tone.ring} shadow-sm` : waiting ? 'ring-2 ring-accent-yellow/50' : ''}`}
                >
                  {custom ?? line.text}
                  {active && (
                    <Icon icon="lucide:audio-lines" width={13} className={`inline-block ml-1.5 -mb-0.5 animate-pulse ${tone.name}`} />
                  )}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── "Your turn" bar while role-play waits ──────────────────── */

/** A dialogue line: a breath between phrases mustn't end it. */
const LINE_SILENCE: SilenceStop = { quietMs: 1800, noVoiceMs: 8000 };

const AUTO_KEY = 'voca.autoRecordTurn';
const readFlag = (key: string, fallback: boolean) => {
  try { const v = localStorage.getItem(key); return v === null ? fallback : v === '1'; } catch { return fallback; }
};
const writeFlag = (key: string, on: boolean) => { try { localStorage.setItem(key, on ? '1' : '0'); } catch { /* private mode */ } };

/** A practice preference remembered across scripts — a learner who shadows keeps shadowing. */
function useStoredFlag(key: string) {
  const [on, setOn] = useState(() => readFlag(key, false));
  const set = (v: boolean) => { setOn(v); writeFlag(key, v); };
  return [on, set] as const;
}
export const useShadowing = () => useStoredFlag('voca.shadowScript');
export const useHandsFree = () => useStoredFlag('voca.handsFreeScript');

/**
 * With `say`, the bar records the turn: the mic opens by itself as the turn
 * starts (unless Auto-record is off), stops once you've gone quiet, and shows
 * what was heard and — where the device can score — how each word sounded,
 * against the line itself when you said it, or your own words when you didn't
 * (see useAnswerRecorder). Mount it keyed by the turn, so each one starts fresh.
 */
export function YourTurnBar({ title, hint, onContinue, children, say, onAnswered, silence = LINE_SILENCE, continueLabel, handsFree = false, onResult, scripted = false }: {
  title: string;
  hint: React.ReactNode;
  onContinue: () => void;
  /** Extra content beside the hint — a speaking timer. */
  children?: React.ReactNode;
  /** The line the learner should say; records and checks the turn. */
  say?: string;
  /** Something was heard — e.g. reveal the line to compare. */
  onAnswered?: () => void;
  silence?: SilenceStop;
  /** The line is already on screen (shadowing) — nothing left to reveal. */
  continueLabel?: string;
  /** Records whatever Auto-record says, and moves on by itself once the turn is heard and scored. */
  handsFree?: boolean;
  /** Each finished try — the newest one is the turn's result. */
  onResult?: (r: TurnResult) => void;
  /** `say` is the very line to repeat (a dialogue, shadowing), not a model answer. */
  scripted?: boolean;
}) {
  const intl = useIntl();
  const rec = useAnswerRecorder(onAnswered, say, { stopOnSilence: silence, scripted });
  const [auto, setAuto] = useState(() => readFlag(AUTO_KEY, true));
  const recordable = say !== undefined && rec.phase !== 'unsupported';

  // Settled: transcribed, and scored where the device scores.
  const settled = rec.phase === 'idle' && rec.heard !== null && rec.pronunciation.status !== 'working';
  const continueRef = useRef(onContinue);
  const resultRef = useRef(onResult);
  useEffect(() => { continueRef.current = onContinue; resultRef.current = onResult; });
  useEffect(() => {
    if (!settled) return;
    const p = rec.pronunciation;
    resultRef.current?.({
      heard: rec.heard ?? '',
      score: p.status === 'done' ? p.result.score : null,
      detail: p.status === 'done' ? p.result : null,
      audio: rec.audio,
    });
    if (!handsFree) return;
    // Long enough to glance at the score before the next line starts.
    const t = setTimeout(() => continueRef.current(), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled, handsFree]);

  const started = useRef(false);
  useEffect(() => {
    if (!recordable || !(auto || handsFree) || started.current) return;
    started.current = true;
    rec.start();
    // Once per turn: a later toggle of Auto doesn't re-record this one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleAuto = () => {
    const on = !auto;
    setAuto(on);
    writeFlag(AUTO_KEY, on);
    if (on && rec.phase === 'idle' && rec.heard === null) { started.current = true; rec.start(); }
    else if (!on && rec.phase === 'recording') rec.stop();
  };

  const scored = rec.pronunciation.status !== 'off' && rec.pronunciation.status !== 'idle' && rec.phase !== 'recording';
  const showResult = rec.phase === 'denied' || rec.phase === 'recording' || rec.phase === 'thinking' || rec.heard !== null;

  return (
    <div className="sticky bottom-[max(1rem,env(safe-area-inset-bottom))] z-[5] mt-3 rounded-xl border border-accent-yellow/30 bg-bg-card/95 backdrop-blur shadow-lg animate-fade-in overflow-hidden">
      {recordable && showResult && (
        <div className="max-h-[45vh] overflow-y-auto border-b border-border [&>*:first-child]:border-t-0">
          <AnswerPanel rec={rec} />
          {scored && (
            <SentenceScorePanel
              state={rec.pronunciation}
              onHearWord={(w) => { stopSpeaking(); void speakText(w); }}
              className="px-3 sm:px-4 py-3 border-t border-border"
            />
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3.5 py-2.5">
        <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          rec.phase === 'recording' ? 'bg-accent-red/15 text-accent-red animate-pulse' : 'bg-accent-yellow/15 text-accent-yellow'
        }`}>
          <Icon icon="lucide:mic" width={16} />
        </span>
        <span className="flex-1 min-w-[10rem] text-xs text-text-secondary">
          <span className="block font-bold text-text-primary">{title}</span>
          {hint}
        </span>
        {children}
        {recordable && (
          <>
            <button
              onClick={toggleAuto}
              aria-pressed={auto}
              title={intl.formatMessage({ id: 'speaking.autoRecordTitle' })}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold transition-colors cursor-pointer shrink-0 ${
                auto ? 'bg-accent-red/10 text-accent-red' : 'bg-bg-tertiary text-text-muted hover:text-text-secondary'
              }`}
            >
              <Icon icon={auto ? 'lucide:toggle-right' : 'lucide:toggle-left'} width={15} />
              <FormattedMessage id="speaking.autoRecord" />
            </button>
            <RecordButton rec={rec} />
          </>
        )}
        <button
          onClick={() => { if (rec.phase === 'recording') rec.stop(); onContinue(); }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-accent-yellow text-bg-primary hover:opacity-90 cursor-pointer shrink-0"
        >
          {continueLabel ?? <FormattedMessage id="speaking.revealContinue" />} <Icon icon="lucide:arrow-right" width={13} />
        </button>
      </div>
    </div>
  );
}

/* ─── Summary once a role-play ends ──────────────────────────── */
export interface TurnResult {
  heard: string;
  /** Sound-by-sound score, where the device scores. */
  score: number | null;
  /** Word by word and sound by sound, for showing what went wrong. */
  detail: SentenceScore | null;
  /** The try itself, to hear again — held in memory only, for this run. */
  audio: Blob | null;
}

/**
 * How each of the learner's turns went, after the run. Without an on-device
 * score, `matchScript` falls back to how many of the line's words were heard
 * — right for a line to repeat, meaningless for a free answer.
 */
export function TurnSummary({ lines, results, matchScript, onReplay, onClose }: {
  lines: ScriptLine[];
  results: Map<number, TurnResult>;
  matchScript: boolean;
  onReplay: () => void;
  onClose: () => void;
}) {
  const intl = useIntl();
  const rows = [...results.entries()].sort((a, b) => a[0] - b[0]).map(([i, r]) => {
    const grade = matchScript && !r.detail ? gradeDictation(lines[i].text, r.heard) : null;
    const value = r.score ?? (grade && r.heard ? grade.accuracy : null);
    return { i, r, value, grade };
  });
  const scored = rows.filter((x) => x.value !== null).map((x) => x.value as number);
  const avg = scored.length ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length) : null;
  // Opens on the weakest line — the one worth another go.
  const [open, setOpen] = useState<number | null>(() => {
    const weakest = rows.filter((x) => x.value !== null).sort((a, b) => (a.value as number) - (b.value as number))[0];
    return weakest && (weakest.value as number) < 85 ? weakest.i : null;
  });
  // One playable URL per try, made and released by the same effect — so a
  // dev-mode remount can't leave the summary holding revoked ones.
  const [urls, setUrls] = useState<Map<number, string>>(() => new Map());
  useEffect(() => {
    const made = new Map([...results].flatMap(([i, r]) => (r.audio ? [[i, URL.createObjectURL(r.audio)] as const] : [])));
    setUrls(made); // eslint-disable-line react-hooks/set-state-in-effect
    return () => made.forEach((u) => URL.revokeObjectURL(u));
  }, [results]);
  // It appears as the run ends, wherever the transcript left the page.
  const ref = useRef<HTMLElement>(null);
  useEffect(() => { ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, []);

  return (
    <section ref={ref} className="mt-4 rounded-xl border border-accent-cyan/25 bg-bg-card p-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <span className="w-9 h-9 rounded-full bg-accent-cyan/10 text-accent-cyan flex items-center justify-center shrink-0">
          <Icon icon="lucide:clipboard-check" width={17} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-text-primary"><FormattedMessage id="speaking.summaryTitle" /></p>
          <p className="text-xs text-text-muted">
            <FormattedMessage id="speaking.summaryCount" values={{ count: rows.length }} />
            {' · '}
            <FormattedMessage id="speaking.summaryTapHint" />
          </p>
        </div>
        {avg !== null && <span className={`text-2xl font-extrabold tabular-nums ${TEXT[tone(avg)]}`}>{avg}</span>}
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-hover/60 cursor-pointer"
          aria-label={intl.formatMessage({ id: 'speaking.summaryClose' })}
        >
          <Icon icon="lucide:x" width={15} />
        </button>
      </div>

      <ul className="mt-3 divide-y divide-border">
        {rows.map(({ i, r, value, grade }) => {
          const expanded = open === i;
          const url = urls.get(i);
          return (
            <li key={i} className="py-2.5">
              <div className="flex items-start gap-3">
                <span className={`w-10 text-right text-sm font-bold tabular-nums shrink-0 mt-0.5 ${value === null ? 'text-text-muted' : TEXT[tone(value)]}`}>
                  {value ?? '—'}
                </span>
                <button
                  onClick={() => setOpen(expanded ? null : i)}
                  aria-expanded={expanded}
                  className="flex-1 min-w-0 text-left cursor-pointer group"
                >
                  <span className="block text-sm text-text-primary leading-snug group-hover:text-accent-cyan transition-colors">{lines[i].text}</span>
                  <span className="block mt-0.5 text-xs text-text-muted italic leading-snug">
                    {r.heard ? `“${r.heard}”` : intl.formatMessage({ id: 'conversation.recordNothingHeard' })}
                  </span>
                </button>
                <span className="flex items-center gap-1 shrink-0">
                  {url && <Playback url={url} />}
                  <button
                    onClick={() => speakText(lines[i].text, { voice: lines[i].voice }).catch(() => {})}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-text-muted hover:text-accent-cyan hover:bg-bg-hover/60 cursor-pointer"
                    aria-label={intl.formatMessage({ id: 'speaking.listenLine' })}
                    title={intl.formatMessage({ id: 'speaking.listenLine' })}
                  >
                    <Icon icon="lucide:volume-2" width={14} />
                  </button>
                  <Icon icon={expanded ? 'lucide:chevron-up' : 'lucide:chevron-down'} width={14} className="text-text-muted" />
                </span>
              </div>

              {expanded && (
                <div className="mt-2 ml-[3.25rem] rounded-xl border border-border bg-bg-tertiary/40 p-3 animate-fade-in">
                  {r.detail ? (
                    <SentenceScorePanel
                      state={{ status: 'done', result: r.detail }}
                      onHearWord={(w) => { stopSpeaking(); void speakText(w); }}
                    />
                  ) : grade ? (
                    <>
                      <p className="text-[15px] leading-loose">
                        {grade.words.map((w, k) => (
                          <span key={k} className={w.ok ? 'text-text-primary' : 'text-accent-red bg-accent-red/10 rounded px-0.5 line-through decoration-2'}>
                            {w.word}{' '}
                          </span>
                        ))}
                      </p>
                      <p className="mt-1 text-xs text-text-muted"><FormattedMessage id="speaking.summaryMissedHint" /></p>
                    </>
                  ) : (
                    <p className="text-xs text-text-muted"><FormattedMessage id="speaking.summaryNoDetail" /></p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <button
        onClick={onReplay}
        className="mt-3 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-accent-cyan text-bg-primary hover:opacity-90 cursor-pointer"
      >
        <Icon icon="lucide:rotate-ccw" width={13} /> <FormattedMessage id="speaking.summaryAgain" />
      </button>
    </section>
  );
}

/* ─── Sidebar progress card ──────────────────────────────────── */
export function ProgressCard({ done, total, children }: { done: number; total: number; children?: React.ReactNode }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="rounded-xl border border-border bg-bg-card p-4">
      <div className="flex items-end justify-between gap-3 mb-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted"><FormattedMessage id="speaking.yourProgress" /></p>
          <p className="text-2xl font-extrabold text-text-primary leading-tight">
            {done}<span className="text-sm font-semibold text-text-muted"> / {total}</span>
          </p>
        </div>
        <span className="text-sm font-bold text-accent-green">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
        <div className="h-full rounded-full bg-accent-green transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      {children}
    </div>
  );
}

/** Practiced toggle for a script's header. */
export function PracticedButton({ done, onToggle }: { done: boolean; onToggle: () => void }) {
  const intl = useIntl();
  return (
    <button
      onClick={onToggle}
      aria-pressed={done}
      title={intl.formatMessage({ id: done ? 'speaking.practicedUndo' : 'speaking.markAsPracticed' })}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
        done ? 'text-accent-green bg-accent-green/10 hover:bg-accent-green/15' : 'bg-accent-green text-bg-primary hover:opacity-90'
      }`}
    >
      <Icon icon={done ? 'lucide:circle-check' : 'lucide:check'} width={14} />
      {intl.formatMessage({ id: done ? 'speaking.practiced' : 'speaking.markPracticed' })}
    </button>
  );
}

/** Tappable phrase chips that read themselves aloud. */
export function PhraseChips({ phrases, voice }: { phrases: string[]; voice: string }) {
  const intl = useIntl();
  return (
    <div className="flex flex-wrap gap-1.5">
      {phrases.map((phrase) => (
        <button
          key={phrase}
          onClick={() => speakText(phrase, { voice }).catch(() => {})}
          title={intl.formatMessage({ id: 'speaking.listen' })}
          className="text-xs px-2.5 py-1 rounded-full bg-accent-yellow/10 text-text-secondary border border-accent-yellow/15 hover:text-text-primary hover:border-accent-yellow/40 transition-colors cursor-pointer"
        >
          {phrase}
        </button>
      ))}
    </div>
  );
}
