import { useState } from 'react';
import { ImproveWritingPage } from './ImproveWritingPage';
import { IeltsWritingPage } from './IeltsWritingPage';

type Tab = 'improve' | 'ielts';

const TABS: { key: Tab; label: string; color: string; icon: React.ReactNode }[] = [
  {
    key: 'improve',
    label: 'Improve Writing',
    color: 'accent-cyan',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" />
      </svg>
    ),
  },
  {
    key: 'ielts',
    label: 'IELTS Writing',
    color: 'accent-purple',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];

/** /writing — two tabs: freeform "Improve Writing" and structured "IELTS Writing" practice. */
export function WritingPage() {
  const [activeTab, setActiveTab] = useState<Tab>('improve');

  return (
    <div className="mx-auto max-w-page px-4 py-8">
      <h1 className="text-2xl font-display font-bold text-text-primary mb-1">Writing</h1>
      <p className="text-sm text-text-muted mb-5">
        Polish your own writing, or practice IELTS Writing prompts with examiner-style scoring.
      </p>

      <div className="flex gap-1 mb-6 p-1 rounded-lg bg-bg-tertiary/50 border border-border">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-all cursor-pointer ${
              activeTab === tab.key
                ? `bg-bg-card text-${tab.color} shadow-sm border border-border`
                : 'text-text-muted hover:text-text-secondary border border-transparent'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'improve' && <ImproveWritingPage />}
      {activeTab === 'ielts' && <IeltsWritingPage />}
    </div>
  );
}
