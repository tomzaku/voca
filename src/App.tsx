import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './hooks/useAuth';
import { useRailState } from './hooks/useRailState';
import { Navbar } from './components/Navbar';
import { Rail } from './components/Rail';
import { FlashCard } from './components/FlashCard';
import { HistoryPage } from './components/HistoryPage';
import { ReviewPage } from './components/ReviewPage';
import { SettingsPage } from './components/SettingsPage';
import { LoginPage } from './components/LoginPage';
import { ProfilePage } from './components/ProfilePage';
import { EnglishPractice } from './components/EnglishPractice';
import { EnglishSpeakingPage } from './components/EnglishSpeakingPage';
import { EnglishListeningPage } from './components/EnglishListeningPage';
import { IpaPage } from './components/IpaPage';
import { CompanionPage } from './components/CompanionPage';
import { DashboardPage } from './components/DashboardPage';
import { QuickReview } from './components/QuickReview';
import { CollectionsPage } from './components/CollectionsPage';
import { CollectionDetailPage } from './components/CollectionDetailPage';
import { WritingPage, WritingLegacyRedirect } from './components/WritingPage';
import { WorldGame } from './components/WorldGame';
import { LevelTestPage } from './components/LevelTestPage';
import { TakeQuiz } from './components/TakeQuiz';
import { QuizResults } from './components/QuizResults';
import { MyQuizzes } from './components/MyQuizzes';
import { ProComparisonPage } from './components/ProComparisonPage';
import { LoginGate } from './components/LoginGate';
import { WordPeek } from './components/WordPeek';
import { AiModelBenchmarkPage } from './components/AiModelBenchmarkPage';
import { NetworkDebugPage } from './components/NetworkDebugPage';

/**
 * The app's frame — header, rail, and a <main> that makes room for the rail.
 * The World is a game, so it gets the whole screen: the header and rail stay
 * mounted (the header's search shortcuts still open the world's library) but
 * out of sight, and the world's own menu leads back.
 */
function Shell({ children }: { children: ReactNode }) {
  // Desktop's rail pushes content over, so <main> has to track its width.
  // Mobile's is a full-width overlay with nothing behind it when collapsed,
  // so there's no gutter to reserve there at all.
  const expanded = useRailState((s) => s.expanded);
  const fullscreen = useLocation().pathname === '/world';
  return (
    <div className="min-h-screen">
      <div className={fullscreen ? 'hidden' : undefined}>
        <Navbar />
        <Rail />
      </div>
      <main className={fullscreen ? '' : `transition-[padding] duration-200 ${expanded ? 'sm:pl-60' : 'sm:pl-16'}`}>
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/+$/, '') || '/'}>
        <Shell>
          <Routes>
            <Route path="/" element={<FlashCard />} />
            <Route path="/speaking" element={<EnglishSpeakingPage />} />
            <Route path="/ipa" element={<IpaPage />} />
            <Route path="/listening" element={<EnglishListeningPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/review" element={<ReviewPage />} />
            {/* Old path — keep existing links working. */}
            <Route path="/bookmarks" element={<Navigate to="/history" replace />} />
            <Route path="/companion" element={<CompanionPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            {/* Where a reminder notification lands. */}
            <Route path="/quick" element={<QuickReview />} />
            {/* Old path — keep existing links working. */}
            <Route path="/streak" element={<Navigate to="/dashboard" replace />} />
            <Route path="/collections" element={<CollectionsPage />} />
            <Route path="/collections/:id" element={<CollectionDetailPage />} />
            {/* Old shape (`?tab=ielts`) — send it to the equivalent path, keeping any other query params. */}
            <Route path="/writing" element={<WritingLegacyRedirect />} />
            <Route path="/writing/:tab" element={<WritingPage />} />
            <Route path="/world" element={<WorldGame />} />
            <Route path="/level-test" element={<LevelTestPage />} />
            <Route path="/quizzes" element={<MyQuizzes />} />
            <Route path="/quiz/:id" element={<TakeQuiz />} />
            <Route path="/quiz/:id/results" element={<QuizResults />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/pro" element={<ProComparisonPage />} />
            {/* Dev-only TTS benchmark — deliberately not linked from the Rail. */}
            <Route path="/ai-model-benchmark" element={<AiModelBenchmarkPage />} />
            {/* Linked from Settings → Developer, not the Rail. */}
            <Route path="/debug/network" element={<NetworkDebugPage />} />
          </Routes>
        </Shell>
        <EnglishPractice />
        {/* Word chips anywhere in the app open their meaning here, in place. */}
        <WordPeek />
        <LoginGate />
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: 'var(--color-bg-card)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
            },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
