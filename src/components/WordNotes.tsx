import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FormattedMessage, useIntl, type IntlShape } from 'react-intl';
import { useAuth } from '../hooks/useAuth';
import { deleteNote, fetchNotes, postNote, type Note } from '../lib/wordNotesApi';

function timeAgo(intl: IntlShape, date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return intl.formatMessage({ id: 'bucket.agoJustNow' });
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return intl.formatMessage({ id: 'bucket.agoMinutes' }, { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return intl.formatMessage({ id: 'bucket.agoHours' }, { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 30) return intl.formatMessage({ id: 'bucket.agoDays' }, { count: days });
  return intl.formatDate(date);
}

// Consistent color per username
const avatarColors = [
  'bg-accent-cyan/20 text-accent-cyan',
  'bg-accent-purple/20 text-accent-purple',
  'bg-accent-green/20 text-accent-green',
  'bg-accent-orange/20 text-accent-orange',
  'bg-accent-blue/20 text-accent-blue',
];

function avatarColor(name: string): string {
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return avatarColors[hash % avatarColors.length];
}

interface Props {
  word: string;
}

export function WordNotes({ word }: Props) {
  const intl = useIntl();
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // A message id, so it follows a language switch while on screen.
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setNotes([]);
    let cancelled = false;
    // Which notes are visible — everyone's public ones plus your own — is the
    // server's call, so there's nothing to filter for here.
    void fetchNotes(word).then((rows) => {
      if (cancelled) return;
      setNotes(rows);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [word]);

  const handleSubmit = async () => {
    if (!user || !input.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      // The note is signed with the name on your session, server-side.
      const note = await postNote(word, input.trim(), isPrivate);
      setNotes((prev) => [note, ...prev]);
      setInput('');
      setIsPrivate(false);
    } catch {
      setError('word.notePostFailed');
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const previous = notes;
    setNotes((prev) => prev.filter((n) => n.id !== id));
    try {
      await deleteNote(id);
    } catch {
      // Put it back rather than leaving the list lying about what's stored.
      setNotes(previous);
      setError('word.noteDeleteFailed');
    }
  };

  return (
    <div>
      <h3 className="text-xs font-display font-bold text-text-muted uppercase tracking-wider mb-3">
        <FormattedMessage id="word.notesTitle" />
      </h3>

      {/* Notes list */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-text-muted py-2">
          <div className="w-3 h-3 rounded-full border-2 border-accent-cyan/30 border-t-accent-cyan animate-spin" />
          <FormattedMessage id="word.loadingNotes" />
        </div>
      ) : notes.length > 0 ? (
        <div className="space-y-2.5 mb-4">
          {notes.map((note) => (
            <div key={note.id} className="bg-bg-tertiary rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-display font-bold shrink-0 ${avatarColor(note.userName)}`}>
                    {note.userName[0].toUpperCase()}
                  </div>
                  <span className="text-xs font-medium text-text-secondary">{note.userName}</span>
                  <span className="text-xs text-text-muted">{timeAgo(intl, note.createdAt)}</span>
                  {note.isPrivate && (
                    <span className="text-xs text-text-muted bg-bg-secondary px-1.5 py-0.5 rounded"><FormattedMessage id="word.notePrivateTag" /></span>
                  )}
                </div>
                {user?.id === note.userId && (
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="text-text-muted hover:text-accent-red transition-colors"
                    title={intl.formatMessage({ id: 'word.deleteNote' })}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
              <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">{note.content}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-text-muted mb-4 italic"><FormattedMessage id="word.noNotes" /></p>
      )}

      {/* Add note */}
      {user ? (
        <div className="space-y-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
            }}
            placeholder={intl.formatMessage({ id: 'word.notePlaceholder' })}
            rows={2}
            className="w-full bg-bg-tertiary border border-border rounded-xl px-4 py-3 text-text-primary text-sm focus:outline-none focus:border-accent-cyan/40 placeholder:text-text-muted transition-colors resize-none"
          />
          {error && <p className="text-xs text-accent-red"><FormattedMessage id={error} /></p>}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="w-3.5 h-3.5 accent-accent-cyan"
              />
              <span className="text-xs text-text-muted"><FormattedMessage id="word.notePrivate" /></span>
            </label>
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || submitting}
              className="px-4 py-2 rounded-lg bg-accent-cyan text-bg-primary text-xs font-medium hover:opacity-90 disabled:opacity-40 transition-all"
            >
              <FormattedMessage id={submitting ? 'word.posting' : 'word.postNote'} />
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-text-muted">
          <FormattedMessage
            id="word.signInToNote"
            values={{ link: (c) => <Link to="/login" className="text-accent-cyan hover:underline">{c}</Link> }}
          />
        </p>
      )}
    </div>
  );
}
