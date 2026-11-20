import { describe, expect, it } from 'vitest';
import { splitCandidates } from './peerLink';

// The guest answers an offer stripped of the host's addresses, then adds them
// back — Chrome won't gather its own public address otherwise (see answer()).
describe('splitCandidates', () => {
  const offer = [
    'v=0',
    'o=- 1 2 IN IP4 127.0.0.1',
    'm=application 9 UDP/DTLS/SCTP webrtc-datachannel',
    'a=mid:0',
    'a=candidate:1 1 udp 2122260223 abc.local 50000 typ host generation 0',
    'a=candidate:2 1 udp 1686052607 203.0.113.7 50001 typ srflx raddr 0.0.0.0 rport 0 generation 0',
    'a=end-of-candidates',
    'a=sctp-port:5000',
    '',
  ].join('\r\n');

  it('takes the candidates out and keeps the rest', () => {
    const { bare, candidates, mid } = splitCandidates(offer);
    expect(candidates).toEqual([
      'candidate:1 1 udp 2122260223 abc.local 50000 typ host generation 0',
      'candidate:2 1 udp 1686052607 203.0.113.7 50001 typ srflx raddr 0.0.0.0 rport 0 generation 0',
    ]);
    expect(mid).toBe('0');
    expect(bare).not.toContain('a=candidate');
    expect(bare).not.toContain('end-of-candidates');
    expect(bare).toContain('a=sctp-port:5000');
    expect(bare.endsWith('\r\n')).toBe(true);
  });

  it('copes with an offer that has none', () => {
    const { candidates, bare } = splitCandidates('v=0\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\n');
    expect(candidates).toEqual([]);
    expect(bare).toContain('m=application');
  });
});
