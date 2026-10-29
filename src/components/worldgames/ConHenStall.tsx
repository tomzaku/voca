import { useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { speakingQuestions, type SpeakingQuestion } from '../../data/englishSpeaking';
import { useSpeakingProgress } from '../../hooks/useSpeakingProgress';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import { phrasesUsed, pickQuestion } from '../../lib/conversationRules';
import { speakText, stopSpeaking } from '../../lib/tts';
import { playCorrect, playSelect } from '../../lib/sfx';
import { HudBanner, HudCenter, HudDock, HudTop, PixelBar, PixelButton, PixelIcon } from './pixel';

// The Speak building — a chè stall on Cồn Hến. The seller asks one of the
// Speak page's Short Conversation questions (same bank, same "practised"
// marks in useSpeakingProgress, next question by conversationRules) and you
// answer out loud. Recording and on-device transcription are the flash
// card's (useVoiceRecorder); what's new here is the reply: what you said,
// and which of the question's useful phrases you managed to use.

/** Long enough for a real answer, short enough that a forgotten tap ends. */
const MAX_ANSWER_MS = 30_000;

type Reply = { heard: string; used: string[] } | null;

export function ConHenStall() {
  const intl = useIntl();
  const progress = useSpeakingProgress((s) => s.questions);
  const markPracticed = useSpeakingProgress((s) => s.markPracticed);
  const asked = useRef<Set<string>>(new Set());
  const [question, setQuestion] = useState<SpeakingQuestion | null>(
    () => pickQuestion(speakingQuestions, useSpeakingProgress.getState().questions),
  );
  const [reply, setReply] = useState<Reply>(null);
  const [notHeard, setNotHeard] = useState(false);
  const [samples, setSamples] = useState(false);

  const recorder = useVoiceRecorder({
    maxMs: MAX_ANSWER_MS,
    onTranscript: (text) => {
      if (!question) return;
      if (!text.trim()) { setNotHeard(true); return; }
      const used = phrasesUsed(text, question.usefulPhrases ?? []);
      if (used.length > 0) playCorrect();
      markPracticed(question.id);
      setReply({ heard: text, used });
    },
  });
  const recording = recorder.phase === 'recording';
  const busy = recorder.phase === 'requesting' || recorder.phase === 'thinking';
  const noMic = recorder.phase === 'denied' || recorder.phase === 'unsupported';

  // The seller asks out loud when a question comes up.
  useEffect(() => {
    if (question) speakText(question.question);
    return () => stopSpeaking();
  }, [question]);

  const next = () => {
    if (question) asked.current.add(question.id);
    playSelect();
    setReply(null);
    setNotHeard(false);
    setSamples(false);
    setQuestion(pickQuestion(speakingQuestions, useSpeakingProgress.getState().questions, asked.current));
  };
  const toggleRecording = () => {
    if (recording) { recorder.stop(); return; }
    if (busy) return;
    setNotHeard(false);
    setReply(null);
    void recorder.start();
  };
  // Without a microphone, answering out loud still counts — on your word.
  const saidIt = () => {
    if (!question) return;
    markPracticed(question.id);
    setReply({ heard: '', used: [] });
    setSamples(true);
  };

  // Space records (and stops); Enter moves on once you've answered.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === ' ' && !noMic) { e.preventDefault(); toggleRecording(); }
      else if (e.key === 'Enter' && reply) { e.preventDefault(); next(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const practised = Object.values(progress).filter((p) => p.practicedAt).length;
  const top = (
    <HudTop>
      <div className="flex items-center gap-4">
        <span className="px-title text-[var(--px-accent)] shrink-0"><FormattedMessage id="app.navConversation" /></span>
        <div className="flex-1 min-w-0">
          <PixelBar
            pct={(practised / speakingQuestions.length) * 100}
            color="var(--px-jade)"
            label={intl.formatMessage({ id: 'world.speakPracticed' }, { count: `${practised} / ${speakingQuestions.length}` })}
          />
        </div>
      </div>
    </HudTop>
  );

  if (!question) {
    return <>{top}<HudCenter><p className="text-center"><FormattedMessage id="world.speakAllDone" /></p></HudCenter></>;
  }

  const phrases = question.usefulPhrases ?? [];
  const status = recording
    ? intl.formatMessage({ id: 'world.speakListening' })
    : recorder.phase === 'thinking'
      ? recorder.modelProgress > 0 && recorder.modelProgress < 100
        ? intl.formatMessage({ id: 'games.speakPreparingModel' }, { pct: Math.round(recorder.modelProgress) })
        : intl.formatMessage({ id: 'games.speakChecking' })
      : notHeard ? intl.formatMessage({ id: 'world.speakNotHeard' }) : null;

  return (
    <>
      {top}
      <HudBanner
        key={question.id}
        label={<FormattedMessage id="world.speakAsks" />}
        aside={`${question.topic} · ${intl.formatMessage({ id: `conversation.level${question.difficulty[0].toUpperCase()}${question.difficulty.slice(1)}` })}`}
      >
        <span className="flex items-start gap-3">
          <span className="flex-1">{question.question}</span>
          <button onClick={() => { stopSpeaking(); speakText(question.question); }} className="text-[var(--px-sky)] shrink-0 mt-1" aria-label={question.question}>
            <PixelIcon name="speaker" size={3} />
          </button>
        </span>
      </HudBanner>

      {samples && (
        <HudCenter wide>
          <p className="px-title text-[var(--px-accent)] mb-3"><FormattedMessage id="world.speakSamples" /></p>
          <div className="space-y-3">
            {question.sampleAnswers.map((a) => (
              <div key={a.label} className="px-inset px-notch p-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="px-title !text-[12px] text-[var(--px-muted)]">{a.label}</span>
                  <button onClick={() => { stopSpeaking(); speakText(a.answer); }} className="text-[var(--px-sky)]" aria-label={a.label}>
                    <PixelIcon name="speaker" size={2} />
                  </button>
                </div>
                <p className="text-[15px] leading-snug">{a.answer}</p>
              </div>
            ))}
          </div>
        </HudCenter>
      )}

      <HudDock>
        {phrases.length > 0 && (
          <div>
            <p className="px-title !text-[12px] text-[var(--px-muted)] mb-1.5">
              {reply
                ? <FormattedMessage id="world.speakUsed" values={{ count: reply.used.length }} />
                : <FormattedMessage id="world.speakPhrases" />}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {phrases.map((p) => {
                const used = reply?.used.includes(p);
                return (
                  <span key={p} data-on={used} className="px-pick px-notch px-2.5 py-1 text-[14px] font-bold leading-tight cursor-default flex items-center gap-1">
                    {used && <PixelIcon name="check" size={1} className="text-[var(--px-good)]" />}{p}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {reply?.heard && (
          <p className="text-[16px] leading-snug">
            <span className="px-title !text-[12px] text-[var(--px-muted)] mr-2"><FormattedMessage id="world.speakYouSaid" /></span>
            “{reply.heard}”
          </p>
        )}
        {status && <p className={`px-title ${recording ? 'text-[var(--px-bad)] px-blink' : 'text-[var(--px-muted)]'}`}>{status}</p>}
        {noMic && (
          <p className="text-[14px] text-[var(--px-muted)]">
            <FormattedMessage id={recorder.phase === 'denied' ? 'games.speakDenied' : 'games.speakUnsupported'} />
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {noMic ? (
            <PixelButton tone="red" className="flex-1" onClick={saidIt} disabled={!!reply}>
              <PixelIcon name="check" size={2} /> <FormattedMessage id="world.speakSaidIt" />
            </PixelButton>
          ) : (
            <PixelButton tone={recording ? 'bad' : 'red'} className="flex-1" onClick={toggleRecording} disabled={busy}>
              <PixelIcon name="mic" size={2} />
              <FormattedMessage id={recording ? 'world.speakStop' : 'world.speakAnswer'} />
              <span className="opacity-70">␣</span>
            </PixelButton>
          )}
          <PixelButton tone={samples ? 'jade' : 'paper'} onClick={() => setSamples((v) => !v)}>
            <FormattedMessage id="world.speakSamples" />
          </PixelButton>
          <PixelButton tone={reply ? 'gold' : 'paper'} onClick={next}>
            <FormattedMessage id="world.speakNext" /> {reply && '↵'}
          </PixelButton>
        </div>
      </HudDock>
    </>
  );
}
