import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { ProfileProvider } from './context/ProfileContext';
import { analytics } from './services/analytics';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { MobileBottomNav } from './components/common/MobileBottomNav';
import { CookieConsent } from './components/common/CookieConsent';
import { ToastContainer } from './components/common/ToastContainer';
import { PwaInstallPrompt } from './components/common/PwaInstallPrompt';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Eager HomePage for instant First Contentful Paint
import { HomePage } from './pages/HomePage';

// Lazy-loaded routes for optimal code splitting & lightning-fast initial load
const GameDetailPage = lazy(() => import('./pages/GameDetailPage').then(m => ({ default: m.GameDetailPage })));
const CategoryPage = lazy(() => import('./pages/CategoryPage').then(m => ({ default: m.CategoryPage })));
const CategoriesListPage = lazy(() => import('./pages/CategoriesListPage').then(m => ({ default: m.CategoriesListPage })));
const TrendingPage = lazy(() => import('./pages/TrendingPage').then(m => ({ default: m.TrendingPage })));
const PopularPage = lazy(() => import('./pages/PopularPage').then(m => ({ default: m.PopularPage })));
const SearchPage = lazy(() => import('./pages/SearchPage').then(m => ({ default: m.SearchPage })));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage').then(m => ({ default: m.FavoritesPage })));
const AboutPage = lazy(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })));
const ContactPage = lazy(() => import('./pages/ContactPage').then(m => ({ default: m.ContactPage })));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage').then(m => ({ default: m.PrivacyPolicyPage })));
const TermsPage = lazy(() => import('./pages/TermsPage').then(m => ({ default: m.TermsPage })));
const CookiePolicyPage = lazy(() => import('./pages/CookiePolicyPage').then(m => ({ default: m.CookiePolicyPage })));
const DiscoveryInboxPage = lazy(() => import('./pages/DiscoveryInboxPage').then(m => ({ default: m.DiscoveryInboxPage })));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));

const RouteTracker: React.FC = () => {
  const location = useLocation();
  useEffect(() => {
    analytics.trackPageView(location.pathname + location.search);
  }, [location]);
  return null;
};

const PageLoaderFallback: React.FC = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
    <div className="w-8 h-8 rounded-full border-2 border-brand-purple border-t-transparent animate-spin" />
    <span className="text-xs text-slate-400 font-mono">Loading...</span>
  </div>
);

export const App: React.FC = () => {
  return (
    <LanguageProvider>
      <FavoritesProvider>
        <ProfileProvider>
          <BrowserRouter>
            <RouteTracker />
            <div className="min-h-screen flex flex-col bg-dark-950 text-slate-100">
              {/* Header Navigation */}
              <Header />

              {/* Main Dynamic Viewport with Error & Suspense Boundaries */}
              <main className="flex-1 pb-16 md:pb-0">
                <ErrorBoundary>
                  <Suspense fallback={<PageLoaderFallback />}>
                    <Routes>
                      <Route path="/" element={<HomePage />} />
                      <Route path="/game/:slug" element={<GameDetailPage />} />
                      <Route path="/category/:slug" element={<CategoryPage />} />
                      <Route path="/categories" element={<CategoriesListPage />} />
                      <Route path="/trending" element={<TrendingPage />} />
                      <Route path="/popular" element={<PopularPage />} />
                      <Route path="/search" element={<SearchPage />} />
                      <Route path="/favorites" element={<FavoritesPage />} />
                      <Route path="/inbox" element={<DiscoveryInboxPage />} />
                      <Route path="/inbox/:candidateId" element={<DiscoveryInboxPage />} />
                      <Route path="/admin" element={<AdminDashboardPage />} />
                      <Route path="/admin/*" element={<AdminDashboardPage />} />
                      <Route path="/owner" element={<AdminDashboardPage />} />
                      <Route path="/owner/*" element={<AdminDashboardPage />} />
                      <Route path="/about" element={<AboutPage />} />
                      <Route path="/contact" element={<ContactPage />} />
                      <Route path="/privacy" element={<PrivacyPolicyPage />} />
                      <Route path="/terms" element={<TermsPage />} />
                      <Route path="/cookies" element={<CookiePolicyPage />} />
                      {/* Fallback */}
                      <Route path="*" element={<HomePage />} />
                    </Routes>
                  </Suspense>
                </ErrorBoundary>
              </main>

              {/* Footer */}
              <Footer />

              {/* Mobile Bottom Navigation Bar */}
              <MobileBottomNav />

              {/* PWA Mobile & Desktop Install Prompt */}
              <PwaInstallPrompt />

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
