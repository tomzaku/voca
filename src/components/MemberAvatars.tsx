import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { supabase } from '../lib/supabase';

export interface MemberProgress {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  done: number;
  total: number;
}

/** One member avatar wrapped in a conic progress ring; hover shows name + %. */
export function MemberRing({ m, size = 'w-9 h-9' }: { m: MemberProgress; size?: string }) {
  const pct = m.total > 0 ? Math.round((m.done / m.total) * 100) : 0;
  const name = m.display_name || 'Learner';
  const deg = pct * 3.6;
  return (
    <div
      title={`${name} — ${pct}%`}
      className={`${size} rounded-full p-[3px] shrink-0`}
      style={{
        background: `conic-gradient(var(--color-accent-green, #34e39b) ${deg}deg, var(--color-border, #444) ${deg}deg)`,
      }}
    >
      <span className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-bg-card">
        {m.avatar_url ? (
          <img src={m.avatar_url} alt={name} className="w-full h-full object-cover rounded-full" />
        ) : (
          <span className="text-[11px] font-extrabold text-accent-purple">
            {name[0]?.toUpperCase() ?? '?'}
          </span>
        )}
      </span>
    </div>
  );
}

/**
 * Avatars of everyone who joined a collection, each wrapped in a progress ring
 * showing how far through the collection they are (hover for name + percent).
 * A "Members" button opens the full list. Public collections only (the RPC
 * refuses otherwise).
 */
export function MemberAvatars({ collectionId, name, openSignal = 0 }: {
  collectionId: string;
  name: string;
  /** Bump to open the full members modal from outside (e.g. a ⋯ menu item). */
  openSignal?: number;
}) {
  const [members, setMembers] = useState<MemberProgress[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    supabase.rpc('collection_members_progress', { cid: collectionId }).then(({ data, error }) => {
      if (cancelled || error || !data) return;
      setMembers(data as MemberProgress[]);
    });
    return () => { cancelled = true; };
  }, [collectionId]);

  useEffect(() => {
    if (openSignal > 0) setShowAll(true);
  }, [openSignal]);

  if (members.length === 0) return null;

  const shown = members.slice(0, 6);
  const extra = members.length - shown.length;

  return (
    <div className="flex items-center gap-1.5 mt-2">
      {shown.map((m) => <MemberRing key={m.user_id} m={m} />)}
      {extra > 0 && <span className="text-[11px] font-bold text-text-muted">+{extra}</span>}

      {showAll && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in cursor-default"
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); setShowAll(false); }}
        >
          <div
            className="w-full max-w-sm rounded-2xl border-2 border-border bg-bg-card shadow-2xl p-5 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 mb-4">
              <h3 className="font-display font-bold text-text-primary truncate">Members — {name}</h3>
              <button
                onClick={() => setShowAll(false)}
                className="w-8 h-8 shrink-0 rounded-full bg-bg-tertiary text-text-muted flex items-center justify-center hover:text-text-primary"
                title="Close"
              >
                <Icon icon="lucide:x" />
              </button>
            </div>
            <ul className="space-y-2.5">
              {members.map((m) => {
                const pct = m.total > 0 ? Math.round((m.done / m.total) * 100) : 0;
                return (
                  <li key={m.user_id} className="flex items-center gap-3">
                    <MemberRing m={m} size="w-10 h-10" />
                    <span className="flex-1 min-w-0 text-sm font-bold text-text-primary truncate">
                      {m.display_name || 'Learner'}
                    </span>
                    <span className={`text-xs font-extrabold shrink-0 ${pct >= 100 ? 'text-accent-green' : 'text-text-muted'}`}>
                      {pct}%
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
