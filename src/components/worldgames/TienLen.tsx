import { useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useMatch } from '../../hooks/useMatch';
import { playWin } from '../../lib/sfx';
import {
  DEALS_TO_WIN, beats, cardName, classify, dealTl, parseTlView, passTl, playTl, tlViewFor,
  type Combo, type Seat, type TlCard, type TlState, type TlView,
} from '../../lib/tienLen';
import type { MatchLink } from '../../lib/worldLive';
import { MatchWindow } from './MatchWindow';
import { PlayingCard } from './PlayingCard';
import { PixelButton } from './pixel';

// Tiến lên (thirteen) with another player (lib/tienLen). As with poker, the
// host's side deals and runs the game, sending each player only their own
// hand; the guest sends back what they play, checked by the same rules. Tap
// cards in your hand to pick them; the line above says what they are and
// whether they beat what's on the table. First to three deals wins.

const NEXT_DEAL_MS = 3500;

export function TienLen({ link, onClose }: { link: MatchLink; onClose: () => void }) {
  const intl = useIntl();
  const me: Seat = link.host ? 0 : 1;
  const them: Seat = me === 0 ? 1 : 0;
  const game = useRef<TlState | null>(null);
  const [view, setView] = useState<TlView | null>(null);
  const seq = useRef(0);
  const [picked, setPicked] = useState<TlCard[]>([]);

  /** Host: a new state — show it, and send the guest their view. */
  const publish = (s: TlState) => {
    game.current = s;
    setView(tlViewFor(s, 0));
    setPicked([]);
    seq.current += 1;
    link.send({ kind: 'state', seq: seq.current, view: tlViewFor(s, 1) });
  };

  const { start, left } = useMatch<TlView>(
    link,
    async () => { const g = dealTl(null); game.current = g; return tlViewFor(g, 1); },
    parseTlView,
    (d) => {
      const g = game.current;
      if (link.host && g && d.kind === 'act' && d.deal === g.deal) {
        const cards = Array.isArray(d.cards) ? d.cards.filter((c): c is number => Number.isInteger(c)) : [];
        const next = d.type === 'pass' ? passTl(g, 1) : playTl(g, 1, cards);
        if (next !== g) publish(next);
      } else if (!link.host && d.kind === 'state' && Number(d.seq) > seq.current) {
        const v = parseTlView(d.view);
        if (v) { seq.current = Number(d.seq); setView(v); setPicked([]); }
      }
    },
    (v) => setView(link.host && game.current ? tlViewFor(game.current, 0) : v),
  );

  // Host: after a deal, the next one comes by itself.
  const dealDone = view?.dealWinner != null && !view.over;
  useEffect(() => {
    if (!link.host || !dealDone) return;
    const t = setTimeout(() => { if (game.current) publish(dealTl(game.current)); }, NEXT_DEAL_MS);
    return () => clearTimeout(t);
  }, [dealDone, view?.deal]); // eslint-disable-line react-hooks/exhaustive-deps

  const myTurn = !!view && !view.over && view.dealWinner === null && view.turn === me;
  const combo = picked.length ? classify(picked) : null;
  const ok = !!combo && beats(combo, view?.table?.combo ?? null);

  const send = (type: 'play' | 'pass') => {
    if (!view || !myTurn) return;
    if (link.host && game.current) {
      const next = type === 'pass' ? passTl(game.current, 0) : playTl(game.current, 0, picked);
      if (next !== game.current) publish(next);
    } else link.send({ kind: 'act', deal: view.deal, type, cards: picked });
  };
  const toggle = (c: TlCard) => setPicked((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));

  const comboName = (c: Combo) => intl.formatMessage({ id: `world.tl.combo.${c.type}` }, { n: c.type === 'pairs' ? c.size / 2 : c.size });
  const result = view?.over ? (view.wins[me] >= DEALS_TO_WIN ? 'won' : 'lost') : null;
  useEffect(() => { if (result === 'won') playWin(); }, [result]);
  const name = link.peer.name;

  return (
    <MatchWindow
      link={link} icon="fan" title={<FormattedMessage id="world.tlTitle" />} onClose={onClose}
      turn={!view || view.dealWinner !== null || result ? null : view.turn === me ? 'me' : 'them'}
      mine={view && <FormattedMessage id="world.tlWins" values={{ n: view.wins[me], of: DEALS_TO_WIN }} />}
      theirs={view && <FormattedMessage id="world.tlWins" values={{ n: view.wins[them], of: DEALS_TO_WIN }} />}
      started={!!start && !!view} left={left} result={result}
    >
      {view && (
        <div className="px-notch p-3 mb-3 bg-[radial-gradient(ellipse_at_center,#2f6b45,#1d4630)] border-2 border-[#0f2a1c]">
          {/* Their hand, face down: how many cards they hold. */}
          <div className="flex items-center justify-center mb-1">
            {Array.from({ length: view.counts[them] }, (_, i) => (
              <span key={i} className={i ? '-ml-6' : ''}><PlayingCard small /></span>
            ))}
          </div>
          <p className="text-center text-[12px] text-white/80 mb-2"><FormattedMessage id="world.tlCards" values={{ name, n: view.counts[them] }} /></p>

          {/* The table: what's to beat, and who played it. */}
          <div className="min-h-[5.5rem] flex flex-col items-center justify-center gap-1 my-1">
            {view.table ? (
              <>
                <div className="flex justify-center flex-wrap gap-1">
                  {view.table.cards.map((c) => <PlayingCard key={c} card={cardName(c)} />)}
                </div>
                <p className="text-[12px] text-white/85">
                  {comboName(view.table.combo)} · {view.table.by === me ? <FormattedMessage id="world.duelYou" /> : name}
                </p>
              </>
            ) : (
              <p className="text-[13px] text-white/75 text-center">
                {view.last?.pass && <><FormattedMessage id="world.tlPassed" values={{ name: view.last.seat === me ? intl.formatMessage({ id: 'world.duelYou' }) : name }} />{' '}</>}
                <FormattedMessage id={view.turn === me ? 'world.tlYouLead' : 'world.tlTheyLead'} values={{ name }} />
              </p>
            )}
          </div>

          {/* Your hand: tap to pick, picked cards stand up. */}
          <div className="flex justify-center mt-2 pt-3 overflow-x-auto">
            {view.hand.map((c, i) => {
              const on = picked.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggle(c)}
                  disabled={view.dealWinner !== null}
                  className={`${i ? '-ml-5 sm:-ml-4' : ''} transition-transform ${on ? '-translate-y-3' : 'hover:-translate-y-1'}`}
                  aria-pressed={on}
                >
                  <PlayingCard card={cardName(c)} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {view && view.dealWinner !== null && !view.over && (
        <p className="text-center text-[14px] mb-2">
          <FormattedMessage id={view.dealWinner === me ? 'world.tlYouWonDeal' : 'world.tlTheyWonDeal'} values={{ name }} />
          <span className="block text-[12px] text-[var(--px-muted)] mt-1"><FormattedMessage id="world.tlNextDeal" /></span>
        </p>
      )}

      {view && view.dealWinner === null && (
        <>
          <p className="text-center text-[13px] min-h-[1.25rem] mb-2" style={{ color: !combo ? 'var(--px-muted)' : ok ? 'var(--px-jade)' : 'var(--px-bad)' }}>
            {picked.length === 0
              ? <FormattedMessage id={myTurn ? 'world.tlPick' : 'world.tlWait'} values={{ name }} />
              : combo
                ? <>{comboName(combo)} · <FormattedMessage id={ok ? 'world.tlBeats' : view.table ? 'world.tlNoBeat' : 'world.tlBeats'} /></>
                : <FormattedMessage id="world.tlNotACombo" />}
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            <PixelButton tone="paper" onClick={() => setPicked([])} disabled={!picked.length} className="!text-[13px] !px-2"><FormattedMessage id="world.tlClear" /></PixelButton>
            <PixelButton tone="paper" onClick={() => send('pass')} disabled={!myTurn || !view.table} className="!text-[13px] !px-2"><FormattedMessage id="world.tlPass" /></PixelButton>
            <PixelButton tone="jade" onClick={() => send('play')} disabled={!myTurn || !ok} className="!text-[13px] !px-2"><FormattedMessage id="world.tlPlay" /></PixelButton>
          </div>
        </>
      )}
    </MatchWindow>
  );
}
