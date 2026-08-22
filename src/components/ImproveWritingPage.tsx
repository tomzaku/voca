import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import TextareaAutosize from 'react-textarea-autosize';
import { useAuth } from '../hooks/useAuth';
import { useIsPro } from '../hooks/useProStatus';
import { allTemplates, useWritingTemplates, type AnyWritingTemplate } from '../hooks/useWritingTemplates';
import { useWritingPrefs, WRITING_CORRECTION_CATEGORIES, type WritingCorrectionCategory } from '../hooks/useWritingPrefs';
import { ApiError } from '../lib/api';
import { CATEGORY_CONFIG } from '../lib/learningCategories';
import {
  improveWriting,
  type ImproveWritingOption,
  type ImproveWritingResult,
  type WritingCorrection,
} from '../lib/improveWritingApi';
import { diffOption } from '../lib/textDiff';

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

/** Section heading + copy for each correction category, in display order. */
const SECTION_TITLES: Record<WritingCorrectionCategory, string> = {
  grammar: 'Fix Grammar',
  vocabulary: 'Improve Word Choice',
  rephrase: 'Rephrase',
};

/** A change span that explains itself on hover (desktop) or tap (touch,
 *  where hover doesn't exist) — the "why" behind a change, without making
 *  the paragraph read like a list of footnotes. */
function ChangeSpan({ correction, children }: {
  correction: WritingCorrection;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  // Closes on a tap/click anywhere else — the only way a touch device (no
  // hover, no blur-on-mouseleave) can dismiss it.
  useEffect(() => {
    if (!open) return;
    const onOutside = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onOutside);
    return () => document.removeEventListener('pointerdown', onOutside);
  }, [open]);

  const config = CATEGORY_CONFIG[correction.category];

  return (
    <span ref={ref} className="relative inline-block">
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
        className="cursor-help"
      >
        {children}
      </span>
      {open && (
        <span className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-60 max-w-[75vw] rounded-lg border border-border bg-bg-primary shadow-xl p-2.5 text-xs normal-case not-italic animate-fade-in">
          <span className={`flex items-center gap-1 font-bold mb-1 ${config.color}`}>
            {config.icon} {config.label}
          </span>
          <span className="block text-text-secondary leading-snug">{correction.explanation || 'No explanation given.'}</span>
        </span>
      )}
    </span>
  );
}

/** Where a correction's phrase actually sits in `haystack` — case- and
 *  whitespace-insensitive (the model doesn't always echo punctuation/spacing
 *  verbatim), but otherwise exact, so a short phrase isn't mistaken for an
 *  unrelated bit of text that merely contains similar words. Null if it
 *  isn't there at all (a paraphrased "original"/"corrected"). */
function phraseRange(haystack: string, phrase: string): [start: number, end: number] | null {
  const trimmed = phrase.trim();
  if (!trimmed) return null;
  const pattern = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  const m = new RegExp(pattern, 'i').exec(haystack);
  return m ? [m.index, m.index + m[0].length] : null;
}

/** Which correction (if any) explains this diff segment — matched by where
 *  each correction's phrase actually falls in the text, not by re-guessing
 *  from the segment's own words. Anchoring to the correction's actual
 *  position in `text`, and requiring this segment's own range to overlap it,
 *  makes a wrong match structurally impossible; the worst case is "no
 *  explanation found" for a paraphrased fix. */
function matchCorrection(
  segStart: number,
  segEnd: number,
  corrections: WritingCorrection[],
  text: string,
  field: 'original' | 'corrected',
): WritingCorrection | null {
  for (const c of corrections) {
    const range = phraseRange(text, c[field]);
    if (!range) continue;
    const [start, end] = range;
    if (segStart < end && segEnd > start) return c;
  }
  return null;
}

/** An option's revised text, with a word-level diff against the original
 *  highlighted inline — green for what was added, struck-through red for
 *  what was removed — so the change is visible in place, not just described
 *  underneath. Where a highlighted word's position matches one of this
 *  option's corrections, it's also hoverable/tappable for the "why". */
