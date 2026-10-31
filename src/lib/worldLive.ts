import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { parseLook, type Look } from '../game/wardrobe';
import { REACTION_MS, isGift, isReaction, type Gift, type Reaction } from '../game/reactions';

// The shared world: everyone in Huế at once, over a Supabase Realtime channel
// — no tables. Presence says who's here (their name and how they're
// dressed); broadcasts carry where they walk, reactions, chat and invites to play
// together. Positions are the world's own pixels (every client draws the map
// at the same scale), sent a few times a second while moving.
//
// Safety, since the world is open to everyone: chat is short and filtered
// before it's sent and again when it arrives; anyone can be blocked (they
// vanish for you, and you for them in practice — you ignore all they send),
// and the block list is kept on this device.

export type Facing = 'left' | 'right' | 'up' | 'down';
export interface Peer { id: string; name: string; look: Look; x: number; y: number; facing: Facing; moving: boolean }

export type LiveMessage =
  | { kind: 'wave'; from: string; to?: string }
  /** A gesture for everyone around (../game/reactions). */
  | { kind: 'react'; from: string; reaction: Reaction }
  /** A gift for one player, seen by everyone around. */
  | { kind: 'gift'; from: string; to: string; gift: Gift }
  | { kind: 'chat'; from: string; text: string }
  | { kind: 'invite'; from: string; to: string; game: string; id: string }
  | { kind: 'reply'; from: string; to: string; id: string; ok: boolean }
  | { kind: 'play'; from: string; to: string; id: string; data: Record<string, unknown> };

/** What two players can do together: the games, and talking (a voice call). */
export type MatchGame = 'duel' | 'race' | 'talk' | 'caro' | 'caro7' | 'chain' | 'oan' | 'poker' | 'chess' | 'memory' | 'tienlen';
export const MATCH_GAMES: MatchGame[] = ['duel', 'race', 'talk', 'caro', 'caro7', 'chain', 'oan', 'poker', 'chess', 'memory', 'tienlen'];

/** Two players in a game: its id, which game, whether I asked (the host
 *  sets the game up), and who's on the other side. */
export interface Match { id: string; game: MatchGame; host: boolean; peer: { id: string; name: string; look: Look } }

/** A game's line to the other player: `play` messages for this match only. */
export interface MatchLink extends Match {
  send: (data: Record<string, unknown>) => void;
  listen: (cb: (data: Record<string, unknown>) => void) => () => void;
}

/** A message as sent: the connection adds who it's from. */
export type Outgoing = LiveMessage extends infer M ? (M extends LiveMessage ? Omit<M, 'from'> : never) : never;

const CHANNEL = 'world:hue';
const BLOCKED = 'voca-world-blocked';
const MAX_CHAT = 120;

/** Words chat won't carry (English and Vietnamese); matched as whole words. */
const BAD = ['fuck', 'shit', 'bitch', 'cunt', 'dick', 'pussy', 'nigger', 'faggot', 'whore', 'slut', 'đụ', 'địt', 'lồn', 'cặc', 'buồi', 'đéo', 'đĩ', 'chó đẻ', 'vãi lồn'];

/** Chat as it may be shown: trimmed, short, bad words starred out. */
export function cleanChat(text: string): string {
  let t = text.replace(/\s+/g, ' ').trim().slice(0, MAX_CHAT);
  for (const w of BAD) t = t.replace(new RegExp(`(^|[^\\p{L}])(${w})(?=$|[^\\p{L}])`, 'giu'), (_, pre, word: string) => pre + '*'.repeat(word.length));
  return t;
}

export function loadBlocked(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(BLOCKED) ?? '[]') as string[]); } catch { return new Set(); }
}
function saveBlocked(b: Set<string>) {
  try { localStorage.setItem(BLOCKED, JSON.stringify([...b])); } catch { /* ignore */ }
}

interface Handlers {
  /** Someone arrived, moved, changed clothes or left (null). */
  peer: (id: string, peer: Peer | null) => void;
  message: (m: LiveMessage) => void;
}

/** One connection to the shared world. */
export class WorldLive {
  private channel: RealtimeChannel | null = null;
  private closed = false;
  private peers = new Map<string, Peer>();
  private early = new Map<string, { x: number; y: number; facing: Facing }>();
  private last = { x: 0, y: 0, facing: 'down' as Facing, moving: false, at: 0 };
  /** When each peer last reacted, to drop a flood. */
  private reacted = new Map<string, number>();
  blocked = loadBlocked();

  constructor(private me: { id: string; name: string; look: Look }, private on: Handlers) {}

