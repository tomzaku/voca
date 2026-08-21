import { useEffect } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ImproveWritingPage } from './ImproveWritingPage';
import { IeltsWritingPage } from './IeltsWritingPage';

type Tab = 'improve' | 'ielts';

// Sub-page metadata — just enough to resolve the `:tab` path segment and
// label the breadcrumb. The Rail drawer owns each one's icon/color for
// navigation.
const TABS: { key: Tab; label: string }[] = [
  { key: 'improve', label: 'Improve Writing' },
  { key: 'ielts', label: 'IELTS Writing' },
];

const DEFAULT_TAB: Tab = 'improve';

/**
 * Old `/writing?tab=ielts` shape, kept working as a redirect to the
 * equivalent `/writing/ielts` path. Any other query params (e.g. Improve
 * Writing's `?text=`/`?template=`/`?autoAnswer=`) ride along unchanged.
 */
export function WritingLegacyRedirect() {
  const [searchParams] = useSearchParams();
  const raw = searchParams.get('tab');
  const tab = (TABS.find((t) => t.key === raw)?.key ?? DEFAULT_TAB) as Tab;
  const rest = new URLSearchParams(searchParams);
  rest.delete('tab');
  const query = rest.toString();
  return <Navigate to={`/writing/${tab}${query ? `?${query}` : ''}`} replace />;
}

// Which sub-page this is — picked from the Vocabulary-style group in the Rail
// drawer now, not an in-page tab bar. An unknown/missing `:tab` is
// canonicalized on load so the Rail's own active-link check (an exact path
// match) always agrees with what's actually showing.
function useWritingTab(): Tab {
  const { tab: raw } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  const resolved = (TABS.find((t) => t.key === raw)?.key ?? DEFAULT_TAB) as Tab;
  useEffect(() => {
    if (raw !== resolved) navigate(`/writing/${resolved}`, { replace: true });
  }, [raw, resolved, navigate]);
  return resolved;
}

/** /writing/:tab — two sub-pages: freeform "Improve Writing" and structured "IELTS Writing" practice. */
export function WritingPage() {
  const activeTab = useWritingTab();
  const activeMeta = TABS.find((t) => t.key === activeTab)!;

  return (
    <div className="mx-auto max-w-page px-4 py-8">
      <h1 className="flex items-center gap-1.5 mb-6 text-base">
        <Link to={`/writing/${DEFAULT_TAB}`} className="font-medium text-text-muted hover:text-text-secondary transition-colors">
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
