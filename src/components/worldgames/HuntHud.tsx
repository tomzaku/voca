import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { clock, questionKey, secondsUntil } from '../../lib/hunt';
import { speakText, stopSpeaking } from '../../lib/tts';
import { usePicture, useTick, type HuntHandle } from '../../hooks/useHunt';
import type { Play, PublicQuestion } from '../../lib/huntsApi';
import { HudCenter, PixelButton, PixelChip, PixelIcon, PixelLetter, PixelLoader } from './pixel';
import { SOLO_PX, TEAM_PX } from '../hunt/teams';

// A treasure hunt played in the world (/world?hunt=CODE). The same race as the
// classroom's — same hook, same server — drawn in the world's pixel kit: a
// banner saying where your team goes next, and, once the buddy reaches that
// landmark, the station's question in a window over the map.

/** The banner across the top of the map while a hunt is on. */
export function HuntHud({ code, hunt, onOpen }: { code: string; hunt: HuntHandle; onOpen: () => void }) {
  const intl = useIntl();
  const { play } = hunt;
  const now = useTick(play?.hunt.status === 'live');

  const frame = 'px absolute top-[calc(4.25rem+env(safe-area-inset-top,0px))] left-1/2 -translate-x-1/2 z-20 w-[min(94%,440px)] px-in-down';

  if (!hunt.token) {
    return (
      <div className={frame}>
        <div className="px-notch px-frame px-4 py-3 flex items-center gap-3">
          <PixelIcon name="chest" size={3} className="text-[var(--px-gold)]" />
          <p className="flex-1 text-[14px]"><FormattedMessage id="hunt.world.joinFirst" /></p>
          <Link to={`/hunt/${code}`} className="px-btn px-notch px-title !text-[14px] px-3 py-2" data-tone="gold">
            <FormattedMessage id="hunt.join" />
          </Link>
        </div>
      </div>
    );
  }
  if (!play) return null;

  const { team, me, rival, outcome } = play;
  const solo = play.hunt.play === 'solo';
  const color = solo ? SOLO_PX : TEAM_PX[me.team];
  const rivalTeam = (1 - me.team) as 0 | 1;
  const left = secondsUntil(play.hunt.endsAt, hunt.skewMs, now);
  const canOpen = play.hunt.status === 'live' && !outcome.over && (team.phase === 'solve' || team.phase === 'final');

  let task: ReactNode;
  if (play.hunt.status === 'lobby') task = <FormattedMessage id="hunt.waitStart" />;
  else if (outcome.over || team.phase === 'done') task = <Result play={play} />;
  else if (team.phase === 'find') {
    task = (
      <FormattedMessage
        id="hunt.world.goTo"
        values={{ place: <b className="text-[var(--px-gold)]">{team.place ? intl.formatMessage({ id: `places.${team.place}` }) : '…'}</b> }}
      />
    );
  } else if (team.phase === 'final') task = <FormattedMessage id="hunt.finalTitle" />;
  else task = <FormattedMessage id="hunt.phase.solve" values={{ solved: team.solved, need: team.need }} />;

  return (
    <div className={frame}>
      <div className="px-notch px-frame px-3.5 py-2.5 space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 shrink-0" style={{ background: color }} />
          <span className="px-title !text-[14px] truncate" style={{ color }}>{solo ? me.name : play.hunt.teamNames[me.team]}</span>
          <Dots n={play.hunt.stations} at={team.position} color={color} />
          <span className="flex-1" />
          {play.hunt.status === 'live' && (
            <span className="px-num text-[16px] flex items-center gap-1"><PixelIcon name="hourglass" size={2} />{clock(left)}</span>
          )}
        </div>
        {/* The race: the other team — or, solo, your place in the class. */}
        {rival ? (
          <div className="flex items-center gap-2 opacity-80">
            <span className="w-3 h-3 shrink-0" style={{ background: TEAM_PX[rivalTeam] }} />
            <span className="px-title !text-[12px] truncate text-[var(--px-muted)]">{rival.name}</span>
            <Dots n={play.hunt.stations} at={rival.position} color={TEAM_PX[rivalTeam]} />
          </div>
        ) : me.rank && play.hunt.status !== 'lobby' ? (
          <p className="px-title !text-[12px] text-[var(--px-muted)]">
            <FormattedMessage id="hunt.solo.place" values={{ rank: me.rank, of: me.of }} />
          </p>
        ) : null}
        <div className="flex items-center gap-2">
          <p className="flex-1 text-[15px] leading-snug">{task}</p>
          {canOpen && (
            <PixelButton tone="gold" onClick={onOpen} className="!py-2 !px-3 !text-[14px]">
              <PixelIcon name={team.phase === 'final' ? 'key' : 'sword'} size={2} />
              <FormattedMessage id="hunt.world.open" />
            </PixelButton>
          )}
        </div>
      </div>
    </div>
  );
}