  /** Join, once any earlier connection's channel is gone: the client hands
   *  back an existing channel of the same name, and one still being removed
   *  would be torn down under us, leaving us in no channel at all. */
  async connect() {
    if (!supabase || this.channel) return;
    const topic = `realtime:${CHANNEL}`;
    for (const old of supabase.getChannels().filter((c) => c.topic === topic)) await supabase.removeChannel(old);
    if (this.closed || this.channel) return;
    const ch = supabase.channel(CHANNEL, { config: { presence: { key: this.me.id }, broadcast: { self: false } } });
    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState<{ name: string; look: unknown }>();
      const here = new Set(Object.keys(state));
      let arrived = false;
      for (const [id, metas] of Object.entries(state)) {
        if (id === this.me.id || this.blocked.has(id)) continue;
        const meta = metas[metas.length - 1];
        const prev = this.peers.get(id);
        if (!prev) arrived = true;
        // A position that came before they were announced, kept for now.
        const early = this.early.get(id);
        const peer: Peer = {
          id, name: String(meta.name ?? '').slice(0, 24) || 'Buddy', look: parseLook(meta.look),
          x: prev?.x ?? early?.x ?? -9999, y: prev?.y ?? early?.y ?? -9999,
          facing: prev?.facing ?? early?.facing ?? 'down', moving: prev?.moving ?? false,
        };
        this.early.delete(id);
        this.peers.set(id, peer);
        if (peer.x > -9999) this.on.peer(id, peer);
      }
      for (const id of [...this.peers.keys()]) if (!here.has(id)) { this.peers.delete(id); this.reacted.delete(id); this.on.peer(id, null); }
      // Someone new: tell them where I am now, not at the next heartbeat.
      if (arrived) this.sendPos(true);
    });
    ch.on('broadcast', { event: 'pos' }, ({ payload }) => {
      const p = payload as { id: string; x: number; y: number; facing: Facing; moving: boolean };
      if (typeof p?.id !== 'string' || this.blocked.has(p.id) || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
      const peer = this.peers.get(p.id);
      // Broadcasts can beat presence: keep where they are until they're announced.
      if (!peer) {
        if (this.early.size < 200) this.early.set(p.id, { x: p.x, y: p.y, facing: p.facing });
        return;
      }
      Object.assign(peer, { x: p.x, y: p.y, facing: p.facing, moving: !!p.moving });
      this.on.peer(p.id, peer);
    });
    ch.on('broadcast', { event: 'msg' }, ({ payload }) => {
      const m = payload as LiveMessage;
      if (!m || this.blocked.has(m.from) || !this.peers.has(m.from)) return;
      if ('to' in m && m.to && m.to !== this.me.id && m.kind !== 'wave' && m.kind !== 'gift') return;
      if (m.kind === 'chat') this.on.message({ ...m, text: cleanChat(String(m.text ?? '')) });
      else if (m.kind === 'wave') this.on.message(m);
      else if (m.kind === 'react' || m.kind === 'gift') {
        const now = Date.now();
        const ok = m.kind === 'react' ? isReaction(m.reaction) : isGift(m.gift) && typeof m.to === 'string';
        if (!ok || now - (this.reacted.get(m.from) ?? 0) < REACTION_MS * 0.8) return;
        this.reacted.set(m.from, now);
        this.on.message(m);
      }
      // Games: only ones we know, with an id that's a plain short string.
      else if (typeof m.id !== 'string' || m.id.length > 40) return;
      else if (m.kind === 'invite') { if (MATCH_GAMES.includes(m.game as MatchGame)) this.on.message(m); }
      else if (m.kind === 'reply') this.on.message({ ...m, ok: m.ok === true });
      else if (m.kind === 'play' && m.data && typeof m.data === 'object') this.on.message(m);
    });
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        ch.track({ name: this.me.name, look: this.me.look });
        this.sendPos(true);
      }
    });
    this.channel = ch;
  }

  disconnect() {
    this.closed = true;
    if (this.channel && supabase) supabase.removeChannel(this.channel);
    this.channel = null;
    for (const id of this.peers.keys()) this.on.peer(id, null);
    this.peers.clear();
  }

  /** Dressed differently, or renamed. */
  updateMe(me: { name: string; look: Look }) {
    this.me = { ...this.me, ...me };
    this.channel?.track({ name: this.me.name, look: this.me.look });
  }

  /** Where I am: sent when it's changed, at most a few times a second, and
   *  now and then while standing so newcomers see me. */
  move(x: number, y: number, facing: Facing, moving: boolean) {
    // Starting or stopping goes out at once, so others stop where I stopped
    // (turns wait for the next update: Realtime allows ten messages a second).
    const changed = moving !== this.last.moving;
    Object.assign(this.last, { x, y, facing, moving });
    this.sendPos(changed);
  }

  private sendPos(force: boolean) {
    const now = Date.now(), l = this.last;
    // Idle: a little under the heartbeat's own interval, or every other beat
    // would be skipped.
    if (!this.channel || (!force && now - l.at < (l.moving ? 150 : 2000))) return;
    l.at = now;
    this.channel.send({ type: 'broadcast', event: 'pos', payload: { id: this.me.id, x: Math.round(l.x), y: Math.round(l.y), facing: l.facing, moving: l.moving } });
  }

  /** Keep me visible to newcomers while I stand still. */
  heartbeat() { this.sendPos(false); }

  send(m: Outgoing) {
    if (!this.channel) return;
    const payload = { ...m, from: this.me.id } as LiveMessage;
    if (payload.kind === 'chat') {
      const text = cleanChat(payload.text);
      if (!text) return;
      payload.text = text;
    }
    this.channel.send({ type: 'broadcast', event: 'msg', payload });
  }

  block(id: string) {
    this.blocked.add(id);
    saveBlocked(this.blocked);
    this.peers.delete(id);
    this.on.peer(id, null);
  }

  unblockAll() { this.blocked.clear(); saveBlocked(this.blocked); }

  peer(id: string) { return this.peers.get(id); }
  count() { return this.peers.size; }
}

/** Games' lines through the connection: who's listening for the game being
 *  played, and the connection to send on while there is one. */
export class MatchBus {
  private listeners = new Set<(d: Record<string, unknown>) => void>();
  private live: WorldLive | null = null;

  plug(live: WorldLive | null) { this.live = live; }

  link(match: Match): MatchLink {
    return {
      ...match,
      send: (data) => this.live?.send({ kind: 'play', to: match.peer.id, id: match.id, data }),
      listen: (cb) => { this.listeners.add(cb); return () => { this.listeners.delete(cb); }; },
    };
  }

  deliver(d: Record<string, unknown>) { this.listeners.forEach((cb) => cb(d)); }
}
