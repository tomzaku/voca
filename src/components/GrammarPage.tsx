import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Icon } from '@iconify/react';
import { useSearchParams } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  bareWord,
  drillAnswer,
  GRAMMAR_LESSONS,
  GRAMMAR_LEVELS,
  GRAMMAR_TOPICS,
  lessonById,
  lessonMatches,
  type Drill,
  type GrammarLesson,
  type GrammarLevel,
  type GrammarTopic,
  type Text,
} from '../data/grammar';
import { isCompleted, useGrammarProgress } from '../hooks/useGrammarProgress';
import { useAuth } from '../hooks/useAuth';
import { useHotkey } from '../hooks/useHotkey';
import { useLocale } from '../i18n/locale';
import { PASS_SCORE, type GrammarProgress } from '../lib/grammarApi';
import { speakText, stopSpeaking } from '../lib/tts';
import { playCorrect, playWin, playWrong } from '../lib/sfx';
import { COVER_GLASS, COVER_PRIMARY, CoverChip } from './CollectionCover';

// The Grammar course: lessons in a fixed order, each one rule → examples →
// a round of drills. Passing a round unlocks the next lesson; a locked one
// can still be "tested out of" by taking its drills cold, so a learner who
// already knows the early lessons isn't made to sit through them.
//
// The URL carries where you are (`?level=B1`, `?lesson=<id>&mode=test`), so a
// lesson is linkable and the browser's back button leaves it.

type Mode = 'learn' | 'test';

// Each CEFR band keeps the colour it has on /collections' level ladder, so
// "B1" looks the same wherever it appears. Spelled out in full — Tailwind
// only keeps classes it finds as complete strings.
const LEVEL_META: Record<GrammarLevel, { chip: string; bar: string; ring: string; tint: string; hero: string }> = {
  A1: { chip: 'bg-accent-green/15 text-accent-green', bar: 'bg-accent-green', ring: 'border-accent-green ring-accent-green/25', tint: 'from-accent-green/10', hero: 'from-accent-green via-accent-cyan to-accent-blue' },
  A2: { chip: 'bg-accent-cyan/15 text-accent-cyan', bar: 'bg-accent-cyan', ring: 'border-accent-cyan ring-accent-cyan/25', tint: 'from-accent-cyan/10', hero: 'from-accent-cyan via-accent-blue to-accent-purple' },
  B1: { chip: 'bg-accent-blue/15 text-accent-blue', bar: 'bg-accent-blue', ring: 'border-accent-blue ring-accent-blue/25', tint: 'from-accent-blue/10', hero: 'from-accent-blue via-accent-purple to-accent-pink' },
  B2: { chip: 'bg-accent-purple/15 text-accent-purple', bar: 'bg-accent-purple', ring: 'border-accent-purple ring-accent-purple/25', tint: 'from-accent-purple/10', hero: 'from-accent-purple via-accent-pink to-accent-orange' },
};

/** Stars for a best score: a pass is one, a strong pass two, perfect three. */
const starsFor = (score: number) => (score >= 100 ? 3 : score >= 85 ? 2 : score >= PASS_SCORE ? 1 : 0);

/** Lesson prose in the interface language — the English sentences stay English. */
function useTr() {
  const locale = useLocale((s) => s.locale);
  return (t: Text) => t[locale] ?? t.en;
}

/** A lesson is open once the one before it is passed — or once it's been tried. */
function useUnlocked() {
  const records = useGrammarProgress((s) => s.records);
  return useMemo(() => {
    const open = new Set<string>();
    GRAMMAR_LESSONS.forEach((l, i) => {
      if (i === 0 || records[l.id] || isCompleted(records[GRAMMAR_LESSONS[i - 1].id])) open.add(l.id);
    });
    return open;
  }, [records]);
}

/** `**part**` → that part highlighted, the rest plain. */
function Highlight({ text }: { text: string }) {
  return (
    <>
      {text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
        i % 2 ? <strong key={i} className="text-accent-cyan font-extrabold">{part}</strong> : <Fragment key={i}>{part}</Fragment>,
      )}
    </>
  );
}

