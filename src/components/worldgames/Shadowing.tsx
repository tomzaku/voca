import { useEffect, useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { dialogues } from '../../data/englishDialogues';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import { useSentenceScore, type SentenceScoreState } from '../../hooks/useSentenceScore';
import type { SentenceWord } from '../../lib/phonemeScore';
import { gradeDictation, type DictationGrade } from '../../lib/listeningRules';
import { shuffle } from '../../lib/learnRules';
import { shadowLines } from '../../lib/speakingRules';
import { speakText, stopSpeaking } from '../../lib/tts';
import { playCorrect, playSelect, playWrong } from '../../lib/sfx';
import { HudBanner, HudDock, HudTop, PixelButton, PixelIcon } from './pixel';

// Shadowing at Đông Ba market: hear a line from the Speak page's dialogues and say
// it straight back. Your recording is transcribed on-device (the flash card's
// useVoiceRecorder) and lined up with the sentence word by word (the
// listening drills' gradeDictation), so you see which words came through —
// and tap any of them to hear it said on its own.
//
// On a desktop that can run it, the same recording is also scored sound by
// sound against the line (useSentenceScore): the words are then coloured by
// how they were *said*, not just whether they were recognised, and tapping
// one shows its sounds.

/** Long enough for a 14-word line said slowly. */
const MAX_LINE_MS = 12_000;

export function Shadowing() {
  const intl = useIntl();
  const lines = useMemo(() => shuffle(shadowLines(dialogues)), []);
  const [index, setIndex] = useState(0);
  const [grade, setGrade] = useState<DictationGrade | null>(null);
  const [heard, setHeard] = useState('');
  const [tally, setTally] = useState({ passed: 0, tried: 0 });
  const line = lines[index % lines.length];

  const pron = useSentenceScore();
  const [pickedWord, setPickedWord] = useState<number | null>(null);
  const recorder = useVoiceRecorder({
    maxMs: MAX_LINE_MS,
    // The line is known, so scoring needn't wait for the transcript.
    onAudio: (blob) => { setPickedWord(null); void pron.score(blob, line); },
    onTranscript: (text) => {
      if (!text.trim()) return;
      const g = gradeDictation(line, text);
      (g.passed ? playCorrect : playWrong)();
      setHeard(text);
      setGrade(g);
      setTally((t) => ({ passed: t.passed + (g.passed ? 1 : 0), tried: t.tried + 1 }));
    },
  });
  const recording = recorder.phase === 'recording';
  const busy = recorder.phase === 'requesting' || recorder.phase === 'thinking';
  const noMic = recorder.phase === 'denied' || recorder.phase === 'unsupported';

  const play = () => { stopSpeaking(); void speakText(line); };
  // Each new line is said first.
  useEffect(() => {
    play();
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [line]);

  const next = () => { playSelect(); setGrade(null); setHeard(''); pron.reset(); setIndex((i) => i + 1); };
  const toggle = () => { if (recording) recorder.stop(); else if (!busy) { setGrade(null); pron.reset(); void recorder.start(); } };
  const scored = pron.state.status === 'done' ? pron.state.result : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' && !noMic) { e.preventDefault(); toggle(); }
      else if (e.key === 'Enter') { e.preventDefault(); next(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <>
      <HudTop>
        <div className="flex items-center gap-4">
          <span className="px-title text-[var(--px-accent)] flex-1"><FormattedMessage id="world.actShadow" /></span>
          <span className="flex items-center gap-1.5 px-num text-[22px] leading-none text-[var(--px-good)]">
            <PixelIcon name="check" size={2} />{tally.passed} / {tally.tried}
          </span>
        </div>
      </HudTop>

      <HudBanner key={line} label={<FormattedMessage id="world.shadowSay" />}>
        <span className="flex items-start gap-3">
          <span className="flex-1 text-[19px]">{line}</span>
          <button onClick={play} className="text-[var(--px-sky)] shrink-0 mt-1" aria-label={line}><PixelIcon name="speaker" size={3} /></button>
        </span>
      </HudBanner>

      <HudDock>
        {grade && (
          <div>
            {scored ? (
              <>
                <p className={`px-title mb-2 ${PX_TONE[scored.score >= 85 ? 'good' : scored.score >= 60 ? 'close' : 'wrong'].text}`}>
                  <FormattedMessage id="world.shadowPron" values={{ score: scored.score, pct: scored.completeness }} />
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {scored.words.map((w, i) => (
                    <PxWordChip
                      key={i}
                      word={w}
                      active={pickedWord === i}
                      onClick={() => { setPickedWord(i); void speakText(w.text.replace(/[^\p{L}\p{N}'’-]/gu, '')); }}
                    />
                  ))}
                </div>
                {pickedWord !== null && scored.words[pickedWord]?.phones.length > 0 && <PxSounds word={scored.words[pickedWord]} />}
              </>
            ) : (
              <>
                <p className={`px-title mb-2 ${grade.passed ? 'text-[var(--px-good)]' : 'text-[var(--px-gold)]'}`}>
                  <FormattedMessage id="listening.wordAccuracy" values={{ accuracy: grade.accuracy / 100 }} />
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {grade.words.map((w, i) => (
                    <button
                      key={i}
                      onClick={() => void speakText(w.word)}
                      title={intl.formatMessage({ id: 'world.shadowHearWord' })}
                      className="px-notch px-2 py-0.5 text-[15px] font-bold cursor-pointer hover:brightness-125"
                      style={{ background: w.ok ? '#1f4a25' : '#4d1a16', boxShadow: `inset 0 0 0 2px var(--px-ink), inset 0 0 0 3px ${w.ok ? 'var(--px-good)' : 'var(--px-bad)'}` }}
                    >
                      {w.word}
                    </button>
                  ))}
                </div>
                <PxPronStatus state={pron.state} />
              </>
            )}
            <p className="text-[12px] text-[var(--px-muted)] mt-1.5"><FormattedMessage id="world.shadowHearWord" /></p>
            <p className="text-[14px] text-[var(--px-muted)] mt-2">
              <span className="px-title !text-[11px] mr-1.5"><FormattedMessage id="world.shadowHeard" /></span>“{heard}”
            </p>
          </div>
        )}
        {recording && recorder.live && <p className="text-[15px] leading-snug opacity-90">“{recorder.live}”</p>}
        {recorder.phase === 'thinking' && (
          <p className="px-title text-[var(--px-muted)]">
            {recorder.modelProgress > 0 && recorder.modelProgress < 100
              ? intl.formatMessage({ id: 'games.speakPreparingModel' }, { pct: Math.round(recorder.modelProgress) })
              : intl.formatMessage({ id: 'games.speakChecking' })}
          </p>
        )}
        {noMic && <p className="text-[14px] text-[var(--px-muted)]"><FormattedMessage id="world.shadowNoMic" /></p>}
        <div className="flex flex-wrap gap-2">
          {!noMic && (
            <PixelButton tone={recording ? 'bad' : 'red'} className="flex-1" onClick={toggle} disabled={busy}>
              <PixelIcon name="mic" size={2} />
              <FormattedMessage id={recording ? 'world.speakStop' : 'world.shadowSay'} /> <span className="opacity-70 max-sm:hidden">␣</span>
            </PixelButton>
          )}
          <PixelButton tone={grade ? 'gold' : 'paper'} onClick={next}><FormattedMessage id="flashcard.next" /> <span className="max-sm:hidden">↵</span></PixelButton>
        </div>
      </HudDock>
    </>
  );
}

// Pixel-HUD versions of the pronunciation result (pronunciation/SentenceScore
// is the app's): flat notched chips in the world's own palette.
const PX_TONE = {
  good: { text: 'text-[var(--px-good)]', fill: '#1f4a25', edge: 'var(--px-good)' },
  close: { text: 'text-[var(--px-gold)]', fill: '#4a3a12', edge: 'var(--px-gold)' },
  wrong: { text: 'text-[var(--px-bad)]', fill: '#4d1a16', edge: 'var(--px-bad)' },
} as const;

function PxWordChip({ word, active, onClick }: { word: SentenceWord; active: boolean; onClick: () => void }) {
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

/** A tapped word's sounds, each with what was heard instead where it missed. */
function PxSounds({ word }: { word: SentenceWord }) {
  return (
    <div className="flex flex-wrap items-center gap-1 mt-2">
      {word.phones.map((p, i) => {
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
function PxPronStatus({ state }: { state: SentenceScoreState }) {
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
