import { mergeSuggestions } from '../lib/spellSuggest';

/**
 * Shown when a search isn't a real word. The point is to get the user to the
 * word they meant in one tap, so the suggestions are the main event and the
 * "not a word" message is kept small and un-scolding.
 *
 * Suggestions are free to produce: the server's came from the same call that
 * judged the word (and are cached for everyone after that), and the rest are
 * found locally by edit distance. Rendering this costs nothing.
 */
export function SimilarWords({ word, suggestions, onPick }: {
  word: string;
  suggestions: string[];
  onPick: (word: string) => void;
}) {
  const options = mergeSuggestions(word, suggestions);

  return (
    <div className="max-w-xl mx-auto animate-bounce-in">
      <div className="card-game p-6 sm:p-8 text-center">
        <div className="text-5xl mb-3 animate-bob">🔍</div>

        <h2 className="font-title text-2xl sm:text-3xl text-text-primary mb-1.5 break-words">
          “{word}”
        </h2>
        <p className="text-sm text-text-muted mb-6">
          We couldn't find that one — it might be a typo.
        </p>

        {options.length > 0 ? (
          <>
            <p className="text-xs font-extrabold uppercase tracking-wide text-text-secondary mb-3">
              Did you mean
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {options.map((s) => (
                <button
                  key={s}
                  onClick={() => onPick(s)}
                  className="btn-3d px-4 py-2 rounded-xl bg-accent-cyan/15 border-2 border-accent-cyan/40 text-accent-cyan text-sm"
                >
                  {s}
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-text-secondary">
            No similar words came up. Check the spelling and try again.
          </p>
        )}
      </div>
    </div>
  );
}
