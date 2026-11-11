import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { SEOHead } from '../components/common/SEOHead';
import { Breadcrumb } from '../components/common/Breadcrumb';
import { FileText } from 'lucide-react';

export const TermsPage: React.FC = () => {
  const { t, lang } = useLanguage();

  const seoTitle =
    lang === 'ar'
      ? 'شروط الاستخدام — جلوبال أركيد'
      : 'Terms of Service — Global Arcade';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <SEOHead
        title={seoTitle}
        description="Global Arcade Terms of Service. Review guidelines, permissible web play usage, and intellectual property rights."
        canonicalUrl={`${window.location.origin}/terms`}
        lang={lang}
      />

      <Breadcrumb items={[{ label: t.footer.termsOfService }]} />

      <div className="bg-dark-900 border border-dark-800 rounded-3xl p-6 sm:p-10 my-6 space-y-6 text-slate-300 text-sm leading-relaxed">
        <div className="flex items-center gap-3 border-b border-dark-800 pb-4">
          <div className="p-2 rounded-xl bg-brand-purple/20 text-brand-purple">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              {t.footer.termsOfService}
            </h1>
            <span className="text-xs text-slate-500">
              Effective Date: January 2025
            </span>
          </div>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white">1. Acceptance of Terms</h2>
          <p>
            By accessing or playing games on Global Arcade, you agree to comply with and be bound by these Terms of Service. If you do not agree to these terms, please do not use the platform.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white">2. Free Access & Fair Play</h2>
          <p>
            Global Arcade grants you a personal, non-exclusive, non-transferable, revocable license to access and play HTML5 games for personal, non-commercial entertainment purposes. You agree not to:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-400 pl-2">
            <li>Attempt to reverse-engineer, modify, or scrape proprietary game binaries.</li>
            <li>Use automated bots, scripts, or spiders to manipulate gameplay scores or flood servers.</li>
            <li>Bypass or tamper with advertising slots, security safeguards, or origin boundaries.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white">3. Intellectual Property & DMCA</h2>
          <p>
            All game titles, trademarks, and associated art assets are the property of their respective creators and licensors. Global Arcade hosts games under developer distribution agreements, open web licenses, and original productions.
          </p>
          <p>
            If you are a copyright owner and believe content on our platform infringes your rights, please submit a formal DMCA notice to <strong className="text-brand-purple">dmca@globalarcade.games</strong> for immediate review and resolution.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white">4. Disclaimer of Warranties</h2>
          <p>
            The services and games are provided &quot;AS IS&quot; without warranty of any kind. Global Arcade does not guarantee that game sessions will be error-free or uninterrupted across all hardware configurations.
          </p>
        </section>
      </div>
    </div>
  );
};
