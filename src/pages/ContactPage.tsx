import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { SEOHead } from '../components/common/SEOHead';
import { Breadcrumb } from '../components/common/Breadcrumb';
import { Mail, Send, CheckCircle2, MessageSquare } from 'lucide-react';

export const ContactPage: React.FC = () => {
  const { t, lang } = useLanguage();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'general',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const resp = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const payload = await resp.json().catch(() => ({}));
      if (!resp.ok || !payload.success) {
        throw new Error(payload.error || payload.message || (lang === 'ar' ? 'تعذر إرسال الرسالة، يرجى التحقق من الحقول.' : 'Unable to send message. Please check your entries.'));
      }
      setSubmitted(true);
      setFormData({ name: '', email: '', subject: 'general', message: '' });
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : (lang === 'ar' ? 'حدث خطأ أثناء الإرسال.' : 'Submission failed.'));
    } finally {
      setSubmitting(false);
    }
  };

  const seoTitle =
    lang === 'ar'
      ? 'اتصل بنا — كايراكسو | تواصل مع فريق المنصة'
      : 'Contact Us — Support & Partnerships | KYRAXO';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <SEOHead
        title={seoTitle}
        description="Get in touch with the KYRAXO team for technical support, game submissions, or advertising partnerships."
        canonicalUrl={`${window.location.origin}/contact`}
        lang={lang}
      />

      <Breadcrumb items={[{ label: t.footer.contactUs }]} />

      <div className="my-6">
        <h1 className="text-3xl sm:text-4xl font-black text-white mb-3">
          {t.footer.contactUs}
        </h1>
        <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
          {lang === 'ar'
            ? 'نسعد دائماً بتواصلكم! سواء كان لديك استفسار، اقتراح للعبة جديدة، أو رغبة في شراكة إعلانية، فريقنا جاهز للرد عليك.'
            : 'We would love to hear from you! Reach out for technical feedback, HTML5 game submissions, or advertising inquiries.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 my-8">
        {/* Contact Info Sidebar */}
        <div className="space-y-4">
          <div className="bg-dark-900 border border-dark-800 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <Mail className="w-5 h-5 text-brand-cyan" />
              <h3 className="font-bold text-white text-sm">
                {lang === 'ar' ? 'البريد الإلكتروني' : 'Direct Email'}
              </h3>
            </div>
            <p className="text-xs text-slate-400 mb-2">
              {lang === 'ar' ? 'للاستفسارات العامة والملاحظات' : 'For general and technical inquiries'}
            </p>
            <a
              href="mailto:contact@kyraxo.com"
              className="text-xs font-mono text-brand-purple hover:underline"
            >
              contact@kyraxo.com
            </a>
          </div>

          <div className="bg-dark-900 border border-dark-800 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <Mail className="w-5 h-5 text-brand-purple" />
              <h3 className="font-bold text-white text-sm">
                {lang === 'ar' ? 'الخصوصية وحقوق النشر' : 'Privacy & DMCA Inquiries'}
              </h3>
            </div>
            <p className="text-xs text-slate-400 mb-1">
              {lang === 'ar' ? 'مسؤول حماية البيانات:' : 'Data Protection:'}{' '}
              <a href="mailto:privacy@kyraxo.com" className="font-mono text-brand-cyan hover:underline">privacy@kyraxo.com</a>
            </p>
            <p className="text-xs text-slate-400">
              {lang === 'ar' ? 'إخطارات حقوق النشر:' : 'Copyright Agent:'}{' '}
              <a href="mailto:dmca@kyraxo.com" className="font-mono text-brand-cyan hover:underline">dmca@kyraxo.com</a>
            </p>
          </div>

          <div className="bg-dark-900 border border-dark-800 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <MessageSquare className="w-5 h-5 text-brand-emerald" />
              <h3 className="font-bold text-white text-sm">
                {lang === 'ar' ? 'إرسال لعبة جديدة' : 'Submit a Game'}
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {lang === 'ar'
                ? 'هل أنت مطور ألعاب HTML5؟ انضم إلى شبكتنا وانشر لعبتك أمام آلاف الزوار.'
                : 'Are you an HTML5 game developer? Submit your game to reach global players.'}
            </p>
          </div>
        </div>

        {/* Form Area */}
        <div className="md:col-span-2 bg-dark-900 border border-dark-800 rounded-3xl p-6 sm:p-8">
          {submitted ? (
            <div className="text-center py-10 space-y-4">
              <CheckCircle2 className="w-14 h-14 text-brand-emerald mx-auto" />
              <h3 className="text-xl font-bold text-white">
                {lang === 'ar' ? 'تم استلام رسالتك بنجاح!' : 'Message Received!'}
              </h3>
              <p className="text-sm text-slate-400 max-w-sm mx-auto">
                {lang === 'ar'
                  ? 'شكراً لتواصلك معنا. سنقوم بالرد على بريدك الإلكتروني في أقرب وقت ممكن.'
                  : 'Thank you for reaching out. A member of our support team will reply shortly.'}
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="mt-4 px-6 py-2 rounded-xl bg-dark-800 text-slate-200 text-xs font-bold hover:bg-dark-750"
              >
                {lang === 'ar' ? 'إرسال رسالة أخرى' : 'Send Another Message'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  {lang === 'ar' ? 'الاسم الكامل' : 'Your Name'}
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={lang === 'ar' ? 'مثال: أحمد محمد' : 'e.g. Alex Morgan'}
                  className="w-full bg-dark-850 text-white text-sm rounded-xl py-2.5 px-4 border border-dark-700 focus:border-brand-purple focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  {lang === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@example.com"
                  className="w-full bg-dark-850 text-white text-sm rounded-xl py-2.5 px-4 border border-dark-700 focus:border-brand-purple focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  {lang === 'ar' ? 'الموضوع' : 'Inquiry Type'}
                </label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full bg-dark-850 text-white text-sm rounded-xl py-2.5 px-4 border border-dark-700 focus:border-brand-purple focus:outline-none cursor-pointer"
                >
                  <option value="general">{lang === 'ar' ? 'استفسار عام' : 'General Question'}</option>
                  <option value="game-submission">{lang === 'ar' ? 'تقديم لعبة جديدة' : 'Submit an HTML5 Game'}</option>
                  <option value="advertising">{lang === 'ar' ? 'إعلانات وشراكات' : 'Advertising & Sponsorship'}</option>
                  <option value="bug-report">{lang === 'ar' ? 'الإبلاغ عن خطأ في لعبة' : 'Bug Report / Technical Issue'}</option>
                  <option value="dmca">{lang === 'ar' ? 'حقوق الملكية الفكرية DMCA' : 'Copyright / DMCA Notice'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  {lang === 'ar' ? 'الرسالة' : 'Your Message'}
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder={lang === 'ar' ? 'اكتب استفسارك بالتفصيل هنا...' : 'Write your detailed inquiry here...'}
                  className="w-full bg-dark-850 text-white text-sm rounded-xl py-2.5 px-4 border border-dark-700 focus:border-brand-purple focus:outline-none resize-none"
                />
              </div>

              {submitError && (
                <div className="p-3 rounded-xl bg-brand-rose/15 border border-brand-rose/30 text-brand-rose text-xs font-semibold">
                  {submitError}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-purple to-brand-cyan text-white text-sm font-bold shadow-glow-purple hover:opacity-95 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? (lang === 'ar' ? 'جاري الإرسال...' : 'Sending...') : (lang === 'ar' ? 'إرسال الرسالة' : 'Send Message')}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
