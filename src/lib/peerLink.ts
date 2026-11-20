import type { MatchLink } from './worldLive';

// A direct line between the two players of a match, for the action games —
// WebRTC data channels straight between the two browsers, with the match's
// Realtime link as the way to set them up and the fallback when they can't
// connect (the same shape as the midi-keyboard jam).
//
// Two channels, agreed in advance on both ends (negotiated ids, so neither
// waits on the other to announce one):
//   fast  unordered and never resent — a player's position. A late position
//         is worse than a lost one, and one lost packet mustn't hold up the
//         ones behind it.
//   sure  ordered and reliable — events that must land once: a coin taken,
//         an enemy stomped.
//
// The host offers, the guest answers. The guest says hello every moment until
// the channels open, and the host re-offers on a hello if its last offer has
// gone unanswered for a while — a Realtime message can be dropped, and the
// guest may still be opening the game when the first offer goes out.
//
// Direct only. These games share a world many times a second, and over the
// match link (Realtime, ~10 messages a second, bunched) the guest played a
// fifth of a second behind — worse than not playing. So data moves only on
// the direct line: a game pauses while `state` isn't 'direct', and 'failed'
// says plainly that these two networks can't reach each other (it keeps
// trying regardless — a phone moving onto Wi-Fi may well get through).
// The match link still carries the setup itself. A TURN server
// (VITE_TURN_URL) is what gets the stubborn networks through.

export type PeerState = 'connecting' | 'direct' | 'failed';
export type PeerData = Record<string, unknown>;

const GATHER_MS = 1500;
const HELLO_MS = 1000;
/** A hello this long after an offer means it was lost: offer again. */
const REOFFER_MS = 3000;
/** Past this without a direct line, say so (the setup keeps trying). */
const DIRECT_WAIT_MS = 12000;

type Signal = { kind: 'p2p'; type: 'offer' | 'answer'; sdp: string } | { kind: 'p2pHello' };

function iceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }];
  const env = import.meta.env;
  if (env.VITE_TURN_URL) {
    servers.push({ urls: String(env.VITE_TURN_URL).split(','), username: env.VITE_TURN_USERNAME, credential: env.VITE_TURN_CREDENTIAL });
  }
  return servers;
}

/** Resolves once the connection knows its addresses — or enough of them — so one message holds the whole description. */
const gathered = (pc: RTCPeerConnection) =>
  new Promise<void>((done) => {
    if (pc.iceGatheringState === 'complete') return done();
    const t = window.setTimeout(finish, GATHER_MS);
    function finish() { window.clearTimeout(t); pc.removeEventListener('icegatheringstatechange', check); done(); }
    function check() { if (pc.iceGatheringState === 'complete') finish(); }
    pc.addEventListener('icegatheringstatechange', check);
  });

export class PeerLink {
  state: PeerState = 'connecting';
  private pc: RTCPeerConnection | null = null;
  private fast: RTCDataChannel | null = null;
  private sure: RTCDataChannel | null = null;
  private offeredAt = 0;
  private hello = 0;
  private waitTimer = 0;
  private closed = false;
  private offLink: () => void;
  private listeners = new Set<(d: PeerData) => void>();
  private stateListeners = new Set<(s: PeerState) => void>();

  constructor(private link: MatchLink) {
    this.offLink = link.listen((d) => this.fromLink(d));
    if (typeof RTCPeerConnection === 'undefined') { this.state = 'failed'; return; }
    this.reconnect();
  }

  /** (Re)start the setup: the guest's hellos, and a deadline for saying it's not working. */
  private reconnect() {
    window.clearInterval(this.hello);
    window.clearTimeout(this.waitTimer);
    if (!this.link.host) {
      const say = () => { if (this.state !== 'direct') this.link.send({ kind: 'p2pHello' } satisfies Signal); };
      say();
      this.hello = window.setInterval(say, HELLO_MS);
    }
    this.waitTimer = window.setTimeout(() => { if (this.state === 'connecting') this.set('failed'); }, DIRECT_WAIT_MS);
  }

  /** Whether messages go straight to the other browser. */
  get direct() { return this.state === 'direct'; }

  /** Everything the other side sends, whichever way it came. */
  listen(cb: (d: PeerData) => void) {
    this.listeners.add(cb);
    return () => void this.listeners.delete(cb);
  }

