import { useCallback, useRef, useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import toast from 'react-hot-toast';
import { Icon } from '@iconify/react';
import { Selector } from './Selector';
import { KOKORO_VOICES, PIPER_VOICES } from '../hooks/useTtsSettings';
import {
  benchmarkKokoro,
  benchmarkPiper,
  benchmarkNative,
  clearKokoroCache,
  clearPiperCache,
  type BenchmarkEngine,
  type BenchmarkResult,
  type KokoroDevice,
} from '../lib/ttsBenchmark';

// Dev-only page — intentionally not linked from the Rail. Reach it by typing
// the URL. Times how long each TTS engine takes to load its model and to
// turn the same text into audio, so a slow voice can be told apart from a
// slow model.

const MAX_TEXT = 2000;
// ~150 words — long enough that Synthesize time reflects real per-model
// throughput instead of being swamped by each call's fixed overhead.
const DEFAULT_TEXT =
  'Artificial intelligence has quietly reshaped how people communicate, learn, and work together ' +
  'across the globe. What once required a translator, a tutor, or a dedicated recording studio can ' +
  'now happen instantly inside a browser tab, without anyone noticing the complexity running ' +
  'underneath. Text-to-speech models, in particular, have become remarkably capable: they can read a ' +
  'paragraph aloud with natural pauses, shifting emphasis, and a tone that sounds less like a machine ' +
  'and more like a patient teacher repeating a phrase until it finally clicks. Still, these models ' +
  'vary enormously in speed and quality. Some are small enough to run entirely offline on a laptop, ' +
  'trading polish for near-instant answers, while others lean on heavier computation to sound ' +
  'convincingly human, at the cost of a longer wait before the first word is spoken. Benchmarking ' +
  'them side by side, using the exact same sentence, is the simplest way to see those tradeoffs ' +
  'clearly instead of guessing from memory or marketing claims.';

const ENGINES: BenchmarkEngine[] = ['kokoro', 'piper', 'native'];

const ENGINE_META: Record<BenchmarkEngine, { label: string; icon: string; description: string }> = {
  kokoro: { label: 'Kokoro', icon: 'lucide:cpu', description: 'ONNX model, WASM/WebGPU — downloads on first run' },
  piper: { label: 'Piper', icon: 'lucide:speaker', description: 'ONNX model, WASM — cached to OPFS on first run' },
  native: { label: 'Native', icon: 'lucide:smartphone', description: "Browser's built-in voice — no model, plays live" },
};

type RowStatus = 'queued' | 'loading' | 'done' | 'error' | 'skipped';

interface Row {
  engine: BenchmarkEngine;
  status: RowStatus;
  result?: BenchmarkResult;
  error?: string;
}

function formatMs(ms: number | null): string {
  if (ms === null) return '—';
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms.toFixed(0)}ms`;
}

function formatRtf(rtf: number | null): string {
  if (rtf === null) return '—';
  return `${rtf.toFixed(2)}×`;
}

function formatBytes(bytes: number | null): string {
  if (bytes === null) return '—';
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}

function formatScore(score: number | null): string {
  return score === null ? '—' : String(score);
}

// One line per results column, shown as a hover tooltip — the table itself
// has no room to spell out what each timing phase covers. A custom tooltip
// rather than the `title` attribute, which shows only after a long,
// inconsistent browser delay (see RailTooltip in Rail.tsx for the same
// pattern elsewhere in the app).
const COLUMN_HINTS: Record<string, string> = {
  Engine: 'Which read-aloud engine (and voice) this row benchmarks.',
  Score: '100 ÷ Real-time factor, rounded. 100 = exactly real-time. 400 means this run synthesized speech 4× faster than it takes to play back; 50 means half real-time speed. Depends only on Synthesize (actual inference) — not on network/disk (Load) or model file size — so it\'s the number to compare across machines or chips (e.g. an M1 vs an M5). "—" for Native, whose timing reflects the OS speech engine, not this device\'s own compute.',
  'Model size': "Total bytes of the model this engine needs. Fixed per model, not per text length. Kokoro's one model serves all 26 voices, so this excludes the small per-voice style file — see Voice load.",
  Load: "Time spent fetching + initializing the model. Reads ~0 once it's cached from an earlier run — use Clear model caches to force a cold number.",
  'Voice load': "Kokoro only: time to fetch this specific voice's small style file, separated out so it doesn't inflate Synthesize the first time a voice is used. Piper's equivalent is already part of Load (each voice is its own model); Native has no voice file at all.",
  Synthesize: 'Time to turn the text into audio, with the model and voice already loaded — the number that reflects raw per-word throughput.',
  'Audio length': 'Duration of the resulting speech clip.',
  'Real-time factor': 'Synthesize time ÷ audio length. Under 1× is faster than real-time playback, and it stays roughly constant across text lengths — the basis for Score.',
};

function Th({ children }: { children: string }) {
  return (
    <th className="px-4 py-2.5 text-xs font-bold text-text-muted whitespace-nowrap">
      <span className="group relative inline-flex items-center gap-1 cursor-help">
        {children}
        <Icon icon="lucide:info" className="text-[13px] text-text-muted/70" />
        <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 whitespace-normal rounded-lg border border-border bg-bg-primary px-3 py-2 text-[11px] font-normal normal-case leading-relaxed text-text-primary opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
          {COLUMN_HINTS[children]}
        </span>
      </span>
    </th>
  );
}

async function runEngine(
  engine: BenchmarkEngine,
  text: string,
  kokoroVoice: string,
  kokoroDevice: KokoroDevice,
  piperVoice: string,
): Promise<BenchmarkResult> {
  switch (engine) {
    case 'kokoro': {
      const voice = KOKORO_VOICES.find((v) => v.id === kokoroVoice) ?? KOKORO_VOICES[0];
      return benchmarkKokoro(text, voice.id, voice.name, kokoroDevice);
    }
    case 'piper': {
      const voice = PIPER_VOICES.find((v) => v.id === piperVoice) ?? PIPER_VOICES[0];
      return benchmarkPiper(text, voice.id, voice.name);
    }
    case 'native':
      return benchmarkNative(text);
  }
}

function playResult(row: Row, text: string) {
  if (row.result?.blob) {
    const url = URL.createObjectURL(row.result.blob);
    const audio = new Audio(url);
    audio.onended = () => URL.revokeObjectURL(url);
    audio.onerror = () => URL.revokeObjectURL(url);
    audio.play().catch(() => URL.revokeObjectURL(url));
    return;
  }
  if (row.engine === 'native' && typeof speechSynthesis !== 'undefined') {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    speechSynthesis.speak(utterance);
  }
}

export function AiModelBenchmarkPage() {
  const [text, setText] = useState(DEFAULT_TEXT);
  // Native plays the text out loud for the whole run (no way to synthesize
  // silently) and its Score is always "—" anyway, so it's opt-in.
  const [selected, setSelected] = useState<Record<BenchmarkEngine, boolean>>({ kokoro: true, piper: true, native: false });
  const [kokoroVoice, setKokoroVoice] = useState(KOKORO_VOICES[0].id);
  const [kokoroDevice, setKokoroDevice] = useState<KokoroDevice>('auto');
  const [piperVoice, setPiperVoice] = useState(PIPER_VOICES[0].id);
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);
  const [clearing, setClearing] = useState(false);
  const cancelledRef = useRef(false);

  const toggleEngine = (engine: BenchmarkEngine) =>
    setSelected((s) => ({ ...s, [engine]: !s[engine] }));

  const run = useCallback(async () => {
    if (running || !text.trim()) return;
    const engines = ENGINES.filter((e) => selected[e]);
    if (engines.length === 0) {
      toast.error('Pick at least one engine');
      return;
    }

    cancelledRef.current = false;
    setRunning(true);
    setRows(engines.map((engine) => ({ engine, status: 'queued' })));

    for (const engine of engines) {
      if (cancelledRef.current) {
        setRows((prev) => prev.map((r) => (r.engine === engine ? { ...r, status: 'skipped' } : r)));
        continue;
      }
      setRows((prev) => prev.map((r) => (r.engine === engine ? { ...r, status: 'loading' } : r)));
      try {
        const result = await runEngine(engine, text, kokoroVoice, kokoroDevice, piperVoice);
        setRows((prev) => prev.map((r) => (r.engine === engine ? { engine, status: 'done', result } : r)));
      } catch (err) {
        setRows((prev) => prev.map((r) => (
          r.engine === engine ? { engine, status: 'error', error: err instanceof Error ? err.message : String(err) } : r
        )));
      }
    }

    setRunning(false);
  }, [running, text, selected, kokoroVoice, kokoroDevice, piperVoice]);

  const stop = () => { cancelledRef.current = true; };

  const clearCaches = async () => {
    setClearing(true);
    try {
      await Promise.all([clearKokoroCache(), clearPiperCache(piperVoice)]);
      toast.success('Model caches cleared — next run downloads fresh');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to clear caches');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="max-w-page mx-auto px-4 py-8">
      <h1 className="text-lg font-bold text-text-primary mb-1">AI Model Benchmark</h1>
      <p className="text-xs text-text-muted mb-6">
        Time how long each read-aloud engine takes to load its model and to synthesize the text below.
        Not linked anywhere in the app — bookmark the URL.
      </p>

      <div className="rounded-xl border-2 border-border bg-bg-card p-4 mb-4">
        <TextareaAutosize
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_TEXT))}
          placeholder="Text to synthesize…"
          minRows={3}
          maxRows={10}
          className="w-full bg-transparent border-2 border-border rounded-xl px-4 py-3.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-orange/60 resize-none leading-relaxed"
        />
        <div className="flex items-center justify-between mt-2.5">
          <span className="text-xs text-text-muted">{text.length}/{MAX_TEXT}</span>
          <button
            onClick={() => setText(DEFAULT_TEXT)}
            className="text-xs font-medium text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
          >
            Reset to default
          </button>
        </div>
      </div>

      <div className="rounded-xl border-2 border-border bg-bg-card p-4 mb-4 space-y-3">
        {ENGINES.map((engine) => {
          const meta = ENGINE_META[engine];
          return (
            <div key={engine} className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                <input
                  type="checkbox"
                  checked={selected[engine]}
                  onChange={() => toggleEngine(engine)}
                  className="w-4 h-4 shrink-0 accent-accent-orange cursor-pointer"
                />
                <Icon icon={meta.icon} className="text-base text-accent-orange shrink-0" />
                <span className="text-sm font-bold text-text-primary shrink-0">{meta.label}</span>
                <span className="text-xs text-text-muted truncate">{meta.description}</span>
              </label>
              {engine === 'kokoro' && (
                <>
                  <Selector
                    value={kokoroDevice}
                    options={[
                      { value: 'auto', label: 'Auto (best available)' },
                      { value: 'wasm', label: 'CPU · WASM' },
                      { value: 'webgpu', label: 'GPU · WebGPU' },
                    ]}
                    onChange={setKokoroDevice}
                    ariaLabel="Kokoro compute backend"
                  />
                  <Selector
                    value={kokoroVoice}
                    options={KOKORO_VOICES.map((v) => ({ value: v.id, label: `${v.name} · ${v.accent} ${v.gender}` }))}
                    onChange={setKokoroVoice}
                    ariaLabel="Kokoro voice"
                  />
                </>
              )}
              {engine === 'piper' && (
                <Selector
                  value={piperVoice}
                  options={PIPER_VOICES.map((v) => ({ value: v.id, label: `${v.name} · ${v.accent} ${v.gender}` }))}
                  onChange={setPiperVoice}
                  ariaLabel="Piper voice"
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        {running ? (
          <button
            onClick={stop}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border-2 border-accent-red/30 bg-accent-red/10 text-accent-red hover:bg-accent-red/20 transition-all cursor-pointer"
          >
            <Icon icon="lucide:square" className="text-base" />
            Stop after current
          </button>
        ) : (
          <button
            onClick={run}
            disabled={!text.trim()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border-2 border-accent-orange bg-accent-orange text-bg-primary hover:bg-accent-orange/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            <Icon icon="lucide:play" className="text-base" />
            Run Benchmark
          </button>
        )}
        <button
          onClick={clearCaches}
          disabled={clearing || running}
          title="Delete the downloaded Kokoro and Piper model files so the next run re-downloads them"
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-medium border border-border bg-bg-tertiary text-text-secondary hover:text-text-primary disabled:opacity-50 transition-all cursor-pointer"
        >
          <Icon icon="lucide:trash-2" className="text-sm" />
          {clearing ? 'Clearing…' : 'Clear model caches'}
        </button>
      </div>

      {rows.length > 0 && (
        <div className="rounded-xl border-2 border-border bg-bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg-tertiary/50 text-left">
                  <Th>Engine</Th>
                  <Th>Score</Th>
                  <Th>Model size</Th>
                  <Th>Load</Th>
                  <Th>Voice load</Th>
                  <Th>Synthesize</Th>
                  <Th>Audio length</Th>
                  <Th>Real-time factor</Th>
                  <th className="px-4 py-2.5 text-xs font-bold text-text-muted"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const meta = ENGINE_META[row.engine];
                  const result = row.result;
                  return (
                    <tr key={row.engine} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Icon icon={meta.icon} className="text-base text-accent-orange shrink-0" />
                          <div className="min-w-0">
                            <div className="font-bold text-text-primary">{meta.label}</div>
                            <div className="text-[11px] text-text-muted truncate">
                              {row.result?.voiceLabel ?? ''}{row.result?.meta ? ` · ${row.result.meta}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      {row.status === 'loading' || row.status === 'queued' ? (
                        <td colSpan={7} className="px-4 py-3 text-text-muted">
                          <span className="flex items-center gap-2">
                            {row.status === 'loading' && (
                              <svg width="12" height="12" viewBox="0 0 24 24" className="animate-spin" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <path d="M12 2a10 10 0 0 1 10 10" />
                              </svg>
                            )}
                            {row.status === 'loading' ? (row.engine === 'native' ? 'Speaking…' : 'Loading + synthesizing…') : 'Queued…'}
                          </span>
                        </td>
                      ) : row.status === 'error' ? (
                        <td colSpan={7} className="px-4 py-3 text-accent-red text-xs">{row.error}</td>
                      ) : row.status === 'skipped' ? (
                        <td colSpan={7} className="px-4 py-3 text-text-muted text-xs">Skipped</td>
                      ) : result ? (
                        <>
                          <td className="px-4 py-3">
                            <span className={result.score !== null && result.score >= 100 ? 'text-accent-green font-bold' : 'text-text-primary font-bold'}>
                              {formatScore(result.score)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-text-secondary">{formatBytes(result.sizeBytes)}</td>
                          <td className="px-4 py-3 text-text-secondary">{formatMs(result.loadMs)}</td>
                          <td className="px-4 py-3 text-text-secondary">{formatMs(result.voiceLoadMs)}</td>
                          <td className="px-4 py-3 text-text-secondary">{formatMs(result.genMs)}</td>
                          <td className="px-4 py-3 text-text-secondary">{formatMs(result.audioDurationMs)}</td>
                          <td className="px-4 py-3">
                            <span className={result.rtf !== null && result.rtf < 1 ? 'text-accent-green font-bold' : 'text-text-secondary'}>
                              {formatRtf(result.rtf)}
                            </span>
                          </td>
                        </>
                      ) : null}
                      <td className="px-4 py-3 text-right">
                        {row.status === 'done' && (
                          <button
                            onClick={() => playResult(row, text)}
                            title="Play"
                            className="w-7 h-7 rounded-md flex items-center justify-center border border-border bg-bg-tertiary text-text-muted hover:text-accent-cyan hover:border-accent-cyan/30 transition-all cursor-pointer ml-auto"
                          >
                            <Icon icon="lucide:play" className="text-sm" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-[11px] text-text-muted mt-4 leading-relaxed">
        Hover a column header for what it measures. The browser caches model files, so a second run reads a "warm"
        Load (and Voice load); use <em>Clear model caches</em> to force a cold one.
      </p>
    </div>
  );
}
