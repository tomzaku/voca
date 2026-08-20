import { Icon } from '@iconify/react';

/**
 * Modal shown when loading a word's data fails. Replaces a toast because a
 * toast disappears before anyone reads it and gives up the second the card is
 * stuck on a spinner — this states the actual error and offers to try again
 * without losing the learner's place.
 */
export function LoadErrorDialog({ message, onRetry, onDismiss }: {
  message: string;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onDismiss}
      role="dialog"
      aria-modal="true"
      aria-labelledby="load-error-title"
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-bg-card shadow-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-2 text-accent-red">
          <Icon icon="lucide:alert-triangle" className="text-xl shrink-0" />
          <h3 id="load-error-title" className="font-display font-bold text-text-primary">
            Couldn't load word
          </h3>
        </div>
        <p className="text-sm text-text-muted mb-4 break-words">{message}</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onDismiss}
            className="px-3 py-2 rounded-xl text-sm font-bold text-text-muted hover:text-text-primary transition-colors"
          >
            Dismiss
          </button>
          <button
            onClick={onRetry}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-accent-cyan text-white hover:brightness-110 transition"
          >
            <Icon icon="lucide:refresh-cw" />
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}
