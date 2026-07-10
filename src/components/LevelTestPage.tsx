import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
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
  const setActive = useCollections((s) => s.setActive);
  const [result, setResult] = useState<LevelResult | null>(null);
  // Remounts the picker for a fresh word sample on retake.
  const [runId, setRunId] = useState(0);

  if (result) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">🎯</div>
        <h1 className="text-2xl font-display font-bold text-text-primary mb-1">
          Your level: {result.label}
        </h1>
        <p className="text-sm text-text-muted mb-8">
          Start there — the app schedules every word you study and adapts as you answer.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setActive(result.collectionId);
              toast.success(`Studying “${result.label}”`);
              navigate('/');
            }}
            className="btn-3d flex-1 py-3 bg-accent-green text-bg-primary font-bold"
          >
            Study {result.label}
          </button>
          <button
            onClick={() => { setResult(null); setRunId((n) => n + 1); }}
            className="btn-3d flex-1 py-3 bg-bg-card text-text-secondary font-bold"
          >
            Retake
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <LevelPicker
        key={runId}
        onBack={() => navigate('/collections')}
        onDone={(r) => { playWin(); setResult(r); }}
      />
    </div>
  );
}
