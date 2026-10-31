import { useEffect, useMemo, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { dialogues } from '../../data/englishDialogues';
import { ieltsConversations } from '../../data/englishIelts';
import { useScriptPlayer, type Mode, type ScriptLine } from '../../hooks/useScriptPlayer';
import { isPracticed, useSpeakingProgress } from '../../hooks/useSpeakingProgress';
import { IELTS_TURN_SECONDS, parseCueCard } from '../../lib/speakingRules';
import { CONV_VOICE_A, CONV_VOICE_B } from '../../lib/tts';
import { playCorrect, playSelect } from '../../lib/sfx';
import { HudCenter, HudDock, PixelBar, PixelButton, PixelChip, PixelIcon } from './pixel';

// Role-play at Đông Ba market: the Speak page's Daily Dialogues (everyday) and
// IELTS Speaking (academic) scripts, played by the same script player
// (useScriptPlayer) and marked practised in the same store. Listen to both
// voices, or take a side: your lines are hidden and playback waits on each so
// you say it first — in IELTS with the part's real turn time running.

type Source = 'dialogue' | 'ielts';

interface Script {
  id: string;
  title: string;
  group: string;        // topic, or IELTS part
  setting: string;      // the situation, or the part's description
  names: { a: string; b: string };
  lines: ScriptLine[];
  turnSeconds: number | null;
}

const IELTS_VOICES = { examiner: 'bf_emma', candidate: 'am_michael' } as const;

function scriptsFor(source: Source, intl: ReturnType<typeof useIntl>): Script[] {
  if (source === 'dialogue') {
    return dialogues.map((d) => ({
      id: d.id, title: d.title, group: d.topic, setting: d.situation, names: d.speakers,
      lines: d.lines.map((l) => ({ ...l, voice: l.speaker === 'a' ? CONV_VOICE_A : CONV_VOICE_B })),
      turnSeconds: null,
    }));
  }
  return ieltsConversations.map((c) => ({
    id: c.id, title: c.title.replace(/^Part \d\s*[—-]\s*/, ''), group: c.part, setting: c.description,
    names: { a: intl.formatMessage({ id: 'speaking.ieltsExaminer' }), b: intl.formatMessage({ id: 'speaking.ieltsCandidate' }) },
    lines: c.exchanges.map((e) => ({ speaker: e.role === 'examiner' ? 'a' : 'b', text: e.text, voice: IELTS_VOICES[e.role] })),
    turnSeconds: IELTS_TURN_SECONDS[c.part],
  }));
}

export function RolePlay({ source }: { source: Source }) {
  const intl = useIntl();
  const scripts = useMemo(() => scriptsFor(source, intl), [source, intl]);
  const progress = useSpeakingProgress((s) => s.questions);
  const [script, setScript] = useState<Script | null>(null);

  const open = (s: Script) => { playSelect(); setScript(s); };
  // Random: one not practised yet if any are left, never the one open now.
  const random = () => {
    const others = scripts.filter((s) => s.id !== script?.id);
    const fresh = others.filter((s) => !isPracticed(progress[s.id]));
    const pool = fresh.length > 0 ? fresh : others;
    if (pool.length > 0) open(pool[Math.floor(Math.random() * pool.length)]);
  };

  if (!script) return <Picker scripts={scripts} progress={progress} onPick={open} onRandom={random} />;
  return <Stage key={script.id} script={script} onScripts={() => setScript(null)} onRandom={random} />;
}

function Picker({ scripts, progress, onPick, onRandom }: {
  scripts: Script[];
  progress: ReturnType<typeof useSpeakingProgress.getState>['questions'];
  onPick: (s: Script) => void;
  onRandom: () => void;
}) {
  const groups = useMemo(() => [...new Set(scripts.map((s) => s.group))], [scripts]);
  const [group, setGroup] = useState(groups[0]);
  return (
    <HudCenter wide>
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="px-title !text-[18px] text-[var(--px-gold)]"><FormattedMessage id="world.rpPick" /></p>
        <PixelButton tone="gold" onClick={onRandom}>
          <PixelIcon name="retry" size={2} /> <FormattedMessage id="world.rpRandom" />
        </PixelButton>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {groups.map((g) => <PixelChip key={g} on={g === group} onClick={() => setGroup(g)}>{g}</PixelChip>)}
      </div>
      <div className="grid sm:grid-cols-2 gap-2 max-h-[46vh] overflow-y-auto p-0.5">
        {scripts.filter((s) => s.group === group).map((s) => (
          <button key={s.id} onClick={() => onPick(s)} data-on={isPracticed(progress[s.id])} className="px-pick px-notch text-left px-3 py-2.5">
            <span className="flex items-center gap-2">
              <span className="flex-1 px-title !text-[14px]">{s.title}</span>
              {isPracticed(progress[s.id]) && <PixelIcon name="check" size={2} className="text-[var(--px-good)]" />}
            </span>
            <span className="block text-[13px] text-[var(--px-muted)] leading-snug mt-0.5 line-clamp-2">{s.setting}</span>
          </button>
        ))}
      </div>
    </HudCenter>
  );
}

function Stage({ script, onScripts, onRandom }: { script: Script; onScripts: () => void; onRandom: () => void }) {
  const intl = useIntl();
  const markPracticed = useSpeakingProgress((s) => s.markPracticed);
  const [mode, setMode] = useState<Mode>('listen');
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [done, setDone] = useState(false);
  const finish = () => {
    if (mode === 'listen') return;
    markPracticed(script.id);
    playCorrect();
    setDone(true);
  };
  const player = useScriptPlayer(script.lines, mode === 'listen' ? null : mode, finish);
  const waiting = player.status === 'waiting';

  // The candidate's clock, in IELTS, while it's your turn.
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!waiting || !script.turnSeconds) return;
    const end = Date.now() + script.turnSeconds * 1000;
    const id = setInterval(() => setLeft(Math.max(0, Math.round((end - Date.now()) / 1000))), 250);
    return () => { clearInterval(id); setLeft(null); };
  }, [waiting, script.turnSeconds, player.index]);

  const continueTurn = () => { setRevealed((r) => new Set(r).add(player.index)); player.resume(); };
  const pickMode = (m: Mode) => { player.stop(); setMode(m); setRevealed(new Set()); setDone(false); };

  // Enter continues your turn; Space plays or stops.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && waiting) { e.preventDefault(); continueTurn(); }
      else if (e.key === ' ') { e.preventDefault(); if (player.running) player.stop(); else void player.playFrom(0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Keep the line being played in view.
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current?.querySelector(`[data-line="${player.index}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [player.index]);

  const mine = (speaker: 'a' | 'b') => mode !== 'listen' && speaker === mode;

  return (
    <>
      <HudCenter wide aboveDock>
        <div className="mb-3">
          <p className="px-title !text-[11px] text-[var(--px-muted)]">
            {script.group} · <FormattedMessage id="conversation.lineCount" values={{ count: script.lines.length }} />
          </p>
          <p className="px-title !text-[17px] text-[var(--px-gold)]">{script.title}</p>
          <p className="text-[14px] text-[var(--px-muted)] leading-snug mt-0.5">{script.setting}</p>
        </div>
        <div ref={listRef} className="space-y-2 max-h-[34vh] overflow-y-auto pr-1">
          {script.lines.map((l, i) => {
            const hidden = mine(l.speaker) && !revealed.has(i);
            const current = player.index === i;
            const cue = l.speaker === 'a' ? parseCueCard(l.text) : null;
            return (
              <div
                key={i}
                data-line={i}
                className={`px-notch px-3 py-2 ${l.speaker === 'a' ? 'mr-10 bg-[#2a221c]' : 'ml-10 bg-[#1d2a2d]'}`}
                style={{ boxShadow: `inset 0 0 0 2px var(--px-ink)${current ? ', inset 0 0 0 4px var(--px-gold)' : ''}` }}
              >
                <button onClick={() => void player.playLine(i)} className="px-title !text-[11px] text-[var(--px-muted)] flex items-center gap-1.5 mb-0.5">
                  <PixelIcon name="speaker" size={1} /> {script.names[l.speaker]}
                </button>
                {hidden ? (
                  <p className="text-[15px] text-[var(--px-muted)] tracking-widest">• • • • • •</p>
                ) : cue ? (
                  <div className="text-[15px] leading-snug">
                    <p>{cue.task}</p>
                    <p className="px-title !text-[11px] text-[var(--px-gold)] mt-1"><FormattedMessage id="world.rpCue" /></p>
                    <ul className="list-disc pl-5">{cue.points.map((p) => <li key={p}>{p}</li>)}</ul>
                  </div>
                ) : (
                  <p className="text-[15px] leading-snug">{l.text}</p>
                )}
              </div>
            );
          })}
        </div>
      </HudCenter>

      <HudDock>
        {waiting && (
          <div className="flex items-center gap-3">
            <span className="px-title text-[var(--px-gold)] shrink-0"><FormattedMessage id="world.rpYourLine" /></span>
            {left !== null && script.turnSeconds && (
              <PixelBar className="flex-1" pct={(left / script.turnSeconds) * 100} color={left <= 5 ? 'var(--px-bad)' : 'var(--px-sky)'} label={`${intl.formatMessage({ id: 'world.rpTime' })} · ${left}s`} />
            )}
          </div>
        )}
        {done && <p className="px-title text-[var(--px-good)] flex items-center gap-1.5"><PixelIcon name="check" size={2} /><FormattedMessage id="world.rpDone" /></p>}
        <div className="flex flex-wrap items-center gap-2">
          <PixelChip on={mode === 'listen'} onClick={() => pickMode('listen')}><FormattedMessage id="conversation.listen" /></PixelChip>
          {(['a', 'b'] as const).map((side) => (
            <PixelChip key={side} on={mode === side} onClick={() => pickMode(side)}>
              <FormattedMessage id="conversation.beRole" values={{ role: script.names[side].toLowerCase() }} />
            </PixelChip>
          ))}
          <span className="flex-1" />
          {waiting ? (
            <>
              <PixelButton tone="paper" onClick={() => setRevealed((r) => new Set(r).add(player.index))}><FormattedMessage id="world.rpReveal" /></PixelButton>
              <PixelButton tone="red" onClick={continueTurn}><FormattedMessage id="world.rpContinue" /> ↵</PixelButton>
            </>
          ) : (
            <PixelButton tone="sky" onClick={() => (player.running ? player.stop() : void player.playFrom(0))}>
              <PixelIcon name={player.running ? 'close' : 'play'} size={2} />
              <FormattedMessage id={player.running ? 'listening.stop' : 'listening.play'} />
            </PixelButton>
          )}
          <PixelButton tone="paper" onClick={() => { player.stop(); onRandom(); }}>
            <PixelIcon name="retry" size={2} /> <FormattedMessage id="world.rpRandom" />
          </PixelButton>
          <PixelButton tone="paper" onClick={() => { player.stop(); onScripts(); }}><FormattedMessage id="world.rpScripts" /></PixelButton>
        </div>
      </HudDock>
    </>
  );
}
