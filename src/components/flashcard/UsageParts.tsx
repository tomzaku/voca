import { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { peekWord } from '../../hooks/useWordPeek';
import { MoreToggle } from '../MoreToggle';
import { CEFR_COLOR } from './constants';
import type { WordUsage } from '../../types';

// The learner's-dictionary layer of the card (see useWordUsage): what a
// Cambridge or Oxford Learner's entry prints around a definition — level and
// frequency, register, how to build a sentence with the word, its forms, and
// the mistakes learners make with it. Each piece renders nothing when its part
// of the usage is empty, so a word with little to say gets a quiet card.

const H4 = 'text-xs font-display font-bold text-text-muted uppercase tracking-wider mb-1.5';
const CHIP = 'text-[11px] font-medium px-2 py-0.5 rounded';
/** Region labels read as codes ("UK"), everything else as words ("formal"). */
const REGIONS = new Set(['us', 'uk', 'au', 'ca', 'nz', 'ie']);

/** CEFR, frequency and register chips, for the card's classification row. */
export function UsageBadges({ usage }: { usage: WordUsage }) {
  const intl = useIntl();
  return (
    <>
      {usage.cefr && (
        <span
          className={`${CHIP} font-bold ${CEFR_COLOR[usage.cefr[0]] ?? ''}`}
          title={intl.formatMessage({ id: 'usage.cefrTitle' }, { level: usage.cefr })}
        >
          {usage.cefr}
        </span>
      )}
      {usage.frequency && (
        <span
          className={`${CHIP} bg-bg-tertiary text-accent-yellow tracking-tight`}
          title={intl.formatMessage({ id: `usage.frequency${usage.frequency}` })}
          aria-label={intl.formatMessage({ id: `usage.frequency${usage.frequency}` })}
        >
          {'●'.repeat(usage.frequency)}
          <span className="text-text-muted/40">{'●'.repeat(3 - usage.frequency)}</span>
        </span>
      )}
      {usage.labels.map((l) => (
        <span key={l} className={`${CHIP} bg-accent-purple/10 text-accent-purple italic`}>
          {REGIONS.has(l) ? l.toUpperCase() : l}
        </span>
      ))}
    </>
  );
}

/** "de·cide" — beside the IPA, where you're already looking at how it sounds. */
export function Syllables({ usage }: { usage: WordUsage | null }) {
  if (!usage?.syllables) return null;
  return <span className="text-sm font-code text-text-muted">{usage.syllables}</span>;
}

/**
 * How to use it: grammar codes, sentence patterns, forms, spelling variants
 * and origin — what turns a word you recognise into one you can write.
 */
export function UsageSection({ usage }: { usage: WordUsage }) {
  const [allPatterns, setAllPatterns] = useState(false);
  const hasGrammar = usage.grammar.length > 0 || usage.patterns.length > 0;
  const hasForms = usage.forms.length > 0 || usage.variants.length > 0;
  if (!hasGrammar && !hasForms && !usage.origin) return null;
  const patterns = allPatterns ? usage.patterns : usage.patterns.slice(0, PATTERN_LIMIT);

  return (
    <div className="mt-3 pt-3 border-t border-border/60 space-y-3">
      {hasGrammar && (
        <div>
          <h4 className={H4}><FormattedMessage id="usage.howToUse" /></h4>
          {usage.grammar.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {usage.grammar.map((g) => (
                <span key={g} className={`${CHIP} bg-accent-cyan/10 text-accent-cyan`}>{g}</span>
              ))}
            </div>
          )}
          <ul className="space-y-1.5">
            {patterns.map((p) => (
              <li key={p.pattern} className="text-sm leading-relaxed">
                <span className="font-bold text-text-primary">{p.pattern}</span>
                <span className="block text-text-muted italic">{p.example}</span>
              </li>
            ))}
          </ul>
          <MoreToggle className="mt-1.5" hidden={usage.patterns.length - PATTERN_LIMIT} open={allPatterns} onToggle={() => setAllPatterns((v) => !v)} />
        </div>
      )}
      {hasForms && (
        <div>
          <h4 className={H4}><FormattedMessage id="usage.forms" /></h4>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {usage.forms.map((f) => (
              <span key={`${f.label}-${f.form}`}>
                <span className="text-text-muted text-xs">{f.label} </span>
                <span className="font-bold text-text-primary">{f.form}</span>
              </span>
            ))}
            {usage.variants.map((v) => (
              <span key={v.region}>
                <span className="text-text-muted text-xs">{v.region.toUpperCase()} </span>
                <span className="font-bold text-text-primary">{v.spelling}</span>
              </span>
            ))}
          </div>
        </div>
      )}
      {usage.origin && (
        <p className="text-xs text-text-muted">
          <span className="font-bold uppercase tracking-wider"><FormattedMessage id="usage.origin" /></span>{' '}
          {usage.origin}
        </p>
      )}
    </div>
  );
}

