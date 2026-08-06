import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { useFabStore } from '../hooks/useFabStore';
import { useAuth } from '../hooks/useAuth';
import { useIsPro } from '../hooks/useProStatus';
import type { PracticeMode } from '../hooks/useEnglishChat';

// The menu is portalled out of the card (cards clip with overflow-hidden), so
// it's positioned by hand from the button's rect.
const MENU_WIDTH = 270;
const MENU_HEIGHT = 168;

// Chip classes are spelled out, not built from a colour name — Tailwind only
// keeps the classes it can find as complete strings in the source.
const MODES: { id: PracticeMode; label: string; desc: string; chip: string; icon: React.ReactNode }[] = [
  {
    id: 'smooth',
    label: 'Smooth Conversation',
    desc: 'Natural chat, no interruptions. Feedback at the end.',
    chip: 'bg-accent-green/15 text-accent-green',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: 'feedback',
    label: 'Feedback Every Message',
    desc: 'Corrections after each answer — grammar, words, phrasing.',
    chip: 'bg-accent-purple/15 text-accent-purple',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
  },
];

interface PracticeButtonProps {
  /** Subject of the session — shown in the drawer, e.g. "Hometown & Travel". */
  topic: string;
  /** A specific prompt the AI should open the conversation with. */
  focus?: string;
  /** Button text. Defaults to "Practice". */
  label?: string;
  /** `sm` for the compact button used inside expanded cards. */
  size?: 'sm' | 'md';
}

/**
 * Opens the English Practice drawer on a chosen topic — the /speaking
 * counterpart of the "Practice English" FAB. Asks for the practice mode first,
 * since that's the only thing the drawer would otherwise still need.
 *
 * Every turn of the conversation is a live AI call, so this is Pro-only. The
 * button stays visible as a teaser; the `ai` function re-checks Pro server-side.
 */
export function PracticeButton({ topic, focus, label = 'Practice', size = 'md' }: PracticeButtonProps) {
  const startPractice = useFabStore((s) => s.startPractice);
  const { user } = useAuth();
  const { isPro, loading: proLoading } = useIsPro();
  const [menu, setMenu] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Unknown Pro status (still loading) isn't treated as locked — the server has
  // the final say, and a stray toast on a Pro account would be worse.
  const locked = !proLoading && !isPro;

  const toggle = useCallback(() => {
    if (locked) {
      toast(
        user ? 'AI conversation practice is a Pro feature.' : 'Sign in with a Pro account to practice.',
        { icon: '👑' },
      );
      return;
    }
    setMenu((current) => {
      if (current || !btnRef.current) return null;
      const r = btnRef.current.getBoundingClientRect();
      const below = r.bottom + 6;
      return {
        left: Math.min(Math.max(8, r.right - MENU_WIDTH), window.innerWidth - MENU_WIDTH - 8),
        top: below + MENU_HEIGHT > window.innerHeight - 8
          ? Math.max(8, r.top - 6 - MENU_HEIGHT)
          : below,
      };
    });
  }, [locked, user]);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!btnRef.current?.contains(target) && !menuRef.current?.contains(target)) close();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    // Fixed coords go stale once the page moves underneath them.
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [menu]);

  const pick = (mode: PracticeMode) => {
    setMenu(null);
    startPractice({ topicId: 'speaking', mode, context: { label: topic, focus } });
  };

  return (
    <div className="shrink-0">
      <button
        ref={btnRef}
        onClick={toggle}
        className={`flex items-center gap-1.5 rounded-full font-medium border border-accent-green/25 bg-accent-green/5 text-accent-green hover:bg-accent-green/15 transition-all cursor-pointer ${
          size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
        }`}
        title={locked
          ? 'Pro feature — talk this through with an AI partner'
          : focus ? `Practise: ${focus}` : `Practise ${topic} with the AI partner`}
      >
        <svg width={size === 'sm' ? 11 : 12} height={size === 'sm' ? 11 : 12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {locked ? (
            <>
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </>
          ) : (
            <>
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </>
          )}
        </svg>
        {label}
        {locked && (
          <span className="text-[9px] px-1 py-px rounded bg-accent-green/20 font-extrabold uppercase tracking-wider">
            Pro
          </span>
        )}
      </button>

      {menu && createPortal(
        <div
          ref={menuRef}
          style={{ top: menu.top, left: menu.left, width: MENU_WIDTH }}
          className="fixed z-[60] rounded-lg border border-border bg-bg-card shadow-lg overflow-hidden animate-fade-in"
        >
          <div className="px-3 py-2 border-b border-border">
            <p className="text-[11px] font-semibold text-text-primary">How would you like to practice?</p>
            <p className="text-[11px] text-text-muted truncate" title={focus || topic}>{focus || topic}</p>
          </div>
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => pick(m.id)}
              className="w-full text-left px-3 py-2.5 flex items-start gap-2.5 hover:bg-bg-hover/60 transition-colors cursor-pointer border-b border-border last:border-b-0"
            >
              <span className={`w-6 h-6 rounded-md ${m.chip} flex items-center justify-center shrink-0 mt-0.5`}>
                {m.icon}
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-text-primary">{m.label}</span>
                <span className="block text-[11px] text-text-muted leading-snug">{m.desc}</span>
              </span>
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}
