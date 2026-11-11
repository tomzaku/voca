import { useState } from 'react';
import { Icon } from '@iconify/react';
import { FormattedMessage, useIntl } from 'react-intl';
import type { SentenceScoreState } from '../../hooks/useSentenceScore';
import type { SentenceScore, SentenceWord } from '../../lib/phonemeScore';
import { MAX_SENTENCE_SECONDS } from '../../lib/pronunciation';
import { Coaching, PhoneTile, ScoreRing } from './parts';
import { TEXT, VERDICT_ID, tone } from './styles';

// A spoken sentence, scored: the score ring and how much of it was said, then
// the sentence itself with every word tinted by how it came out. Tap a word
// for its sounds and the coaching for the weakest one — it opens on the
// weakest word, since that's the one worth fixing first.
//
// Renders nothing on a device that doesn't score (state 'off') or before a try.

const WORD: Record<SentenceWord['status'], string> = {
  good: 'text-text-primary hover:bg-accent-green/10',
  close: 'text-accent-orange bg-accent-orange/10 hover:bg-accent-orange/20',
  wrong: 'text-accent-red bg-accent-red/10 hover:bg-accent-red/20 font-bold',
};

export function SentenceScorePanel({ state, onHearWord, className = '' }: {
  state: SentenceScoreState;
  /** Say one word on its own. */
  onHearWord: (word: string) => void;
  className?: string;
}) {
  if (state.status === 'off' || state.status === 'idle') return null;
  return (
    <div className={`animate-fade-in ${className}`}>
      <p className="flex items-center gap-1.5 text-xs font-semibold text-text-primary mb-2">
        <Icon icon="lucide:audio-waveform" width={14} className="text-accent-cyan" />
        <FormattedMessage id="pron.sentenceTitle" />
      </p>
      {state.status === 'working' ? (
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <span className="w-3.5 h-3.5 rounded-full border-2 border-accent-cyan/30 border-t-accent-cyan animate-spin" />
          {state.progress !== null && state.progress < 100
            ? <FormattedMessage id="pron.downloading" values={{ pct: Math.round(state.progress) }} />
            : <FormattedMessage id="pron.checking" />}
        </div>
      ) : state.status === 'too-long' ? (
        <p className="text-xs text-text-muted"><FormattedMessage id="pron.tooLong" values={{ seconds: MAX_SENTENCE_SECONDS }} /></p>
      ) : state.status === 'empty' ? (
        <p className="text-xs text-text-muted"><FormattedMessage id="pron.nothingHeard" /></p>
      ) : state.status === 'error' ? (
        <p className="text-xs text-accent-red"><FormattedMessage id="pron.error" /></p>
      ) : (
        <Result key={state.result.heard} result={state.result} onHearWord={onHearWord} />
      )}
    </div>
  );
}

/** Keyed by result upstream, so a new try opens on its own weakest word. */
function Result({ result, onHearWord }: { result: SentenceScore; onHearWord: (word: string) => void }) {
  const intl = useIntl();
  const scored = result.words.map((w, i) => [w, i] as const).filter(([w]) => w.phones.length);
  const weakest = scored.reduce<readonly [SentenceWord, number] | null>((m, x) => (!m || x[0].score < m[0].score ? x : m), null);
  const [picked, setPicked] = useState<number | null>(weakest && weakest[0].status !== 'good' ? weakest[1] : null);
  const [phoneIdx, setPhoneIdx] = useState<number | null>(null);
  const word = picked !== null ? result.words[picked] : null;
  const weakPhone = word?.phones.reduce((w, p, i) => (p.score < word.phones[w].score ? i : w), 0) ?? 0;
  const phone = word ? word.phones[phoneIdx ?? weakPhone] : null;
  const pick = (i: number) => { setPicked(i); setPhoneIdx(null); };

  return (
    <>
      <div className="flex items-center gap-4">
        <ScoreRing score={result.score} />
        <div className="min-w-0">
          <p className={`font-display font-extrabold text-lg leading-tight ${TEXT[tone(result.score)]}`}>
            <FormattedMessage id={VERDICT_ID[tone(result.score)]} />
          </p>
          <p className="text-xs text-text-muted mt-0.5">
            <FormattedMessage id="pron.completeness" values={{ pct: result.completeness }} />
            {' · '}
            <FormattedMessage id="pron.tapWord" />
          </p>
        </div>
      </div>

      <p className="mt-3 text-[15px] leading-loose">
        {result.words.map((w, i) => (
          <span key={i}>
            {w.phones.length ? (
              <button
                onClick={() => pick(i)}
                title={intl.formatMessage({ id: w.missing ? 'pron.wordMissing' : 'pron.wordScore' }, { score: w.score })}
                className={`rounded px-0.5 -mx-0.5 transition-colors cursor-pointer ${WORD[w.status]} ${w.missing ? 'line-through decoration-2' : ''} ${picked === i ? 'ring-2 ring-accent-cyan' : ''}`}
              >
                {w.text}
              </button>
            ) : (
              <span className="text-text-muted">{w.text}</span>
            )}{' '}
          </span>
        ))}
      </p>

      {word && (
        <div className="mt-3 rounded-xl border border-border bg-bg-tertiary/50 p-3 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-display font-bold text-text-primary">{word.text.replace(/[^\p{L}\p{N}'’-]/gu, '')}</span>
            <span className={`text-xs font-bold ${TEXT[word.status]}`}>{word.score}</span>
            <button
              onClick={() => onHearWord(word.text.replace(/[^\p{L}\p{N}'’-]/gu, ''))}
              className="ml-auto w-7 h-7 rounded-full flex items-center justify-center text-text-muted hover:text-accent-cyan hover:bg-bg-hover/60 cursor-pointer"
              aria-label={intl.formatMessage({ id: 'pron.hearIt' })}
              title={intl.formatMessage({ id: 'pron.hearIt' })}
            >
              <Icon icon="lucide:volume-2" width={15} />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {word.phones.map((p, i) => (
              <PhoneTile key={i} phone={p} active={phone === p} onClick={() => setPhoneIdx(i)} />
            ))}
          </div>
          {phone && (phoneIdx !== null || phone.status !== 'good') && <Coaching key={`${picked}-${phone.ipa}`} phone={phone} />}
        </div>
      )}
    </>
  );
}
