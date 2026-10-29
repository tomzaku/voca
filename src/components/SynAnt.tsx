import { FormattedMessage, useIntl } from 'react-intl';
import { familyForms, maskAnswer } from '../lib/answerMask';
import { peekWord } from '../hooks/useWordPeek';
import type { VocabularyWord } from '../types';

/** How many synonym/antonym chips fit on a phone before the column wraps too tall. */
const MOBILE_CHIP_LIMIT = 2;

/** Synonyms + antonyms chips in two columns, shown under a definition. Shared
 *  by the flashcard (guess + revealed) and the collection quiz. Pass
 *  `maskWord` while the user is still guessing — synonyms of a phrase often
 *  contain the answer verbatim ("draw criticism" → "attract criticism").
 *
 *  Once revealed, each chip opens its meaning in the peek popup. While masked
 *  they stay inert: the chips are partly blanked out, and looking one up would
 *  hand over the answer the mask exists to protect. */
export function SynAnt({ wordData, maskWord }: { wordData: VocabularyWord; maskWord?: string }) {
  const intl = useIntl();
  const mask = (s: string) => (maskWord ? maskAnswer(s, maskWord, familyForms(wordData.wordFamily)) : s);
  // A phrase that masks down to nothing but underscores gives the reader
  // nothing — drop it rather than show a useless "____" pill.
  const isBlank = (s: string) => maskWord != null && mask(s).replace(/[^a-zA-Z]/g, '').length === 0;

  const synonyms = (wordData.synonyms ?? []).filter((w) => !isBlank(w));
  const antonyms = (wordData.antonyms ?? []).filter((w) => !isBlank(w));
  const hasSyn = synonyms.length > 0;
  const hasAnt = antonyms.length > 0;
  if (!hasSyn && !hasAnt) return null;

  // Neutral for both lists: the headings already say which is which, and a red
  // antonym chip read as "wrong answer" next to the answer tally.
  const chip = `text-[11px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border bg-bg-tertiary text-text-secondary border-border${maskWord ? '' : ' hover:text-accent-cyan hover:border-accent-cyan/40 transition-all cursor-pointer'}`;

  // Only the first `MOBILE_CHIP_LIMIT` chips show on a phone (`hidden sm:inline-block`
  // brings the rest back from `sm` up) — a full list of 5+ chips wraps to several
  // rows and pushes the game below the fold.
  const renderChips = (words: string[]) =>
    words.map((w, i) => {
      const overflow = i >= MOBILE_CHIP_LIMIT ? 'hidden sm:inline-block' : '';
      return maskWord ? (
        <span key={w} className={`${chip} ${overflow}`}>{mask(w)}</span>
      ) : (
        <button
          key={w}
          onClick={(e) => peekWord(w, e.currentTarget)}
          title={intl.formatMessage({ id: 'word.whatDoesMean' }, { word: w })}
          className={`${chip} ${overflow}`}
        >
          {w}
        </button>
      );
    });

  return (
    <div className="mt-3 pt-3 border-t border-border/60 grid grid-cols-2 gap-x-4 gap-y-2.5">
      {hasSyn && (
        <div>
          <h4 className="text-xs font-display font-bold text-text-muted uppercase tracking-wider mb-1.5"><FormattedMessage id="word.synonyms" /></h4>
          <div className="flex flex-wrap gap-1.5">{renderChips(synonyms)}</div>
        </div>
      )}
      {hasAnt && (
        <div>
          <h4 className="text-xs font-display font-bold text-text-muted uppercase tracking-wider mb-1.5"><FormattedMessage id="word.antonyms" /></h4>
          <div className="flex flex-wrap gap-1.5">{renderChips(antonyms)}</div>
        </div>
      )}
    </div>
  );
}
