import { useState, useMemo, useCallback } from 'react';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import { FormattedMessage, useIntl } from 'react-intl';
import { dialogues, dialogueTopics, type Dialogue } from '../data/englishDialogues';
import { useSpeakingProgress, isPracticed } from '../hooks/useSpeakingProgress';
import { CONV_VOICE_A, CONV_VOICE_B } from '../lib/tts';
import { PracticeButton } from './PracticeButton';
import {
  useScriptPlayer, PlayerBar, Transcript, YourTurnBar, ProgressCard, PracticedButton, PhraseChips,
  type Mode, type Speaker,
} from './scriptPractice';

// "Daily Dialogue" — short scripted exchanges, read like a chat. A list of
// dialogues (sidebar on desktop, its own screen on mobile) beside one open
// dialogue, which can be listened to or role-played (`scriptPractice`).
// Progress shares `useSpeakingProgress` with Short Conversation — dialogue ids
// (`dlg-*`) can't collide with question ids (`sp-*`).

type Level = Dialogue['level'];

const VOICE: Record<Speaker, string> = { a: CONV_VOICE_A, b: CONV_VOICE_B };
const TONES = { a: 'green', b: 'cyan' } as const;

const TOPIC_ICON: Record<(typeof dialogueTopics)[number], string> = {
  'Café & Restaurant': 'lucide:coffee',
  'Travel & Transport': 'lucide:plane',
  'Shopping': 'lucide:shopping-bag',
  'Workplace': 'lucide:briefcase',
  'Health': 'lucide:heart-pulse',
  'Making Friends': 'lucide:heart-handshake',
  'Phone & Service': 'lucide:phone',
  'Home & Neighbours': 'lucide:house',
  'Money & Banking': 'lucide:wallet',
  'Hobbies & Free Time': 'lucide:bike',
};
const topicIcon = (t: string) => TOPIC_ICON[t as keyof typeof TOPIC_ICON] ?? 'lucide:message-circle';

// Spelled out in full — Tailwind only keeps classes it finds as whole strings.
const LEVEL_CLASS: Record<Level, string> = {
  Easy: 'text-accent-green bg-accent-green/10 border-accent-green/20',
  Medium: 'text-accent-orange bg-accent-orange/10 border-accent-orange/20',
};
const LEVEL_LABEL: Record<Level, string> = {
  Easy: 'conversation.levelEasy',
  Medium: 'conversation.levelMedium',
};

