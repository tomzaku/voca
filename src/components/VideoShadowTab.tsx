import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import TextareaAutosize from 'react-textarea-autosize';
import { Icon } from '@iconify/react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Selector } from './Selector';
import { ToggleSwitch } from './ToggleSwitch';
import { PlayButton } from './pronunciation/parts';
import { KaraokeModes, KaraokeResult, KaraokeStage, type KaraokeStep } from './KaraokePanel';
import { SentenceScorePanel } from './pronunciation/SentenceScore';
import { useYouTubePlayer } from '../hooks/useYouTubePlayer';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { useSentenceScore } from '../hooks/useSentenceScore';
import { ApiError } from '../lib/api';
import { type CaptionLine, lineAt, parseSubtitles, youtubeId } from '../lib/captions';
import { type CaptionTrack, getCaptions } from '../lib/captionsApi';
import { gradeDictation, type DictationGrade } from '../lib/listeningRules';
import { speakText, stopSpeaking } from '../lib/tts';
import { type SampleLevel, type VideoSample, VIDEO_SAMPLES } from '../data/videoSamples';
import { playCorrect, playWrong } from '../lib/sfx';
import { KARAOKE_HIT, karaokeQueue, type KaraokeSummary, type KaraokeTake, scoreAlong, summarize, turnLimitMs } from '../lib/karaoke';

// Video shadowing: paste a YouTube link — a song, a film scene, a talk — and
// practise it a caption line at a time. A line plays and the video pauses at
// its end; you say it back, and the try is graded the way the world's
// Shadowing stall grades one (word by word against the line, and sound by
// sound where the device can score pronunciation).
//
// Captions come from YouTube through the `captions` function. When it can't
// get them — no English track, or YouTube refusing the server — the learner
// pastes subtitles (.srt / .vtt) instead and they're parsed here.
//
// `?v=<id>` is the video, so a link to this page opens it again.
//
// Karaoke sings the whole song, with a score at the end (lib/karaoke), in
// one of two ways:
// - line by line, hands-free: a line plays, the video pauses, the mic opens
//   by itself and closes when you stop singing, and the next line plays.
//   With the music stopped the mic hears only you, even on speakers;
// - sing along: the song plays straight through and one recording runs the
//   whole time — with headphones on, or the mic hears the record's singer.
//   The transcript is lined up with the lyrics when the song ends.

interface Source {
  id: string;
  title: string;
  lines: CaptionLine[];
  track: CaptionTrack | null;
}

const RECENT_KEY = 'voca.videoShadow.recent';
const RECENT_MAX = 6;
const SPEEDS = [0.5, 0.75, 1];
/** A long film line said slowly. */
const MAX_LINE_MS = 20_000;

/** A karaoke turn ends this long after the singing stops… */
const KARAOKE_SILENCE = { quietMs: 1400, noVoiceMs: 6000 };
/** …and the next line plays after a beat to see the score. */
const KARAOKE_BEAT_MS = 700;

const BEST_KEY = 'voca.karaoke.best';
function readBest(id: string): number | null {
  try {
    const v = JSON.parse(localStorage.getItem(BEST_KEY) ?? '{}')?.[id];
    return typeof v === 'number' ? v : null;
  } catch {
    return null;
  }
}
function saveBest(id: string, score: number) {
  try {
    const all = JSON.parse(localStorage.getItem(BEST_KEY) ?? '{}') ?? {};
    localStorage.setItem(BEST_KEY, JSON.stringify({ ...all, [id]: score }));
  } catch { /* private mode */ }
}

/** A karaoke run: the lines to sing, where it's got to, and every take. */
interface Run {
  mode: 'line' | 'along';
  queue: number[];
  pos: number;
  step: Exclude<KaraokeStep, 'check'>;
  takes: KaraokeTake[];
  /** Turns in a row with nothing heard — two pauses the run. */
  misses: number;
  last: { grade: DictationGrade } | null;
  result: { summary: KaraokeSummary; best: number | null; newBest: boolean } | null;
  /** Sing-along: the video time the recording stopped, so only lines reached are scored. */
  stoppedAt: number | null;
}

const ALONG_NEVER_QUIET = { quietMs: Infinity, noVoiceMs: Infinity };
/** Sing-along starts this long before the first line, for the intro's last bars. */
const ALONG_LEAD_S = 3;
/** …and runs on this long after the last, for its final word. */
const ALONG_TAIL_S = 1.5;

