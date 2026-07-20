import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './hooks/useAuth';
import { Navbar } from './components/Navbar';
import { FlashCard } from './components/FlashCard';
import { HistoryPage } from './components/HistoryPage';
import { SettingsPage } from './components/SettingsPage';
import { LoginPage } from './components/LoginPage';
import { ProfilePage } from './components/ProfilePage';
import { FabMenu } from './components/FabMenu';
import { EnglishPractice } from './components/EnglishPractice';
import { EnglishSpeakingPage } from './components/EnglishSpeakingPage';
import { CompanionPage } from './components/CompanionPage';
import { CollectionsPage } from './components/CollectionsPage';
import { LevelTestPage } from './components/LevelTestPage';
import { TakeQuiz } from './components/TakeQuiz';
import { QuizResults } from './components/QuizResults';
import { MyQuizzes } from './components/MyQuizzes';
import { OnboardingModal } from './components/OnboardingModal';
import { LoginGate } from './components/LoginGate';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/+$/, '') || '/'}>
        <div className="min-h-screen">
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<FlashCard />} />
              <Route path="/speaking" element={<EnglishSpeakingPage />} />
              <Route path="/history" element={<HistoryPage />} />
              {/* Old path — keep existing links working. */}
              <Route path="/bookmarks" element={<Navigate to="/history" replace />} />
              <Route path="/companion" element={<CompanionPage />} />
              <Route path="/collections" element={<CollectionsPage />} />
              <Route path="/level-test" element={<LevelTestPage />} />
              <Route path="/quizzes" element={<MyQuizzes />} />
              <Route path="/quiz/:id" element={<TakeQuiz />} />
              <Route path="/quiz/:id/results" element={<QuizResults />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Routes>
          </main>
        </div>
        <FabMenu />
        <EnglishPractice />
        <LoginGate />
        <OnboardingModal />
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
