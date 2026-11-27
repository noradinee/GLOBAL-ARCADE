import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useFavorites } from '../../context/FavoritesContext';
import { gameService } from '../../services/gameService';
import { extractLangFromPathname, localizePath } from '../../i18n/localeRouting';
import { LanguageSwitcher } from './LanguageSwitcher';
import { PlayerStatusWidget } from '../profile/PlayerStatusWidget';
import { SearchAutocomplete } from './SearchAutocomplete';
import {
  Search,
  Flame,
  Star,
  Bookmark,
  Grid,
  Menu,
  X,
  Gamepad2,
  Dices,
} from 'lucide-react';

export const Header: React.FC = () => {
  const { t, lang } = useLanguage();
  const { favorites } = useFavorites();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: t.nav.home, path: localizePath('/', lang), basePath: '/', icon: Gamepad2 },
    { label: t.nav.categories, path: localizePath('/categories', lang), basePath: '/categories', icon: Grid },
    { label: t.nav.trending, path: localizePath('/trending', lang), basePath: '/trending', icon: Flame },
    { label: t.nav.popular, path: localizePath('/popular', lang), basePath: '/popular', icon: Star },
    {
      label: t.nav.favorites,
      path: '/favorites',
      basePath: '/favorites',
      icon: Bookmark,
      badge: favorites.length > 0 ? favorites.length : undefined,
    },
  ];

  const { basePath: currentBasePath } = extractLangFromPathname(location.pathname);

  const isActive = (basePath: string) => {
    if (basePath === '/') return currentBasePath === '/';
    return currentBasePath.startsWith(basePath);
  };

  const handleSurpriseMe = () => {
    const currentSlug = currentBasePath.startsWith('/game/') ? currentBasePath.replace(/^\/game\/?/, '') : undefined;
    const randomGame = gameService.getRandomGame(currentSlug);
    if (randomGame) {
      navigate(localizePath(`/game/${randomGame.slug}`, lang));
      setMobileMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-dark-950/90 backdrop-blur-md border-b border-dark-750/70 transition-colors shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          
          {/* Brand Logo */}
          <Link
            to={localizePath('/', lang)}
            className="flex items-center gap-3 group focus:outline-none"
            aria-label="KYRAXO Home"
          >
            <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-brand-violet to-brand-cyan p-0.5 shadow-glow-purple group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-dark-900 rounded-[10px] flex items-center justify-center">
                <img src="/logo.svg" alt="KYRAXO Logo" className="w-7 h-7" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-brand-cyan">
                {lang === 'ar' ? 'كايراكسو' : 'KYRAXO'}
              </span>
              <span className="text-[10px] font-bold text-brand-purple tracking-widest uppercase hidden sm:block">
                {lang === 'ar' ? 'ألعاب المتصفح الحديثة' : 'Next-Gen HTML5 Gaming'}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.basePath);
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

          {/* Search Bar with Live Autocomplete & Quick Suggestions (Desktop & Tablet) */}
          <div className="hidden md:flex flex-1 max-w-xs lg:max-w-sm relative">
            <SearchAutocomplete
              value={searchQuery}
              onChange={setSearchQuery}
              onSubmit={(q) => {
                navigate(`/search?q=${encodeURIComponent(q)}`);
                setMobileMenuOpen(false);
              }}
              onSelectGame={() => {
                setMobileMenuOpen(false);
              }}
            />
          </div>

          {/* Right Action: Surprise Me, Player Status, Language Switcher & Mobile Menu Trigger */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Surprise Me / Random Game Button */}
            <button
              onClick={handleSurpriseMe}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-purple-500/15 hover:from-amber-500/25 hover:via-rose-500/25 hover:to-purple-500/25 border border-amber-500/40 text-amber-300 hover:text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-sm active:scale-95 group"
              title={lang === 'ar' ? 'فاجئني بلعبة عشوائية!' : 'Surprise me with a random game!'}
            >
              <Dices className="w-4 h-4 text-amber-400 group-hover:rotate-180 transition-transform duration-500" />
              <span className="hidden sm:inline">{lang === 'ar' ? 'فاجئني' : 'Random'}</span>
            </button>

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
          {/* Mobile Search with Autocomplete */}
          <div className="relative">
            <SearchAutocomplete
              value={searchQuery}
              onChange={setSearchQuery}
              onSubmit={(q) => {
                navigate(`/search?q=${encodeURIComponent(q)}`);
                setMobileMenuOpen(false);
              }}
              onSelectGame={() => {
                setMobileMenuOpen(false);
              }}
            />
          </div>

          {/* Nav List */}
          <div className="grid grid-cols-1 gap-1">
            {/* Surprise Me Mobile Button */}
            <button
              onClick={handleSurpriseMe}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-500/20 to-brand-rose/20 border border-amber-500/30 text-amber-300 hover:text-white transition-colors"
            >
              <div className="flex items-center gap-3">
                <Dices className="w-5 h-5 text-amber-400" />
                <span>{lang === 'ar' ? '🎲 فاجئني بلعبة عشوائية' : '🎲 Surprise Me (Random Game)'}</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200">
                {lang === 'ar' ? 'العب فوراً' : 'Play'}
              </span>
            </button>

            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.basePath);
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
