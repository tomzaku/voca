import { useEffect, useRef } from 'react';
import { useFabStore } from '../hooks/useFabStore';

export function FabMenu() {
  const { expanded, panel, expand, toggleExpanded, collapse, openPanel } = useFabStore();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!expanded) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        collapse();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [expanded, collapse]);

  if (panel !== 'none') return null;

  return (
    <div
      ref={menuRef}
      className="fixed bottom-6 right-6 z-30 flex flex-col items-end gap-2"
      onMouseEnter={expand}
      onMouseLeave={collapse}
    >
      {expanded && (
        <div className="flex flex-col items-end gap-2 animate-fade-in">
          <button
            onClick={() => openPanel('englishPractice')}
            className="flex items-center gap-2.5 pl-4 pr-3 py-2.5 rounded-full shadow-lg border border-accent-green/30 bg-bg-card hover:bg-accent-green/10 transition-all cursor-pointer group"
          >
            <span className="text-sm font-medium text-text-primary group-hover:text-accent-green transition-colors whitespace-nowrap">
              Practice English
            </span>
            <span className="w-9 h-9 rounded-full bg-accent-green/15 text-accent-green flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </span>
          </button>
        </div>
      )}

      <button
        onClick={toggleExpanded}
        className={`w-12 h-12 rounded-full shadow-lg transition-all duration-300 cursor-pointer flex items-center justify-center ${
          expanded
            ? 'bg-bg-tertiary text-text-primary border border-border rotate-45'
            : 'bg-accent-green text-bg-primary hover:bg-accent-green/90 hover:scale-105'
        }`}
        title="Quick actions"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  );
}
