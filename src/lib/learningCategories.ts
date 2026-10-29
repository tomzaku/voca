// The category taxonomy for an AI-flagged correction — shared by English
// Practice's "learnings" drawer (see ../hooks/useLearnings.ts) and Improve
// Writing's per-revision corrections list (see ./improveWritingApi.ts).
// One place for the icon/color/label so the two features read as one system.
//
// `labelId` is a message id, formatted at render time.

export type LearningCategory = 'grammar' | 'vocabulary' | 'rephrase' | 'tip';

type CategoryConfig = {
  icon: string;
  labelId: string;
  color: string;
  bg: string;
  border: string;
};

export const CATEGORY_CONFIG: Record<LearningCategory, CategoryConfig> = {
  grammar:    { icon: '📝', labelId: 'word.categoryGrammar',    color: 'text-accent-red',    bg: 'bg-accent-red/8',    border: 'border-accent-red/20' },
  vocabulary: { icon: '📖', labelId: 'word.categoryVocabulary', color: 'text-accent-cyan',   bg: 'bg-accent-cyan/8',   border: 'border-accent-cyan/20' },
  rephrase:   { icon: '🔄', labelId: 'word.categoryRephrase',   color: 'text-accent-purple', bg: 'bg-accent-purple/8', border: 'border-accent-purple/20' },
  tip:        { icon: '💡', labelId: 'word.categoryTip',        color: 'text-accent-yellow', bg: 'bg-accent-yellow/8', border: 'border-accent-yellow/20' },
};
