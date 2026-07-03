import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './hooks/useAuth';
import { Navbar } from './components/Navbar';
import { FlashCard } from './components/FlashCard';
import { BookmarkList } from './components/BookmarkList';
import { SettingsPage } from './components/SettingsPage';
import { LoginPage } from './components/LoginPage';
import { ProfilePage } from './components/ProfilePage';
import { FabMenu } from './components/FabMenu';
import { EnglishPractice } from './components/EnglishPractice';
import { EnglishSpeakingPage } from './components/EnglishSpeakingPage';
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
              <Route path="/bookmarks" element={<BookmarkList />} />
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
