import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import { FormattedMessage, useIntl } from 'react-intl';
import { useCollections } from '../../hooks/useCollections';
import { getCollections } from '../../lib/collections';
import { doodleKey, fetchDoodles, readLocalDoodle } from '../../lib/doodles';
import { generateWordData, WORD_LIST } from '../../lib/wordService';
import type { MiniWordData } from '../../lib/quizShare';
import {
  blankCustom,
  fromForm,
  generateQuestions,
  HAS_PROMPT,
  HAS_WRONG,
  HUNT_TYPES,
  makeQuestion,
  MAX_GENERATE,
  MAX_PAIRS,
  MAX_QUESTIONS,
  MAX_WRONG,
  parseWords,
  problemOf,
  toForm,
  type Built,
  type EditableQuestion,
  type HuntQuestionType,
  type QuestionForm,
  type WordQuestionType,
} from '../../lib/hunt';

/**
 * A hunt's questions, the way a teacher builds a quiz set: pick a collection
 * and the kinds of question, generate up to thirty, then read every card as a
 * student will see it — fix one, drop one, add one. An added question is
 * either made by the app from its answer word, or written by hand.
 *
 * Generating happens here, while the teacher is signed in to look the words
 * up; the cards are plain data after that, so editing costs nothing.
 */
export function QuestionEditor({ questions, onChange, pictures, onPictures, needed }: {
  questions: EditableQuestion[];
  onChange: (next: EditableQuestion[]) => void;
  /** Picture questions' pictures, by key. */
  pictures: Record<string, string>;
  onPictures: (add: Record<string, string>) => void;
  /** Questions the hunt needs at least (one per station). */
  needed: number;
}) {
  const intl = useIntl();
  const mine = useCollections((s) => s.mine);
  const refreshMine = useCollections((s) => s.refreshMine);
  useEffect(() => { refreshMine().catch(() => { /* the built-in lists still work */ }); }, [refreshMine]);
  const builtIn = useMemo(() => getCollections(), []);

  const [wordsText, setWordsText] = useState('');
  const [types, setTypes] = useState<WordQuestionType[]>(['definition', 'sentence', 'listen', 'image']);
  const [count, setCount] = useState(20);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [addType, setAddType] = useState<HuntQuestionType>('definition');
  const [addWord, setAddWord] = useState('');

  // Words looked up once per visit to the form: generating again, or adding
  // one more question about a word, doesn't ask twice.
  const data = useRef<Record<string, MiniWordData>>({});
  const words = parseWords(wordsText);
  const ready = questions.filter((q) => !problemOf(q)).length;

  const loadData = async (ws: string[]) => {
    await Promise.all(ws.filter((w) => !data.current[w]).map(async (w) => {
      try {
        const d = await generateWordData(w);
        data.current[w] = { definition: d.definition, examples: d.examples ?? [], synonyms: d.synonyms, antonyms: d.antonyms };
      } catch { /* a word we can't look up is left out */ }
    }));
  };

  /** Pictures the app already has for these words — none are drawn here. */
  const loadPictures = async (ws: string[]): Promise<Record<string, string>> => {
    const out: Record<string, string> = {};
    const missing: string[] = [];
    for (const w of ws) {
      const local = readLocalDoodle(doodleKey(w));
      if (local) out[w] = local; else missing.push(w);
    }
    if (missing.length) {
      try {
        const got = await fetchDoodles(missing.map((w) => ({ word: w, definition: data.current[w]?.definition })));
        for (const w of missing) if (got[doodleKey(w)]) out[w] = got[doodleKey(w)];
      } catch { /* no pictures — those questions fall back to the meaning */ }
    }
    return out;
  };

  const wrongPool = (extra: string[]) => [
    ...new Set([...extra, ...questions.map((q) => q.word).filter((w): w is string => Boolean(w))]),
    ...WORD_LIST.map((w) => w.word).sort(() => Math.random() - 0.5).slice(0, 60),
  ];

  const keep = (built: Built[]) => {
    const add: Record<string, string> = {};
    for (const b of built) if (b.picture) add[b.picture.key] = b.picture.data;
    if (Object.keys(add).length) onPictures(add);
    onChange([...questions, ...built.map((b) => b.question)].slice(0, MAX_QUESTIONS));
  };

  const generate = async () => {
    if (!words.length || !types.length || busy) return;
    try {
      setBusy(intl.formatMessage({ id: 'hunt.teacher.loadingWords' }));
      await loadData(words);
      const usable = words.filter((w) => data.current[w]);
      if (!usable.length) {
        toast.error(intl.formatMessage({ id: 'hunt.editor.noWords' }));
        return;
      }
      const pics = types.includes('image') ? await loadPictures(usable) : {};
      const room = Math.max(0, MAX_QUESTIONS - questions.length);
      keep(generateQuestions({ words: usable, types, count: Math.min(count, room), data: data.current, wrongPool: wrongPool(usable), pictures: pics }));
    } finally {
      setBusy(null);
    }
  };

  const addOne = async () => {
    if (questions.length >= MAX_QUESTIONS || busy) return;
    if (addType === 'custom') {
      const q = blankCustom();
      onChange([...questions, q]);
      setEditing(q.id);
      return;
    }
    const word = addWord.trim().toLowerCase();
    if (!word) return;
    try {
      setBusy(intl.formatMessage({ id: 'hunt.teacher.loadingWords' }));
      await loadData([word]);
      const pics = addType === 'image' ? await loadPictures([word]) : {};
      const built = makeQuestion(addType, word, { data: data.current, wrongPool: wrongPool(words), pictures: pics });
      if (!built) {
        toast.error(intl.formatMessage({ id: 'hunt.editor.cantMake' }, { type: intl.formatMessage({ id: `hunt.typeName.${addType}` }), word }));
        return;
      }
      keep([built]);
      setAddWord('');
    } finally {
      setBusy(null);
    }
  };

  const fillFrom = (id: string) => {
    const col = mine.find((c) => c.id === id) ?? builtIn.find((c) => c.id === id);
    if (!col) return;
    const pick = [...col.words].sort(() => Math.random() - 0.5).slice(0, 30).map((w) => (typeof w === 'string' ? w : w.word));
    setWordsText(pick.join('\n'));
  };

  const label = 'block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5';
  const input = 'w-full bg-bg-tertiary border-2 border-border rounded-xl px-3 py-2.5 text-text-primary focus:outline-none focus:border-accent-cyan';
  const chip = (on: boolean) => `px-3 py-1.5 rounded-xl text-sm font-bold border-2 transition-colors ${on ? 'border-accent-cyan bg-accent-cyan/15 text-text-primary' : 'border-border text-text-muted'}`;

  return (
    <div className="space-y-4">
      {/* Generate a set from words. */}
      <div className="rounded-xl border border-border bg-bg-secondary/40 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className={label + ' !mb-0'}><FormattedMessage id="hunt.editor.generateTitle" /></span>
          <select
            value=""
            onChange={(e) => fillFrom(e.target.value)}
            className="bg-bg-tertiary border border-border rounded-lg px-2 py-1 text-xs text-text-primary max-w-[60%]"
            aria-label={intl.formatMessage({ id: 'hunt.teacher.fillFrom' })}
          >
            <option value="">{intl.formatMessage({ id: 'hunt.teacher.fillFrom' })}</option>
            {mine.length > 0 && (
              <optgroup label={intl.formatMessage({ id: 'hunt.teacher.myCollections' })}>
                {mine.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </optgroup>
            )}
            <optgroup label={intl.formatMessage({ id: 'hunt.teacher.builtIn' })}>
              {builtIn.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </optgroup>
          </select>
        </div>
        <textarea
          value={wordsText}
          onChange={(e) => setWordsText(e.target.value)}
          rows={3}
          placeholder={intl.formatMessage({ id: 'hunt.teacher.wordsPlaceholder' })}
          aria-label={intl.formatMessage({ id: 'hunt.teacher.words' }, { n: words.length })}
          className={input + ' text-sm'}
        />
        <div className="flex flex-wrap gap-1.5">
          {HUNT_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTypes((ts) => (ts.includes(t) ? ts.filter((x) => x !== t) : HUNT_TYPES.filter((x) => ts.includes(x) || x === t)))}
              className={chip(types.includes(t))}
            >
              <FormattedMessage id={`hunt.typeName.${t}`} />
            </button>
          ))}
        </div>
        {types.includes('image') && <p className="text-xs text-text-muted"><FormattedMessage id="hunt.editor.pictureHint" /></p>}
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <FormattedMessage id="hunt.editor.howMany" />
            <input
              type="range"
              min={5}
              max={MAX_GENERATE}
              step={1}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="accent-[var(--color-accent-cyan)]"
            />
            <span className="font-bold text-text-primary tabular-nums w-6">{count}</span>
          </label>
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => void generate()}
            disabled={!words.length || !types.length || Boolean(busy) || questions.length >= MAX_QUESTIONS}
            className="px-4 py-2.5 rounded-xl bg-accent-cyan text-bg-primary text-sm font-display font-extrabold flex items-center gap-1.5 disabled:opacity-40"
          >
            <Icon icon="lucide:sparkles" />
            <FormattedMessage id={questions.length ? 'hunt.editor.generateMore' : 'hunt.editor.generate'} values={{ n: count }} />
          </button>
        </div>
      </div>

      {/* The set, as students will see it. */}
      <div className="flex items-center justify-between gap-2">
        <p className={`text-sm font-bold ${ready < needed ? 'text-accent-red' : 'text-text-primary'}`}>
          <FormattedMessage id="hunt.editor.count" values={{ n: ready, needed }} />
        </p>
        {questions.length > 0 && (
          <button
            type="button"
            onClick={() => { if (window.confirm(intl.formatMessage({ id: 'hunt.editor.confirmClear' }))) onChange([]); }}
            className="text-xs font-bold text-text-muted hover:text-accent-red"
          >
            <FormattedMessage id="hunt.editor.clear" />
          </button>
        )}
      </div>

      {busy && <p className="text-sm text-text-muted flex items-center gap-2"><span className="w-4 h-4 rounded-full border-2 border-accent-cyan/30 border-t-accent-cyan animate-spin" />{busy}</p>}

      <div className="space-y-2">
        {questions.map((q, i) => (
          <QuestionCard
            key={q.id}
            n={i + 1}
            question={q}
            picture={q.image ? pictures[q.image] : undefined}
            editing={editing === q.id}
            onEdit={() => setEditing(q.id)}
            onSave={(next) => { onChange(questions.map((x) => (x.id === q.id ? next : x))); setEditing(null); }}
            onCancel={() => {
              // A new question abandoned before it had anything in it goes away.
              if (q.type === 'custom' && !q.answer && !q.prompt) onChange(questions.filter((x) => x.id !== q.id));
              setEditing(null);
            }}
            onRemove={() => onChange(questions.filter((x) => x.id !== q.id))}
          />
        ))}
      </div>

      {/* Add one more. */}
      <div className="rounded-xl border-2 border-dashed border-border p-3 flex flex-wrap items-center gap-2">
        <select
          value={addType}
          onChange={(e) => setAddType(e.target.value as HuntQuestionType)}
          className="bg-bg-tertiary border border-border rounded-lg px-2 py-2 text-sm text-text-primary"
          aria-label={intl.formatMessage({ id: 'hunt.editor.addType' })}
        >
          {HUNT_TYPES.map((t) => <option key={t} value={t}>{intl.formatMessage({ id: `hunt.typeName.${t}` })}</option>)}
          <option value="custom">{intl.formatMessage({ id: 'hunt.typeName.custom' })}</option>
        </select>
        {addType !== 'custom' && (
          <input
            value={addWord}
            onChange={(e) => setAddWord(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void addOne(); } }}
            maxLength={40}
            placeholder={intl.formatMessage({ id: 'hunt.editor.addWord' })}
            className="flex-1 min-w-[140px] bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary"
          />
        )}
        <button
          type="button"
          onClick={() => void addOne()}
          disabled={Boolean(busy) || questions.length >= MAX_QUESTIONS || (addType !== 'custom' && !addWord.trim())}
          className="px-3 py-2 rounded-xl bg-bg-tertiary text-sm font-bold text-text-primary flex items-center gap-1.5 disabled:opacity-40"
        >
          <Icon icon={addType === 'custom' ? 'lucide:pencil' : 'lucide:wand-2'} />
          <FormattedMessage id={addType === 'custom' ? 'hunt.editor.write' : 'hunt.editor.make'} />
        </button>
      </div>
    </div>
  );
}

