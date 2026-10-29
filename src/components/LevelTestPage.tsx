import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FormattedMessage, useIntl } from 'react-intl';
import { LevelPicker, type LevelResult } from './LevelPicker';
import { useCollections } from '../hooks/useCollections';
import { playWin } from '../lib/sfx';

/**
 * Standalone "Find my level" page — the same three-phase word-tapping test the
 * onboarding uses (shared LevelPicker), plus a result screen that activates
 * the recommended Level collection.
 */
export function LevelTestPage() {
  const navigate = useNavigate();
  return (
    <div className="max-w-lg mx-auto px-4">
      <LevelTest onBack={() => navigate('/collections')} onStudy={() => navigate('/')} />
    </div>
  );
}

/** The test and its result, without the page around it — /collections shows
 *  it in a popup on desktop. `onStudy` runs after the level is made active. */
export function LevelTest({ onBack, onStudy }: { onBack: () => void; onStudy: () => void }) {
  const intl = useIntl();
  const setActive = useCollections((s) => s.setActive);
  const [result, setResult] = useState<LevelResult | null>(null);
  // Remounts the picker for a fresh word sample on retake.
  const [runId, setRunId] = useState(0);

  if (result) {
    return (
      <div className="py-16 text-center">
        <div className="text-5xl mb-4">🎯</div>
        <h1 className="text-2xl font-display font-bold text-text-primary mb-1">
          <FormattedMessage id="levelTest.yourLevel" values={{ level: result.label }} />
        </h1>
        <p className="text-sm text-text-muted mb-8">
          <FormattedMessage id="levelTest.startThere" />
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setActive(result.collectionId);
              toast.success(intl.formatMessage({ id: 'levelTest.studyingToast' }, { level: result.label }));
              onStudy();
            }}
            className="btn-3d flex-1 py-3 bg-accent-green text-bg-primary font-bold"
          >
            <FormattedMessage id="levelTest.study" values={{ level: result.label }} />
          </button>
          <button
            onClick={() => { setResult(null); setRunId((n) => n + 1); }}
            className="btn-3d flex-1 py-3 bg-bg-card text-text-secondary font-bold"
          >
            <FormattedMessage id="levelTest.retake" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <LevelPicker
        key={runId}
        onBack={onBack}
        onDone={(r) => { playWin(); setResult(r); }}
      />
    </div>
  );
}
