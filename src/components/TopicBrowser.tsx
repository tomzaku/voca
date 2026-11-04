import { useEffect } from 'react';
import { Icon } from '@iconify/react';
import { FormattedMessage, useIntl } from 'react-intl';

// The frame shared by the practice banks — Speaking's Short Conversation and
// Listening's Podcasts: a progress overview and a topic list with per-topic
// progress, in a sidebar on desktop and a bottom sheet on mobile. Each tab
// owns its own data, filters and cards; this is only the navigation chrome.

export function Bar({ done, total, className = '' }: { done: number; total: number; className?: string }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className={`h-1.5 rounded-full bg-bg-tertiary overflow-hidden ${className}`}>
      <div className="h-full rounded-full bg-accent-green transition-all duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Overview({ done, total, saved, thisWeek }: { done: number; total: number; saved: number; thisWeek: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="rounded-xl border border-border bg-bg-card p-4">
      <div className="flex items-end justify-between gap-3 mb-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted"><FormattedMessage id="conversation.yourProgress" /></p>
          <p className="text-2xl font-extrabold text-text-primary leading-tight">
            {done}<span className="text-sm font-semibold text-text-muted"> / {total}</span>
          </p>
        </div>
        <span className="text-sm font-bold text-accent-green">{pct}%</span>
      </div>
      <Bar done={done} total={total} />
      <div className="flex items-center gap-4 mt-3 text-[11px] text-text-muted">
        <span className="flex items-center gap-1"><Icon icon="lucide:flame" className="text-accent-orange" /><FormattedMessage id="conversation.thisWeek" values={{ count: thisWeek }} /></span>
        <span className="flex items-center gap-1"><Icon icon="lucide:bookmark" className="text-accent-yellow" /><FormattedMessage id="conversation.savedCount" values={{ count: saved }} /></span>
      </div>
    </div>
  );
}

export interface TopicRow<K extends string> {
  key: K;
  label: string;
  icon: string;
  done: number;
  total: number;
}

/** `groups` without a label render as one plain list. */
export function TopicNav<K extends string>({ active, all, groups, onSelect }: {
  active: K | 'all';
  all: { done: number; total: number };
  groups: { label?: string; topics: TopicRow<K>[] }[];
  onSelect: (t: K | 'all') => void;
}) {
  const intl = useIntl();
  const row = ({ key, label, icon, done, total }: TopicRow<K | 'all'>) => {
    const on = active === key;
    const complete = total > 0 && done === total;
    return (
      <button
        key={key}
        onClick={() => onSelect(key)}
        aria-current={on ? 'true' : undefined}
        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${
          on ? 'bg-accent-green/10 text-text-primary' : 'text-text-secondary hover:bg-bg-hover/60'
        }`}
      >
        <span className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
          on ? 'bg-accent-green/20 text-accent-green' : 'bg-bg-tertiary text-text-muted'
        }`}>
          <Icon icon={complete ? 'lucide:check' : icon} width={14} />
        </span>
        <span className="flex-1 min-w-0">
          <span className={`block text-[13px] truncate ${on ? 'font-semibold' : 'font-medium'}`}>{label}</span>
          <Bar done={done} total={total} className="mt-1 h-1" />
        </span>
        <span className="text-[11px] tabular-nums text-text-muted shrink-0">{done}/{total}</span>
      </button>
    );
  };

  return (
    <nav className="space-y-4">
      {row({ key: 'all', label: intl.formatMessage({ id: 'conversation.allTopics' }), icon: 'lucide:layout-grid', ...all })}
      {groups.map((g, i) => (
        <div key={g.label ?? i}>
          {g.label && <p className="px-2.5 mb-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">{g.label}</p>}
          <div className="space-y-0.5">{g.topics.map(row)}</div>
        </div>
      ))}
    </nav>
  );
}

export function TopicSheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  const intl = useIntl();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={intl.formatMessage({ id: 'conversation.chooseTopic' })}>
      <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] flex flex-col rounded-t-2xl border-t border-border bg-bg-primary animate-fade-in">
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-border">
          <span className="text-sm font-bold text-text-primary"><FormattedMessage id="conversation.topics" /></span>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:bg-bg-hover cursor-pointer" aria-label={intl.formatMessage({ id: 'conversation.close' })}>
            <Icon icon="lucide:x" width={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-2 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  );
}

/** Mobile only: the current topic and its progress, opening the sheet. */
export function TopicPickerButton({ icon, label, done, total, onClick }: {
  icon: string; label: string; done: number; total: number; onClick: () => void;
}) {
  return (
    <div className="lg:hidden mb-3">
      <button
        onClick={onClick}
        className="w-full flex items-center gap-3 rounded-xl border border-border bg-bg-card px-3 py-2.5 text-left cursor-pointer active:scale-[0.99] transition-transform"
      >
        <span className="w-9 h-9 rounded-lg bg-accent-green/15 text-accent-green flex items-center justify-center shrink-0">
          <Icon icon={icon} width={18} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-text-primary truncate">{label}</span>
          <span className="flex items-center gap-2 mt-1">
            <Bar done={done} total={total} className="flex-1" />
            <span className="text-[11px] tabular-nums text-text-muted">{done}/{total}</span>
          </span>
        </span>
        <Icon icon="lucide:chevrons-up-down" width={16} className="text-text-muted shrink-0" />
      </button>
    </div>
  );
}
