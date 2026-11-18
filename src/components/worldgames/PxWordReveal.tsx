import { useMemo, useState, type ReactNode } from 'react';
import { FormattedMessage } from 'react-intl';
import { useWordUsage } from '../../hooks/useWordUsage';
import { peekWord } from '../../hooks/useWordPeek';
import { canScorePronunciation } from '../../lib/pronunciation';
import { getLearnLanguage, getMotherLanguage } from '../../lib/languages';
import { speakText, stopSpeaking } from '../../lib/tts';
import type { VocabularyWord, WordSense } from '../../types';
import { PixelIcon } from './pixel';
import { PxSayExample, PxSayWord } from './PxPronunciation';

/**
 * The word in full, in the world's pixel dress — the same material the flash
 * card's RevealedView shows (every sense, both accents, the translation, all
 * examples, synonyms, phrases, family, idioms, usage notes), so learning a
 * word on the map leaves you knowing as much as learning it on the card.
 * The caller brings the heading above and the Next button below.
 */
export function PxWordReveal({ word }: { word: VocabularyWord }) {
  const [senseIdx, setSenseIdx] = useState(0);
  const senses = word.senses ?? [];
  const w = useMemo(() => withSense(word, word.senses?.[senseIdx]), [word, senseIdx]);
  const headword = w.headword || w.word;
  const usage = useWordUsage(word.word);
  const ipas = Object.values(w.phonetics ?? {});
  const canSay = getLearnLanguage().toLowerCase() === 'english' && canScorePronunciation();
  const say = (text: string) => { stopSpeaking(); void speakText(text); };

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="px-num text-[44px] leading-none text-[var(--px-gold)] break-all">{headword}</span>
          <button onClick={() => say(headword)} className="text-[var(--px-sky)]" aria-label={headword}>
            <PixelIcon name="speaker" size={3} />
          </button>
        </div>
        <div className="mt-1 flex items-center flex-wrap gap-x-3 gap-y-1 text-[14px] text-[var(--px-muted)]">
          <Accents phonetics={w.phonetics} />
          {usage?.syllables && <span>{usage.syllables}</span>}
        </div>
        {canSay && ipas.length > 0 && <PxSayWord key={`${headword}-${senseIdx}`} ipas={ipas} word={headword} />}
        <div className="mt-2 flex items-center flex-wrap gap-1.5">
          {senses.length > 1
            ? senses.map((s, i) => (
              <Chip key={s.partOfSpeech} active={i === senseIdx} onClick={() => { stopSpeaking(); setSenseIdx(i); }}>{s.partOfSpeech}</Chip>
            ))
            : w.partOfSpeech && <Chip active>{w.partOfSpeech}</Chip>}
          {usage?.cefr && <Chip>{usage.cefr}</Chip>}
          {usage?.labels.map((l) => <Chip key={l}>{l}</Chip>)}
        </div>
      </div>

      {w.translation && (
        <div className="px-inset px-notch px-3 py-2">
          <span className="block text-[11px] uppercase tracking-wider text-[var(--px-muted)]">{getMotherLanguage()}</span>
          <span className="text-[18px] font-bold text-[var(--px-sky)]">{w.translation}</span>
        </div>
      )}

      <p className="text-[17px] leading-snug">{w.definition}</p>

      {w.examples.length > 0 && (
        <div className="space-y-2">
          {w.examples.map((ex, i) => (
            <div key={ex}>
              <div className="flex items-start gap-2 border-l-2 border-[#5a4630] pl-2">
                <p className="flex-1 text-[15px] leading-snug">
                  <span className="italic text-[var(--px-muted)]">“{ex}”</span>
                  {w.exampleTranslations?.[i] && <span className="block text-[13px] text-[var(--px-muted)] opacity-80">{w.exampleTranslations[i]}</span>}
                </p>
                <button onClick={() => say(ex)} className="text-[var(--px-sky)] shrink-0" aria-label={ex}>
                  <PixelIcon name="speaker" size={2} />
                </button>
              </div>
              {canSay && i === 0 && <PxSayExample key={ex} text={ex} />}
            </div>
          ))}
        </div>
      )}

      <WordChips titleId="word.synonyms" words={w.synonyms} />
      <WordChips titleId="word.antonyms" words={w.antonyms} />
      <WordChips titleId="word.commonPhrases" words={w.collocations} />
      <WordChips titleId="word.wordFamily" words={w.wordFamily?.map((f) => f.word)} labels={w.wordFamily?.map((f) => f.pos)} />

      {(w.idioms?.length ?? 0) > 0 && (
        <Section titleId="word.idioms">
          <MoreList items={w.idioms!} limit={2} render={(i) => (
            <div key={i.idiom}>
              <button onClick={(e) => peekWord(i.idiom, e.currentTarget)} className="text-[15px] font-bold text-[var(--px-gold)] text-left hover:underline">{i.idiom}</button>
              <p className="text-[13px] leading-snug">{i.meaning}</p>
              {i.example && <p className="text-[13px] italic text-[var(--px-muted)]">“{i.example}”</p>}
            </div>
          )} />
        </Section>
      )}

      {usage && usage.patterns.length > 0 && (
        <Section titleId="usage.howToUse">
          <MoreList items={usage.patterns} limit={2} render={(p) => (
            <div key={p.pattern}>
              <p className="text-[14px] font-bold">{p.pattern}</p>
              {p.example && <p className="text-[13px] italic text-[var(--px-muted)]">“{p.example}”</p>}
            </div>
          )} />
        </Section>
      )}
      {usage && usage.mistakes.length > 0 && (
        <Section titleId="usage.mistakes">
          <MoreList items={usage.mistakes} limit={2} render={(m) => (
            <div key={m.wrong}>
              <p className="text-[14px]">
                <span className="line-through text-[var(--px-bad)]">{m.wrong}</span>{' '}
                <span className="font-bold text-[var(--px-good)]">{m.right}</span>
              </p>
              <p className="text-[13px] text-[var(--px-muted)] leading-snug">{m.why}</p>
            </div>
          )} />
        </Section>
      )}
      {usage && usage.confusables.length > 0 && (
        <Section titleId="usage.confusables">
          <MoreList items={usage.confusables} limit={2} render={(c) => (
            <p key={c.word} className="text-[13px] leading-snug"><span className="font-bold text-[var(--px-gold)]">{c.word}</span> — {c.difference}</p>
          )} />
        </Section>
      )}
      {usage && usage.phrasalVerbs.length > 0 && (
        <Section titleId="usage.phrasalVerbs">
          <MoreList items={usage.phrasalVerbs} limit={3} render={(p) => (
            <p key={p.phrase} className="text-[13px] leading-snug"><span className="font-bold text-[var(--px-gold)]">{p.phrase}</span> — {p.meaning}</p>
          )} />
        </Section>
      )}
    </div>
  );
}

