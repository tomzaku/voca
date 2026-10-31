import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import type { useLearnRound } from '../../hooks/useLearnRound';
import { useGameScore } from '../../hooks/useGameScore';
import { choiceOptions, freeLetterPositions, guessMatches, isLetter, scrambleTiles, ONE_SHOT } from '../../lib/learnRules';
import { getActiveWordList } from '../../lib/wordService';
import { speakText, stopSpeaking } from '../../lib/tts';
import { playCorrect, playSelect, playWrong } from '../../lib/sfx';
import type { VocabularyWord } from '../../types';
import {
  HudActionBar, HudBanner, HudCenter, HudDock, HudSlot,
  PixelButton, PixelIcon, PixelLetter, PixelLoader,
} from './pixel';

// One Learn round after another, as a HUD around the map: the clue in a
// banner on top, the guess game docked at the bottom, the word revealed in
// the middle once it's solved or given away. The rules are the flash card's
// (useLearnRound for picking and grading, learnRules for the games); the
// buildings that use this — Tàng Thư Lâu's desk, Thiên Mụ's review — only bring
// their own top bar and what to show when there's nothing left to play.

export type LearnRound = ReturnType<typeof useLearnRound>;

export function LearnRoundHud({ round, top, empty }: { round: LearnRound; top: ReactNode; empty: ReactNode }) {
  const intl = useIntl();
  const { win, breakStreak } = useGameScore();
  const { phase, wordData, answer, game } = round;

  const solve = () => {
    win();
    playCorrect();
    stopSpeaking();
    setTimeout(() => speakText(answer), 250);
    round.solve();
  };
  const giveUp = () => {
    breakStreak();
    playWrong();
    stopSpeaking();
    setTimeout(() => speakText(answer), 250);
    round.giveUp();
  };
  const miss = () => {
    playWrong();
    round.miss();
    if (ONE_SHOT[game]) giveUp();
  };

  // Enter moves on once the word is revealed.
  useEffect(() => {
    if (phase !== 'solved' && phase !== 'gaveUp') return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); void round.next(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, round]);

  useEffect(() => () => stopSpeaking(), []);

  if (phase === 'loading') return <>{top}<HudCenter><PixelLoader label={<FormattedMessage id="world.loading" />} /></HudCenter></>;
  if (phase === 'empty' || !wordData) return <>{top}{empty}</>;

  if (phase === 'solved' || phase === 'gaveUp') {
    return <>{top}<Reveal wordData={wordData} answer={answer} solved={phase === 'solved'} onNext={() => void round.next()} /></>;
  }

  const clue = wordData.shortDefinition?.trim() || wordData.definition;
  return (
    <>
      {top}
      <HudBanner label={intl.formatMessage({ id: 'world.learnClue' })} aside={wordData.partOfSpeech}>
        {game === 'listen' ? (
          <PixelButton tone="sky" onClick={() => { stopSpeaking(); speakText(answer); }}>
            <PixelIcon name="speaker" size={2} /> <FormattedMessage id="games.listenAndSpell" />
          </PixelButton>
        ) : clue}
        {game === 'letters' && wordData.translation && (
          <span className="block mt-2 text-[15px] text-[#9fe0e8]">· {wordData.translation}</span>
        )}
      </HudBanner>

      {game === 'choice' && <ChoiceGame key={answer} answer={answer} onSolve={solve} onMiss={miss} />}
      {game === 'scramble' && <ScrambleGame key={answer} answer={answer} onSolve={solve} onMiss={miss} onGiveUp={giveUp} />}
      {(game === 'letters' || game === 'listen') && (
        <TypeGame key={answer} answer={answer} reveal={game === 'letters'} speakOnStart={game === 'listen'} onSolve={solve} onMiss={miss} onGiveUp={giveUp} />
      )}
    </>
  );
}

