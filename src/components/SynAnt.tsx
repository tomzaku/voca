import { familyForms, maskAnswer } from '../lib/answerMask';
import { peekWord } from '../hooks/useWordPeek';
import type { VocabularyWord } from '../types';

/** Synonyms + antonyms chips in two columns, shown under a definition. Shared
 *  by the flashcard (guess + revealed) and the collection quiz. Pass
 *  `maskWord` while the user is still guessing — synonyms of a phrase often
 *  contain the answer verbatim ("draw criticism" → "attract criticism").
 *
 *  Once revealed, each chip opens its meaning in the peek popup. While masked
 *  they stay inert: the chips are partly blanked out, and looking one up would
 *  hand over the answer the mask exists to protect. */
export function SynAnt({ wordData, maskWord }: { wordData: VocabularyWord; maskWord?: string }) {
  const mask = (s: string) => (maskWord ? maskAnswer(s, maskWord, familyForms(wordData.wordFamily)) : s);
  const hasSyn = (wordData.synonyms?.length ?? 0) > 0;
  const hasAnt = (wordData.antonyms?.length ?? 0) > 0;
  if (!hasSyn && !hasAnt) return null;

  const chip = (accent: 'cyan' | 'red') => {
    const base = accent === 'cyan'
      ? 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20'
      : 'bg-accent-red/10 text-accent-red border-accent-red/20';
    const hover = accent === 'cyan'
      ? 'hover:bg-accent-cyan/20 hover:border-accent-cyan/40'
      : 'hover:bg-accent-red/20 hover:border-accent-red/40';
    return `text-xs px-2.5 py-1 rounded-full border ${base}${maskWord ? '' : ` ${hover} transition-all cursor-pointer`}`;
  };

  const renderChips = (words: string[], accent: 'cyan' | 'red') =>
    words.map((w) => (
      maskWord ? (
        <span key={w} className={chip(accent)}>{mask(w)}</span>
      ) : (
        <button
          key={w}
          onClick={(e) => peekWord(w, e.currentTarget)}
          title={`What does “${w}” mean?`}
          className={chip(accent)}
        >
          {w}
        </button>
      )
    ));

  return (
    <div className="mt-3 pt-3 border-t border-border/60 grid grid-cols-2 gap-x-4 gap-y-2.5">
      {hasSyn && (
        <div>
          <h4 className="text-xs font-display font-bold text-text-muted uppercase tracking-wider mb-1.5">Synonyms</h4>
          <div className="flex flex-wrap gap-1.5">{renderChips(wordData.synonyms!, 'cyan')}</div>
        </div>
      )}
      {hasAnt && (
        <div>
          <h4 className="text-xs font-display font-bold text-text-muted uppercase tracking-wider mb-1.5">Antonyms</h4>
          <div className="flex flex-wrap gap-1.5">{renderChips(wordData.antonyms!, 'red')}</div>
        </div>
      )}
    </div>
  );
}
