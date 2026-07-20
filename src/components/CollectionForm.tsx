import { useState } from 'react';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import { useCollections } from '../hooks/useCollections';

/** ChatGPT URL pre-filled with a prompt that yields a paste-ready word list. */
function chatGptWordsUrl(topic: string): string {
  const prompt = `List English vocabulary words for this request: "${topic}".

Rules:
- Output ONLY the words, one per line
- lowercase, no numbering, no bullets, no explanations, no duplicates

I will paste your answer directly into a vocabulary app.`;
  return `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`;
}

/** Parse a free-form words input (newlines/commas) into clean single words. */
export function parseWords(input: string): string[] {
  const seen = new Set<string>();
  for (const raw of input.split(/[\n,;]+/)) {
    const w = raw.trim().toLowerCase();
    if (/^[a-z]+(?:[ '-][a-z]+)*$/.test(w) && w.length >= 2) seen.add(w);
  }
  return [...seen].slice(0, 1000);
}

/**
 * The create / edit collection form: name, an AI word-list helper, and a words
 * box. Owns its own draft + save state and talks to the collections store, so
 * both the Collections list (inline card) and the world game (modal) can drop
 * it in. `editingId` set = editing an existing collection.
 */
export function CollectionForm({ editingId = null, initialName = '', initialWords = [], onDone }: {
  editingId?: string | null;
  initialName?: string;
  initialWords?: string[];
  onDone: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [wordsInput, setWordsInput] = useState(initialWords.join('\n'));
  const [aiTopic, setAiTopic] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const words = parseWords(wordsInput);
    if (!name.trim()) { toast.error('Give your collection a name.'); return; }
    if (words.length < 2) { toast.error('Add at least 2 words (one per line).'); return; }
    setSaving(true);
    try {
      if (editingId) {
        await useCollections.getState().updateCollection(editingId, name.trim(), words);
        toast.success(`Updated “${name.trim()}” (${words.length} words)`);
      } else {
        const created = await useCollections.getState().createCollection(name.trim(), words);
        toast.success(`Created “${created.name}” (${words.length} words)`);
      }
      onDone();
    } catch (err) {
      toast.error((err as Error).message || 'Could not save collection.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {editingId && (
        <p className="text-xs font-bold text-accent-cyan uppercase tracking-wider">Editing collection</p>
      )}
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Collection name (e.g. IELTS Essentials)"
        maxLength={60}
        className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-cyan/50"
      />

      {/* AI helper: describe a topic → ChatGPT opens with a prompt whose
          answer (one word per line) pastes straight into the box below. */}
      <div className="p-3 rounded-xl bg-bg-tertiary/60 border border-border space-y-2">
        <p className="flex items-center gap-1.5 text-[11px] font-bold text-text-muted uppercase tracking-wider">
          <Icon icon="lucide:sparkles" className="text-accent-purple" />
          Need words? Ask AI
        </p>
        <div className="flex gap-2">
          <input
            value={aiTopic}
            onChange={(e) => setAiTopic(e.target.value)}
            placeholder="Topic: family, animals, travel, business… or 200 collocations"
            maxLength={200}
            className="flex-1 min-w-0 bg-bg-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple/50"
          />
          <a
            href={aiTopic.trim() ? chatGptWordsUrl(aiTopic.trim()) : undefined}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => { if (!aiTopic.trim()) e.preventDefault(); }}
            className={`btn-3d shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-bold ${
              aiTopic.trim() ? 'bg-accent-purple text-bg-primary' : 'bg-bg-card text-text-muted cursor-not-allowed opacity-60'
            }`}
          >
            <Icon icon="lucide:external-link" className="text-sm" />
            Ask ChatGPT
          </a>
        </div>
        <p className="text-[11px] text-text-muted">
          Copy the reply and paste it into the words box below.
        </p>
      </div>

      <textarea
        value={wordsInput}
        onChange={(e) => setWordsInput(e.target.value)}
        placeholder={'One word per line (or comma-separated):\nserendipity\nebullient\nmeticulous'}
        rows={6}
        className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2.5 text-sm font-code text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-cyan/50 resize-y"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted">{parseWords(wordsInput).length} words detected</span>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-3d px-4 py-2 text-sm bg-accent-cyan text-bg-primary font-bold disabled:opacity-60"
        >
          {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create'}
        </button>
      </div>
    </>
  );
}
