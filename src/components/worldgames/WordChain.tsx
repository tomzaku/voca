import { useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useMatch } from '../../hooks/useMatch';
import { playCorrect, playWin, playWrong } from '../../lib/sfx';
import { CHAIN_SECONDS, chainDictionary, initialChain, playChain, type ChainState } from '../../lib/wordChain';
import { WORD_LIST } from '../../lib/wordService';
import type { MatchLink } from '../../lib/worldLive';
import { MatchWindow, TurnBar } from './MatchWindow';
import { PixelButton, PixelIcon } from './pixel';

// Word Chain (nối từ) with another player: take turns to say a word starting
// with the last letter of the one before (lib/wordChain). The host goes
// first, from a word the host's side picks.
//
// The dictionary is public/game/words-en.txt — ~270k English words from the
// `word-list` package (scripts/build-chain-words.mjs) — fetched when the game
// opens, so it stays out of the world's first download. Should that fail, the
// bundled CEFR list (~8500 common words) stands in. Words that arrive before
// it has loaded are kept and played in order once it's in.

let dictionary: Promise<Set<string>> | null = null;
const loadDictionary = () => (dictionary ??= fetch(`${import.meta.env.BASE_URL}game/words-en.txt`)
  .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
  .then((text) => text.split('\n'))
  .catch(() => import('../../data/cefrWords').then(({ CEFR_WORDS }) => CEFR_WORDS.map((w) => w.word.toLowerCase())))
  .then((words) => chainDictionary([...words, ...WORD_LIST.map((w) => w.word.toLowerCase())])));

/** A starting word: common, ending in a letter that's easy to go on from. */
async function firstWord() {
  const dict = await loadDictionary();
  const easy = WORD_LIST.map((w) => w.word.toLowerCase()).filter((w) => dict.has(w) && w.length <= 7 && !/[xqzjy]$/.test(w));
  return easy[Math.floor(Math.random() * easy.length)] ?? 'apple';
}

