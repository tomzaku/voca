import { useEffect, useMemo, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { speakingQuestions, type SpeakingQuestion } from '../../data/englishSpeaking';
import { useSpeakingProgress } from '../../hooks/useSpeakingProgress';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import { highlightPhrases, phrasesUsed, pickQuestion } from '../../lib/conversationRules';
import { speakText, stopSpeaking } from '../../lib/tts';
import { playCorrect, playSelect } from '../../lib/sfx';
import { HudBanner, HudCenter, HudDock, HudTop, PixelBar, PixelButton, PixelIcon } from './pixel';

// The Speak building — a chè stall in Đông Ba market. The seller asks one of the
// Speak page's Short Conversation questions (same bank, same "practised"
// marks in useSpeakingProgress, next question by conversationRules) and you
// answer out loud. Recording and transcription — live as you speak where the
// browser can, else on the device after — are the flash card's
// (useVoiceRecorder); what's new here is the reply: what you said, with the
// useful phrases you managed lit up in it, beside sample answers lit the same
// way — so you can see where each phrase fits in a real reply.

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
  const say = (text: string) => { stopSpeaking(); void speakText(text.replace(/\.{2,}|…/g, ' ')); };
  // One card holds the reply: your answer, the phrases, the samples — so
  // what you said, what counted and what a good answer sounds like read
  // together. Before you answer, the phrases wait in the dock instead.
  const card = !!reply || samples;

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
          <button onClick={() => say(question.question)} className="text-[var(--px-sky)] shrink-0 mt-1" aria-label={question.question}>
            <PixelIcon name="speaker" size={3} />
          </button>
        </span>
      </HudBanner>

      {card && (
        <HudCenter wide aboveDock>
          {reply && (
            <section>
              {reply.heard && (
                <>
                  <p className="px-title !text-[12px] text-[var(--px-muted)] mb-1.5"><FormattedMessage id="world.speakYouSaid" /></p>
                  <p className="px-inset px-notch px-3.5 py-3 text-[16px] leading-relaxed mb-4">
                    <Marked text={reply.heard} phrases={phrases} onSay={say} />
                  </p>
                </>
              )}
              {phrases.length > 0 && (
                <>
                  <PhraseHeading used={reply.used.length} total={phrases.length} />
                  <PhraseChips phrases={phrases} used={reply.used} onSay={say} />
                  {reply.used.length === 0 && (
                    <p className="text-[13px] text-[var(--px-muted)] mt-2"><FormattedMessage id="world.speakTryOne" /></p>
                  )}
                </>
              )}
            </section>
          )}

          {samples && (
            <section className={reply ? 'mt-5 pt-4 border-t-2 border-[var(--px-ink)]' : ''}>
              <div className="flex items-baseline justify-between gap-2 mb-2.5">
                <p className="px-title text-[var(--px-accent)]"><FormattedMessage id="world.speakSamples" /></p>
                {phrases.length > 0 && <p className="text-[12px] text-[var(--px-muted)]"><FormattedMessage id="world.speakSamplesHint" /></p>}
              </div>
              <div className="space-y-2.5">
                {question.sampleAnswers.map((a) => (
                  <div key={a.label} className="px-inset px-notch px-3.5 py-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="px-title !text-[12px] text-[var(--px-muted)]">{a.label}</span>
                      <button onClick={() => say(a.answer)} className="text-[var(--px-sky)]" aria-label={a.label}>
                        <PixelIcon name="speaker" size={2} />
                      </button>
                    </div>
                    <p className="text-[15px] leading-relaxed"><Marked text={a.answer} phrases={phrases} onSay={say} /></p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </HudCenter>
      )}

      <HudDock>
        {!card && phrases.length > 0 && (
          <div>
            <p className="px-title !text-[12px] text-[var(--px-muted)] mb-1.5"><FormattedMessage id="world.speakPhrases" /></p>
            <PhraseChips phrases={phrases} onSay={say} />
          </div>
        )}

        {recording && recorder.live && (
          <p className="text-[16px] leading-snug opacity-90">
            <span className="px-title !text-[12px] text-[var(--px-muted)] mr-2"><FormattedMessage id="world.speakYouSaid" /></span>
            “{recorder.live}”
          </p>
        )}
        {status && <p className={`px-title ${recording ? 'text-[var(--px-bad)] px-blink' : 'text-[var(--px-muted)]'}`}>{status}</p>}
        {noMic && (
          <p className="text-[14px] text-[var(--px-muted)]">
            <FormattedMessage id={recorder.phase === 'denied' ? 'games.speakDenied' : 'games.speakUnsupported'} />
          </p>
        )}

        {/* Before an answer, speaking is the move; after it, moving on is —
            so the big button changes job rather than both shouting at once. */}
        <div className="flex flex-wrap gap-2">
          {reply && !recording ? (
            <>
              <PixelButton tone="gold" className="flex-1" onClick={next}>
                <FormattedMessage id="world.speakNext" /> ↵
              </PixelButton>
              {!noMic && (
                <PixelButton tone="paper" onClick={toggleRecording} disabled={busy}>
                  <PixelIcon name="mic" size={2} /> <FormattedMessage id="world.speakAgain" /> <span className="opacity-70">␣</span>
                </PixelButton>
              )}
            </>
          ) : noMic ? (
            <PixelButton tone="red" className="flex-1" onClick={saidIt}>
              <PixelIcon name="check" size={2} /> <FormattedMessage id="world.speakSaidIt" />
            </PixelButton>
          ) : (
            <PixelButton tone={recording ? 'bad' : 'red'} className="flex-1" onClick={toggleRecording} disabled={busy}>
              <PixelIcon name="mic" size={2} />
              <FormattedMessage id={recording ? 'world.speakStop' : 'world.speakAnswer'} />
              <span className="opacity-70">␣</span>
            </PixelButton>
          )}
          <PixelButton tone={samples ? 'jade' : 'paper'} onClick={() => setSamples((v) => !v)} aria-pressed={samples}>
            <FormattedMessage id={samples ? 'world.speakHideSamples' : 'world.speakSamples'} />
          </PixelButton>
          {!reply && (
            <PixelButton tone="paper" onClick={next}><FormattedMessage id="world.speakSkip" /></PixelButton>
          )}
        </div>
      </HudDock>
    </>
  );
}

/** "Useful phrases · 2 of 4 used", coloured by how it went. */
function PhraseHeading({ used, total }: { used: number; total: number }) {
  return (
    <p className="flex items-center gap-2 mb-1.5">
      <span className="px-title !text-[12px] text-[var(--px-muted)]"><FormattedMessage id="world.speakPhrases" /></span>
      <span className={`px-title !text-[12px] ${used > 0 ? 'text-[var(--px-good)]' : 'text-[var(--px-gold)]'}`}>
        <FormattedMessage id="world.speakUsedOf" values={{ used, total }} />
      </span>
    </p>
  );
}

/** The question's useful phrases — tap one to hear it. With `used`, the
 *  ones your answer had are ticked. */
function PhraseChips({ phrases, used, onSay }: { phrases: string[]; used?: string[]; onSay: (text: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {phrases.map((p) => {
        const on = used?.includes(p);
        return (
          <button
            key={p}
            data-on={on}
            onClick={() => onSay(p)}
            className={`px-pick px-notch px-2.5 py-1 text-[14px] font-bold leading-tight flex items-center gap-1.5 ${used && !on ? 'opacity-70' : ''}`}
          >
            {on ? <PixelIcon name="check" size={1} className="text-[var(--px-good)]" /> : <PixelIcon name="speaker" size={1} className="text-[var(--px-sky)]" />}
            {p}
          </button>
        );
      })}
    </div>
  );
}

/** Text with its useful phrases lit up the way the chips are — tap to hear. */
function Marked({ text, phrases, onSay }: { text: string; phrases: string[]; onSay: (text: string) => void }) {
  const runs = useMemo(() => highlightPhrases(text, phrases), [text, phrases]);
  return (
    <>
      {runs.map((r, i) => r.phrase ? (
        <button
          key={i}
          onClick={() => onSay(r.phrase!)}
          title={r.phrase}
          className="inline px-0.5 -mx-0.5 font-bold text-[var(--px-select)] bg-[#3d3016] hover:brightness-125 cursor-pointer"
        >
          {r.text}
        </button>
      ) : <span key={i}>{r.text}</span>)}
    </>
  );
}
