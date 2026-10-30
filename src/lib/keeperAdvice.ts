// What a skill's keeper says when you walk in — the one next step worth
// taking, the way a game's quest-giver points you at the next thing. Pure, so
// the rules are testable and the world (KeeperDialog) only draws them.
//
// Vocabulary's order: pick a list if you have none (nothing else works
// without one), then clear what's due (spaced repetition only works if due
// words get answered), then learn new words from your list — or pick another
// once it's finished.

export interface VocabularyState {
  /** Has this learner ever chosen a collection. */
  chosen: boolean;
  /** Words due for review now. */
  due: number;
  /** The list being studied, and how much of it is done (%). */
  collection?: { name: string; pct: number };
  /** How the activity you just left went, if you answered anything. */
  recap?: { right: number; total: number };
}

export interface Advice {
  /** Message id (world catalog) for what the keeper says, and its values. */
  lineId: string;
  values: Record<string, string | number>;
  /** Said first when you've just come back from an activity. */
  recapId?: string;
  /** The activity the keeper suggests, and the button's message id. */
  action: string;
  actionId: string;
}

/** Reviews in one suggested sitting — the same size as Thiên Mụ's. */
export const REVIEW_SITTING = 20;

export function vocabularyAdvice(s: VocabularyState): Advice {
  const recapId = s.recap && s.recap.total > 0
    ? (s.recap.right === s.recap.total ? 'world.kvRecapPerfect' : 'world.kvRecap')
    : undefined;
  const recapValues: Record<string, number> = s.recap ? { right: s.recap.right, total: s.recap.total } : {};

  if (!s.chosen) {
    return { lineId: 'world.kvWelcome', values: {}, action: 'collections', actionId: 'world.kvPickList' };
  }
  if (s.due > 0) {
    return {
      lineId: 'world.kvDue', values: { ...recapValues, due: s.due, n: Math.min(s.due, REVIEW_SITTING) },
      recapId, action: 'review', actionId: 'world.kvReview',
    };
  }
  if (s.collection && s.collection.pct >= 100) {
    return {
      lineId: 'world.kvListDone', values: { ...recapValues, name: s.collection.name },
      recapId, action: 'collections', actionId: 'world.kvPickList',
    };
  }
  return {
    lineId: 'world.kvLearn', values: { ...recapValues, name: s.collection?.name ?? '' },
    recapId, action: 'learn', actionId: 'world.kvLearnNew',
  };
}
