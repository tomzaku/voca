import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useAuth } from '../hooks/useAuth';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useStreak } from '../hooks/useStreak';
import {
  DAY_INITIALS,
  DAY_NAMES,
  MAX_REMINDER_TIMES,
  SLOT_MINUTES,
  formatSchedule,
  formatTime,
  fromTimeInputValue,
  nextFreeSlot,
  toTimeInputValue,
} from '../lib/push';
import { ToggleSwitch } from './ToggleSwitch';

export function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const push = usePushNotifications(user?.id);
  const streak = useStreak((s) => s.count);
  const longest = useStreak((s) => s.longest);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const name = (user?.user_metadata?.full_name as string | undefined) || user?.email?.split('@')[0] || 'User';
  const email = user?.email || '';
  const initial = name[0]?.toUpperCase() ?? '?';

  if (!user) {
    return (
      <div className="max-w-sm mx-auto px-4 py-20 flex flex-col items-center gap-4 text-center">
        <p className="text-text-muted text-sm">You're not signed in.</p>
        <Link
          to="/login"
          className="px-4 py-2 rounded-lg bg-accent-cyan/10 text-accent-cyan text-sm font-medium hover:bg-accent-cyan/20 transition-colors"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-10 flex flex-col gap-6">
      {/* Avatar + name */}
      <div className="flex flex-col items-center gap-3 py-6">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="w-20 h-20 rounded-full object-cover ring-2 ring-border"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-accent-purple/15 border-2 border-accent-purple/20 flex items-center justify-center text-2xl font-semibold text-accent-purple">
            {initial}
          </div>
        )}
        <div className="text-center">
          <p className="font-medium text-text-primary">{name}</p>
          {email && <p className="text-sm text-text-muted">{email}</p>}
        </div>

        {streak > 0 && (
          <Link to="/streak" className="flex items-center gap-4 mt-1 hover:opacity-80 transition-opacity">
            <div className="flex items-center gap-1.5 text-accent-orange">
              <Icon icon="lucide:flame" className="text-lg" />
              <span className="text-sm font-bold tabular-nums">{streak}</span>
              <span className="text-sm text-text-muted">day streak</span>
            </div>
            {longest > streak && (
              <span className="text-xs text-text-muted/70">best {longest}</span>
            )}
          </Link>
        )}
      </div>

      {/* Menu */}
      <div className="rounded-xl border border-border bg-bg-card divide-y divide-border overflow-hidden">
        <Link
          to="/settings"
          className="flex items-center justify-between px-4 py-3.5 text-sm text-text-primary hover:bg-bg-hover transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-bg-tertiary flex items-center justify-center text-text-muted text-base">⚙</span>
            <span>Settings</span>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      </div>

      {/* Daily reminder. Hidden entirely where push can't work, rather than
          showing a control that would do nothing. */}
      {push.status !== 'loading' && push.status !== 'unsupported' && (
        <div className="rounded-xl border border-border bg-bg-card p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-lg bg-bg-tertiary flex items-center justify-center text-text-muted shrink-0">
                <Icon icon="lucide:bell" className="text-base" />
              </span>
              <div>
                <p className="text-sm text-text-primary">Notifications</p>
                <p className="text-xs text-text-muted">
                  {push.status === 'granted' && push.enabled
                    ? 'Streak and review reminders'
                    : 'Nudges to keep your learning going'}
                </p>
              </div>
            </div>

            {push.status === 'granted' && (
              <button
                onClick={() => void push.toggle()}
                disabled={push.busy}
                aria-label="Toggle daily reminder"
                aria-pressed={push.enabled}
                className="inline-flex items-center shrink-0 cursor-pointer disabled:opacity-50"
              >
                <ToggleSwitch checked={push.enabled} />
              </button>
            )}
          </div>

          {push.status === 'granted' && push.enabled && (
            <>
              {/* Streak reminders */}
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
                <div className="flex items-center gap-2.5">
                  <Icon icon="lucide:flame" className="text-base text-accent-orange shrink-0" />
                  <div>
                    <p className="text-xs text-text-primary">Streak reminders</p>
                    <p className="text-[11px] text-text-muted">
                      {push.notifyStreak
                        ? `Only if your streak is at risk, at ${formatTime(Math.max(...push.times))}`
                        : 'Muted'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => void push.toggleType('streak')}
                  aria-label="Toggle streak reminders"
                  aria-pressed={push.notifyStreak}
                  className="inline-flex items-center shrink-0 cursor-pointer"
                >
                  <ToggleSwitch checked={push.notifyStreak} color="bg-accent-orange" />
                </button>
              </div>

              {/* Word review */}
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
                <div className="flex items-center gap-2.5">
                  <Icon icon="lucide:repeat" className="text-base text-accent-cyan shrink-0" />
                  <div>
                    <p className="text-xs text-text-primary">Word review</p>
                    <p className="text-[11px] text-text-muted">
                      {push.notifyReview
                        ? formatSchedule(push.times, push.days)
                        : 'Muted'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => void push.toggleType('review')}
                  aria-label="Toggle word review reminders"
                  aria-pressed={push.notifyReview}
                  className="inline-flex items-center shrink-0 cursor-pointer"
                >
                  <ToggleSwitch checked={push.notifyReview} />
                </button>
              </div>
            </>
          )}

          {/* The schedule belongs to word review, so it hides when review is
              muted. The streak warning borrows the last of these slots, which
              is why its own row spells that time out. */}
          {push.status === 'granted' && push.enabled && push.notifyReview && (
            <>
              <div className="flex flex-col gap-2 pt-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-text-muted">Remind me at</span>
                  <span className="text-xs text-text-muted/60">
                    {push.times.length}/{MAX_REMINDER_TIMES}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {push.times.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 pl-2 pr-1 py-1 rounded-full bg-accent-cyan/10 text-accent-cyan text-xs border border-accent-cyan/25"
                    >
                      {/* Native <input type="time"> so each platform gives its
                          own picker — the iOS wheel, the Android clock dialog —
                          instead of a custom dropdown that matches neither.
                          step=1800 (30 min) is what makes it offer half hours. */}
                      <input
                        type="time"
                        step={SLOT_MINUTES * 60}
                        value={toTimeInputValue(t)}
                        onChange={(e) => {
                          const next = fromTimeInputValue(e.target.value);
                          // Clearing the field yields '' — keep the old time
                          // rather than dropping a reminder by accident.
                          if (next !== null) void push.updateTime(t, next);
                        }}
                        aria-label={`Reminder time, currently ${formatTime(t)}`}
                        className="bg-transparent text-accent-cyan text-xs outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute"
                      />
                      {/* The last time can't be removed — an empty schedule
                          looks identical to a broken one. */}
                      {push.times.length > 1 && (
                        <button
                          onClick={() => void push.removeTime(t)}
                          aria-label={`Remove ${formatTime(t)} reminder`}
                          className="w-4 h-4 rounded-full inline-flex items-center justify-center hover:bg-accent-cyan/20 cursor-pointer"
                        >
                          <Icon icon="lucide:x" className="text-[10px]" />
                        </button>
                      )}
                    </span>
                  ))}

                  {!push.atCapacity && (
                    <button
                      onClick={() => void push.addTime(nextFreeSlot(push.times))}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-dashed border-border text-text-muted text-xs hover:border-accent-cyan/40 hover:text-accent-cyan transition-colors cursor-pointer"
                    >
                      <Icon icon="lucide:plus" className="text-[10px]" />
                      Add time
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs text-text-muted">Repeat on</span>
                <div className="flex items-center justify-between gap-1">
                  {DAY_INITIALS.map((initial, day) => {
                    const on = push.days.includes(day);
                    return (
                      <button
                        key={day}
                        onClick={() => void push.toggleDay(day)}
                        aria-label={`${DAY_NAMES[day]} reminders`}
                        aria-pressed={on}
                        className={`w-8 h-8 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                          on
                            ? 'bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30'
                            : 'bg-bg-tertiary text-text-muted border border-transparent hover:bg-bg-hover'
                        }`}
                      >
                        {initial}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {push.status === 'default' && (
            <button
              onClick={() => void push.enable()}
              disabled={push.busy}
              className="btn-3d w-full py-2 text-xs bg-accent-cyan/10 text-accent-cyan disabled:opacity-50"
            >
              Enable reminders
            </button>
          )}

          {/* Dead end: the browser will never prompt again, so point at the
              only route back rather than offering a button that can't work. */}
          {push.status === 'denied' && (
            <p className="text-xs text-text-muted/70 leading-relaxed">
              Notifications are blocked for Voca. To turn them on, open your browser's site
              settings for this page and allow notifications.
            </p>
          )}

          {push.status === 'ios-needs-install' && (
            <p className="text-xs text-text-muted/70 leading-relaxed">
              On iPhone and iPad, reminders work once Voca is on your Home Screen — tap Share,
              then "Add to Home Screen", and open it from there.
            </p>
          )}
        </div>
      )}

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        className="w-full py-3 rounded-xl border border-border bg-bg-card text-sm text-accent-red hover:bg-accent-red/5 hover:border-accent-red/30 transition-colors font-medium"
      >
        Sign out
      </button>
    </div>
  );
}