/** US and UK side by side, merged when they're said the same. */
function Accents({ phonetics }: { phonetics?: Record<string, string> }) {
  const map = phonetics ?? {};
  const us = map['en-US'];
  const uk = map['en-GB'];
  const rows = us && uk && us !== uk
    ? [['US', us], ['UK', uk]]
    : us || uk ? [[us && uk ? 'US · UK' : us ? 'US' : 'UK', us ?? uk]]
      : Object.values(map).slice(0, 1).map((ipa) => ['', ipa]);
  return (
    <>
      {rows.map(([label, ipa]) => (
        <span key={label + ipa}>
          {label && <span className="text-[11px] mr-1 opacity-70">{label}</span>}/{ipa}/
        </span>
      ))}
    </>
  );
}

function Section({ titleId, children }: { titleId: string; children: ReactNode }) {
  return (
    <div className="pt-2 border-t-2 border-[#5a4630]/60">
      <p className="px-title !text-[12px] text-[var(--px-muted)] mb-1.5"><FormattedMessage id={titleId} /></p>
      {children}
    </div>
  );
}

function MoreList<T>({ items, limit, render }: { items: T[]; limit: number; render: (item: T) => ReactNode }) {
  const [all, setAll] = useState(false);
  const hidden = items.length - limit;
  return (
    <div className="space-y-1.5">
      {(all ? items : items.slice(0, limit)).map(render)}
      {hidden > 0 && <MoreButton hidden={hidden} open={all} onClick={() => setAll((v) => !v)} />}
    </div>
  );
}

/** A list of words, each opening its meaning in the peek popup. */
function WordChips({ titleId, words, labels }: { titleId: string; words?: string[]; labels?: string[] }) {
  const [all, setAll] = useState(false);
  if (!words?.length) return null;
  const limit = 4;
  return (
    <Section titleId={titleId}>
      <div className="flex flex-wrap gap-1.5">
        {(all ? words : words.slice(0, limit)).map((wd, i) => (
          <Chip key={`${wd}-${i}`} onClick={(e) => peekWord(wd, e.currentTarget)}>
            {wd}{labels?.[i] && <span className="ml-1 opacity-60">{labels[i]}</span>}
          </Chip>
        ))}
        {words.length > limit && <MoreButton hidden={words.length - limit} open={all} onClick={() => setAll((v) => !v)} />}
      </div>
    </Section>
  );
}

function Chip({ children, active = false, onClick }: { children: ReactNode; active?: boolean; onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void }) {
  const cls = `px-notch px-2 py-0.5 text-[13px] leading-tight border-2 ${active ? 'border-[var(--px-gold)] text-[var(--px-gold)]' : 'border-[#5a4630] text-[var(--px-text)]'}`;
  return onClick
    ? <button onClick={onClick} className={`${cls} hover:border-[var(--px-sky)] hover:text-[var(--px-sky)]`}>{children}</button>
    : <span className={cls}>{children}</span>;
}

function MoreButton({ hidden, open, onClick }: { hidden: number; open: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-[12px] font-bold text-[var(--px-muted)] hover:text-[var(--px-gold)]">
      {open ? <FormattedMessage id="word.showLess" /> : <FormattedMessage id="word.showMore" values={{ count: hidden }} />}
    </button>
  );
}

/** The word as one of its parts of speech — the flash card's withSense. */
function withSense(word: VocabularyWord, sense: WordSense | undefined): VocabularyWord {
  if (!sense) return word;
  return {
    ...word,
    partOfSpeech: sense.partOfSpeech,
    phonetics: sense.phonetics ?? word.phonetics,
    definition: sense.definition,
    shortDefinition: sense.shortDefinition,
    translation: sense.translation,
    examples: sense.examples,
    // Translations line up with the primary sense's examples only.
    exampleTranslations: sense === word.senses?.[0] ? word.exampleTranslations : undefined,
  };
}
