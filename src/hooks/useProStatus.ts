// Pro account status. A user is Pro when they have a row in `pro_users`
// (granted manually — see the pro_users migration) that hasn't expired:
// `expires_at` NULL means a lifetime grant, otherwise Pro lasts until that
// moment. This hook is only for showing/hiding UI: the real enforcement
// happens server-side in the `ai` edge function, which re-checks the table
// (including expiry) before running pro-only actions.

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

interface ProStatus {
  isPro: boolean;
  /** ISO timestamp the grant ends, or null for lifetime / not pro. */
  expiresAt: string | null;
}

const NOT_PRO: ProStatus = { isPro: false, expiresAt: null };

/** True if the grant row (or cached copy) is currently active. */
function isActive(expiresAt: string | null): boolean {
  return !expiresAt || new Date(expiresAt) > new Date();
}

// Per-user result cache so navigating between pages doesn't re-query. We cache
// the raw expiry and re-evaluate `isActive` on every mount, so a grant that
// lapses mid-session flips to non-pro without a refetch.
const proCache = new Map<string, ProStatus>();

function fromCache(userId: string | undefined): ProStatus | undefined {
  if (!userId) return undefined;
  const hit = proCache.get(userId);
  if (!hit) return undefined;
  return hit.isPro && !isActive(hit.expiresAt) ? NOT_PRO : hit;
}

export function useIsPro(): ProStatus & { loading: boolean } {
  const { user } = useAuth();
  const cached = fromCache(user?.id);
  const [status, setStatus] = useState<ProStatus>(cached ?? NOT_PRO);
  const [loading, setLoading] = useState(Boolean(user) && cached === undefined);

  useEffect(() => {
    if (!user || !supabase) {
      setStatus(NOT_PRO);
      setLoading(false);
      return;
    }
    const hit = fromCache(user.id);
    if (hit !== undefined) {
      setStatus(hit);
      setLoading(false);
      return;
    }
    let cancelled = false;
    supabase
      .from('pro_users')
      .select('expires_at')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        const expiresAt = (data?.expires_at as string | null | undefined) ?? null;
        const next: ProStatus = data && isActive(expiresAt) ? { isPro: true, expiresAt } : NOT_PRO;
        // On error, treat as not-pro but don't cache — retry on next mount.
        if (!error) proCache.set(user.id, next);
        if (!cancelled) {
          setStatus(next);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { ...status, loading };
}
