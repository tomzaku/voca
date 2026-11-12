import { describe, expect, it } from 'vitest';
import { lineAt, parseSubtitles, youtubeId } from './captions';

describe('youtubeId', () => {
  it('reads the usual link shapes', () => {
    expect(youtubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1')).toBe('dQw4w9WgXcQ');
    expect(youtubeId('youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(youtubeId('https://youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(youtubeId('not a link')).toBeNull();
  });
});

describe('parseSubtitles', () => {
  it('reads SRT', () => {
    const srt = `1
00:00:01,000 --> 00:00:03,500
<i>Hello there,</i>
my friend.

2
00:00:04,000 --> 00:00:05,000
[MUSIC PLAYING]

3
00:00:05,200 --> 00:00:07,000
- How are you?`;
    expect(parseSubtitles(srt)).toEqual([
      { start: 1, end: 3.5, text: 'Hello there, my friend.' },
      { start: 5.2, end: 7, text: 'How are you?' },
    ]);
  });

  it('reads WebVTT with cue settings and short stamps, folding repeats', () => {
    const vtt = `WEBVTT
Kind: captions

00:01.000 --> 00:02.500 align:start position:0%
♪ we're no strangers to love ♪

00:02.500 --> 00:04.000
♪ we're no strangers to love ♪

intro
00:04.000 --> 00:06.000
you know the rules`;
    expect(parseSubtitles(vtt)).toEqual([
      { start: 1, end: 4, text: "we're no strangers to love" },
      { start: 4, end: 6, text: 'you know the rules' },
    ]);
  });
});

describe('parseSubtitles — a transcript copied from YouTube', () => {
  it('reads times on their own line, with the screen-reader text skipped', () => {
    const t = `0:19
19 seconds
I just got here, and I think

0:22
22 seconds
Hello? Can you hear me now?
1:20
1 minute, 20 seconds
[Music]
1:21
1 minute, 21 seconds
HELLO, IT'S ME`;
    expect(parseSubtitles(t)).toEqual([
      { start: 19, end: 22, text: 'I just got here, and I think' },
      { start: 22, end: 80, text: 'Hello? Can you hear me now?' },
      { start: 81, end: 85, text: "Hello, it's me" },
    ]);
  });

  it('reads a time and its words on one line', () => {
    expect(parseSubtitles('0:05 Good morning\n1:02:03 Later on')).toEqual([
      { start: 5, end: 3723, text: 'Good morning' },
      { start: 3723, end: 3727, text: 'Later on' },
    ]);
  });
});

describe('lineAt', () => {
  const lines = [{ start: 1, end: 2, text: 'a' }, { start: 3, end: 4, text: 'b' }];
  it('finds the line last started', () => {
    expect(lineAt(lines, 0.5)).toBe(-1);
    expect(lineAt(lines, 2.5)).toBe(0);
    expect(lineAt(lines, 3)).toBe(1);
    expect(lineAt(lines, 99)).toBe(1);
  });
});
