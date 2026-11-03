import { useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  answer, banked, canUse, current, floorPoints, LIFELINES, levelOf, newLadder, recordScore, bestScores,
  RUNG_COUNT, RUNG_POINTS, SAFE_RUNGS, say, stop, askClass, takeHalf, swapQuestion,
  type LadderGame, type LadderType, type Lifeline,
} from '../../lib/quocHocLadder';
import { QUESTION_TYPES } from '../../lib/ladderQuestions';
import { playCorrect, playSelect, playWin, playWrong } from '../../lib/sfx';
import { PixelButton, PixelChip, PixelIcon, type PixelIconName } from './pixel';

const LIFELINE_ICON: Record<Lifeline, PixelIconName> = { half: 'percent', class: 'people', swap: 'retry' };
const LETTERS = ['A', 'B', 'C', 'D'];
const LEVEL_TONE = { easy: 'text-[var(--px-jade,#6fd39a)]', medium: 'text-[var(--px-sky)]', hard: 'text-[#ff8a7a]' };
/** How long an answer is held, locked in, before it's revealed. */
const SUSPENSE_MS = 900;

/**
 * The quiz ladder on the lawn beside Quốc Học: fifteen general questions,
 * easy to hard, with safe rungs and three helps (lib/quocHocLadder). Pick a
 * type, or all of them; your best climb per type is kept on this device.
 */
