import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { speakText, stopSpeaking, isTtsPlaying, isKokoroSupported } from '../../lib/tts';
import { getTtsEngine, getTtsVoice, KOKORO_VOICES } from '../../hooks/useTtsSettings';
import type { VocabularyWord } from '../../types';

// Voices cycled through when the pronunciation button is clicked repeatedly
// (Kokoro only). The user's chosen voice always plays first; the rest add
// variety across gender and accent. Capped at 5 voices, then wraps around.
const VOICE_CYCLE_IDS = ['af_heart', 'am_michael', 'bf_emma', 'bm_george', 'af_bella'];

function kokoroVoiceCycle(): string[] {
  const preferred = getTtsVoice();
  return [preferred, ...VOICE_CYCLE_IDS.filter((id) => id !== preferred)].slice(0, 5);
}

/** Everything the card's two faces need in order to speak, as one prop. */
export interface CardSpeech {
  /** The word itself is being read aloud. */
  isSpeaking: boolean;
  /** Index of the example being read aloud, or null. */
  speakingExample: number | null;
  /** Read the headword. Repeated calls cycle voices under Kokoro. */
  speakWord: () => Promise<void>;
  speakExample: (index: number, text: string) => Promise<void>;
  /** Silence everything — used when the card moves to another word. */
  stop: () => void;
}

/**
 * The flash card's read-aloud behaviour, kept out of the card itself: which of
 * the word and its examples is currently playing, and the Kokoro voice cycle
 * that gives the learner a different voice each time they tap the speaker.
 *
 * The voice cycle restarts whenever the word changes, so every new card starts
 * from the learner's preferred voice.
 */
export function useCardSpeech(wordData: VocabularyWord | null): CardSpeech {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingExample, setSpeakingExample] = useState<number | null>(null);
  // How many times the pronunciation button was clicked for the current word.
  const clicks = useRef(0);

  useEffect(() => {
    if (!wordData) return;
    clicks.current = 0; // new word — voice cycle starts over
  }, [wordData]);

  const stop = useCallback(() => {
    stopSpeaking();
    setIsSpeaking(false);
    setSpeakingExample(null);
  }, []);

  const speakWord = useCallback(async () => {
    if (!wordData) return;
    const word = wordData.headword || wordData.word;

    // Kokoro: don't toggle-stop — every click (re)reads the word. The first
    // two clicks use the preferred voice (hear it twice), then each click
    // advances through up to 5 different voices so the learner hears variety.
    if (getTtsEngine() === 'kokoro' && isKokoroSupported()) {
      const cycle = kokoroVoiceCycle();
      const n = clicks.current;
      const idx = n === 0 ? 0 : (n - 1) % cycle.length;
      const voiceId = cycle[idx];
      clicks.current++;
      if (idx > 0) {
        const v = KOKORO_VOICES.find((k) => k.id === voiceId);
        if (v) toast(`🎙️ ${v.name} — ${v.accent} ${v.gender}`, { duration: 1200 });
      }
      stopSpeaking();
      setSpeakingExample(null);
      setIsSpeaking(true);
      await speakText(word, { voice: voiceId, onEnd: () => setIsSpeaking(false) });
      return;
    }

    if (isTtsPlaying() || isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
      return;
    }
    // Speak just the word — reading the whole definition + examples is slow.
    stopSpeaking();
    setSpeakingExample(null);
    setIsSpeaking(true);
    await speakText(word, { onEnd: () => setIsSpeaking(false) });
  }, [wordData, isSpeaking]);

  const speakExample = useCallback(async (index: number, text: string) => {
    if (speakingExample === index && isTtsPlaying()) {
      stopSpeaking();
      setSpeakingExample(null);
      return;
    }
    stopSpeaking();
    setIsSpeaking(false);
    setSpeakingExample(index);
    await speakText(text, { onEnd: () => setSpeakingExample(null) });
  }, [speakingExample]);

  return { isSpeaking, speakingExample, speakWord, speakExample, stop };
}
