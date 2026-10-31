import { useEffect, useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { dialogues } from '../../data/englishDialogues';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import { gradeDictation, type DictationGrade } from '../../lib/listeningRules';
import { shuffle } from '../../lib/learnRules';
import { shadowLines } from '../../lib/speakingRules';
import { speakText, stopSpeaking } from '../../lib/tts';
import { playCorrect, playSelect, playWrong } from '../../lib/sfx';
import { HudBanner, HudDock, HudTop, PixelButton, PixelIcon } from './pixel';

// Shadowing at Đông Ba market: hear a line from the Speak page's dialogues and say
// it straight back. Your recording is transcribed on-device (the flash card's
// useVoiceRecorder) and lined up with the sentence word by word (the
// listening drills' gradeDictation), so you see which words came through.

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

  const recorder = useVoiceRecorder({
    maxMs: MAX_LINE_MS,
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

  const next = () => { playSelect(); setGrade(null); setHeard(''); setIndex((i) => i + 1); };
  const toggle = () => { if (recording) recorder.stop(); else if (!busy) { setGrade(null); void recorder.start(); } };

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
            <p className={`px-title mb-2 ${grade.passed ? 'text-[var(--px-good)]' : 'text-[var(--px-gold)]'}`}>
              <FormattedMessage id="listening.wordAccuracy" values={{ accuracy: grade.accuracy / 100 }} />
            </p>
            <div className="flex flex-wrap gap-1.5">
              {grade.words.map((w, i) => (
                <span
                  key={i}
                  className="px-notch px-2 py-0.5 text-[15px] font-bold"
                  style={{ background: w.ok ? '#1f4a25' : '#4d1a16', boxShadow: `inset 0 0 0 2px var(--px-ink), inset 0 0 0 3px ${w.ok ? 'var(--px-good)' : 'var(--px-bad)'}` }}
                >
                  {w.word}
                </span>
              ))}
            </div>
            <p className="text-[14px] text-[var(--px-muted)] mt-2">
              <span className="px-title !text-[11px] mr-1.5"><FormattedMessage id="world.shadowHeard" /></span>“{heard}”
            </p>
          </div>
        )}
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
              <FormattedMessage id={recording ? 'world.speakStop' : 'world.shadowSay'} /> <span className="opacity-70">␣</span>
            </PixelButton>
          )}
          <PixelButton tone={grade ? 'gold' : 'paper'} onClick={next}><FormattedMessage id="flashcard.next" /> ↵</PixelButton>
        </div>
      </HudDock>
    </>
  );
}
