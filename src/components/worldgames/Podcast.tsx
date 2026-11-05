import { useEffect, useMemo, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { podcasts, podcastTopics, type Podcast as Episode } from '../../data/englishListening';
import { usePodcastPlayer } from '../../hooks/useEpisodePlayer';
import { clock } from '../../lib/podcastAudio';
import { splitSentences } from '../../lib/listeningRules';
import { playSelect } from '../../lib/sfx';
import { HudCenter, HudDock, PixelButton, PixelChip, PixelIcon } from './pixel';

// Podcasts at the royal theatre — the Listen page's episodes, followed a
// sentence at a time (lib/listeningRules splitSentences) so the line being
// said lights up and any line can be replayed. A recorded episode streams as
// one file and its timed transcript drives the highlight (useEpisodePlayer);
// one with no recording yet is read sentence by sentence (the role-plays'
// script player). Hide the text to listen first; the key words and
// discussion questions are a tab away.

type Pane = 'script' | 'words' | 'discuss';

export function Podcast() {
  const [episode, setEpisode] = useState<Episode | null>(null);
  const open = (e: Episode) => { playSelect(); setEpisode(e); };
  const random = () => {
    const pool = podcasts.filter((p) => p.id !== episode?.id);
    open(pool[Math.floor(Math.random() * pool.length)]);
  };
  if (!episode) return <Picker onPick={open} onRandom={random} />;
  return <Episode key={episode.id} episode={episode} onEpisodes={() => setEpisode(null)} onRandom={random} />;
}

function Picker({ onPick, onRandom }: { onPick: (e: Episode) => void; onRandom: () => void }) {
  const intl = useIntl();
  const [topic, setTopic] = useState<string>('all');
  const shown = topic === 'all' ? podcasts : podcasts.filter((p) => p.topic === topic);
  return (
    <HudCenter wide>
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="px-title !text-[18px] text-[var(--px-gold)]"><FormattedMessage id="world.podPick" /></p>
        <PixelButton tone="gold" onClick={onRandom}>
          <PixelIcon name="retry" size={2} /> <FormattedMessage id="world.rpRandom" />
        </PixelButton>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <PixelChip on={topic === 'all'} onClick={() => setTopic('all')}>{intl.formatMessage({ id: 'listening.all' })}</PixelChip>
        {podcastTopics.map((t) => <PixelChip key={t} on={t === topic} onClick={() => setTopic(t)}>{t}</PixelChip>)}
      </div>
      <div className="grid sm:grid-cols-2 gap-2 max-h-[46vh] overflow-y-auto p-0.5">
        {shown.map((p) => (
          <button key={p.id} onClick={() => onPick(p)} className="px-pick px-notch text-left px-3 py-2.5">
            <span className="block px-title !text-[14px]">{p.title}</span>
            <span className="block px-title !text-[11px] text-[var(--px-muted)] mt-1">{p.topic} · {p.level} · {p.duration}</span>
          </button>
        ))}
      </div>
    </HudCenter>
  );
}

function Episode({ episode, onEpisodes, onRandom }: { episode: Episode; onEpisodes: () => void; onRandom: () => void }) {
  const sentences = useMemo(() => splitSentences(episode.script), [episode]);
  const [at, setAt] = useState(0);
  const player = usePodcastPlayer(sentences, () => setAt(0));
  const { recorded } = player;
  const [pane, setPane] = useState<Pane>('script');
  const [hidden, setHidden] = useState(false);
  // Sentences already said stay readable when the text is hidden — you hear
  // it first, then see what it was.
  const [heard, setHeard] = useState(-1);
  if (player.index > heard) setHeard(player.index);
  // Where Play picks up after a stop.
  if (player.index >= 0 && player.index !== at) setAt(player.index);

  const toggle = () => (player.running ? player.stop() : player.playFrom(at));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ') { e.preventDefault(); toggle(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Keep the sentence being said in view.
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current?.querySelector(`[data-line="${player.index}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [player.index]);

  const tabs: { id: Pane; labelId: string; show: boolean }[] = [
    { id: 'script', labelId: 'listening.fullScript', show: true },
    { id: 'words', labelId: 'listening.keyVocabulary', show: !!episode.vocabulary?.length },
    { id: 'discuss', labelId: 'listening.discussionQuestions', show: !!episode.discussionQuestions?.length },
  ];

  return (
    <>
      <HudCenter wide aboveDock>
        <p className="px-title !text-[11px] text-[var(--px-muted)]">{episode.topic} · {episode.level} · {episode.duration}</p>
        <p className="px-title !text-[17px] text-[var(--px-gold)]">{episode.title}</p>
        <p className="text-[14px] text-[var(--px-muted)] leading-snug mt-0.5 mb-3">{episode.description}</p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {tabs.filter((t) => t.show).map((t) => (
            <PixelChip key={t.id} on={pane === t.id} onClick={() => setPane(t.id)}><FormattedMessage id={t.labelId} /></PixelChip>
          ))}
        </div>

        {pane === 'script' && (
          <div ref={listRef} className="max-h-[34vh] overflow-y-auto pr-1 text-[16px] leading-relaxed">
            {sentences.map((text, i) => {
              const current = player.index === i;
              const masked = hidden && i > heard;
              return (
                // A span, not a button: buttons can't flow inline, and the
                // script should read as paragraphs.
                <span
                  key={i}
                  role="button"
                  tabIndex={0}
                  data-line={i}
                  title={recorded ? clock(recorded.lines[i].start) : undefined}
                  onClick={() => { setAt(i); player.playLine(i); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { setAt(i); player.playLine(i); } }}
                  className={`cursor-pointer mr-1 px-0.5 ${current ? 'bg-[var(--px-gold)] text-[var(--px-ink)]' : masked ? 'text-[var(--px-muted)] tracking-widest' : 'hover:text-[var(--px-gold)]'}`}
                >
                  {masked ? '• • • •' : text}
                </span>
              );
            })}
          </div>
        )}
        {pane === 'words' && (
          <div className="space-y-2 max-h-[34vh] overflow-y-auto pr-1">
            {episode.vocabulary?.map((v) => (
              <p key={v.word} className="text-[15px] leading-snug">
                <span className="px-title !text-[14px] text-[var(--px-sky)] mr-2">{v.word}</span>
                <span className="text-[var(--px-muted)]">{v.definition}</span>
              </p>
            ))}
          </div>
        )}
        {pane === 'discuss' && (
          <ol className="space-y-2 max-h-[34vh] overflow-y-auto pr-1 list-decimal pl-5 text-[15px] leading-snug">
            {episode.discussionQuestions?.map((q) => <li key={q}>{q}</li>)}
          </ol>
        )}
      </HudCenter>

      <HudDock>
        {recorded && <Scrubber time={player.time} duration={recorded.duration} onSeek={player.playAt} />}
        <div className="flex flex-wrap items-center gap-2">
          <PixelButton tone="sky" onClick={toggle}>
            <PixelIcon name={player.running ? 'close' : 'play'} size={2} />
            <FormattedMessage id={player.running ? 'listening.stop' : 'listening.play'} /> <span className="opacity-70">␣</span>
          </PixelButton>
          <PixelChip on={hidden} onClick={() => setHidden((h) => !h)}>
            <span className="inline-flex items-center gap-1.5"><PixelIcon name="eye" size={2} /><FormattedMessage id="world.podHideText" /></span>
          </PixelChip>
          {player.index >= 0 && (
            <span className="px-num text-[18px] text-[var(--px-muted)]">{player.index + 1} / {sentences.length}</span>
          )}
          <span className="flex-1" />
          <PixelButton tone="paper" onClick={() => { player.stop(); onRandom(); }}>
            <PixelIcon name="retry" size={2} /> <FormattedMessage id="world.rpRandom" />
          </PixelButton>
          <PixelButton tone="paper" onClick={() => { player.stop(); onEpisodes(); }}><FormattedMessage id="world.podEpisodes" /></PixelButton>
        </div>
      </HudDock>
    </>
  );
}

/** Where the episode is, and a tap anywhere along it to jump there. */
function Scrubber({ time, duration, onSeek }: { time: number; duration: number; onSeek: (seconds: number) => void }) {
  const seek = (e: React.PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    onSeek(Math.min(1, Math.max(0, (e.clientX - box.left) / box.width)) * duration);
  };
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="px-num text-[15px] text-[var(--px-muted)] w-10 text-right">{clock(time)}</span>
      <div onPointerDown={seek} className="flex-1 h-3 cursor-pointer bg-[var(--px-ink)] border-2 border-[var(--px-muted)] relative">
        <div className="absolute inset-y-0 left-0 bg-[var(--px-gold)]" style={{ width: `${Math.min(100, (time / duration) * 100)}%` }} />
      </div>
      <span className="px-num text-[15px] text-[var(--px-muted)] w-10">{clock(duration)}</span>
    </div>
  );
}
