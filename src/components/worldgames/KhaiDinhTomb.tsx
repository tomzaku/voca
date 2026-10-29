import { useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useProgressQuery, type Filter } from '../../hooks/useProgressQuery';
import { FILTERS } from '../../lib/progressApi';
import { BUCKET_META, whyLine, wordBucket, type WordBucket } from '../../lib/progress';
import { generateWordData } from '../../lib/wordService';
import type { VocabularyWord } from '../../types';
import { HudCenter, HudSide, PixelButton, PixelChip, PixelLoader } from './pixel';
import { WordPage } from './WordPage';

// The History building — Khải Định tomb, where every word you've met is kept.
// The same lists as the History page (useProgressQuery: the server's filtered,
// paged rows, with the store standing in until they land; the same filters,
// counts, buckets and "why it's here" lines), carved into a side panel; a
// word opens its page in the middle, with "learn it" sending it to Đông Ba.

/** Each bucket's colour in the world's palette. */
const BUCKET_COLOR: Record<WordBucket, string> = {
  pending: '#e8a24a',
  difficult: 'var(--px-bad)',
  learning: 'var(--px-sky)',
  mastered: 'var(--px-good)',
  dismissed: 'var(--px-muted)',
};

export function KhaiDinhTomb({ onLearn }: { onLearn: (word: string) => void }) {
  const intl = useIntl();
  const [filter, setFilter] = useState<Filter>('recent');
  const checked = useMemo(() => new Set<Filter>([filter]), [filter]);
  const { rows, counts, initialLoading, hasMore, loadMore } = useProgressQuery(checked);
  const [open, setOpen] = useState<{ word: string; data: VocabularyWord | null; failed?: boolean } | null>(null);

  const openWord = async (word: string) => {
    setOpen({ word, data: null });
    try {
      const data = await generateWordData(word);
      setOpen((o) => (o?.word === word ? { word, data } : o));
    } catch {
      setOpen((o) => (o?.word === word ? { word, data: null, failed: true } : o));
    }
  };

  return (
    <>
      <HudSide
        title={<FormattedMessage id="history.title" />}
        footer={hasMore && (
          <PixelButton tone="paper" block onClick={loadMore}><FormattedMessage id="history.loadMore" /></PixelButton>
        )}
      >
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <PixelChip key={f.id} on={filter === f.id} onClick={() => setFilter(f.id)}>
              {intl.formatMessage({ id: f.labelId })} <span className="opacity-70">{counts[f.id]}</span>
            </PixelChip>
          ))}
        </div>

        {initialLoading && rows.length === 0 ? (
          <PixelLoader label={<FormattedMessage id="history.loadingWords" />} />
        ) : rows.length === 0 ? (
          <p className="text-[var(--px-muted)] text-center py-6"><FormattedMessage id="history.emptyTitle" /></p>
        ) : (
          <ul className="space-y-1.5">
            {rows.map((p) => {
              const bucket = wordBucket(p);
              return (
                <li key={p.word}>
                  <button
                    onClick={() => void openWord(p.word)}
                    data-on={open?.word === p.word}
                    className="px-pick px-notch w-full text-left px-3 py-2"
                  >
                    <span className="flex items-center gap-2">
                      <span className="flex-1 min-w-0 truncate text-[17px] font-bold">{p.word}</span>
                      <span className="px-title !text-[11px] shrink-0" style={{ color: BUCKET_COLOR[bucket] }}>
                        <FormattedMessage id={BUCKET_META[bucket].labelId} />
                      </span>
                    </span>
                    <span className="block text-[13px] text-[var(--px-muted)] mt-0.5">{whyLine(p)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </HudSide>

      {open && (
        open.data ? (
          <WordPage data={open.data} onLearn={onLearn} onSearch={(w) => void openWord(w)} besideSide />
        ) : (
          <HudCenter besideSide>
            {open.failed
              ? <p className="text-center"><FormattedMessage id="history.loadWordFailed" values={{ word: open.word }} /></p>
              : <PixelLoader label={open.word} />}
          </HudCenter>
        )
      )}
    </>
  );
}
