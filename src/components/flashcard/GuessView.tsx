import { Icon } from '@iconify/react';
import { GuessGame } from '../GuessGame';
import { BuddyBadge } from '../BuddyBadge';
import { SynAnt } from '../SynAnt';
import { DefLengthToggle, ExampleList, PosChip } from './parts';
import { LEVEL_COLOR } from './constants';
import { familyForms, maskAnswer } from '../../lib/answerMask';
import type { CardSpeech } from './useCardSpeech';
import type { GuessGameMode, RealGuessGameMode } from '../../hooks/useGuessGame';
import type { AnswerVia, VocabularyWord } from '../../types';

/**
 * The card while the word is still hidden: a definition clue at the top, the
 * guess game below it, and the two ways out — give up, or drop the word for
 * good.
 *
 * Everything shown here is masked. AI-written definitions and synonyms
 * routinely restate the word being guessed, and a doodle of the meaning gives
 * it away faster than any text does, so the drawing is held back entirely
 * until the word is revealed.
 */
export function GuessView({
  wordData, definition, fullDef, onToggleFullDef, speech,
  game, onGameChange, onSolved, onMistake, onReveal, onSkip,
}: {
  wordData: VocabularyWord;
  /** The chosen definition text — short or full, per the toggle. */
  definition: string;
  fullDef: boolean;
  onToggleFullDef: () => void;
  speech: CardSpeech;
  game: GuessGameMode;
  onGameChange: (game: GuessGameMode) => void;
  /** The player solved it — receives the game actually played. */
  onSolved: (playedGame: RealGuessGameMode) => void;
  onMistake: () => void;
  /** Give up — `via` names the game that was abandoned, if any. */
  onReveal: (via?: AnswerVia) => void;
  onSkip: () => void;
}) {
  const answerWord = wordData.headword || wordData.word;

  return (
    <>
      {/* Definition clue — surfaced at the top while guessing so the hint sits
          above the game (key for mobile flow) */}
      <div className="mb-4 sm:mb-5 card-game border-accent-cyan p-4 sm:p-5 animate-bounce-in">
        <div className="flex items-center gap-1.5 sm:gap-2 mb-2">
          <span className="text-lg sm:text-xl leading-none animate-bob">💡</span>
          {/* Just "Guess" on mobile — the long title was pushing the
              Short/Full switch off the card. */}
          <h3 className="text-sm font-display font-extrabold text-accent-cyan uppercase tracking-wide whitespace-nowrap">
            Guess<span className="hidden sm:inline"> the word</span>
          </h3>
          {wordData.partOfSpeech && <PosChip pos={wordData.partOfSpeech} className="text-[10px]" />}
          <span className={`ml-auto text-[10px] font-medium px-2 py-0.5 rounded ${LEVEL_COLOR[wordData.level]}`}>
            {wordData.level}
          </span>
          <DefLengthToggle show={Boolean(wordData.shortDefinition)} fullDef={fullDef} onToggle={onToggleFullDef} />
        </div>
        <p className="text-text-primary leading-relaxed text-base sm:text-lg">
          {maskAnswer(definition, answerWord, familyForms(wordData.wordFamily))}
        </p>
        <ExampleList
          wordData={wordData}
          masked
          speakingExample={speech.speakingExample}
          onSpeak={speech.speakExample}
        />
        <SynAnt wordData={wordData} maskWord={answerWord} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2.2fr_1fr] gap-4 sm:gap-5 items-start">
        <div className="flex flex-col gap-3 sm:gap-4">
          <GuessGame
            key={wordData.word}
            wordData={wordData}
            game={game}
            onGameChange={onGameChange}
            onSolved={onSolved}
            onGaveUp={onReveal}
            onMistake={onMistake}
          />

          <div className="flex gap-3">
            {/* Hovering swaps the label for what the button actually does —
                the default label slides out and the hint slides in. */}
            <button
              onClick={() => onReveal()}
              className="group btn-3d relative overflow-hidden flex-1 py-4 bg-accent-orange text-bg-primary text-base font-bold"
            >
              <span className="flex items-center justify-center gap-2 transition-all duration-300 group-hover:-translate-y-8 group-hover:opacity-0">
                <Icon icon="solar:flag-2-bold" className="text-2xl" />
                Give up
              </span>
              <span className="absolute inset-0 flex items-center justify-center gap-2 translate-y-8 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                <Icon icon="solar:eye-bold" className="text-2xl" />
                Reveal the answer
              </span>
            </button>
            <button
              onClick={onSkip}
              className="group btn-3d relative overflow-hidden flex-1 py-4 bg-accent-blue text-bg-primary text-base font-bold"
            >
              <span className="flex items-center justify-center gap-2 transition-all duration-300 group-hover:-translate-y-8 group-hover:opacity-0">
                <Icon icon="solar:skip-next-bold" className="text-2xl" />
                Skip
              </span>
              <span className="absolute inset-0 flex items-center justify-center gap-2 translate-y-8 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                <Icon icon="solar:eye-closed-bold" className="text-2xl" />
                Never show again
              </span>
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <BuddyBadge />
        </div>
      </div>
    </>
  );
}
