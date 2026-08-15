import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import type { Components } from 'react-markdown';
import { useAuth } from '../hooks/useAuth';
import { useIsPro } from '../hooks/useProStatus';
import { allTemplates, useWritingTemplates, type AnyWritingTemplate } from '../hooks/useWritingTemplates';
import { callAiAction } from '../lib/aiProviders';
import { ApiError } from '../lib/api';

const MAX_TEXT = 6000;
const MAX_NAME = 60;
const MAX_INSTRUCTIONS = 2000;
const MAX_DESCRIPTION = 200;

function isDefault(t: AnyWritingTemplate): t is AnyWritingTemplate & { isDefault: true } {
  return 'isDefault' in t && t.isDefault === true;
}

/** ChatGPT URL pre-filled with the template + text, for free accounts (no server call). */
function chatGptImproveWritingUrl(instructions: string, text: string): string {
  const prompt = `${instructions}\n\nText:\n"""\n${text}\n"""`;
  return `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`;
}

// ─── Markdown result rendering — themed to match the app's text tokens ─────
const MARKDOWN_COMPONENTS: Components = {
  h1: (p) => <h3 className="font-bold text-base mt-3 mb-1.5 text-text-primary" {...p} />,
  h2: (p) => <h3 className="font-bold text-sm mt-3 mb-1 text-text-primary" {...p} />,
  h3: (p) => <h4 className="font-bold text-sm mt-2 mb-1 text-text-primary" {...p} />,
  p: (p) => <p className="text-base text-text-secondary leading-relaxed mb-2" {...p} />,
  strong: (p) => <strong className="text-text-primary" {...p} />,
  ul: (p) => <ul className="list-disc ml-4 mb-2 space-y-0.5" {...p} />,
  ol: (p) => <ol className="list-decimal ml-4 mb-2 space-y-0.5" {...p} />,
  li: (p) => <li className="text-base text-text-secondary leading-relaxed" {...p} />,
  code: (p) => <code className="px-1 py-0.5 rounded bg-bg-tertiary text-accent-cyan text-xs font-code" {...p} />,
  blockquote: (p) => <blockquote className="border-l-2 border-border pl-3 italic text-text-muted" {...p} />,
  a: (p) => <a className="text-accent-cyan underline" target="_blank" rel="noopener noreferrer" {...p} />,
  hr: () => <hr className="border-border my-3" />,
};