type Recent = { id: string; title: string };
function readRecent(): Recent[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((r) => typeof r?.id === 'string').slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}
function remember(r: Recent) {
  try {
    const list = [r, ...readRecent().filter((x) => x.id !== r.id)].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch { /* private mode */ }
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

const btn = 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-bg-tertiary text-text-secondary hover:text-text-primary disabled:opacity-50 transition-all cursor-pointer';
const primary = 'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-accent-orange text-bg-primary border-accent-orange hover:bg-accent-orange/90';

/** `onTitle`: the open video's title for the page's breadcrumb, null on the list. */
export function VideoShadowTab({ onTitle }: { onTitle?: (title: string | null) => void }) {
  const intl = useIntl();
  const [searchParams, setSearchParams] = useSearchParams();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  /** Why there are no lines yet — shown above the paste box. */
  const [problem, setProblem] = useState<string | null>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [pasting, setPasting] = useState(false);
  const [recent, setRecent] = useState(readRecent);
  const abortRef = useRef<AbortController | null>(null);

  // The URL says which video is open (`?v=`), so Back returns to the list
  // and the breadcrumb's link closes it — opening one is a navigation.
  const openId = searchParams.get('v');
  const open = (raw: string) => {
    const id = youtubeId(raw);
    if (!id) { setProblem(intl.formatMessage({ id: 'speaking.videoBadLink' })); return; }
    setInput(`https://youtu.be/${id}`);
    setSearchParams({ tab: 'video', v: id });
  };

  const fetchFor = useCallback(async (id: string) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    // A sample's or a recent video's title is known before YouTube answers —
    // and stays when it doesn't.
    const sample = VIDEO_SAMPLES.find((v) => v.id === id);
    const known = (sample ? `${sample.by} – ${sample.title}` : '') || readRecent().find((r) => r.id === id)?.title || '';
    setLoading(true);
    setProblem(null);
    setPasting(false);
    setSource({ id, title: known, lines: [], track: null });
    try {
      const res = await getCaptions(id, 'en', ac.signal);
      if (ac.signal.aborted) return;
      const title = res.video.title || known;
      setSource({ id, title, lines: res.lines, track: res.track });
      if (title) { remember({ id, title }); setRecent(readRecent()); }
      if (!res.lines.length) {
        setProblem(intl.formatMessage({ id: 'speaking.videoNoCaptions' }));
        setPasting(true);
      }
    } catch (err) {
      if (ac.signal.aborted) return;
      setProblem(err instanceof ApiError && err.status !== 500
        ? err.message
        : intl.formatMessage({ id: 'speaking.videoFetchFailed' }));
      setPasting(true);
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }, [intl]);

  // Follow the URL: a new ?v= loads that video, none goes back to the list.
  const id = openId && youtubeId(openId);
  useEffect(() => {
    if (id) { void fetchFor(id); return () => abortRef.current?.abort(); }
    abortRef.current?.abort();
    // Resetting to the list is what a URL without ?v= means.
    setSource(null);
    setLoading(false);
    setPasting(false);
  }, [id, fetchFor]);

  useEffect(() => { onTitle?.(source ? source.title || '…' : null); }, [source, onTitle]);

  const usePasted = (lines: CaptionLine[]) => {
    if (!source) return;
    setSource({ ...source, lines, track: null });
    setProblem(null);
    setPasting(false);
  };

  if (!source) {
    return (
      <div>
        <p className="text-xs text-text-muted mb-3"><FormattedMessage id="speaking.videoHint" /></p>
        <form
          onSubmit={(e) => { e.preventDefault(); open(input); }}
          className="rounded-xl border-2 border-border bg-bg-card p-4 mb-4 flex flex-wrap gap-2"
        >
          <input
            value={input}
            onChange={(e) => { setInput(e.target.value); setProblem(null); }}
            placeholder={intl.formatMessage({ id: 'speaking.videoPlaceholder' })}
            inputMode="url"
            className="flex-1 min-w-0 bg-transparent border-2 border-border rounded-xl px-4 py-2.5 text-base text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-orange/60"
          />
          <button type="submit" disabled={!input.trim()} className={primary}>
            <Icon icon="lucide:clapperboard" />
            <FormattedMessage id="speaking.videoLoad" />
          </button>
          {problem && <p className="basis-full text-xs text-accent-red">{problem}</p>}
        </form>
        {recent.length > 0 && (
          <>
            <p className="text-xs font-semibold text-text-muted mb-2"><FormattedMessage id="speaking.videoRecent" /></p>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
              {recent.map((r) => (
                <button
                  key={r.id}
                  onClick={() => open(r.id)}
                  className="text-left rounded-xl border border-border bg-bg-card overflow-hidden hover:border-accent-orange/50 transition-colors cursor-pointer"
                >
                  <img src={`https://i.ytimg.com/vi/${r.id}/mqdefault.jpg`} alt="" className="w-full aspect-video object-cover bg-bg-tertiary" loading="lazy" />
                  <span className="block px-2.5 py-2 text-xs font-medium text-text-secondary line-clamp-2">{r.title}</span>
                </button>
              ))}
            </div>
          </>
        )}
        <SampleShelf kind="song" onPick={open} />
        <SampleShelf kind="talk" onPick={open} />
      </div>
    );
  }

  return (
    <VideoPractice
      key={source.id}
      source={source}
      loading={loading}
      problem={problem}
      pasting={pasting}
      onPaste={() => setPasting((p) => !p)}
      onUsePasted={usePasted}
      onClose={() => setSearchParams({ tab: 'video' })}
    />
  );
}

function VideoPractice({ source, loading, problem, pasting, onPaste, onUsePasted, onClose }: {
  source: Source;
  loading: boolean;
  problem: string | null;
  pasting: boolean;
  onPaste: () => void;
  onUsePasted: (lines: CaptionLine[]) => void;
  onClose: () => void;
}) {
  const intl = useIntl();
  const { lines } = source;
  const [at, setAt] = useState(0);
  const [pauseEach, setPauseEach] = useState(true);
  const [rate, setRate] = useState(1);
  const [grade, setGrade] = useState<DictationGrade | null>(null);
  const [heard, setHeard] = useState('');
  /** Best accuracy per line tried, for the dots in the list. */
  const [best, setBest] = useState<Record<number, number>>({});
  const line = lines[Math.min(at, lines.length - 1)] as CaptionLine | undefined;

  // The player's listeners and the recorder's callbacks outlive renders; they
  // read the current values through these.
  const live = useRef({ at, line, pauseEach, lines, recording: false });

  // The run lives in a ref as well: the player's and recorder's callbacks
  // move it on, and must see where it is now, not where it was last render.
  const runRef = useRef<Run | null>(null);
  const [run, setRunState] = useState<Run | null>(null);
  const setRun = useCallback((r: Run | null) => { runRef.current = r; setRunState(r); }, []);
  const singing = !!run && !run.result;
  /** Bumped by anything that ends or restarts a run, so a pending beat knows it's stale. */
  const runToken = useRef(0);

  const pron = useSentenceScore();
  const recorder = useVoiceRecorder({
    maxMs: MAX_LINE_MS,
    keepAudio: true,
    // A song has instrumental breaks: only a line-by-line turn ends on quiet.
    // Singing along never does, but still watches the mic for its meter.
    stopOnSilence: !singing ? undefined : run?.mode === 'line' ? KARAOKE_SILENCE : ALONG_NEVER_QUIET,
    onAudio: (blob) => {
      // Sung, not said: the sound-by-sound score is for speech.
      if (runRef.current) return;
      const l = live.current.line;
      if (l) void pron.score(blob, l.text);
    },
    onTranscript: (text) => {
      if (runRef.current) { onTake(text); return; }
      const { line: l, at: i } = live.current;
      if (!l || !text.trim()) { setHeard(''); setGrade(null); return; }
      const g = gradeDictation(l.text, text);
      (g.passed ? playCorrect : playWrong)();
      setHeard(text);
      setGrade(g);
      setBest((b) => ({ ...b, [i]: Math.max(b[i] ?? 0, g.accuracy) }));
    },
  });
  const recording = recorder.phase === 'recording';
  const busy = recorder.phase === 'requesting' || recorder.phase === 'thinking';
  const noMic = recorder.phase === 'denied' || recorder.phase === 'unsupported';
  useEffect(() => { live.current = { at, line, pauseEach, lines, recording: recording || busy }; });

  const clearTry = useCallback(() => { setGrade(null); setHeard(''); pron.reset(); }, [pron]);
  const moveTo = useCallback((i: number) => {
    if (i === live.current.at) return;
    setAt(i);
    clearTry();
  }, [clearTry]);

  const player = useYouTubePlayer(source.id, {
    onSegmentEnd: () => onLineEnd(),
    onTick: (t) => {
      // A try in progress keeps its line — except singing along, where the
      // lyrics follow the song.
      if (live.current.recording && runRef.current?.mode !== 'along') return;
      const i = lineAt(live.current.lines, t);
      if (i >= 0) moveTo(i);
    },
    // Played from the player's own controls (or Play here): line by line,
    // it stops at the end of the line it's in.
    onPlay: (t) => {
      const { pauseEach: each, lines: ls } = live.current;
      // Karaoke sets its own stops — a sing-along must never pause per line.
      if (runRef.current) return;
      if (!each || player.hasStop() || !ls.length) return;
      const i = Math.max(0, lineAt(ls, t));
      const end = t < ls[i].end - 0.15 ? ls[i].end : ls[i + 1]?.end;
      player.stopAt(end ?? null);
    },
  });

  // Again once ready: a rate set before then has no player to land on.
  const { setRate: setPlayerRate, status: playerStatus } = player;
  useEffect(() => { if (playerStatus === 'ready') setPlayerRate(rate); }, [rate, playerStatus, setPlayerRate]);

  const playLine = useCallback((i: number, stop = live.current.pauseEach) => {
    const l = live.current.lines[i];
    if (!l) return;
    if (live.current.recording) recorder.stop();
    moveTo(i);
    player.playSegment(l.start, stop ? l.end : null);
  }, [moveTo, player, recorder]);

  // ── Karaoke ──────────────────────────────────────────────────────────
  const finishRun = useCallback(() => {
    runToken.current++;
    const r = runRef.current;
    if (!r) return;
    if (recorder.phase === 'recording') recorder.stop();
    player.pause();
    if (!r.takes.length) { setRun(null); return; }
    const summary = summarize(r.takes);
    const best = readBest(source.id);
    // A best is a whole-song run's — not singing the hard lines again, nor
    // a sing-along stopped halfway.
    const whole = summary.sung === karaokeQueue(live.current.lines).length;
    const newBest = whole && (best === null || summary.score > best);
    if (newBest) saveBest(source.id, summary.score);
    setRun({ ...r, result: { summary, best, newBest } });
  }, [player, recorder, setRun, source.id]);

  /** Play the line at `pos` in the run; when it ends, the turn to sing starts. */
  const playTurn = useCallback((pos: number) => {
    const r = runRef.current;
    if (!r) return;
    if (pos >= r.queue.length) { finishRun(); return; }
    const l = live.current.lines[r.queue[pos]];
    setRun({ ...r, pos, step: 'listen' });
    moveTo(r.queue[pos]);
    player.playSegment(l.start, l.end);
  }, [finishRun, moveTo, player, setRun]);

  const startRun = useCallback((queue: number[]) => {
    if (!queue.length) return;
    runToken.current++;
    if (recorder.phase === 'recording') recorder.stop();
    clearTry();
    setRun({ mode: 'line', queue, pos: 0, step: 'listen', takes: [], misses: 0, last: null, result: null, stoppedAt: null });
    playTurn(0);
  }, [clearTry, playTurn, recorder, setRun]);

  /** Sing along: the mic opens, then the song plays through from just before its first line. */
  const startAlong = useCallback(async () => {
    const ls = live.current.lines;
    const queue = karaokeQueue(ls);
    if (!queue.length) return;
    const token = ++runToken.current;
    if (recorder.phase === 'recording') recorder.stop();
    clearTry();
    setRun({ mode: 'along', queue, pos: 0, step: 'listen', takes: [], misses: 0, last: null, result: null, stoppedAt: null });
    const from = Math.max(0, ls[queue[0]].start - ALONG_LEAD_S);
    const to = ls[queue[queue.length - 1]].end + ALONG_TAIL_S;
    // The mic first: the permission prompt would otherwise eat the opening line.
    await recorder.start({ maxMs: Math.round(((to - from) / rate + 15) * 1000) });
    const r = runRef.current;
    if (token !== runToken.current || !r || r.result) return;
    setRun({ ...r, step: 'sing' });
    player.playSegment(from, to);
  }, [clearTry, player, rate, recorder, setRun]);

  /** Sing-along over — the song ended, or Finish: stop and wait for the transcript. */
  const endAlong = useCallback(() => {
    const r = runRef.current;
    if (!r || r.mode !== 'along' || r.result || r.stoppedAt !== null) return;
    setRun({ ...r, stoppedAt: player.time() });
    player.pause();
    if (recorder.phase === 'recording') recorder.stop();
    else finishRun();
  }, [finishRun, player, recorder, setRun]);

  /** Finish, whichever mode: a sing-along is scored on what was sung so far. */
  const stopRun = useCallback(() => {
    if (runRef.current?.mode === 'along') endAlong(); else finishRun();
  }, [endAlong, finishRun]);

  const nextTurn = useCallback((delay = 0) => {
    const token = runToken.current;
    const go = () => {
      const r = runRef.current;
      if (r && !r.result && token === runToken.current) playTurn(r.pos + 1);
    };
    if (delay) setTimeout(go, delay); else go();
  }, [playTurn]);

  // The line has played: the singer's turn.
  const onLineEnd = () => {
    const r = runRef.current;
    if (r?.mode === 'along') { endAlong(); return; }
    if (!r || r.result || r.step !== 'listen') return;
    setRun({ ...r, step: 'sing' });
    void recorder.start({ maxMs: turnLimitMs(live.current.lines[r.queue[r.pos]], rate) });
  };

  // A turn's transcript: score it, and on to the next line.
  function onTake(text: string) {
    const r = runRef.current;
    if (r?.mode === 'along') { onAlongTake(text); return; }
    if (!r || r.result || r.step !== 'sing') return;
    const index = r.queue[r.pos];
    const grade = gradeDictation(live.current.lines[index].text, text);
    const accuracy = text.trim() ? grade.accuracy : 0;
    (accuracy >= KARAOKE_HIT ? playCorrect : playWrong)();
    setBest((b) => ({ ...b, [index]: Math.max(b[index] ?? 0, accuracy) }));
    const misses = text.trim() ? 0 : r.misses + 1;
    const next: Run = { ...r, takes: [...r.takes, { index, accuracy }], misses, last: { grade: { ...grade, accuracy } } };
    // Two silent turns in a row: the mic's off, or nobody's there.
    if (misses >= 2) { setRun({ ...next, step: 'paused' }); return; }
    setRun({ ...next, step: 'listen' });
    nextTurn(KARAOKE_BEAT_MS);
  }

  // The whole sing-along's transcript: every line reached, scored at once.
  function onAlongTake(text: string) {
    const r = runRef.current;
    if (!r || r.result) return;
    const ls = live.current.lines;
    const until = r.stoppedAt ?? player.time();
    // A line counts once the song got halfway into it.
    const reached = r.queue.filter((i) => ls[i].start + (ls[i].end - ls[i].start) / 2 <= until);
    const scores = scoreAlong(reached.map((i) => ls[i].text), text);
    const takes = reached.map((index, k) => ({ index, accuracy: scores[k] }));
    setBest((b) => {
      const out = { ...b };
      for (const t of takes) out[t.index] = Math.max(out[t.index] ?? 0, t.accuracy);
      return out;
    });
    setRun({ ...r, takes });
    finishRun();
  }

  const skipTurn = useCallback(() => {
    const r = runRef.current;
    if (!r || r.result || r.mode === 'along') return;
    // Mid-song, cut the turn short: what was sung so far is scored.
    if (r.step === 'sing') { recorder.stop(); return; }
    runToken.current++;
    player.pause();
    nextTurn();
  }, [nextTurn, player, recorder]);

  const resumeRun = useCallback(() => {
    const r = runRef.current;
    if (!r) return;
    runRef.current = { ...r, misses: 0 };
    nextTurn();
  }, [nextTurn]);

  // A mic refused mid-run can't sing the rest.
  useEffect(() => {
    if (noMic && runRef.current && !runRef.current.result) finishRun();
  }, [noMic, finishRun]);

  const toggleRecord = useCallback(() => {
    if (recording) { recorder.stop(); return; }
    if (busy || noMic) return;
    player.pause();
    clearTry();
    void recorder.start();
  }, [recording, busy, noMic, player, recorder, clearTry]);

  const togglePlay = () => (player.playing ? player.pause() : player.resume(null));

  // Keys, unless typing somewhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      if (e.metaKey || e.ctrlKey || e.altKey || !lines.length) return;
      if (runRef.current) {
        if (runRef.current.result) return;
        if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); skipTurn(); }
        else if (e.key === 'Escape') { e.preventDefault(); stopRun(); }
        return;
      }
      if (e.key === ' ') { e.preventDefault(); toggleRecord(); }
      else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); playLine(at, true); }
      else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); playLine(Math.min(at + 1, lines.length - 1)); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); playLine(Math.max(at - 1, 0)); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [at, lines.length, playLine, toggleRecord, skipTurn, stopRun]);

  // Keep the current line in view in the list — scrolling the list only, not the page.
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const list = listRef.current;
    const row = list?.querySelector<HTMLElement>(`[data-line="${at}"]`);
    if (!list || !row) return;
    const top = row.offsetTop - list.offsetTop;
    if (top < list.scrollTop || top + row.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTo({ top: top - list.clientHeight / 3, behavior: 'smooth' });
    }
  }, [at]);

  const tried = Object.keys(best).length;
  const passed = Object.values(best).filter((a) => a >= 90).length;
  const recordLabel = intl.formatMessage({ id: recording ? 'speaking.videoStop' : 'speaking.videoSay' });

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="flex-1" />
        {tried > 0 && (
          <span className="text-xs tabular-nums text-text-muted">
            <FormattedMessage id="speaking.videoTally" values={{ passed, tried }} />
          </span>
        )}
        <button onClick={onPaste} className={btn}>
          <Icon icon="lucide:captions" /><FormattedMessage id="speaking.videoPasteTitle" />
        </button>
        <button onClick={onClose} className={btn}>
          <Icon icon="lucide:arrow-left" /><FormattedMessage id="speaking.videoChange" />
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0">
          <div className="relative rounded-xl overflow-hidden bg-black aspect-video [&_iframe]:absolute [&_iframe]:inset-0 [&_iframe]:w-full [&_iframe]:h-full" ref={player.hostRef}>
            {player.status === 'error' && (
              <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white/80">
                <FormattedMessage id="speaking.videoPlayerError" />
              </p>
            )}
          </div>

          {pasting && <PasteCaptions videoId={source.id} problem={problem} onUse={onUsePasted} />}
          {loading && (
            <p className="mt-4 flex items-center gap-2 text-sm text-text-muted">
              <span className="w-4 h-4 rounded-full border-2 border-accent-orange/30 border-t-accent-orange animate-spin" />
              <FormattedMessage id="speaking.videoLoading" />
            </p>
          )}

          {run && !run.result && (
            <KaraokeStage
              mode={run.mode}
              lines={lines}
              queue={run.queue}
              pos={run.mode === 'along' ? alongPos(run.queue, at) : run.pos}
              step={(run.step === 'sing' || run.stoppedAt !== null) && recorder.phase === 'thinking' ? 'check' : run.step}
              level={recorder.level}
              heard={recorder.live}
              modelProgress={recorder.modelProgress}
              last={run.last}
              score={run.takes.length ? summarize(run.takes).score : null}
              onSkip={skipTurn}
              onStop={stopRun}
              onResume={resumeRun}
            />
          )}
          {run?.result && (
            <KaraokeResult
              summary={run.result.summary}
              lines={lines}
              best={run.result.best}
              newBest={run.result.newBest}
              onRetryHardest={() => startRun(run.result!.summary.hardest.map((t) => t.index).sort((a, b) => a - b))}
              onAgain={() => (run.mode === 'along' ? void startAlong() : startRun(karaokeQueue(lines)))}
              onBack={() => setRun(null)}
            />
          )}

          {line && !run && (
            <div className="mt-4 rounded-xl border-2 border-border bg-bg-card p-4">
              <div className="flex items-start gap-3">
                <p className="flex-1 text-lg leading-snug text-text-primary font-medium">{line.text}</p>
                <span className="text-xs tabular-nums text-text-muted mt-1">{at + 1} / {lines.length}</span>
              </div>
              {source.track?.auto && (
                <p className="mt-1 text-[11px] text-text-muted"><FormattedMessage id="speaking.videoAutoCaptions" /></p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <IconButton icon="lucide:skip-back" label={intl.formatMessage({ id: 'speaking.videoPrev' })} onClick={() => playLine(Math.max(at - 1, 0))} disabled={at === 0} />
                <IconButton icon="lucide:rotate-ccw" label={intl.formatMessage({ id: 'speaking.videoReplay' })} onClick={() => playLine(at, true)} />
                <IconButton icon={player.playing ? 'lucide:pause' : 'lucide:play'} label={intl.formatMessage({ id: player.playing ? 'speaking.pause' : 'speaking.play' })} onClick={togglePlay} />
                <IconButton icon="lucide:skip-forward" label={intl.formatMessage({ id: 'speaking.videoNext' })} onClick={() => playLine(Math.min(at + 1, lines.length - 1))} disabled={at >= lines.length - 1} />
                {!noMic && (
                  <button
                    onClick={toggleRecord}
                    disabled={busy}
                    aria-label={recordLabel}
                    className={`ml-auto flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition-all cursor-pointer disabled:opacity-60 ${recording
                      ? 'bg-accent-red text-bg-primary border-accent-red'
                      : 'bg-accent-orange text-bg-primary border-accent-orange hover:bg-accent-orange/90'}`}
                  >
                    {busy
                      ? <span className="w-4 h-4 rounded-full border-2 border-bg-primary/30 border-t-bg-primary animate-spin" />
                      : <Icon icon={recording ? 'lucide:square' : 'lucide:mic'} />}
                    {recordLabel}
                    <span className="opacity-60 font-normal max-sm:hidden">␣</span>
                  </button>
                )}
              </div>

              {noMic && <p className="mt-3 text-xs text-text-muted"><FormattedMessage id="speaking.videoNoMic" /></p>}
              {recording && recorder.live && <p className="mt-3 text-sm text-text-secondary italic">“{recorder.live}”</p>}
              {recorder.phase === 'thinking' && (
                <p className="mt-3 text-xs text-text-muted">
                  {recorder.modelProgress > 0 && recorder.modelProgress < 100
                    ? intl.formatMessage({ id: 'games.speakPreparingModel' }, { pct: Math.round(recorder.modelProgress) })
                    : intl.formatMessage({ id: 'games.speakChecking' })}
                </p>
              )}

              {grade && pron.state.status !== 'done' && (
                <div className="mt-3 pt-3 border-t border-border/60">
                  <p className={`text-xs font-semibold mb-2 ${grade.passed ? 'text-accent-green' : 'text-accent-orange'}`}>
                    <FormattedMessage id="listening.wordAccuracy" values={{ accuracy: grade.accuracy / 100 }} />
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {grade.words.map((w, i) => (
                      <button
                        key={i}
                        onClick={() => { stopSpeaking(); void speakText(w.word); }}
                        className={`px-2 py-0.5 rounded-md border text-sm cursor-pointer ${w.ok
                          ? 'border-accent-green/40 bg-accent-green/10 text-accent-green'
                          : 'border-accent-red/50 bg-accent-red/10 text-accent-red font-bold'}`}
                      >
                        {w.word}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <SentenceScorePanel
                state={pron.state}
                onHearWord={(w) => { stopSpeaking(); void speakText(w); }}
                className="mt-3 pt-3 border-t border-border/60"
              />
              {heard && (
                <p className="mt-2 text-xs text-text-muted">
                  <span className="font-semibold mr-1"><FormattedMessage id="speaking.videoHeard" /></span>“{heard}”
                </p>
              )}
              {recorder.audioUrl && !recording && !busy && <PlayButton url={recorder.audioUrl} />}
            </div>
          )}

          {lines.length > 0 && !singing && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-muted">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" className="sr-only" checked={pauseEach} onChange={(e) => setPauseEach(e.target.checked)} />
                <ToggleSwitch checked={pauseEach} color="bg-accent-orange" />
                <FormattedMessage id="speaking.videoPauseEach" />
              </label>
              <Selector
                value={String(rate)}
                options={SPEEDS.map((v) => ({ value: String(v), label: `${v}×` }))}
                onChange={(v) => setRate(parseFloat(v))}
                ariaLabel={intl.formatMessage({ id: 'speaking.speed' })}
              />
              <span className="max-sm:hidden"><FormattedMessage id="speaking.videoKeys" /></span>
            </div>
          )}

          {lines.length > 0 && !noMic && !run && (
            <KaraokeModes
              ready={player.status === 'ready'}
              onLineByLine={() => startRun(karaokeQueue(lines))}
              onAlong={() => void startAlong()}
            />
          )}
        </div>

        {lines.length > 0 && (
          <div ref={listRef} className="relative rounded-xl border-2 border-border bg-bg-card max-h-[32rem] lg:max-h-[calc(100vh-12rem)] overflow-y-auto">
            {lines.map((l, i) => (
              <button
                key={i}
                data-line={i}
                onClick={() => playLine(i)}
                disabled={singing}
                className={`w-full text-left flex gap-3 px-3 py-2 border-b border-border/50 last:border-b-0 transition-colors cursor-pointer disabled:cursor-default ${i === at
                  ? 'bg-accent-orange/10 text-text-primary'
                  : 'text-text-secondary hover:bg-bg-tertiary/60'}`}
              >
                <span className="shrink-0 w-10 text-[11px] tabular-nums text-text-muted pt-0.5">{clock(l.start)}</span>
                <span className="flex-1 text-sm leading-snug">{l.text}</span>
                {best[i] !== undefined && (
                  <span
                    className={`shrink-0 mt-1.5 w-2 h-2 rounded-full ${best[i] >= 90 ? 'bg-accent-green' : best[i] >= 60 ? 'bg-accent-orange' : 'bg-accent-red'}`}
                    title={`${best[i]}%`}
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const LEVEL_TONE: Record<SampleLevel, string> = {
  easy: 'bg-accent-green/15 text-accent-green',
  medium: 'bg-accent-orange/15 text-accent-orange',
  hard: 'bg-accent-red/15 text-accent-red',
};

/** One row of samples — songs or talks — easiest first. */
function SampleShelf({ kind, onPick }: { kind: VideoSample['kind']; onPick: (id: string) => void }) {
  const samples = VIDEO_SAMPLES.filter((v) => v.kind === kind);
  return (
    <section className="mt-6">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold text-text-muted mb-2">
        <Icon icon={kind === 'song' ? 'lucide:music' : 'lucide:mic-vocal'} />
        <FormattedMessage id={kind === 'song' ? 'speaking.videoSongs' : 'speaking.videoTalks'} />
      </h3>
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {samples.map((v) => (
          <button
            key={v.id}
            onClick={() => onPick(v.id)}
            className="text-left rounded-xl border border-border bg-bg-card overflow-hidden hover:border-accent-orange/50 transition-colors cursor-pointer"
          >
            <span className="relative block">
              <img src={`https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`} alt="" className="w-full aspect-video object-cover bg-bg-tertiary" loading="lazy" />
              <span className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold backdrop-blur-sm ${LEVEL_TONE[v.level]}`}>
                <FormattedMessage id={`speaking.videoLevel.${v.level}`} />
              </span>
            </span>
            <span className="block px-2.5 pt-2 text-xs font-semibold text-text-primary line-clamp-2">{v.title}</span>
            <span className="block px-2.5 pb-2 text-[11px] text-text-muted truncate">{v.by}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/** Where the song has got to in a sing-along: the last sung line at or before `at`. */
function alongPos(queue: number[], at: number): number {
  let pos = 0;
  for (let k = 0; k < queue.length && queue[k] <= at; k++) pos = k;
  return pos;
}

function IconButton({ icon, label, onClick, disabled }: { icon: string; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-border bg-bg-tertiary text-text-secondary hover:text-text-primary disabled:opacity-40 transition-all cursor-pointer"
    >
      <Icon icon={icon} className="text-base" />
    </button>
  );
}

/**
 * Captions the learner brings: a transcript copied from YouTube's own panel,
 * or an .srt / .vtt file. For when the server can't get them itself.
 */
function PasteCaptions({ videoId, problem, onUse }: { videoId: string; problem: string | null; onUse: (lines: CaptionLine[]) => void }) {
  const intl = useIntl();
  const [text, setText] = useState('');
  const [bad, setBad] = useState(false);
  const parsed = useMemo(() => (text.trim() ? parseSubtitles(text) : []), [text]);

  const use = () => {
    if (!parsed.length) { setBad(true); return; }
    onUse(parsed);
  };
  const openFile = async (file: File | undefined) => {
    if (!file) return;
    // Subtitle files are small; anything past this isn't one.
    setText((await file.slice(0, 2_000_000).text()));
    setBad(false);
  };

  return (
    <div className="mt-4 rounded-xl border-2 border-border bg-bg-card p-4">
      {problem && <p className="text-sm text-accent-orange mb-2">{problem}</p>}
      <p className="text-xs text-text-muted mb-2"><FormattedMessage id="speaking.videoPasteHint" /></p>
      <TextareaAutosize
        value={text}
        onChange={(e) => { setText(e.target.value); setBad(false); }}
        placeholder={intl.formatMessage({ id: 'speaking.videoPastePlaceholder' })}
        minRows={4}
        maxRows={12}
        className="w-full bg-transparent border-2 border-border rounded-xl px-3 py-2.5 text-sm font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-orange/60 resize-none"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button onClick={use} disabled={!text.trim()} className={primary}>
          <Icon icon="lucide:check" /><FormattedMessage id="speaking.videoUseCaptions" values={{ count: parsed.length }} />
        </button>
        <a href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noreferrer" className={btn}>
          <Icon icon="lucide:external-link" /><FormattedMessage id="speaking.videoOpenYouTube" />
        </a>
        <label className={btn}>
          <Icon icon="lucide:file-up" /><FormattedMessage id="speaking.videoOpenFile" />
          <input type="file" accept=".srt,.vtt,text/vtt,application/x-subrip" className="sr-only" onChange={(e) => void openFile(e.target.files?.[0])} />
        </label>
        {bad && <span className="text-xs text-accent-red"><FormattedMessage id="speaking.videoPasteBad" /></span>}
      </div>
    </div>
  );
}
