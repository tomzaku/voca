import { useCallback, useEffect, useState } from 'react';
import { friendStatuses, type FriendStatus } from '../lib/friendsApi';

/**
 * How each person on a list stands with you, fetched once for the whole list
 * (GET /friends/status), plus a setter so a button can update its own row.
 * Signed out, it stays empty and the buttons don't show.
 */
export function useFriendStatuses(ids: string[], enabled: boolean) {
  const [statuses, setStatuses] = useState<Record<string, FriendStatus>>({});
  const key = ids.join(',');
  useEffect(() => {
    if (!enabled || !key) return;
    let alive = true;
    friendStatuses(key.split(',')).then((s) => alive && setStatuses(s));
    return () => { alive = false; };
  }, [key, enabled]);
  const set = useCallback((id: string, s: FriendStatus) => setStatuses((m) => ({ ...m, [id]: s })), []);
  return [statuses, set] as const;
}
