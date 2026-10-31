import { useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useMatch } from '../../hooks/useMatch';
import { act, bestHand, dealHand, legal, newGame, parseView, viewFor, type PokerAction, type PokerState, type PokerView, type Seat } from '../../lib/poker';
import { playWin } from '../../lib/sfx';
import type { MatchLink } from '../../lib/worldLive';
import { MatchWindow } from './MatchWindow';
import { PlayingCard } from './PlayingCard';
import { PixelButton } from './pixel';

// Heads-up Texas Hold'em with another player, for play chips (lib/poker).
// The host's side deals and runs the hand: it keeps the deck and sends the
// guest only what the guest may see; the guest sends back what they do,
// which the host checks by the same rules. Your best hand is named as the
// cards come out — a little English on the way.

const NEXT_HAND_MS = 4000;
/** A pile of chips on the table, and how many. */
function Chips({ n }: { n: number }) {
  if (n <= 0) return <span className="h-5" />;
  return (
    <span className="inline-flex items-center gap-1 text-[13px] px-num text-[var(--px-gold)]">
      <span className="w-3.5 h-3.5 rounded-full bg-[#c9a24a] border-2 border-dashed border-[#f6e7b0]" />{n}
    </span>
  );
}

export function Poker({ link, onClose }: { link: MatchLink; onClose: () => void }) {
  const intl = useIntl();
  const me: Seat = link.host ? 0 : 1;
  const them: Seat = me === 0 ? 1 : 0;
  // The host's whole game (with the deck); what this side sees of it.
  const game = useRef<PokerState | null>(null);
  const [view, setView] = useState<PokerView | null>(null);
  const seq = useRef(0);

  /** Host: a new state — show it, and send the guest their view. */
  const publish = (s: PokerState) => {
    game.current = s;
    setView(viewFor(s, 0));
    seq.current += 1;
    link.send({ kind: 'state', seq: seq.current, view: viewFor(s, 1) });
  };

  const { start, left } = useMatch<PokerView>(
    link,
    async () => { const g = newGame(); game.current = g; return viewFor(g, 1); },
    parseView,
    (d) => {
      if (link.host && d.kind === 'act' && game.current && d.hand === game.current.hand && d.action && typeof d.action === 'object') {
        const next = act(game.current, 1, d.action as PokerAction);
        if (next !== game.current) publish(next);
      } else if (!link.host && d.kind === 'state' && Number(d.seq) > seq.current) {
        const v = parseView(d.view);
        if (v) { seq.current = Number(d.seq); setView(v); }
      }
    },
    (v) => setView(link.host && game.current ? viewFor(game.current, 0) : v),
  );

  // Host: after a hand, the next one deals itself.
  const handOver = !!view?.result && !view.over;
  useEffect(() => {
    if (!link.host || !handOver) return;
    const t = setTimeout(() => { if (game.current) publish(dealHand(game.current)); }, NEXT_HAND_MS);
    return () => clearTimeout(t);
  }, [handOver, view?.hand]); // eslint-disable-line react-hooks/exhaustive-deps

  const l = view ? legal(view, me) : null;
  // The raise amount: what you've set this turn, else the minimum.
  const turnKey = view ? `${view.hand}-${view.street}-${view.toAct}` : '';
  const [picked, setPicked] = useState<{ key: string; to: number } | null>(null);
  const raiseTo = l ? Math.min(Math.max(picked?.key === turnKey ? picked.to : l.minTo, l.minTo), l.maxTo) : 0;
  const setRaiseTo = (to: number) => setPicked({ key: turnKey, to });

  const send = (action: PokerAction) => {
    if (!view) return;
    if (link.host && game.current) {
      const next = act(game.current, 0, action);
      if (next !== game.current) publish(next);
    } else link.send({ kind: 'act', hand: view.hand, action });
  };

  const result = view?.over ? (view.stacks[me] > 0 ? 'won' : 'lost') : null;
  useEffect(() => { if (result === 'won') playWin(); }, [result]);
  const name = link.peer.name;
  const pot = view ? view.pot + view.bets[0] + view.bets[1] : 0;
  const myCards = view?.holes[me] ?? [];
  const mine = myCards.length === 2 && view && view.board.length >= 3 ? bestHand([...myCards, ...view.board]).name : null;
  const lastText = (seat: Seat) => {
    const last = view?.last;
    if (!last || last.seat !== seat || view?.result) return null;
    return intl.formatMessage({ id: `world.poker.${last.action}` }, { n: last.amount });
  };

  return (
    <MatchWindow
      link={link} icon="cards" title={<FormattedMessage id="world.pokerTitle" />} onClose={onClose}
      turn={!view || view.result ? null : view.toAct === me ? 'me' : 'them'}
      mine={view && <FormattedMessage id="world.pokerStack" values={{ n: view.stacks[me] }} />}
      theirs={view && <FormattedMessage id="world.pokerStack" values={{ n: view.stacks[them] }} />}
      started={!!start && !!view} left={left} result={result}
    >
      {view && (
        <div className="px-notch p-3 mb-3 bg-[radial-gradient(ellipse_at_center,#2f6b45,#1d4630)] border-2 border-[#0f2a1c]">
          {/* Their side: cards face down until a showdown, their bet. */}
          <div className="flex items-center justify-center gap-2 mb-1">
            {[0, 1].map((i) => <PlayingCard key={i} card={view.holes[them][i]} faded={!!view.result && !view.result.winners.includes(them)} />)}
          </div>
          <div className="flex items-center justify-center gap-2 min-h-[1.5rem] text-[12px] text-white/80">
            <Chips n={view.bets[them]} />{lastText(them)}
            {view.dealer === them && <span className="px-title !text-[10px] bg-white text-black px-1">D</span>}
          </div>

          {/* The board and the pot. */}
          <div className="flex items-center justify-center gap-1.5 my-2">
            {Array.from({ length: 5 }, (_, i) => view.board[i]
              ? <PlayingCard key={i} card={view.board[i]} />
              : <span key={i} className="w-11 h-[3.75rem] sm:w-12 sm:h-16 border-2 border-dashed border-white/20" />)}
          </div>
          <p className="text-center text-[13px] text-white/90 mb-1"><FormattedMessage id="world.pokerPot" values={{ n: pot }} /></p>

          {/* Your side. */}
          <div className="flex items-center justify-center gap-2 min-h-[1.5rem] text-[12px] text-white/80">
            <Chips n={view.bets[me]} />{lastText(me)}
            {view.dealer === me && <span className="px-title !text-[10px] bg-white text-black px-1">D</span>}
          </div>
          <div className="flex items-center justify-center gap-2 mt-1">
            {[0, 1].map((i) => <PlayingCard key={i} card={myCards[i]} faded={!!view.result && !view.result.winners.includes(me)} />)}
          </div>
          {mine && <p className="text-center text-[12px] text-[var(--px-gold)] mt-1.5"><FormattedMessage id="world.pokerYouHave" values={{ hand: mine }} /></p>}
        </div>
      )}

      {/* How the hand went, until the next one is dealt. */}
      {view?.result && !view.over && (
        <p className="text-center text-[14px] mb-2">
          {view.result.winners.length === 2
            ? <FormattedMessage id="world.pokerSplit" values={{ n: view.result.amount }} />
            : <FormattedMessage
                id={view.result.winners[0] === me ? 'world.pokerYouWin' : 'world.pokerTheyWin'}
                values={{ name, n: view.result.amount, hand: view.result.names[view.result.winners[0]] ?? '' }}
              />}
          {view.result.showdown && view.result.winners.length === 1 && <> · <FormattedMessage id="world.pokerWith" values={{ hand: view.result.names[view.result.winners[0]] }} /></>}
          <span className="block text-[12px] text-[var(--px-muted)] mt-1"><FormattedMessage id="world.pokerNextHand" /></span>
        </p>
      )}

      {/* Your move. */}
      {view && !view.result && l && (view.toAct === me ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-1.5">
            <PixelButton tone="bad" onClick={() => send({ type: 'fold' })} className="!text-[14px] !px-2"><FormattedMessage id="world.pokerFold" /></PixelButton>
            {l.canCheck
              ? <PixelButton tone="paper" onClick={() => send({ type: 'check' })} className="!text-[14px] !px-2"><FormattedMessage id="world.pokerCheck" /></PixelButton>
              : <PixelButton tone="jade" onClick={() => send({ type: 'call' })} className="!text-[14px] !px-2"><FormattedMessage id="world.pokerCall" values={{ n: l.toCall }} /></PixelButton>}
          </div>
          {l.canRaise && (
            <div className="px-inset px-notch p-2">
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="range" min={l.minTo} max={l.maxTo} step={10} value={raiseTo}
                  onChange={(e) => setRaiseTo(Number(e.target.value))}
                  className="flex-1 accent-[var(--px-gold)]"
                  aria-label={intl.formatMessage({ id: 'world.pokerAmount' })}
                />
                <span className="px-num text-[14px] w-14 text-right">{raiseTo}</span>
              </div>
              <div className="grid grid-cols-4 gap-1 mb-2">
                {([['min', l.minTo], ['half', Math.floor(pot / 2) + view.bets[them]], ['pot', pot + view.bets[them]], ['allin', l.maxTo]] as const).map(([k, to]) => (
                  <PixelButton key={k} tone="paper" onClick={() => setRaiseTo(Math.min(Math.max(to, l.minTo), l.maxTo))} className="!px-1 !py-1 !text-[11px]">
                    <FormattedMessage id={`world.pokerSize.${k}`} />
                  </PixelButton>
                ))}
              </div>
              <PixelButton tone="gold" block onClick={() => send({ type: 'raise', to: raiseTo })} className="!text-[14px]">
                <FormattedMessage
                  id={view.bets[them] === 0 ? 'world.pokerBet' : 'world.pokerRaise'}
                  values={{ n: raiseTo }}
                />
              </PixelButton>
            </div>
          )}
        </div>
      ) : (
        <p className="text-center text-[14px] text-[var(--px-muted)]"><FormattedMessage id="world.pokerThinking" values={{ name }} /></p>
      ))}
      <p className="text-center text-[11px] text-[var(--px-muted)] mt-3"><FormattedMessage id="world.pokerPlayChips" /></p>
    </MatchWindow>
  );
}
