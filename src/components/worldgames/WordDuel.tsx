import { useEffect, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { useCompanion } from '../../hooks/useCompanion';
import { useMatch } from '../../hooks/useMatch';
import { DEFAULT_LOOK } from '../../game/wardrobe';
import { DUEL_QUESTIONS, DUEL_SECONDS, duelPoints, duelResult, parseQuestions, type DuelQuestion } from '../../lib/wordDuel';
import type { MatchLink } from '../../lib/worldLive';
import { playCorrect, playWin, playWrong } from '../../lib/sfx';
import { LookSprite } from './LookSprite';
import { PixelButton, PixelIcon, PixelLoader } from './pixel';
import { useWorld } from './world';
import { duelQuestions } from './duelQuestions';

// A word duel with another player in Huế: the same definitions for both, four
// words to pick from, answered at your own pace with the scores side by side
// as they come in. The host's own words are asked. Nothing is written to
// either player's progress. The rules are lib/wordDuel.

type Turn = { at: number; since: number; picked?: string | null };

export function WordDuel({ link, onClose }: { link: MatchLink; onClose: () => void }) {
  const { wordPool } = useWorld();
  const look = useCompanion((s) => s.dress) ?? DEFAULT_LOOK;
  const [them, setThem] = useState({ score: 0, answered: 0 });
  const [turn, setTurn] = useState<Turn | null>(null);
  const { start: questions, left } = useMatch<DuelQuestion[]>(
    link,
    () => duelQuestions(wordPool, DUEL_QUESTIONS),
    parseQuestions,
    (d) => {
      if (d.kind === 'score' && Number.isFinite(d.score) && Number.isFinite(d.answered)) {
        setThem({ score: Math.max(0, Math.min(10000, Number(d.score))), answered: Number(d.answered) });
      }
    },
    // The first question as the questions arrive.
    () => setTurn({ at: 0, since: Date.now() }),
  );
  const [score, setScore] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const total = questions?.length ?? 0;
  const finished = !!questions && turn !== null && turn.at >= total;

  /** Answer the question (null: the time ran out), and move on a moment later. */
  const answer = (picked: string | null) => {
    if (!questions || !turn || turn.picked !== undefined || turn.at >= total) return;
    const q = questions[turn.at];
    const right = picked === q.word;
    if (right) playCorrect(); else playWrong();
    const next = score + duelPoints(right, Date.now() - turn.since);
    setScore(next);
    setTurn({ ...turn, picked });
    link.send({ kind: 'score', score: next, answered: turn.at + 1 });
    setTimeout(() => setTurn({ at: turn.at + 1, since: Date.now() }), 900);
  };

  // The clock: the time bar, and running out of it.
  useEffect(() => {
    if (!turn || turn.picked !== undefined || finished) return;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n - turn.since >= DUEL_SECONDS * 1000) answer(null);
    }, 100);
    return () => clearInterval(t);
  });

  const over = finished && (them.answered >= total || left);
  const result = duelResult(score, them.score);
  useEffect(() => { if (over && result === 'won') playWin(); }, [over, result]);

  const q = questions && turn && turn.at < total ? questions[turn.at] : null;
  const name = link.peer.name;

  return (
    <div className="px absolute inset-0 z-40 flex items-end sm:items-center justify-center p-3 bg-black/25" onKeyDown={(e) => e.stopPropagation()}>
      <div className="px-notch px-frame w-full max-w-[520px] p-4 px-in-up">
        <div className="flex items-start justify-between gap-2 mb-3">
          <p className="px-title !text-[18px] text-[var(--px-gold)] flex items-center gap-2"><PixelIcon name="sword" size={2} /> <FormattedMessage id="world.duelTitle" /></p>
          <button onClick={onClose} className="px-title !text-[12px] text-[var(--px-muted)] hover:text-[var(--px-text)] mt-1">
            <FormattedMessage id="world.focusLeave" />
          </button>
        </div>

        {/* The two of you, and the scores. */}
        <div className="px-inset px-notch p-2 mb-3 grid grid-cols-2 gap-2">
          {[{ who: <FormattedMessage id="world.duelYou" />, look, s: score, n: turn ? Math.min(turn.at + (turn.picked !== undefined ? 1 : 0), total) : 0 },
            { who: name, look: link.peer.look, s: them.score, n: them.answered }].map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <LookSprite look={p.look} scale={2} />
              <div className="min-w-0">
                <p className="text-[13px] truncate">{p.who}</p>
                <p className="px-num !text-[18px] text-[var(--px-gold)]">{p.s}</p>
                {total > 0 && <p className="text-[11px] text-[var(--px-muted)] px-num">{p.n}/{total}</p>}
              </div>
            </div>
          ))}
        </div>

        {!questions && !left && <PixelLoader label={<FormattedMessage id="world.duelWaiting" values={{ name }} />} />}

        {q && turn && (
          <>
            <div className="h-1.5 bg-black/30 mb-2">
              <div className="h-full bg-[var(--px-gold)]" style={{ width: `${turn.picked !== undefined ? 0 : Math.max(0, 1 - (now - turn.since) / (DUEL_SECONDS * 1000)) * 100}%` }} />
            </div>
            <p className="text-[13px] text-[var(--px-muted)] mb-1"><FormattedMessage id="world.duelQuestion" values={{ at: turn.at + 1, total }} /></p>
            <p className="px-inset px-notch p-3 text-[15px] leading-snug mb-3">{q.prompt}</p>
            <div className="grid grid-cols-2 gap-2">
              {q.options.map((o) => {
                const done = turn.picked !== undefined;
                const tone = !done ? 'paper' : o === q.word ? 'good' : o === turn.picked ? 'bad' : 'paper';
                return (
                  <PixelButton key={o} tone={tone} disabled={done} onClick={() => answer(o)} className="!text-[14px] !px-2">{o}</PixelButton>
                );
              })}
            </div>
          </>
        )}

        {finished && !over && <PixelLoader label={<FormattedMessage id="world.duelWaitRival" values={{ name }} />} />}

        {(over || (left && !finished)) && (
          <div className="text-center">
            {left && <p className="text-[14px] text-[var(--px-muted)] mb-2"><FormattedMessage id="world.duelLeft" values={{ name }} /></p>}
            {finished && (
              <p className="px-title !text-[22px] mb-3" style={{ color: result === 'won' ? 'var(--px-jade)' : result === 'lost' ? 'var(--px-bad)' : undefined }}>
                <FormattedMessage id={`world.duel.${result}`} values={{ name }} />
              </p>
            )}
            <PixelButton tone="jade" block onClick={onClose}><FormattedMessage id="world.duelDone" /></PixelButton>
          </div>
        )}
      </div>
    </div>
  );
}