// ── Choice: the word among four, on hotkeys 1–4 ──
function ChoiceGame({ answer, onSolve, onMiss }: { answer: string; onSolve: () => void; onMiss: () => void }) {
  const options = useMemo(() => choiceOptions(answer, getActiveWordList().map((w) => w.word)), [answer]);
  const [picked, setPicked] = useState<string | null>(null);

  const pick = (opt: string) => {
    if (picked) return;
    playSelect();
    setPicked(opt);
    // Let the right/wrong colours show before the round moves on.
    setTimeout(() => (guessMatches(opt, answer) ? onSolve() : onMiss()), 600);
  };

  useEffect(() => {
    if (picked) return;
    const onKey = (e: KeyboardEvent) => {
      const opt = options[Number(e.key) - 1];
      if (opt) { e.preventDefault(); pick(opt); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <HudActionBar>
      {options.map((opt, i) => {
        const state = !picked ? 'idle' : guessMatches(opt, answer) ? 'good' : opt === picked ? 'bad' : 'dim';
        return <HudSlot key={opt} hotkey={String(i + 1)} state={state} onClick={() => pick(opt)}>{opt}</HudSlot>;
      })}
    </HudActionBar>
  );
}

// ── Unscramble: tap (or type) the tiles in order ──
function ScrambleGame({ answer, onSolve, onMiss, onGiveUp }: { answer: string; onSolve: () => void; onMiss: () => void; onGiveUp: () => void }) {
  const tiles = useMemo(() => scrambleTiles(answer), [answer]);
  const [picked, setPicked] = useState<number[]>([]);
  const [wrong, setWrong] = useState(false);
  const built = picked.map((id) => tiles.find((t) => t.id === id)!.char);

  const place = (id: number) => {
    if (wrong || picked.includes(id)) return;
    const next = [...picked, id];
    setPicked(next);
    if (next.length < answer.length) { playSelect(); return; }
    const attempt = next.map((pid) => tiles.find((t) => t.id === pid)!.char).join('');
    if (guessMatches(attempt, answer)) { onSolve(); return; }
    setWrong(true);
    onMiss();
    setTimeout(() => { setWrong(false); setPicked([]); }, 700);
  };

  // Typing works too: a letter takes the first unused tile that carries it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Backspace') { e.preventDefault(); setPicked((p) => p.slice(0, -1)); return; }
      if (e.key.length !== 1) return;
      const tile = tiles.find((t) => !picked.includes(t.id) && t.char.toLowerCase() === e.key.toLowerCase());
      if (tile) { e.preventDefault(); place(tile.id); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <HudDock>
      <div className={`flex flex-wrap justify-center gap-1.5 ${wrong ? 'px-shake' : ''}`}>
        {answer.split('').map((_, i) => (
          <PixelLetter key={i} char={built[i]} state={built[i] === undefined ? 'blank' : wrong ? 'bad' : 'shown'} />
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-1.5">
        {tiles.map((t) => <PixelLetter key={t.id} char={t.char} state={picked.includes(t.id) ? 'used' : 'tile'} onClick={() => place(t.id)} />)}
      </div>
      <div className="flex justify-center gap-2">
        <PixelButton tone="paper" onClick={() => setPicked((p) => p.slice(0, -1))} disabled={picked.length === 0}>
          <FormattedMessage id="world.learnBackspace" />
        </PixelButton>
        <PixelButton tone="paper" onClick={onGiveUp}><FormattedMessage id="world.learnGiveUp" /></PixelButton>
      </div>
    </HudDock>
  );
}

// ── Letters / Listen: type the whole word. Letters shows 40% of it (one
//    guess); Listen shows only blanks and lets you try again. ──
function TypeGame({ answer, reveal, speakOnStart, onSolve, onMiss, onGiveUp }: {
  answer: string;
  reveal: boolean;
  speakOnStart: boolean;
  onSolve: () => void;
  onMiss: () => void;
  onGiveUp: () => void;
}) {
  const intl = useIntl();
  const given = useMemo(() => (reveal ? freeLetterPositions(answer) : new Set<number>()), [answer, reveal]);
  const [guess, setGuess] = useState('');
  const [wrong, setWrong] = useState(false);

  useEffect(() => {
    if (speakOnStart) speakText(answer);
  }, [answer, speakOnStart]);

  const check = () => {
    if (!guess.trim() || wrong) return;
    if (guessMatches(guess, answer)) { onSolve(); return; }
    setWrong(true);
    onMiss(); // ends the round in Letters (one guess); Listen lets you retry
    setTimeout(() => { setWrong(false); setGuess(''); }, 700);
  };

  return (
    <HudDock>
      <div className={`flex flex-wrap justify-center gap-1.5 ${wrong ? 'px-shake' : ''}`}>
        {answer.split('').map((c, i) => {
          const known = !isLetter(c) || given.has(i);
          return <PixelLetter key={i} char={c} state={known ? 'given' : 'blank'} />;
        })}
      </div>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); check(); }}>
        <input
          autoFocus
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          placeholder={intl.formatMessage({ id: 'world.learnTypeHere' })}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className={`px-inset px-notch flex-1 min-w-0 px-3 py-2.5 text-[20px] font-bold text-[var(--px-text)] placeholder:text-[var(--px-muted)] focus:outline-none ${wrong ? 'px-shake' : ''}`}
        />
        <PixelButton type="submit" tone="jade" disabled={!guess.trim()}>
          <FormattedMessage id="world.learnCheck" />
        </PixelButton>
        {!reveal && (
          <PixelButton type="button" tone="paper" onClick={onGiveUp}><FormattedMessage id="world.learnGiveUp" /></PixelButton>
        )}
      </form>
    </HudDock>
  );
}

// ── The word, once it's solved or given away ──
function Reveal({ wordData, answer, solved, onNext }: { wordData: VocabularyWord; answer: string; solved: boolean; onNext: () => void }) {
  const ipa = wordData.phonetics?.['en-US'] ?? Object.values(wordData.phonetics ?? {})[0];
  const example = wordData.examples?.[0];
  return (
    <HudCenter>
      <p className={`px-title mb-1 ${solved ? 'text-[var(--px-good)]' : 'text-[var(--px-bad)]'}`}>
        {solved ? <FormattedMessage id="games.correct" /> : <FormattedMessage id="world.learnTheWord" />}
      </p>
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className="px-num text-[44px] leading-none text-[var(--px-gold)]">{answer}</span>
        {ipa && <span className="text-[var(--px-muted)]">/{ipa}/</span>}
        <button onClick={() => { stopSpeaking(); speakText(answer); }} className="text-[var(--px-sky)]" aria-label={answer}>
          <PixelIcon name="speaker" size={3} />
        </button>
      </div>
      {wordData.partOfSpeech && <p className="px-title text-[var(--px-muted)] mt-2">{wordData.partOfSpeech}</p>}
      <p className="mt-2 text-[17px] leading-snug">{wordData.definition}</p>
      {example && <p className="mt-3 text-[15px] italic text-[var(--px-muted)] leading-snug">“{example}”</p>}
      <PixelButton tone="red" block className="mt-5" onClick={onNext}>
        <FormattedMessage id="flashcard.nextWord" /> ↵
      </PixelButton>
    </HudCenter>
  );
}
