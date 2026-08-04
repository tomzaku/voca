// Two halves of the invite flow, side by side in the leaderboard panel:
// what an owner hands out, and where someone getting it types it in.

import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { previewCode, teamInviteUrl, TeamsError, type Team, type TeamPreview } from '../lib/teamsApi';
import { useTeams } from '../hooks/useTeams';

/**
 * The owner's invite panel. The link is the thing to hand out; the code below
 * it is for reading aloud or writing on a board, which a URL is useless for.
 *
 * Collapsed by default: an owner invites people in bursts and then looks at the
 * board every day, so the standings shouldn't be pushed down the page by a link
 * that was needed once.
 */
export function InvitePanel({ team }: { team: Team }) {
  const rotateCode = useTeams((s) => s.rotateCode);
  const saving = useTeams((s) => s.saving);
  const [open, setOpen] = useState(false);
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
    <div className="rounded-xl bg-bg-tertiary/50 px-4 py-3 flex flex-col gap-2">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 text-[11px] font-bold text-text-secondary hover:text-text-primary cursor-pointer"
      >
        <Icon
          icon="lucide:chevron-right"
          className={`transition-transform ${open ? 'rotate-90' : ''}`}
        />
        Invite people
      </button>

      {!open && (
        <p className="text-[11px] text-text-muted">
          {team.memberCount} member{team.memberCount === 1 ? '' : 's'} · share a link or the code{' '}
          <b className="text-text-secondary tracking-widest">{team.inviteCode}</b>
        </p>
      )}

      {open && (
        <>
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
        </>
      )}
    </div>
  );
}

/**
 * Where someone who was given a code puts it in — a dialog, because joining a
 * team is a once-in-a-while thing that doesn't deserve permanent space on the
 * dashboard, and because an invite link needs to announce itself somewhere the
 * user is actually looking rather than in a panel below the fold.
 *
 * Opened with a code (from a link) it names the team first: agreeing to share
 * your progress with "a team" is not the same as agreeing to share it with one
 * you can see the name of.
 */
export function TeamJoinDialog({
  initialCode = '',
  onClose,
}: {
  initialCode?: string;
  onClose: () => void;
}) {
  const joinWithCode = useTeams((s) => s.joinWithCode);
  const saving = useTeams((s) => s.saving);
  const storeError = useTeams((s) => s.error);

  const [code, setCode] = useState(initialCode);
  const [preview, setPreview] = useState<TeamPreview | null>(null);
  const [checking, setChecking] = useState(Boolean(initialCode));
  const [error, setError] = useState<string | null>(null);
  /** Set once the join lands — the dialog stays up to say where the team went. */
  const [joinedName, setJoinedName] = useState<string | null>(null);

  // Only a code that arrived with the dialog is looked up on sight; one typed
  // in is checked by the Join button, so every keystroke isn't a request.
  useEffect(() => {
    if (!initialCode) return;
    let cancelled = false;
    previewCode(initialCode)
      .then((p) => !cancelled && setPreview(p))
      .catch((e) => !cancelled && setError(e instanceof TeamsError ? e.message : 'Invite not found.'))
      .finally(() => !cancelled && setChecking(false));
    return () => {
      cancelled = true;
    };
  }, [initialCode]);

  const submit = async () => {
    if (!code.trim() || saving) return;
    setError(null);
    const ok = await joinWithCode(code.trim());
    // Closing straight away would drop the user back at the top of the page
    // with no sign anything happened — the board is far below the fold.
    if (ok) setJoinedName(preview?.name ?? 'the team');
  };

  const seeBoard = () => {
    onClose();
    document.getElementById('leaderboard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const shown = error ?? storeError;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border-2 border-border bg-bg-card shadow-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 mb-4">
          <h3 className="font-display font-bold text-text-primary">
            {joinedName ? "You're in" : preview ? "You've been invited" : 'Join a team'}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 shrink-0 rounded-full bg-bg-tertiary text-text-muted flex items-center justify-center hover:text-text-primary cursor-pointer"
          >
            <Icon icon="lucide:x" />
          </button>
        </div>

        {joinedName ? (
          <>
            <p className="text-xs text-text-secondary leading-relaxed mb-4">
              You've joined <b className="text-text-primary">{joinedName}</b>. Its board is on your
              dashboard, under your vocabulary.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={onClose}
                className="px-3 py-2 text-xs font-bold text-text-muted hover:text-text-primary cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={seeBoard}
                className="btn-3d px-4 py-2 text-xs font-bold bg-accent-cyan text-bg-primary"
              >
                See the board
              </button>
            </div>
          </>
        ) : (
          <>
            {checking && <p className="text-xs text-text-muted">Checking the invite…</p>}

            {preview && (
              <div className="rounded-xl bg-bg-tertiary/50 p-4 mb-4">
                <p className="font-display font-bold text-text-primary">{preview.name}</p>
                {preview.description && (
                  <p className="text-[11px] text-text-secondary mt-0.5">{preview.description}</p>
                )}
                <p className="text-[11px] text-text-muted mt-1 tabular-nums">
                  {preview.memberCount} member{preview.memberCount === 1 ? '' : 's'}
                </p>
              </div>
            )}

            {/* Hidden once a link has already supplied the code — there's
                nothing for the user to type at that point. */}
            {!preview && !checking && (
              <>
                <label className="block text-xs font-bold text-text-secondary mb-1">
                  Invite code
                </label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                  placeholder="ABCD2345"
                  maxLength={32}
                  autoFocus
                  className="w-full rounded-xl bg-bg-tertiary border-2 border-border px-3 py-2 text-sm tracking-widest text-text-primary mb-3"
                />
              </>
            )}

            {preview?.joined ? (
              <p className="text-xs text-accent-green mb-4">You're already in this team.</p>
            ) : (
              preview?.full && <p className="text-xs text-accent-red mb-4">This team is full.</p>
            )}

            <p className="text-[11px] text-text-muted leading-relaxed mb-4">
              Joining shares your name, avatar, score, words learned and streak with this team. You
              can leave at any time.
            </p>

            {shown && <p className="text-xs text-accent-red mb-3">{shown}</p>}

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={onClose}
                className="px-3 py-2 text-xs font-bold text-text-muted hover:text-text-primary cursor-pointer"
              >
                {preview?.joined ? 'Close' : 'Not now'}
              </button>
              {!preview?.joined && (
                <button
                  onClick={submit}
                  disabled={!code.trim() || saving || checking || preview?.full}
                  className="btn-3d px-4 py-2 text-xs font-bold bg-accent-cyan text-bg-primary disabled:opacity-50"
                >
                  {saving ? 'Joining…' : preview ? `Join ${preview.name}` : 'Join'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
