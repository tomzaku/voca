import { useState } from 'react';
import { Icon } from '@iconify/react';
import { FormattedMessage, useIntl } from 'react-intl';
import toast from 'react-hot-toast';
import { useIsPro } from '../hooks/useProStatus';
import { useProgressCounts } from '../hooks/useProgressQuery';
import { QuizSetup } from './QuizSetup';
import { ParagraphGame } from './ParagraphGame';
import { WordMindMap } from './WordMindMap';
import { SpeakingPractice } from './SpeakingPractice';

type Mode = 'hub' | 'quiz' | 'paragraph' | 'mindmap' | 'speaking';

interface Tile {
  mode: Exclude<Mode, 'hub'>;
  labelId: string;
  blurbId: string;
  icon: string;
  color: 'cyan' | 'green' | 'orange' | 'purple';
  pro?: boolean;
}

const TILES: Tile[] = [
  { mode: 'quiz', labelId: 'review.tileQuiz', blurbId: 'review.tileQuizBlurb', icon: 'lucide:zap', color: 'cyan' },
  { mode: 'paragraph', labelId: 'review.tileStoryGaps', blurbId: 'review.tileStoryGapsBlurb', icon: 'lucide:book-open', color: 'green', pro: true },
  { mode: 'speaking', labelId: 'review.tileSpeaking', blurbId: 'review.tileSpeakingBlurb', icon: 'lucide:message-circle', color: 'orange', pro: true },
  { mode: 'mindmap', labelId: 'review.tileMindMap', blurbId: 'review.tileMindMapBlurb', icon: 'lucide:git-branch', color: 'purple', pro: true },
];

const COLOR_CLASSES: Record<Tile['color'], { bg: string; border: string; text: string }> = {
  cyan: { bg: 'bg-accent-cyan/10', border: 'hover:border-accent-cyan/40', text: 'text-accent-cyan' },
  green: { bg: 'bg-accent-green/10', border: 'hover:border-accent-green/40', text: 'text-accent-green' },
  orange: { bg: 'bg-accent-orange/10', border: 'hover:border-accent-orange/40', text: 'text-accent-orange' },
  purple: { bg: 'bg-accent-purple/10', border: 'hover:border-accent-purple/40', text: 'text-accent-purple' },
};

/**
 * Review — a game hub: the same four practice tools History offers inline
 * (Quiz / Story Gaps / Speaking / Mind Map), as four big entry points instead
 * of a row of small buttons. Each tool keeps and lists its own past rounds
 * (quizzes are shareable links, Story Gaps/Speaking/Mind Map save server-side)
 * so landing on a tile means "start new, or pick up one you already made."
 *
 * Unlike History's row, Review hands no word list down — each game has its
 * own Recent/Saved/Struggling/… filter picker (`useGameWordPool`), so which
 * words feed a round is a choice made inside that game, not decided upfront
 * here. The hub only needs a cheap sanity check (any words at all yet) to
 * decide whether to show the tiles or a "come back later" empty state.
 */
export function ReviewPage() {
  const intl = useIntl();
  const [mode, setMode] = useState<Mode>('hub');
  const { isPro } = useIsPro();
  const { counts } = useProgressCounts();
  const hasWords = counts.recent >= 2;

  const openTile = (tile: Tile) => {
    if (tile.pro && !isPro) {
      toast(intl.formatMessage({ id: 'review.proFeature' }, { feature: intl.formatMessage({ id: tile.labelId }) }), { icon: '👑' });
      return;
    }
    setMode(tile.mode);
  };

  if (mode === 'quiz') return <QuizSetup recordProgress onBack={() => setMode('hub')} />;
  if (mode === 'paragraph') return <ParagraphGame onBack={() => setMode('hub')} />;
  if (mode === 'mindmap') return <WordMindMap onBack={() => setMode('hub')} />;
  if (mode === 'speaking') return <SpeakingPractice onBack={() => setMode('hub')} />;

  return (
    <div className="max-w-page mx-auto px-4 py-8">
      <h1 className="font-title font-black text-2xl text-text-primary mb-1"><FormattedMessage id="review.title" /></h1>
      <p className="text-sm text-text-muted mb-6">
        <FormattedMessage id="review.intro" />
      </p>

      {!hasWords ? (
        <div className="py-16 text-center">
          <div className="text-4xl mb-4">☝️</div>
          <h2 className="text-xl font-display font-bold text-text-primary mb-2"><FormattedMessage id="review.emptyTitle" /></h2>
          <p className="text-sm text-text-muted"><FormattedMessage id="review.emptyBody" /></p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TILES.map((tile) => {
            const c = COLOR_CLASSES[tile.color];
            const locked = tile.pro && !isPro;
            return (
              <button
                key={tile.mode}
                onClick={() => openTile(tile)}
                className={`group text-left p-6 rounded-2xl border-2 border-border bg-bg-card transition-all hover:-translate-y-0.5 ${c.border}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <span className={`w-12 h-12 rounded-xl flex items-center justify-center ${c.bg} ${c.text}`}>
                    <Icon icon={locked ? 'lucide:lock' : tile.icon} className="text-2xl" />
                  </span>
                  {tile.pro && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wider ${c.bg} ${c.text}`}>
                      Pro
                    </span>
                  )}
                </div>
                <h2 className="font-title font-black text-xl text-text-primary mb-1"><FormattedMessage id={tile.labelId} /></h2>
                <p className="text-xs text-text-muted leading-relaxed"><FormattedMessage id={tile.blurbId} /></p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
