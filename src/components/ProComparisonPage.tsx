import { Icon } from '@iconify/react';
import { FormattedMessage } from 'react-intl';
import { useIsPro } from '../hooks/useProStatus';

// Every row Pro unlocks today — kept in sync with the actual gates:
// EnglishPractice/PracticeButton (AI conversation), HistoryPage (Story Gaps,
// Speaking dialogues, Mind Map), FlashCard (word doodles), ImproveWritingPage,
// and Leaderboard (creating a team). Free rows are what's ungated everywhere
// else in the app. Each row's label/detail are `pro.<key>` / `pro.<key>Detail`.
const ROWS: { key: string; free: boolean; pro: boolean }[] = [
  { key: 'rowFlashcards', free: true, pro: true },
  { key: 'rowHistory', free: true, pro: true },
  { key: 'rowJoinTeam', free: true, pro: true },
  { key: 'rowConversation', free: false, pro: true },
  { key: 'rowStoryGaps', free: false, pro: true },
  { key: 'rowDialogues', free: false, pro: true },
  { key: 'rowMindMap', free: false, pro: true },
  { key: 'rowDoodles', free: false, pro: true },
  { key: 'rowImproveWriting', free: false, pro: true },
  { key: 'rowCreateTeam', free: false, pro: true },
];

function daysLeft(expiresAt: string): number {
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

function StatusBanner() {
  const { isPro, isTrial, proExpiresAt, loading } = useIsPro();
  if (loading) return null;

  if (isTrial && proExpiresAt) {
    const left = daysLeft(proExpiresAt);
    return (
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-accent-cyan/10 border border-accent-cyan/20 text-sm text-accent-cyan">
        <Icon icon="lucide:sparkles" className="text-base shrink-0" />
        <span>
          <FormattedMessage
            id="pro.trialBanner"
            values={{ count: left, b: (chunks) => <span className="font-bold">{chunks}</span> }}
          />
        </span>
      </div>
    );
  }

  if (isPro) {
    return (
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-accent-green/10 border border-accent-green/20 text-sm text-accent-green">
        <Icon icon="lucide:crown" className="text-base shrink-0" />
        <span className="font-bold"><FormattedMessage id="pro.youHavePro" /></span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-bg-tertiary border border-border text-sm text-text-secondary">
      <Icon icon="lucide:circle" className="text-base shrink-0" />
      <span><FormattedMessage id="pro.freePlan" /></span>
    </div>
  );
}

function Mark({ on }: { on: boolean }) {
  return on ? (
    <Icon icon="lucide:check" className="text-accent-green text-base" />
  ) : (
    <Icon icon="lucide:minus" className="text-text-muted/40 text-base" />
  );
}

export function ProComparisonPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-6">
      <div className="text-center flex flex-col items-center gap-3">
        <span className="w-12 h-12 rounded-full bg-accent-green/15 text-accent-green flex items-center justify-center">
          <Icon icon="lucide:crown" className="text-2xl" />
        </span>
        <h1 className="text-xl font-display font-bold text-text-primary"><FormattedMessage id="pro.title" /></h1>
        <p className="text-sm text-text-muted max-w-sm">
          <FormattedMessage id="pro.subtitle" />
        </p>
      </div>

      <StatusBanner />

      <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 px-4 py-2.5 border-b border-border bg-bg-tertiary text-[11px] font-bold uppercase tracking-wider text-text-muted">
          <span><FormattedMessage id="pro.feature" /></span>
          <span className="w-10 text-center"><FormattedMessage id="pro.free" /></span>
          <span className="w-10 text-center">Pro</span>
        </div>
        <div className="divide-y divide-border">
          {ROWS.map((row) => (
            <div key={row.key} className="grid grid-cols-[1fr_auto_auto] gap-x-3 px-4 py-3 items-start">
              <div>
                <p className="text-sm text-text-primary font-medium"><FormattedMessage id={`pro.${row.key}`} /></p>
                <p className="text-xs text-text-muted mt-0.5"><FormattedMessage id={`pro.${row.key}Detail`} /></p>
              </div>
              <span className="w-10 flex justify-center pt-0.5"><Mark on={row.free} /></span>
              <span className="w-10 flex justify-center pt-0.5"><Mark on={row.pro} /></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