function SpeakButton({ text }: { text: string }) {
  const intl = useIntl();
  const [on, setOn] = useState(false);
  // Drop the markup and any trailing "(note)" — those are for reading, not saying.
  const plain = text.replace(/\*\*/g, '').replace(/\s*\(.*\)\s*$/, '');
  return (
    <button
      onClick={() => {
        if (on) { stopSpeaking(); setOn(false); return; }
        void speakText(plain, { onStart: () => setOn(true), onEnd: () => setOn(false) });
      }}
      aria-label={intl.formatMessage({ id: 'grammar.listen' })}
      className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
        on ? 'bg-accent-cyan text-bg-primary' : 'bg-accent-cyan/10 text-accent-cyan hover:bg-accent-cyan/20'
      }`}
    >
      <Icon icon={on ? 'lucide:audio-lines' : 'lucide:volume-2'} className={on ? 'animate-pulse' : ''} />
    </button>
  );
}

function Stars({ count, size = 'sm' }: { count: number; size?: 'sm' | 'lg' }) {
  return (
    <span className={`flex items-center ${size === 'lg' ? 'gap-2 text-5xl' : 'gap-0.5 text-sm'}`}>
      {[0, 1, 2].map((i) => (
        <Icon
          key={i}
          // A solid glyph for earned stars: Lucide's are outline-only and
          // ignore `fill`.
          icon={i < count ? 'ph:star-fill' : 'ph:star'}
          className={`${i < count ? 'text-accent-yellow' : 'text-border'} ${size === 'lg' && i < count ? 'animate-pop-in' : ''}`}
          style={size === 'lg' ? { animationDelay: `${0.15 + i * 0.18}s` } : undefined}
        />
      ))}
    </span>
  );
}

/** The bold gradient banner both the course and a lesson open with. */
function Hero({ level, children }: { level: GrammarLevel; children: ReactNode }) {
  return (
    <header
      className={`relative overflow-hidden rounded-3xl bg-linear-to-br ${LEVEL_META[level].hero} px-5 sm:px-7 py-6 mb-6 text-white shadow-[0_12px_24px_-14px_rgba(0,0,0,0.5)]`}
    >
      {/* Soft light and shade so the gradient doesn't read as a flat fill. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_100%_0%,rgba(255,255,255,0.28),transparent_45%),radial-gradient(90%_80%_at_0%_100%,rgba(0,0,0,0.22),transparent_60%)]" />
      <div className="relative">{children}</div>
    </header>
  );
}

function IconTile({ icon }: { icon: string }) {
  return (
    <span className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 bg-white/20 ring-1 ring-white/30 backdrop-blur-sm">
      <Icon icon={icon} className="text-2xl sm:text-3xl" />
    </span>
  );
}

// ─── Course page ─────────────────────────────────────────────────────

function CourseHero({ onOpen }: { onOpen: (id: string, mode: Mode) => void }) {
  const tr = useTr();
  const records = useGrammarProgress((s) => s.records);
  const done = GRAMMAR_LESSONS.filter((l) => isCompleted(records[l.id])).length;
  const total = GRAMMAR_LESSONS.length;
  const next = GRAMMAR_LESSONS.find((l) => !isCompleted(records[l.id]));
  const pct = Math.round((done / total) * 100);

  return (
    <Hero level={next?.level ?? 'B2'}>
      <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-white/80">
        <FormattedMessage id={next ? (done ? 'grammar.upNext' : 'grammar.startHere') : 'grammar.allDone'} />
      </p>
      <div className="flex flex-col lg:flex-row lg:items-end gap-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <IconTile icon={next?.icon ?? 'lucide:trophy'} />
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-display font-extrabold leading-tight [text-shadow:0_1px_3px_rgba(0,0,0,0.25)]">
                {next ? tr(next.title) : <FormattedMessage id="grammar.allDoneTitle" />}
              </h1>
              {next && <p className="text-sm text-white/90 truncate">{tr(next.summary)}</p>}
            </div>
          </div>
          {next && (
            <div className="flex flex-wrap items-center gap-1.5 mt-3 text-[11px] font-bold">
              <CoverChip icon="lucide:graduation-cap">{next.level}</CoverChip>
              <CoverChip icon="lucide:hash"><FormattedMessage id="grammar.lessonOf" values={{ n: GRAMMAR_LESSONS.indexOf(next) + 1, total }} /></CoverChip>
              <CoverChip icon="lucide:list-checks"><FormattedMessage id="grammar.questions" values={{ count: next.drills.length }} /></CoverChip>
            </div>
          )}
          <div className="mt-4 max-w-md">
            <div className="h-2 rounded-full bg-white/25 overflow-hidden">
              <div className="h-full rounded-full bg-white transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs font-bold text-white/90 mt-1.5">
              <FormattedMessage id="grammar.progress" values={{ done, total }} />
            </p>
          </div>
        </div>
        {next && (
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => onOpen(next.id, 'learn')} className={COVER_PRIMARY}>
              <Icon icon="lucide:play" /> <FormattedMessage id={done ? 'grammar.continue' : 'grammar.start'} />
            </button>
            <button onClick={() => onOpen(next.id, 'test')} className={COVER_GLASS}>
              <Icon icon="lucide:zap" /> <FormattedMessage id="grammar.testOut" />
            </button>
          </div>
        )}
      </div>
    </Hero>
  );
}

function LevelCard({ level, title, active, onClick }: { level: GrammarLevel; title: string; active: boolean; onClick: () => void }) {
  const records = useGrammarProgress((s) => s.records);
  const lessons = GRAMMAR_LESSONS.filter((l) => l.level === level);
  const done = lessons.filter((l) => isCompleted(records[l.id])).length;
  const meta = LEVEL_META[level];
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-col text-left rounded-2xl border-2 bg-bg-card bg-linear-to-br ${meta.tint} to-transparent p-3.5 sm:p-4 transition-all hover:-translate-y-0.5 ${
        active ? `${meta.ring} ring-2` : 'border-border hover:border-border-light'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-display font-extrabold ${meta.chip}`}>{level}</span>
        {done === lessons.length && <Icon icon="lucide:badge-check" className="text-xl text-accent-green" />}
      </div>
      <p className="mt-2.5 font-display font-bold text-text-primary leading-tight">{title}</p>
      <div className="mt-2.5 h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
        <div className={`h-full rounded-full transition-all ${meta.bar}`} style={{ width: `${(done / lessons.length) * 100}%` }} />
      </div>
      <p className="mt-1.5 text-[11px] font-bold text-text-muted">
        <FormattedMessage id="grammar.levelDone" values={{ done, total: lessons.length }} />
      </p>
    </button>
  );
}

