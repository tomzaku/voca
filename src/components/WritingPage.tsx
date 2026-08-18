import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ImproveWritingPage } from './ImproveWritingPage';
import { IeltsWritingPage } from './IeltsWritingPage';

type Tab = 'improve' | 'ielts';

// Sub-page metadata — just enough to resolve `?tab=` and label the
// breadcrumb. The Rail drawer owns each one's icon/color for navigation.
const TABS: { key: Tab; label: string }[] = [
  { key: 'improve', label: 'Improve Writing' },
  { key: 'ielts', label: 'IELTS Writing' },
];

// Which sub-page this is — picked from the Vocabulary-style group in the Rail
// drawer now, not an in-page tab bar. `?tab=` is canonicalized on load so the
// Rail's own active-link check (an exact `to` + `tab` match) always agrees
// with what's actually showing.
function useWritingTab(): Tab {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get('tab');
  const resolved = (TABS.find((t) => t.key === raw)?.key ?? 'improve') as Tab;
  useEffect(() => {
    if (raw !== resolved) setSearchParams({ tab: resolved }, { replace: true });
  }, [raw, resolved, setSearchParams]);
  return resolved;
}

/** /writing — two sub-pages: freeform "Improve Writing" and structured "IELTS Writing" practice. */
export function WritingPage() {
  const activeTab = useWritingTab();
  const activeMeta = TABS.find((t) => t.key === activeTab)!;

  return (
    <div className="mx-auto max-w-page px-4 py-8">
      <h1 className="flex items-center gap-1.5 mb-6 text-base">
        <Link to="/writing" className="font-medium text-text-muted hover:text-text-secondary transition-colors">
          Writing
        </Link>
        <span className="text-text-muted/50">/</span>
        <span className="font-bold text-text-primary">{activeMeta.label}</span>
      </h1>

      {activeTab === 'improve' && <ImproveWritingPage />}
      {activeTab === 'ielts' && <IeltsWritingPage />}
    </div>
  );
}
