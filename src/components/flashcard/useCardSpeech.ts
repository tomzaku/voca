import { useCallback, useEffect, useState } from 'react';
import { speakText, stopSpeaking, isTtsPlaying, prefetchSpeech } from '../../lib/tts';
import type { VocabularyWord } from '../../types';

/** Everything the card's two faces need in order to speak, as one prop. */
export interface CardSpeech {
  /** The word itself is being read aloud. */
  isSpeaking: boolean;
  /** Index of the example being read aloud, or null. */
  speakingExample: number | null;
  /**
   * Read the headword in the voice picked in Settings (or Auto's). `phonetics`
   * is the IPA of the meaning on screen, for a word whose spelling has more
   * than one reading ("live" the verb /lɪv/ vs the adjective /laɪv/).
   */
  speakWord: (phonetics?: Record<string, string>) => Promise<void>;
  speakExample: (index: number, text: string) => Promise<void>;
  /** Silence everything — used when the card moves to another word. */
  stop: () => void;
}

/**
 * The flash card's read-aloud behaviour, kept out of the card itself: which of
 * the word and its examples is currently playing.
 *
 * Always the one voice the learner picked. It used to cycle through five Kokoro
 * voices on repeated taps, but each voice is its own download — a few taps
 * meant loading a pile of voices nobody chose.
 */
export function useCardSpeech(wordData: VocabularyWord | null): CardSpeech {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingExample, setSpeakingExample] = useState<number | null>(null);

  // Fetch what the card's speakers can play as soon as the word is on screen,
  // so a tap plays at once instead of waiting on the network: the word, the
  // word as each meaning on the tabs (live /lɪv/, /laɪv/), and every example.
  // Mirrors what speakWord / speakExample send — the same text and IPA — or the
  // clip fetched wouldn't be the one played. A no-op off the cloud voice.
  useEffect(() => {
    if (!wordData) return;
    const word = wordData.headword || wordData.word;
    const senses = wordData.senses ?? [];
    prefetchSpeech(word);
    if (senses.length > 1) for (const s of senses) prefetchSpeech(word, { phonetics: s.phonetics ?? wordData.phonetics });
    const examples = new Set([...wordData.examples, ...senses.flatMap((s) => s.examples)]);
    for (const ex of examples) prefetchSpeech(ex);
  }, [wordData]);

  const stop = useCallback(() => {
    stopSpeaking();
    setIsSpeaking(false);
    setSpeakingExample(null);
  }, []);

  const speakWord = useCallback(async (phonetics?: Record<string, string>) => {
    if (!wordData) return;
    const word = wordData.headword || wordData.word;

    if (isTtsPlaying() || isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
      return;
    }
    // Speak just the word — reading the whole definition + examples is slow.
    stopSpeaking();
    setSpeakingExample(null);
    setIsSpeaking(true);
    await speakText(word, { phonetics, onEnd: () => setIsSpeaking(false) });
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