/* ─── List ───────────────────────────────────────────────────── */
function DialogueList({ items, activeId, onSelect }: {
  items: Dialogue[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const progress = useSpeakingProgress((s) => s.questions);
  const groups = dialogueTopics
    .map((t) => ({ topic: t, items: items.filter((d) => d.topic === t) }))
    .filter((g) => g.items.length > 0);

  if (!groups.length) {
    return <p className="px-3 py-8 text-center text-sm text-text-muted"><FormattedMessage id="conversation.noDialoguesMatch" /></p>;
  }

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.topic}>
          <p className="flex items-center gap-1.5 px-2.5 mb-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">
            <Icon icon={topicIcon(g.topic)} width={12} />
            {g.topic}
          </p>
          <div className="space-y-0.5">
            {g.items.map((d) => {
              const on = d.id === activeId;
              const done = isPracticed(progress[d.id]);
              return (
                <button
                  key={d.id}
                  onClick={() => onSelect(d.id)}
                  aria-current={on ? 'true' : undefined}
                  className={`w-full flex items-start gap-2.5 px-2.5 py-2.5 rounded-lg text-left transition-colors cursor-pointer ${
                    on ? 'bg-accent-cyan/10' : 'hover:bg-bg-hover/60'
                  }`}
                >
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border ${
                    done ? 'bg-accent-green text-bg-primary border-accent-green' : on ? 'border-accent-cyan/40 text-accent-cyan' : 'border-border text-text-muted'
                  }`}>
                    <Icon icon={done ? 'lucide:check' : 'lucide:messages-square'} width={13} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className={`block text-[13px] leading-snug ${on ? 'font-semibold text-text-primary' : 'font-medium text-text-secondary'}`}>
                      {d.title}
                    </span>
                    <span className="flex items-center gap-1.5 mt-1 text-[11px] text-text-muted">
                      <span className={`text-[10px] px-1.5 rounded border ${LEVEL_CLASS[d.level]}`}><FormattedMessage id={LEVEL_LABEL[d.level]} /></span>
                      <FormattedMessage id="conversation.lineCount" values={{ count: d.lines.length }} /> · {d.duration}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── The open dialogue ──────────────────────────────────────── */
function DialogueView({ dialogue, onBack, onNext }: {
  dialogue: Dialogue;
  onBack: () => void;
  onNext: () => void;
}) {
  const intl = useIntl();
  const progress = useSpeakingProgress((s) => s.questions[dialogue.id]);
  const { markPracticed, clearPracticed } = useSpeakingProgress();
  const done = isPracticed(progress);
  const [mode, setMode] = useState<Mode>('listen');
  // Per dialogue — the parent keys this view by id, so switching resets it.
  const [revealed, setRevealed] = useState<Set<number>>(new Set());

  // Memoised: the player stops whenever its lines change identity.
  const lines = useMemo(() => dialogue.lines.map((l) => ({ ...l, voice: VOICE[l.speaker] })), [dialogue]);

  const finish = useCallback(() => {
    if (mode === 'listen') return;
    markPracticed(dialogue.id);
    toast.success(intl.formatMessage({ id: 'conversation.rolePlayComplete' }));
  }, [mode, dialogue.id, markPracticed, intl]);

  const player = useScriptPlayer(lines, mode === 'listen' ? null : mode, finish);

  const reveal = (i: number) => setRevealed((prev) => new Set(prev).add(i));
  const continueTurn = () => { reveal(player.index); player.resume(); };

  const pickMode = (m: Mode) => { setMode(m); setRevealed(new Set()); };
  const modes: { id: Mode; label: string; icon: string }[] = [
    { id: 'listen', label: intl.formatMessage({ id: 'conversation.listen' }), icon: 'lucide:headphones' },
    { id: 'a', label: intl.formatMessage({ id: 'conversation.beRole' }, { role: dialogue.speakers.a.toLowerCase() }), icon: 'lucide:drama' },
    {
      id: 'b',
      label: dialogue.speakers.b === 'You'
        ? intl.formatMessage({ id: 'conversation.beYourself' })
        : intl.formatMessage({ id: 'conversation.beRole' }, { role: dialogue.speakers.b.toLowerCase() }),
      icon: 'lucide:drama',
    },
  ];
  const myRole = mode === 'listen' ? null : dialogue.speakers[mode];
  const partner = mode === 'b' ? dialogue.speakers.a : dialogue.speakers.b;

  return (
    <article className="min-w-0">
      <button
        onClick={onBack}
        className="lg:hidden flex items-center gap-1 mb-3 text-xs font-semibold text-text-muted hover:text-text-primary cursor-pointer"
      >
        <Icon icon="lucide:arrow-left" width={14} /> <FormattedMessage id="conversation.allDialogues" />
      </button>

      {/* Header */}
      <header className="rounded-xl border border-border bg-bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-muted">
          <span className="flex items-center gap-1 font-semibold text-text-secondary">
            <Icon icon={topicIcon(dialogue.topic)} width={13} /> {dialogue.topic}
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${LEVEL_CLASS[dialogue.level]}`}><FormattedMessage id={LEVEL_LABEL[dialogue.level]} /></span>
          <span className="flex items-center gap-1"><Icon icon="lucide:clock" width={11} />{dialogue.duration}</span>
          <span><FormattedMessage id="conversation.lineCount" values={{ count: dialogue.lines.length }} /></span>
        </div>
        <h2 className="mt-2 text-xl font-extrabold text-text-primary leading-tight">{dialogue.title}</h2>
        <p className="mt-1.5 text-sm text-text-secondary leading-relaxed">{dialogue.situation}</p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <PracticedButton done={done} onToggle={() => (done ? clearPracticed(dialogue.id) : markPracticed(dialogue.id))} />
          <PracticeButton
            topic={`${dialogue.topic} — ${dialogue.title}`}
            focus={`Role-play this situation with me: ${dialogue.situation} You are the ${dialogue.speakers.a.toLowerCase()}, I am the ${dialogue.speakers.b.toLowerCase()}. Start the conversation.`}
            label={intl.formatMessage({ id: 'conversation.rolePlayWithAi' })}
            onStart={() => markPracticed(dialogue.id)}
          />
        </div>
      </header>

      <PlayerBar modes={modes} mode={mode} onMode={pickMode} player={player} total={lines.length} />

      {myRole && (
        <p className="mt-3 px-1 text-xs text-text-muted leading-relaxed">
          <FormattedMessage
            id="conversation.rolePlayHint"
            values={{
              role: myRole.toLowerCase(),
              partner: partner.toLowerCase(),
              b: (c) => <span className="font-semibold text-text-secondary">{c}</span>,
            }}
          />
        </p>
      )}

      <Transcript
        lines={lines}
        names={dialogue.speakers}
        tones={TONES}
        mode={mode}
        player={player}
        revealed={revealed}
        onReveal={(i) => (player.status === 'waiting' && player.index === i ? continueTurn() : reveal(i))}
      />

      {player.status === 'waiting' && (
        <YourTurnBar
          title={intl.formatMessage({ id: 'conversation.yourTurn' })}
          hint={intl.formatMessage({ id: 'conversation.sayLineHint' }, { role: myRole?.toLowerCase() ?? '' })}
          onContinue={continueTurn}
        />
      )}

      {/* Phrases + notes */}
      {(dialogue.usefulPhrases?.length || dialogue.notes?.length) ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {dialogue.usefulPhrases && dialogue.usefulPhrases.length > 0 && (
            <section className="rounded-xl border border-accent-yellow/15 bg-accent-yellow/5 p-4">
              <p className="flex items-center gap-1.5 text-xs font-bold text-accent-yellow mb-2.5">
                <Icon icon="lucide:quote" width={13} /> <FormattedMessage id="conversation.usefulPhrases" />
              </p>
              <PhraseChips phrases={dialogue.usefulPhrases} voice={CONV_VOICE_A} />
            </section>
          )}
          {dialogue.notes && dialogue.notes.length > 0 && (
            <section className="rounded-xl border border-accent-green/15 bg-accent-green/5 p-4">
              <p className="flex items-center gap-1.5 text-xs font-bold text-accent-green mb-2.5">
                <Icon icon="lucide:lightbulb" width={13} /> <FormattedMessage id="conversation.languageNotes" />
              </p>
              <ul className="space-y-1.5">
                {dialogue.notes.map((note) => (
                  <li key={note} className="text-xs text-text-secondary leading-relaxed flex items-start gap-2">
                    <span className="text-accent-green/60 shrink-0">•</span>
                    {note}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      ) : null}

      <div className="mt-4 flex justify-end">
        <button
          onClick={onNext}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold text-text-secondary bg-bg-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer"
        >
          <FormattedMessage id="conversation.nextDialogue" /> <Icon icon="lucide:arrow-right" width={14} />
        </button>
      </div>
    </article>
  );
}

/* ─── The tab ────────────────────────────────────────────────── */
export function DailyDialogueTab() {
  const intl = useIntl();
  const progress = useSpeakingProgress((s) => s.questions);
  const [level, setLevel] = useState<Level | 'all'>('all');
  // The first unpractised dialogue, so desktop never opens on an empty pane.
  const [activeId, setActiveId] = useState<string>(
    () => (dialogues.find((d) => !isPracticed(useSpeakingProgress.getState().questions[d.id])) ?? dialogues[0]).id,
  );
  // Mobile shows the list or the dialogue, not both; desktop ignores this.
  const [reading, setReading] = useState(false);

  const visible = useMemo(() => dialogues.filter((d) => level === 'all' || d.level === level), [level]);
  const practiced = dialogues.filter((d) => isPracticed(progress[d.id])).length;
  const active = dialogues.find((d) => d.id === activeId) ?? dialogues[0];

  const select = useCallback((id: string) => {
    setActiveId(id);
    setReading(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  /** The next dialogue in list order, preferring ones not yet practiced. */
  const next = useCallback(() => {
    const pool = visible.length ? visible : dialogues;
    const at = pool.findIndex((d) => d.id === activeId);
    const ordered = [...pool.slice(at + 1), ...pool.slice(0, Math.max(at, 0))];
    const pick = ordered.find((d) => !isPracticed(progress[d.id])) ?? ordered[0];
    if (pick) select(pick.id);
  }, [visible, activeId, progress, select]);

  return (
    <div className="lg:grid lg:grid-cols-[288px_minmax(0,1fr)] lg:gap-6">
      <aside className={`${reading ? 'hidden lg:block' : ''} lg:sticky lg:top-[calc(4.75rem+env(safe-area-inset-top))] lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1 space-y-4`}>
        <ProgressCard done={practiced} total={dialogues.length}>
          <div className="flex gap-1 mt-3">
            {(['all', 'Easy', 'Medium'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                aria-pressed={level === l}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer ${
                  level === l
                    ? l === 'all' ? 'bg-accent-cyan text-bg-primary border-accent-cyan' : LEVEL_CLASS[l]
                    : 'bg-bg-tertiary text-text-muted border-transparent hover:text-text-secondary'
                }`}
              >
                {intl.formatMessage({ id: l === 'all' ? 'conversation.allLevels' : LEVEL_LABEL[l] })}
              </button>
            ))}
          </div>
        </ProgressCard>

        <PracticeButton
          topic="Everyday Dialogues"
          focus="Role-play a short everyday conversation with me. You start."
          label={intl.formatMessage({ id: 'conversation.randomRolePlayWithAi' })}
        />

        <DialogueList items={visible} activeId={activeId} onSelect={select} />
      </aside>

      <section className={`${reading ? '' : 'hidden lg:block'} min-w-0`}>
        <DialogueView key={active.id} dialogue={active} onBack={() => setReading(false)} onNext={next} />
      </section>
    </div>
  );
}
