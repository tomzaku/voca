import { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { CHAR_FOR, HIGH, KEY_FOR, LOW, PIANO_SONGS, isBlack, type PianoSong } from '../../lib/pianoSongs';
import { playNote } from '../../lib/pianoSound';
import { playWin } from '../../lib/sfx';
import { PixelButton, PixelChip } from './pixel';

// The street piano on Phố đi bộ: play it with the mouse or the keyboard —
// free, or a song, where the next key glows and the song moves on as you
// play it (a wrong key flashes red and costs nothing but accuracy). Listen
// plays the song through. Sound and songs are lib/pianoSound and
// lib/pianoSongs; this is the keyboard and the game.

const KEYS = Array.from({ length: HIGH - LOW + 1 }, (_, i) => LOW + i);
const WHITES = KEYS.filter((k) => !isBlack(k));
const LABEL: Record<number, string> = Object.fromEntries(
  Object.entries(KEY_FOR).map(([code, midi]) => [midi, code.replace(/^Key/, '').replace('Semicolon', ';').replace('Quote', "'").replace('BracketRight', ']').replace('Enter', '↵')]),
);

export function StreetPiano({ onClose }: { onClose: () => void }) {
  const [song, setSong] = useState<PianoSong | null>(null);
  const [at, setAt] = useState(0);                         // the next note of the song
  const [miss, setMiss] = useState(0);
  const [down, setDown] = useState<Set<number>>(new Set());
  const [wrong, setWrong] = useState<number | null>(null);
  const [demo, setDemo] = useState<number | null>(null);   // the key the demo is playing
  const timers = useRef<number[]>([]);
  const done = song !== null && at >= song.notes.length;

  const stopDemo = () => { timers.current.forEach(clearTimeout); timers.current = []; setDemo(null); };
  useEffect(() => stopDemo, []);

  const press = useCallback((midi: number) => {
    playNote(midi);
    setDown((d) => new Set(d).add(midi));
    setTimeout(() => setDown((d) => { const n = new Set(d); n.delete(midi); return n; }), 160);
    if (!song || at >= song.notes.length) return;
    if (midi === song.notes[at].midi) {
      const next = at + 1;
      setAt(next);
      if (next === song.notes.length) setTimeout(playWin, 300);
    } else {
      setMiss((m) => m + 1);
      setWrong(midi);
      setTimeout(() => setWrong(null), 250);
    }
  }, [song, at]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const midi = KEY_FOR[e.code] ?? CHAR_FOR[e.key.length === 1 ? e.key.toLowerCase() : e.key];
      if (midi === undefined || e.repeat || e.metaKey || e.ctrlKey) return;
      e.preventDefault();
      press(midi);
    };
    // Capture: the window's own panel stops keys bubbling out (so the world
    // doesn't act on them), and focus is often on a key or a song chip in it.
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [press]);

  const choose = (s: PianoSong | null) => { stopDemo(); setSong(s); setAt(0); setMiss(0); };

  /** Play the song through, from where you are. */
  const listen = () => {
    if (!song) return;
    stopDemo();
    const beat = 60 / song.bpm;
    let t = 0;
    for (const n of song.notes.slice(at)) {
      const start = t;
      playNote(n.midi, start, Math.max(0.4, n.beats * beat * 1.2));
      timers.current.push(window.setTimeout(() => setDemo(n.midi), start * 1000));
      t += n.beats * beat;
    }
    timers.current.push(window.setTimeout(() => setDemo(null), t * 1000));
  };

  const next = song && !done ? song.notes[at].midi : null;
  const keyStyle = (k: number) => {
    if (wrong === k) return 'var(--px-bad)';
    if (down.has(k) || demo === k) return 'var(--px-sky)';
    if (next === k) return 'var(--px-gold)';
    return isBlack(k) ? '#1c1714' : '#f4eedf';
  };
  const whiteW = 100 / WHITES.length;

  return (
    <div className="px absolute inset-0 z-40 flex items-end sm:items-center justify-center p-3 bg-black/25" onKeyDown={(e) => e.stopPropagation()}>
      <div className="px-notch px-frame w-full max-w-[720px] p-4 px-in-up">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="px-title !text-[18px] text-[var(--px-gold)]">🎹 <FormattedMessage id="world.pianoTitle" /></p>
            <p className="text-[13px] text-[var(--px-muted)]"><FormattedMessage id="places.walkingStreet" /></p>
          </div>
          <button onClick={onClose} className="px-title !text-[12px] text-[var(--px-muted)] hover:text-[var(--px-text)] mt-1">
            <FormattedMessage id="world.focusLeave" />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          <PixelChip on={!song} onClick={() => choose(null)}><FormattedMessage id="world.pianoFree" /></PixelChip>
          {PIANO_SONGS.map((s) => (
            <PixelChip key={s.id} on={song?.id === s.id} onClick={() => choose(s)}>{s.title}</PixelChip>
          ))}
        </div>

        {song && (
          <div className="flex items-center justify-between gap-2 mb-3 text-[14px]">
            <span className="px-num text-[var(--px-muted)]">
              {done
                ? <FormattedMessage id="world.pianoDone" values={{ accuracy: Math.round((song.notes.length / (song.notes.length + miss)) * 100) }} />
                : <FormattedMessage id="world.pianoProgress" values={{ at, total: song.notes.length }} />}
            </span>
            <span className="flex gap-1.5">
              {!done && <PixelButton tone="paper" onClick={listen} className="!px-3 !py-1.5 !text-[12px]"><FormattedMessage id="world.pianoListen" /></PixelButton>}
              <PixelButton tone="paper" onClick={() => choose(song)} className="!px-3 !py-1.5 !text-[12px]"><FormattedMessage id="world.focusReset" /></PixelButton>
            </span>
          </div>
        )}

        {/* The keyboard: white keys across, black keys over the gaps. */}
        <div className="relative h-40 sm:h-48 select-none touch-none px-inset px-notch p-1">
          <div className="relative h-full">
            {WHITES.map((k, i) => (
              <button
                key={k}
                onPointerDown={(e) => { e.preventDefault(); press(k); }}
                className="absolute top-0 bottom-0 flex items-end justify-center pb-1.5 border-x border-[#1c1714]"
                style={{ left: `${i * whiteW}%`, width: `${whiteW}%`, background: keyStyle(k) }}
                aria-label={`key ${k}`}
              >
                <span className="text-[10px] font-bold text-[#6a5a4a]">{LABEL[k]}</span>
              </button>
            ))}
            {KEYS.filter(isBlack).map((k) => {
              const left = WHITES.filter((w) => w < k).length * whiteW;
              return (
                <button
                  key={k}
                  onPointerDown={(e) => { e.preventDefault(); press(k); }}
                  className="absolute top-0 h-[60%] z-10 flex items-end justify-center pb-1 border border-black"
                  style={{ left: `calc(${left}% - ${whiteW * 0.32}%)`, width: `${whiteW * 0.64}%`, background: keyStyle(k) }}
                  aria-label={`key ${k}`}
                >
                  <span className="text-[9px] font-bold text-[#c8bca8]">{LABEL[k]}</span>
                </button>
              );
            })}
          </div>
        </div>
        <p className="mt-2 text-[12px] text-[var(--px-muted)]"><FormattedMessage id="world.pianoHint" /></p>
      </div>
    </div>
  );
}
