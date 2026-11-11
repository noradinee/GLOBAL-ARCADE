import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useFavorites } from '../../context/FavoritesContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { PlayerStatusWidget } from '../profile/PlayerStatusWidget';
import {
  Search,
  Flame,
  Star,
  Bookmark,
  Grid,
  Menu,
  X,
  Gamepad2,
} from 'lucide-react';

export const Header: React.FC = () => {
  const { t, lang, isRtl } = useLanguage();
  const { favorites } = useFavorites();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  const navLinks = [
    { label: t.nav.home, path: '/', icon: Gamepad2 },
    { label: t.nav.categories, path: '/categories', icon: Grid },
    { label: t.nav.trending, path: '/trending', icon: Flame },
    { label: t.nav.popular, path: '/popular', icon: Star },
    {
      label: t.nav.favorites,
      path: '/favorites',
      icon: Bookmark,
      badge: favorites.length > 0 ? favorites.length : undefined,
    },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-dark-950/90 backdrop-blur-md border-b border-dark-750/70 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          
          {/* Brand Logo */}
          <Link
            to="/"
            className="flex items-center gap-3 group focus:outline-none"
            aria-label="Global Arcade Home"
          >
            <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-brand-violet to-brand-cyan p-0.5 shadow-glow-purple group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-dark-900 rounded-[10px] flex items-center justify-center">
                <img src="/logo.svg" alt="Global Arcade Logo" className="w-7 h-7" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-brand-cyan">
                {lang === 'ar' ? 'جلوبال أركيد' : 'GLOBAL ARCADE'}
              </span>
              <span className="text-[10px] font-bold text-brand-purple tracking-widest uppercase hidden sm:block">
                {lang === 'ar' ? 'ألعاب متصفح مجانية' : 'HTML5 Online Gaming'}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                    active
                      ? 'bg-brand-violet/20 text-brand-cyan border border-brand-violet/30'
                      : 'text-slate-300 hover:text-white hover:bg-dark-800/80'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-brand-cyan' : 'text-slate-400'}`} />
                  <span>{link.label}</span>
                  {link.badge !== undefined && (
                    <span className="ml-1 rtl:mr-1 px-1.5 py-0.5 text-[11px] font-black bg-brand-rose text-white rounded-full">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Search Bar (Desktop & Tablet) */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:flex flex-1 max-w-xs lg:max-w-sm relative"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.search.placeholder}
              className={`w-full bg-dark-900/90 text-sm text-slate-100 placeholder-slate-500 rounded-xl py-2 border border-dark-700/80 focus:border-brand-purple focus:ring-1 focus:ring-brand-purple focus:outline-none transition-all ${
                isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'
              }`}
            />
            <button
              type="submit"
              className={`absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-cyan transition-colors ${
                isRtl ? 'right-3' : 'left-3'
              }`}
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>
          </form>

          {/* Right Action: Player Status, Language Switcher & Mobile Menu Trigger */}
          <div className="flex items-center gap-2 sm:gap-3">
            <PlayerStatusWidget />
            <LanguageSwitcher />

            {/* Mobile Search Button */}
            <button
              onClick={() => navigate('/search')}
              className="md:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-dark-800 focus:outline-none"
              aria-label="Open Search"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Mobile Menu Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-dark-800 focus:outline-none"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-dark-900 border-b border-dark-700 px-4 pt-3 pb-6 space-y-3 animate-fadeIn">
          {/* Mobile Search */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.search.placeholder}
              className={`w-full bg-dark-850 text-sm text-slate-100 placeholder-slate-500 rounded-xl py-2.5 border border-dark-700 focus:border-brand-purple focus:outline-none ${
                isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'
              }`}
            />
            <button
              type="submit"
              className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${
                isRtl ? 'right-3' : 'left-3'
              }`}
            >
              <Search className="w-4 h-4" />
            </button>
          </form>

          {/* Nav List */}
          <div className="grid grid-cols-1 gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    active
                      ? 'bg-brand-violet/20 text-brand-cyan border border-brand-violet/40'
                      : 'text-slate-300 hover:bg-dark-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-brand-purple" />
                    <span>{link.label}</span>
                  </div>
                  {link.badge !== undefined && (
                    <span className="px-2 py-0.5 text-xs font-bold bg-brand-rose text-white rounded-full">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
