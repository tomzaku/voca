import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { parseLook, type Look } from '../game/wardrobe';

// The shared world: everyone in Huế at once, over a Supabase Realtime channel
// — no tables. Presence says who's here (their name and how they're
// dressed); broadcasts carry where they walk, waves, chat and invites to play
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
  | { kind: 'chat'; from: string; text: string }
  | { kind: 'invite'; from: string; to: string; game: string; id: string }
  | { kind: 'reply'; from: string; to: string; id: string; ok: boolean }
  | { kind: 'play'; from: string; to: string; id: string; data: Record<string, unknown> };

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
  private peers = new Map<string, Peer>();
  private last = { x: 0, y: 0, facing: 'down' as Facing, moving: false, at: 0 };
  blocked = loadBlocked();

  constructor(private me: { id: string; name: string; look: Look }, private on: Handlers) {}

  connect() {
    if (!supabase || this.channel) return;
    const ch = supabase.channel(CHANNEL, { config: { presence: { key: this.me.id }, broadcast: { self: false } } });
    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState<{ name: string; look: unknown }>();
      const here = new Set(Object.keys(state));
      for (const [id, metas] of Object.entries(state)) {
        if (id === this.me.id || this.blocked.has(id)) continue;
        const meta = metas[metas.length - 1];
        const prev = this.peers.get(id);
        const peer: Peer = {
          id, name: String(meta.name ?? '').slice(0, 24) || 'Buddy', look: parseLook(meta.look),
          x: prev?.x ?? -9999, y: prev?.y ?? -9999, facing: prev?.facing ?? 'down', moving: false,
        };
        this.peers.set(id, peer);
        if (peer.x > -9999) this.on.peer(id, peer);
      }
      for (const id of [...this.peers.keys()]) if (!here.has(id)) { this.peers.delete(id); this.on.peer(id, null); }
    });
    ch.on('broadcast', { event: 'pos' }, ({ payload }) => {
      const p = payload as { id: string; x: number; y: number; facing: Facing; moving: boolean };
      const peer = this.peers.get(p.id);
      if (!peer || this.blocked.has(p.id) || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
      Object.assign(peer, { x: p.x, y: p.y, facing: p.facing, moving: !!p.moving });
      this.on.peer(p.id, peer);
    });
    ch.on('broadcast', { event: 'msg' }, ({ payload }) => {
      const m = payload as LiveMessage;
      if (!m || this.blocked.has(m.from) || !this.peers.has(m.from)) return;
      if ('to' in m && m.to && m.to !== this.me.id && m.kind !== 'wave') return;
      if (m.kind === 'chat') this.on.message({ ...m, text: cleanChat(String(m.text ?? '')) });
      else this.on.message(m);
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
    Object.assign(this.last, { x, y, facing, moving });
    this.sendPos(false);
  }

  private sendPos(force: boolean) {
    const now = Date.now(), l = this.last;
    if (!this.channel || (!force && now - l.at < (l.moving ? 150 : 2500))) return;
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
