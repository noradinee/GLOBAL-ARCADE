import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { SEOHead } from '../components/common/SEOHead';
import { Breadcrumb } from '../components/common/Breadcrumb';
import { Zap, Shield, Users, Rocket } from 'lucide-react';

export const AboutPage: React.FC = () => {
  const { t, lang } = useLanguage();

  const seoTitle =
    lang === 'ar'
      ? 'من نحن — رسالة ورؤية جلوبال أركيد'
      : 'About Us — Mission & Vision | Global Arcade';

  const seoDescription =
    lang === 'ar'
      ? 'تعرف على جلوبال أركيد، منصتك الرائدة لألعاب الويب التفاعلية بدون تحميل وتجربة الألعاب المباشرة لجميع الفئات العمرية.'
      : 'Learn more about Global Arcade, our mission to provide high-speed instant HTML5 games globally, and our commitment to accessible gaming.';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        canonicalUrl={`${window.location.origin}/about`}
        lang={lang}
      />

      <Breadcrumb items={[{ label: t.footer.aboutUs }]} />

      <div className="my-6">
        <h1 className="text-3xl sm:text-4xl font-black text-white mb-4">
          {t.footer.aboutUs}
        </h1>
        <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
          {lang === 'ar'
            ? 'جلوبال أركيد هي منصة ألعاب ويب رائدة تهدف إلى جعل تجربة اللعب الفوري عبر المتصفح متاحة للجميع حول العالم دون أي عوائق تقنية أو اشتراكات مدفوعة.'
            : 'Global Arcade is a next-generation web gaming platform dedicated to delivering fast, friction-free browser entertainment for players worldwide without paywalls or mandatory downloads.'}
        </p>
      </div>

      {/* Core Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-10">
        <div className="bg-dark-900 border border-dark-800 rounded-2xl p-6">
          <div className="w-12 h-12 rounded-xl bg-brand-purple/20 text-brand-purple flex items-center justify-center mb-4">
            <Zap className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-white text-base mb-2">
            {lang === 'ar' ? 'سرعة ولعب فوري' : 'Instant & Frictionless'}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {lang === 'ar'
              ? 'لا حاجة لتنزيل ملفات APK أو تطبيقات ضخمة. افتح الرابط وابدأ اللعب فوراً في أقل من ثانيتين.'
              : 'Zero loading hurdles or storage consumption. Click and play seamlessly in seconds.'}
          </p>
        </div>

        <div className="bg-dark-900 border border-dark-800 rounded-2xl p-6">
          <div className="w-12 h-12 rounded-xl bg-brand-cyan/20 text-brand-cyan flex items-center justify-center mb-4">
            <Shield className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-white text-base mb-2">
            {lang === 'ar' ? 'أمان وجودة محتوى' : 'Curated & Safe'}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {lang === 'ar'
              ? 'نقوم بفحص جميع الألعاب لضمان أمانها وسلامتها للأطفال والأسرة، وخلوها من البرمجيات الضارة.'
              : 'Every title in our library undergoes quality testing and safety reviews to ensure family-safe fun.'}
          </p>
        </div>

        <div className="bg-dark-900 border border-dark-800 rounded-2xl p-6">
          <div className="w-12 h-12 rounded-xl bg-brand-emerald/20 text-brand-emerald flex items-center justify-center mb-4">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-white text-base mb-2">
            {lang === 'ar' ? 'جمهور عربي وعالمي' : 'Global & Local'}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {lang === 'ar'
              ? 'دعم متكامل ومتقن للغة العربية وواجهات RTL جنباً إلى جنب مع الإنجليزية لتجربة مريحة لجميع المستخدمين.'
              : 'First-class localization in both English and Arabic with native RTL and LTR support.'}
          </p>
        </div>
      </div>

      {/* Narrative Section */}
      <div className="bg-dark-900/60 border border-dark-800 rounded-3xl p-6 sm:p-8 space-y-4 text-sm text-slate-300 leading-relaxed">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Rocket className="w-5 h-5 text-brand-cyan" />
          <span>{lang === 'ar' ? 'رؤيتنا التقنية' : 'Our Technical Vision'}</span>
        </h2>
        <p>
          {lang === 'ar'
            ? 'نؤمن في جلوبال أركيد بأن مستقبل ألعاب الفيديو يكمن في تقنيات الويب المفتوحة (HTML5 و WebAssembly و WebGL). هذه التقنيات تمكن المطورين من الوصول المباشر لمليارات الأجهزة المتصلة دون الحاجة لمتجر تطبيقات مغلق أو عمولات احتكارية.'
            : 'At Global Arcade, we believe the future of interactive entertainment is powered by open web technologies (HTML5, WebGL, WebAssembly). These standards empower independent game developers to reach billions of connected screens without app store gatekeepers or monopolistic barriers.'}
        </p>
        <p>
          {lang === 'ar'
            ? 'نعمل باستمرار على استقطاب وتطوير أفضل ألعاب الأركيد، والتفحيط، والألغاز، والقتال، وتقديمها في بيئة تفاعلية حديثة تحترم خصوصية المستخدم وتوفر أعلى درجات المتعة.'
            : 'We continuously curate and partner with top independent studios to bring high-energy arcade games, physics puzzles, and multiplayer challenges right to your fingertips.'}
        </p>
      </div>
    </div>
  );
};
