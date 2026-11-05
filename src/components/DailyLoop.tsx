import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { FormattedMessage, useIntl } from 'react-intl';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { useDailyGoal, useWordsToday } from '../hooks/useDailyGoal';
import { localDateString } from '../hooks/useStreak';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { fetchSettings } from '../lib/settingsApi';
import { formatTime, fromTimeInputValue, pushConfigured, toTimeInputValue } from '../lib/push';
import { supabase } from '../lib/supabase';
import { playWin } from '../lib/sfx';

// The two nudges that turn one session into a habit, mounted once in the app
// shell so they fire wherever the answer that triggers them was given:
//   - a toast the moment today's reviews reach the daily goal
//   - after the first few words, an offer to send a daily reminder — asked
//     when the learner has just felt the app work, rather than buried in
//     Profile where nobody goes looking for it.

/** Words reviewed today before the reminder offer appears. */
const PROMPT_AFTER = 5;
/** "Not now" quiets the offer for this long. */
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;
/** The time offered by default — evening, when a missed day can still be saved. */
const DEFAULT_TIME = 20 * 60;

const PROMPT_KEY = 'voca.reminderPrompt';
const GOAL_MET_KEY = 'voca.goalMetDay';

type PromptMemo = { done: true } | { snoozedUntil: number };

function readPrompt(): PromptMemo | null {
  try {
    const v = JSON.parse(localStorage.getItem(PROMPT_KEY) ?? 'null');
    return v && typeof v === 'object' ? v : null;
  } catch { return null; }
}

function writePrompt(memo: PromptMemo) {
  try { localStorage.setItem(PROMPT_KEY, JSON.stringify(memo)); } catch { /* private mode */ }
}

function promptSuppressed(): boolean {
  const memo = readPrompt();
  if (!memo) return false;
  return 'done' in memo || Date.now() < memo.snoozedUntil;
}

export function DailyLoop() {
  const wordsToday = useWordsToday();
  useGoalCelebration(wordsToday);

  const { user, loading } = useAuth();
  const inWorld = useLocation().pathname === '/world';
  // Read when the count changes, not once — "Not now" in another tab, or this
  // one, should hide it without a reload.
  const [suppressed, setSuppressed] = useState(promptSuppressed);
  useEffect(() => setSuppressed(promptSuppressed()), [wordsToday]);

  if (!supabase || !pushConfigured() || loading || inWorld) return null;
  if (suppressed || wordsToday < PROMPT_AFTER) return null;

  const close = (memo: PromptMemo) => { writePrompt(memo); setSuppressed(true); };
  return user
    ? <ReminderOffer userId={user.id} onClose={close} />
    : <SignInForReminders onClose={close} />;
}

/** Toast once, the moment today's count crosses the goal. */
function useGoalCelebration(wordsToday: number) {
  const intl = useIntl();
  const goal = useDailyGoal((s) => s.goal);
  const prev = useRef(wordsToday);
  useEffect(() => {
    const before = prev.current;
    prev.current = wordsToday;
    // A jump of more than a couple is progress arriving from another device at
    // sign-in, not an answer given just now — nothing to celebrate here.
    if (before >= goal || wordsToday < goal || wordsToday - before > 2) return;
    const today = localDateString();
    try {
      if (localStorage.getItem(GOAL_MET_KEY) === today) return;
      localStorage.setItem(GOAL_MET_KEY, today);
    } catch { /* private mode: celebrate anyway */ }
    playWin();
    toast.success(intl.formatMessage({ id: 'flashcard.goalMet' }, { goal }), { icon: '🎯', duration: 4000 });
  }, [wordsToday, goal, intl]);
}

