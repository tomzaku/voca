import { useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { dialogues, type Dialogue } from '../../data/englishDialogues';
import { useCompanion } from '../../hooks/useCompanion';
import { useMatch } from '../../hooks/useMatch';
import { DEFAULT_LOOK } from '../../game/wardrobe';
import { VoiceCall, isSignal, type CallState, type Signal } from '../../lib/voiceCall';
import { FATAL_ERRORS, joinResults, liveRecognition, type LiveRecognition } from '../../lib/liveSpeech';
import type { MatchLink } from '../../lib/worldLive';
import { LookSprite } from './LookSprite';
import { PixelButton, PixelIcon, PixelLoader } from './pixel';

// Talking with another player in Huế: a voice call between the two of you
// (lib/voiceCall), and a sample dialogue to follow if you'd like something
// to say — the host reads one part, the guest the other, and whoever's line
// it is moves it on. Either of you can pick another, or just talk.
// While connected, what each of you says is captioned on both screens
// (the browser's speech recognition, where it has one), so a word missed on
// a bad line can still be read.

type Script = { id: string; at: number };

const EASY = dialogues.filter((d) => d.level === 'Easy');
const pick = (not?: string) => {
  const pool = EASY.length > 1 ? EASY.filter((d) => d.id !== not) : dialogues;
  return pool[Math.floor(Math.random() * pool.length)].id;
};
const byId = (id: unknown): Dialogue | undefined => dialogues.find((d) => d.id === id);
/** Longest caption sent: recognition sessions can run on for a while. */
const CAPTION_MAX = 280;
const clip = (t: string) => (t.length > CAPTION_MAX ? '…' + t.slice(-CAPTION_MAX) : t);

/** Live captions of your own voice while `on`, each one also handed to
 *  `share`. Recognition sessions end on their own after a pause, so a new one
 *  starts while still wanted; a fatal error (no permission, no support) stops
 *  trying. Interim words are sent at most every 400ms — the link is a
 *  broadcast channel, not a data channel. */
function useCaptions(on: boolean, share: (text: string) => void) {
  const [mine, setMine] = useState('');
  const shareRef = useRef(share);
  shareRef.current = share;
  const supported = liveRecognition() !== null;

  useEffect(() => {
    const Rec = liveRecognition();
    if (!on || !Rec) return;
    let alive = true, rec: LiveRecognition | null = null, lastSent = 0, pending = '';
    let timer: ReturnType<typeof setTimeout> | undefined;
    const flush = () => { timer = undefined; lastSent = Date.now(); shareRef.current(pending); };
    const send = (text: string, final: boolean) => {
      pending = text;
      if (final || Date.now() - lastSent > 400) { clearTimeout(timer); flush(); }
      else if (!timer) timer = setTimeout(flush, 400 - (Date.now() - lastSent));
    };
    const begin = () => {
      if (!alive) return;
      rec = new Rec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';
      rec.onresult = (e) => {
        const text = clip(joinResults(e.results));
        const last = e.results[e.results.length - 1];
        setMine(text);
        send(text, !!last?.isFinal);
      };
      rec.onerror = (e) => { if (FATAL_ERRORS.has(e.error)) alive = false; };
      rec.onend = () => { if (alive) setTimeout(begin, 250); };
      try { rec.start(); } catch { alive = false; }
    };
    begin();
    return () => { alive = false; clearTimeout(timer); rec?.abort(); };
  }, [on]);

  return { mine, supported };
}

const parseStart = (raw: unknown): Script | null => {
  const r = raw as { id?: unknown } | null;
  return r && byId(r.id) ? { id: String(r.id), at: 0 } : null;
};

export function TalkCall({ link, onClose }: { link: MatchLink; onClose: () => void }) {
  const look = useCompanion((s) => s.dress) ?? DEFAULT_LOOK;
  const [state, setState] = useState<CallState>('mic');
  const [muted, setMuted] = useState(false);
  const [script, setScript] = useState<Script | null>(null);
  const callRef = useRef<VoiceCall | null>(null);
  /** A description that came before the call was set up, handed to it then. */
  const early = useRef<Signal | null>(null);
  const [peerNoMic, setPeerNoMic] = useState(false);
  const [theirs, setTheirs] = useState('');
  const [captionsOn, setCaptionsOn] = useState(true);

  const { start, left } = useMatch<Script>(
    link,
    async () => ({ id: pick(), at: 0 }),
    parseStart,
    (d) => {
      if (isSignal(d)) { if (callRef.current) void callRef.current.receive(d); else early.current = d; }
      else if (d.kind === 'nomic') setPeerNoMic(true);
      else if (d.kind === 'said' && typeof d.text === 'string') setTheirs(clip(d.text));
      else if (d.kind === 'script' && byId(d.id) && Number.isInteger(d.at)) setScript({ id: String(d.id), at: Number(d.at) });
    },
    (s) => setScript(s),
  );

  // The call starts once the match has: both sides are listening by then.
  useEffect(() => {
    if (!start) return;
    const call = new VoiceCall(link.host, (s) => link.send(s), (st) => {
      setState(st);
      if (st === 'micDenied') link.send({ kind: 'nomic' });
    });
    callRef.current = call;
    if (early.current) { void call.receive(early.current); early.current = null; }
    void call.start();
    return () => { call.close(); callRef.current = null; };
  }, [start, link]);
  useEffect(() => { if (left) callRef.current?.close(); }, [left]);

  const dialogue = script ? byId(script.id) : undefined;
  const mine: 'a' | 'b' = link.host ? 'a' : 'b';
  const name = link.peer.name;
  const share = (s: Script) => { setScript(s); link.send({ kind: 'script', id: s.id, at: s.at }); };
  const line = dialogue && script && script.at < dialogue.lines.length ? dialogue.lines[script.at] : null;
  const myTurn = line?.speaker === mine;

  // Keep the line being read in view.
  const listRef = useRef<HTMLOListElement>(null);
  useEffect(() => { listRef.current?.querySelector('[data-now="true"]')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [script?.at, script?.id]);

  const listening = captionsOn && !muted && !left && state === 'connected';
  const { mine: said, supported: canCaption } = useCaptions(listening, (text) => link.send({ kind: 'said', text }));

  const toggleMute = () => { const m = !muted; setMuted(m); callRef.current?.setMuted(m); };

  return (
    <div className="px absolute inset-0 z-40 flex items-end sm:items-center justify-center p-3 bg-black/25" onKeyDown={(e) => e.stopPropagation()}>
      <div className="px-notch px-frame w-full max-w-[560px] p-4 px-in-up max-h-[92%] flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-3">
          <p className="px-title !text-[18px] text-[var(--px-gold)] flex items-center gap-2"><PixelIcon name="mic" size={2} /> <FormattedMessage id="world.talkTitle" values={{ name }} /></p>
          <button onClick={onClose} className="px-title !text-[12px] text-[var(--px-muted)] hover:text-[var(--px-text)] mt-1">
            <FormattedMessage id="world.talkHangUp" />
          </button>
        </div>

        {/* The two of you, the call's state, and the mic. */}
        <div className="px-inset px-notch p-2 mb-3 flex items-center gap-3">
          <LookSprite look={look} scale={2} />
          <LookSprite look={link.peer.look} scale={2} />
          <p className="flex-1 min-w-0 text-[13px] leading-snug" style={{ color: state === 'connected' ? 'var(--px-jade)' : state === 'failed' || state === 'micDenied' ? 'var(--px-bad)' : 'var(--px-muted)' }}>
            {left ? <FormattedMessage id="world.duelLeft" values={{ name }} /> : !start ? <FormattedMessage id="world.duelWaiting" values={{ name }} /> : peerNoMic && state !== 'connected' ? <FormattedMessage id="world.talk.peerNoMic" values={{ name }} /> : <FormattedMessage id={`world.talk.${state}`} values={{ name }} />}
          </p>
          <PixelButton tone={muted ? 'bad' : 'paper'} onClick={toggleMute} disabled={state !== 'connected' && state !== 'connecting'} className="!px-3 !py-0 !h-[2.4rem] !text-[13px] shrink-0">
            <PixelIcon name="mic" size={2} /> <FormattedMessage id={muted ? 'world.talkUnmute' : 'world.talkMute'} />
          </PixelButton>
        </div>

        {/* Live captions: the last thing each of you said, as text. */}
        {start && !left && (state === 'connected' || said || theirs) && (
          <div className="px-inset px-notch p-2 mb-3 space-y-1 text-[14px] leading-snug">
            <p className="flex items-baseline gap-1.5 min-w-0">
              <span className="px-title !text-[11px] shrink-0 text-[var(--px-sky)]">{name}</span>
              <span className={`min-w-0 break-words ${theirs ? '' : 'text-[var(--px-muted)] italic'}`}>{theirs || '…'}</span>
            </p>
            <p className="flex items-baseline gap-1.5 min-w-0">
              <span className="px-title !text-[11px] shrink-0 text-[var(--px-gold)]"><FormattedMessage id="world.duelYou" /></span>
              <span className={`min-w-0 flex-1 break-words ${said && listening ? '' : 'text-[var(--px-muted)] italic'}`}>
                {!canCaption ? <FormattedMessage id="world.talkCaptionsUnsupported" /> : said || (listening ? '…' : <FormattedMessage id="world.talkCaptionsOff" />)}
              </span>
              {canCaption && (
                <button onClick={() => setCaptionsOn((c) => !c)} className="px-title !text-[11px] shrink-0 text-[var(--px-muted)] hover:text-[var(--px-text)]">
                  <FormattedMessage id={captionsOn ? 'world.talkCaptionsHide' : 'world.talkCaptionsShow'} />
                </button>
              )}
            </p>
          </div>
        )}

        {!start && !left && <PixelLoader label={<FormattedMessage id="world.duelWaiting" values={{ name }} />} />}

        {/* The sample dialogue: your lines lit, the one being read marked. */}
        {dialogue && script && !left && (
          <>
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <p className="px-title !text-[14px] truncate">{dialogue.title}</p>
              <p className="text-[12px] text-[var(--px-muted)] shrink-0">
                <FormattedMessage id="world.talkYouAre" values={{ role: dialogue.speakers[mine] }} />
              </p>
            </div>
            <p className="text-[12px] text-[var(--px-muted)] mb-2 leading-snug">{dialogue.situation}</p>
            <ol ref={listRef} className="px-inset px-notch p-2 space-y-1.5 overflow-y-auto min-h-0 flex-1 mb-3">
              {dialogue.lines.map((l, i) => {
                const now = i === script.at, done = i < script.at, me = l.speaker === mine;
                return (
                  <li key={i} data-now={now} className={`text-[14px] leading-snug px-2 py-1 ${now ? 'bg-[var(--px-gold)]/20 outline outline-2 outline-[var(--px-gold)]' : ''} ${done ? 'opacity-45' : ''}`}>
                    <span className="px-title !text-[11px] mr-1.5" style={{ color: me ? 'var(--px-gold)' : 'var(--px-sky)' }}>
                      {me ? <FormattedMessage id="world.duelYou" /> : name} · {dialogue.speakers[l.speaker]}
                    </span>
                    {l.text}
                  </li>
                );
              })}
            </ol>
            <div className="grid grid-cols-2 gap-1.5">
              {line ? (
                <PixelButton tone={myTurn ? 'jade' : 'paper'} disabled={!myTurn} onClick={() => share({ ...script, at: script.at + 1 })} className="!text-[13px] !px-2">
                  <FormattedMessage id={myTurn ? 'world.talkSaidIt' : 'world.talkTheirTurn'} values={{ name }} />
                </PixelButton>
              ) : (
                <PixelButton tone="jade" onClick={() => share({ ...script, at: 0 })} className="!text-[13px] !px-2">
                  <PixelIcon name="retry" size={2} /> <FormattedMessage id="world.talkAgain" />
                </PixelButton>
              )}
              <PixelButton tone="paper" onClick={() => share({ id: pick(script.id), at: 0 })} className="!text-[13px] !px-2">
                <FormattedMessage id="world.talkAnother" />
              </PixelButton>
            </div>
          </>
        )}

        {left && <PixelButton tone="jade" block onClick={onClose}><FormattedMessage id="world.duelDone" /></PixelButton>}
      </div>
    </div>
  );
}
