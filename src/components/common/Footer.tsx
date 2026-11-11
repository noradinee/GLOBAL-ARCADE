import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { Gamepad2, ShieldCheck, Zap, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  const { t, lang } = useLanguage();

  const topCategories = [
    { name: lang === 'ar' ? 'ألعاب أكشن' : 'Action Games', slug: 'action' },
    { name: lang === 'ar' ? 'ألعاب أركيد' : 'Arcade Games', slug: 'arcade' },
    { name: lang === 'ar' ? 'ألعاب سباق' : 'Racing Games', slug: 'racing' },
    { name: lang === 'ar' ? 'ألعاب ذكاء' : 'Puzzle Games', slug: 'puzzle' },
    { name: lang === 'ar' ? 'ألعاب لاعبين 2' : 'Two Player Games', slug: 'two-player' },
  ];

  return (
    <footer className="bg-dark-900 border-t border-dark-800 text-slate-400 mt-20">
      {/* Upper features ribbon */}
      <div className="border-b border-dark-800/80 bg-dark-950/60 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left rtl:md:text-right">
            <div className="flex items-center justify-center md:justify-start rtl:md:justify-start gap-3">
              <div className="p-2.5 rounded-xl bg-brand-purple/10 text-brand-purple border border-brand-purple/20">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-white font-bold text-sm">
                  {lang === 'ar' ? 'لعب فوري بدون تحميل' : 'Instant In-Browser Play'}
                </h4>
                <p className="text-xs text-slate-400">
                  {lang === 'ar' ? 'تشغيل فوري على جميع المتصفحات' : 'Zero installs or downloads required'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center md:justify-start rtl:md:justify-start gap-3">
              <div className="p-2.5 rounded-xl bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20">
                <Gamepad2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-white font-bold text-sm">
                  {lang === 'ar' ? 'متوافق مع جميع الأجهزة' : 'Cross-Platform Ready'}
                </h4>
                <p className="text-xs text-slate-400">
                  {lang === 'ar' ? 'دعم كامل للجوال والتابلت والحاسوب' : 'Seamless on mobile, tablet & desktop'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center md:justify-start rtl:md:justify-start gap-3">
              <div className="p-2.5 rounded-xl bg-brand-emerald/10 text-brand-emerald border border-brand-emerald/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-white font-bold text-sm">
                  {lang === 'ar' ? 'ألعاب آمنة ومجانية 100%' : '100% Free & Safe'}
                </h4>
                <p className="text-xs text-slate-400">
                  {lang === 'ar' ? 'محتوى مفحوص وخالٍ من الفيروسات' : 'Curated, family-friendly gaming'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-3">
              <img src="/logo.svg" alt="Global Arcade" className="w-9 h-9" />
              <span className="text-2xl font-black text-white tracking-wider">
                {lang === 'ar' ? 'جلوبال أركيد' : 'GLOBAL ARCADE'}
              </span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              {t.footer.description}
            </p>
            <div className="pt-2 text-xs text-slate-500">
              {t.footer.disclaimer}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-bold text-sm tracking-wider uppercase mb-4">
              {t.footer.quickLinks}
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/" className="hover:text-brand-cyan transition-colors">
                  {t.nav.home}
                </Link>
              </li>
              <li>
                <Link to="/categories" className="hover:text-brand-cyan transition-colors">
                  {t.nav.categories}
                </Link>
              </li>
              <li>
                <Link to="/trending" className="hover:text-brand-cyan transition-colors">
                  {t.nav.trending}
                </Link>
              </li>
              <li>
                <Link to="/popular" className="hover:text-brand-cyan transition-colors">
                  {t.nav.popular}
                </Link>
              </li>
              <li>
                <Link to="/favorites" className="hover:text-brand-cyan transition-colors">
                  {t.nav.favorites}
                </Link>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-white font-bold text-sm tracking-wider uppercase mb-4">
              {t.footer.categories}
            </h3>
            <ul className="space-y-2.5 text-sm">
              {topCategories.map((c) => (
                <li key={c.slug}>
                  <Link
                    to={`/category/${c.slug}`}
                    className="hover:text-brand-cyan transition-colors"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-bold text-sm tracking-wider uppercase mb-4">
              {t.footer.legal}
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/about" className="hover:text-brand-cyan transition-colors">
                  {t.footer.aboutUs}
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-brand-cyan transition-colors">
                  {t.footer.contactUs}
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-brand-cyan transition-colors">
                  {t.footer.privacyPolicy}
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-brand-cyan transition-colors">
                  {t.footer.termsOfService}
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="hover:text-brand-cyan transition-colors">
                  {t.footer.cookiePolicy}
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="border-t border-dark-800 mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} Global Arcade. {t.footer.copyright}</p>
          <div className="flex items-center gap-1">
            <span>Built with precision for gamers globally</span>
            <Heart className="w-3.5 h-3.5 text-brand-rose fill-brand-rose" />
          </div>
        </div>
      </div>
    </footer>
  );
};
