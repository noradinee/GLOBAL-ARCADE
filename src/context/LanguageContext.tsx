import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, translations, TranslationDictionary } from '../i18n/translations';
import { SUPPORTED_LANGUAGES, extractLangFromPathname } from '../i18n/localeRouting';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: TranslationDictionary;
  isRtl: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function detectInitialLanguage(): Language {
  if (typeof window !== 'undefined') {
    const { langFromUrl } = extractLangFromPathname(window.location.pathname);
    if (langFromUrl) return langFromUrl;
  }

  const saved = (typeof localStorage !== 'undefined' ? localStorage.getItem('global_arcade_lang') : null) as Language | null;
  if (saved && SUPPORTED_LANGUAGES.includes(saved)) return saved;

  const nav = (typeof navigator !== 'undefined' ? navigator.language?.toLowerCase() : '') || '';
  if (nav.startsWith('ar')) return 'ar';
  if (nav.startsWith('es')) return 'es';
  if (nav.startsWith('pt')) return 'pt';
  if (nav.startsWith('fr')) return 'fr';
  if (nav.startsWith('de')) return 'de';
  if (nav.startsWith('tr')) return 'tr';
  if (nav.startsWith('id') || nav.startsWith('in')) return 'id';
  if (nav.startsWith('ru')) return 'ru';
  if (nav.startsWith('it')) return 'it';
  if (nav.startsWith('pl')) return 'pl';
  return 'en';
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(detectInitialLanguage);

  const isRtl = lang === 'ar';

  useEffect(() => {
    try {
      localStorage.setItem('global_arcade_lang', lang);
    } catch {
      // ignore storage errors in restricted environments
    }
    document.documentElement.lang = lang;
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';

    if (isRtl) {
      document.body.classList.add('font-arabic');
      document.body.classList.remove('font-sans');
    } else {
      document.body.classList.add('font-sans');
      document.body.classList.remove('font-arabic');
    }
  }, [lang, isRtl]);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
  };

  const toggleLang = () => {
    setLangState((prev) => (prev === 'en' ? 'ar' : 'en'));
  };

  const t = translations[lang] || translations.en;

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t, isRtl }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
