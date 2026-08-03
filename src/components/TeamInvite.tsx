// Two halves of the invite flow, side by side in the leaderboard panel:
// what an owner hands out, and where someone getting it types it in.

import { useState } from 'react';
import { Icon } from '@iconify/react';
import { teamInviteUrl, type Team } from '../lib/teamsApi';
import { useTeams } from '../hooks/useTeams';

/**
 * The owner's invite panel. The link is the thing to hand out; the code below
 * it is for reading aloud or writing on a board, which a URL is useless for.
 */
export function InvitePanel({ team }: { team: Team }) {
  const rotateCode = useTeams((s) => s.rotateCode);
  const saving = useTeams((s) => s.saving);
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (!team.inviteCode) return null;
  const url = teamInviteUrl(team.inviteCode);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure context, or the user said no) — the link is
      // on screen and selectable, so there's nothing to recover from.
    }
  };

  return (
    <div className="rounded-xl bg-bg-tertiary/50 p-4 flex flex-col gap-2">
      <p className="text-[11px] font-bold text-text-secondary">Invite people</p>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="flex-1 min-w-0 rounded-lg bg-bg-card border border-border px-2 py-1.5 text-[11px] text-text-muted"
        />
        <button
          onClick={copy}
          className="btn-3d shrink-0 px-3 py-1.5 text-[11px] font-bold bg-accent-cyan text-bg-primary"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p className="text-[11px] text-text-muted">
        Or have them enter the code{' '}
        <b className="text-text-primary tracking-widest">{team.inviteCode}</b>
      </p>

      {/* Rotating invalidates every link already sent, so it asks first. */}
      {confirming ? (
        <p className="text-[11px] text-text-secondary">
          Every link and code you've shared will stop working.{' '}
          <button
            onClick={async () => {
              await rotateCode(team.id);
              setConfirming(false);
            }}
            disabled={saving}
            className="font-bold text-accent-red hover:underline cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Working…' : 'Do it'}
          </button>
          {' · '}
          <button
            onClick={() => setConfirming(false)}
            className="font-bold text-text-muted hover:underline cursor-pointer"
          >
            Cancel
          </button>
        </p>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="self-start text-[11px] font-bold text-text-muted hover:text-text-primary cursor-pointer"
        >
          Get a new code
        </button>
      )}
    </div>
  );
}

/** Where someone who was given a code puts it in. */
export function JoinByCode({ initialCode = '' }: { initialCode?: string }) {
  const joinWithCode = useTeams((s) => s.joinWithCode);
  const saving = useTeams((s) => s.saving);
  const [code, setCode] = useState(initialCode);

  const submit = async () => {
    if (!code.trim() || saving) return;
    const ok = await joinWithCode(code.trim());
    if (ok) setCode('');
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1 min-w-0">
        <Icon
          icon="lucide:ticket"
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted"
        />
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Invite code"
          aria-label="Invite code"
          maxLength={32}
          className="w-full rounded-xl bg-bg-tertiary border-2 border-border pl-8 pr-3 py-2 text-xs tracking-widest text-text-primary"
        />
      </div>
      <button
        onClick={submit}
        disabled={!code.trim() || saving}
        className="btn-3d shrink-0 px-3 py-2 text-xs font-bold bg-bg-tertiary text-text-secondary disabled:opacity-50"
      >
        {saving ? '…' : 'Join'}
      </button>
    </div>
  );
}