function DiffText({ original, revised, corrections, visibleCategories }: {
  original: string;
  revised: string;
  corrections: WritingCorrection[];
  visibleCategories: Record<WritingCorrectionCategory, boolean>;
}) {
  const segments = useMemo(() => diffOption(original, revised), [original, revised]);
  // Only corrections the learner has chosen to see get a tooltip — hiding a
  // category from "What changed" should hide its explanation here too.
  const shown = useMemo(
    () => corrections.filter((c) => visibleCategories[c.category as WritingCorrectionCategory]),
    [corrections, visibleCategories],
  );
  return (
    <p className="text-base text-text-secondary leading-relaxed whitespace-pre-wrap">
      {segments.map((seg, i) => {
        if (seg.removed) {
          const correction = matchCorrection(seg.originalStart, seg.originalStart + seg.value.length, shown, original, 'original');
          if (!correction) return <span key={i} className="text-accent-red/70 line-through decoration-2">{seg.value}</span>;
          return (
            <ChangeSpan key={i} correction={correction}>
              <span className="text-accent-red/70 line-through decoration-2">{seg.value}</span>
            </ChangeSpan>
          );
        }
        if (seg.added) {
          const correction = matchCorrection(seg.revisedStart, seg.revisedStart + seg.value.length, shown, revised, 'corrected');
          if (!correction) return <span key={i} className="bg-accent-green/20 text-accent-green rounded px-0.5">{seg.value}</span>;
          return (
            <ChangeSpan key={i} correction={correction}>
              <span className="bg-accent-green/20 text-accent-green rounded px-0.5 underline decoration-dotted decoration-2 underline-offset-2">
                {seg.value}
              </span>
            </ChangeSpan>
          );
        }
        return <span key={i}>{seg.value}</span>;
      })}
    </p>
  );
}

/** The "What changed" breakdown for one option — grouped by category, scoped
 *  to that option's own corrections (each option is its own revision, so its
 *  fixes aren't necessarily the same ones the other option made). */