function QuestionCard({ n, question: q, picture, editing, onEdit, onSave, onCancel, onRemove }: {
  n: number;
  question: EditableQuestion;
  picture?: string;
  editing: boolean;
  onEdit: () => void;
  onSave: (q: EditableQuestion) => void;
  onCancel: () => void;
  onRemove: () => void;
}) {
  const intl = useIntl();
  const problem = problemOf(q);
  const key = (s: string) => s.trim().toLowerCase();

  return (
    <div className={`rounded-xl border bg-bg-card p-3 ${problem ? 'border-accent-red/60' : 'border-border'}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-bold text-text-muted tabular-nums">{n}</span>
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-accent-cyan/15 text-accent-cyan">
          <FormattedMessage id={`hunt.typeName.${q.type}`} />
        </span>
        {/* While editing, the form says what's wrong with the edit itself. */}
        {problem && !editing && <span className="text-[11px] font-bold text-accent-red"><FormattedMessage id={`hunt.editor.problem.${problem}`} /></span>}
        <span className="flex-1" />
        {!editing && (
          <>
            <button type="button" onClick={onEdit} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary" aria-label={intl.formatMessage({ id: 'hunt.editor.edit' })}>
              <Icon icon="lucide:pencil" />
            </button>
            <button type="button" onClick={onRemove} className="p-1.5 rounded-lg text-text-muted hover:text-accent-red" aria-label={intl.formatMessage({ id: 'hunt.editor.remove' })}>
              <Icon icon="lucide:trash-2" />
            </button>
          </>
        )}
      </div>

      {editing ? (
        <EditForm question={q} onSave={onSave} onCancel={onCancel} />
      ) : (
        // What the student sees, with the right answer marked.
        <div className="space-y-2">
          {q.prompt && <p className="text-sm font-semibold text-text-primary leading-snug">{q.prompt}</p>}
          {q.say && (
            <p className="text-sm text-accent-cyan flex items-center gap-1.5">
              <Icon icon="lucide:volume-2" /> <span className="text-text-muted"><FormattedMessage id="hunt.editor.says" values={{ word: q.say }} /></span>
            </p>
          )}
          {q.image && (
            picture
              ? <img src={picture} alt="" className="w-20 h-20 rounded-lg bg-white object-contain border border-border" />
              : <div className="w-20 h-20 rounded-lg bg-bg-tertiary flex items-center justify-center"><Icon icon="lucide:image-off" className="text-text-muted" /></div>
          )}
          {q.scrambled && <p className="font-display font-extrabold tracking-[0.3em] text-text-primary">{q.scrambled}</p>}
          {q.type === 'match' ? (
            <ul className="space-y-1">
              {(q.slotPrompts ?? []).map((p, i) => (
                <li key={i} className="text-sm flex gap-2">
                  <span className="font-bold text-accent-green shrink-0">{q.slots?.[i]}</span>
                  <span className="text-text-muted">— {p}</span>
                </li>
              ))}
            </ul>
          ) : q.options ? (
            <div className="flex flex-wrap gap-1.5">
              {q.options.map((o) => (
                <span
                  key={o}
                  className={`px-2.5 py-1 rounded-lg text-sm font-bold border ${key(o) === key(q.answer) ? 'border-accent-green bg-accent-green/15 text-text-primary' : 'border-border text-text-muted'}`}
                >
                  {key(o) === key(q.answer) && <Icon icon="lucide:check" className="inline -mt-0.5 mr-1" />}
                  {o}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-secondary">
              <FormattedMessage id="hunt.editor.typedAnswer" values={{ answer: <b className="text-accent-green">{q.answer || '…'}</b> }} />
              {q.accept?.length ? <span className="text-text-muted"> · <FormattedMessage id="hunt.editor.alsoAccepted" values={{ list: q.accept.join(', ') }} /></span> : null}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function EditForm({ question: q, onSave, onCancel }: {
  question: EditableQuestion;
  onSave: (q: EditableQuestion) => void;
  onCancel: () => void;
}) {
  const intl = useIntl();
  const [f, setF] = useState<QuestionForm>(() => {
    const form = toForm(q);
    // Room to type: every wrong-answer box, and a few spare pairs.
    return {
      ...form,
      wrong: [...form.wrong, ...Array(Math.max(0, MAX_WRONG - form.wrong.length)).fill('')],
      pairs: q.type === 'match'
        ? [...form.pairs, ...Array(Math.max(0, Math.min(MAX_PAIRS, form.pairs.length + 1) - form.pairs.length)).fill({ prompt: '', word: '' })]
        : form.pairs,
    };
  });
  const next = fromForm(q, f);
  const problem = problemOf(next);
  const input = 'w-full bg-bg-tertiary border-2 border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-cyan';
  const typed = q.type === 'custom' && f.wrong.every((w) => !w.trim());

  return (
    <div className="space-y-2">
      {HAS_PROMPT.includes(q.type) && (
        <textarea
          value={f.prompt}
          onChange={(e) => setF({ ...f, prompt: e.target.value })}
          rows={2}
          maxLength={400}
          autoFocus
          placeholder={intl.formatMessage({ id: q.type === 'custom' ? 'hunt.custom.promptPlaceholder' : 'hunt.editor.promptPlaceholder' })}
          aria-label={intl.formatMessage({ id: 'hunt.custom.prompt' })}
          className={input}
        />
      )}
      {q.type === 'match' ? (
        <div className="space-y-1.5">
          {f.pairs.map((p, i) => (
            <div key={i} className="flex gap-1.5">
              <input
                value={p.word}
                onChange={(e) => setF({ ...f, pairs: f.pairs.map((x, j) => (j === i ? { ...x, word: e.target.value } : x)) })}
                maxLength={40}
                placeholder={intl.formatMessage({ id: 'hunt.editor.pairWord' })}
                className={input + ' !w-1/3 !border-accent-green/50'}
              />
              <input
                value={p.prompt}
                onChange={(e) => setF({ ...f, pairs: f.pairs.map((x, j) => (j === i ? { ...x, prompt: e.target.value } : x)) })}
                maxLength={400}
                placeholder={intl.formatMessage({ id: 'hunt.editor.pairMeaning' })}
                className={input}
              />
            </div>
          ))}
          {f.pairs.length < MAX_PAIRS && (
            <button type="button" onClick={() => setF({ ...f, pairs: [...f.pairs, { prompt: '', word: '' }] })} className="text-xs font-bold text-accent-cyan flex items-center gap-1">
              <Icon icon="lucide:plus" /> <FormattedMessage id="hunt.editor.addPair" />
            </button>
          )}
        </div>
      ) : (
        <>
          <input
            value={f.answer}
            onChange={(e) => setF({ ...f, answer: e.target.value })}
            maxLength={40}
            autoFocus={!HAS_PROMPT.includes(q.type)}
            placeholder={intl.formatMessage({ id: 'hunt.custom.answerPlaceholder' })}
            aria-label={intl.formatMessage({ id: 'hunt.custom.answer' })}
            className={input + ' !border-accent-green/50'}
          />
          {HAS_WRONG.includes(q.type) && (
            <div className="grid sm:grid-cols-3 gap-1.5">
              {f.wrong.map((w, k) => (
                <input
                  key={k}
                  value={w}
                  onChange={(e) => setF({ ...f, wrong: f.wrong.map((x, j) => (j === k ? e.target.value : x)) })}
                  maxLength={40}
                  placeholder={intl.formatMessage({ id: q.type === 'custom' ? 'hunt.custom.wrongPlaceholder' : 'hunt.editor.wrongPlaceholder' })}
                  aria-label={intl.formatMessage({ id: 'hunt.custom.wrong' }, { n: k + 1 })}
                  className={input + ' !border-accent-red/30'}
                />
              ))}
            </div>
          )}
          {typed && (
            <input
              // Kept as typed, commas and all; split and tidied on save.
              value={f.accept.join(',')}
              onChange={(e) => setF({ ...f, accept: e.target.value.split(',') })}
              maxLength={200}
              placeholder={intl.formatMessage({ id: 'hunt.custom.acceptPlaceholder' })}
              aria-label={intl.formatMessage({ id: 'hunt.custom.accept' })}
              className={input}
            />
          )}
        </>
      )}
      <div className="flex items-center gap-2 justify-end">
        {problem && <span className="text-xs text-accent-red mr-auto"><FormattedMessage id={`hunt.editor.problem.${problem}`} /></span>}
        <button type="button" onClick={onCancel} className="px-3 py-1.5 rounded-lg bg-bg-tertiary text-sm font-bold text-text-primary">
          <FormattedMessage id="hunt.teacher.cancel" />
        </button>
        <button type="button" disabled={Boolean(problem)} onClick={() => onSave(next)} className="px-3 py-1.5 rounded-lg bg-accent-cyan text-bg-primary text-sm font-bold disabled:opacity-40">
          <FormattedMessage id="hunt.editor.save" />
        </button>
      </div>
    </div>
  );
}