  onState(cb: (s: PeerState) => void) {
    this.stateListeners.add(cb);
    return () => void this.stateListeners.delete(cb);
  }

  /** May be lost or overtaken — for state that the next message replaces. Dropped without a direct line. */
  sendFast(d: PeerData) {
    if (this.fast?.readyState === 'open') this.fast.send(JSON.stringify(d));
  }

  /** Arrives once, in order — while the direct line is up. */
  sendSure(d: PeerData) {
    if (this.sure?.readyState === 'open') this.sure.send(JSON.stringify(d));
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    window.clearInterval(this.hello);
    window.clearTimeout(this.waitTimer);
    this.offLink();
    this.drop();
    this.listeners.clear();
    this.stateListeners.clear();
  }

  private set(s: PeerState) {
    if (this.state === s) return;
    this.state = s;
    for (const cb of this.stateListeners) cb(s);
  }

  private emit(d: unknown) {
    if (!d || typeof d !== 'object' || Array.isArray(d)) return;
    for (const cb of this.listeners) cb(d as PeerData);
  }

  private drop() {
    this.pc?.close();
    this.pc = null;
    this.fast = null;
    this.sure = null;
  }

  /** The direct line went down mid-game: the game pauses while we set up a new one. */
  private lost(pc: RTCPeerConnection) {
    if (this.closed || this.pc !== pc || this.state !== 'direct') return;
    this.drop();
    this.set('connecting');
    this.reconnect();
  }

  /** A fresh connection with both channels on their agreed ids. */
  private connect(): RTCPeerConnection {
    this.drop();
    const pc = new RTCPeerConnection({ iceServers: iceServers() });
    const fast = pc.createDataChannel('fast', { negotiated: true, id: 0, ordered: false, maxRetransmits: 0 });
    const sure = pc.createDataChannel('sure', { negotiated: true, id: 1, ordered: true });
    const read = (e: MessageEvent) => {
      try { this.emit(JSON.parse(String(e.data))); } catch { /* not ours */ }
    };
    fast.onmessage = read;
    sure.onmessage = read;
    const opened = () => {
      if (this.pc !== pc || fast.readyState !== 'open' || sure.readyState !== 'open') return;
      window.clearInterval(this.hello);
      window.clearTimeout(this.waitTimer);
      this.set('direct');
    };
    fast.onopen = opened;
    sure.onopen = opened;
    fast.onclose = () => this.lost(pc);
    pc.onconnectionstatechange = () => {
      if (this.pc !== pc || pc.connectionState !== 'failed') return;
      if (this.state === 'direct') this.lost(pc); else this.drop();
    };
    this.pc = pc;
    this.fast = fast;
    this.sure = sure;
    return pc;
  }

  private async offer() {
    this.offeredAt = Date.now();
    try {
      const pc = this.connect();
      await pc.setLocalDescription(await pc.createOffer());
      await gathered(pc);
      if (this.pc === pc && pc.localDescription && !this.closed) {
        this.link.send({ kind: 'p2p', type: 'offer', sdp: pc.localDescription.sdp } satisfies Signal);
      }
    } catch {
      this.drop();
    }
  }

  private async answer(sdp: string) {
    try {
      const pc = this.connect();
      await pc.setRemoteDescription({ type: 'offer', sdp });
      await pc.setLocalDescription(await pc.createAnswer());
      await gathered(pc);
      if (this.pc === pc && pc.localDescription && !this.closed) {
        this.link.send({ kind: 'p2p', type: 'answer', sdp: pc.localDescription.sdp } satisfies Signal);
      }
    } catch {
      this.drop();
    }
  }

  private fromLink(d: Record<string, unknown>) {
    if (this.closed) return;
    if (typeof RTCPeerConnection === 'undefined' || this.state === 'direct') return;
    if (d.kind === 'p2pHello' && this.link.host) {
      if (Date.now() - this.offeredAt > REOFFER_MS) void this.offer();
    } else if (d.kind === 'p2p' && typeof d.sdp === 'string' && d.sdp.length < 20000) {
      if (d.type === 'offer' && !this.link.host) void this.answer(d.sdp);
      else if (d.type === 'answer' && this.link.host && this.pc?.signalingState === 'have-local-offer') {
        this.pc.setRemoteDescription({ type: 'answer', sdp: d.sdp }).catch(() => this.drop());
      }
    }
  }
}