function LessonCard({ lesson, record, open, next, showLevel, onOpen }: {
  lesson: GrammarLesson;
  record: GrammarProgress | undefined;
  open: boolean;
  next: boolean;
  /** In a topic, lessons from several levels sit together — say which. */
  showLevel: boolean;
  onOpen: (id: string, mode: Mode) => void;
}) {
  const tr = useTr();
  const meta = LEVEL_META[lesson.level];
  const passed = isCompleted(record);
  const n = GRAMMAR_LESSONS.indexOf(lesson) + 1;
  return (
    <li
      className={`group relative min-w-0 flex gap-3 rounded-2xl border-2 bg-bg-card p-3.5 transition-all ${
        next ? `${meta.ring} ring-2` : 'border-border'
      } ${open ? 'hover:-translate-y-0.5 hover:border-border-light' : ''}`}
    >
      {open && <button onClick={() => onOpen(lesson.id, 'learn')} aria-label={tr(lesson.title)} className="absolute inset-0 rounded-2xl" />}
      <span
        className={`relative pointer-events-none w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-xl ${
          passed ? 'bg-accent-green text-bg-primary' : open ? meta.chip : 'bg-bg-tertiary text-text-muted'
        }`}
      >
        <Icon icon={passed ? 'lucide:check' : lesson.icon} />
        {/* A badge, not a padlock in place of the icon: a course that's mostly
            locked should still show what's coming, not a wall of locks. */}
        {!open && (
          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-bg-card border-2 border-border flex items-center justify-center">
            <Icon icon="lucide:lock" className="text-[10px] text-text-muted" />
          </span>
        )}
      </span>
      <div className="relative pointer-events-none flex-1 min-w-0">
        <div className="flex items-center gap-2 text-[11px] font-extrabold text-text-muted">
          {showLevel && <span className={`px-1.5 py-px rounded-md text-[10px] ${meta.chip}`}>{lesson.level}</span>}
          <FormattedMessage id="grammar.lessonN" values={{ n }} />
          {next && (
            <span className={`px-1.5 py-px rounded-full uppercase tracking-wide text-[9px] ${meta.chip}`}>
              <FormattedMessage id="grammar.upNextTag" />
            </span>
          )}
        </div>
        <p className={`font-display font-bold leading-tight truncate ${open ? 'text-text-primary' : 'text-text-secondary'}`}>{tr(lesson.title)}</p>
        <p className="text-xs text-text-muted truncate">{tr(lesson.summary)}</p>
      </div>
      <div className="relative flex flex-col items-end justify-center gap-1 shrink-0">
        {record ? (
          <>
            <Stars count={starsFor(record.bestScore)} />
            <span className={`text-[11px] font-extrabold ${passed ? 'text-accent-green' : 'text-accent-orange'}`}>{record.bestScore}%</span>
          </>
        ) : !open ? (
          <button
            onClick={() => onOpen(lesson.id, 'test')}
            className="text-xs font-bold px-2.5 py-1.5 rounded-full bg-bg-tertiary text-text-secondary hover:text-accent-cyan hover:bg-accent-cyan/10"
          >
            <FormattedMessage id="grammar.testOut" />
          </button>
        ) : (
          <Icon icon="lucide:chevron-right" className="pointer-events-none text-text-muted text-lg" />
        )}
      </div>
    </li>
  );
}

type View = 'level' | 'topic';

/** One heading and its lessons — a level or a topic, depending on the view. */
function Section({ badge, title, lessons, showLevel, onOpen }: {
  badge: ReactNode;
  title: string;
  lessons: GrammarLesson[];
  showLevel: boolean;
  onOpen: (id: string, mode: Mode) => void;
}) {
  const records = useGrammarProgress((s) => s.records);
  const unlocked = useUnlocked();
  const next = GRAMMAR_LESSONS.find((l) => !isCompleted(records[l.id]));
  const done = lessons.filter((l) => isCompleted(records[l.id])).length;
  return (
    <section className="mb-7">
      <h2 className="flex items-center gap-2 mb-3">
        {badge}
        <span className="font-display font-extrabold text-lg text-text-primary leading-tight">{title}</span>
        <span className="ml-auto shrink-0 text-xs font-bold text-text-muted">
          <FormattedMessage id="grammar.levelDone" values={{ done, total: lessons.length }} />
        </span>
      </h2>
      <ol className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {lessons.map((lesson) => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            record={records[lesson.id]}
            open={unlocked.has(lesson.id)}
            next={lesson.id === next?.id}
            showLevel={showLevel}
            onOpen={onOpen}
          />
        ))}
      </ol>
    </section>
  );
}