export function WordChain({ link, onClose }: { link: MatchLink; onClose: () => void }) {
  const intl = useIntl();
  const me: 0 | 1 = link.host ? 0 : 1;
  const [dict, setDict] = useState<Set<string> | null>(null);
  const [game, setGameState] = useState<ChainState | null>(null);
  const [since, setSince] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [typed, setTyped] = useState('');
  // The game and dictionary as of now, for words arriving between renders,
  // and their words waiting for the dictionary to load.
  const gameRef = useRef<ChainState | null>(null);
  const dictRef = useRef<Set<string> | null>(null);
  const inbox = useRef<{ move: number; word: string | null }[]>([]);
  /** A new state — and when its turn began, if this is a new turn. */
  const setGame = (g: ChainState) => {
    if (g.moves !== gameRef.current?.moves || !gameRef.current) { setSince(Date.now()); setTyped(''); }
    gameRef.current = g;
    setGameState(g);
  };

  /** Play their words that are next, in order — once the dictionary's here. */
  const playInbox = () => {
    const d = dictRef.current;
    let s = gameRef.current;
    if (!d || !s) return;
    const start = s;
    for (const m of inbox.current) if (m.move === s.moves && s.turn !== me) s = playChain(s, m.word, d);
    inbox.current = inbox.current.filter((m) => m.move > s!.moves);
    if (s !== start) setGame(s);
  };
  const playInboxRef = useRef(playInbox);
  useEffect(() => { playInboxRef.current = playInbox; });

  useEffect(() => {
    void loadDictionary().then((d) => { dictRef.current = d; setDict(d); playInboxRef.current(); });
  }, []);

  const { start, left } = useMatch<string>(
    link,
    firstWord,
    (raw) => (typeof raw === 'string' && /^[a-z]{2,30}$/.test(raw) ? raw : null),
    (d) => {
      if (d.kind !== 'word' || !Number.isInteger(d.move)) return;
      inbox.current.push({ move: Number(d.move), word: typeof d.word === 'string' ? d.word.slice(0, 30) : null });
      playInbox();
    },
    (first) => { setGame(initialChain(first)); playInbox(); },
  );

  const myTurn = !!game && !!dict && game.loser === null && game.turn === me;

  const say = (word: string | null) => {
    if (!game || !dict || !myTurn) return;
    const next = playChain(game, word, dict);
    if (next.last?.verdict === 'ok') playCorrect(); else playWrong();
    link.send({ kind: 'word', move: game.moves, word });
    setGame(next);
  };

  // The clock: ticking while the game runs, the bar redrawn each tick. One
  // interval for the whole game — typing doesn't restart it.
  const running = !!game && game.loser === null;
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, [running]);
  // My turn runs out: nothing said in time.
  const sayRef = useRef(say);
  useEffect(() => { sayRef.current = say; });
  useEffect(() => {
    if (!myTurn) return;
    const t = setTimeout(() => sayRef.current(null), Math.max(0, CHAIN_SECONDS * 1000 - (Date.now() - since)));
    return () => clearTimeout(t);
  }, [myTurn, since]);

  const result = game?.loser != null ? (game.loser === me ? 'lost' : 'won') : null;
  useEffect(() => { if (result === 'won') playWin(); }, [result]);
  const hearts = (n: number) => (
    <span className="inline-flex gap-0.5 text-[var(--px-bad)]">
      {Array.from({ length: 3 }, (_, i) => <PixelIcon key={i} name={i < n ? 'heart' : 'heartEmpty'} size={2} />)}
    </span>
  );
  const name = link.peer.name;
  const last = game?.last;

  return (
    <MatchWindow
      link={link} icon="link" title={<FormattedMessage id="world.chainTitle" />} onClose={onClose}
      turn={result || !game ? null : myTurn ? 'me' : 'them'}
      mine={game && hearts(game.lives[me])} theirs={game && hearts(game.lives[me === 0 ? 1 : 0])}
      started={!!start && !!game && !!dict} left={left} result={result}
    >
      {game && (
        <>
          {/* The chain so far, newest last. */}
          <div className="px-inset px-notch p-2 mb-3 flex flex-wrap gap-1.5 items-center min-h-[3rem]">
            {game.words.slice(-10).map((w, i, arr) => (
              <span key={`${game.words.length - arr.length + i}`} className={`px-2 py-0.5 text-[14px] ${i === arr.length - 1 ? 'bg-[var(--px-gold)]/25 outline outline-2 outline-[var(--px-gold)]' : 'bg-black/20'}`}>
                {w.slice(0, -1)}<b className="text-[var(--px-gold)]">{w.slice(-1)}</b>
              </span>
            ))}
          </div>

          {last && last.verdict !== 'ok' && (
            <p className="text-[13px] text-[var(--px-bad)] mb-2">
              <FormattedMessage id={`world.chain.${last.verdict}`} values={{ name: last.player === me ? intl.formatMessage({ id: 'world.duelYou' }) : name, word: last.word ?? '', letter: game.letter.toUpperCase() }} />
            </p>
          )}

          {game.loser === null && (
            <>
              <TurnBar since={since} seconds={CHAIN_SECONDS} now={now} />
              <p className="text-[14px] mb-2">
                <FormattedMessage id={myTurn ? 'world.chainYourTurn' : 'world.chainTheirTurn'} values={{ name }} />{' '}
                <span className="px-title !text-[22px] text-[var(--px-gold)] align-middle">{game.letter.toUpperCase()}</span>
              </p>
              {myTurn && (
                <form className="flex gap-1.5" onSubmit={(e) => { e.preventDefault(); if (typed.trim()) say(typed); }}>
                  <input
                    autoFocus
                    value={typed}
                    maxLength={30}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    onChange={(e) => setTyped(e.target.value)}
                    placeholder={intl.formatMessage({ id: 'world.chainPlaceholder' }, { letter: game.letter.toUpperCase() })}
                    className="px-inset px-notch flex-1 min-w-0 px-3 py-2 text-[16px] bg-transparent outline-none"
                  />
                  <PixelButton tone="jade" type="submit" className="!px-4 !py-0 !text-[14px]"><FormattedMessage id="world.liveSend" /></PixelButton>
                </form>
              )}
            </>
          )}
        </>
      )}
    </MatchWindow>
  );
}
