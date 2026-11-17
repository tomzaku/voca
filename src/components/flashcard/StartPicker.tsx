import { getCollection, DEFAULT_COLLECTION_ID } from '../../lib/collections';
import { CourseSetup } from '../course/CourseSetup';

/**
 * First-visit card shown in place of the flash card: the course setup, so a
 * new learner leaves with a goal and a plan rather than a menu of shortcuts.
 * Every path ends in `onPick(collectionId)` — including "skip", which picks
 * the default collection so the card doesn't come back.
 */
export function StartPicker({ onPick }: { onPick: (collectionId: string, label: string) => void }) {
  return (
    <div className="max-w-lg mx-auto card-game border-accent-purple p-5 sm:p-6 animate-fade-in">
      <CourseSetup
        onDone={onPick}
        onSkip={() => onPick(DEFAULT_COLLECTION_ID, getCollection(DEFAULT_COLLECTION_ID).name)}
      />
    </div>
  );
}
