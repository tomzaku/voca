import { useEffect, useMemo, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { usePodcastPlayer } from '../hooks/useEpisodePlayer';
import { clock } from '../lib/podcastAudio';
import { splitSentences } from '../lib/listeningRules';

// The Listen page's podcast script, played and followed: the sentence being
// said lights up, tapping one plays from there, and a recorded episode
// streams as one file with a bar to jump along it (usePodcastPlayer). The
// world's theatre has the pixel version of this (worldgames/Podcast).

export function PodcastScript({ script }: { script: string }) {
  const intl = useIntl();
  // Paragraphs kept for layout; numbered across the whole script, as the
  // player counts them — splitSentences cuts at newlines first, so the two
  // agree.
  const paragraphs = useMemo(() => {
    let n = 0;
    return script.split(/\n+/).map(splitSentences).filter((p) => p.length)
      .map((p) => p.map((text) => ({ text, i: n++ })));
  }, [script]);
  const sentences = useMemo(() => paragraphs.flat().map((s) => s.text), [paragraphs]);
  const [at, setAt] = useState(0);
  const player = usePodcastPlayer(sentences, () => setAt(0));
  if (player.index >= 0 && player.index !== at) setAt(player.index);
  const { recorded } = player;

  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (player.index < 0) return;
    listRef.current?.querySelector(`[data-line="${player.index}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [player.index]);

  const toggle = () => (player.running ? player.stop() : player.playFrom(at));
  const label = intl.formatMessage({ id: player.running ? 'word.stopReading' : player.loading ? 'word.generatingAudio' : 'word.readAloud' });

  return (
    <>
      <div className="px-5 py-3 flex items-center gap-3 border-b border-border">
        <span className="text-xs font-semibold text-accent-purple"><FormattedMessage id="listening.fullScript" /></span>
        <span className="flex-1" />
        {recorded && <span className="text-[11px] tabular-nums text-text-muted">{clock(player.time)} / {clock(recorded.duration)}</span>}
        <button
          onClick={toggle}
          title={label}
          aria-label={label}
          className={`w-7 h-7 rounded-md flex items-center justify-center border transition-all cursor-pointer ${
            player.running
              ? 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20 hover:bg-accent-cyan/20'
              : 'bg-bg-tertiary text-text-muted border-border hover:text-accent-cyan hover:border-accent-cyan/30'
          }`}
        >
          {player.running
            ? <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><rect width="10" height="10" rx="1" /></svg>
            : <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M1 0.5v9l8-4.5z" /></svg>}
        </button>
      </div>
      {recorded && (
        <div
          role="slider"
          aria-label={intl.formatMessage({ id: 'listening.fullScript' })}
          aria-valuemin={0}
          aria-valuemax={Math.round(recorded.duration)}
          aria-valuenow={Math.round(player.time)}
          onPointerDown={(e) => {
            const box = e.currentTarget.getBoundingClientRect();
            player.playAt(Math.min(1, Math.max(0, (e.clientX - box.left) / box.width)) * recorded.duration);
          }}
          className="h-1.5 bg-bg-tertiary cursor-pointer"
        >
          <div className="h-full bg-accent-purple" style={{ width: `${Math.min(100, (player.time / recorded.duration) * 100)}%` }} />
        </div>
      )}
      <div ref={listRef} className="px-5 py-4 space-y-3 text-sm text-text-secondary leading-relaxed">
        {paragraphs.map((para) => (
          <p key={para[0].i}>
            {para.map(({ text, i }) => (
              <span
                key={i}
                role="button"
                tabIndex={0}
                data-line={i}
                title={recorded ? clock(recorded.lines[i].start) : undefined}
                onClick={() => player.playFrom(i)}
                onKeyDown={(e) => { if (e.key === 'Enter') player.playFrom(i); }}
                className={`cursor-pointer rounded px-0.5 transition-colors ${
                  player.index === i ? 'bg-accent-purple/15 text-text-primary' : 'hover:text-text-primary'
                }`}
              >
                {text}{' '}
              </span>
            ))}
          </p>
        ))}
      </div>
    </>
  );
}
