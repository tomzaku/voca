import { useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  answer, banked, bestKey, canUse, current, floorPoints, LIFELINES, levelOf, newLadder, recordScore, bestScores,
  RANGES, RANGE_LEVELS, RUNG_COUNT, RUNG_POINTS, SAFE_RUNGS, say, saveRange, savedRange, stop, askClass, takeHalf, swapQuestion,
  type LadderGame, type LadderRange, type LadderType, type Lifeline,
} from '../../lib/quocHocLadder';
import { QUESTION_TYPES } from '../../lib/ladderQuestions';
import { playCorrect, playSelect, playWin, playWrong } from '../../lib/sfx';
import { PixelButton, PixelChip, PixelIcon, type PixelIconName } from './pixel';

const LIFELINE_ICON: Record<Lifeline, PixelIconName> = { half: 'percent', class: 'people', swap: 'retry' };
const LETTERS = ['A', 'B', 'C', 'D'];
const LEVEL_TONE = { easy: 'text-[var(--px-jade,#6fd39a)]', medium: 'text-[var(--px-sky)]', hard: 'text-[#ff8a7a]', expert: 'text-[#c79bff]' };
/** How long an answer is held, locked in, before it's revealed. */
const SUSPENSE_MS = 900;

/**
 * The quiz ladder on the lawn beside Quốc Học: fifteen general questions,
 * easy to hard, with safe rungs and three helps (lib/quocHocLadder). It
 * opens straight on a climb of every type mixed at random; one type only is
 * a choice you can make before the first answer (or after a climb ends), not
 * a step in the way. So is the range — medium → expert, or easy → hard for
 * children — and it opens on the one chosen last (medium → expert at first). Your best
 * climb per type and range is kept on this device.
 */
export function QuocHocLadder({ onClose }: { onClose: () => void }) {
  const intl = useIntl();
  const locale = intl.locale;
  const [game, setGame] = useState<LadderGame>(() => newLadder('all', savedRange()));
  /** Choosing one type of question instead — optional, over the climb. */
  const [choosing, setChoosing] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  /** The answer's outcome, once revealed, and the game it leads to. */
  const [result, setResult] = useState<{ correct: boolean; next: LadderGame; record: boolean } | null>(null);
  const [best, setBest] = useState(bestScores);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const start = (type: LadderType, range: LadderRange = game.range) => { setGame(newLadder(type, range)); setPicked(null); setResult(null); setChoosing(false); };
  /** Picking a range keeps the picker open: the type is usually next. */
  const pickRange = (range: LadderRange) => { playSelect(); saveRange(range); setGame(newLadder(game.type, range)); setPicked(null); setResult(null); };
  const levelName = (i: 0 | 1 | 2) => intl.formatMessage({ id: `world.ladderLevel.${RANGE_LEVELS[game.range][i]}` }).toLowerCase();

  const pick = (i: number) => {
    if (picked !== null || game.hidden.includes(i)) return;
    setPicked(i);
    playSelect();
    timer.current = window.setTimeout(() => {
      const { game: next, correct } = answer(game, i);
      const record = next.over ? recordScore(next.type, next.range, next.over.points) : false;
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
    if (picked !== null) return;
    playSelect();
    setGame(l === 'half' ? takeHalf(game) : l === 'class' ? askClass(game) : swapQuestion(game));
  };

  const quit = () => {
    if (picked !== null) return;
    const g = stop(game);
    const record = recordScore(g.type, g.range, g.over!.points);
    setBest(bestScores());
    setGame(g);
    setResult({ correct: true, next: g, record });
    setPicked(-1);
  };

  // The question on screen — still shown after it ends the game.
  const asked = current({ ...game, over: null });
  const over = result?.next.over ?? null;
  // Changing type starts a new climb, so it's offered only while there's
  // nothing to lose: before the first answer, or once the climb is over.
  const canChange = (game.rung === 0 && picked === null) || !!over;

  return (
    <div className="px absolute inset-0 z-40 flex items-end sm:items-center justify-center p-3 bg-black/25" onKeyDown={(e) => e.stopPropagation()}>
      <div className="px-notch px-frame w-full max-w-[780px] p-4 px-in-up max-h-full overflow-y-auto">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="px-title !text-[18px] text-[var(--px-gold)] flex items-center gap-2"><PixelIcon name="cap" size={2} /> <FormattedMessage id="world.ladderTitle" /></p>
            <p className="text-[12px] opacity-80"><FormattedMessage id="world.ladderHow" values={{ a: levelName(0), b: levelName(1), c: levelName(2) }} /></p>
          </div>
          <PixelButton tone="paper" onClick={onClose} className="!px-2.5 !py-1 !text-[13px] shrink-0"><FormattedMessage id="world.close" /></PixelButton>
        </div>

        {choosing ? (
          <div className="py-3 space-y-3 text-center">
            <p className="text-[14px]"><FormattedMessage id="world.ladderPickRange" /></p>
            <div className="flex flex-wrap justify-center gap-2">
              {RANGES.map((r) => (
                <PixelChip key={r} on={r === game.range} onClick={() => pickRange(r)}>
                  <FormattedMessage id={`world.ladderRange.${r}`} />
                </PixelChip>
              ))}
            </div>
            <p className="text-[14px]"><FormattedMessage id="world.ladderPickType" /></p>
            <div className="flex flex-wrap justify-center gap-2">
              {(['all', ...QUESTION_TYPES] as LadderType[]).map((t) => (
                <PixelChip key={t} on={t === game.type} onClick={() => start(t)}>
                  <FormattedMessage id={`world.ladderType.${t}`} />
                  {best[bestKey(t, game.range)] ? <span className="opacity-70 text-[11px] ml-1 inline-flex items-center gap-0.5"><PixelIcon name="star" size={1} />{best[bestKey(t, game.range)]}</span> : null}
                </PixelChip>
              ))}
            </div>
            <p className="text-[12px] opacity-70"><FormattedMessage id="world.ladderRules" values={{ a: SAFE_RUNGS[0] + 1, b: SAFE_RUNGS[1] + 1 }} /></p>
            <PixelButton tone="paper" onClick={() => { playSelect(); setChoosing(false); }} className="!px-2.5 !py-1 !text-[12px]"><FormattedMessage id="world.ladderKeepType" /></PixelButton>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-[1fr_168px]">
            <div className="space-y-3 min-w-0">
              {canChange && (
                <div className="flex items-center justify-between gap-2 text-[12px]">
                  <span className="opacity-80"><FormattedMessage id="world.ladderPlaying" values={{ type: intl.formatMessage({ id: `world.ladderType.${game.type}` }), range: intl.formatMessage({ id: `world.ladderRange.${game.range}` }) }} /></span>
                  <PixelButton tone="paper" onClick={() => { playSelect(); setChoosing(true); }} className="!px-2 !py-0.5 !text-[12px]">
                    <PixelIcon name="sliders" size={1} /> <FormattedMessage id="world.ladderChangeType" />
                  </PixelButton>
                </div>
              )}
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
                    <PixelButton tone="paper" onClick={() => { playSelect(); setChoosing(true); }}><FormattedMessage id="world.ladderOtherType" /></PixelButton>
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
                    <span className={`${LEVEL_TONE[levelOf(r, game.range)]} ${here ? '!text-black' : ''} opacity-90`}>{r + 1}</span>
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
