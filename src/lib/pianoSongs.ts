// The street piano's songs: public-domain melodies from the midi-keyboard
// project, in its compact notation — `E4/3` is a pitch and the finger to play
// it with, `:2` how many beats it lasts (1 if not said), `r` a rest, `C4+E4`
// a chord (the piano here plays the top note: it's the melody). Fingers are
// ignored; the beats set the pace of the demo.

export interface SongNote { midi: number; beats: number }
export interface PianoSong { id: string; title: string; bpm: number; notes: SongNote[] }

const STEP: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** A pitch like `C4`, `F#3` or `Bb4` as a MIDI number. */
export function midiOf(pitch: string): number {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(pitch);
  if (!m) throw new Error(`not a pitch: ${pitch}`);
  return 12 * (Number(m[3]) + 1) + STEP[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

/** The notes of a melody written in the compact notation (rests dropped). */
export function parseMelody(notation: string): SongNote[] {
  const out: SongNote[] = [];
  for (const token of notation.trim().split(/\s+/)) {
    const [head, beats = '1'] = token.split(':');
    if (head === 'r') continue;
    const pitches = head.split('+').map((p) => midiOf(p.split('/')[0]));
    out.push({ midi: Math.max(...pitches), beats: Number(beats) });
  }
  return out;
}

const song = (id: string, title: string, bpm: number, notation: string): PianoSong => ({ id, title, bpm, notes: parseMelody(notation) });

export const PIANO_SONGS: PianoSong[] = [
  song('twinkle', 'Twinkle Twinkle Little Star', 96, 'C4/1 C4/1 G4/4 G4/4 A4/5 A4/5 G4/4:2 F4/4 F4/4 E4/3 E4/3 D4/2 D4/2 C4/1:2 G4/5 G4/5 F4/4 F4/4 E4/3 E4/3 D4/2:2 G4/5 G4/5 F4/4 F4/4 E4/3 E4/3 D4/2:2 C4/1 C4/1 G4/4 G4/4 A4/5 A4/5 G4/4:2 F4/4 F4/4 E4/3 E4/3 D4/2 D4/2 C4/1:2'),
  song('ode', 'Ode to Joy', 100, 'E4/3 E4/3 F4/4 G4/5 G4/5 F4/4 E4/3 D4/2 C4/1 C4/1 D4/2 E4/3 E4/3:1.5 D4/2:0.5 D4/2:2 E4/3 E4/3 F4/4 G4/5 G4/5 F4/4 E4/3 D4/2 C4/1 C4/1 D4/2 E4/3 D4/2:1.5 C4/1:0.5 C4/1:2'),
  song('frere-jacques', 'Frère Jacques', 100, 'C4/1 D4/2 E4/3 C4/1 C4/1 D4/2 E4/3 C4/1 E4/3 F4/4 G4/5:2 E4/3 F4/4 G4/5:2 G4/4:0.5 A4/5:0.5 G4/4:0.5 F4/3:0.5 E4/2 C4/1 G4/4:0.5 A4/5:0.5 G4/4:0.5 F4/3:0.5 E4/2 C4/1 C4/4 G3/1 C4/4:2 C4/4 G3/1 C4/4:2'),
  song('au-clair', 'Au Clair de la Lune', 96, 'C4/1 C4/1 C4/1 D4/2 E4/3:2 D4/2:2 C4/1 E4/3 D4/2 D4/2 C4/1:4 C4/1 C4/1 C4/1 D4/2 E4/3:2 D4/2:2 C4/1 E4/3 D4/2 D4/2 C4/1:4 D4/5 D4/5 D4/5 D4/5 A3/2:2 A3/2:2 D4/5 C4/4 B3/3 A3/2 G3/1:4 C4/1 C4/1 C4/1 D4/2 E4/3:2 D4/2:2 C4/1 E4/3 D4/2 D4/2 C4/1:4'),
  song('jingle-bells', 'Jingle Bells', 120, 'E4/3 E4/3 E4/3:2 E4/3 E4/3 E4/3:2 E4/3 G4/5 C4/1:1.5 D4/2:0.5 E4/3:4 F4/4 F4/4 F4/4:1.5 F4/4:0.5 F4/4 E4/3 E4/3 E4/3:0.5 E4/3:0.5 E4/3 D4/2 D4/2 E4/3 D4/2:2 G4/5:2 E4/3 E4/3 E4/3:2 E4/3 E4/3 E4/3:2 E4/3 G4/5 C4/1:1.5 D4/2:0.5 E4/3:4 F4/4 F4/4 F4/4:1.5 F4/4:0.5 F4/4 E4/3 E4/3 E4/3:0.5 E4/3:0.5 G4/5 G4/5 F4/4 D4/2 C4/1:4'),
  song('happy-birthday', 'Happy Birthday', 100, 'G4/1:0.75 G4/1:0.25 A4/2 G4/1 C5/4 B4/3:2 G4/1:0.75 G4/1:0.25 A4/2 G4/1 D5/5 C5/4:2 G4/1:0.75 G4/1:0.25 G5/5 E5/4 C5/3 B4/2 A4/1 F5/5:0.75 F5/5:0.25 E5/4 C5/2 D5/3 C5/2:3'),
  song('sakura', 'Sakura Sakura', 72, 'A4/3 A4/3 B4/4:2 A4/3 A4/3 B4/4:2 A4/3 B4/4 C5/5 B4/4 A4/3 B4/4:0.5 A4/3:0.5 F4/1:2 E4/4 C4/2 E4/4 F4/5 E4/4 E4/4:0.5 C4/2:0.5 B3/1:2 A4/3 B4/4 C5/5 B4/4 A4/3 B4/4:0.5 A4/3:0.5 F4/1:2 E4/4 C4/2 E4/4 F4/5 E4/4 E4/4:0.5 C4/2:0.5 B3/1:2 A4/4 A4/4 B4/5:2 A4/4 A4/4 B4/5:2 E4/1 F4/2 B4/5:0.5 A4/4:0.5 F4/2 E4/1:4'),
  song('mo-li-hua', 'Mò Lì Hoa (Jasmine Flower)', 80, 'E4/1:0.5 E4/1:0.5 G4/3:0.5 A4/4:0.5 C5/5:0.5 C5/5:0.5 A4/4:0.5 G4/3:0.5 G4/3:0.5 A4/4:0.5 G4/3:2 E4/1:0.5 E4/1:0.5 G4/3:0.5 A4/4:0.5 C5/5:0.5 C5/5:0.5 A4/4:0.5 G4/3:0.5 G4/3:0.5 A4/4:0.5 G4/3:2 G4/3:0.5 G4/3:0.5 G4/3 E4/1:0.5 G4/3:0.5 A4/4:0.5 A4/4:0.5 G4/3:2 E4/1:0.5 D4/2:0.5 E4/3:0.5 G4/5:0.5 E4/3:0.5 D4/2:0.5 C4/1 C4/1:0.5 D4/2:0.5 C4/1:2'),
];

/** The keyboard: G3 to G5. */
export const LOW = midiOf('G3'), HIGH = midiOf('G5');
export const isBlack = (midi: number) => [1, 3, 6, 8, 10].includes(midi % 12);

/** Computer keys for the piano's keys: the home row from C4 up the white
 *  keys, the row above for the black ones, Z X C for the three below C4. */
export const KEY_FOR: Record<string, number> = {
  KeyZ: midiOf('G3'), KeyX: midiOf('A3'), KeyC: midiOf('B3'),
  KeyA: midiOf('C4'), KeyS: midiOf('D4'), KeyD: midiOf('E4'), KeyF: midiOf('F4'), KeyG: midiOf('G4'),
  KeyH: midiOf('A4'), KeyJ: midiOf('B4'), KeyK: midiOf('C5'), KeyL: midiOf('D5'), Semicolon: midiOf('E5'),
  Quote: midiOf('F5'), Enter: midiOf('G5'),
  KeyW: midiOf('C#4'), KeyE: midiOf('D#4'), KeyT: midiOf('F#4'), KeyY: midiOf('G#4'), KeyU: midiOf('A#4'),
  KeyO: midiOf('C#5'), KeyP: midiOf('D#5'), BracketRight: midiOf('F#5'),
};

/** The same keys by the character they type, for when a key event doesn't
 *  say which physical key it was. */
export const CHAR_FOR: Record<string, number> = Object.fromEntries(Object.entries(KEY_FOR).map(([code, midi]) => [
  code.startsWith('Key') ? code.slice(3).toLowerCase() : { Semicolon: ';', Quote: "'", BracketRight: ']', Enter: 'Enter' }[code] ?? code,
  midi,
]));
