import { useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { useMatch } from '../../hooks/useMatch';
import { forgive, newGame, rule, simulate, targetsFor, type Ball, type PoolState, type Ruling } from '../../lib/pool';
import { playCorrect, playSelect, playWin, playWrong } from '../../lib/sfx';
import type { DuelQuestion } from '../../lib/wordDuel';
import type { MatchLink } from '../../lib/worldLive';
import { duelQuestions } from './duelQuestions';
import { MatchWindow } from './MatchWindow';
import { PixelButton, PixelIcon, type PixelTone } from './pixel';
import { GroupChip, PoolTable } from './PoolTable';
import { useWorld } from './world';

// 8-ball at the street pool table: solo practice, and a match with another
// player over the world's match link. The table and its rules are
// PoolTable and lib/pool; this is the turn-taking around them — and the
// learning: foul, and you get one word question. Answer it and you keep the
// table instead of handing it over (solo: the foul costs no extra shot).

/** Word questions for fouls, fetched once and handed out in turn. */
function useFoulQuestions() {
  const { wordPool } = useWorld();
  const [qs, setQs] = useState<DuelQuestion[]>([]);
  const at = useRef(0);
  useEffect(() => {
    let alive = true;
    duelQuestions(wordPool, 12).then((q) => alive && setQs(q), () => { /* no questions: a foul is just a foul */ });
    return () => { alive = false; };
  }, [wordPool]);
  return () => (qs.length ? qs[at.current++ % qs.length] : null);
}

/** The cue ball where the player put it (ball in hand), before the shot. */
const withCue = (balls: Ball[], cue: { x: number; y: number }) => balls.map((b) => (b.id === 0 ? { ...b, ...cue, down: false } : b));

const FOUL_ID: Record<NonNullable<PoolState['foul']>, string> = {
  scratch: 'world.poolFoulScratch', noHit: 'world.poolFoulNoHit', wrongFirst: 'world.poolFoulWrongFirst',
};

/** One question after a foul: right keeps the turn. */
function FoulQuestion({ q, foul, onAnswer }: { q: DuelQuestion; foul: NonNullable<PoolState['foul']>; onAnswer: (right: boolean) => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  const pick = (o: string) => {
    if (picked) return;
    setPicked(o);
    const right = o === q.word;
    if (right) playCorrect(); else playWrong();
    window.setTimeout(() => onAnswer(right), 1100);
  };
  return (
    <div className="px-notch px-inset p-3 space-y-2">
      <p className="text-[13px] text-[#ff9f9f]"><FormattedMessage id={FOUL_ID[foul]} /> <FormattedMessage id="world.poolSaveIt" /></p>
      <p className="text-[15px] leading-snug">{q.prompt}</p>
      <div className="grid grid-cols-2 gap-2">
        {q.options.map((o) => {
          const tone: PixelTone = !picked ? 'paper' : o === q.word ? 'good' : o === picked ? 'bad' : 'paper';
          return <PixelButton key={o} tone={tone} block onClick={() => pick(o)} disabled={!!picked} className="!py-2 !text-[14px]">{o}</PixelButton>;
        })}
      </div>
    </div>
  );
}

const BEST = 'voca-pool-best';

/** Practice: clear the table in as few shots as you can. A foul adds a shot — unless you answer its question. */
export function PoolSolo({ onClose }: { onClose: () => void }) {
  const nextQuestion = useFoulQuestions();
  const [state, setState] = useState<PoolState>(newGame);
  const [replay, setReplay] = useState<Ball[][] | null>(null);
  const pending = useRef<Ruling | null>(null);
  const [question, setQuestion] = useState<{ q: DuelQuestion; ruling: Ruling } | null>(null);
  const [penalties, setPenalties] = useState(0);
  const [best, setBest] = useState<number | null>(() => { try { return Number(localStorage.getItem(BEST)) || null; } catch { return null; } });
  const score = state.shots + penalties;

  const shoot = (angle: number, power: number, cue: { x: number; y: number }) => {
    const before = { ...state, balls: withCue(state.balls, cue) };
    const sim = simulate(before.balls, angle, power);
    pending.current = rule(before, sim, 1);
    playSelect();
    setReplay(sim.frames);
  };

  const settle = (s: PoolState, penalty: boolean) => {
    if (penalty) setPenalties((p) => p + 1);
    setState(s);
    if (s.winner !== null) {
      const total = s.shots + penalties + (penalty ? 1 : 0);
      playWin();
      if (!best || total < best) { setBest(total); try { localStorage.setItem(BEST, String(total)); } catch { /* fine */ } }
    }
  };

  const replayed = () => {
    setReplay(null);
    const r = pending.current;
    pending.current = null;
    if (!r) return;
    const q = r.savable ? nextQuestion() : null;
    if (q) setQuestion({ q, ruling: r });
    else settle(r.state, !!r.state.foul);
  };

  const answered = (right: boolean) => {
    if (!question) return;
    settle(right ? forgive(question.ruling.state, 0) : question.ruling.state, !right);
    setQuestion(null);
  };

  const again = () => { setState(newGame()); setPenalties(0); setQuestion(null); setReplay(null); };
  const left = state.balls.filter((b) => !b.down && b.id !== 0).length;

  return (
    <div className="px absolute inset-0 z-40 flex items-end sm:items-center justify-center p-3 bg-black/25" onKeyDown={(e) => e.stopPropagation()}>
      <div className="px-notch px-frame w-full max-w-[780px] p-4 px-in-up max-h-full overflow-y-auto">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="px-title !text-[18px] text-[var(--px-gold)] flex items-center gap-2"><PixelIcon name="eightball" size={2} /> <FormattedMessage id="world.poolTitle" /></p>
            <p className="text-[12px] opacity-80"><FormattedMessage id="world.poolSoloHow" /></p>
          </div>
          <PixelButton tone="paper" onClick={onClose} className="!px-2.5 !py-1 !text-[13px] shrink-0"><FormattedMessage id="world.close" /></PixelButton>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] mb-2">
          <span><FormattedMessage id="world.poolShots" values={{ n: score }} /></span>
          {penalties > 0 && <span className="text-[#ff9f9f]"><FormattedMessage id="world.poolPenalties" values={{ n: penalties }} /></span>}
          <span className="opacity-80"><FormattedMessage id="world.poolLeft" values={{ n: left }} /></span>
          {best && <span className="text-[var(--px-gold)]"><FormattedMessage id="world.poolBest" values={{ n: best }} /></span>}
        </div>
        <PoolTable
          balls={state.balls}
          canShoot={!replay && !question && state.winner === null}
          inHand={state.inHand}
          breaking={state.breaking}
          targets={targetsFor(state, 0)}
          replay={replay}
          onReplayed={replayed}
          onShoot={shoot}
        />
        {question && <div className="mt-3"><FoulQuestion q={question.q} foul={question.ruling.state.foul!} onAnswer={answered} /></div>}
        {!question && state.foul && state.winner === null && (
          <p className="mt-2 text-[12px] text-[#ff9f9f] text-center"><FormattedMessage id={FOUL_ID[state.foul]} /></p>
        )}
        {state.winner !== null && (
          <div className="mt-3 text-center space-y-2">
            <p className="px-title !text-[16px] text-[var(--px-gold)]"><FormattedMessage id="world.poolCleared" values={{ n: score }} /></p>
            <PixelButton tone="gold" onClick={again}><FormattedMessage id="world.poolAgain" /></PixelButton>
          </div>
        )}
      </div>
    </div>
  );
}

interface PoolStart { hostBreaks: boolean }
const parseStart = (raw: unknown): PoolStart | null =>
  raw && typeof raw === 'object' && typeof (raw as PoolStart).hostBreaks === 'boolean' ? { hostBreaks: (raw as PoolStart).hostBreaks } : null;

/** A state from the other player — trusted for the game (nothing is recorded), checked for its shape. */
function parseState(raw: unknown): PoolState | null {
  const s = raw as PoolState;
  if (!s || !Array.isArray(s.balls) || s.balls.length !== 16) return null;
  if (!s.balls.every((b) => typeof b.id === 'number' && typeof b.x === 'number' && typeof b.y === 'number' && typeof b.down === 'boolean')) return null;
  if ((s.turn !== 0 && s.turn !== 1) || typeof s.shots !== 'number') return null;
  return s;
}

/**
 * A match: the host's side is player 0. The shooter's screen simulates, rules
 * and sends the table that results (`shot`), so the other replays the same
 * shot and then takes that table as it is. A foul the shooter can save is
 * sent as pending; their answer follows as `save`, with the table it leaves.
 */
export function PoolMatch({ link, onClose }: { link: MatchLink; onClose: () => void }) {
  const nextQuestion = useFoulQuestions();
  const me: 0 | 1 = link.host ? 0 : 1;
  const [state, setState] = useState<PoolState | null>(null);
  const [replay, setReplay] = useState<Ball[][] | null>(null);
  const after = useRef<{ state: PoolState; ruling?: Ruling; waiting?: boolean } | null>(null);
  const [question, setQuestion] = useState<{ q: DuelQuestion; ruling: Ruling } | null>(null);
  const [waiting, setWaiting] = useState(false);   // they fouled and are answering
  const [resigned, setResigned] = useState<'me' | 'them' | null>(null);

  const { left } = useMatch<PoolStart>(
    link,
    async () => ({ hostBreaks: Math.random() < 0.5 }),
    parseStart,
    (d) => {
      if (d.kind === 'resign') { setResigned('them'); return; }
      if (!state) return;
      if (d.kind === 'shot') {
        const next = parseState(d.state);
        const cue = d.cue as { x: number; y: number } | undefined;
        if (!next || next.shots !== state.shots + 1 || typeof d.angle !== 'number' || typeof d.power !== 'number' || !cue) return;
        // Replay their shot from our table, then take theirs as it is.
        const sim = simulate(withCue(state.balls, cue), d.angle, d.power);
        after.current = { state: next, waiting: d.pending === true };
        setReplay(sim.frames);
      } else if (d.kind === 'save') {
        const next = parseState(d.state);
        if (!next) return;
        setWaiting(false);
        setState(next);
        if (d.ok) playCorrect();
      }
    },
    (start) => setState({ ...newGame(), turn: start.hostBreaks ? 0 : 1 }),
  );

  const shoot = (angle: number, power: number, cue: { x: number; y: number }) => {
    if (!state) return;
    const before = { ...state, balls: withCue(state.balls, cue) };
    const sim = simulate(before.balls, angle, power);
    const ruling = rule(before, sim, 2);
    // Ask only if there's a question to ask; otherwise the foul stands.
    const q = ruling.savable ? nextQuestion() : null;
    link.send({ kind: 'shot', angle, power, cue, state: ruling.state, pending: !!q });
    after.current = { state: ruling.state, ruling: q ? ruling : undefined };
    if (q) setQuestion({ q, ruling });
    playSelect();
    setReplay(sim.frames);
  };

  const replayed = () => {
    setReplay(null);
    const a = after.current;
    after.current = null;
    if (!a) return;
    if (a.ruling) return;              // my foul: the question decides the table
    setState(a.state);
    if (a.waiting) setWaiting(true);
  };

  const answered = (right: boolean) => {
    if (!question) return;
    const next = right ? forgive(question.ruling.state, me) : question.ruling.state;
    link.send({ kind: 'save', ok: right, state: next });
    setQuestion(null);
    setState(next);
  };

  const resign = () => { link.send({ kind: 'resign' }); setResigned('me'); };

  const winner = state?.winner ?? null;
  const result = resigned === 'me' ? 'lost' : resigned === 'them' ? 'won' : winner === null ? null : winner === me ? 'won' : 'lost';
  useEffect(() => { if (result === 'won') playWin(); }, [result]);
  const myTurn = !!state && !result && !replay && !question && !waiting && state.turn === me;
  const them = (1 - me) as 0 | 1;

  return (
    <MatchWindow
      link={link} icon="eightball" title={<FormattedMessage id="world.poolTitle" />} onClose={onClose}
      turn={result || !state ? null : state.turn === me ? 'me' : 'them'}
      mine={state && <GroupChip group={state.groups[me]} balls={state.balls} />}
      theirs={state && <GroupChip group={state.groups[them]} balls={state.balls} />}
      started={!!state} left={left} result={result}
    >
      {state && (
        <>
          <PoolTable
            balls={state.balls}
            canShoot={myTurn}
            inHand={state.inHand}
            breaking={state.breaking}
            targets={targetsFor(state, me)}
            replay={replay}
            onReplayed={replayed}
            onShoot={shoot}
          />
          {question && <div className="mt-3"><FoulQuestion q={question.q} foul={question.ruling.state.foul!} onAnswer={answered} /></div>}
          {waiting && <p className="mt-2 text-[12px] text-center opacity-80"><FormattedMessage id="world.poolTheyAnswer" values={{ name: link.peer.name }} /></p>}
          {!question && !waiting && !replay && state.foul && !result && (
            <p className="mt-2 text-[12px] text-[#ff9f9f] text-center">
              <FormattedMessage id={FOUL_ID[state.foul]} />{' '}
              {state.turn === me && state.inHand && <FormattedMessage id="world.poolYourBallInHand" />}
            </p>
          )}
          {!result && (
            <div className="mt-2 flex justify-end">
              <PixelButton tone="paper" onClick={resign} className="!px-2.5 !py-1 !text-[12px]"><FormattedMessage id="world.poolResign" /></PixelButton>
            </div>
          )}
        </>
      )}
    </MatchWindow>
  );
}
