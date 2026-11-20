import { useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useAnswerRecorder } from '../AnswerRecorder';
import { LINE_SILENCE, turnRows, useTakeUrls, type TurnLog, type TurnResult } from '../scriptPractice';
import { tone } from '../pronunciation/styles';
import type { ScriptLine } from '../../hooks/useScriptPlayer';
import { speakText, stopSpeaking } from '../../lib/tts';
import { HUD_WIDE_SIDE, PixelBar, PixelButton, PixelIcon } from './pixel';
import { PX_TONE, PxSounds, PxWordChip } from './PxPronunciation';

// The Speak page's "Your takes" drawer, in the world's pixel dress: each line
// you said in a role-play, its score, and what to fix. The log, the grading
// (turnRows) and the recorder (useAnswerRecorder) are the app's own — only
// the look is the world's.

const hearWord = (w: string) => { stopSpeaking(); void speakText(w.replace(/[^\p{L}\p{N}'’-]/gu, '')); };

/** Large screens only: docked right, wide enough to read a line and its fixes at a glance. */
export function PxTakesPanel({ log, lines, matchScript, onReplay }: {
  log: TurnLog;
  lines: ScriptLine[];
  matchScript: boolean;
  onReplay: () => void;
}) {
  const intl = useIntl();
  const { rows, avg } = turnRows(lines, log.results, matchScript);
  const urls = useTakeUrls(log.results);
  // Live, the newest take is open; a finished run opens on the weakest line.
  const [open, setOpen] = useState<number | null>(log.latest);
  const [seen, setSeen] = useState(log.latest);
  if (log.latest !== seen) { setSeen(log.latest); setOpen(log.latest); }
  const [wasFinished, setWasFinished] = useState(log.finished);
  if (log.finished !== wasFinished) {
    setWasFinished(log.finished);
    if (log.finished) {
      const weakest = rows.filter((x) => x.value !== null).sort((a, b) => (a.value as number) - (b.value as number))[0];
      setOpen(weakest && (weakest.value as number) < 85 ? weakest.i : null);
    }
  }
  const [picked, setPicked] = useState<{ line: number; word: number } | null>(null);

  return (
    <div className="px absolute top-[3.75rem] right-2 bottom-2 max-lg:hidden pointer-events-auto px-in-side" style={{ width: HUD_WIDE_SIDE }}>
      <div className="px-notch px-frame h-full flex flex-col">
        <div className="flex items-center gap-3 px-4 pt-3.5 pb-2.5 shrink-0">
          <div className="flex-1 min-w-0">
            <p className="px-title !text-[17px] text-[var(--px-gold)] flex items-center gap-2">
              {!log.finished && <span className="w-2.5 h-2.5 bg-[var(--px-bad)] animate-pulse" />}
              <FormattedMessage id={log.finished ? 'speaking.summaryTitle' : 'speaking.summaryLiveTitle'} />
            </p>
            <p className="text-[13px] text-[var(--px-muted)]">
              <FormattedMessage id="speaking.summaryCount" values={{ count: rows.length }} />
              {rows.length > 0 && <>{' · '}<FormattedMessage id="speaking.summaryTapHint" /></>}
            </p>
          </div>
          {avg !== null && <span className={`px-num text-[34px] leading-none ${PX_TONE[tone(avg)].text}`}>{avg}</span>}
          <button onClick={log.hide} className="text-[var(--px-muted)] hover:text-[var(--px-text)]" aria-label={intl.formatMessage({ id: 'speaking.summaryClose' })}>
            <PixelIcon name="close" size={2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-3 space-y-2">
          {!rows.length && <p className="text-[14px] text-[var(--px-muted)] leading-relaxed"><FormattedMessage id="speaking.summaryEmpty" /></p>}
          {rows.map(({ i, r, value, grade }) => {
            const expanded = open === i;
            const url = urls.get(i);
            const t = value === null ? null : PX_TONE[tone(value)];
            return (
              <div key={i} className="px-notch px-3 py-2.5 bg-[#1d2a2d]" style={{ boxShadow: `inset 0 0 0 2px var(--px-ink)${expanded ? ', inset 0 0 0 4px var(--px-gold)' : ''}` }}>
                <div className="flex items-start gap-3">
                  <span className={`px-num w-10 text-right text-[24px] leading-none mt-0.5 shrink-0 ${t ? t.text : 'text-[var(--px-muted)]'}`}>{value ?? '—'}</span>
                  <button onClick={() => setOpen(expanded ? null : i)} aria-expanded={expanded} className="flex-1 min-w-0 text-left">
                    <span className="block text-[16px] leading-snug">{lines[i].text}</span>
                    <span className="block mt-0.5 text-[14px] italic text-[var(--px-muted)] leading-snug">
                      {r.heard ? `“${r.heard}”` : intl.formatMessage({ id: 'conversation.recordNothingHeard' })}
                    </span>
                  </button>
                  <span className="flex items-center gap-2.5 shrink-0 mt-0.5">
                    {url && (
                      <button
                        onClick={() => { stopSpeaking(); void new Audio(url).play(); }}
                        className="text-[var(--px-gold)] hover:brightness-125"
                        title={intl.formatMessage({ id: 'pron.hearYourself' })}
                        aria-label={intl.formatMessage({ id: 'pron.hearYourself' })}
                      >
                        <PixelIcon name="play" size={2} />
                      </button>
                    )}
                    <button
                      onClick={() => { stopSpeaking(); void speakText(lines[i].text, { voice: lines[i].voice }).catch(() => {}); }}
                      className="text-[var(--px-sky)] hover:brightness-125"
                      title={intl.formatMessage({ id: 'speaking.listenLine' })}
                      aria-label={intl.formatMessage({ id: 'speaking.listenLine' })}
                    >
                      <PixelIcon name="speaker" size={2} />
                    </button>
                  </span>
                </div>
                {expanded && (
                  <div className="mt-2.5 ml-[3.25rem]">
                    {r.detail ? (
                      <>
                        <div className="flex flex-wrap gap-1.5">
                          {r.detail.words.map((w, k) => (
                            <PxWordChip key={k} word={w} active={picked?.line === i && picked.word === k} onClick={() => { setPicked({ line: i, word: k }); hearWord(w.text); }} />
                          ))}
                        </div>
                        {picked?.line === i && (r.detail.words[picked.word]?.phones.length ?? 0) > 0 && <PxSounds phones={r.detail.words[picked.word].phones} />}
                        <p className="text-[12px] text-[var(--px-muted)] mt-1.5"><FormattedMessage id="world.shadowHearWord" /></p>
                      </>
                    ) : grade ? (
                      <>
                        <div className="flex flex-wrap gap-1.5">
                          {grade.words.map((w, k) => (
                            <button
                              key={k}
                              onClick={() => hearWord(w.word)}
                              className={`px-notch px-2 py-0.5 text-[15px] font-bold hover:brightness-125 ${w.ok ? '' : 'line-through'}`}
                              style={{ background: w.ok ? PX_TONE.good.fill : PX_TONE.wrong.fill, boxShadow: `inset 0 0 0 2px var(--px-ink), inset 0 0 0 3px ${w.ok ? PX_TONE.good.edge : PX_TONE.wrong.edge}` }}
                            >
                              {w.word}
                            </button>
                          ))}
                        </div>
                        <p className="text-[12px] text-[var(--px-muted)] mt-1.5"><FormattedMessage id="speaking.summaryMissedHint" /></p>
                      </>
                    ) : (
                      <p className="text-[13px] text-[var(--px-muted)]"><FormattedMessage id="speaking.summaryNoDetail" /></p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {log.finished && rows.length > 0 && (
          <div className="shrink-0 px-4 pb-4 pt-2">
            <PixelButton tone="sky" onClick={onReplay}><PixelIcon name="retry" size={2} /> <FormattedMessage id="speaking.summaryAgain" /></PixelButton>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Your turn, in the dock: the mic opens as the turn starts and stops once
 * you've gone quiet, then the take is scored and logged. Mount it keyed by
 * the turn, so each one starts fresh. Shows the score here too, since the
 * takes panel is desktop-only.
 */
export function PxTurnTake({ say, scripted, onAnswered, onResult }: {
  say: string;
  scripted: boolean;
  onAnswered: () => void;
  onResult: (r: TurnResult) => void;
}) {
  const intl = useIntl();
  const rec = useAnswerRecorder(onAnswered, say, { stopOnSilence: LINE_SILENCE, scripted });
  const settled = rec.phase === 'idle' && rec.heard !== null && rec.pronunciation.status !== 'working';
  const resultRef = useRef(onResult);
  useEffect(() => { resultRef.current = onResult; });
  useEffect(() => {
    if (!settled) return;
    const p = rec.pronunciation;
    resultRef.current({
      heard: rec.heard ?? '',
      score: p.status === 'done' ? p.result.score : null,
      detail: p.status === 'done' ? p.result : null,
      audio: rec.audio,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled]);

  const started = useRef(false);
  useEffect(() => {
    if (started.current || rec.phase === 'unsupported') return;
    started.current = true;
    rec.start();
    // Once per turn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recording = rec.phase === 'recording';
  const busy = rec.phase === 'requesting' || rec.phase === 'thinking';
  const score = rec.pronunciation.status === 'done' ? rec.pronunciation.result.score : null;
  const micLabel = intl.formatMessage({ id: recording ? 'pron.stop' : rec.heard !== null ? 'conversation.recordAgain' : 'conversation.recordStart' });

  // One line of status, whatever stage the take is at — the prompt until there's something to say about it.
  const status = recording ? (
    rec.live
      ? <p className="text-[15px] leading-snug truncate">“{rec.live}”</p>
      : <PixelBar pct={Math.round(rec.level * 100)} color="var(--px-bad)" label={<FormattedMessage id="pron.listening" />} />
  ) : rec.phase === 'thinking' || rec.pronunciation.status === 'working' ? (
    <p className="text-[14px] text-[var(--px-muted)]"><FormattedMessage id="games.speakChecking" /></p>
  ) : rec.phase === 'denied' ? (
    <p className="text-[14px] text-[var(--px-bad)]"><FormattedMessage id="pron.denied" /></p>
  ) : rec.heard !== null ? (
    <p className="text-[15px] italic text-[var(--px-muted)] truncate">
      {rec.heard ? `“${rec.heard}”` : intl.formatMessage({ id: 'conversation.recordNothingHeard' })}
    </p>
  ) : (
    <p className="px-title text-[var(--px-gold)]"><FormattedMessage id="world.rpYourLine" /></p>
  );

  return (
    <div className="flex-1 min-w-0 flex items-center gap-3">
      {rec.phase !== 'unsupported' && (
        <PixelButton
          tone={recording ? 'bad' : 'sky'}
          className="shrink-0 !px-3 !py-2.5"
          onClick={recording ? rec.stop : rec.start}
          disabled={busy}
          aria-label={micLabel}
          title={micLabel}
        >
          <PixelIcon name={recording ? 'close' : 'mic'} size={2} />
        </PixelButton>
      )}
      <div className="min-w-0 flex-1">{status}</div>
      {score !== null && <span className={`px-num text-[28px] leading-none shrink-0 ${PX_TONE[tone(score)].text}`}>{score}</span>}
    </div>
  );
}
