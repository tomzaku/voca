import { Icon } from '@iconify/react';
import { FormattedMessage } from 'react-intl';
import { GuessGame } from '../GuessGame';
import { SynAnt } from '../SynAnt';
import { BuddyBadge } from '../BuddyBadge';
import { DefLengthToggle, ExampleList, PosChip } from './parts';
import { LEVEL_COLOR, LEVEL_LABEL_ID } from './constants';
import { familyForms, maskAnswer } from '../../lib/answerMask';
import type { CardSpeech } from './useCardSpeech';
import type { GuessGameMode, RealGuessGameMode } from '../../hooks/useGuessGame';
import type { AnswerVia, VocabularyWord } from '../../types';

/**
 * The card while the word is still hidden: a definition clue at the top, the
 * guess game below it, and the one way out — give up and reveal the answer.
 * ("Never show again" lives on the revealed card, once the learner has
 * actually seen what they're dismissing.)
 *
 * Everything shown here is masked. AI-written definitions and synonyms
 * routinely restate the word being guessed, and a doodle of the meaning gives
 * it away faster than any text does, so the drawing is held back entirely
 * until the word is revealed.
 */
export function GuessView({
  wordData, definition, fullDef, onToggleFullDef, speech,
  game, onGameChange, onSolved, onMistake, onReveal,
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
}) {
  const answerWord = wordData.headword || wordData.word;

  return (
    // The revealed card's grid, so the clue card keeps its place and width
    // when the answer comes in — it used to span the page, then jump into the
    // left column on reveal.
    <div className="grid grid-cols-1 lg:grid-cols-[2.2fr_1fr] gap-4 sm:gap-5 items-start">
      <div className="flex flex-col gap-3 sm:gap-4">
        {/* Definition clue — surfaced at the top while guessing so the hint sits
            above the game (key for mobile flow) */}
        <div className="card-game border-accent-cyan p-3 sm:p-6 animate-bounce-in">
          <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-3">
            <span className="text-lg sm:text-xl leading-none animate-bob">💡</span>
            {/* Just "Guess" on mobile — the long title was pushing the
                Short/Full switch off the card. */}
            <h3 className="text-sm font-display font-extrabold text-accent-cyan uppercase tracking-wide whitespace-nowrap">
              <span className="sm:hidden"><FormattedMessage id="flashcard.guessShort" /></span>
              <span className="hidden sm:inline"><FormattedMessage id="flashcard.guessTheWord" /></span>
            </h3>
            {/* The same tag row as the revealed card, kept together beside
                the title rather than split across the header. */}
            {wordData.partOfSpeech && <PosChip pos={wordData.partOfSpeech} className="text-[11px]" />}
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${LEVEL_COLOR[wordData.level]}`}>
              {LEVEL_LABEL_ID[wordData.level] ? <FormattedMessage id={LEVEL_LABEL_ID[wordData.level]} /> : wordData.level}
            </span>
            <div className="ml-auto">
              <DefLengthToggle show={Boolean(wordData.shortDefinition)} fullDef={fullDef} onToggle={onToggleFullDef} />
            </div>
          </div>
          {/* The clue is the whole puzzle, so it gets the revealed card's
              definition size. */}
          <p className="text-base sm:text-xl font-medium text-text-primary leading-relaxed">
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

        <GuessGame
          key={wordData.word}
          wordData={wordData}
          game={game}
          onGameChange={onGameChange}
          onSolved={onSolved}
          onGaveUp={onReveal}
          onMistake={onMistake}
        />

        {/* Giving up is the way out, not the goal — a quiet button, so the
            answers above stay the loudest thing on the card. */}
        <div className="flex justify-end">
          <button
            onClick={() => onReveal()}
            className="group btn-3d relative overflow-hidden w-full sm:w-auto px-6 py-2.5 bg-bg-card text-text-secondary hover:text-accent-orange text-sm"
          >
            <span className="flex items-center justify-center gap-2 transition-all duration-300 group-hover:-translate-y-8 group-hover:opacity-0">
              <Icon icon="solar:flag-2-bold" className="text-lg" />
              <FormattedMessage id="flashcard.giveUp" />
            </span>
            <span className="absolute inset-0 flex items-center justify-center gap-2 translate-y-8 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
              <Icon icon="solar:eye-bold" className="text-lg" />
              <FormattedMessage id="flashcard.revealAnswer" />
            </span>
          </button>
        </div>
      </div>

      {/* Nothing about the word can sit beside it yet — phrases and idioms
          contain the answer — so the column holds the learner's standing,
          which is what this round is adding to. Desktop only: on a phone it
          would only push the page longer below the game. */}
      <div className="hidden lg:block lg:sticky lg:top-20">
        <BuddyBadge />
      </div>
    </div>
  );
}
