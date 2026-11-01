import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { FormattedMessage, useIntl } from 'react-intl';
import { speakText, stopSpeaking } from '../../lib/tts';
import type { PublicQuestion } from '../../lib/huntsApi';
import { questionKey } from '../../lib/hunt';

/**
 * One station question on a student's phone: four options to tap, or a word
 * to type. Grading is the server's — this only collects the answer. A wrong
 * answer locks the student out for a few seconds (`cooldown`), which the
 * server enforces too; the countdown is just so they know.
 */
interface QuestionProps {
  question: PublicQuestion;
  /** Seconds before another answer is taken. */
  cooldown: number;
  busy: boolean;
  onAnswer: (answer: string) => void;
}

export function HuntQuestion(props: QuestionProps) {
  return <QuestionBody key={questionKey(props.question)} {...props} />;
}

function QuestionBody({ question, cooldown, busy, onAnswer }: QuestionProps) {
  const intl = useIntl();
  const [typed, setTyped] = useState('');
  const locked = busy || cooldown > 0;

  // One you listen to plays by itself.
  useEffect(() => {
    if (question.say) void speakText(question.say);
    return () => stopSpeaking();
  }, [question.say]);

  const submit = () => {
    if (!typed.trim() || locked) return;
    onAnswer(typed.trim());
  };

  return (
    <div className="space-y-4">
      <p className="text-xs font-bold uppercase tracking-wider text-accent-cyan">
        <FormattedMessage id={`hunt.type.${question.type}`} />
      </p>

      {question.prompt && (
        <p className="text-lg font-semibold text-text-primary leading-snug">{question.prompt}</p>
      )}

      {question.say && (
        <button
          type="button"
          onClick={() => { stopSpeaking(); void speakText(question.say!); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-cyan/15 text-accent-cyan font-bold"
        >
          <Icon icon="lucide:volume-2" className="text-xl" />
          <FormattedMessage id="hunt.listenAgain" />
        </button>
      )}

      {question.scrambled && (
        <div className="flex flex-wrap gap-1.5" aria-label={question.scrambled}>
          {[...question.scrambled].map((c, i) => (
            <span key={i} className="w-10 h-11 rounded-lg bg-accent-yellow/20 border-2 border-accent-yellow/50 flex items-center justify-center text-xl font-display font-extrabold text-text-primary">
              {c}
            </span>
          ))}
        </div>
      )}

      {question.options ? (
        <div className="grid grid-cols-2 gap-2">
          {question.options.map((o) => (
            <button
              key={o}
              type="button"
              disabled={locked}
              onClick={() => onAnswer(o)}
              className="min-h-[56px] px-3 py-3 rounded-xl border-2 border-border bg-bg-tertiary text-text-primary font-bold text-left hover:border-accent-cyan disabled:opacity-50 transition-colors"
            >
              {o}
            </button>
          ))}
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex gap-2">
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            disabled={locked}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={(question.length ?? 20) + 10}
            placeholder={question.length ? intl.formatMessage({ id: 'hunt.typeAnswer' }, { n: question.length }) : intl.formatMessage({ id: 'hunt.typeFree' })}
            className="flex-1 min-w-0 bg-bg-tertiary border-2 border-border rounded-xl px-3 py-3 text-lg text-text-primary font-semibold focus:outline-none focus:border-accent-cyan disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={locked || !typed.trim()}
            className="px-5 rounded-xl bg-accent-cyan text-bg-primary font-display font-extrabold disabled:opacity-40"
          >
            <FormattedMessage id="hunt.check" />
          </button>
        </form>
      )}

      {cooldown > 0 && (
        <p className="text-sm font-bold text-accent-red flex items-center gap-1.5">
          <Icon icon="lucide:hourglass" />
          <FormattedMessage id="hunt.cooldown" values={{ n: cooldown }} />
        </p>
      )}
    </div>
  );
}

/**
 * The final: the letters the team collected, shown as tiles, and the box to
 * type the treasure word into. Tapping a tile adds its letter, for small hands.
 */
export function TreasureLock({ letters, cooldown, busy, onAnswer }: {
  letters: string[];
  cooldown: number;
  busy: boolean;
  onAnswer: (answer: string) => void;
}) {
  const intl = useIntl();
  const [typed, setTyped] = useState('');
  const locked = busy || cooldown > 0;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5 justify-center">
        {letters.map((c, i) => (
          <button
            key={i}
            type="button"
            disabled={locked}
            onClick={() => setTyped((t) => t + c)}
            className="w-11 h-12 rounded-lg bg-accent-yellow/25 border-2 border-accent-yellow text-2xl font-display font-extrabold text-text-primary"
          >
            {c}
          </button>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if (typed.trim() && !locked) onAnswer(typed.trim()); }} className="flex gap-2">
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value.toUpperCase())}
          disabled={locked}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          maxLength={letters.length + 4}
          className="flex-1 min-w-0 bg-bg-tertiary border-2 border-border rounded-xl px-3 py-3 text-2xl tracking-[0.3em] text-center text-text-primary font-display font-extrabold focus:outline-none focus:border-accent-yellow disabled:opacity-50"
        />
        <button type="button" onClick={() => setTyped('')} className="px-3 rounded-xl bg-bg-tertiary text-text-muted" aria-label={intl.formatMessage({ id: 'hunt.clear' })}>
          <Icon icon="lucide:delete" />
        </button>
      </form>
      <button
        type="button"
        disabled={locked || !typed.trim()}
        onClick={() => onAnswer(typed.trim())}
        className="w-full py-3.5 rounded-xl bg-accent-yellow text-bg-primary text-lg font-display font-extrabold flex items-center justify-center gap-2 disabled:opacity-40"
      >
        <Icon icon="lucide:key-round" />
        <FormattedMessage id="hunt.openTreasure" />
      </button>
      {cooldown > 0 && (
        <p className="text-sm font-bold text-accent-red text-center">
          <FormattedMessage id="hunt.cooldown" values={{ n: cooldown }} />
        </p>
      )}
    </div>
  );
}