export function QuocHocLadder({ onClose }: { onClose: () => void }) {
  const intl = useIntl();
  const locale = intl.locale;
  const [game, setGame] = useState<LadderGame | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  /** The answer's outcome, once revealed, and the game it leads to. */
  const [result, setResult] = useState<{ correct: boolean; next: LadderGame; record: boolean } | null>(null);
  const [best, setBest] = useState(bestScores);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const start = (type: LadderType) => { setGame(newLadder(type)); setPicked(null); setResult(null); };

  const pick = (i: number) => {
    if (!game || picked !== null || game.hidden.includes(i)) return;
    setPicked(i);
    playSelect();
    timer.current = window.setTimeout(() => {
      const { game: next, correct } = answer(game, i);
      const record = next.over ? recordScore(next.type, next.over.points) : false;
      if (next.over) setBest(bestScores());
      if (next.over?.how === 'top') playWin(); else if (correct) playCorrect(); else playWrong();
      setResult({ correct, next, record });
    }, SUSPENSE_MS);
  };

  const onward = () => {
    if (!result) return;
    setGame(result.next); setPicked(null); setResult(null);
  };

  const help = (l: Lifeline) => {
    if (!game || picked !== null) return;
    playSelect();
    setGame(l === 'half' ? takeHalf(game) : l === 'class' ? askClass(game) : swapQuestion(game));
  };

  const quit = () => {
    if (!game || picked !== null) return;
    const g = stop(game);
    const record = recordScore(g.type, g.over!.points);
    setBest(bestScores());
    setGame(g);
    setResult({ correct: true, next: g, record });
    setPicked(-1);
  };

  // The question on screen — still shown after it ends the game.
  const asked = game && current({ ...game, over: null });
  const over = result?.next.over ?? null;

  return (
    <div className="px absolute inset-0 z-40 flex items-end sm:items-center justify-center p-3 bg-black/25" onKeyDown={(e) => e.stopPropagation()}>
      <div className="px-notch px-frame w-full max-w-[780px] p-4 px-in-up max-h-full overflow-y-auto">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="px-title !text-[18px] text-[var(--px-gold)] flex items-center gap-2"><PixelIcon name="cap" size={2} /> <FormattedMessage id="world.ladderTitle" /></p>
            <p className="text-[12px] opacity-80"><FormattedMessage id="world.ladderHow" /></p>
          </div>
          <PixelButton tone="paper" onClick={onClose} className="!px-2.5 !py-1 !text-[13px] shrink-0"><FormattedMessage id="world.close" /></PixelButton>
        </div>

        {!game ? (
          <div className="py-3 space-y-3 text-center">
            <p className="text-[14px]"><FormattedMessage id="world.ladderPickType" /></p>
            <div className="flex flex-wrap justify-center gap-2">
              {(['all', ...QUESTION_TYPES] as LadderType[]).map((t) => (
                <PixelChip key={t} on={false} onClick={() => start(t)}>
                  <FormattedMessage id={`world.ladderType.${t}`} />
                  {best[t] ? <span className="opacity-70 text-[11px] ml-1 inline-flex items-center gap-0.5"><PixelIcon name="star" size={1} />{best[t]}</span> : null}
                </PixelChip>
              ))}
            </div>
            <p className="text-[12px] opacity-70"><FormattedMessage id="world.ladderRules" values={{ a: SAFE_RUNGS[0] + 1, b: SAFE_RUNGS[1] + 1 }} /></p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-[1fr_168px]">
            <div className="space-y-3 min-w-0">
              {asked && (
                <>
                  <div className="flex items-center justify-between text-[12px]">
                    <span>
                      <FormattedMessage id="world.ladderRung" values={{ n: Math.min(game.rung + 1, RUNG_COUNT), of: RUNG_COUNT }} />
                      {' · '}
                      <span className={LEVEL_TONE[asked.question.level]}><FormattedMessage id={`world.ladderLevel.${asked.question.level}`} /></span>
                      {' · '}
                      <span className="opacity-70"><FormattedMessage id={`world.ladderType.${asked.question.type}`} /></span>
                    </span>
                    <span className="text-[var(--px-gold)]"><FormattedMessage id="world.ladderFor" values={{ n: RUNG_POINTS[Math.min(game.rung, RUNG_COUNT - 1)] }} /></span>
                  </div>
                  <div className="px-notch px-inset p-3">
                    <p className="text-[16px] leading-snug">{say(asked.question.q, locale)}</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {asked.options.map((o, i) => {
                      const gone = game.hidden.includes(i);
                      const revealed = !!result && picked !== -1;
                      const tone = revealed && i === asked.answer ? 'good' : revealed && i === picked ? 'bad' : picked === i ? 'gold' : 'paper';
                      return (
                        <PixelButton key={i} tone={tone} block disabled={gone || picked !== null} onClick={() => pick(i)}
                          className={`!justify-start !text-left !text-[14px] ${gone ? 'opacity-30' : ''} ${picked === i && !result ? 'animate-pulse' : ''}`}>
                          <span className="opacity-70 mr-1.5">{LETTERS[i]}.</span>{gone ? '' : say(o, locale)}
                          {game.poll && !gone && <span className="ml-auto pl-2 text-[11px] opacity-80">{game.poll[i]}%</span>}
                        </PixelButton>
                      );
                    })}
                  </div>
                </>
              )}

              {result && picked !== -1 && asked && (
                <div className="px-notch px-inset p-3 space-y-1 px-in-up">
                  <p className={`px-title !text-[15px] ${result.correct ? 'text-[var(--px-jade,#6fd39a)]' : 'text-[#ff8a7a]'}`}>
                    <FormattedMessage id={result.correct ? 'world.ladderRight' : 'world.ladderWrong'} values={{ answer: say(asked.options[asked.answer], locale) }} />
                  </p>
                  {asked.question.note && <p className="text-[13px] opacity-85">{say(asked.question.note, locale)}</p>}
                </div>
              )}

              {over ? (
                <div className="text-center space-y-2 py-1">
                  <p className="px-title !text-[20px] text-[var(--px-gold)]">
                    <FormattedMessage id={`world.ladderOver.${over.how}`} values={{ n: over.points }} />
                  </p>
                  {result?.record && over.points > 0 && <p className="text-[13px]"><FormattedMessage id="world.ladderRecord" /></p>}
                  <div className="flex justify-center gap-2">
                    <PixelButton tone="gold" onClick={() => start(game.type)}><FormattedMessage id="world.ladderAgain" /></PixelButton>
                    <PixelButton tone="paper" onClick={() => { setGame(null); setResult(null); setPicked(null); }}><FormattedMessage id="world.ladderOtherType" /></PixelButton>
                  </div>
                </div>
              ) : result ? (
                <PixelButton tone="gold" block onClick={onward}><FormattedMessage id="world.ladderNext" /></PixelButton>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  {LIFELINES.map((l) => (
                    <PixelButton key={l} tone="sky" disabled={!canUse(game, l) || picked !== null} onClick={() => help(l)} className="!px-2.5 !py-1 !text-[12px]">
                      <PixelIcon name={LIFELINE_ICON[l]} size={1} /> <FormattedMessage id={`world.ladderHelp.${l}`} />
                    </PixelButton>
                  ))}
                  <PixelButton tone="paper" disabled={picked !== null} onClick={quit} className="!px-2.5 !py-1 !text-[12px] ml-auto">
                    <PixelIcon name="flag" size={1} /> <FormattedMessage id="world.ladderStop" values={{ n: banked(game) }} />
                  </PixelButton>
                </div>
              )}
              {!over && !result && game.rung > 0 && (
                <p className="text-[11px] opacity-70"><FormattedMessage id="world.ladderFloor" values={{ n: floorPoints(game) }} /></p>
              )}
            </div>

            {/* The ladder: top rung first. */}
            <ol className="px-notch px-inset p-2 text-[12px] flex sm:flex-col-reverse gap-0.5 overflow-x-auto">
              {RUNG_POINTS.map((p, r) => {
                const here = r === game.rung && !over;
                const passed = r < (result?.next.rung ?? game.rung);
                const safe = (SAFE_RUNGS as readonly number[]).includes(r);
                return (
                  <li key={r} className={`flex items-center justify-between gap-2 px-1.5 py-0.5 shrink-0 ${here ? 'bg-[var(--px-gold)] text-black' : ''} ${safe && !here ? 'text-[var(--px-gold)]' : ''} ${passed && !here ? 'opacity-55' : ''}`}>
                    <span className={`${LEVEL_TONE[levelOf(r)]} ${here ? '!text-black' : ''} opacity-90`}>{r + 1}</span>
                    <span className="hidden sm:inline-flex items-center gap-1">{passed && <PixelIcon name="check" size={1} />}{p}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
