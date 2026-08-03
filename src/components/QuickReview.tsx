// The landing page for a reminder notification.
//
// The notification already told you the word ("Still remember 'pay off'?"), so
// dropping you into a guess-the-word round is a non-question — the answer is
// on your lock screen. What's actually unknown is whether you remember what it
// *means*, so this asks that instead, in the opposite direction to every other
// round in the app: word shown, meaning hidden.
//
// It's deliberately one question. A notification earns a few seconds of
// attention, and asking for more is how you train someone to swipe it away.

import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useVocabularyStore } from '../hooks/useVocabulary';
import { decodeWord } from '../lib/wordCode';
import { generateWordData, recentCachedWords } from '../lib/wordService';
import { speakText, stopSpeaking } from '../lib/tts';
import { playCorrect, playWrong } from '../lib/sfx';
import type { VocabularyWord } from '../types';

/** Options shown, including the right one. */
const CHOICES = 4;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** The one-liner if we have it, else the full definition. */
function meaningOf(w: VocabularyWord): string {
  return w.shortDefinition?.trim() || w.definition;
}

export function QuickReview() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const markWord = useVocabularyStore((s) => s.markWord);

  const encoded = params.get('w');
  const plain = params.get('word');
  const target = encoded ? decodeWord(encoded) : (plain ?? '');

  const [wordData, setWordData] = useState<VocabularyWord | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);

  // Derived, not stored: a missing `?w=` is a property of the URL, and putting
  // it in state would mean setting state during the effect for no gain.
  const failed = !target || loadError;

  useEffect(() => {
    if (!target) return;
    let cancelled = false;
    // Cache-first inside generateWordData, so a word you've seen resolves with
    // no network — which matters when this opens from a notification.
    void generateWordData(target)
      .then((data) => !cancelled && setWordData(data))
      .catch(() => !cancelled && setLoadError(true));
    return () => {
      cancelled = true;
      stopSpeaking();
    };
  }, [target]);

  /**
   * Distractors come from other words already cached on this device — no
   * network, and they're words from the learner's own rotation rather than
   * random vocabulary, which makes the choice a real one.
   */
  const options = useMemo(() => {
    if (!wordData) return [];
    const correct = meaningOf(wordData);
    const pool = recentCachedWords(60)
      .filter((w) => w.word.toLowerCase() !== wordData.word.toLowerCase())
      .map(meaningOf)
      .filter((m) => m && m !== correct);
    const distractors = shuffle([...new Set(pool)]).slice(0, CHOICES - 1);
    return shuffle([correct, ...distractors]);
  }, [wordData]);

  const correctMeaning = wordData ? meaningOf(wordData) : '';
  const answered = picked !== null;
  const gotIt = answered && picked === correctMeaning;

  const choose = (option: string) => {
    if (answered || !wordData) return;
    setPicked(option);
    const right = option === correctMeaning;
    if (right) playCorrect();
    else playWrong();
    // Same pipeline as every other round: this feeds FSRS, the streak, the
    // dashboard and tomorrow's reminder.
    markWord(wordData.word, right ? 'known' : 'skipped', user?.id, right ? 0 : 1, 'meaning');
    stopSpeaking();
    setTimeout(() => speakText(wordData.headword || wordData.word), 250);
  };

  if (failed) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center flex flex-col items-center gap-4">
        <p className="text-text-muted text-sm">
          Couldn't load {target ? `“${target}”` : 'that word'}.
        </p>
        <Link to="/" className="btn-3d px-4 py-2 text-sm bg-accent-cyan text-bg-primary">
          Go to Learn
        </Link>
      </div>
    );
  }

  if (!wordData) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 flex justify-center">
        <Icon icon="lucide:loader-circle" className="text-3xl text-text-muted animate-spin" />
      </div>
    );
  }

  // Too few cached words to build a real multiple choice — fall back to an
  // honest self-check rather than a question with two options.
  const selfCheck = options.length < 2;

  return (
    <div className="max-w-md mx-auto px-4 py-10 flex flex-col gap-6">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
          Quick review
        </p>
        <div className="flex items-center justify-center gap-2">
          <h1 className="font-title text-3xl text-accent-cyan">
            {wordData.headword || wordData.word}
          </h1>
          <button
            onClick={() => speakText(wordData.headword || wordData.word)}
            aria-label="Hear the word"
            className="btn-3d w-9 h-9 rounded-full bg-bg-card text-text-secondary flex items-center justify-center"
          >
            <Icon icon="lucide:volume-2" />
          </button>
        </div>
        <p className="text-sm text-text-muted mt-2">
          {answered ? '' : selfCheck ? 'Do you remember what it means?' : 'What does it mean?'}
        </p>
      </div>

      {!answered && selfCheck && (
        <div className="flex flex-col gap-2">
          <button
            onClick={() => choose(correctMeaning)}
            className="btn-3d py-3 text-sm font-bold bg-accent-green/15 text-accent-green"
          >
            I know this one
          </button>
          <button
            onClick={() => choose('__not-known__')}
            className="btn-3d py-3 text-sm font-bold bg-bg-card text-text-secondary"
          >
            Not sure
          </button>
        </div>
      )}

      {!answered && !selfCheck && (
        <div className="flex flex-col gap-2">
          {options.map((option) => (
            <button
              key={option}
              onClick={() => choose(option)}
              className="btn-3d px-4 py-3 text-sm text-left bg-bg-card text-text-primary"
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {answered && (
        <div className="flex flex-col gap-4">
          <div
            className={`rounded-2xl border-[3px] p-4 text-center ${
              gotIt
                ? 'border-accent-green bg-accent-green/10'
                : 'border-accent-red bg-accent-red/10'
            }`}
          >
            <Icon
              icon={gotIt ? 'lucide:check' : 'lucide:x'}
              className={`text-3xl ${gotIt ? 'text-accent-green' : 'text-accent-red'}`}
            />
            <p className="text-sm font-bold mt-1 mb-2 text-text-primary">
              {gotIt ? 'Got it' : "Here's what it means"}
            </p>
            <p className="text-sm text-text-secondary">{correctMeaning}</p>
          </div>

          {wordData.examples?.[0] && (
            <p className="text-sm text-text-muted italic text-center">“{wordData.examples[0]}”</p>
          )}

          <div className="flex flex-col gap-2">
            <button
              onClick={() => navigate('/')}
              className="btn-3d py-3 text-sm font-bold bg-accent-cyan text-bg-primary"
            >
              Keep learning
            </button>
            <Link
              to={`/?w=${encoded ?? ''}`}
              className="text-center text-xs text-text-muted hover:text-text-primary underline"
            >
              See the full card for this word
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
