import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { ProfileProvider } from './context/ProfileContext';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { CookieConsent } from './components/common/CookieConsent';
import { ToastContainer } from './components/common/ToastContainer';

// Pages
import { HomePage } from './pages/HomePage';
import { GameDetailPage } from './pages/GameDetailPage';
import { CategoryPage } from './pages/CategoryPage';
import { CategoriesListPage } from './pages/CategoriesListPage';
import { TrendingPage } from './pages/TrendingPage';
import { PopularPage } from './pages/PopularPage';
import { SearchPage } from './pages/SearchPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsPage } from './pages/TermsPage';
import { CookiePolicyPage } from './pages/CookiePolicyPage';

export const App: React.FC = () => {
  return (
    <LanguageProvider>
      <FavoritesProvider>
        <ProfileProvider>
          <BrowserRouter>
            <div className="min-h-screen flex flex-col bg-dark-950 text-slate-100">
              {/* Header Navigation */}
              <Header />

              {/* Main Dynamic Viewport */}
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/game/:slug" element={<GameDetailPage />} />
                  <Route path="/category/:slug" element={<CategoryPage />} />
                  <Route path="/categories" element={<CategoriesListPage />} />
                  <Route path="/trending" element={<TrendingPage />} />
                  <Route path="/popular" element={<PopularPage />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/favorites" element={<FavoritesPage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/privacy" element={<PrivacyPolicyPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/cookies" element={<CookiePolicyPage />} />
                  {/* Fallback */}
                  <Route path="*" element={<HomePage />} />
                </Routes>
              </main>

              {/* Footer */}
              <Footer />

              {/* Toast Achievements & Gamification Alerts */}
              <ToastContainer />

              {/* GDPR / Privacy Cookie Banner */}
              <CookieConsent />
            </div>
          </BrowserRouter>
        </ProfileProvider>
      </FavoritesProvider>
    </LanguageProvider>
  );
};

export default App;