function Dots({ n, at, color }: { n: number; at: number; color: string }) {
  return (
    <span className="flex items-center gap-1">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="w-2.5 h-2.5" style={{ background: i < at ? color : 'transparent', boxShadow: `inset 0 0 0 2px ${i <= at ? color : 'var(--px-muted)'}` }} />
      ))}
      <PixelIcon name="chest" size={1} className={at >= n ? 'text-[var(--px-gold)]' : 'text-[var(--px-muted)]'} />
    </span>
  );
}

function Result({ play }: { play: Play }) {
  const { outcome, me } = play;
  if (play.hunt.play === 'solo') {
    if (outcome.champion?.id === me.id) return <FormattedMessage id="hunt.solo.youFirst" />;
    if (play.team.phase === 'done') return <FormattedMessage id="hunt.solo.youFinished" values={{ rank: me.rank ?? 0 }} />;
    if (outcome.champion) return <FormattedMessage id="hunt.solo.theyFirst" values={{ name: outcome.champion.name }} />;
    return <FormattedMessage id="hunt.finished" />;
  }
  if (outcome.winner === me.team) return <FormattedMessage id="hunt.youWon" />;
  if (outcome.over && outcome.winner === null) return <FormattedMessage id="hunt.draw" />;
  if (outcome.winner !== null) return <FormattedMessage id="hunt.theyWon" values={{ team: play.hunt.teamNames[outcome.winner] }} />;
  return <FormattedMessage id="hunt.waitOthers" />;
}

/** The station's question — or the treasure's lock — in a window over the map. */
export function HuntWindow({ hunt, onClose }: { hunt: HuntHandle; onClose: () => void }) {
  const { play } = hunt;
  const now = useTick(Boolean(play?.team.cooldownUntil));
  // Nothing left to do here — solved, or the team moved on: back to the map.
  const phase = play?.team.phase;
  const waiting = play?.team.phase === 'solve' && play.team.iSolved;
  useEffect(() => {
    if (phase === 'find' || phase === 'done' || play?.outcome.over) onClose();
  }, [phase, play?.outcome.over, onClose]);

  if (!play) return <HudCenter><PixelLoader label={<FormattedMessage id="hunt.loadingQuestion" />} /></HudCenter>;
  const cooldown = secondsUntil(play.team.cooldownUntil, hunt.skewMs, now);
  const answer = (a: string | string[]) => void hunt.answer(a);

  return (
    <HudCenter wide>
      {play.team.phase === 'final' ? (
        <PixelLock letters={play.team.letters} cooldown={cooldown} busy={hunt.busy} onAnswer={answer} />
      ) : waiting ? (
        <div className="text-center py-4 space-y-2">
          <PixelIcon name="check" size={4} className="text-[var(--px-good)] mx-auto" />
          <p className="px-title text-[var(--px-good)]"><FormattedMessage id="hunt.youSolved" /></p>
          <p className="text-[15px] text-[var(--px-muted)]"><FormattedMessage id="hunt.helpTeammates" values={{ n: play.team.need - play.team.solved }} /></p>
        </div>
      ) : play.team.question ? (
        <PixelQuestion question={play.team.question} cooldown={cooldown} busy={hunt.busy} onAnswer={answer} loadImage={hunt.image} />
      ) : (
        <PixelLoader label={<FormattedMessage id="hunt.loadingQuestion" />} />
      )}
    </HudCenter>
  );
}

interface PixelQuestionProps {
  question: PublicQuestion;
  cooldown: number;
  busy: boolean;
  onAnswer: (a: string | string[]) => void;
  loadImage?: (key: string) => Promise<string>;
}

/** A new question remounts — a clean box, and its word read out. */
export function PixelQuestion(props: PixelQuestionProps) {
  return <PixelQuestionBody key={questionKey(props.question)} {...props} />;
}

function PixelQuestionBody({ question, cooldown, busy, onAnswer, loadImage }: PixelQuestionProps) {
  const intl = useIntl();
  const [typed, setTyped] = useState('');
  const locked = busy || cooldown > 0;
  useEffect(() => {
    if (question.say) void speakText(question.say);
    return () => stopSpeaking();
  }, [question.say]);

  return (
    // Keys typed here are the answer, not the buddy's walking.
    <div className="space-y-3" onKeyDown={(e) => e.stopPropagation()}>
      <p className="px-title text-[var(--px-accent)]"><FormattedMessage id={`hunt.type.${question.type}`} /></p>
      {question.prompt && <p className="text-[19px] leading-snug">{question.prompt}</p>}
      {question.say && (
        <PixelButton tone="sky" onClick={() => { stopSpeaking(); void speakText(question.say!); }} className="!py-2">
          <PixelIcon name="speaker" size={2} /> <FormattedMessage id="hunt.listenAgain" />
        </PixelButton>
      )}
      {question.image && <PixelPicture imageKey={question.image} load={loadImage} />}
      {question.scrambled && (
        <div className="flex flex-wrap gap-1.5">{[...question.scrambled].map((c, i) => <PixelLetter key={i} char={c} state="given" />)}</div>
      )}
      {question.slotPrompts && question.options ? (
        <PixelMatch prompts={question.slotPrompts} bank={question.options} locked={locked} onAnswer={onAnswer} />
      ) : question.options ? (
        <div className="grid grid-cols-2 gap-2">
          {question.options.map((o) => (
            <button key={o} disabled={locked} onClick={() => onAnswer(o)} className="px-slot px-notch min-h-[56px] px-3 py-3 text-left text-[18px] font-bold disabled:opacity-50">
              {o}
            </button>
          ))}
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); if (typed.trim() && !locked) onAnswer(typed.trim()); }} className="flex gap-2">
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            disabled={locked}
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder={question.length ? intl.formatMessage({ id: 'hunt.typeAnswer' }, { n: question.length }) : intl.formatMessage({ id: 'hunt.typeFree' })}
            className="px-inset px-notch flex-1 min-w-0 px-3 py-2.5 text-[18px] bg-transparent outline-none"
          />
          <PixelButton type="submit" disabled={locked || !typed.trim()}><FormattedMessage id="hunt.check" /></PixelButton>
        </form>
      )}
      {cooldown > 0 && (
        <p className="px-title text-[var(--px-bad)] flex items-center gap-1.5">
          <PixelIcon name="hourglass" size={2} /> <FormattedMessage id="hunt.cooldown" values={{ n: cooldown }} />
        </p>
      )}
    </div>
  );
}

