import { useEffect, useRef, useState } from 'react';
import type { MatchLink } from '../lib/worldLive';

// Starting a game with another player: the host (who asked) sets it up — the
// questions, the words — and the guest says it's ready, again every moment
// until the game arrives (the host may still be opening it). Once the host
// has both, it sends the game and both start. Anything else that arrives is
// the game's own (`onData`); a `left` from either side ends it. `onStart`
// hears the game arrive, to set the game going.
// With no link (a game played alone) it does nothing.
//
// Leaving isn't sent from here: in development a component mounts twice, and
// its first cleanup would end the game. Whoever closes the game says so.

export function useMatch<T>(
  link: MatchLink | null,
  prepare: () => Promise<T>,
  parse: (raw: unknown) => T | null,
  onData?: (d: Record<string, unknown>) => void,
  onStart?: (start: T) => void,
) {
  const [start, setStart] = useState<T | null>(null);
  const [left, setLeft] = useState(false);
  const on = useRef({ onData, onStart });
  useEffect(() => { on.current = { onData, onStart }; });
  // Read once, at the start: the setup doesn't change mid-game.
  const fns = useRef({ prepare, parse });

  useEffect(() => {
    if (!link) return;
    let live = true, started = false, ready = false, prepared: T | null = null, timer = 0;
    const begin = (d: T) => { if (!live || started) return; started = true; window.clearInterval(timer); setStart(d); on.current.onStart?.(d); };
    const hostGo = () => {
      if (!live || started || !ready || prepared === null) return;
      link.send({ kind: 'start', start: prepared });
      begin(prepared);
    };
    const off = link.listen((d) => {
      if (d.kind === 'left') setLeft(true);
      else if (link.host && d.kind === 'ready') { ready = true; hostGo(); }
      else if (!link.host && d.kind === 'start') {
        const s = fns.current.parse(d.start);
        if (s) begin(s); else setLeft(true);
      } else if (started) on.current.onData?.(d);
    });
    if (link.host) {
      fns.current.prepare()
        .then((p) => { prepared = p; hostGo(); })
        .catch(() => { if (live) { link.send({ kind: 'left' }); setLeft(true); } });
    } else {
      const ask = () => link.send({ kind: 'ready' });
      ask();
      timer = window.setInterval(ask, 1500);
    }
    return () => { live = false; window.clearInterval(timer); off(); };
  }, [link]);

  return { start, left };
}
