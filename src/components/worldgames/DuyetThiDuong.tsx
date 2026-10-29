import { useEffect, useMemo, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { pairKey, pairPool, randomRound, type PairRound } from '../../lib/ipaRules';
import { speakText, stopSpeaking } from '../../lib/tts';
import { playCorrect, playWrong } from '../../lib/sfx';
import { HudActionBar, HudBanner, HudSlot, HudTop, PixelButton, PixelIcon } from './pixel';

// The IPA building — Duyệt Thị Đường, the royal theatre where court music
// played; here it trains the ear. The IPA page's minimal-pairs drill (the
// same pairs, the same rounds from lib/ipaRules): one word of a pair learners
// confuse — ship / sheep, light / right — is played, and you pick which it
// was on 1 or 2. Space plays it again; after an answer both can be heard.

export function DuyetThiDuong() {
  const pool = useMemo(() => pairPool(null), []);
  const [round, setRound] = useState<PairRound>(() => randomRound(pool));
  const [picked, setPicked] = useState<'a' | 'b' | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0, streak: 0 });

  const play = (word: string) => { stopSpeaking(); void speakText(word); };

  // The word is played as each round comes up.
  useEffect(() => {
    play(round.pair[round.correct].word);
    return () => stopSpeaking();
  }, [round]);

  const pick = (side: 'a' | 'b') => {
    if (picked) return;
    setPicked(side);
    const ok = side === round.correct;
    (ok ? playCorrect : playWrong)();
    setScore((s) => ({ correct: s.correct + (ok ? 1 : 0), total: s.total + 1, streak: ok ? s.streak + 1 : 0 }));
  };
  const next = () => {
    setPicked(null);
    setRound(randomRound(pool, pairKey(round.pair)));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '1' || e.key === '2') { e.preventDefault(); pick(round.order[Number(e.key) - 1]); }
      else if (e.key === ' ') { e.preventDefault(); play(round.pair[round.correct].word); }
      else if (e.key === 'Enter' && picked) { e.preventDefault(); next(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const { a, b } = round.pair;
  return (
    <>
      <HudTop>
        <div className="flex items-center gap-4">
          <span className="px-title text-[var(--px-accent)] flex-1"><FormattedMessage id="world.featureIpa" /></span>
          {score.streak >= 2 && (
            <span className="flex items-center gap-1 px-num text-[20px] text-[var(--px-gold)]">
              <PixelIcon name="flame" size={2} />×{score.streak}
            </span>
          )}
          <span className="flex items-center gap-1.5 px-num text-[24px] leading-none text-[var(--px-good)]">
            <PixelIcon name="check" size={2} />{score.correct} / {score.total}
          </span>
        </div>
      </HudTop>

      <HudBanner key={pairKey(round.pair)} label={<FormattedMessage id="world.ipaWhich" />} aside={<span className="normal-case tracking-normal">/{a.symbol}/ · /{b.symbol}/</span>}>
        <div className="flex flex-wrap items-center gap-3">
          <PixelButton tone="sky" onClick={() => play(round.pair[round.correct].word)}>
            <PixelIcon name="speaker" size={2} /> <FormattedMessage id="listening.play" />
          </PixelButton>
          {picked ? (
            <>
              {[a, b].map((side) => (
                <PixelButton key={side.word} tone="paper" onClick={() => play(side.word)}>
                  <PixelIcon name="speaker" size={2} /> {side.word}
                </PixelButton>
              ))}
              <PixelButton tone="red" onClick={next}><FormattedMessage id="flashcard.next" /> ↵</PixelButton>
            </>
          ) : (
            <span className="text-[14px] text-[var(--px-muted)]"><FormattedMessage id="world.ipaReplay" /></span>
          )}
        </div>
      </HudBanner>

      <HudActionBar pair key={`${pairKey(round.pair)}-${round.correct}`}>
        {round.order.map((side, i) => {
          const s = round.pair[side];
          const state = !picked ? 'idle' : side === round.correct ? 'good' : side === picked ? 'bad' : 'dim';
          return (
            <HudSlot key={side} hotkey={String(i + 1)} state={state} onClick={() => pick(side)}>
              <span className="block text-[24px]">{s.word}</span>
              <span className="block text-[15px] font-semibold text-[var(--px-muted)]">/{s.symbol}/</span>
            </HudSlot>
          );
        })}
      </HudActionBar>
    </>
  );
}