function PixelLock({ letters, cooldown, busy, onAnswer }: { letters: string[]; cooldown: number; busy: boolean; onAnswer: (a: string) => void }) {
  const [typed, setTyped] = useState('');
  const locked = busy || cooldown > 0;
  return (
    <div className="space-y-3 text-center" onKeyDown={(e) => e.stopPropagation()}>
      <PixelIcon name="chest" size={5} className="text-[var(--px-gold)] mx-auto" />
      <p className="px-title text-[var(--px-gold)]"><FormattedMessage id="hunt.finalTitle" /></p>
      <p className="text-[15px] text-[var(--px-muted)]"><FormattedMessage id="hunt.finalBody" values={{ n: letters.length }} /></p>
      <div className="flex flex-wrap gap-1.5 justify-center">
        {letters.map((c, i) => <PixelLetter key={i} char={c} state="tile" onClick={() => !locked && setTyped((t) => t + c)} />)}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if (typed.trim() && !locked) onAnswer(typed.trim()); }} className="flex gap-2">
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value.toUpperCase())}
          disabled={locked}
          autoFocus
          maxLength={letters.length + 4}
          className="px-inset px-notch px-num flex-1 min-w-0 px-3 py-2.5 text-[24px] tracking-[0.3em] text-center bg-transparent outline-none"
        />
        <PixelButton type="button" tone="paper" onClick={() => setTyped('')} className="!px-3"><PixelIcon name="close" size={2} /></PixelButton>
        <PixelButton type="submit" disabled={locked || !typed.trim()}><PixelIcon name="key" size={2} /></PixelButton>
      </form>
      {cooldown > 0 && <p className="px-title text-[var(--px-bad)]"><FormattedMessage id="hunt.cooldown" values={{ n: cooldown }} /></p>}
    </div>
  );
}

function PixelPicture({ imageKey, load }: { imageKey: string; load?: (key: string) => Promise<string> }) {
  const src = usePicture(imageKey, load);
  return (
    <div className="flex justify-center">
      <div className="px-inset px-notch w-40 h-40 bg-[#f4ecd8] flex items-center justify-center overflow-hidden">
        {src === null ? <PixelLoader label="" /> : src ? <img src={src} alt="" className="w-full h-full object-contain" /> : <PixelIcon name="close" size={3} className="text-[var(--px-muted)]" />}
      </div>
    </div>
  );
}

/** Matching, in the world's kit: tap a word, then the meaning it goes with. */
function PixelMatch({ prompts, bank, locked, onAnswer }: {
  prompts: string[];
  bank: string[];
  locked: boolean;
  onAnswer: (a: string[]) => void;
}) {
  const [placed, setPlaced] = useState<(string | null)[]>(() => prompts.map(() => null));
  const [picked, setPicked] = useState<string | null>(null);
  const free = bank.filter((w) => !placed.includes(w));
  const place = (i: number) => {
    if (locked) return;
    if (placed[i]) { setPlaced((p) => p.map((w, j) => (j === i ? null : w))); return; }
    if (picked) { setPlaced((p) => p.map((w, j) => (j === i ? picked : w))); setPicked(null); }
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 min-h-[36px]">
        {free.map((w) => <PixelChip key={w} on={picked === w} onClick={() => !locked && setPicked((p) => (p === w ? null : w))}>{w}</PixelChip>)}
      </div>
      {prompts.map((p, i) => (
        <button key={i} disabled={locked} onClick={() => place(i)} data-on={Boolean(placed[i])} className="px-pick px-notch w-full text-left px-3 py-2">
          <span className="block text-[14px] text-[var(--px-muted)] leading-snug">{p}</span>
          <span className="block px-title mt-0.5">{placed[i] ?? '…'}</span>
        </button>
      ))}
      <PixelButton block disabled={locked || !placed.every(Boolean)} onClick={() => onAnswer(placed as string[])}>
        <FormattedMessage id="hunt.check" />
      </PixelButton>
    </div>
  );
}
