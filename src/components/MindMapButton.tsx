// One "Mind Map" entry point with a two-way chooser, replacing the pair of
// buttons that used to sit side by side under the word list saying the same
// word twice. The two ways of getting a mind map are genuinely different
// products — one is an interactive board you keep, the other is a picture
// ChatGPT draws you — so the choice is worth a sentence each rather than a
// guess from a label. Same portalled-menu pattern as PracticeButton.

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';

// Portalled out of the card (cards clip with overflow-hidden), so the menu is
// positioned by hand from the button's rect.
const MENU_WIDTH = 290;
const MENU_HEIGHT = 176;

/** ChatGPT URL pre-filled with a prompt that draws a handwritten mind-map
 *  image of the given words (same open-in-ChatGPT pattern as the collection
 *  builder's word-list helper). */
function chatGptMindmapUrl(words: string[]): string {
  const prompt = `Create a handwritten-style mind map image to help me memorize these English vocabulary words:

${words.join(', ')}

Rules:
- Generate it as ONE image, drawn like a hand-written sketchnote mind map
- Group related words into labeled branches by theme
- Keep every word large and legible
- Add a small doodle next to each word that hints at its meaning`;
  return `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`;
}

export function MindMapButton({
  words,
  isPro,
  onOpenInteractive,
}: {
  words: string[];
  isPro: boolean;
  /** Switch the page to the in-app interactive map. */
  onOpenInteractive: () => void;
}) {
  const [menu, setMenu] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggle = useCallback(() => {
    setMenu((current) => {
      if (current || !btnRef.current) return null;
      const r = btnRef.current.getBoundingClientRect();
      const below = r.bottom + 6;
      return {
        left: Math.min(Math.max(8, r.left), window.innerWidth - MENU_WIDTH - 8),
        top: below + MENU_HEIGHT > window.innerHeight - 8
          ? Math.max(8, r.top - 6 - MENU_HEIGHT)
          : below,
      };
    });
  }, []);

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

  const openInteractive = () => {
    setMenu(null);
    // The button stays usable without Pro so the option is discoverable; the
    // server re-checks Pro on the generative call either way.
    if (!isPro) {
      toast('The interactive Mind Map is a Pro feature.', { icon: '👑' });
      return;
    }
    onOpenInteractive();
  };

  return (
    <div className="shrink-0">
      <button
        ref={btnRef}
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={menu !== null}
        title="Build a mind map of these words"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-yellow/10 border border-accent-yellow/20 text-accent-yellow text-xs font-medium hover:bg-accent-yellow/20 transition-all cursor-pointer"
      >
        <Icon icon="lucide:git-fork" className="text-sm" />
        Mind Map
        <Icon icon="lucide:chevron-down" className="text-[11px] opacity-70" />
      </button>

      {menu && createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{ top: menu.top, left: menu.left, width: MENU_WIDTH }}
          className="fixed z-[60] rounded-lg border border-border bg-bg-card shadow-lg overflow-hidden animate-fade-in"
        >
          <div className="px-3 py-2 border-b border-border">
            <p className="text-[11px] font-semibold text-text-primary">How would you like your mind map?</p>
            <p className="text-[11px] text-text-muted">{words.length} words</p>
          </div>

          <button
            role="menuitem"
            onClick={openInteractive}
            className="w-full text-left px-3 py-2.5 flex items-start gap-2.5 hover:bg-bg-hover/60 transition-colors cursor-pointer border-b border-border"
          >
            <span className="w-6 h-6 rounded-md bg-accent-yellow/15 text-accent-yellow flex items-center justify-center shrink-0 mt-0.5">
              <Icon icon={isPro ? 'lucide:pencil-line' : 'lucide:lock'} className="text-sm" />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-text-primary">Interactive Board</span>
                <span className="text-[9px] px-1 py-px rounded bg-accent-yellow/20 text-accent-yellow font-extrabold uppercase tracking-wider">
                  Pro
                </span>
              </span>
              <span className="block text-[11px] text-text-muted leading-snug">
                Rearrange it, hear the words, save it as an image.
              </span>
            </span>
          </button>

          <a
            role="menuitem"
            href={chatGptMindmapUrl(words)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMenu(null)}
            className="w-full text-left px-3 py-2.5 flex items-start gap-2.5 hover:bg-bg-hover/60 transition-colors cursor-pointer"
          >
            <span className="w-6 h-6 rounded-md bg-accent-orange/15 text-accent-orange flex items-center justify-center shrink-0 mt-0.5">
              <Icon icon="lucide:image" className="text-sm" />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-text-primary">Drawing in ChatGPT</span>
                <Icon icon="lucide:external-link" className="text-[11px] text-text-muted" />
              </span>
              <span className="block text-[11px] text-text-muted leading-snug">
                Opens ChatGPT with a prompt to sketch one by hand.
              </span>
            </span>
          </a>
        </div>,
        document.body,
      )}
    </div>
  );
}
