import { useEffect, useState } from 'react';
import { generateWordData } from '../lib/wordService';
import type { VocabularyWord } from '../types';

/**
 * The full entry for a word — IPA, definition, examples, synonyms — as it opens
 * under a row. Shared by History and the collection page so a word reads the
 * same in both.
 */
export function WordDetails({ data }: { data: VocabularyWord }) {
  const ipa = data.phonetics?.['en-US'] || data.phonetics?.['en-GB'];
  return (
    <div className="space-y-4">
      {ipa && <p className="text-sm font-code text-text-muted">{ipa}</p>}
      <div>
        <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Definition</h4>
        <p className="text-sm text-text-primary leading-relaxed">{data.definition}</p>
      </div>
      {data.examples.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Examples</h4>
          <ul className="space-y-1.5">
            {data.examples.map((ex, i) => (
              <li key={i} className="flex gap-2 text-sm text-text-secondary">
                <span className="text-accent-cyan shrink-0">▸</span>
                <span>{ex}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {data.synonyms && data.synonyms.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {data.synonyms.map((syn) => (
            <span key={syn} className="text-xs px-2 py-0.5 rounded-full bg-bg-tertiary text-text-muted border border-border">
              {syn}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Spinner line shown while a word's entry loads. */
export function WordDetailsLoading() {
  return (
    <div className="flex items-center gap-2 text-sm text-text-muted">
      <div className="w-4 h-4 rounded-full border-2 border-accent-cyan/30 border-t-accent-cyan animate-spin" />
      Loading...
    </div>
  );
}

/**
 * `WordDetails` that fetches its own entry, for lists that don't keep a cache
 * of their own. `generateWordData` is cache-first, so reopening a word is free.
 */
export function LoadWordDetails({ word }: { word: string }) {
  const [data, setData] = useState<VocabularyWord | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    generateWordData(word)
      .then((d) => { if (live) setData(d); })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [word]);

  if (failed) return <p className="text-sm text-text-muted">Couldn't load “{word}”.</p>;
  return data ? <WordDetails data={data} /> : <WordDetailsLoading />;
}
