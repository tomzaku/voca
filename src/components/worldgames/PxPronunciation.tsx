import { useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { usePronunciationCheck } from '../../hooks/usePronunciationCheck';
import { useScoredTake } from '../../hooks/useScoredTake';
import type { SentenceScoreState } from '../../hooks/useSentenceScore';
import { pronunciationModelCached, scoreSentencePronunciation } from '../../lib/pronunciation';
import { PHONEME_MODEL_MB } from '../../lib/pronunciationModel';
import type { PhoneScore, SentenceWord } from '../../lib/phonemeScore';
import { speakText, stopSpeaking } from '../../lib/tts';
import { VERDICT_ID, tone } from '../pronunciation/styles';
import { PixelBar, PixelButton, PixelIcon } from './pixel';

// The world's "say it" — the flash card's PronunciationCheck and ExamplePractice
// in the pixel HUD's own look. Same scoring (usePronunciationCheck /
// useScoredTake + scoreSentencePronunciation), so a word scores the same on
// the card and at the archive desk; only the chips and buttons differ.

export const PX_TONE = {
  good: { text: 'text-[var(--px-good)]', fill: '#1f4a25', edge: 'var(--px-good)' },
  close: { text: 'text-[var(--px-gold)]', fill: '#4a3a12', edge: 'var(--px-gold)' },
  wrong: { text: 'text-[var(--px-bad)]', fill: '#4d1a16', edge: 'var(--px-bad)' },
} as const;

export function PxWordChip({ word, active, onClick }: { word: SentenceWord; active: boolean; onClick: () => void }) {
  const intl = useIntl();
  const t = PX_TONE[word.status];
  return (
    <button
      onClick={onClick}
      title={word.phones.length ? intl.formatMessage({ id: word.missing ? 'pron.wordMissing' : 'pron.wordScore' }, { score: word.score }) : undefined}
      className={`px-notch px-2 py-0.5 text-[15px] font-bold cursor-pointer hover:brightness-125 ${word.missing ? 'line-through' : ''} ${active ? 'brightness-150' : ''}`}
      style={{ background: t.fill, boxShadow: `inset 0 0 0 2px var(--px-ink), inset 0 0 0 ${active ? 4 : 3}px ${t.edge}` }}
    >
      {word.text}
    </button>
  );
}

/** Sounds, each with what was heard instead where it missed. */
export function PxSounds({ phones }: { phones: PhoneScore[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1 mt-2">
      {phones.map((p, i) => {
        const t = PX_TONE[p.status];
        return (
          <span
            key={i}
            className={`px-notch px-1.5 py-0.5 font-code text-[15px] ${t.text}`}
            style={{ background: t.fill, boxShadow: `inset 0 0 0 2px var(--px-ink), inset 0 0 0 3px ${t.edge}` }}
          >
            {p.ipa}{p.heard !== null && <span className="text-[11px] opacity-80">→{p.heard || '∅'}</span>}
          </span>
        );
      })}
    </div>
  );
}

/** While the sounds are being scored (or why they won't be). */
export function PxPronStatus({ state }: { state: SentenceScoreState }) {
  const intl = useIntl();
  if (state.status !== 'working') return null;
  return (
    <p className="text-[12px] text-[var(--px-muted)] mt-1.5">
      {state.progress !== null && state.progress < 100
        ? intl.formatMessage({ id: 'pron.downloading' }, { pct: Math.round(state.progress) })
        : intl.formatMessage({ id: 'pron.checking' })}
    </p>
  );
}

type Take = {
  phase: 'idle' | 'recording' | 'working' | 'denied' | 'error';
  progress: number | null;
  level: number;
  recordingUrl: string | null;
  start: () => void;
  stop: () => void;
};

/** The mic button, a live level while recording, and a line saying where things stand. */
function MicRow({ take, label, hint, done, empty }: { take: Take; label: string; hint: string; done: boolean; empty: boolean }) {
  const intl = useIntl();
  const recording = take.phase === 'recording';
  const working = take.phase === 'working';
  const status = recording ? null
    : working
      ? take.progress !== null && take.progress < 100
        ? intl.formatMessage({ id: 'pron.downloading' }, { pct: Math.round(take.progress) })
        : intl.formatMessage({ id: 'pron.checking' })
      : take.phase === 'denied' ? intl.formatMessage({ id: 'pron.denied' })
      : take.phase === 'error' ? intl.formatMessage({ id: 'pron.error' })
      : empty ? intl.formatMessage({ id: 'pron.nothingHeard' })
      : done ? intl.formatMessage({ id: 'pron.tapToRetry' })
      : hint;
  const bad = take.phase === 'denied' || take.phase === 'error';

  return (
    <div className="flex items-center gap-3">
      <PixelButton
        tone={recording ? 'bad' : 'sky'}
        className="shrink-0 !px-3 !py-2"
        onClick={recording ? take.stop : take.start}
        disabled={working}
        aria-label={recording ? intl.formatMessage({ id: 'pron.stop' }) : label}
        title={recording ? intl.formatMessage({ id: 'pron.stop' }) : label}
      >
        <PixelIcon name="mic" size={2} />
        <span className="max-sm:hidden">{recording ? <FormattedMessage id="pron.stop" /> : label}</span>
      </PixelButton>
      <div className="min-w-0 flex-1">
        {recording
          ? <PixelBar pct={Math.round(take.level * 100)} color="var(--px-bad)" label={<FormattedMessage id="pron.listening" />} />
          : <p className={`text-[13px] leading-snug ${bad ? 'text-[var(--px-bad)]' : 'text-[var(--px-muted)]'}`}>{status}</p>}
      </div>
      {take.recordingUrl && !recording && !working && (
        <button
          onClick={() => { stopSpeaking(); void new Audio(take.recordingUrl!).play(); }}
          className="shrink-0 text-[var(--px-gold)] hover:brightness-125"
          title={intl.formatMessage({ id: 'pron.hearYourself' })}
          aria-label={intl.formatMessage({ id: 'pron.hearYourself' })}
        >
          <PixelIcon name="speaker" size={2} />
        </button>
      )}
    </div>
  );
}

/** Say the word and see each of its sounds scored. */
export function PxSayWord({ ipas, word }: { ipas: string[]; word: string }) {
  const intl = useIntl();
  const take = usePronunciationCheck(ipas);
  const result = take.phase === 'idle' ? take.result : null;
  const hint = pronunciationModelCached()
    ? intl.formatMessage({ id: 'pron.hint' })
    : intl.formatMessage({ id: 'pron.firstTime' }, { mb: PHONEME_MODEL_MB });

  return (
    <div className="mt-3">
      <MicRow take={take} label={intl.formatMessage({ id: 'pron.sayWord' }, { word })} hint={hint} done={!!take.result} empty={take.empty} />
      {result && (
        <div className="mt-2">
          <p className={`px-title ${PX_TONE[tone(result.score)].text}`}>
            {result.score} · <FormattedMessage id={VERDICT_ID[tone(result.score)]} />
          </p>
          <PxSounds phones={result.phones} />
        </div>
      )}
    </div>
  );
}

/** A sentence is the target, so this catches a wrong real word too. */
const MAX_SENTENCE_MS = 15_000;

/** Read an example sentence aloud and see it scored word by word; tap a word for its sounds. */
export function PxSayExample({ text }: { text: string }) {
  const intl = useIntl();
  const take = useScoredTake(async (blob, onProgress) => {
    const r = await scoreSentencePronunciation(blob, text, onProgress);
    return r === 'too-long' ? null : r;
  }, MAX_SENTENCE_MS);
  const [picked, setPicked] = useState<{ result: unknown; index: number } | null>(null);
  const result = take.phase === 'idle' ? take.result : null;
  const pickedWord = useMemo(
    () => (result && picked?.result === result ? result.words[picked.index] : null),
    [result, picked],
  );

  return (
    <div className="mt-2">
      <MicRow
        take={take}
        label={intl.formatMessage({ id: 'pron.sayExample' })}
        hint={intl.formatMessage({ id: 'pron.sayExampleHint' })}
        done={!!take.result}
        empty={take.empty}
      />
      {result && (
        <div className="mt-2">
          <p className={`px-title mb-2 ${PX_TONE[tone(result.score)].text}`}>
            <FormattedMessage id="world.shadowPron" values={{ score: result.score, pct: result.completeness }} />
          </p>
          <div className="flex flex-wrap gap-1.5">
            {result.words.map((w, i) => (
              <PxWordChip
                key={i}
                word={w}
                active={pickedWord === w}
                onClick={() => { setPicked({ result, index: i }); stopSpeaking(); void speakText(w.text.replace(/[^\p{L}\p{N}'’-]/gu, '')); }}
              />
            ))}
          </div>
          {pickedWord && pickedWord.phones.length > 0 && <PxSounds phones={pickedWord.phones} />}
        </div>
      )}
    </div>
  );
}
