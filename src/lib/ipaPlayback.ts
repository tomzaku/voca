// Saying the sounds of English: a sound's own recording where there is one
// (data/ipaAudio — licensed clips from Wikimedia Commons), else a word that
// has it, spoken; and any word, spoken. One at a time, never over the TTS
// voice. Shared by the IPA page and the world's sound chart.

import { IPA_SOUNDS } from '../data/ipa';
import { IPA_RECORDINGS, recordingUrl } from '../data/ipaAudio';
import { speakText, stopSpeaking } from './tts';

let audio: HTMLAudioElement | null = null;

/** Stop whatever is playing. */
export function stopIpa() {
  stopSpeaking();
  audio?.pause();
  audio = null;
}

/** Speak a word; `onEnd` when it's done (or fails). */
export function sayWord(text: string, onEnd: () => void) {
  stopIpa();
  speakText(text, { onEnd }).catch(onEnd);
}

/** Say a sound — its recording, or (diphthongs have none) its first example
 *  word. False if there's nothing to say for it. */
export function saySound(symbol: string, onEnd: () => void): boolean {
  stopIpa();
  const rec = IPA_RECORDINGS[symbol];
  if (!rec) {
    const word = IPA_SOUNDS.find((s) => s.symbol === symbol)?.examples[0];
    if (!word) return false;
    sayWord(word, onEnd);
    return true;
  }
  const a = new Audio(recordingUrl(rec));
  audio = a;
  const done = () => { if (audio === a) audio = null; onEnd(); };
  a.onended = done;
  a.onerror = done;
  a.onpause = done;
  a.play().catch(done);
  return true;
}
