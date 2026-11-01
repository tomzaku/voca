import { useState } from 'react';
import { Icon } from '@iconify/react';
import { useIntl } from 'react-intl';

/**
 * A name with a pencil beside it: tap to fix it in place. Enter saves,
 * Escape puts it back. Used for a guest student's own name on their phone,
 * and for the teacher renaming a student in the lobby.
 */
export function EditableName({ name, onSave, className = '', inputClassName = '' }: {
  name: string;
  /** Resolves true once saved; false keeps the box open to try again. */
  onSave: (name: string) => Promise<boolean>;
  className?: string;
  inputClassName?: string;
}) {
  const intl = useIntl();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const next = value.trim();
    if (!next || next === name) { setEditing(false); setValue(name); return; }
    setBusy(true);
    const ok = await onSave(next);
    setBusy(false);
    if (ok) setEditing(false);
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => { setValue(name); setEditing(true); }}
        className={`group inline-flex items-center gap-1.5 min-w-0 text-left ${className}`}
        title={intl.formatMessage({ id: 'hunt.rename' })}
      >
        <span className="truncate">{name}</span>
        <Icon icon="lucide:pencil" className="shrink-0 text-[0.75em] opacity-60 group-hover:opacity-100" aria-label={intl.formatMessage({ id: 'hunt.rename' })} />
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); void save(); }}
      className="inline-flex items-center gap-1 min-w-0"
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape') { setEditing(false); setValue(name); } }}
        maxLength={30}
        autoFocus
        disabled={busy}
        aria-label={intl.formatMessage({ id: 'hunt.rename' })}
        className={`min-w-0 w-40 rounded-lg px-2 py-1 bg-bg-tertiary border-2 border-accent-cyan text-text-primary text-sm font-bold focus:outline-none ${inputClassName}`}
      />
      <button type="submit" disabled={busy} className="p-1.5 rounded-lg bg-accent-cyan text-bg-primary disabled:opacity-40" aria-label={intl.formatMessage({ id: 'hunt.editor.save' })}>
        <Icon icon="lucide:check" />
      </button>
    </form>
  );
}
