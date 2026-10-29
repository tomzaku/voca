import { useState, useCallback, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';
import { FormattedMessage, useIntl } from 'react-intl';
import { speakText, stopSpeaking, preloadTts } from '../lib/tts';

// Shared pieces for practising a two-person script — Daily Dialogue and IELTS
// Speaking. A script is read like a chat; it can be listened to with two
// voices, or role-played: the learner takes one side, those lines are hidden,
// and playback stops on each one so they say it first.

export type Speaker = 'a' | 'b';
export type Tone = 'green' | 'cyan' | 'orange';
/** `listen` plays everything; a speaker means "I'm playing this side". */
export type Mode = 'listen' | Speaker;

export interface ScriptLine {
  speaker: Speaker;
  text: string;
  voice: string;
}

// Spelled out in full — Tailwind only keeps classes it finds as whole strings.
const TONE: Record<Tone, { avatar: string; name: string; bubble: string; ring: string }> = {
  green: { avatar: 'bg-accent-green/15 text-accent-green', name: 'text-accent-green', bubble: 'bg-bg-card border-border', ring: 'ring-accent-green/60' },
  orange: { avatar: 'bg-accent-orange/15 text-accent-orange', name: 'text-accent-orange', bubble: 'bg-bg-card border-border', ring: 'ring-accent-orange/60' },
  cyan: { avatar: 'bg-accent-cyan/15 text-accent-cyan', name: 'text-accent-cyan', bubble: 'bg-accent-cyan/[0.07] border-accent-cyan/20', ring: 'ring-accent-cyan/60' },
};

/* ─── Playback ───────────────────────────────────────────────── */
export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'waiting';

/**
 * Plays a script line by line. With `pauseOn`, it stops on that speaker's
 * lines (`waiting`) until `resume()` — the learner says the line first. Each
 * run carries a token so a stop, or a newer run, ends an older loop at its
 * next step even if its last `speakText` never settles.
 */
export function useScriptPlayer(lines: ScriptLine[], pauseOn: Speaker | null, onFinish: () => void) {
  const [status, setStatus] = useState<PlayerStatus>('idle');
  const [index, setIndex] = useState(-1);
  const runRef = useRef(0);
  const resumeRef = useRef<(() => void) | null>(null);
  const finishRef = useRef(onFinish);
  useEffect(() => { finishRef.current = onFinish; });

  const stop = useCallback(() => {
    runRef.current++;
    resumeRef.current?.();
    stopSpeaking();
    setStatus('idle');
    setIndex(-1);
  }, []);

  // A new script or role invalidates whatever was playing.
  useEffect(() => stop, [lines, pauseOn, stop]);

  useEffect(() => {
    const id = setTimeout(() => preloadTts(), 1500);
    return () => clearTimeout(id);
  }, []);

  const say = useCallback(async (i: number, token: number) => {
    setIndex(i);
    setStatus('loading');
    await speakText(lines[i].text, {
      voice: lines[i].voice,
      onStart: () => { if (runRef.current === token) setStatus('playing'); },
    }).catch(() => {});
  }, [lines]);

  const playFrom = useCallback(async (from: number) => {
    resumeRef.current?.();
    const token = ++runRef.current;
    for (let i = from; i < lines.length; i++) {
      if (runRef.current !== token) return;
      if (pauseOn && lines[i].speaker === pauseOn) {
        setIndex(i);
        setStatus('waiting');
        await new Promise<void>((r) => { resumeRef.current = r; });
        resumeRef.current = null;
        continue;
      }
      await say(i, token);
    }
    if (runRef.current !== token) return;
    setStatus('idle');
    setIndex(-1);
    finishRef.current();
  }, [lines, pauseOn, say]);

  /** One line on its own — tapping a bubble. */
  const playLine = useCallback(async (i: number) => {
    resumeRef.current?.();
    const token = ++runRef.current;
    await say(i, token);
    if (runRef.current !== token) return;
    setStatus('idle');
    setIndex(-1);
  }, [say]);

  const resume = useCallback(() => resumeRef.current?.(), []);

  return { status, index, playFrom, playLine, resume, stop, running: status !== 'idle' };
}
export type ScriptPlayer = ReturnType<typeof useScriptPlayer>;

/* ─── Mode switch + play button (sticky) ─────────────────────── */
export function PlayerBar({ modes, mode, onMode, player, total }: {
  modes: { id: Mode; label: string; icon: string }[];
  mode: Mode;
  onMode: (m: Mode) => void;
  player: ScriptPlayer;
  total: number;
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
      <div className="ml-auto flex items-center gap-2">
        {player.running && player.index >= 0 && (
          <span className="text-[11px] tabular-nums text-text-muted">{player.index + 1}/{total}</span>
        )}
        <button
          onClick={() => (player.running ? player.stop() : player.playFrom(0))}
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
export function Transcript({ lines, names, tones, mode, player, revealed, onReveal, renderText }: {
  lines: ScriptLine[];
  names: Record<Speaker, string>;
  tones: Record<Speaker, Tone>;
  mode: Mode;
  player: ScriptPlayer;
  revealed: Set<number>;
  onReveal: (i: number) => void;
  /** Custom body for a line (e.g. a cue card); `null` keeps the plain text. */
  renderText?: (line: ScriptLine, i: number) => React.ReactNode | null;
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
        const hidden = mine && !revealed.has(i);
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
                  } ${active ? `ring-2 ${tone.ring} shadow-sm` : ''}`}
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
export function YourTurnBar({ title, hint, onContinue, children }: {
  title: string;
  hint: React.ReactNode;
  onContinue: () => void;
  /** Extra content beside the hint — a speaking timer. */
  children?: React.ReactNode;
}) {
  return (
    <div className="sticky bottom-[max(1rem,env(safe-area-inset-bottom))] z-[5] mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-accent-yellow/30 bg-bg-card/95 backdrop-blur px-3.5 py-2.5 shadow-lg animate-fade-in">
      <span className="w-8 h-8 rounded-full bg-accent-yellow/15 text-accent-yellow flex items-center justify-center shrink-0">
        <Icon icon="lucide:mic" width={16} />
      </span>
      <span className="flex-1 min-w-[10rem] text-xs text-text-secondary">
        <span className="block font-bold text-text-primary">{title}</span>
        {hint}
      </span>
      {children}
      <button
        onClick={onContinue}
        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-accent-yellow text-bg-primary hover:opacity-90 cursor-pointer shrink-0"
      >
        <FormattedMessage id="speaking.revealContinue" /> <Icon icon="lucide:arrow-right" width={13} />
      </button>
    </div>
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
