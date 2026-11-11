import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import { FormattedMessage, useIntl } from 'react-intl';
import { MouthControls, MouthDiagram, MouthTags } from '../MouthDiagram';
import { useMouthControls } from '../../hooks/useMouthControls';
import { contrast } from '../../data/articulation';
import { IPA_SOUNDS } from '../../data/ipa';
import { saySound, sayWord, stopIpa } from '../../lib/ipaPlayback';
import { useIpaText } from '../../hooks/useIpaText';

/**
 * The sound a word needed beside the one the learner made, after a miss:
 * both mouths moving (each with the other outlined), each sound to hear on
 * its own and in a word, what each does differently, and "hear both" to play
 * them back to back — the quickest way to hear a difference you can't yet.
 *
 * Its own module, loaded on first open: it pulls in the IPA chart data and
 * playback, which most pronunciation checks never need.
 */
export default function SoundCompare({ target, heard, onClose }: { target: string; heard: string; onClose: () => void }) {
  const intl = useIntl();
  const [playing, setPlaying] = useState<string | null>(null);
  const mouth = useMouthControls();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => { window.removeEventListener('keydown', onKey, true); stopIpa(); };
  }, [onClose]);

  const done = () => setPlaying(null);
  const hearSound = (s: string) => { setPlaying(`/${s}/`); saySound(s, done); };
  const hearWord = (w: string) => { setPlaying(w); sayWord(w, done); };
  const hearBoth = () => {
    setPlaying('both');
    saySound(target, () => setTimeout(() => saySound(heard, done), 350));
  };

  // A portal: the coaching panel sits inside animated (transformed) cards,
  // where `fixed` would be relative to the card rather than the screen.
  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-start sm:items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={intl.formatMessage({ id: 'pron.compareTitle' }, { a: `/${target}/`, b: `/${heard}/` })}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-2xl border-2 border-border bg-bg-card shadow-2xl p-4 sm:p-5 animate-pop-in"
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="font-display font-extrabold text-lg text-text-primary">
            <FormattedMessage
              id="pron.compareTitle"
              values={{
                a: <span className="font-code text-accent-green">/{target}/</span>,
                b: <span className="font-code text-accent-red">/{heard}/</span>,
              }}
            />
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={hearBoth}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-colors ${playing === 'both' ? 'bg-accent-cyan text-bg-primary' : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'}`}
            >
              <Icon icon={playing === 'both' ? 'lucide:audio-lines' : 'lucide:volume-2'} />
              <FormattedMessage id="pron.hearBoth" />
            </button>
            <button
              onClick={onClose}
              aria-label={intl.formatMessage({ id: 'pron.closePractice' })}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
            >
              <Icon icon="lucide:x" className="text-lg" />
            </button>
          </div>
        </div>

        <MouthControls {...mouth} className="mb-3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Side symbol={target} other={heard} good at={mouth.at} playing={playing} onSound={hearSound} onWord={hearWord} />
          <Side symbol={heard} other={target} good={false} at={mouth.at} playing={playing} onSound={hearSound} onWord={hearWord} />
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-text-muted">
          <span className="inline-block w-5 border-t-2 border-dashed border-accent-yellow" />
          <FormattedMessage id="ipa.dashedOutline" />
        </p>
      </div>
    </div>,
    document.body,
  );
}

function Side({ symbol, other, good, at, playing, onSound, onWord }: {
  symbol: string;
  other: string;
  good: boolean;
  at: number | null;
  playing: string | null;
  onSound: (s: string) => void;
  onWord: (w: string) => void;
}) {
  const text = useIpaText();
  const sound = IPA_SOUNDS.find((s) => s.symbol === symbol);
  const word = sound?.examples[0];
  const points = contrast(symbol, other);
  const accent = good ? 'text-accent-green' : 'text-accent-red';
  const chip = 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-extrabold transition-colors';
  const on = 'bg-accent-cyan text-bg-primary';
  const off = 'bg-bg-card border border-border text-text-secondary hover:text-text-primary';

  return (
    <section className={`rounded-xl p-3 bg-bg-tertiary border-2 ${good ? 'border-accent-green/40' : 'border-accent-red/40'}`}>
      <p className={`text-[11px] font-extrabold uppercase tracking-wider mb-1 ${accent}`}>
        <FormattedMessage id={good ? 'pron.target' : 'pron.youSaid'} />
      </p>
      <MouthDiagram symbol={symbol} ghost={other} view="both" at={at} className="w-full mb-2" />
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <span className={`font-code text-3xl font-black leading-none mr-1 ${accent}`}>/{symbol}/</span>
        <button onClick={() => onSound(symbol)} className={`${chip} ${playing === `/${symbol}/` ? on : off}`}>
          <Icon icon="lucide:volume-2" /> <FormattedMessage id="pron.hearSound" />
        </button>
        {word && (
          <button onClick={() => onWord(word)} className={`${chip} ${playing === word ? on : off}`}>
            <Icon icon="lucide:volume-2" /> “{word}”
          </button>
        )}
      </div>
      <MouthTags symbol={symbol} />
      {points.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-1 text-xs font-bold text-text-secondary leading-snug">
              <Icon icon="lucide:chevron-right" className={`shrink-0 mt-px ${accent}`} />
              {text.mouth(p)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
