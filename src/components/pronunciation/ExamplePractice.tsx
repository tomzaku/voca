import { useMemo } from 'react';
import { Icon } from '@iconify/react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useScoredTake } from '../../hooks/useScoredTake';
import type { SentenceScoreState } from '../../hooks/useSentenceScore';
import { scoreSentencePronunciation } from '../../lib/pronunciation';
import { speakText, stopSpeaking } from '../../lib/tts';
import { LevelMeter, PlayButton } from './parts';
import { SentenceScorePanel } from './SentenceScore';

// Say an example sentence from the word card and see it scored word by word
// — the word in a real sentence, which is where it's actually said. Opened
// under one example at a time (see flashcard/parts ExampleList); the sentence
// is the target, so this catches a wrong real word too ("right" for "light").

/** A card's example is one sentence; this is the stop for a forgotten tap. */
const MAX_MS = 15_000;

export function ExamplePractice({ text }: { text: string }) {
  const intl = useIntl();
  const take = useScoredTake(async (blob, onProgress) => {
    const r = await scoreSentencePronunciation(blob, text, onProgress);
    return r === 'too-long' ? null : r;
  }, MAX_MS);
  const recording = take.phase === 'recording';
  const working = take.phase === 'working';

  // The result panel is shared with Short Conversation, which speaks in states.
  const state = useMemo((): SentenceScoreState => {
    if (working) return { status: 'working', progress: take.progress };
    if (take.phase === 'error') return { status: 'error' };
    if (take.result) return { status: 'done', result: take.result };
    if (take.empty) return { status: 'empty' };
    return { status: 'idle' };
  }, [working, take.phase, take.progress, take.result, take.empty]);
  const label = intl.formatMessage({ id: recording ? 'pron.stop' : 'pron.sayExample' });

  return (
    <div className="mt-2 rounded-xl border border-border bg-bg-tertiary/40 p-2.5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button
          onClick={recording ? take.stop : take.start}
          disabled={working}
          aria-label={label}
          title={label}
          className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-[background-color,box-shadow] disabled:opacity-70 ${recording
            ? 'bg-accent-red text-bg-primary'
            : 'btn-3d !rounded-full bg-accent-cyan text-bg-primary'}`}
          style={recording ? { boxShadow: `0 0 0 ${3 + take.level * 10}px rgba(239, 68, 68, 0.2)` } : undefined}
        >
          {working
            ? <span className="w-4 h-4 rounded-full border-2 border-bg-primary/30 border-t-bg-primary animate-spin" />
            : <Icon icon={recording ? 'lucide:square' : 'lucide:mic'} className="text-lg" />}
        </button>
        <div className="min-w-0 flex-1 text-xs">
          {recording ? (
            <>
              <span className="font-bold text-text-primary"><FormattedMessage id="pron.listening" /></span>
              <LevelMeter level={take.level} />
            </>
          ) : take.phase === 'denied' ? (
            <span className="text-accent-red"><FormattedMessage id="pron.denied" /></span>
          ) : (
            <span className="text-text-muted">
              <FormattedMessage id={take.result || take.empty ? 'pron.tapToRetry' : 'pron.sayExampleHint'} />
            </span>
          )}
        </div>
        {take.recordingUrl && !recording && !working && <PlayButton url={take.recordingUrl} />}
      </div>
      <SentenceScorePanel
        state={state}
        onHearWord={(w) => { stopSpeaking(); void speakText(w); }}
        className="mt-3 pt-3 border-t border-border/60"
      />
    </div>
  );
}