function PromptCard({ children }: { children: ReactNode }) {
  return (
    <div
      role="dialog"
      aria-labelledby="reminder-offer-title"
      className="fixed z-40 bottom-4 inset-x-4 sm:inset-x-auto sm:right-4 sm:w-96 mb-[env(safe-area-inset-bottom)] card-game border-accent-orange p-4 shadow-2xl animate-fade-in"
    >
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-xl bg-accent-orange/15 text-accent-orange flex items-center justify-center shrink-0">
          <Icon icon="lucide:bell-ring" className="text-lg" />
        </span>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}

function ReminderOffer({ userId, onClose }: { userId: string; onClose: (memo: PromptMemo) => void }) {
  const intl = useIntl();
  const push = usePushNotifications(userId);
  const [time, setTime] = useState(DEFAULT_TIME);
  // The hook starts every user at "off" until their prefs arrive, which would
  // flash this offer at someone who already has reminders. Ask first.
  const [alreadyOn, setAlreadyOn] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    void fetchSettings().then((s) => { if (!cancelled) setAlreadyOn(Boolean(s?.reminderEnabled)); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    // Nothing to offer here, ever — remember that rather than re-checking
    // every session. 'denied' is left alone: the browser setting can change.
    if (alreadyOn || push.status === 'unsupported') onClose({ done: true });
  }, [alreadyOn, push.status, onClose]);

  if (alreadyOn !== false) return null;
  if (push.status !== 'default' && push.status !== 'granted') return null;

  const accept = async () => {
    const ok = await push.enable([time]);
    if (ok) {
      toast.success(intl.formatMessage({ id: 'flashcard.reminder.set' }, { time: formatTime(time) }));
      onClose({ done: true });
    } else if (Notification.permission === 'denied') {
      // They said no to the browser's own prompt; asking again would only nag.
      onClose({ done: true });
    }
  };

  return (
    <PromptCard>
      <p id="reminder-offer-title" className="font-display font-bold text-text-primary">
        <FormattedMessage id="flashcard.reminder.title" />
      </p>
      <p className="text-xs text-text-muted mt-0.5">
        <FormattedMessage id="flashcard.reminder.body" />
      </p>
      <label className="mt-3 flex items-center gap-2 text-sm text-text-secondary">
        <FormattedMessage id="flashcard.reminder.at" />
        <input
          type="time"
          step={1800}
          value={toTimeInputValue(time)}
          onChange={(e) => {
            const m = fromTimeInputValue(e.target.value);
            if (m !== null) setTime(m);
          }}
          className="px-2 py-1 rounded-lg bg-bg-tertiary text-text-primary font-bold tabular-nums"
        />
      </label>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => void accept()}
          disabled={push.busy}
          className="btn-3d flex-1 py-2 rounded-xl bg-accent-orange text-bg-primary text-sm font-bold disabled:opacity-60"
        >
          <FormattedMessage id="flashcard.reminder.yes" />
        </button>
        <button
          onClick={() => onClose({ snoozedUntil: Date.now() + SNOOZE_MS })}
          className="btn-3d px-4 py-2 rounded-xl bg-bg-tertiary text-text-secondary text-sm font-bold"
        >
          <FormattedMessage id="flashcard.reminder.notNow" />
        </button>
      </div>
    </PromptCard>
  );
}

/**
 * Reminders need an account (the schedule lives on it, and the server sends
 * them). A visitor gets the same offer as a reason to sign in; back from the
 * sign-in redirect, the count still stands, so the real offer follows.
 */
function SignInForReminders({ onClose }: { onClose: (memo: PromptMemo) => void }) {
  const { signInWithGoogle } = useAuth();
  return (
    <PromptCard>
      <p id="reminder-offer-title" className="font-display font-bold text-text-primary">
        <FormattedMessage id="flashcard.reminder.title" />
      </p>
      <p className="text-xs text-text-muted mt-0.5">
        <FormattedMessage id="flashcard.reminder.guestBody" />
      </p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => void signInWithGoogle()}
          className="btn-3d flex-1 py-2 rounded-xl bg-accent-green text-bg-primary text-sm font-bold"
        >
          <FormattedMessage id="flashcard.reminder.signIn" />
        </button>
        <button
          onClick={() => onClose({ snoozedUntil: Date.now() + SNOOZE_MS })}
          className="btn-3d px-4 py-2 rounded-xl bg-bg-tertiary text-text-secondary text-sm font-bold"
        >
          <FormattedMessage id="flashcard.reminder.notNow" />
        </button>
      </div>
    </PromptCard>
  );
}
