import { useMemo } from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useCollections } from '../hooks/useCollections';
import { listCollections } from '../lib/collections';

/**
 * Browse and pick the active vocabulary collection. For now these are bundled
 * system collections (Curated + CEFR Levels 1–6); user-made and shared
 * collections come in later phases.
 */
export function CollectionsPage() {
  const activeId = useCollections((s) => s.activeId);
  const setActive = useCollections((s) => s.setActive);
  const navigate = useNavigate();
  const collections = useMemo(() => listCollections(), []);

  const pick = (id: string, name: string) => {
    setActive(id);
    toast.success(`Studying “${name}”`);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-display font-bold text-text-primary mb-1">Collections</h1>
      <p className="text-sm text-text-muted mb-6">
        Pick the set of words you want to study. Your choice syncs across devices.
      </p>

      <div className="space-y-2">
        {collections.map((c) => {
          const active = c.id === activeId;
          return (
            <button
              key={c.id}
              onClick={() => pick(c.id, c.name)}
              className={`w-full flex items-center gap-3 text-left rounded-2xl border-2 p-4 transition-all ${
                active
                  ? 'border-accent-cyan bg-accent-cyan/10'
                  : 'border-border bg-bg-card hover:border-border-light hover:-translate-y-0.5'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-display font-bold ${active ? 'text-accent-cyan' : 'text-text-primary'}`}>{c.name}</span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-bg-tertiary text-text-muted font-bold">
                    {c.count} words
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-0.5">{c.description}</p>
              </div>
              {active ? (
                <Icon icon="lucide:check-circle-2" className="text-xl text-accent-cyan shrink-0" />
              ) : (
                <Icon icon="lucide:circle" className="text-xl text-text-muted/40 shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => navigate('/')}
        className="btn-3d w-full mt-6 py-3 bg-accent-cyan text-bg-primary font-bold"
      >
        Start learning
      </button>
    </div>
  );
}
