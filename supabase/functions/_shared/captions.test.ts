import { describe, expect, it } from 'vitest';
import { cleanCaption, parseTrack, pickTrack, videoIdOf } from './captions';

describe('videoIdOf', () => {
  it.each([
    ['dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ?si=abc', 'dQw4w9WgXcQ'],
    ['youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://m.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://music.youtube.com/watch?v=dQw4w9WgXcQ&list=x', 'dQw4w9WgXcQ'],
  ])('%s', (input, id) => expect(videoIdOf(input)).toBe(id));

  it('refuses anything else', () => {
    expect(videoIdOf('https://vimeo.com/123')).toBeNull();
    expect(videoIdOf('hello world')).toBeNull();
    expect(videoIdOf('https://youtube.com/watch?v=short')).toBeNull();
  });
});

describe('cleanCaption', () => {
  it('drops sound cues, notes and speaker marks', () => {
    expect(cleanCaption('♪ Never gonna give you up ♪')).toBe('Never gonna give you up');
    expect(cleanCaption('[Music]')).toBe('');
    expect(cleanCaption('&gt;&gt; JOHN: (laughs) Hi there')).toBe('JOHN: Hi there');
    expect(cleanCaption('I&amp;#39;m\nhere')).toBe("I'm here");
  });

  it('drops credit lines and quiets shouting', () => {
    expect(cleanCaption('Transcriber: Joseph Geni Reviewer: Morton Bast')).toBe('');
    expect(cleanCaption("IT'S BEEN A LONG DAY WITHOUT YOU, MY FRIEND")).toBe("It's been a long day without you, my friend");
    expect(cleanCaption("AND I'LL TELL YOU. I KNOW")).toBe("And I'll tell you. I know");
    expect(cleanCaption('NASA said OK')).toBe('NASA said OK');
  });
});

describe('parseTrack', () => {
  it('reads srv1 and cuts overlapping lines at the next start', () => {
    const xml = '<transcript><text start="1.5" dur="3">Hello there, my friend.</text>'
      + '<text start="4" dur="2">[Music]</text>'
      + '<text start="4.2" dur="2.1">How are you doing today?</text></transcript>';
    expect(parseTrack(xml)).toEqual([
      { start: 1.5, end: 4.2, text: 'Hello there, my friend.' },
      { start: 4.2, end: 6.3, text: 'How are you doing today?' },
    ]);
  });

  it('reads srv3 in milliseconds', () => {
    const xml = '<timedtext><body><p t="1000" d="1500">One two three four</p></body></timedtext>';
    expect(parseTrack(xml)).toEqual([{ start: 1, end: 2.5, text: 'One two three four' }]);
  });

  it('reads json3 and skips append events', () => {
    const json = JSON.stringify({
      events: [
        { tStartMs: 0, dDurationMs: 2000, segs: [{ utf8: 'well I think' }, { utf8: ' that' }] },
        { tStartMs: 1000, aAppend: 1, segs: [{ utf8: '\n' }] },
        { tStartMs: 2000, dDurationMs: 2000, segs: [{ utf8: 'we should go home now' }] },
      ],
    });
    // "well I think that" is four words, so it stands on its own.
    expect(parseTrack(json).map((l) => l.text)).toEqual(['well I think that', 'we should go home now']);
  });

  it('folds a short fragment into the line it runs into', () => {
    const xml = '<text start="0" dur="1">so what I</text><text start="1" dur="2">wanted to say was this</text>';
    expect(parseTrack(xml)).toEqual([{ start: 0, end: 3, text: 'so what I wanted to say was this' }]);
  });

  it('is empty for something that is not a track', () => {
    expect(parseTrack('<html>nope</html>')).toEqual([]);
    expect(parseTrack('{bad json')).toEqual([]);
  });
});

describe('pickTrack', () => {
  const tracks = [
    { lang: 'en', name: 'English (auto-generated)', auto: true },
    { lang: 'en-GB', name: 'English (UK)', auto: false },
    { lang: 'vi', name: 'Vietnamese', auto: false },
  ];
  it('prefers a person’s captions in the language', () => {
    expect(pickTrack(tracks, 'en')?.name).toBe('English (UK)');
  });
  it('falls back to speech recognition, then nothing', () => {
    expect(pickTrack(tracks.slice(0, 1), 'en')?.auto).toBe(true);
    expect(pickTrack(tracks, 'fr')).toBeNull();
  });
});
