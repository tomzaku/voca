import { Icon } from '@iconify/react';
import { FormattedMessage, useIntl } from 'react-intl';
import { podcasts, podcastTopics, type Podcast } from '../data/englishListening';
import { useListeningProgress } from '../hooks/useListeningProgress';
import { PodcastScript } from './PodcastScript';
import { PracticeButton } from './PracticeButton';
import { ListeningBank, type BankLabels } from './ListeningBank';
import { LEVEL_CHIPS, LEVEL_CLASS } from '../lib/listeningLevels';

// Listening → Podcasts. An episode counts as listened once it plays to the
// end, or when ticked by hand. The layout is ListeningBank's.

type Topic = (typeof podcastTopics)[number];

const TOPIC_ICON: Record<Topic, string> = {
  Technology: 'lucide:cpu',
  'Culture & Society': 'lucide:landmark',
  Science: 'lucide:flask-conical',
  Business: 'lucide:briefcase',
  Psychology: 'lucide:brain',
  Environment: 'lucide:leaf',
  Health: 'lucide:heart-pulse',
  History: 'lucide:scroll',
};
const topicIcon = (t: string) => TOPIC_ICON[t as Topic] ?? 'lucide:mic';

const LABELS: BankLabels = {
  search: 'listening.searchEpisodes',
  nextTitle: 'listening.nextEpisodeTitle',
  backToList: 'listening.backToList',
  count: 'listening.episodeCount',
  allDoneReview: 'listening.allListenedReview',
  todo: 'listening.statusTodo',
  done: 'listening.statusListened',
  markDone: 'listening.markListened',
  markNotDone: 'listening.markNotListened',
  doneAgo: 'listening.listenedAgo',
  emptyMatch: 'listening.noPodcasts',
  emptySaved: 'listening.emptySaved',
  emptyDone: 'listening.emptyListened',
  emptyTodo: 'listening.emptyTodo',
};

const chipOf = (p: Podcast) => p.level;
const matches = (p: Podcast, needle: string) =>
  p.title.toLowerCase().includes(needle) || p.description.toLowerCase().includes(needle);

export function PodcastTab() {
  const intl = useIntl();
  return (
    <ListeningBank
      items={podcasts}
      topics={podcastTopics}
      topicIcon={topicIcon}
      store={useListeningProgress}
      labels={LABELS}
      chips={LEVEL_CHIPS}
      chipOf={chipOf}
      matches={matches}
      meta={(p) => (
        <>
          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${LEVEL_CLASS[p.level]}`}>{p.level}</span>
          <span className="flex items-center gap-1 text-[11px] text-text-muted">
            <Icon icon="lucide:clock" width={11} /> {p.duration}
          </span>
        </>
      )}
      body={(p, { done, markDone }) => (
        <>
          <p className="px-3 sm:px-5 py-3 bg-bg-tertiary/50 text-xs text-text-secondary leading-relaxed">{p.description}</p>
          <PodcastScript key={p.id} id={p.id} script={p.script} onFinish={() => { if (!done) markDone(); }} />

          {p.vocabulary && p.vocabulary.length > 0 && (
            <div className="px-3 sm:px-5 py-3 bg-accent-cyan/5 border-t border-accent-cyan/10">
              <p className="text-xs font-semibold text-accent-cyan mb-2"><FormattedMessage id="listening.keyVocabulary" /></p>
              <div className="space-y-1.5">
                {p.vocabulary.map((v, i) => (
                  <div key={i} className="flex items-baseline gap-2">
                    <span className="text-xs font-medium text-text-primary">{v.word}</span>
                    <span className="text-[11px] text-text-muted">— {v.definition}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {p.discussionQuestions && p.discussionQuestions.length > 0 && (
            <div className="px-3 sm:px-5 py-3 bg-accent-yellow/5 border-t border-accent-yellow/10">
              <p className="text-xs font-semibold text-accent-yellow mb-2"><FormattedMessage id="listening.discussionQuestions" /></p>
              <ul className="space-y-1">
                {p.discussionQuestions.map((q, i) => (
                  <li key={i} className="text-xs text-text-secondary flex items-start gap-2">
                    <span className="text-accent-yellow/60 mt-0.5 shrink-0">{i + 1}.</span>
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
      actions={(p) => (
        <PracticeButton
          topic={p.topic}
          focus={p.discussionQuestions?.[0] ?? `What are your thoughts on the podcast "${p.title}"?`}
          label={intl.formatMessage({ id: 'listening.discussEpisode' })}
        />
      )}
      topicAction={(t) => <PracticeButton topic={t} label={intl.formatMessage({ id: 'listening.practiceThisTopic' })} />}
    />
  );
}
