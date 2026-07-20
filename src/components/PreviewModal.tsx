import { Icon } from '@iconify/react';

/** Up to `n` random words from a list, for the preview modal. */
export function sampleWords(words: string[], n = 20): string[] {
  const a = [...words];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

/** Modal showing a random sample of a collection's words. */
export function PreviewModal({ name, total, words, onReshuffle, onClose }: {
  name: string;
  total: number;
  words: string[];
  onReshuffle: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-bg-card shadow-2xl p-5 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 mb-1">
          <h3 className="font-display font-bold text-text-primary truncate">{name}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 shrink-0 rounded-full bg-bg-tertiary text-text-muted flex items-center justify-center hover:text-text-primary"
            title="Close"
          >
            <Icon icon="lucide:x" />
          </button>
        </div>
        <p className="text-xs text-text-muted mb-3">
          {words.length} of {total} words, picked at random
        </p>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {words.map((w) => (
            <span key={w} className="text-xs px-2.5 py-1 rounded-full bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20">
              {w}
            </span>
          ))}
        </div>
        <button
          onClick={onReshuffle}
          className="flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-accent-cyan transition-colors"
        >
          <Icon icon="lucide:shuffle" />
          Show different words
        </button>
      </div>
    </div>
  );
}
