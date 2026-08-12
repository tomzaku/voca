// "Speaking" — Pro feature on /history: pick up to MAX_WORDS words (starting
// from the same smart-sampling the Quiz button uses, then hand-adjustable)
// and an optional topic, and an AI writes a short scripted dialogue that uses
// them. Rendered with the same bubble UI as the "Daily Dialogue" tab
// (EnglishSpeakingPage.tsx) — ReadAloudVoice/PlaySequence are reused from
// there rather than duplicated. Generated dialogues are stored server-side
// (`speaking` resource), so reopening this view shows history instead of
// paying for a new AI call.

import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import { useVocabularyStore } from '../hooks/useVocabulary';
import { progressLookup } from '../lib/progress';
import { sampleSmartWords } from '../lib/smartSample';
import { parseCloze } from '../lib/wordService';
import { CONV_VOICE_A, CONV_VOICE_B } from '../lib/tts';
import { dialogueTopics } from '../data/englishDialogues';
import {
  createSpeakingDialogue,
  deleteSpeakingDialogue,
  fetchSpeakingDialogues,
  type SpeakingDialogue,
} from '../lib/speakingApi';
import { ReadAloudVoice, PlaySequence } from './EnglishSpeakingPage';
import { PeekText } from './PeekText';

interface Props {
  /** The filtered word pool this view samples from — same pool Quiz uses. */
  words: string[];
  onBack: () => void;
}

const MIN_WORDS = 3;
const MAX_WORDS = 16;
const SPEAKING_VOICES = { a: CONV_VOICE_A, b: CONV_VOICE_B } as const;
/** '' stands for "no preference" — the server asks the model to pick a topic. */
const TOPIC_OPTIONS = ['', ...dialogueTopics] as const;

function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Plain text for TTS — the `[[ ]]` target-word markers stripped. */
function plainText(text: string): string {
  return parseCloze(text).segments.map((s) => s.value).join('');
}

/** A dialogue line, every word hoverable for its definition (`PeekText` — the
 *  same word-peek popup used in the flash card's revealed definition/examples),
 *  with the `[[ ]]`-wrapped target word additionally bolded green — same
 *  bracket convention Story Gaps' AI paragraphs use (`parseCloze`). */
function DialogueLineText({ text }: { text: string }) {
  const { segments } = parseCloze(text);
  return (
    <>
      {segments.map((seg, i) =>
        seg.type === 'text' ? (
          <PeekText key={i} text={seg.value} />
        ) : (
          <PeekText key={i} text={seg.value} className="font-semibold text-accent-green" />
        ),
      )}
    </>
  );
}

function initialCount(poolSize: number): number {
  return Math.max(MIN_WORDS, Math.min(6, poolSize));
}

