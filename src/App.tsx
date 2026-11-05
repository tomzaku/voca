import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { lazy, Suspense, type ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './hooks/useAuth';
import { useRailState } from './hooks/useRailState';
import { Navbar } from './components/Navbar';
import { Rail } from './components/Rail';
import { FlashCard } from './components/FlashCard';
import { EnglishPractice } from './components/EnglishPractice';
import { LoginGate } from './components/LoginGate';
import { WordPeek } from './components/WordPeek';

// Every page but the home flash card loads when it's first opened. Eagerly,
// they put all the learning content (src/data/*, ~1.7 MB) and lottie in the
// main chunk, which outgrew the service worker's precache limit. The lazy
// chunks are still precached (vite.config.ts), so offline is unchanged.
const HistoryPage = lazy(() => import('./components/HistoryPage').then((m) => ({ default: m.HistoryPage })));
const ReviewPage = lazy(() => import('./components/ReviewPage').then((m) => ({ default: m.ReviewPage })));
const SettingsPage = lazy(() => import('./components/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const LoginPage = lazy(() => import('./components/LoginPage').then((m) => ({ default: m.LoginPage })));
const ProfilePage = lazy(() => import('./components/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const EnglishSpeakingPage = lazy(() => import('./components/EnglishSpeakingPage').then((m) => ({ default: m.EnglishSpeakingPage })));
const EnglishListeningPage = lazy(() => import('./components/EnglishListeningPage').then((m) => ({ default: m.EnglishListeningPage })));
const IpaPage = lazy(() => import('./components/IpaPage').then((m) => ({ default: m.IpaPage })));
const CompanionPage = lazy(() => import('./components/CompanionPage').then((m) => ({ default: m.CompanionPage })));
const DashboardPage = lazy(() => import('./components/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const QuickReview = lazy(() => import('./components/QuickReview').then((m) => ({ default: m.QuickReview })));
const CollectionsPage = lazy(() => import('./components/CollectionsPage').then((m) => ({ default: m.CollectionsPage })));
const CollectionDetailPage = lazy(() => import('./components/CollectionDetailPage').then((m) => ({ default: m.CollectionDetailPage })));
const CollectionPresentPage = lazy(() => import('./components/CollectionDetailPage').then((m) => ({ default: m.CollectionPresentPage })));
const WritingLegacyRedirect = lazy(() => import('./components/WritingPage').then((m) => ({ default: m.WritingLegacyRedirect })));
const WritingPage = lazy(() => import('./components/WritingPage').then((m) => ({ default: m.WritingPage })));
const WorldGame = lazy(() => import('./components/WorldGame').then((m) => ({ default: m.WorldGame })));
const LevelTestPage = lazy(() => import('./components/LevelTestPage').then((m) => ({ default: m.LevelTestPage })));
const TakeQuiz = lazy(() => import('./components/TakeQuiz').then((m) => ({ default: m.TakeQuiz })));
const QuizResults = lazy(() => import('./components/QuizResults').then((m) => ({ default: m.QuizResults })));
const MyQuizzes = lazy(() => import('./components/MyQuizzes').then((m) => ({ default: m.MyQuizzes })));
const HuntEdit = lazy(() => import('./components/HuntsPage').then((m) => ({ default: m.HuntEdit })));
const HuntsPage = lazy(() => import('./components/HuntsPage').then((m) => ({ default: m.HuntsPage })));
const HuntBoard = lazy(() => import('./components/HuntBoard').then((m) => ({ default: m.HuntBoard })));
const HuntCards = lazy(() => import('./components/HuntCards').then((m) => ({ default: m.HuntCards })));
const HuntPlay = lazy(() => import('./components/HuntPlay').then((m) => ({ default: m.HuntPlay })));
const TestCreatePage = lazy(() => import('./components/tests/TestCreatePage').then((m) => ({ default: m.TestCreatePage })));
const TestEditPage = lazy(() => import('./components/tests/TestCreatePage').then((m) => ({ default: m.TestEditPage })));
const TestPage = lazy(() => import('./components/tests/TestPage').then((m) => ({ default: m.TestPage })));
const HuntTry = lazy(() => import('./components/HuntTry').then((m) => ({ default: m.HuntTry })));
const ProComparisonPage = lazy(() => import('./components/ProComparisonPage').then((m) => ({ default: m.ProComparisonPage })));
const AiModelBenchmarkPage = lazy(() => import('./components/AiModelBenchmarkPage').then((m) => ({ default: m.AiModelBenchmarkPage })));
const NetworkDebugPage = lazy(() => import('./components/NetworkDebugPage').then((m) => ({ default: m.NetworkDebugPage })));

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
          <Suspense fallback={null}>
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
            <Route path="/collections/:id/present" element={<CollectionPresentPage />} />
            <Route path="/collections/:id/tests/new" element={<TestCreatePage />} />
            <Route path="/tests/:id" element={<TestPage />} />
            <Route path="/tests/:id/edit" element={<TestEditPage />} />
            {/* Old shape (`?tab=ielts`) — send it to the equivalent path, keeping any other query params. */}
            <Route path="/writing" element={<WritingLegacyRedirect />} />
            <Route path="/writing/:tab" element={<WritingPage />} />
            <Route path="/world" element={<WorldGame />} />
            <Route path="/level-test" element={<LevelTestPage />} />
            <Route path="/quizzes" element={<MyQuizzes />} />
            <Route path="/quiz/:id" element={<TakeQuiz />} />
            <Route path="/quiz/:id/results" element={<QuizResults />} />
            {/* Treasure hunts: the teacher's list and board, and a student's phone. */}
            <Route path="/hunts" element={<HuntsPage />} />
            <Route path="/hunts/:id" element={<HuntBoard />} />
            <Route path="/hunts/:id/cards" element={<HuntCards />} />
            <Route path="/hunts/:id/try" element={<HuntTry />} />
            <Route path="/hunts/:id/edit" element={<HuntEdit />} />
            <Route path="/hunt/:code" element={<HuntPlay />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/pro" element={<ProComparisonPage />} />
            {/* Dev-only TTS benchmark — deliberately not linked from the Rail. */}
            <Route path="/ai-model-benchmark" element={<AiModelBenchmarkPage />} />
            {/* Linked from Settings → Developer, not the Rail. */}
            <Route path="/debug/network" element={<NetworkDebugPage />} />
          </Routes>
          </Suspense>
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