function TopicChip({ topic, icon, title, active, onClick }: { topic: GrammarTopic; icon: string; title: string; active: boolean; onClick: () => void }) {
  const records = useGrammarProgress((s) => s.records);
  const lessons = GRAMMAR_LESSONS.filter((l) => l.topic === topic);
  const done = lessons.filter((l) => isCompleted(records[l.id])).length;
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 flex items-center gap-1.5 pl-2.5 pr-3 py-2 rounded-full border-2 text-sm font-bold transition-colors ${
        active ? 'border-accent-cyan bg-accent-cyan/10 text-accent-cyan' : 'border-border bg-bg-card text-text-secondary hover:border-border-light hover:text-text-primary'
      }`}
    >
      <Icon icon={icon} className="text-base" />
      {title}
      <span className={`text-[11px] font-extrabold ${active ? 'text-accent-cyan/80' : 'text-text-muted'}`}>{done}/{lessons.length}</span>
    </button>
  );
}

function CoursePage({ view, level, topic, query, onChange, onOpen }: {
  view: View;
  level: GrammarLevel | null;
  topic: GrammarTopic | null;
  query: string;
  onChange: (next: { view?: View; level?: GrammarLevel | null; topic?: GrammarTopic | null; q?: string }) => void;
  onOpen: (id: string, mode: Mode) => void;
}) {
  const tr = useTr();
  const intl = useIntl();
  // The box keeps its own text: the URL copy lands a beat after each
  // keystroke, and an input driven by it alone drops letters typed in between.
  const [text, setText] = useState(query);
  const search = (q: string) => { setText(q); onChange({ q }); };
  const matching = GRAMMAR_LESSONS.filter((l) => lessonMatches(l, text));

  // One list of sections for either view, already narrowed by the filter
  // and the search, with empty sections dropped.
  const sections = view === 'level'
    ? GRAMMAR_LEVELS.filter((l) => !level || l.level === level).map((l) => ({
        key: l.level,
        badge: <span className={`px-2 py-0.5 rounded-lg text-xs font-extrabold ${LEVEL_META[l.level].chip}`}>{l.level}</span>,
        title: tr(l.title),
        lessons: matching.filter((x) => x.level === l.level),
      }))
    : GRAMMAR_TOPICS.filter((t) => !topic || t.topic === topic).map((t) => ({
        key: t.topic,
        badge: (
          <span className="w-8 h-8 rounded-xl flex items-center justify-center bg-accent-cyan/15 text-accent-cyan shrink-0">
            <Icon icon={t.icon} />
          </span>
        ),
        title: tr(t.title),
        lessons: matching.filter((x) => x.topic === t.topic),
      }));
  const shown = sections.filter((s) => s.lessons.length > 0);
  const found = shown.reduce((n, s) => n + s.lessons.length, 0);
  const filtered = !!text.trim() || (view === 'level' ? !!level : !!topic);

  return (
    <>
      <CourseHero onOpen={onOpen} />

      <div className="flex flex-col sm:flex-row gap-2.5 mb-4">
        <label className="relative flex-1">
          <Icon icon="lucide:search" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            type="search"
            value={text}
            onChange={(e) => search(e.target.value)}
            placeholder={intl.formatMessage({ id: 'grammar.searchPlaceholder' })}
            aria-label={intl.formatMessage({ id: 'grammar.searchPlaceholder' })}
            className="w-full h-11 pl-10 pr-10 rounded-2xl border-2 border-border bg-bg-card text-text-primary font-bold placeholder:text-text-muted placeholder:font-semibold focus:outline-none focus:border-accent-cyan [&::-webkit-search-cancel-button]:hidden"
          />
          {text && (
            <button
              onClick={() => search('')}
              aria-label={intl.formatMessage({ id: 'grammar.clearSearch' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-text-muted hover:bg-bg-tertiary hover:text-text-primary"
            >
              <Icon icon="lucide:x" />
            </button>
          )}
        </label>
        <div role="radiogroup" aria-label={intl.formatMessage({ id: 'grammar.groupBy' })} className="shrink-0 flex p-1 rounded-2xl border-2 border-border bg-bg-tertiary">
          {([['level', 'lucide:signal', 'grammar.byLevel'], ['topic', 'lucide:layout-grid', 'grammar.byTopic']] as const).map(([v, icon, id]) => (
            <button
              key={v}
              role="radio"
              aria-checked={view === v}
              onClick={() => onChange({ view: v })}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 h-8 rounded-xl text-sm font-bold transition-colors ${
                view === v ? 'bg-bg-card text-accent-cyan shadow-sm' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <Icon icon={icon} /> <FormattedMessage id={id} />
            </button>
          ))}
        </div>
      </div>

      {/* Filters: tap one to narrow the list to it, tap it again for everything. */}
      {view === 'level' ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mb-6">
          {GRAMMAR_LEVELS.map((l) => (
            <LevelCard key={l.level} level={l.level} title={tr(l.title)} active={l.level === level} onClick={() => onChange({ level: l.level === level ? null : l.level })} />
          ))}
        </div>
      ) : (
        <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex gap-2 overflow-x-auto sm:flex-wrap pb-1 mb-6">
          {GRAMMAR_TOPICS.map((t) => (
            <TopicChip key={t.topic} topic={t.topic} icon={t.icon} title={tr(t.title)} active={t.topic === topic} onClick={() => onChange({ topic: t.topic === topic ? null : t.topic })} />
          ))}
        </div>
      )}

      {filtered && (
        <div className="flex items-center justify-between gap-2 mb-4 text-sm font-bold text-text-muted">
          <span><FormattedMessage id="grammar.found" values={{ count: found }} /></span>
          <button onClick={() => { setText(''); onChange({ q: '', level: null, topic: null }); }} className="flex items-center gap-1 text-accent-cyan hover:underline">
            <Icon icon="lucide:list" /> <FormattedMessage id="grammar.showAll" />
          </button>
        </div>
      )}

      {shown.length ? shown.map((s) => (
        <Section key={s.key} badge={s.badge} title={s.title} lessons={s.lessons} showLevel={view === 'topic'} onOpen={onOpen} />
      )) : (
        <div className="card-game p-8 text-center">
          <Icon icon="lucide:search-x" className="mx-auto text-4xl text-text-muted mb-2" />
          <p className="font-bold text-text-primary"><FormattedMessage id="grammar.noResults" values={{ query: text }} /></p>
          <p className="text-sm text-text-muted mt-1"><FormattedMessage id="grammar.noResultsHint" /></p>
        </div>
      )}
    </>
  );
}

// ─── Learn step ──────────────────────────────────────────────────────

// Colours for the parts of a formula, in order — so "have + V3 + for" reads
// as three separate pieces at a glance.
const PART_COLORS = [
  'bg-accent-purple/15 text-accent-purple',
  'bg-accent-cyan/15 text-accent-cyan',
  'bg-accent-orange/15 text-accent-orange',
  'bg-accent-green/15 text-accent-green',
];

/** "have / has + V3  (I have seen)" → coloured chips, then the example muted. */
function Formula({ line }: { line: string }) {
  const [formula, example] = line.split(/\s{2,}(?=\()/);
  const parts = formula.split(' + ');
  return (
    <li className="flex flex-wrap items-center gap-1.5">
      {parts.length > 1 ? parts.map((p, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="text-text-muted font-bold">+</span>}
          <span className={`px-2 py-1 rounded-lg text-sm font-bold ${PART_COLORS[i % PART_COLORS.length]}`}>{p}</span>
        </Fragment>
      )) : <span className="text-sm font-bold text-text-primary">{formula}</span>}
      {example && <span className="text-xs text-text-muted italic">{example}</span>}
    </li>
  );
}

function SectionTitle({ icon, id }: { icon: string; id: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-text-muted mb-3">
      <Icon icon={icon} className="text-sm" /> <FormattedMessage id={id} />
    </div>
  );
}

function LearnStep({ lesson, onPractice, onOpen }: { lesson: GrammarLesson; onPractice: () => void; onOpen: (id: string, mode: Mode) => void }) {
  const tr = useTr();
  const unlocked = useUnlocked();
  const n = GRAMMAR_LESSONS.indexOf(lesson);
  const prev = GRAMMAR_LESSONS[n - 1];
  const next = GRAMMAR_LESSONS[n + 1];

  return (
    <div className="space-y-4 animate-fade-in">
      <section className="card-game p-5">
        <SectionTitle icon="lucide:book-open" id="grammar.rule" />
        <p className="text-text-primary leading-relaxed">{tr(lesson.rule)}</p>
      </section>

      <section className="card-game p-5">
        <SectionTitle icon="lucide:puzzle" id="grammar.form" />
        <ul className="space-y-2.5">{lesson.pattern.map((p) => <Formula key={p} line={p} />)}</ul>
      </section>

      <section className="card-game p-5">
        <SectionTitle icon="lucide:quote" id="grammar.examples" />
        <ul className="space-y-2">
          {lesson.examples.map((ex) => (
            <li key={ex} className="flex items-center gap-3 rounded-xl bg-bg-tertiary/60 px-3 py-2">
              <SpeakButton text={ex} />
              <span className="text-text-primary"><Highlight text={ex} /></span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex items-start gap-3 rounded-3xl border-[3px] border-accent-orange/30 bg-accent-orange/5 p-5">
        <Icon icon="circle-flags:vn" className="shrink-0 text-2xl mt-0.5" />
        <div>
          <div className="text-xs font-extrabold uppercase tracking-wide text-accent-orange mb-1"><FormattedMessage id="grammar.viNoteTitle" /></div>
          <p className="text-sm text-text-secondary leading-relaxed">{tr(lesson.viNote)}</p>
        </div>
      </section>

      {/* Kept in reach while scrolling a long lesson on a phone. */}
      <div className="sticky bottom-4 z-10 pt-2">
        <button onClick={onPractice} className="btn-3d w-full py-3.5 bg-accent-green text-bg-primary flex items-center justify-center gap-2">
          <Icon icon="lucide:dumbbell" /> <FormattedMessage id="grammar.practice" values={{ count: lesson.drills.length }} />
        </button>
      </div>

      <nav className="flex items-center justify-between gap-2 pt-2 text-sm font-bold">
        {prev ? (
          <button onClick={() => onOpen(prev.id, 'learn')} className="flex items-center gap-1 min-w-0 text-text-muted hover:text-text-primary">
            <Icon icon="lucide:chevron-left" className="shrink-0" /> <span className="truncate">{tr(prev.title)}</span>
          </button>
        ) : <span />}
        {next && unlocked.has(next.id) && (
          <button onClick={() => onOpen(next.id, 'learn')} className="flex items-center gap-1 min-w-0 text-text-muted hover:text-text-primary">
            <span className="truncate">{tr(next.title)}</span> <Icon icon="lucide:chevron-right" className="shrink-0" />
          </button>
        )}
      </nav>
    </div>
  );
}

// ─── Drills ──────────────────────────────────────────────────────────

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type DrillProps<K extends Drill['kind']> = { drill: Extract<Drill, { kind: K }>; answered: boolean; grade: (ok: boolean) => void };

const DRILL_LABEL: Record<Drill['kind'], { icon: string; id: string }> = {
  choice: { icon: 'lucide:text-cursor-input', id: 'grammar.drillChoice' },
  error: { icon: 'lucide:bug', id: 'grammar.drillError' },
  order: { icon: 'lucide:blocks', id: 'grammar.drillOrder' },
};

/** One drill, answered once. `onAnswer` fires the moment it's graded. */
function DrillCard({ drill, onAnswer, answered }: { drill: Drill; onAnswer: (ok: boolean) => void; answered: boolean }) {
  const grade = (ok: boolean) => {
    if (ok) playCorrect(); else playWrong();
    onAnswer(ok);
  };
  const label = DRILL_LABEL[drill.kind];
  return (
    <>
      <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-text-muted mb-4">
        <Icon icon={label.icon} className="text-sm" /> <FormattedMessage id={label.id} />
      </div>
      {drill.kind === 'choice' && <ChoiceDrill drill={drill} answered={answered} grade={grade} />}
      {drill.kind === 'error' && <ErrorDrill drill={drill} answered={answered} grade={grade} />}
      {drill.kind === 'order' && <OrderDrill drill={drill} answered={answered} grade={grade} />}
    </>
  );
}

function ChoiceDrill({ drill, answered, grade }: DrillProps<'choice'>) {
  const [picked, setPicked] = useState<number | null>(null);
  const [before, after] = drill.prompt.split('___');
  const pick = (i: number) => {
    if (answered) return;
    setPicked(i);
    grade(i === drill.answer);
  };
  // 1 / 2 / 3 answer from the keyboard.
  useHotkey('1', () => pick(0));
  useHotkey('2', () => pick(1));
  useHotkey('3', () => pick(2));
  return (
    <>
      <p className="text-xl sm:text-2xl font-bold text-text-primary mb-6 leading-relaxed">
        {before}
        <span className={`inline-block min-w-20 px-2 mx-0.5 border-b-[3px] text-center ${
          picked === null ? 'border-accent-cyan/60' : picked === drill.answer ? 'border-accent-green text-accent-green' : 'border-accent-red text-accent-red'
        }`}>
          {picked === null ? ' ' : drill.options[picked]}
        </span>
        {after}
      </p>
      <div className="grid gap-2.5 sm:grid-cols-3">
        {drill.options.map((opt, i) => {
          // One full set of colours per state: Tailwind doesn't let a later
          // class in the string override an earlier one of the same kind.
          const state = !answered
            ? 'border-border bg-bg-card text-text-primary hover:border-accent-cyan hover:bg-accent-cyan/5'
            : i === drill.answer ? 'bg-accent-green/15 border-accent-green text-accent-green'
            : i === picked ? 'bg-accent-red/10 border-accent-red text-accent-red animate-shake'
            : 'border-border bg-bg-card text-text-primary opacity-50';
          return (
            <button
              key={opt}
              disabled={answered}
              onClick={() => pick(i)}
              className={`flex items-center gap-2 rounded-2xl border-2 px-3.5 py-3 font-bold text-left transition-colors ${state}`}
            >
              <span className="hidden sm:flex w-5 h-5 shrink-0 rounded-md bg-bg-tertiary text-text-muted text-[11px] items-center justify-center">{i + 1}</span>
              {opt}
            </button>
          );
        })}
      </div>
    </>
  );
}

function ErrorDrill({ drill, answered, grade }: DrillProps<'error'>) {
  const [picked, setPicked] = useState<number | null>(null);
  const tokens = drill.sentence.split(' ');
  const wrongAt = tokens.findIndex((t) => bareWord(t) === drill.wrong);
  return (
    <div className="flex flex-wrap gap-1.5 text-xl sm:text-2xl font-bold">
      {tokens.map((t, i) => {
        const state = !answered
          ? 'text-text-primary bg-bg-tertiary/60 hover:bg-accent-cyan/15 hover:text-accent-cyan'
          // Underlined, not struck out: some mistakes are a missing word
          // just before this one, so "very" isn't itself wrong.
          : i === wrongAt ? 'bg-accent-red/15 text-accent-red underline decoration-wavy decoration-2 underline-offset-4'
          : i === picked ? 'bg-accent-orange/15 text-accent-orange'
          : 'text-text-primary';
        return (
          <button
            key={i}
            disabled={answered}
            onClick={() => { setPicked(i); grade(i === wrongAt); }}
            className={`rounded-xl px-2 py-1 transition-colors ${state}`}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}

function OrderDrill({ drill, answered, grade }: DrillProps<'order'>) {
  // Indexes into `drill.chunks`, so a word that appears twice stays two tiles.
  const [bank] = useState(() => {
    let order = shuffle(drill.chunks.map((_, i) => i));
    // A shuffle that lands on the answer isn't a drill.
    for (let tries = 0; tries < 5 && order.every((v, i) => v === i); tries++) order = shuffle(order);
    return order;
  });
  const [placed, setPlaced] = useState<number[]>([]);
  const left = bank.filter((i) => !placed.includes(i));
  const ok = placed.map((i) => drill.chunks[i]).join(' ') === drill.chunks.join(' ');
  const check = () => { if (!answered && left.length === 0) grade(ok); };
  useHotkey('enter', check);

  const tile = 'rounded-xl border-2 px-3 py-2 font-bold transition-all animate-pop-in';
  return (
    <>
      <div className={`min-h-16 flex flex-wrap content-start gap-2 rounded-2xl border-2 border-dashed p-2.5 mb-4 ${
        answered ? (ok ? 'border-accent-green bg-accent-green/5' : 'border-accent-red bg-accent-red/5') : 'border-border bg-bg-tertiary/40'
      }`}>
        {placed.map((i) => (
          <button
            key={i}
            disabled={answered}
            onClick={() => setPlaced((p) => p.filter((x) => x !== i))}
            className={`${tile} border-accent-cyan/50 bg-accent-cyan/10 text-text-primary`}
          >
            {drill.chunks[i]}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 min-h-12">
        {left.map((i) => (
          <button
            key={i}
            disabled={answered}
            onClick={() => setPlaced((p) => [...p, i])}
            className={`${tile} border-border bg-bg-card text-text-primary hover:border-accent-cyan hover:-translate-y-0.5`}
          >
            {drill.chunks[i]}
          </button>
        ))}
      </div>
      {!answered && (
        <button disabled={left.length > 0} onClick={check} className="btn-3d mt-5 w-full py-3 bg-accent-cyan text-bg-primary">
          <FormattedMessage id="grammar.check" />
        </button>
      )}
    </>
  );
}

function PracticeStep({ lesson, onFinish }: { lesson: GrammarLesson; onFinish: (results: boolean[]) => void }) {
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<boolean[]>([]);
  const drill = lesson.drills[index];
  const answered = results.length > index;
  const last = index === lesson.drills.length - 1;
  const ok = results[index];

  const next = () => {
    if (!answered) return;
    if (last) onFinish(results);
    else setIndex((i) => i + 1);
  };
  useHotkey('enter', next);

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 flex gap-1.5">
          {lesson.drills.map((_, i) => (
            <span
              key={i}
              className={`h-2.5 flex-1 rounded-full transition-colors ${
                i < results.length ? (results[i] ? 'bg-accent-green' : 'bg-accent-red') : i === index ? 'bg-accent-cyan' : 'bg-border'
              }`}
            />
          ))}
        </div>
        <span className="text-xs font-extrabold text-text-muted tabular-nums">{index + 1}/{lesson.drills.length}</span>
      </div>

      <div key={index} className="card-game p-5 sm:p-6 animate-question-in">
        <DrillCard drill={drill} answered={answered} onAnswer={(r) => setResults((rs) => [...rs, r])} />
        {answered && (
          <div className="mt-6 animate-fade-in">
            <div className={`flex items-start gap-3 rounded-2xl px-4 py-3 ${ok ? 'bg-accent-green/10' : 'bg-accent-red/10'}`}>
              <Icon
                icon={ok ? 'lucide:circle-check' : 'lucide:circle-x'}
                className={`shrink-0 mt-0.5 text-xl ${ok ? 'text-accent-green' : 'text-accent-red'}`}
              />
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-extrabold ${ok ? 'text-accent-green' : 'text-accent-red'}`}>
                  <FormattedMessage id={ok ? 'grammar.correct' : 'grammar.notQuite'} />
                </div>
                <div className="text-text-primary font-bold">{drillAnswer(drill)}</div>
              </div>
              <SpeakButton text={drillAnswer(drill)} />
            </div>
            <button onClick={next} className="btn-3d mt-4 w-full py-3 bg-accent-green text-bg-primary">
              <FormattedMessage id={last ? 'grammar.seeResult' : 'grammar.next'} />
            </button>
          </div>
        )}
      </div>
      <p className="hidden sm:block mt-3 text-center text-[11px] text-text-muted"><FormattedMessage id="grammar.keysHint" /></p>
    </div>
  );
}

