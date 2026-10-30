// What a skill's keeper says when you walk in — the one next step worth
// taking, the way a game's quest-giver points you at the next thing. Pure, so
// the rules are testable and the world (KeeperDialog) only draws them; each
// keeper (src/components/worldgames/keepers/) gathers its skill's state and
// asks its rule here.

/** How the activity you just left went, if you answered anything in it. */
export interface Recap {
  right: number;
  total: number;
  /** The activity it was. */
  from?: string;
}

export interface Advice {
  /** Message id for what the keeper says, and its values. */
  lineId: string;
  values: Record<string, string | number>;
  /** Said first when you've just come back from an activity. */
  recapId?: string;
  /** The activity the keeper suggests, and the button's message id. */
  action: string;
  actionId: string;
}

/** Any keeper's opening when you come back: how it went, a cheer if perfect. */
function withRecap(a: Omit<Advice, 'recapId'>, recap?: Recap): Advice {
  if (!recap || recap.total === 0) return a;
  return {
    ...a,
    recapId: recap.right === recap.total ? 'world.keeperRecapPerfect' : 'world.keeperRecap',
    values: { ...a.values, right: recap.right, total: recap.total },
  };
}

/** Did the activity you just left go well enough to move on from. */
const wentWell = (r: Recap | undefined, from: string) =>
  !!r && r.from === from && r.total > 0 && r.right / r.total >= 0.8;

// ── Vocabulary ──
// Pick a list if you have none (nothing else works without one), then clear
// what's due (spaced repetition only works if due words get answered), then
// learn new words from your list — or pick another once it's finished.

export interface VocabularyState {
  /** Has this learner ever chosen a collection. */
  chosen: boolean;
  /** Words due for review now. */
  due: number;
  /** The list being studied, and how much of it is done (%). */
  collection?: { name: string; pct: number };
  recap?: Recap;
}

/** Reviews in one suggested sitting — the same size as Thiên Mụ's. */
export const REVIEW_SITTING = 20;

export function vocabularyAdvice(s: VocabularyState): Advice {
  if (!s.chosen) {
    return { lineId: 'world.kvWelcome', values: {}, action: 'collections', actionId: 'world.kvPickList' };
  }
  if (s.due > 0) {
    return withRecap({
      lineId: 'world.kvDue', values: { due: s.due, n: Math.min(s.due, REVIEW_SITTING) },
      action: 'review', actionId: 'world.kvReview',
    }, s.recap);
  }
  if (s.collection && s.collection.pct >= 100) {
    return withRecap({
      lineId: 'world.kvListDone', values: { name: s.collection.name },
      action: 'collections', actionId: 'world.kvPickList',
    }, s.recap);
  }
  return withRecap({
    lineId: 'world.kvLearn', values: { name: s.collection?.name ?? '' },
    action: 'learn', actionId: 'world.kvLearnNew',
  }, s.recap);
}

// ── Speaking ──
// Everyday dialogues first — they're the conversations you'll actually have —
// then IELTS Speaking, and once you've tried them all, shadowing to polish.

export interface SpeakingState {
  dialoguesLeft: number;
  ieltsLeft: number;
  recap?: Recap;
}

export function speakingAdvice(s: SpeakingState): Advice {
  if (s.dialoguesLeft > 0) {
    return withRecap({ lineId: 'world.ksDialogue', values: { left: s.dialoguesLeft }, action: 'dialogue', actionId: 'world.ksDialogueGo' }, s.recap);
  }
  if (s.ieltsLeft > 0) {
    return withRecap({ lineId: 'world.ksIelts', values: { left: s.ieltsLeft }, action: 'ielts-speaking', actionId: 'world.ksIeltsGo' }, s.recap);
  }
  return withRecap({ lineId: 'world.ksShadow', values: {}, action: 'shadow', actionId: 'world.ksShadowGo' }, s.recap);
}

// ── Listening ──
// Warm the ears with dictation; a good dictation moves you on to a clip's
// questions, and a good clip on to an IELTS section.

export function listeningAdvice(recap?: Recap): Advice {
  if (wentWell(recap, 'comprehension')) {
    return withRecap({ lineId: 'world.klIelts', values: {}, action: 'ielts-listening', actionId: 'world.klIeltsGo' }, recap);
  }
  if (wentWell(recap, 'dictation')) {
    return withRecap({ lineId: 'world.klClip', values: {}, action: 'comprehension', actionId: 'world.klClipGo' }, recap);
  }
  return withRecap({ lineId: 'world.klDictation', values: {}, action: 'dictation', actionId: 'world.klDictationGo' }, recap);
}

// ── Writing ──
// Carve a sentence with a word you're learning — using a word is what fixes
// it (the stele picks which) — or, with no words yet, try an IELTS task.

export function writingAdvice(s: { hasWords: boolean; recap?: Recap }): Advice {
  if (s.hasWords) {
    return withRecap({ lineId: 'world.kwStele', values: {}, action: 'writing', actionId: 'world.kwSteleGo' }, s.recap);
  }
  return withRecap({ lineId: 'world.kwIelts', values: {}, action: 'ielts-writing', actionId: 'world.kwIeltsGo' }, s.recap);
}

// ── You ──
// Home: your buddy, and how many words it has grown on.

export function youAdvice(s: { name: string; known: number }): Advice {
  return { lineId: 'world.kyHome', values: { name: s.name, known: s.known }, action: 'buddy', actionId: 'world.kyBuddyGo' };
}