/** Inline create/edit form for a custom template — `editingId` set = editing. */
function TemplateForm({ editingId, initialName = '', initialInstructions = '', initialDescription = '', onDone }: {
  editingId: string | null;
  initialName?: string;
  initialInstructions?: string;
  initialDescription?: string;
  onDone: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [instructions, setInstructions] = useState(initialInstructions);
  const [description, setDescription] = useState(initialDescription);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Give your template a name.'); return; }
    if (!instructions.trim()) { toast.error('Add instructions for the AI to follow.'); return; }
    setSaving(true);
    try {
      if (editingId) {
        await useWritingTemplates.getState().updateTemplate(editingId, name.trim(), instructions.trim(), description.trim());
        toast.success(`Updated “${name.trim()}”`);
      } else {
        const created = await useWritingTemplates.getState().createTemplate(name.trim(), instructions.trim(), description.trim());
        toast.success(`Created “${created.name}”`);
      }
      onDone();
    } catch (err) {
      toast.error((err as Error).message || 'Could not save template.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card-game border-accent-cyan mb-3 p-4 space-y-3 animate-fade-in">
      {editingId && (
        <p className="text-xs font-bold text-accent-cyan uppercase tracking-wider">Editing template</p>
      )}
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Template name (e.g. Standup Update)"
        maxLength={MAX_NAME}
        className="w-full bg-bg-tertiary border-2 border-border rounded-xl px-3.5 py-2.5 text-base text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-cyan/60"
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Short description (optional) — shown when browsing templates"
        maxLength={MAX_DESCRIPTION}
        className="w-full bg-bg-tertiary border-2 border-border rounded-xl px-3.5 py-2.5 text-base text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-cyan/60"
      />
      <textarea
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        placeholder="Instructions for the AI — e.g. 'Rewrite this as a concise, upbeat standup update...'"
        rows={4}
        maxLength={MAX_INSTRUCTIONS}
        className="w-full bg-bg-tertiary border-2 border-border rounded-xl px-3.5 py-2.5 text-base text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-cyan/60 resize-y leading-relaxed"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted">{instructions.length}/{MAX_INSTRUCTIONS}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={onDone}
            className="px-3 py-2 text-sm font-bold text-text-muted hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-3d px-4 py-2 text-sm bg-accent-cyan text-bg-primary font-bold disabled:opacity-60"
          >
            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Improve Writing (Pro): paste text, pick a template (5 built-in + your own),
 * and get an AI-revised version back. Templates are managed inline here —
 * they only matter in the context of using them.
 */
export function ImproveWritingPage() {
  const { user } = useAuth();
  const { isPro, loading: proLoading } = useIsPro();
  const custom = useWritingTemplates((s) => s.custom);
  const templates = useMemo(() => allTemplates(custom), [custom]);

  useEffect(() => {
    if (user) void useWritingTemplates.getState().fetchMine();
  }, [user]);

  const [selectedId, setSelectedId] = useState('default-general');
  const selected = templates.find((t) => t.id === selectedId) ?? templates[0];
  const [detailOpen, setDetailOpen] = useState(false);

  const [text, setText] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  // ── Template management (create/edit) ──
  const [form, setForm] = useState<{ editingId: string | null; name: string; instructions: string; description: string } | null>(null);
  const openCreate = () => setForm({ editingId: null, name: '', instructions: '', description: '' });
  const openEdit = (t: AnyWritingTemplate) =>
    setForm({ editingId: t.id, name: t.name, instructions: t.instructions, description: t.description ?? '' });
  const closeForm = () => setForm(null);
  const [menuId, setMenuId] = useState<string | null>(null);

  const handleDelete = async (t: AnyWritingTemplate) => {
    if (!window.confirm(`Delete “${t.name}”? This can't be undone.`)) return;
    try {
      await useWritingTemplates.getState().deleteTemplate(t.id);
      if (selectedId === t.id) setSelectedId('default-general');
      toast.success(`Deleted “${t.name}”`);
    } catch (err) {
      toast.error((err as Error).message || 'Could not delete.');
    }
  };

  const locked = !proLoading && !isPro;

  const handleSubmit = async () => {
    if (locked) {
      toast(
        user ? 'Improve Writing is a Pro feature.' : 'Sign in with a Pro account to improve your writing.',
        { icon: '👑' },
      );
      return;
    }
    if (!text.trim()) { toast.error('Paste some text to improve first.'); return; }
    if (!selected) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setResult(null);
    try {
      const text_ = await callAiAction(
        'improve_writing',
        { instructions: selected.instructions, text: text.trim() },
        { signal: controller.signal },
      );
      setResult(text_);
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
      else if ((err as Error).name !== 'AbortError') toast.error('Could not reach the AI. Try again.');
    } finally {
      setLoading(false);
    }
  };

  // Free alternative, open to everyone (not just locked accounts) — no server
  // call, so no Pro gate applies here either.
  const handleOpenChatGpt = () => {
    if (!text.trim()) { toast.error('Paste some text to improve first.'); return; }
    if (!selected) return;
    window.open(chatGptImproveWritingUrl(selected.instructions, text.trim()), '_blank', 'noopener,noreferrer');
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    toast.success('Copied!');
  };

  return (
    <div className="mx-auto max-w-page px-4 py-8">
      <h1 className="text-2xl font-display font-bold text-text-primary mb-1">Improve Writing</h1>
      <p className="text-sm text-text-muted mb-6">
        Paste your text, pick a template, and get an AI-revised version — tuned for Slack, email, Jira, or however you write.
      </p>

      {/* ── Template picker ── */}
      <section className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider">Template</h2>
          <button
            onClick={() => (form ? closeForm() : openCreate())}
            className="flex items-center gap-1 text-xs font-bold text-accent-cyan hover:underline"
          >
            <Icon icon={form ? 'lucide:x' : 'lucide:plus'} />
            {form ? 'Cancel' : 'New template'}
          </button>
        </div>

        {form && (
          <TemplateForm
            editingId={form.editingId}
            initialName={form.name}
            initialInstructions={form.instructions}
            initialDescription={form.description}
            onDone={closeForm}
          />
        )}

        <div className="flex flex-wrap gap-2">
          {templates.map((t) => {
            const active = t.id === selectedId;
            return (
              <div key={t.id} className="relative">
                <button
                  onClick={() => setSelectedId(t.id)}
                  title={t.description ?? t.name}
                  className={`flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full text-xs font-bold border transition-all ${
                    active
                      ? 'border-accent-cyan bg-accent-cyan/15 text-accent-cyan'
                      : 'border-border bg-bg-card text-text-secondary hover:border-border-light'
                  }`}
                >
                  {t.name}
                  {!isDefault(t) && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); setMenuId(menuId === t.id ? null : t.id); }}
                      className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-bg-tertiary"
                    >
                      <Icon icon="lucide:ellipsis-vertical" className="text-[11px]" />
                    </span>
                  )}
                </button>
                {menuId === t.id && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setMenuId(null)} />
                    <div className="absolute left-0 top-9 z-40 w-36 rounded-xl border-2 border-border bg-bg-card shadow-xl overflow-hidden animate-fade-in">
                      <button
                        onClick={() => { setMenuId(null); openEdit(t); }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors"
                      >
                        <Icon icon="lucide:pencil" className="text-sm" /> Edit
                      </button>
                      <button
                        onClick={() => { setMenuId(null); handleDelete(t); }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-text-muted hover:bg-accent-red/10 hover:text-accent-red transition-colors"
                      >
                        <Icon icon="lucide:trash-2" className="text-sm" /> Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {selected && (
          <div className="mt-2">
            <button
              onClick={() => setDetailOpen((o) => !o)}
              className="flex items-center gap-1 text-xs font-bold text-text-muted hover:text-text-primary transition-colors"
            >
              <Icon icon={detailOpen ? 'lucide:chevron-up' : 'lucide:chevron-down'} className="text-sm" />
              {detailOpen ? 'Hide' : 'Show'} template details
            </button>
            {detailOpen && (
              <div className="mt-2 p-3 rounded-xl bg-bg-tertiary/60 border border-border space-y-1.5 animate-fade-in">
                {selected.description && (
                  <p className="text-xs font-bold text-text-secondary">{selected.description}</p>
                )}
                <p className="text-xs text-text-muted whitespace-pre-wrap leading-relaxed">{selected.instructions}</p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Input ── */}
      <section className="mb-4">
        <div className="card-game border-accent-cyan p-3 sm:p-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_TEXT))}
            placeholder="Paste the text you want to improve…"
            rows={8}
            className="w-full bg-bg-tertiary border-2 border-border rounded-xl px-4 py-3.5 text-base text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-cyan/60 resize-y leading-relaxed"
          />
          <div className="flex items-center justify-between mt-2.5">
            <span className="text-xs text-text-muted">{text.length}/{MAX_TEXT}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenChatGpt}
                disabled={!text.trim()}
                title="Open this template + text in ChatGPT — free, no account needed"
                className="btn-3d px-4 py-2.5 text-sm bg-bg-card text-text-secondary font-bold border-2 border-border disabled:opacity-60 flex items-center gap-2"
              >
                <Icon icon="lucide:external-link" /> ChatGPT
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !text.trim()}
                className="btn-3d px-5 py-2.5 text-base bg-accent-cyan text-bg-primary font-bold disabled:opacity-60 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Icon icon="lucide:loader-2" className="animate-spin" /> Improving…
                  </>
                ) : (
                  <>
                    <Icon icon="lucide:wand-2" /> Improve
                    {locked && (
                      <span className="text-[9px] px-1 py-px rounded bg-bg-primary/20 font-extrabold uppercase tracking-wider">
                        Pro
                      </span>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Result ── */}
      {result && (
        <section className="card-game border-accent-green p-4 sm:p-5 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider">Result</h2>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-xs font-bold text-accent-cyan hover:underline"
            >
              <Icon icon="lucide:copy" /> Copy
            </button>
          </div>
          <div>
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={MARKDOWN_COMPONENTS}>
              {result}
            </ReactMarkdown>
          </div>
        </section>
      )}
    </div>
  );
}