// ─── Result ──────────────────────────────────────────────────────────

function ResultStep({ lesson, results, onRetry, onReview, onNext, onCourse }: {
  lesson: GrammarLesson;
  results: boolean[];
  onRetry: () => void;
  onReview: () => void;
  onNext: (() => void) | null;
  onCourse: () => void;
}) {
  const correct = results.filter(Boolean).length;
  const score = Math.round((correct / results.length) * 100);
  const passed = score >= PASS_SCORE;
  const missed = lesson.drills.filter((_, i) => !results[i]);
  useEffect(() => { if (passed) playWin(); }, [passed]);

  return (
    <div className="space-y-4">
      <div className="card-game p-6 text-center animate-bounce-in">
        <div className="flex justify-center mb-3"><Stars count={starsFor(score)} size="lg" /></div>
        <div className="font-display font-black text-5xl text-text-primary tabular-nums">{score}%</div>
        <p className="mt-1 text-sm font-bold text-text-muted">
          <FormattedMessage id="grammar.scoreLine" values={{ correct, total: results.length }} />
        </p>
        <p className={`mt-3 text-sm font-bold ${passed ? 'text-accent-green' : 'text-accent-orange'}`}>
          <FormattedMessage id={passed ? 'grammar.passed' : 'grammar.notPassed'} values={{ pass: PASS_SCORE }} />
        </p>
        <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
          {passed && onNext ? (
            <button onClick={onNext} className="btn-3d py-3 bg-accent-green text-bg-primary flex items-center justify-center gap-1.5">
              <FormattedMessage id="grammar.nextLesson" /> <Icon icon="lucide:arrow-right" />
            </button>
          ) : !passed ? (
            <button onClick={onReview} className="btn-3d py-3 bg-accent-cyan text-bg-primary flex items-center justify-center gap-1.5">
              <Icon icon="lucide:book-open" /> <FormattedMessage id="grammar.reviewRule" />
            </button>
          ) : null}
          <button onClick={onRetry} className={`btn-3d py-3 bg-bg-tertiary text-text-primary flex items-center justify-center gap-1.5 ${passed && !onNext ? 'sm:col-span-2' : ''}`}>
            <Icon icon="lucide:rotate-ccw" /> <FormattedMessage id="grammar.tryAgain" />
          </button>
        </div>
        <button onClick={onCourse} className="mt-3 py-1 text-sm font-bold text-text-muted hover:text-text-secondary">
          <FormattedMessage id="grammar.backToCourse" />
        </button>
      </div>

      {missed.length > 0 && (
        <section className="card-game p-5">
          <SectionTitle icon="lucide:flag" id="grammar.missedTitle" />
          <ul className="space-y-2">
            {missed.map((d, i) => (
              <li key={i} className="flex items-center gap-3 rounded-xl bg-bg-tertiary/60 px-3 py-2">
                <Icon icon="lucide:circle-x" className="shrink-0 text-accent-red" />
                <span className="flex-1 min-w-0 text-text-primary font-bold">{drillAnswer(d)}</span>
                <SpeakButton text={drillAnswer(d)} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// ─── Lesson ──────────────────────────────────────────────────────────

type Step = 'learn' | 'practice' | 'result';
const STEPS: { step: Step; id: string }[] = [
  { step: 'learn', id: 'grammar.stepLearn' },
  { step: 'practice', id: 'grammar.stepPractice' },
  { step: 'result', id: 'grammar.stepResult' },
];

function LessonView({ lesson, mode, onOpen, onCourse }: {
  lesson: GrammarLesson;
  mode: Mode;
  onOpen: (id: string, mode: Mode) => void;
  onCourse: () => void;
}) {
  const tr = useTr();
  const recordAttempt = useGrammarProgress((s) => s.recordAttempt);
  const [step, setStep] = useState<Step>(mode === 'test' ? 'practice' : 'learn');
  const [results, setResults] = useState<boolean[]>([]);
  // Bumped on retry so the drills remount with a fresh shuffle and no answers.
  const [round, setRound] = useState(0);
  const n = GRAMMAR_LESSONS.indexOf(lesson);
  const nextLesson = GRAMMAR_LESSONS[n + 1];
  const stepAt = STEPS.findIndex((s) => s.step === step);

  let body: ReactNode;
  if (step === 'learn') {
    body = <LearnStep lesson={lesson} onPractice={() => setStep('practice')} onOpen={onOpen} />;
  } else if (step === 'practice') {
    body = (
      <PracticeStep
        key={round}
        lesson={lesson}
        onFinish={(r) => {
          recordAttempt(lesson.id, r.filter(Boolean).length, r.length);
          setResults(r);
          setStep('result');
          window.scrollTo({ top: 0 });
        }}
      />
    );
  } else {
    body = (
      <ResultStep
        lesson={lesson}
        results={results}
        onRetry={() => { setRound((r) => r + 1); setStep('practice'); }}
        onReview={() => setStep('learn')}
        onNext={nextLesson ? () => onOpen(nextLesson.id, 'learn') : null}
        onCourse={onCourse}
      />
    );
  }

  return (
    <>
      <Hero level={lesson.level}>
        <button onClick={onCourse} className="mb-3 flex items-center gap-1 text-xs font-extrabold text-white/85 hover:text-white">
          <Icon icon="lucide:arrow-left" /> <FormattedMessage id="grammar.title" />
        </button>
        <div className="flex items-center gap-3">
          <IconTile icon={lesson.icon} />
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-white/80">
              {lesson.level} · <FormattedMessage id="grammar.lessonN" values={{ n: n + 1 }} />
            </p>
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold leading-tight [text-shadow:0_1px_3px_rgba(0,0,0,0.25)]">{tr(lesson.title)}</h1>
            <p className="text-sm text-white/90">{tr(lesson.summary)}</p>
          </div>
        </div>
        <ol className="mt-4 flex items-center gap-1.5 text-[11px] font-extrabold">
          {STEPS.map((s, i) => (
            <Fragment key={s.step}>
              {i > 0 && <span className={`h-0.5 w-4 sm:w-6 rounded-full ${i <= stepAt ? 'bg-white' : 'bg-white/30'}`} />}
              <li className={`flex items-center gap-1 px-2.5 py-1 rounded-full ${
                i === stepAt ? 'bg-white text-gray-900' : i < stepAt ? 'bg-white/25 text-white' : 'bg-white/10 text-white/70'
              }`}>
                {i < stepAt && <Icon icon="lucide:check" />}
                <FormattedMessage id={s.id} />
              </li>
            </Fragment>
          ))}
        </ol>
        {mode === 'test' && step === 'practice' && (
          <p className="mt-3 text-xs font-bold text-white/90"><FormattedMessage id="grammar.testOutHint" values={{ pass: PASS_SCORE }} /></p>
        )}
      </Hero>
      {body}
    </>
  );
}

// ─── Page ────────────────────────────────────────────────────────────

const isLevel = (v: string | null): v is GrammarLevel => GRAMMAR_LEVELS.some((l) => l.level === v);
const isTopic = (v: string | null): v is GrammarTopic => GRAMMAR_TOPICS.some((t) => t.topic === v);

export function GrammarPage() {
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const sync = useGrammarProgress((s) => s.sync);
  // Another device may have got further; fold its progress in once per visit.
  useEffect(() => { if (user) void sync(); }, [user, sync]);
  useEffect(() => () => stopSpeaking(), []);

  const lesson = lessonById(params.get('lesson') ?? '');
  const mode: Mode = params.get('mode') === 'test' ? 'test' : 'learn';
  // The course list's state lives in the URL too, so coming back from a
  // lesson lands on the same view, filter and search.
  const view: View = params.get('view') === 'topic' ? 'topic' : 'level';
  const levelParam = params.get('level');
  const topicParam = params.get('topic');
  const query = params.get('q') ?? '';

  const open = (id: string, m: Mode) => {
    setParams(m === 'test' ? { lesson: id, mode: 'test' } : { lesson: id });
    window.scrollTo({ top: 0 });
  };
  // Back to the course on the lesson's own level, so you land where you were.
  const course = () => { setParams(lesson ? { level: lesson.level } : {}); window.scrollTo({ top: 0 }); };

  // Each change rewrites the course's params as a whole; a view switch drops
  // the other view's filter, and typing replaces history rather than adding
  // a step per keystroke.
  const change = (next: { view?: View; level?: GrammarLevel | null; topic?: GrammarTopic | null; q?: string }) => {
    const v = next.view ?? view;
    const out: Record<string, string> = {};
    if (v === 'topic') out.view = 'topic';
    const lv = next.level !== undefined ? next.level : levelParam;
    const tp = next.topic !== undefined ? next.topic : topicParam;
    if (v === 'level' && lv) out.level = lv;
    if (v === 'topic' && tp) out.topic = tp;
    const q = next.q ?? query;
    if (q) out.q = q;
    setParams(out, { replace: true });
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      {lesson ? (
        <div className="max-w-2xl mx-auto">
          {/* Keyed so moving to the next lesson starts it from the top. */}
          <LessonView key={`${lesson.id}:${mode}`} lesson={lesson} mode={mode} onOpen={open} onCourse={course} />
        </div>
      ) : (
        <CoursePage
          view={view}
          level={isLevel(levelParam) ? levelParam : null}
          topic={isTopic(topicParam) ? topicParam : null}
          query={query}
          onChange={change}
          onOpen={open}
        />
      )}
    </div>
  );
}