function WhatChanged({ corrections, visibleCategories, sortChanges, sourceText }: {
  corrections: WritingCorrection[];
  visibleCategories: Record<WritingCorrectionCategory, boolean>;
  sortChanges: boolean;
  sourceText: string;
}) {
  const cats = WRITING_CORRECTION_CATEGORIES.filter(
    (cat) => visibleCategories[cat] && corrections.some((c) => c.category === cat),
  );
  if (cats.length === 0) return null;
  return (
    <div className="space-y-2.5 pt-2.5 border-t border-border">
      <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">What changed</p>
      {cats.map((cat) => {
        const config = CATEGORY_CONFIG[cat];
        const items = corrections.filter((c) => c.category === cat);
        const ordered = sortChanges ? sortByPosition(items, sourceText) : items;
        return (
          <div key={cat}>
            <p className={`text-xs font-bold mb-1.5 flex items-center gap-1.5 ${config.color}`}>
              {config.icon} {SECTION_TITLES[cat]}
            </p>
            <div className="space-y-2">
              {ordered.map((item, i) => (
                <div key={i} className={`rounded-lg border ${config.border} ${config.bg} p-3`}>
                  {item.original && (
                    <p className="text-sm text-text-muted line-through mb-0.5">{item.original}</p>
                  )}
                  <p className="text-sm text-text-primary font-medium mb-0.5">{item.corrected}</p>
                  {item.explanation && <p className="text-xs text-text-secondary">{item.explanation}</p>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** One revised option — a switch between the plain result (clean, for
 *  copying) and the diff view (highlighted against the original, with the
 *  "What changed" breakdown), independent per card since a learner may want
 *  Option 1 as a diff and Option 2 as plain text side by side. */
function OptionCard({ option, label, copyLabel, sourceText, visibleCategories, sortChanges, onCopy }: {
  option: ImproveWritingOption;
  label: string;
  copyLabel: string;
  sourceText: string;
  visibleCategories: Record<WritingCorrectionCategory, boolean>;
  sortChanges: boolean;
  onCopy: () => void;
}) {
  const [showDiff, setShowDiff] = useState(true);
  return (
    <div className="card-game border-accent-green p-4 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-text-muted uppercase tracking-wider">{label}</span>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-bg-tertiary" role="tablist" aria-label={`${copyLabel} view`}>
            <button
              role="tab"
              aria-selected={showDiff}
              onClick={() => setShowDiff(true)}
              title="Highlighted diff + why each change was made"
              className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                showDiff ? 'bg-accent-green/20 text-accent-green' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Diff
            </button>
            <button
              role="tab"
              aria-selected={!showDiff}
              onClick={() => setShowDiff(false)}
              title="Just the revised text, ready to copy"
              className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                !showDiff ? 'bg-bg-card text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Result
            </button>
          </div>
          <button
            onClick={onCopy}
            className="flex items-center gap-1 text-xs font-bold text-accent-cyan hover:underline"
          >
            <Icon icon="lucide:copy" /> Copy
          </button>
        </div>
      </div>

      {showDiff ? (
        <DiffText
          original={sourceText}
          revised={option.text}
          corrections={option.corrections}
          visibleCategories={visibleCategories}
        />
      ) : (
        <p className="text-base text-text-secondary leading-relaxed whitespace-pre-wrap">{option.text}</p>
      )}
      {/* "What changed" isn't part of the diff/result switch — only the text
          rendering above is. Hiding the highlight shouldn't hide the reasons. */}
      <WhatChanged
        corrections={option.corrections}
        visibleCategories={visibleCategories}
        sortChanges={sortChanges}
        sourceText={sourceText}
      />
    </div>
  );
}

/** Corrections ordered by where they first appear in the original text —
 *  "Sort answer" in the settings popover. A fix the model returned that
 *  can't be found verbatim (paraphrased "original") sorts to the end rather
 *  than dropping out. */
function sortByPosition(corrections: WritingCorrection[], sourceText: string): WritingCorrection[] {
  return [...corrections].sort((a, b) => {
    const ai = a.original ? sourceText.indexOf(a.original) : -1;
    const bi = b.original ? sourceText.indexOf(b.original) : -1;
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

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
 *
 * One tab of WritingPage.tsx — no page chrome of its own (no wrapper, no
 * `<h1>`), since the container owns that and switches this out for
 * IeltsWritingPage.
 */
export function ImproveWritingPage() {
  const { user, loading: authLoading } = useAuth();
  const { isPro, loading: proLoading } = useIsPro();
  const custom = useWritingTemplates((s) => s.custom);
  const templates = useMemo(() => allTemplates(custom), [custom]);

  // Tracks whether custom templates have had their one chance to load, so a
  // deep-linked ?template= for a bad/unowned id can give up instead of
  // stalling the auto-submit forever waiting for a match that'll never come.
  const [customReady, setCustomReady] = useState(!user);
  useEffect(() => {
    if (!user) { setCustomReady(true); return; }
    let cancelled = false;
    void useWritingTemplates.getState().fetchMine().finally(() => {
      if (!cancelled) setCustomReady(true);
    });
    return () => { cancelled = true; };
  }, [user]);

  const [selectedId, setSelectedId] = useState('default-general');
  const selected = templates.find((t) => t.id === selectedId) ?? templates[0];
  const [detailOpen, setDetailOpen] = useState(false);

  const [text, setText] = useState('');
  const [result, setResult] = useState<ImproveWritingResult | null>(null);
  // The text a result belongs to — captured at submit time, since `text`
  // itself keeps changing if the learner edits the textarea afterward, and
  // the diff highlight has to stay pinned to what was actually revised.
  const [resultSourceText, setResultSourceText] = useState('');
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const visibleCategories = useWritingPrefs((s) => s.visibleCategories);
  const toggleCategory = useWritingPrefs((s) => s.toggleCategory);
  const hideOption2 = useWritingPrefs((s) => s.hideOption2);
  const setHideOption2 = useWritingPrefs((s) => s.setHideOption2);
  const sortChanges = useWritingPrefs((s) => s.sortChanges);
  const setSortChanges = useWritingPrefs((s) => s.setSortChanges);
  const [prefsOpen, setPrefsOpen] = useState(false);

  useEffect(() => () => abortRef.current?.abort(), []);

  // ── Deep link: ?text=…&template=…&autoAnswer=true ──
  // Lets an external caller (a bookmarklet, a "send to Voca" share action)
  // land here with the text and template pre-filled, ChatGPT-style. `template`
  // is a default template's code (`default-slack`) or a custom template's id —
  // both are just `AnyWritingTemplate.id`, so one param covers both. Consumed
  // once on mount, then stripped from the URL so a refresh doesn't redo it.
  const [searchParams, setSearchParams] = useSearchParams();
  const [pendingAutoSubmit, setPendingAutoSubmit] = useState(false);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
  useEffect(() => {
    const urlText = searchParams.get('text');
    const urlTemplate = searchParams.get('template');
    if (urlText === null && urlTemplate === null) return;
    if (urlText !== null) setText(urlText.slice(0, MAX_TEXT));
    if (urlTemplate) setPendingTemplateId(urlTemplate);
    if (searchParams.get('autoAnswer') === 'true') setPendingAutoSubmit(true);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('text');
        next.delete('template');
        next.delete('autoAnswer');
        return next;
      },
      { replace: true },
    );
    // Runs once on mount — the URL params are only meant to seed initial state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A custom template's id may not be in `templates` yet at mount (its cache
  // is stale or empty until `fetchMine` resolves), so keep retrying as the
  // list changes. Once `fetchMine` has had its shot and there's still no
  // match, give up rather than leaving `selected` at its default silently —
  // or stalling the auto-submit gate below forever.
  useEffect(() => {
    if (!pendingTemplateId) return;
    const match = templates.find((t) => t.id === pendingTemplateId);
    if (match) {
      setSelectedId(match.id);
      setPendingTemplateId(null);
    } else if (customReady) {
      toast.error(`Unknown template “${pendingTemplateId}” — using the default instead.`);
      setPendingTemplateId(null);
    }
  }, [pendingTemplateId, templates, customReady]);

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
    const submittedText = text.trim();
    try {
      const categories = WRITING_CORRECTION_CATEGORIES.filter((c) => visibleCategories[c]);
      // Ask for one revision instead of two when Option 2 is hidden anyway —
      // half the output, half the tokens spent on a round the learner won't see.
      const result = await improveWriting(
        { instructions: selected.instructions, text: submittedText, categories, optionCount: hideOption2 ? 1 : 2 },
        { signal: controller.signal },
      );
      setResult(result);
      setResultSourceText(submittedText);
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
      else if ((err as Error).name !== 'AbortError') toast.error('Could not reach the AI. Try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fire the deep-linked auto-submit once auth + Pro status have resolved —
  // both start out "not loading" for an instant before the session restores,
  // so gating on proLoading alone fired this before `locked` was accurate —
  // and once any requested ?template= has been applied (or given up on).
  useEffect(() => {
    if (!pendingAutoSubmit || authLoading || proLoading || pendingTemplateId) return;
    setPendingAutoSubmit(false);
    void handleSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAutoSubmit, authLoading, proLoading, pendingTemplateId]);

  // Free alternative, open to everyone (not just locked accounts) — no server
  // call, so no Pro gate applies here either.
  const handleOpenChatGpt = () => {
    if (!text.trim()) { toast.error('Paste some text to improve first.'); return; }
    if (!selected) return;
    window.open(chatGptImproveWritingUrl(selected.instructions, text.trim()), '_blank', 'noopener,noreferrer');
  };

  const handleCopyOption = async (option: string) => {
    await navigator.clipboard.writeText(option);
    toast.success('Copied!');
  };

  return (
    <div>
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
          <TextareaAutosize
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_TEXT))}
            placeholder="Paste the text you want to improve…"
            minRows={2}
            rows={2}
            maxRows={20}
            className="w-full bg-transparent border-2 border-border rounded-xl px-4 py-3.5 text-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-cyan/60 resize-none leading-relaxed"
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
              <div className="relative flex items-stretch gap-1">
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
                <button
                  onClick={() => setPrefsOpen((o) => !o)}
                  title="Display options"
                  aria-label="Display options"
                  className="btn-3d px-3 py-2.5 bg-accent-cyan text-bg-primary disabled:opacity-60 flex items-center justify-center"
                >
                  <Icon icon="lucide:sliders-horizontal" />
                </button>
                {prefsOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setPrefsOpen(false)} />
                    <div className="absolute right-0 top-[calc(100%+0.5rem)] z-40 w-56 rounded-xl border-2 border-border bg-bg-card shadow-xl p-2 space-y-0.5 animate-fade-in">
                      <p className="px-2 py-1 text-[10px] font-bold text-text-muted uppercase tracking-wider">Display</p>
                      <label className="flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-bold text-text-secondary hover:bg-bg-tertiary cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hideOption2}
                          onChange={(e) => setHideOption2(e.target.checked)}
                          className="accent-accent-cyan"
                        />
                        Don't show Option 2
                      </label>
                      <label className="flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-bold text-text-secondary hover:bg-bg-tertiary cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sortChanges}
                          onChange={(e) => setSortChanges(e.target.checked)}
                          className="accent-accent-cyan"
                        />
                        Sort changes by position
                      </label>

                      <p className="px-2 py-1 mt-1 text-[10px] font-bold text-text-muted uppercase tracking-wider border-t border-border pt-2">Corrections to include</p>
                      {WRITING_CORRECTION_CATEGORIES.map((cat) => {
                        const config = CATEGORY_CONFIG[cat];
                        return (
                          <label
                            key={cat}
                            className="flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-bold text-text-secondary hover:bg-bg-tertiary cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={visibleCategories[cat]}
                              onChange={() => toggleCategory(cat)}
                              className="accent-accent-cyan"
                            />
                            <span>{config.icon}</span> {SECTION_TITLES[cat]}
                          </label>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Result ── */}
      {result && (
        <section className="space-y-4 animate-fade-in">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider">
                {hideOption2 || result.options.length < 2 ? 'Revised' : 'Revised — pick one'}
              </h2>
              <span className="flex items-center gap-3 text-[10px] font-bold text-text-muted">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-accent-green/20 border border-accent-green/40" /> Added
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-accent-red/15 border border-accent-red/40" /> Removed
                </span>
              </span>
            </div>
            <p className="text-[11px] text-text-muted mb-2 flex items-center gap-1">
              <Icon icon="lucide:info" className="text-xs" />
              Dotted underline? Hover it — or tap on mobile — to see why.
            </p>

            <div className={`grid gap-3 ${!hideOption2 && result.options.length > 1 ? 'sm:grid-cols-2' : ''}`}>
              {(hideOption2 ? result.options.slice(0, 1) : result.options).map((option, i) => (
                <OptionCard
                  key={i}
                  option={option}
                  label={hideOption2 || result.options.length < 2 ? 'Revised text' : `Option ${i + 1}`}
                  copyLabel={hideOption2 || result.options.length < 2 ? 'Revised text' : `Option ${i + 1}`}
                  sourceText={resultSourceText}
                  visibleCategories={visibleCategories}
                  sortChanges={sortChanges}
                  onCopy={() => handleCopyOption(option.text)}
                />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
