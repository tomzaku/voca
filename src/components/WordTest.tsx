import { useState, useRef, useEffect } from 'react';
import { callAI } from '../lib/aiProviders';
import { speakConversation, stopKokoroAudio, isKokoroPlaying } from '../lib/kokoroTts';
import type { VocabularyWord } from '../types';

type Mode = 'sample' | 'chat' | 'translate';
type MsgRole = 'ai' | 'user';

interface Message { role: MsgRole; text: string }

interface Props { wordData: VocabularyWord }

const LANG_KEY = 'voca-translate-lang';
const MAX_TURNS = 3;

function getStoredLang(): string {
  return localStorage.getItem(LANG_KEY) || 'Vietnamese';
}

// ─── Shared chat bubble UI ───────────────────────────────────────────

function Bubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-2 items-start ${isUser ? 'flex-row-reverse' : ''}`}>
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-accent-purple/15 border border-accent-purple/20 flex items-center justify-center shrink-0 mt-0.5 text-accent-purple text-xs">✦</div>
      )}
      <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed max-w-[85%] whitespace-pre-wrap ${
        isUser
          ? 'bg-accent-purple/15 text-text-primary rounded-tr-sm'
          : 'bg-bg-card text-text-primary rounded-tl-sm'
      }`}>
        {msg.text}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-2 items-center">
      <div className="w-6 h-6 rounded-full bg-accent-purple/15 border border-accent-purple/20 flex items-center justify-center shrink-0 text-accent-purple text-xs">✦</div>
      <div className="flex gap-1 px-3 py-2">
        {[0, 1, 2].map((i) => (
          <span key={i} className="w-1.5 h-1.5 rounded-full bg-accent-purple/40 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );
}

// ─── Mode 1: Sample conversations ───────────────────────────────────

function SampleMode({ wordData }: { wordData: VocabularyWord }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (loaded) return;
    setLoading(true);
    setLoaded(true);

    callAI({
      system: `You generate short example dialogues for vocabulary learning. Return ONLY the dialogues, no extra text.`,
      messages: [{
        role: 'user',
        content: `Create 3 short, natural dialogues (2 lines each) that naturally use the word "${wordData.word}".

Format exactly like this:
A: sentence using the word
B: response

A: another use
B: response

A: third use
B: response`,
      }],
      maxTokens: 300,
    })
      .then((raw) => {
        // Parse into alternating A/B bubbles
        const pairs = raw.trim().split(/\n\n+/);
        const msgs: Message[] = [];
        for (const pair of pairs) {
          const lines = pair.trim().split('\n');
          for (const line of lines) {
            const m = line.match(/^([AB]):\s*(.+)$/);
            if (m) msgs.push({ role: m[1] === 'A' ? 'ai' : 'user', text: m[2] });
          }
        }
        setMessages(msgs.length ? msgs : [{ role: 'ai', text: raw.trim() }]);
      })
      .catch(() => setMessages([{ role: 'ai', text: 'Could not load examples. Check your AI settings.' }]))
      .finally(() => setLoading(false));
  }, [loaded, wordData]);

  // Cleanup on unmount
  useEffect(() => () => { stopKokoroAudio(); }, []);

  const readAloud = () => {
    if (playing || isKokoroPlaying()) { stopKokoroAudio(); return; }
    if (messages.length === 0) return;

    speakConversation(messages, {
      onStart: () => setPlaying(true),
      onEnd: () => setPlaying(false),
    });
  };

  return (
    <div className="flex flex-col">
      <div className="px-4 py-3 space-y-2.5 max-h-64 overflow-y-auto">
        {messages.map((m, i) => <Bubble key={i} msg={m} />)}
        {loading && <TypingIndicator />}
      </div>
      {messages.length > 0 && !loading && (
        <div className="px-4 pb-3 flex justify-end">
          <button
            onClick={readAloud}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              playing
                ? 'bg-accent-purple/20 text-accent-purple hover:bg-accent-purple/30'
                : 'bg-bg-card border border-border text-text-muted hover:text-accent-purple hover:border-accent-purple/30'
            }`}
          >
            {playing ? (
              <>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                Stop
              </>
            ) : (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                </svg>
                Read aloud
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Mode 2: Real AI chat ────────────────────────────────────────────

function ChatMode({ wordData }: { wordData: VocabularyWord }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [turn, setTurn] = useState(0);
  const [done, setDone] = useState(false);
  const [started, setStarted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  useEffect(() => {
    if (started) return;
    setStarted(true);
    setLoading(true);

    callAI({
      system: `You are a friendly vocabulary tutor testing the student on the word "${wordData.word}". Definition: ${wordData.definition}. Keep replies brief (1-3 sentences). Be warm and encouraging.`,
      messages: [{ role: 'user', content: `Ask the student one engaging question to test their understanding of "${wordData.word}". Options: use it in a sentence, describe a situation, or explain it in their own words.` }],
      maxTokens: 150,
    })
      .then((r) => { setMessages([{ role: 'ai', text: r.trim() }]); setTurn(1); })
      .catch(() => { setMessages([{ role: 'ai', text: 'Could not start. Check your AI settings.' }]); setDone(true); })
      .finally(() => { setLoading(false); setTimeout(() => inputRef.current?.focus(), 100); });
  }, [started, wordData]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const updated: Message[] = [...messages, { role: 'user', text }];
    setMessages(updated);
    setInput('');
    setLoading(true);

    const isLast = turn >= MAX_TURNS;
    const history = updated.map((m) => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }));

    callAI({
      system: `You are a friendly vocabulary tutor. Word: "${wordData.word}". Definition: ${wordData.definition}. Be brief (1-3 sentences). ${isLast ? 'This is the final turn — give a warm closing summary.' : ''}`,
      messages: [...history, { role: 'user', content: isLast ? 'Give brief closing feedback and summarize what they learned.' : 'Give brief feedback on their answer, then ask one follow-up question.' }],
      maxTokens: 180,
    })
      .then((r) => {
        setMessages([...updated, { role: 'ai', text: r.trim() }]);
        if (isLast) setDone(true); else setTurn((t) => t + 1);
      })
      .catch(() => setMessages([...updated, { role: 'ai', text: 'Something went wrong.' }]))
      .finally(() => { setLoading(false); setTimeout(() => inputRef.current?.focus(), 100); });
  };

  return (
    <>
      <div className="px-4 py-3 space-y-3 max-h-64 overflow-y-auto">
        {messages.map((m, i) => <Bubble key={i} msg={m} />)}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>
      {!done && (
        <div className="flex gap-2 px-3 pb-3">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Type your answer…"
            disabled={loading}
            className="flex-1 bg-bg-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple/40 disabled:opacity-50"
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-lg bg-accent-purple text-white flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-30"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      )}
      {done && <p className="text-center text-xs text-accent-green pb-3">Complete ✓</p>}
    </>
  );
}

// ─── Mode 3: Translation ─────────────────────────────────────────────

function TranslateMode({ wordData }: { wordData: VocabularyWord }) {
  const [lang, setLang] = useState(getStoredLang);
  const [langInput, setLangInput] = useState(getStoredLang);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchedLang, setFetchedLang] = useState('');

  const fetchTranslation = (targetLang: string) => {
    if (loading || fetchedLang === targetLang) return;
    setLoading(true);
    setFetchedLang(targetLang);
    setMessages([]);

    callAI({
      system: `You are a bilingual vocabulary tutor. Be concise and practical.`,
      messages: [{
        role: 'user',
        content: `Translate and explain the English word "${wordData.word}" for a ${targetLang} speaker.

Provide:
1. **${targetLang} equivalent** — the most natural translation
2. **Example** — one English sentence with ${targetLang} translation below it
3. **Note** — one brief usage tip in ${targetLang}

Keep it short and practical.`,
      }],
      maxTokens: 250,
    })
      .then((r) => setMessages([{ role: 'ai', text: r.trim() }]))
      .catch(() => setMessages([{ role: 'ai', text: 'Could not translate. Check your AI settings.' }]))
      .finally(() => setLoading(false));
  };

  // Auto-fetch on mount with stored lang
  useEffect(() => { fetchTranslation(lang); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChangeLang = () => {
    const trimmed = langInput.trim();
    if (!trimmed || trimmed === lang) return;
    localStorage.setItem(LANG_KEY, trimmed);
    setLang(trimmed);
    setFetchedLang('');
    fetchTranslation(trimmed);
  };

  return (
    <div className="px-4 py-3 space-y-3">
      {/* Language picker */}
      <div className="flex gap-2">
        <input
          value={langInput}
          onChange={(e) => setLangInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleChangeLang()}
          placeholder="Language (e.g. Vietnamese)"
          className="flex-1 bg-bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple/40"
        />
        <button
          onClick={handleChangeLang}
          disabled={loading || !langInput.trim() || langInput.trim() === lang}
          className="px-3 py-1.5 rounded-lg bg-accent-purple/15 text-accent-purple text-xs font-medium hover:bg-accent-purple/25 transition-colors disabled:opacity-40"
        >
          Apply
        </button>
      </div>

      {/* Translation result */}
      <div className="max-h-56 overflow-y-auto space-y-2">
        {messages.map((m, i) => <Bubble key={i} msg={m} />)}
        {loading && <TypingIndicator />}
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────

const MODES: { id: Mode; label: string; icon: string }[] = [
  { id: 'sample',    label: 'Conversations', icon: '💬' },
  { id: 'chat',      label: 'Practice',      icon: '🤖' },
  { id: 'translate', label: 'Translate',     icon: '🌏' },
];

export function WordTest({ wordData }: Props) {
  const [mode, setMode] = useState<Mode | null>(null);

  if (!mode) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-border bg-bg-card text-text-muted hover:border-accent-purple/30 hover:text-accent-purple hover:bg-accent-purple/5 transition-all"
          >
            <span className="text-lg">{m.icon}</span>
            <span className="text-xs font-medium">{m.label}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-accent-purple/20 bg-bg-tertiary overflow-hidden animate-fade-in">
      {/* Tab bar */}
      <div className="flex border-b border-border">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
              mode === m.id
                ? 'text-accent-purple border-b-2 border-accent-purple bg-accent-purple/5'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            <span>{m.icon}</span>
            <span>{m.label}</span>
          </button>
        ))}
      </div>

      {/* Mode content — key forces remount on word change */}
      {mode === 'sample'    && <SampleMode    key={`sample-${wordData.word}`}    wordData={wordData} />}
      {mode === 'chat'      && <ChatMode      key={`chat-${wordData.word}`}      wordData={wordData} />}
      {mode === 'translate' && <TranslateMode key={`translate-${wordData.word}`} wordData={wordData} />}
    </div>
  );
}
