import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { adService } from '../../services/adService';
import { Shield, Cookie } from 'lucide-react';
import { Link } from 'react-router-dom';

export const CookieConsent: React.FC = () => {
  const { t } = useLanguage();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('global_arcade_cookie_consent');
    if (!consent) {
      // Small timeout so banner doesn't flash immediately on first frame
      const timer = setTimeout(() => setShowBanner(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    adService.setConsent(true);
    setShowBanner(false);
  };

  const handleDecline = () => {
    adService.setConsent(false);
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-slideUp">
      <div className="bg-dark-900/95 backdrop-blur-md border border-dark-700 p-5 rounded-2xl shadow-2xl shadow-black/80 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-brand-purple/20 text-brand-purple shrink-0 mt-0.5">
            <Cookie className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>{t.cookies.title}</span>
              <Shield className="w-3.5 h-3.5 text-brand-cyan" />
            </h4>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {t.cookies.message}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-dark-800">
          <Link
            to="/cookies"
            className="text-xs text-slate-400 hover:text-white underline underline-offset-2"
          >
            {t.cookies.learnMore}
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDecline}
              className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-dark-800 hover:bg-dark-750 rounded-xl transition-colors"
            >
              {t.cookies.decline}
            </button>
            <button
              onClick={handleAcceptAll}
              className="px-4 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-brand-purple to-brand-cyan hover:opacity-95 rounded-xl shadow-md transition-all"
            >
              {t.cookies.acceptAll}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
