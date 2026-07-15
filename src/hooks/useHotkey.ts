import { useEffect, useRef } from 'react';
import { isApple } from '../lib/device';

/** The parts of a KeyboardEvent a combo is matched against. */
export interface KeyEventLike {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  repeat: boolean;
  isComposing: boolean;
  target: EventTarget | null;
}

/**
 * Does `e` match `combo`? Split out from the hook below so the matching rules —
 * which are all edge cases — can be tested without a DOM.
 *
 * `apple` selects the modifier: ⌘ on Apple platforms, Ctrl everywhere else.
 */
export function matchesHotkey(combo: string, e: KeyEventLike, apple: boolean): boolean {
  const parts = combo.toLowerCase().split('+');
  const key = parts[parts.length - 1];
  const wantsMod = parts.includes('mod');

  if (e.key.toLowerCase() !== key) return false;
  // Mid-character in an IME (Vietnamese, CJK): the keystroke belongs to the
  // composition, not to us.
  if (e.isComposing) return false;
  if (e.repeat) return false;

  // Match the modifier exactly, so Ctrl+K on a Mac (delete-to-end-of-line) and a
  // bare "/" with Ctrl held both stay out of it.
  if (wantsMod !== (apple ? e.metaKey : e.ctrlKey)) return false;
  // ⌘K is ours; ⌘⇧K and ⌥⌘K belong to whoever else wants them. Shift isn't
  // checked for bare keys — "/" needs it on plenty of keyboard layouts.
  if (wantsMod && (e.shiftKey || e.altKey)) return false;
  // A bare key must never be stolen mid-sentence.
  if (!wantsMod && isTyping(e.target)) return false;

  return true;
}

/**
 * Run `handler` when a key combo is pressed anywhere on the page.
 *
 * Combos read like `'mod+k'` or `'/'`. `mod` means ⌘ on Apple platforms and Ctrl
 * everywhere else — the same shortcut, spelled the way each platform's users
 * expect it.
 *
 * A bare combo (no `mod`) never fires while the user is typing: `/` has to stay
 * typable in a note or an answer box. Modifier combos fire everywhere, since ⌘K
 * can't be mistaken for typing.
 */
export function useHotkey(combo: string, handler: () => void): void {
  // Call sites pass inline arrows, which would otherwise rebind the listener on
  // every render. The ref keeps the listener stable and the handler current.
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!matchesHotkey(combo, e, isApple())) return;
      e.preventDefault();
      handlerRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [combo]);
}

/** Is the event coming from somewhere the user is entering text? */
function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.tagName === 'INPUT'
    || el.tagName === 'TEXTAREA'
    || el.tagName === 'SELECT'
    || el.isContentEditable;
}
