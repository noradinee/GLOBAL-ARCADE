import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { SEOHead } from '../components/common/SEOHead';
import { Breadcrumb } from '../components/common/Breadcrumb';
import { Shield } from 'lucide-react';

export const PrivacyPolicyPage: React.FC = () => {
  const { t, lang } = useLanguage();

  const seoTitle =
    lang === 'ar'
      ? 'سياسة الخصوصية — جلوبال أركيد | حماية بيانات المستخدم'
      : 'Privacy Policy — Global Arcade | User Data Protection';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <SEOHead
        title={seoTitle}
        description="Global Arcade Privacy Policy. Understand how we handle data, advertising identifiers, cookies, and protect user confidentiality."
        canonicalUrl={`${window.location.origin}/privacy`}
        lang={lang}
      />

      <Breadcrumb items={[{ label: t.footer.privacyPolicy }]} />

      <div className="bg-dark-900 border border-dark-800 rounded-3xl p-6 sm:p-10 my-6 space-y-6 text-slate-300 text-sm leading-relaxed">
        <div className="flex items-center gap-3 border-b border-dark-800 pb-4">
          <div className="p-2 rounded-xl bg-brand-cyan/20 text-brand-cyan">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              {t.footer.privacyPolicy}
            </h1>
            <span className="text-xs text-slate-500">
              Last Updated: January 2025
            </span>
          </div>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white">1. Introduction</h2>
          <p>
            Global Arcade (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains what information we collect, how we use it, and the choices you have regarding your personal data when using our free online gaming platform.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white">2. Information We Collect</h2>
          <p>
            We prioritize zero unnecessary data collection. We do not require registration or personal accounts to play games. The information we process includes:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-400 pl-2">
            <li><strong>Local Game Data:</strong> High scores, unlocked levels, and favorited games stored directly in your browser&apos;s localStorage. This data never leaves your device.</li>
            <li><strong>Technical Telemetry:</strong> Anonymized browser type, device category, screen resolution, and operating system used to optimize game rendering and performance.</li>
            <li><strong>Analytics & Metrics:</strong> Aggregated page views and gameplay duration to improve catalog curation.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white">3. Third-Party Advertising & Cookies</h2>
          <p>
            To keep Global Arcade 100% free for all players, we partner with reputable digital advertising networks (such as Google AdSense and authorized programmatic partners). These partners may use cookies, web beacons, and mobile advertising IDs to serve personalized or contextual advertisements.
          </p>
          <p>
            You can manage your cookie preferences at any time using our Cookie Consent banner or through your browser settings.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white">4. Children&apos;s Privacy (COPPA & GDPR-K)</h2>
          <p>
            We do not knowingly collect personal identifiable information from children under the age of 13. Our games in the &quot;Kids&quot; category are selected for safety and general audiences without behavioral tracking.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white">5. Contact Information</h2>
          <p>
            If you have questions regarding this Privacy Policy or wish to submit a data inquiry, please contact our privacy compliance officer at: <strong className="text-brand-cyan">privacy@globalarcade.games</strong>.
          </p>
        </section>
      </div>
    </div>
  );
};