export function SpeakingPractice({ words, onBack }: Props) {
  const [history, setHistory] = useState<SpeakingDialogue[] | null>(null);
  const [active, setActive] = useState<SpeakingDialogue | null>(null);
  const [picked, setPicked] = useState<Set<string>>(() => new Set(
    sampleSmartWords(words, initialCount(words.length), progressLookup(useVocabularyStore.getState().progress)),
  ));
  const [topic, setTopic] = useState<string>('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchSpeakingDialogues().then((list) => { if (!cancelled) setHistory(list); });
    return () => { cancelled = true; };
  }, []);

  // Reset to a fresh smart-sampled batch — the same 50/50 difficult/new mix
  // the Quiz button's "Smart" select uses.
  const smartPick = () => {
    const prog = progressLookup(useVocabularyStore.getState().progress);
    setPicked(new Set(sampleSmartWords(words, initialCount(words.length), prog)));
  };

  const toggleWord = (word: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(word)) next.delete(word);
      else if (next.size < MAX_WORDS) next.add(word);
      else toast(`Up to ${MAX_WORDS} words per conversation`);
      return next;
    });
  };

  const generate = async () => {
    setGenerating(true);
    try {
      const dialogue = await createSpeakingDialogue([...picked], topic);
      setHistory((h) => [dialogue, ...(h ?? [])]);
      setActive(dialogue);
    } catch (err) {
      toast.error((err as Error).message || 'Could not generate a conversation.');
    } finally {
      setGenerating(false);
    }
  };

  const remove = async (id: string) => {
    setHistory((h) => (h ?? []).filter((d) => d.id !== id));
    if (active?.id === id) setActive(null);
    try {
      await deleteSpeakingDialogue(id);
    } catch {
      toast.error('Could not delete — try again.');
    }
  };

  const header = (
    <div className="flex items-center gap-3 mb-6">
      <button
        onClick={active ? () => setActive(null) : onBack}
        className="w-10 h-10 rounded-xl bg-bg-card border border-border text-text-secondary flex items-center justify-center shrink-0 hover:border-border-light transition-colors"
      >
        <Icon icon="lucide:arrow-left" className="text-xl" />
      </button>
      <div>
        <h1 className="font-display text-2xl font-bold text-text-primary leading-none">Speaking</h1>
        <p className="text-xs text-text-muted font-medium mt-1">
          {active ? active.topic : 'AI conversations built from your words'}
        </p>
      </div>
    </div>
  );

  // ── Viewer: one generated dialogue ──
  if (active) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        {header}
        <div className="rounded-lg border border-border bg-bg-card overflow-hidden">
          <div className="px-5 py-4 bg-bg-tertiary/50 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[15px] font-medium text-text-primary leading-relaxed">{active.title}</p>
              <p className="text-xs text-text-secondary mt-1">{active.situation}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <PlaySequence
                lines={active.lines.map((l) => ({ text: plainText(l.text), voice: SPEAKING_VOICES[l.speaker] }))}
                tone="green"
              />
              <button
                onClick={() => remove(active.id)}
                title="Delete this conversation"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-accent-red hover:bg-accent-red/10 transition-colors"
              >
                <Icon icon="lucide:trash-2" />
              </button>
            </div>
          </div>

          <div className="px-5 py-4 space-y-4">
            {active.lines.map((l, i) => (
              <div key={i} className="flex gap-3">
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                    l.speaker === 'a' ? 'bg-accent-green/15 text-accent-green' : 'bg-accent-cyan/15 text-accent-cyan'
                  }`}
                >
                  {(l.speaker === 'a' ? active.speakers.a : active.speakers.b).charAt(0).toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <span
                    className={`text-[10px] font-semibold block mb-1 ${
                      l.speaker === 'a' ? 'text-accent-green' : 'text-accent-cyan'
                    }`}
                  >
                    {l.speaker === 'a' ? active.speakers.a : active.speakers.b}
                  </span>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    <DialogueLineText text={l.text} />
                  </p>
                </div>
                <div className="shrink-0 mt-5">
                  <ReadAloudVoice
                    text={plainText(l.text)}
                    voice={SPEAKING_VOICES[l.speaker]}
                    tone={l.speaker === 'a' ? 'orange' : 'cyan'}
                    voiceLabel={l.speaker === 'a' ? active.speakers.a : active.speakers.b}
                  />
                </div>
              </div>
            ))}
          </div>

          {active.words.length > 0 && (
            <div className="px-5 py-3 bg-accent-yellow/5 border-t border-accent-yellow/10">
              <p className="text-xs font-semibold text-accent-yellow mb-2">Words practiced</p>
              <div className="flex flex-wrap gap-1.5">
                {active.words.map((w) => (
                  <span
                    key={w}
                    className="text-xs px-2.5 py-1 rounded-full bg-accent-yellow/10 text-text-secondary border border-accent-yellow/15"
                  >
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Setup: past conversations + new-conversation builder ──
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {header}

      {history === null ? (
        <div className="py-10 flex items-center justify-center gap-2 text-sm text-text-muted">
          <div className="w-4 h-4 rounded-full border-2 border-accent-cyan/30 border-t-accent-cyan animate-spin" />
          Loading your conversations…
        </div>
      ) : history.length > 0 ? (
        <div className="space-y-2 mb-8">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Your conversations</p>
          {history.map((d) => (
            <button
              key={d.id}
              onClick={() => setActive(d)}
              className="w-full text-left px-4 py-3 rounded-lg border border-border bg-bg-card hover:bg-bg-hover/50 transition-colors flex items-center gap-3"
            >
              <span className="w-8 h-8 rounded-lg bg-accent-green/10 text-accent-green flex items-center justify-center shrink-0">
                <Icon icon="lucide:message-circle" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-text-primary truncate">{d.title}</span>
                <span className="block text-[11px] text-text-muted mt-0.5">
                  {d.topic} · {d.lines.length} lines · {timeAgo(d.createdAt)}
                </span>
              </span>
              <Icon icon="lucide:chevron-right" className="text-text-muted shrink-0" />
            </button>
          ))}
        </div>
      ) : null}

      <div className="rounded-lg border border-border bg-bg-card p-5">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">New conversation</p>

        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-text-muted">
            Pick up to {MAX_WORDS} words — <span className="text-text-secondary font-medium">{picked.size}</span> selected
          </p>
          <button
            onClick={smartPick}
            title="Reset to a smart-picked batch"
            className="text-xs px-2.5 py-1 rounded-full border border-border text-text-muted hover:text-text-secondary hover:border-border-light transition-colors flex items-center gap-1"
          >
            <Icon icon="lucide:shuffle" className="text-[11px]" /> Smart pick
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-4 max-h-40 overflow-y-auto">
          {words.map((w) => {
            const on = picked.has(w);
            return (
              <button
                key={w}
                onClick={() => toggleWord(w)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                  on
                    ? 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20'
                    : 'bg-bg-tertiary text-text-muted border-transparent hover:text-text-secondary'
                }`}
              >
                {on && <Icon icon="lucide:check" className="inline text-[10px] mr-1 -mt-0.5" />}
                {w}
              </button>
            );
          })}
        </div>

        <p className="text-xs text-text-muted mb-2">Topic</p>
        <div className="flex flex-wrap gap-1.5 mb-5">
          {TOPIC_OPTIONS.map((t) => (
            <button
              key={t || 'surprise'}
              onClick={() => setTopic(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                topic === t
                  ? 'bg-accent-yellow/10 text-accent-yellow border-accent-yellow/20'
                  : 'bg-bg-tertiary text-text-muted border-transparent hover:text-text-secondary'
              }`}
            >
              {t || '✨ Surprise me'}
            </button>
          ))}
        </div>

        <button
          onClick={generate}
          disabled={generating || picked.size < MIN_WORDS}
          className="w-full py-3 rounded-lg bg-accent-green text-bg-primary font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
        >
          {generating ? (
            <>
              <div className="w-4 h-4 rounded-full border-2 border-bg-primary/30 border-t-bg-primary animate-spin" />
              Writing your conversation…
            </>
          ) : (
            <>
              <Icon icon="lucide:sparkles" />
              Generate conversation
            </>
          )}
        </button>
      </div>
    </div>
  );
}
