import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { analytics } from '../../services/analytics';

export const LanguageSwitcher: React.FC = () => {
  const { lang, setLang } = useLanguage();

  const handleSwitch = (newLang: 'en' | 'ar') => {
    if (lang !== newLang) {
      setLang(newLang);
      analytics.trackLanguageSwitched(newLang);
    }
  };

  return (
    <div className="flex items-center bg-dark-850 p-1 rounded-xl border border-dark-700/80 shadow-inner">
      <button
        onClick={() => handleSwitch('en')}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
          lang === 'en'
            ? 'bg-gradient-to-r from-brand-purple to-brand-cyan text-white shadow-sm'
            : 'text-slate-400 hover:text-slate-200'
        }`}
        aria-label="Switch to English"
      >
        <span>EN</span>
      </button>

      <button
        onClick={() => handleSwitch('ar')}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
          lang === 'ar'
            ? 'bg-gradient-to-r from-brand-purple to-brand-cyan text-white shadow-sm'
            : 'text-slate-400 hover:text-slate-200'
        }`}
        aria-label="التبديل إلى العربية"
      >
        <span className="font-arabic">عربي</span>
      </button>
    </div>
  );
};
