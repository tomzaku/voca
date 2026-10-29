import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { FormattedMessage } from 'react-intl';
import { getCollection, DEFAULT_COLLECTION_ID } from '../../lib/collections';
import { topicCover } from '../../lib/topicTheme';
import { LevelPicker } from '../LevelPicker';

// The topics offered up front — broad, everyday ones a beginner recognises.
// The rest are a tap away on /collections.
const STARTER_TOPICS = [
  'topic-travel',
  'topic-food',
  'topic-routine',
  'topic-feelings',
  'topic-shopping',
  'topic-health',
];

/**
 * First-visit card shown in place of the flash card, so a new learner sees
 * that there's a choice of what to study before the first word appears.
 * Every path ends in `onPick(collectionId)` — including "just start", which
 * picks the default collection so the card doesn't come back.
 */
export function StartPicker({ onPick }: { onPick: (collectionId: string, label: string) => void }) {
  const [testing, setTesting] = useState(false);

  if (testing) {
    return (
      <div className="max-w-lg mx-auto card-game border-accent-purple p-5 sm:p-6 animate-fade-in">
        <LevelPicker
          onBack={() => setTesting(false)}
          onDone={(result) => onPick(result.collectionId, result.label)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto card-game border-accent-purple p-5 sm:p-6 animate-fade-in">
      <h2 className="text-xl font-display font-bold text-text-primary">
        <FormattedMessage id="flashcard.start.title" />
      </h2>
      <p className="text-sm text-text-muted mt-1 mb-5">
        <FormattedMessage id="flashcard.start.subtitle" />
      </p>

      <button
        onClick={() => setTesting(true)}
        className="btn-3d w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-accent-cyan text-bg-primary text-left"
      >
        <Icon icon="lucide:target" className="text-2xl shrink-0" />
        <span className="flex-1 min-w-0">
          <span className="block font-bold"><FormattedMessage id="flashcard.start.findLevel" /></span>
          <span className="block text-xs opacity-80"><FormattedMessage id="flashcard.start.findLevelHint" /></span>
        </span>
        <Icon icon="lucide:chevron-right" className="text-xl shrink-0" />
      </button>

      <p className="text-xs font-bold uppercase tracking-wide text-text-muted mt-6 mb-2">
        <FormattedMessage id="flashcard.start.orTopic" />
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {STARTER_TOPICS.map((id) => {
          const topic = getCollection(id);
          return (
            <button
              key={id}
              onClick={() => onPick(id, topic.name)}
              style={topicCover(id)}
              className="btn-3d flex items-center gap-2 px-3 py-2.5 rounded-xl text-white text-sm font-bold text-left"
            >
              {topic.icon && <Icon icon={topic.icon} className="text-lg shrink-0" />}
              <span className="truncate">{topic.name}</span>
            </button>
          );
        })}
      </div>
      <Link
        to="/collections"
        className="inline-flex items-center gap-1 mt-3 text-sm font-bold text-accent-purple hover:brightness-110"
      >
        <FormattedMessage id="flashcard.start.allTopics" />
        <Icon icon="lucide:arrow-right" />
      </Link>

      <div className="border-t border-border mt-5 pt-4 text-center">
        <button
          onClick={() => onPick(DEFAULT_COLLECTION_ID, getCollection(DEFAULT_COLLECTION_ID).name)}
          className="text-sm font-bold text-text-muted hover:text-text-primary"
        >
          <FormattedMessage id="flashcard.start.justStart" />
        </button>
      </div>
    </div>
  );
}
