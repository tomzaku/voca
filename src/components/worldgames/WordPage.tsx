import { FormattedMessage } from 'react-intl';
import { useAuth } from '../../hooks/useAuth';
import { useVocabularyStore } from '../../hooks/useVocabulary';
import { speakText, stopSpeaking } from '../../lib/tts';
import type { VocabularyWord } from '../../types';
import { HudCenter, PixelButton, PixelChip, PixelIcon } from './pixel';

// A word's full page in the world — the library's search result and a row
// opened from the tomb's history. Saving goes through the same store as the
// app's bookmark, and "learn it" hands the word to the archive's word desk.

/** A word's page, as the library would keep it. */
export function WordPage({ data, onLearn, onSearch, besideSide = false }: { data: VocabularyWord; onLearn: (word: string) => void; onSearch: (word: string) => void; besideSide?: boolean }) {
  const { user } = useAuth();
  const saved = useVocabularyStore((s) => s.progress[data.word]?.bookmarked ?? false);
  const setBookmarked = useVocabularyStore((s) => s.setBookmarked);
  const word = data.headword || data.word;
  const ipa = data.phonetics?.['en-US'] ?? Object.values(data.phonetics ?? {})[0];
  const related = [...(data.synonyms ?? []).slice(0, 4), ...(data.collocations ?? []).slice(0, 2)];

  return (
    <HudCenter wide besideSide={besideSide}>
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className="px-num text-[44px] leading-none text-[var(--px-gold)]">{word}</span>
        {ipa && <span className="text-[var(--px-muted)]">/{ipa}/</span>}
        <button onClick={() => { stopSpeaking(); speakText(word); }} className="text-[var(--px-sky)]" aria-label={word}>
          <PixelIcon name="speaker" size={3} />
        </button>
        {data.partOfSpeech && <span className="px-title text-[var(--px-muted)] ml-auto">{data.partOfSpeech}</span>}
      </div>
      {data.translation && <p className="mt-2 text-[17px] text-[#9fe0e8]">{data.translation}</p>}
      <p className="mt-2 text-[17px] leading-snug">{data.definition}</p>
      {data.examples?.slice(0, 2).map((ex) => (
        <p key={ex} className="mt-2 text-[15px] italic text-[var(--px-muted)] leading-snug">“{ex}”</p>
      ))}
      {related.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {related.map((r) => <PixelChip key={r} on={false} onClick={() => onSearch(r)}>{r}</PixelChip>)}
        </div>
      )}
      <div className="flex gap-2 mt-5">
        <PixelButton tone="red" className="flex-1" onClick={() => onLearn(data.word)}>
          <PixelIcon name="sword" size={2} /> <FormattedMessage id="world.searchLearnHere" />
        </PixelButton>
        <PixelButton tone={saved ? 'jade' : 'paper'} onClick={() => setBookmarked(data.word, !saved, user?.id)}>
          <PixelIcon name={saved ? 'check' : 'star'} size={2} />
          <FormattedMessage id={saved ? 'world.searchSaved' : 'world.searchSave'} />
        </PixelButton>
      </div>
    </HudCenter>
  );
}
