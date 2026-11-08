import { QUESTIONS, type LadderQuestion, type QLevel, type QType, type Text } from './ladderQuestions';

// The Quốc Học ladder: fifteen questions to the top, five easy, five medium,
// five hard. A wrong answer drops you to the last safe rung you passed (the
// 5th and the 10th); you can stop before any question and keep what you've
// climbed. Three helps, once each a game: take away two wrong answers, ask
// the class (a show of hands, surer on easy questions), or swap the question
// for another of its level. Pure — the screen is worldgames/QuocHocLadder.
//
// Two ranges: medium → expert (the default — grown-ups found the easy rungs a
// formality), and easy → hard, which a child can climb.

export type Lifeline = 'half' | 'class' | 'swap';
export type LadderType = QType | 'all';
export type LadderRange = 'starter' | 'challenge';

export const RANGES: LadderRange[] = ['challenge', 'starter'];
/** The three levels a range climbs through, five rungs each. */
export const RANGE_LEVELS: Record<LadderRange, readonly [QLevel, QLevel, QLevel]> = {
  starter: ['easy', 'medium', 'hard'],
  challenge: ['medium', 'hard', 'expert'],
};

export const RUNG_COUNT = 15;
/** Points at each rung, bottom first. */
export const RUNG_POINTS = [10, 20, 30, 50, 100, 150, 200, 300, 500, 800, 1200, 1800, 2500, 3500, 5000] as const;
/** Rungs (0-based) you can't fall below once passed. */
export const SAFE_RUNGS = [4, 9] as const;
export const LIFELINES: Lifeline[] = ['half', 'class', 'swap'];

export function levelOf(rung: number, range: LadderRange = 'starter'): QLevel {
  return RANGE_LEVELS[range][rung < 5 ? 0 : rung < 10 ? 1 : 2];
}

/** A question as it's asked: its options in this game's order. */
export interface Asked {
  question: LadderQuestion;
  options: Text[];
  answer: number;
}

export interface LadderGame {
  type: LadderType;
  range: LadderRange;
  /** The question on each rung. */
  ladder: Asked[];
  /** One unused question per level, for the swap. */
  spares: Partial<Record<QLevel, Asked>>;
  /** The rung being asked (0-based); RUNG_COUNT once you're at the top. */
  rung: number;
  used: Lifeline[];
  /** Options the half took away from this question. */
  hidden: number[];
  /** The class's show of hands on this question, in percent per option. */
  poll: number[] | null;
  over: null | { how: 'top' | 'wrong' | 'stopped'; points: number };
}

export function say(t: Text, locale: string): string {
  return typeof t === 'string' ? t : locale.startsWith('vi') ? t[1] : t[0];
}

