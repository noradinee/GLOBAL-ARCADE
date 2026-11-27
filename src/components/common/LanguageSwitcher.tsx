import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { analytics } from '../../services/analytics';
import { Language } from '../../i18n/translations';
import { extractLangFromPathname, isLocalizableSeoPath, localizePath } from '../../i18n/localeRouting';
import seoTranslations from '../../data/seoTranslations.json';
import { Globe, ChevronDown, Check } from 'lucide-react';

interface LanguageOption {
  code: Language;
  name: string;
  flag: string;
}

const languages: LanguageOption[] = seoTranslations.languages.map((l) => ({
  code: l.code as Language,
  name: l.nativeName,
  flag: l.flag,
}));

export const LanguageSwitcher: React.FC = () => {
  const { lang, setLang } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const currentLang = languages.find((l) => l.code === lang) || languages[0];

  const handleSelect = (code: Language) => {
    if (lang !== code) {
      setLang(code);
      analytics.trackLanguageSwitched(code);

      const { basePath } = extractLangFromPathname(location.pathname);
      if (isLocalizableSeoPath(basePath)) {
        const nextPath = localizePath(basePath, code);
        if (nextPath !== location.pathname) {
          navigate(`${nextPath}${location.search}${location.hash}`);
        }
      }
    }
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-850 hover:bg-dark-800 border border-dark-700/80 text-xs font-bold text-slate-200 transition-colors shadow-sm focus:outline-none"
        aria-label="Select Language"
      >
        <span className="text-sm">{currentLang.flag}</span>
        <span className="uppercase font-mono">{currentLang.code}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 rtl:left-0 rtl:right-auto mt-2 w-52 max-h-80 overflow-y-auto rounded-2xl bg-dark-900/95 border border-dark-700 shadow-2xl backdrop-blur-md py-1.5 z-50 animate-fadeIn">
          <div className="px-3 py-1 border-b border-dark-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Globe className="w-3 h-3 text-brand-cyan" />
            <span>Languages ({languages.length})</span>
          </div>

          <div className="py-1">
            {languages.map((l) => {
              const isSelected = l.code === lang;
              return (
                <button
                  key={l.code}
                  onClick={() => handleSelect(l.code)}
                  className={`w-full px-3 py-2 text-xs font-semibold flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-brand-purple/20 text-brand-cyan font-bold'
                      : 'text-slate-300 hover:bg-dark-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{l.flag}</span>
                    <span>{l.name}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-brand-cyan" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
