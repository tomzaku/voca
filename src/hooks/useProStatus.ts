// Pro account status — one field of the `me` resource, which is where the
// server's facts about the signed-in user live. A user is Pro when they have a
// grant that hasn't expired; `proExpiresAt` null means lifetime.
//
// This hook is only for showing/hiding UI: the real enforcement happens
// server-side, where every paid action re-checks before spending anything.

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { fetchMe, type Me } from '../lib/meApi';
import { useAuth } from './useAuth';

const NOT_PRO: Me = { isPro: false, proExpiresAt: null };

/** True if the grant (or its cached copy) is currently active. */
function isActive(expiresAt: string | null): boolean {
  return !expiresAt || new Date(expiresAt) > new Date();
}

// Per-user result cache so navigating between pages doesn't re-query. We cache
// the raw expiry and re-evaluate `isActive` on every mount, so a grant that
// lapses mid-session flips to non-pro without a refetch.
const meCache = new Map<string, Me>();

function fromCache(userId: string | undefined): Me | undefined {
  if (!userId) return undefined;
  const hit = meCache.get(userId);
  if (!hit) return undefined;
  return hit.isPro && !isActive(hit.proExpiresAt) ? NOT_PRO : hit;
}

export function useIsPro(): Me & { loading: boolean } {
  const { user } = useAuth();
  const cached = fromCache(user?.id);
  const [status, setStatus] = useState<Me>(cached ?? NOT_PRO);
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
    void fetchMe().then((res) => {
      const next: Me = res ?? NOT_PRO;
      // Unreachable reads as not-pro but isn't cached — retry on next mount.
      if (res) meCache.set(user.id, next);
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