function shuffled<T>(xs: readonly T[], rand: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function ask(question: LadderQuestion, rand: () => number): Asked {
  const order = shuffled([0, 1, 2, 3], rand);
  return { question, options: order.map((i) => question.options[i]), answer: order.indexOf(0) };
}

/** The questions a ladder of this type draws from. */
export function poolOf(type: LadderType): LadderQuestion[] {
  return type === 'all' ? QUESTIONS : QUESTIONS.filter((q) => q.type === type);
}

export function newLadder(type: LadderType, range: LadderRange = 'starter', rand: () => number = Math.random): LadderGame {
  const pool = poolOf(type);
  const ladder: Asked[] = [];
  const spares: LadderGame['spares'] = {};
  for (const level of RANGE_LEVELS[range]) {
    const picked = shuffled(pool.filter((q) => q.level === level), rand).slice(0, 6);
    ladder.push(...picked.slice(0, 5).map((q) => ask(q, rand)));
    if (picked[5]) spares[level] = ask(picked[5], rand);
  }
  return { type, range, ladder, spares, rung: 0, used: [], hidden: [], poll: null, over: null };
}

/** What you'd leave with if you stopped now. */
export function banked(g: LadderGame): number {
  return g.rung > 0 ? RUNG_POINTS[g.rung - 1] : 0;
}

/** What a wrong answer now would leave you with. */
export function floorPoints(g: LadderGame): number {
  const safe = [...SAFE_RUNGS].reverse().find((r) => r < g.rung);
  return safe === undefined ? 0 : RUNG_POINTS[safe];
}

export function current(g: LadderGame): Asked | null {
  return g.over ? null : g.ladder[g.rung] ?? null;
}

/** Answers the question on the current rung. */
export function answer(g: LadderGame, choice: number): { game: LadderGame; correct: boolean } {
  const q = current(g);
  if (!q || g.hidden.includes(choice)) return { game: g, correct: false };
  const correct = choice === q.answer;
  if (!correct) return { correct, game: { ...g, over: { how: 'wrong', points: floorPoints(g) } } };
  const rung = g.rung + 1;
  const top = rung === RUNG_COUNT;
  return {
    correct,
    game: { ...g, rung, hidden: [], poll: null, over: top ? { how: 'top', points: RUNG_POINTS[RUNG_COUNT - 1] } : null },
  };
}

/** Stops climbing, keeping the last rung passed. */
export function stop(g: LadderGame): LadderGame {
  return g.over ? g : { ...g, over: { how: 'stopped', points: banked(g) } };
}

export function canUse(g: LadderGame, l: Lifeline): boolean {
  if (g.over || g.used.includes(l)) return false;
  if (l === 'swap') return !!g.spares[levelOf(g.rung, g.range)];
  return true;
}

/** Takes away two wrong answers. */
export function takeHalf(g: LadderGame, rand: () => number = Math.random): LadderGame {
  const q = current(g);
  if (!q || !canUse(g, 'half')) return g;
  const wrong = shuffled([0, 1, 2, 3].filter((i) => i !== q.answer), rand).slice(0, 2);
  // A poll taken before the half keeps its hands, minus those on the two gone.
  const poll = g.poll && renormalise(g.poll.map((p, i) => (wrong.includes(i) ? 0 : p)));
  return { ...g, used: [...g.used, 'half'], hidden: wrong, poll };
}

function renormalise(ps: number[]): number[] {
  const sum = ps.reduce((a, b) => a + b, 0) || 1;
  const out = ps.map((p) => Math.round((p / sum) * 100));
  const drift = 100 - out.reduce((a, b) => a + b, 0);
  out[out.indexOf(Math.max(...out))] += drift;
  return out;
}

/** The share of the class that knows the answer, by level. */
const CLASS_KNOWS: Record<QLevel, [number, number]> = { easy: [0.6, 0.85], medium: [0.4, 0.65], hard: [0.25, 0.45], expert: [0.15, 0.35] };

/** The class votes: some know the answer, the rest guess among what's left. */
export function askClass(g: LadderGame, rand: () => number = Math.random): LadderGame {
  const q = current(g);
  if (!q || !canUse(g, 'class')) return g;
  const [lo, hi] = CLASS_KNOWS[q.question.level];
  const know = lo + rand() * (hi - lo);
  const open = [0, 1, 2, 3].filter((i) => !g.hidden.includes(i));
  const guesses = open.map(() => 0.2 + rand());
  const total = guesses.reduce((a, b) => a + b, 0);
  const raw = [0, 0, 0, 0];
  open.forEach((i, k) => { raw[i] = (1 - know) * (guesses[k] / total) + (i === q.answer ? know : 0); });
  return { ...g, used: [...g.used, 'class'], poll: renormalise(raw) };
}

/** Swaps the current question for the spare of its level. */
export function swapQuestion(g: LadderGame): LadderGame {
  if (!canUse(g, 'swap')) return g;
  const level = levelOf(g.rung, g.range);
  const ladder = [...g.ladder];
  ladder[g.rung] = g.spares[level]!;
  return { ...g, ladder, spares: { ...g.spares, [level]: undefined }, used: [...g.used, 'swap'], hidden: [], poll: null };
}

const BEST_KEY = 'voca-quochoc-ladder-best';
const RANGE_KEY = 'voca-quochoc-ladder-range';

/** Where a best is kept: the starter range under the bare type, as it was
 *  before there were ranges, so old records still count. */
export const bestKey = (type: LadderType, range: LadderRange) => (range === 'starter' ? type : `${type}:${range}`);

/** The most points kept from a ladder of each type and range, on this device. */
export function bestScores(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(BEST_KEY) ?? '{}') ?? {};
  } catch {
    return {};
  }
}

/** Records a finished game; true when it beat the best for its type and range. */
export function recordScore(type: LadderType, range: LadderRange, points: number): boolean {
  const best = bestScores();
  const key = bestKey(type, range);
  if (points <= (best[key] ?? 0)) return false;
  try { localStorage.setItem(BEST_KEY, JSON.stringify({ ...best, [key]: points })); } catch { /* private mode: no record kept */ }
  return true;
}

/** The range last chosen on this device, so grown-ups needn't pick it each time. */
export function savedRange(): LadderRange {
  try { return localStorage.getItem(RANGE_KEY) === 'starter' ? 'starter' : 'challenge'; } catch { return 'challenge'; }
}

export function saveRange(range: LadderRange) {
  try { localStorage.setItem(RANGE_KEY, range); } catch { /* private mode: picked again next time */ }
}
