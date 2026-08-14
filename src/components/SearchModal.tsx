import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useWordSearch } from '../hooks/useWordSearch';
import { getLearnLanguage, getMotherLanguage } from '../lib/languages';

/**
 * Spotlight-style word lookup, opened from the header's Search button or
 * ⌘K/Ctrl+K/"/" from anywhere. An overlay rather than an input that grows
 * out of the header in place — that approach left the input squeezed to
 * near-nothing on narrow phones once it had to share the row with the menu
 * and profile buttons either side of it.
 */
export function SearchModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const requestSearch = useWordSearch((s) => s.requestSearch);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Keep the whole phrase — phrasal verbs and idioms ("go on", "give up")
    // are valid lookups; just collapse stray whitespace.
    const word = query.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!word) return;
    navigate('/');          // ensure the flashcard page is mounted
    requestSearch(word);    // FlashCard picks this up and loads the word
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-2xl border-2 border-accent-cyan bg-bg-card shadow-2xl overflow-hidden animate-pop-in"
      >
        <div className="relative flex items-center">
          <Icon icon="lucide:search" className="absolute left-5 text-text-muted text-xl pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${getLearnLanguage()} or ${getMotherLanguage()}…`}
            className="w-full bg-transparent pl-14 pr-5 py-5 text-lg text-text-primary font-semibold focus:outline-none placeholder:text-text-muted"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
        <div className="flex items-center justify-between gap-2 px-5 py-2.5 border-t-2 border-border text-xs text-text-muted font-bold">
          <span>Enter to look up a word</span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-bg-tertiary font-mono">Esc</kbd>
            to close
          </span>
        </div>
      </form>
    </div>
  );
}
