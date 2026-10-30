import { useEffect, useMemo, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { ieltsListeningSections, type IeltsListeningSection } from '../../data/englishListening';
import { useScriptPlayer, type ScriptLine } from '../../hooks/useScriptPlayer';
import { assignVoices, scoreAnswers } from '../../lib/listeningRules';
import { RECORDING_VOICES } from '../../lib/tts';
import { playCorrect, playSelect, playWrong } from '../../lib/sfx';
import { HudCenter, HudDock, PixelButton, PixelChip, PixelIcon } from './pixel';

// IELTS Listening in the Quốc Học exam hall — the Listen page's sections,
// sat the way the real test runs: read the questions, play the recording
// (every speaker keeps one voice, lib/listeningRules assignVoices), answer as
// you go, then hand in. Marked with the same scoreAnswers as the app; the
// transcript and the section's tips open once you've handed in.

const SECTIONS = ['Section 1', 'Section 2', 'Section 3', 'Section 4'] as const;

export function IeltsListening() {
  const [section, setSection] = useState<IeltsListeningSection | null>(null);
  const open = (s: IeltsListeningSection) => { playSelect(); setSection(s); };
  const random = () => {
    const pool = ieltsListeningSections.filter((s) => s.id !== section?.id);
    open(pool[Math.floor(Math.random() * pool.length)]);
  };
  if (!section) return <Picker onPick={open} onRandom={random} />;
  return <Paper key={section.id} section={section} onSections={() => setSection(null)} onRandom={random} />;
}

function Picker({ onPick, onRandom }: { onPick: (s: IeltsListeningSection) => void; onRandom: () => void }) {
  const intl = useIntl();
  const [part, setPart] = useState<string>('all');
  const shown = part === 'all' ? ieltsListeningSections : ieltsListeningSections.filter((s) => s.section === part);
  return (
    <HudCenter wide>
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="px-title !text-[18px] text-[var(--px-gold)]"><FormattedMessage id="world.ilPick" /></p>
        <PixelButton tone="gold" onClick={onRandom}>
          <PixelIcon name="retry" size={2} /> <FormattedMessage id="world.rpRandom" />
        </PixelButton>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <PixelChip on={part === 'all'} onClick={() => setPart('all')}>{intl.formatMessage({ id: 'listening.allSections' })}</PixelChip>
        {SECTIONS.map((s) => <PixelChip key={s} on={s === part} onClick={() => setPart(s)}>{s}</PixelChip>)}
      </div>
      <div className="grid sm:grid-cols-2 gap-2 max-h-[46vh] overflow-y-auto p-0.5">
        {shown.map((s) => (
          <button key={s.id} onClick={() => onPick(s)} className="px-pick px-notch text-left px-3 py-2.5">
            <span className="block px-title !text-[14px]">{s.title.replace(/^Section \d\s*[—-]\s*/, '')}</span>
            <span className="block px-title !text-[11px] text-[var(--px-muted)] mt-1">
              {s.section} · {s.topic} · <FormattedMessage id="listening.questionCount" values={{ count: s.questions.length }} />
            </span>
          </button>
        ))}
      </div>
    </HudCenter>
  );
}

type Pane = 'questions' | 'transcript' | 'tips';

function Paper({ section, onSections, onRandom }: { section: IeltsListeningSection; onSections: () => void; onRandom: () => void }) {
  const lines = useMemo<ScriptLine[]>(() => {
    const voice = assignVoices(section.transcript.map((t) => t.speaker), RECORDING_VOICES);
    return section.transcript.map((t) => ({ speaker: 'a', text: t.text, voice: voice[t.speaker] }));
  }, [section]);
  const player = useScriptPlayer(lines, null, () => {});
  const [answers, setAnswers] = useState<(number | null)[]>(() => section.questions.map(() => null));
  const [handedIn, setHandedIn] = useState(false);
  const [pane, setPane] = useState<Pane>('questions');
  const score = scoreAnswers(section.questions, answers);
  const answered = answers.filter((a) => a !== null).length;

  const answer = (q: number, i: number) => {
    if (handedIn) return;
    playSelect();
    setAnswers((a) => a.map((v, k) => (k === q ? i : v)));
  };
  const handIn = () => {
    player.stop();
    setHandedIn(true);
    (score === section.questions.length ? playCorrect : playWrong)();
  };
  const toggle = () => (player.running ? player.stop() : void player.playFrom(0));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ') { e.preventDefault(); toggle(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current?.querySelector(`[data-line="${player.index}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [player.index]);

  return (
    <>
      <HudCenter wide aboveDock>
        <p className="px-title !text-[11px] text-[var(--px-muted)]">{section.section} · {section.topic} · {section.duration}</p>
        <p className="px-title !text-[17px] text-[var(--px-gold)]">{section.title.replace(/^Section \d\s*[—-]\s*/, '')}</p>
        <p className="text-[14px] text-[var(--px-muted)] leading-snug mt-0.5 mb-3">{section.description}</p>
        {handedIn && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            <PixelChip on={pane === 'questions'} onClick={() => setPane('questions')}><FormattedMessage id="listening.questions" /></PixelChip>
            <PixelChip on={pane === 'transcript'} onClick={() => setPane('transcript')}><FormattedMessage id="listening.showTranscript" /></PixelChip>
            {!!section.tips?.length && <PixelChip on={pane === 'tips'} onClick={() => setPane('tips')}><FormattedMessage id="listening.tips" /></PixelChip>}
          </div>
        )}

        {pane === 'questions' && (
          <div className="space-y-3 max-h-[38vh] overflow-y-auto pr-1">
            {section.questions.map((q, qi) => (
              <div key={qi}>
                <p className="text-[15px] font-bold leading-snug mb-1.5">
                  <span className="text-[var(--px-gold)] mr-1.5">{qi + 1}.</span>{q.question}
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {q.options.map((opt, oi) => {
                    const picked = answers[qi] === oi;
                    const state = !handedIn ? 'idle' : oi === q.correctIndex ? 'good' : picked ? 'bad' : 'dim';
                    return (
                      <button
                        key={oi}
                        onClick={() => answer(qi, oi)}
                        data-on={!handedIn && picked}
                        data-state={state}
                        disabled={handedIn}
                        className={`px-notch text-left px-2.5 py-1.5 text-[14px] font-bold leading-tight ${handedIn ? 'px-slot' : 'px-pick'}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        {pane === 'transcript' && (
          <div ref={listRef} className="space-y-2 max-h-[38vh] overflow-y-auto pr-1">
            {section.transcript.map((t, i) => (
              <button
                key={i}
                data-line={i}
                onClick={() => void player.playLine(i)}
                className="block w-full text-left px-notch px-3 py-2 bg-[#2a221c]"
                style={{ boxShadow: `inset 0 0 0 2px var(--px-ink)${player.index === i ? ', inset 0 0 0 4px var(--px-gold)' : ''}` }}
              >
                <span className="px-title !text-[11px] text-[var(--px-muted)] flex items-center gap-1.5 mb-0.5">
                  <PixelIcon name="speaker" size={1} /> {t.speaker}
                </span>
                <span className="text-[15px] leading-snug">{t.text}</span>
              </button>
            ))}
          </div>
        )}
        {pane === 'tips' && (
          <ul className="space-y-1.5 max-h-[38vh] overflow-y-auto pr-1 list-disc pl-5 text-[15px] leading-snug">
            {section.tips?.map((tip) => <li key={tip}>{tip}</li>)}
          </ul>
        )}
      </HudCenter>

      <HudDock>
        {handedIn && (
          <p className={`px-title flex items-center gap-2 ${score === section.questions.length ? 'text-[var(--px-good)]' : 'text-[var(--px-gold)]'}`}>
            <PixelIcon name="check" size={2} />
            <FormattedMessage id="listening.scoreCorrect" values={{ score, total: section.questions.length }} />
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <PixelButton tone="sky" onClick={toggle}>
            <PixelIcon name={player.running ? 'close' : 'play'} size={2} />
            <FormattedMessage id={player.running ? 'listening.stop' : 'world.ilPlay'} /> <span className="opacity-70">␣</span>
          </PixelButton>
          {player.running && player.index >= 0 && (
            <span className="px-title !text-[12px] text-[var(--px-muted)]">{section.transcript[player.index]?.speaker}</span>
          )}
          <span className="flex-1" />
          {handedIn ? (
            <PixelButton tone="red" onClick={() => { player.stop(); onRandom(); }}>
              <PixelIcon name="retry" size={2} /> <FormattedMessage id="world.rpRandom" />
            </PixelButton>
          ) : (
            <PixelButton tone="red" onClick={handIn} disabled={answered === 0}>
              <FormattedMessage id="world.ilHandIn" /> <span className="opacity-70">{answered}/{section.questions.length}</span>
            </PixelButton>
          )}
          <PixelButton tone="paper" onClick={() => { player.stop(); onSections(); }}><FormattedMessage id="world.ilSections" /></PixelButton>
        </div>
      </HudDock>
    </>
  );
}
