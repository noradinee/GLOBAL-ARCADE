import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { SEOHead } from '../components/common/SEOHead';
import { Breadcrumb } from '../components/common/Breadcrumb';
import { adService } from '../services/adService';
import { Cookie, CheckCircle2 } from 'lucide-react';

export const CookiePolicyPage: React.FC = () => {
  const { t, lang } = useLanguage();
  const [currentConsent, setCurrentConsent] = useState(() => adService.checkConsent());
  const [savedNotice, setSavedNotice] = useState(false);

  const handleUpdate = (accept: boolean) => {
    adService.setConsent(accept);
    setCurrentConsent(accept);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const seoTitle =
    lang === 'ar'
      ? 'سياسة ملفات تعريف الارتباط (الكوكيز) — جلوبال أركيد'
      : 'Cookie Policy — Global Arcade';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <SEOHead
        title={seoTitle}
        description="Learn how Global Arcade uses cookies to store high scores, remember preferences, and deliver programmatic advertising."
        canonicalUrl={`${window.location.origin}/cookies`}
        lang={lang}
      />

      <Breadcrumb items={[{ label: t.footer.cookiePolicy }]} />

      <div className="bg-dark-900 border border-dark-800 rounded-3xl p-6 sm:p-10 my-6 space-y-6 text-slate-300 text-sm leading-relaxed">
        <div className="flex items-center gap-3 border-b border-dark-800 pb-4">
          <div className="p-2 rounded-xl bg-brand-amber/20 text-brand-amber">
            <Cookie className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              {t.footer.cookiePolicy}
            </h1>
            <span className="text-xs text-slate-500">
              Transparency & Preferences
            </span>
          </div>
        </div>

        {/* Interactive Consent Controller */}
        <div className="bg-dark-850 border border-dark-750 p-5 rounded-2xl space-y-3">
          <h3 className="font-bold text-white text-base">
            {lang === 'ar' ? 'إدارة تفضيلات الكوكيز الحالية' : 'Manage Your Cookie Settings'}
          </h3>
          <p className="text-xs text-slate-400">
            {lang === 'ar'
              ? 'يمكنك تغيير موافقتك على ملفات تعريف الارتباط الإعلانية في أي وقت أدناه:'
              : 'You can update your advertising consent preference at any time below:'}
          </p>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => handleUpdate(true)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                currentConsent
                  ? 'bg-brand-emerald text-white shadow-md'
                  : 'bg-dark-800 text-slate-400 hover:text-white'
              }`}
            >
              {lang === 'ar' ? 'السماح بجميع ملفات تعريف الارتباط' : 'Accept All (Personalized)'}
            </button>

            <button
              onClick={() => handleUpdate(false)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                !currentConsent
                  ? 'bg-brand-rose text-white shadow-md'
                  : 'bg-dark-800 text-slate-400 hover:text-white'
              }`}
            >
              {lang === 'ar' ? 'الضرورية فقط (غير مخصصة)' : 'Essential Only (Non-Personalized)'}
            </button>

            {savedNotice && (
              <span className="flex items-center gap-1 text-xs text-brand-emerald font-bold animate-fadeIn">
                <CheckCircle2 className="w-4 h-4" />
                <span>{lang === 'ar' ? 'تم الحفظ!' : 'Saved!'}</span>
              </span>
            )}
          </div>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white">What Are Cookies?</h2>
          <p>
            Cookies are small text snippets stored in your browser when visiting websites. They help remember your language choices, high scores in games, and keep web applications functioning smoothly.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white">Types of Cookies Used on Global Arcade</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-400 pl-2">
            <li>
              <strong className="text-slate-200">Strictly Necessary & Functional Storage:</strong> Used to store your active language (English or Arabic), your favorite games list, and game progress.
            </li>
            <li>
              <strong className="text-slate-200">Analytics Storage:</strong> Anonymized metrics to understand game popularity and improve site speed.
            </li>
            <li>
              <strong className="text-slate-200">Advertising Cookies:</strong> Deployed by ad networks (such as Google AdSense) to display relevant advertisements that fund our platform without charging players.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
};
