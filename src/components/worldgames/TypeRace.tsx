import { useEffect, useMemo, useRef, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { useCompanion } from '../../hooks/useCompanion';
import { DEFAULT_LOOK } from '../../game/wardrobe';
import { WORD_LIST } from '../../lib/wordService';
import { playCorrect, playWin, playWrong } from '../../lib/sfx';
import { accuracy, playerProgress, raceWords, trainProgress, wpm } from '../../lib/typeRace';
import { LookSprite } from './LookSprite';
import { PixelButton, PixelChip } from './pixel';
import { useWorld } from './world';

// The type race at Ga Huế: race the train by typing your own words. The
// train keeps a steady pace — slow, express or bullet — and you move as you
// type: a word counts once it's right (a typo stays red until you fix it),
// space or enter for the next. First to the end wins. Nothing is written to
// your progress. The rules are lib/typeRace.

const WORDS = 20;
const TRAINS = [
  { id: 'slow', wpm: 20 },
  { id: 'express', wpm: 35 },
  { id: 'bullet', wpm: 50 },
] as const;

type Phase = { kind: 'setup' } | { kind: 'race'; start: number } | { kind: 'done'; ms: number; won: boolean };

export function TypeRace({ onClose }: { onClose: () => void }) {
  const { wordPool } = useWorld();
  const look = useCompanion((s) => s.dress) ?? DEFAULT_LOOK;
  const [train, setTrain] = useState(1);
  const [phase, setPhase] = useState<Phase>({ kind: 'setup' });
  const [words, setWords] = useState<string[]>([]);
  const [done, setDone] = useState(0);
  const [typed, setTyped] = useState('');
  const [keys, setKeys] = useState({ right: 0, total: 0 });
  const [now, setNow] = useState(() => Date.now());
  const input = useRef<HTMLInputElement>(null);

  const pool = useMemo(() => (wordPool.length >= WORDS ? wordPool : [...wordPool, ...WORD_LIST.map((w) => w.word)]), [wordPool]);

  const go = () => {
    setWords(raceWords(pool, WORDS));
    setDone(0); setTyped(''); setKeys({ right: 0, total: 0 });
    setPhase({ kind: 'race', start: Date.now() });
    setTimeout(() => input.current?.focus(), 0);
  };

  // While racing: the clock, and the train's arrival.
  useEffect(() => {
    if (phase.kind !== 'race') return;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (trainProgress(words, TRAINS[train].wpm, n - phase.start) >= 1) {
        playWrong();
        setPhase({ kind: 'done', ms: n - phase.start, won: false });
      }
    }, 100);
    return () => clearInterval(t);
  }, [phase, words, train]);

  const word = words[done] ?? '';
  const onType = (value: string) => {
    if (phase.kind !== 'race') return;
    // A space or enter after the right word: on to the next.
    if (/\s$/.test(value)) {
      if (value.trim() === word) {
        const next = done + 1;
        setDone(next); setTyped('');
        if (next === words.length) {
          playWin();
          setPhase({ kind: 'done', ms: Date.now() - phase.start, won: true });
        } else playCorrect();
      }
      return;
    }
    // Count each new keystroke: right if it matches the word so far.
    if (value.length > typed.length) {
      const ok = value === word.slice(0, value.length);
      setKeys((k) => ({ right: k.right + (ok ? 1 : 0), total: k.total + 1 }));
    }
    setTyped(value);
  };

  const elapsed = phase.kind === 'race' ? now - phase.start : phase.kind === 'done' ? phase.ms : 0;
  const you = phase.kind === 'setup' ? 0 : playerProgress(words, done, typed);
  const them = phase.kind === 'setup' ? 0 : trainProgress(words, TRAINS[train].wpm, elapsed);
  const charsDone = words.slice(0, done).join(' ').length;

  return (
    <div className="px absolute inset-0 z-40 flex items-end sm:items-center justify-center p-3 bg-black/25" onKeyDown={(e) => e.stopPropagation()}>
      <div className="px-notch px-frame w-full max-w-[640px] p-4 px-in-up">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="px-title !text-[18px] text-[var(--px-gold)]">🚆 <FormattedMessage id="world.raceTitle" /></p>
            <p className="text-[13px] text-[var(--px-muted)]"><FormattedMessage id="places.gaHue" /></p>
          </div>
          <button onClick={onClose} className="px-title !text-[12px] text-[var(--px-muted)] hover:text-[var(--px-text)] mt-1">
            <FormattedMessage id="world.focusLeave" />
          </button>
        </div>

        {/* The track: you and the train. */}
        <div className="px-inset px-notch p-2 mb-3 space-y-1.5">
          {[{ p: you, who: <LookSprite look={look} scale={2} /> }, { p: them, who: <span className="text-[26px] leading-none">🚆</span> }].map(({ p, who }, i) => (
            <div key={i} className="relative h-11 border-b-2 border-dashed border-[#5a4a3e]">
              <span className="absolute bottom-0 transition-[left] duration-100" style={{ left: `calc(${p * 100}% - ${p * 44}px)` }}>{who}</span>
              <span className="absolute right-0 bottom-0 text-[16px]">🏁</span>
            </div>
          ))}
        </div>

        {phase.kind === 'setup' && (
          <>
            <p className="text-[14px] mb-3"><FormattedMessage id="world.raceIntro" values={{ count: WORDS }} /></p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {TRAINS.map((t, i) => (
                <PixelChip key={t.id} on={train === i} onClick={() => setTrain(i)}>
                  <FormattedMessage id={`world.race.${t.id}`} /> · {t.wpm} wpm
                </PixelChip>
              ))}
            </div>
            <PixelButton tone="jade" block onClick={go}><FormattedMessage id="world.raceGo" /></PixelButton>
          </>
        )}

        {phase.kind === 'race' && (
          <>
            <p className="px-inset px-notch p-3 text-[17px] leading-relaxed mb-2 font-mono">
              {words.map((w, i) => {
                if (i < done) return <span key={i} className="text-[var(--px-jade)]">{w} </span>;
                if (i > done) return <span key={i} className="text-[var(--px-muted)]">{w} </span>;
                return (
                  <span key={i} className="underline decoration-[var(--px-gold)]">
                    {[...w].map((c, j) => (
                      <span key={j} style={{ color: j >= typed.length ? undefined : typed[j] === c ? 'var(--px-jade)' : 'var(--px-bad)' }}>{c}</span>
                    ))}{' '}
                  </span>
                );
              })}
            </p>
            <input
              ref={input}
              value={typed}
              onChange={(e) => onType(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onType(`${typed} `); } }}
              autoCapitalize="off" autoCorrect="off" autoComplete="off" spellCheck={false}
              className="px-inset px-notch w-full px-3 py-2 text-[17px] font-mono bg-transparent outline-none"
              style={{ color: word.startsWith(typed) ? undefined : 'var(--px-bad)' }}
            />
            <p className="mt-2 text-[13px] text-[var(--px-muted)] px-num">
              {wpm(charsDone, elapsed)} wpm · {accuracy(keys.right, keys.total)}%
            </p>
          </>
        )}

        {phase.kind === 'done' && (
          <>
            <p className="px-title !text-[20px] mb-1" style={{ color: phase.won ? 'var(--px-jade)' : 'var(--px-bad)' }}>
              <FormattedMessage id={phase.won ? 'world.raceWon' : 'world.raceLost'} />
            </p>
            <p className="text-[15px] mb-4 px-num">
              <FormattedMessage
                id="world.raceStats"
                values={{ wpm: wpm(phase.won ? words.join(' ').length : charsDone, phase.ms), accuracy: accuracy(keys.right, keys.total), words: done, total: words.length }}
              />
            </p>
            <PixelButton tone="jade" block onClick={go}><FormattedMessage id="world.raceAgain" /></PixelButton>
          </>
        )}
      </div>
    </div>
  );
}
