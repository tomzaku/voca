// Create-a-team dialog (Pro only). Kept apart from Leaderboard.tsx, which is
// already carrying the board itself, the team strip and the join flow.
//
// The Pro check here is cosmetic — the `teams` edge function re-checks
// `pro_users` before creating anything, exactly as the `ai` function does for
// its Pro actions. This only decides what's worth showing.

import { useState } from 'react';
import { Icon } from '@iconify/react';
import { useTeams } from '../hooks/useTeams';

export function TeamForm({ onClose }: { onClose: () => void }) {
  const create = useTeams((s) => s.create);
  const saving = useTeams((s) => s.saving);
  const error = useTeams((s) => s.error);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const submit = async () => {
    if (!name.trim() || saving) return;
    const ok = await create({ name: name.trim(), description: description.trim(), isPublic });
    if (ok) onClose();
  };

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
          <h3 className="font-display font-bold text-text-primary">New team</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 shrink-0 rounded-full bg-bg-tertiary text-text-muted flex items-center justify-center hover:text-text-primary cursor-pointer"
          >
            <Icon icon="lucide:x" />
          </button>
        </div>

        <label className="block text-xs font-bold text-text-secondary mb-1">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          maxLength={60}
          autoFocus
          placeholder="Class 5A"
          className="w-full rounded-xl bg-bg-tertiary border-2 border-border px-3 py-2 text-sm text-text-primary mb-3"
        />

        <label className="block text-xs font-bold text-text-secondary mb-1">
          Description <span className="font-normal text-text-muted">(optional)</span>
        </label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          maxLength={200}
          placeholder="Tuesday evening group"
          className="w-full rounded-xl bg-bg-tertiary border-2 border-border px-3 py-2 text-sm text-text-primary mb-3"
        />

        {/* Invite-only is the default, and the wording says what each choice
            actually does rather than naming a setting. */}
        <label className="flex items-start gap-2 text-xs text-text-secondary mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            Let anyone find and join this team.
            <span className="block text-text-muted">
              Off: only people you send the invite link to can join.
            </span>
          </span>
        </label>

        {error && <p className="text-xs text-accent-red mb-3">{error}</p>}

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-2 text-xs font-bold text-text-muted hover:text-text-primary cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!name.trim() || saving}
            className="btn-3d px-4 py-2 text-xs font-bold bg-accent-cyan text-bg-primary disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create team'}
          </button>
        </div>
      </div>
    </div>
  );
}
