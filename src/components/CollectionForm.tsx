import { useState } from 'react';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import { FormattedMessage, useIntl } from 'react-intl';
import { useCollections } from '../hooks/useCollections';
import { useIsPro } from '../hooks/useProStatus';
import { generateCollectionWords } from '../lib/collectionWordsApi';
import { splitWordList } from '../lib/wordList';

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
  for (const w of splitWordList(input)) {
    if (/^[a-z]+(?:[ '-][a-z]+)*$/.test(w) && w.length >= 2) seen.add(w);
  }
  return [...seen].slice(0, 1000);
}

/**
 * `incoming` words dropped between `before` and `after`, one per line, minus
 * any already in the box — shared by a paste and an AI generation.
 */
function insertWords(before: string, after: string, incoming: string[]): { text: string; added: number } {
  const existing = new Set(parseWords(before + '\n' + after));
  const fresh = incoming.filter((w) => !existing.has(w));
  const text = [before.trimEnd(), fresh.join('\n'), after.trimStart()].filter(Boolean).join('\n');
  return { text, added: fresh.length };
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
  const intl = useIntl();
  const [name, setName] = useState(initialName);
  const [wordsInput, setWordsInput] = useState(initialWords.join('\n'));
  const [aiTopic, setAiTopic] = useState('');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { isPro } = useIsPro();

  // Pro: the model writes the list straight into the box — no ChatGPT tab.
  const handleGenerate = async () => {
    const topic = aiTopic.trim();
    if (!topic || generating) return;
    setGenerating(true);
    try {
      const { text, added } = insertWords(wordsInput, '', parseWords((await generateCollectionWords(topic)).join('\n')));
      setWordsInput(text);
      toast.success(intl.formatMessage({ id: 'collections.generated' }, { count: added }));
    } catch (err) {
      toast.error((err as Error).message || intl.formatMessage({ id: 'collections.generateFailed' }));
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    const words = parseWords(wordsInput);
    if (!name.trim()) { toast.error(intl.formatMessage({ id: 'collections.nameRequired' })); return; }
    if (words.length < 2) { toast.error(intl.formatMessage({ id: 'collections.minWords' })); return; }
    setSaving(true);
    try {
      if (editingId) {
        await useCollections.getState().updateCollection(editingId, name.trim(), words);
        toast.success(intl.formatMessage({ id: 'collections.updated' }, { name: name.trim(), count: words.length }));
      } else {
        const created = await useCollections.getState().createCollection(name.trim(), words);
        toast.success(intl.formatMessage({ id: 'collections.created' }, { name: created.name, count: words.length }));
      }
      onDone();
    } catch (err) {
      toast.error((err as Error).message || intl.formatMessage({ id: 'collections.couldNotSave' }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {editingId && (
        <p className="text-xs font-bold text-accent-cyan uppercase tracking-wider"><FormattedMessage id="collections.editingCollection" /></p>
      )}
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={intl.formatMessage({ id: 'collections.namePlaceholder' })}
        maxLength={60}
        className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-cyan/50"
      />

      {/* AI helper: describe a topic → ChatGPT opens with a prompt whose
          answer (one word per line) pastes straight into the box below. */}
      <div className="p-3 rounded-xl bg-bg-tertiary/60 border border-border space-y-2">
        <p className="flex items-center gap-1.5 text-[11px] font-bold text-text-muted uppercase tracking-wider">
          <Icon icon="lucide:sparkles" className="text-accent-purple" />
          <FormattedMessage id="collections.needWords" />
        </p>
        <div className="flex gap-2">
          <input
            value={aiTopic}
            onChange={(e) => setAiTopic(e.target.value)}
            placeholder={intl.formatMessage({ id: 'collections.aiTopicPlaceholder' })}
            maxLength={200}
            className="flex-1 min-w-0 bg-bg-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple/50"
          />
          {isPro && (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!aiTopic.trim() || generating}
              className={`btn-3d shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-bold ${
                aiTopic.trim() ? 'bg-accent-cyan text-bg-primary' : 'bg-bg-card text-text-muted cursor-not-allowed opacity-60'
              }`}
            >
              <Icon icon={generating ? 'lucide:loader-2' : 'lucide:sparkles'} className={`text-sm ${generating ? 'animate-spin' : ''}`} />
              <FormattedMessage id={generating ? 'collections.generating' : 'collections.generate'} />
            </button>
          )}
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
            <FormattedMessage id="collections.askChatGpt" />
          </a>
        </div>
        <p className="text-[11px] text-text-muted">
          <FormattedMessage id={isPro ? 'collections.pasteHintPro' : 'collections.pasteHint'} />
        </p>
      </div>

      <textarea
        value={wordsInput}
        onChange={(e) => setWordsInput(e.target.value)}
        onPaste={(e) => {
          // Clean a paste as it lands, so the box shows exactly what will be
          // saved — no ChatGPT backslashes, bullets or glosses to wonder about.
          // A single fragment (one word, a typo fix) pastes normally.
          const text = e.clipboardData.getData('text');
          if (!/[\n,;]/.test(text.trim())) return;
          const el = e.currentTarget;
          const before = wordsInput.slice(0, el.selectionStart);
          const after = wordsInput.slice(el.selectionEnd);
          e.preventDefault();
          const { text: next, added } = insertWords(before, after, parseWords(text));
          if (added) setWordsInput(next);
        }}
        placeholder={intl.formatMessage({ id: 'collections.wordsPlaceholder' }) + '\nserendipity\nebullient\nmeticulous'}
        rows={6}
        className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2.5 text-sm font-code text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-cyan/50 resize-y"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted"><FormattedMessage id="collections.wordsDetected" values={{ count: parseWords(wordsInput).length }} /></span>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-3d px-4 py-2 text-sm bg-accent-cyan text-bg-primary font-bold disabled:opacity-60"
        >
          <FormattedMessage id={saving ? 'collections.saving' : editingId ? 'collections.saveChanges' : 'collections.create'} />
        </button>
      </div>
    </>
  );
}
