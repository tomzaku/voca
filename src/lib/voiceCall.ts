// A voice call between two players in the world, peer to peer (WebRTC). The
// world's own Realtime channel carries the handshake — no media server — and
// the audio goes straight between the two browsers.
//
// The host (who asked) offers, the guest answers. Each side waits for its
// network candidates to be gathered and sends its whole description in one
// message, rather than trickling a candidate per message: Realtime allows
// about ten messages a second, and a burst of candidates would be dropped.
//
// STUN finds a direct route for most connections. Some networks (strict
// wifi, some mobile carriers) need a TURN relay; set VITE_TURN_URL (with
// VITE_TURN_USERNAME / VITE_TURN_CREDENTIAL) to add one.

export type CallState = 'mic' | 'connecting' | 'connected' | 'failed' | 'micDenied' | 'ended';

/** What the call sends over the match: `{ kind: 'rtc', sdp }`. */
export type Signal = { kind: 'rtc'; type: 'offer' | 'answer'; sdp: string };

const GATHER_MS = 2500;

function iceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }];
  const env = import.meta.env;
  if (env.VITE_TURN_URL) {
    servers.push({ urls: String(env.VITE_TURN_URL).split(','), username: env.VITE_TURN_USERNAME, credential: env.VITE_TURN_CREDENTIAL });
  }
  return servers;
}

export const isSignal = (d: Record<string, unknown>): d is Signal =>
  d.kind === 'rtc' && (d.type === 'offer' || d.type === 'answer') && typeof d.sdp === 'string' && d.sdp.length < 20000;

export class VoiceCall {
  private pc: RTCPeerConnection | null = null;
  private mic: MediaStream | null = null;
  private audio = new Audio();
  /** An offer that came before the mic was ready. */
  private pending: Signal | null = null;
  private closed = false;
  state: CallState = 'mic';

  constructor(
    private host: boolean,
    private send: (s: Signal) => void,
    private onState: (s: CallState) => void,
  ) {
    this.audio.autoplay = true;
  }

  private set(s: CallState) {
    if (this.closed && s !== 'ended') return;
    this.state = s;
    this.onState(s);
  }

  /** Ask for the mic, then (host) make the offer or (guest) answer one already here. */
  async start() {
    try {
      this.mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch {
      this.set('micDenied');
      return;
    }
    if (this.closed) { this.stopMic(); return; }
    const pc = new RTCPeerConnection({ iceServers: iceServers() });
    this.pc = pc;
    for (const t of this.mic.getTracks()) pc.addTrack(t, this.mic);
    pc.ontrack = (e) => {
      this.audio.srcObject = e.streams[0] ?? new MediaStream([e.track]);
      void this.audio.play().catch(() => { /* autoplay blocked: the Unmute button retries */ });
    };
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === 'connected') this.set('connected');
      else if (s === 'failed') this.set('failed');
      else if (s === 'disconnected' && this.state === 'connected') this.set('connecting');
    };
    this.set('connecting');
    if (this.host) {
      await pc.setLocalDescription(await pc.createOffer());
      await this.gathered();
      if (pc.localDescription && !this.closed) this.send({ kind: 'rtc', type: 'offer', sdp: pc.localDescription.sdp });
    } else if (this.pending) {
      const p = this.pending;
      this.pending = null;
      await this.receive(p);
    }
  }

  /** The other side's description. */
  async receive(s: Signal) {
    const pc = this.pc;
    if (this.closed) return;
    if (!pc) { if (!this.host && s.type === 'offer') this.pending = s; return; }
    try {
      if (s.type === 'offer' && !this.host) {
        await pc.setRemoteDescription({ type: 'offer', sdp: s.sdp });
        await pc.setLocalDescription(await pc.createAnswer());
        await this.gathered();
        if (pc.localDescription && !this.closed) this.send({ kind: 'rtc', type: 'answer', sdp: pc.localDescription.sdp });
      } else if (s.type === 'answer' && this.host && pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription({ type: 'answer', sdp: s.sdp });
      }
    } catch {
      this.set('failed');
    }
  }

  /** Candidates gathered — or enough of them, after a moment. */
  private gathered() {
    const pc = this.pc;
    if (!pc || pc.iceGatheringState === 'complete') return Promise.resolve();
    return new Promise<void>((done) => {
      const t = window.setTimeout(finish, GATHER_MS);
      function finish() { window.clearTimeout(t); pc!.removeEventListener('icegatheringstatechange', check); done(); }
      function check() { if (pc!.iceGatheringState === 'complete') finish(); }
      pc.addEventListener('icegatheringstatechange', check);
    });
  }

  setMuted(muted: boolean) {
    for (const t of this.mic?.getAudioTracks() ?? []) t.enabled = !muted;
    // A tap is a gesture: try the other side's audio again if autoplay held it back.
    void this.audio.play().catch(() => {});
  }

  private stopMic() { for (const t of this.mic?.getTracks() ?? []) t.stop(); this.mic = null; }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.stopMic();
    this.pc?.close();
    this.pc = null;
    this.audio.srcObject = null;
    this.set('ended');
  }
}
