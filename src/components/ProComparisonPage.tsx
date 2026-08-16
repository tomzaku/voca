import { Icon } from '@iconify/react';
import { useIsPro } from '../hooks/useProStatus';

// Every row Pro unlocks today — kept in sync with the actual gates:
// EnglishPractice/PracticeButton (AI conversation), HistoryPage (Story Gaps,
// Speaking dialogues, Mind Map), FlashCard (word doodles), ImproveWritingPage,
// and Leaderboard (creating a team). Free rows are what's ungated everywhere
// else in the app.
const ROWS: { label: string; detail: string; free: boolean; pro: boolean }[] = [
  { label: 'Flashcards & vocabulary practice', detail: 'The core learning loop, unlimited.', free: true, pro: true },
  { label: 'History, quizzes & collections', detail: 'Track progress and build word sets.', free: true, pro: true },
  { label: 'Join a team', detail: 'Via an invite code or link.', free: true, pro: true },
  { label: 'AI conversation practice', detail: 'Live spoken/typed practice, corrected turn by turn.', free: false, pro: true },
  { label: 'Story Gaps', detail: 'A fresh AI-written short story built from your words.', free: false, pro: true },
  { label: 'Speaking dialogues', detail: 'An AI conversation script that weaves in your words.', free: false, pro: true },
  { label: 'Interactive Mind Map', detail: 'An in-app word map, drawn and explorable.', free: false, pro: true },
  { label: 'AI word doodles', detail: 'A generated picture on every flash card.', free: false, pro: true },
  { label: 'Improve Writing', detail: 'AI feedback and rewrites on your own text.', free: false, pro: true },
  { label: 'Create a team', detail: 'Start your own leaderboard and invite others.', free: false, pro: true },
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
          You're on your Pro trial — <span className="font-bold">{left} day{left === 1 ? '' : 's'} left</span>.
        </span>
      </div>
    );
  }

  if (isPro) {
    return (
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-accent-green/10 border border-accent-green/20 text-sm text-accent-green">
        <Icon icon="lucide:crown" className="text-base shrink-0" />
        <span className="font-bold">You have Pro.</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-bg-tertiary border border-border text-sm text-text-secondary">
      <Icon icon="lucide:circle" className="text-base shrink-0" />
      <span>You're on the Free plan.</span>
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
        <h1 className="text-xl font-display font-bold text-text-primary">Free vs Pro</h1>
        <p className="text-sm text-text-muted max-w-sm">
          Pro adds every AI-powered feature — live practice, generated stories, dialogues, mind maps and more.
        </p>
      </div>

      <StatusBanner />

      <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 px-4 py-2.5 border-b border-border bg-bg-tertiary text-[11px] font-bold uppercase tracking-wider text-text-muted">
          <span>Feature</span>
          <span className="w-10 text-center">Free</span>
          <span className="w-10 text-center">Pro</span>
        </div>
        <div className="divide-y divide-border">
          {ROWS.map((row) => (
            <div key={row.label} className="grid grid-cols-[1fr_auto_auto] gap-x-3 px-4 py-3 items-start">
              <div>
                <p className="text-sm text-text-primary font-medium">{row.label}</p>
                <p className="text-xs text-text-muted mt-0.5">{row.detail}</p>
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
