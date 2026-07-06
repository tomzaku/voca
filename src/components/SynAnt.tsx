import type { VocabularyWord } from '../types';

/** Synonyms + antonyms chips in two columns, shown under a definition. Shared
 *  by the flashcard (guess + revealed) and the collection quiz. */
export function SynAnt({ wordData }: { wordData: VocabularyWord }) {
  const hasSyn = (wordData.synonyms?.length ?? 0) > 0;
  const hasAnt = (wordData.antonyms?.length ?? 0) > 0;
  if (!hasSyn && !hasAnt) return null;
  return (
    <div className="mt-3 pt-3 border-t border-border/60 grid grid-cols-2 gap-x-4 gap-y-2.5">
      {hasSyn && (
        <div>
          <h4 className="text-xs font-display font-bold text-text-muted uppercase tracking-wider mb-1.5">Synonyms</h4>
          <div className="flex flex-wrap gap-1.5">
            {wordData.synonyms!.map((s) => (
              <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20">{s}</span>
            ))}
          </div>
        </div>
      )}
      {hasAnt && (
        <div>
          <h4 className="text-xs font-display font-bold text-text-muted uppercase tracking-wider mb-1.5">Antonyms</h4>
          <div className="flex flex-wrap gap-1.5">
            {wordData.antonyms!.map((a) => (
              <span key={a} className="text-xs px-2.5 py-1 rounded-full bg-accent-red/10 text-accent-red border border-accent-red/20">{a}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
