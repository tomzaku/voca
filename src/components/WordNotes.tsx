import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface Note {
  id: string;
  word: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
  is_private: boolean;
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
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
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    setLoading(true);
    setNotes([]);

    supabase
      .from('word_notes')
      .select('*')
      .eq('word', word)
      .or(`is_private.eq.false${user ? `,user_id.eq.${user.id}` : ''}`)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setNotes(data ?? []);
        setLoading(false);
      });
  }, [word]);

  const handleSubmit = async () => {
    if (!supabase || !user || !input.trim()) return;
    setSubmitting(true);
    setError(null);

    const userName =
      user.user_metadata?.full_name ||
      user.email?.split('@')[0] ||
      'Anonymous';

    const { data, error: err } = await supabase
      .from('word_notes')
      .insert({ word, user_id: user.id, user_name: userName, content: input.trim(), is_private: isPrivate })
      .select()
      .single();

    if (err) {
      setError('Failed to post note. Try again.');
    } else if (data) {
      setNotes((prev) => [data as Note, ...prev]);
      setInput('');
      setIsPrivate(false);
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!supabase) return;
    await supabase.from('word_notes').delete().eq('id', id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  if (!supabase) return null;

  return (
    <div>
      <h3 className="text-xs font-display font-bold text-text-muted uppercase tracking-wider mb-3">
        Notes / Comments
      </h3>

      {/* Notes list */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-text-muted py-2">
          <div className="w-3 h-3 rounded-full border-2 border-accent-cyan/30 border-t-accent-cyan animate-spin" />
          Loading notes…
        </div>
      ) : notes.length > 0 ? (
        <div className="space-y-2.5 mb-4">
          {notes.map((note) => (
            <div key={note.id} className="bg-bg-tertiary rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-display font-bold shrink-0 ${avatarColor(note.user_name)}`}>
                    {note.user_name[0].toUpperCase()}
                  </div>
                  <span className="text-xs font-medium text-text-secondary">{note.user_name}</span>
                  <span className="text-xs text-text-muted">{timeAgo(note.created_at)}</span>
                  {note.is_private && (
                    <span className="text-xs text-text-muted bg-bg-secondary px-1.5 py-0.5 rounded">private</span>
                  )}
                </div>
                {user?.id === note.user_id && (
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="text-text-muted hover:text-accent-red transition-colors"
                    title="Delete note"
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
        <p className="text-sm text-text-muted mb-4 italic">No notes yet — be the first to add one.</p>
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
            placeholder="Share a tip, memory trick, or usage note… (⌘Enter to post)"
            rows={2}
            className="w-full bg-bg-tertiary border border-border rounded-xl px-4 py-3 text-text-primary text-sm focus:outline-none focus:border-accent-cyan/40 placeholder:text-text-muted transition-colors resize-none"
          />
          {error && <p className="text-xs text-accent-red">{error}</p>}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="w-3.5 h-3.5 accent-accent-cyan"
              />
              <span className="text-xs text-text-muted">Private</span>
            </label>
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || submitting}
              className="px-4 py-2 rounded-lg bg-accent-cyan text-bg-primary text-xs font-medium hover:opacity-90 disabled:opacity-40 transition-all"
            >
              {submitting ? 'Posting…' : 'Post note'}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-text-muted">
          <a href="/voca/login" className="text-accent-cyan hover:underline">Sign in</a>
          {' '}to add a note
        </p>
      )}
    </div>
  );
}