/**
 * Watch out: common mistakes, words it gets confused with, and how its
 * synonyms differ — the notes a teacher would scribble in the margin.
 */
export function WatchOutCard({ usage }: { usage: WordUsage }) {
  const intl = useIntl();
  const { mistakes, confusables, synonymNotes } = usage;
  if (!mistakes.length && !confusables.length && !synonymNotes.length) return null;
  const wordButton = (w: string) => (
    <button
      onClick={(e) => peekWord(w, e.currentTarget)}
      title={intl.formatMessage({ id: 'word.whatDoesMean' }, { word: w })}
      className="font-bold text-accent-cyan hover:underline cursor-pointer"
    >
      {w}
    </button>
  );

  return (
    <div className="card-game p-4 sm:p-5 space-y-4">
      {mistakes.length > 0 && (
        <div>
          <h3 className={`${H4} mb-2`}><FormattedMessage id="usage.mistakes" /></h3>
          <ul className="space-y-2.5">
            {mistakes.map((m) => (
              <li key={m.wrong} className="text-sm leading-snug">
                <p className="text-accent-red line-through decoration-accent-red/60">{m.wrong}</p>
                <p className="text-accent-green font-medium">{m.right}</p>
                {m.why && <p className="text-xs text-text-muted mt-0.5">{m.why}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {confusables.length > 0 && (
        <div>
          <h3 className={`${H4} mb-2`}><FormattedMessage id="usage.confusables" /></h3>
          <ul className="space-y-1.5">
            {confusables.map((c) => (
              <li key={c.word} className="text-sm text-text-secondary leading-snug">
                {wordButton(c.word)} — {c.difference}
              </li>
            ))}
          </ul>
        </div>
      )}
      {synonymNotes.length > 0 && (
        <div>
          <h3 className={`${H4} mb-2`}><FormattedMessage id="usage.synonymNotes" /></h3>
          <ul className="space-y-1.5">
            {synonymNotes.map((s) => (
              <li key={s.word} className="text-sm text-text-secondary leading-snug">
                {wordButton(s.word)} — {s.difference}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Phrasal verbs built on the word, most common first. */
export function PhrasalVerbsCard({ usage }: { usage: WordUsage }) {
  const intl = useIntl();
  const [showAll, setShowAll] = useState(false);
  if (!usage.phrasalVerbs.length) return null;
  const list = showAll ? usage.phrasalVerbs : usage.phrasalVerbs.slice(0, PHRASAL_LIMIT);
  return (
    <div className="card-game p-4 sm:p-5">
      <h3 className={`${H4} mb-3`}><FormattedMessage id="usage.phrasalVerbs" /></h3>
      <ul className="space-y-2">
        {list.map((p) => (
          <li key={p.phrase}>
            <button
              onClick={(e) => peekWord(p.phrase, e.currentTarget)}
              title={intl.formatMessage({ id: 'word.whatDoesMean' }, { word: p.phrase })}
              className="text-sm font-bold text-accent-purple hover:underline text-left cursor-pointer"
            >
              {p.phrase}
            </button>
            <p className="text-xs text-text-secondary">{p.meaning}</p>
          </li>
        ))}
      </ul>
      <MoreToggle className="mt-2" hidden={usage.phrasalVerbs.length - PHRASAL_LIMIT} open={showAll} onToggle={() => setShowAll((v) => !v)} />
    </div>
  );
}

const PATTERN_LIMIT = 3;
const PHRASAL_LIMIT = 4;
