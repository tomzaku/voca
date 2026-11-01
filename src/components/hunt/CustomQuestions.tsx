import { Icon } from '@iconify/react';
import { FormattedMessage, useIntl } from 'react-intl';
import { emptyCustom, isComplete, MAX_WRONG, type CustomQuestion } from '../../lib/hunt';

/** Enough for any hunt: 8 stations of the server's 12 each. */
const MAX_CUSTOM = 96;

/**
 * The teacher's own questions, on the create form. Each is a question and
 * its answer; adding wrong answers makes it multiple choice, leaving them out
 * makes students type it — and then other spellings that should count can be
 * listed. Unfinished cards are simply skipped when the hunt is built.
 */
export function CustomQuestions({ questions, onChange, needed }: {
  questions: CustomQuestion[];
  onChange: (next: CustomQuestion[]) => void;
  /** How many finished questions the hunt needs (one per station), or 0. */
  needed: number;
}) {
  const intl = useIntl();
  const done = questions.filter(isComplete).length;
  const set = (i: number, patch: Partial<CustomQuestion>) =>
    onChange(questions.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const input = 'w-full bg-bg-tertiary border-2 border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-cyan';

  return (
    <div className="space-y-3">
      {questions.map((q, i) => {
        const typed = q.wrong.every((w) => !w.trim());
        return (
          <div key={i} className="rounded-xl border border-border bg-bg-secondary/40 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-text-muted"><FormattedMessage id="hunt.custom.n" values={{ n: i + 1 }} /></span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${typed ? 'bg-accent-purple/15 text-accent-purple' : 'bg-accent-cyan/15 text-accent-cyan'}`}>
                <FormattedMessage id={typed ? 'hunt.custom.typed' : 'hunt.custom.choice'} />
              </span>
              <span className="flex-1" />
              <button
                type="button"
                onClick={() => onChange(questions.length > 1 ? questions.filter((_, j) => j !== i) : [emptyCustom()])}
                className="p-1.5 rounded-lg text-text-muted hover:text-accent-red"
                aria-label={intl.formatMessage({ id: 'hunt.custom.remove' })}
              >
                <Icon icon="lucide:trash-2" />
              </button>
            </div>
            <textarea
              value={q.prompt}
              onChange={(e) => set(i, { prompt: e.target.value })}
              rows={2}
              maxLength={400}
              placeholder={intl.formatMessage({ id: 'hunt.custom.promptPlaceholder' })}
              aria-label={intl.formatMessage({ id: 'hunt.custom.prompt' })}
              className={input}
            />
            <input
              value={q.answer}
              onChange={(e) => set(i, { answer: e.target.value })}
              maxLength={40}
              placeholder={intl.formatMessage({ id: 'hunt.custom.answerPlaceholder' })}
              aria-label={intl.formatMessage({ id: 'hunt.custom.answer' })}
              className={input + ' !border-accent-green/50'}
            />
            <div className="grid sm:grid-cols-3 gap-2">
              {Array.from({ length: MAX_WRONG }, (_, k) => (
                <input
                  key={k}
                  value={q.wrong[k] ?? ''}
                  onChange={(e) => {
                    const wrong = [...q.wrong];
                    wrong[k] = e.target.value;
                    set(i, { wrong });
                  }}
                  maxLength={40}
                  placeholder={intl.formatMessage({ id: 'hunt.custom.wrongPlaceholder' })}
                  aria-label={intl.formatMessage({ id: 'hunt.custom.wrong' }, { n: k + 1 })}
                  className={input + ' !border-accent-red/30'}
                />
              ))}
            </div>
            {typed && (
              <input
                // Kept as typed, commas and all; it's split and tidied when the hunt is built.
                value={q.accept.join(',')}
                onChange={(e) => set(i, { accept: e.target.value.split(',') })}
                maxLength={200}
                placeholder={intl.formatMessage({ id: 'hunt.custom.acceptPlaceholder' })}
                aria-label={intl.formatMessage({ id: 'hunt.custom.accept' })}
                className={input}
              />
            )}
          </div>
        );
      })}

      <div className="flex items-center justify-between gap-2">
        <p className={`text-xs ${needed && done < needed ? 'text-accent-red' : 'text-text-muted'}`}>
          {needed
            ? <FormattedMessage id="hunt.custom.countNeeded" values={{ done, needed }} />
            : <FormattedMessage id="hunt.custom.count" values={{ done }} />}
        </p>
        <button
          type="button"
          disabled={questions.length >= MAX_CUSTOM}
          onClick={() => onChange([...questions, emptyCustom()])}
          className="px-3 py-2 rounded-xl bg-bg-tertiary text-sm font-bold text-text-primary flex items-center gap-1.5 disabled:opacity-40"
        >
          <Icon icon="lucide:plus" /> <FormattedMessage id="hunt.custom.add" />
        </button>
      </div>
    </div>
  );
}
