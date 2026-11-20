import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { gameService } from '../services/gameService';
import { SEOHead } from '../components/common/SEOHead';
import { Breadcrumb } from '../components/common/Breadcrumb';
import { GamePlayer } from '../components/game/GamePlayer';
import { GameRatingWidget } from '../components/game/GameRatingWidget';
import { GameGrid } from '../components/game/GameGrid';
import { AdSlot } from '../components/ads/AdSlot';
import {
  Gamepad2,
  HelpCircle,
  Keyboard,
  Smartphone,
  Tag,
  Star,
  Shield,
  Calendar,
  User,
  ArrowLeft,
  Sparkles,
  Share2,
  Copy,
  Check,
  MessageCircle,
  Send,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const GameDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { t, lang, isRtl } = useLanguage();

  const [copiedLink, setCopiedLink] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0); // First FAQ open by default

  const game = slug ? gameService.getGameBySlug(slug) : undefined;
  const category = game ? gameService.getCategoryBySlug(game.category) : undefined;
  const relatedGames = game ? gameService.getRelatedGames(game, 5) : [];
  const recommendedGames = gameService.getPopularGames(5).filter(g => g.id !== game?.id);

  // Scroll to top on slug change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setOpenFaq(0);
    setCopiedLink(false);
  }, [slug]);

  if (!game) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-black text-white mb-4">404 — Game Not Found</h1>
        <p className="text-slate-400 mb-8">
          The requested game may have been moved or removed from our library.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-brand-purple text-white font-bold hover:bg-brand-violet transition-colors"
        >
          <ArrowLeft className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
          <span>{t.common.backToHome}</span>
        </Link>
      </div>
    );
  }

  const title = lang === 'ar' ? game.titleAr : game.title;
  const description = lang === 'ar' ? game.descriptionAr : game.description;
  const instructions = lang === 'ar' ? game.instructionsAr : game.instructions;
  const categoryName = category ? (lang === 'ar' ? category.nameAr : category.name) : game.category;

  // Lookalike Competitor Benchmark SEO
  const benchmarkName = lang === 'ar' ? (game.benchmarkGameAr || game.benchmarkGame) : game.benchmarkGame;

  const seoTitle = benchmarkName
    ? lang === 'ar'
      ? `${title} — العب اون لاين (بديل ${benchmarkName} مجاناً) | كايراكسو`
      : `${title} — Play Online (Free ${benchmarkName} Web Alternative) | KYRAXO`
    : lang === 'ar'
      ? `${title} — العب مجاناً اون لاين بدون تحميل | العاب كايراكسو`
      : `${title} — Play Free Online HTML5 Game | KYRAXO`;

  const seoDescription = benchmarkName
    ? lang === 'ar'
      ? `العب الآن لعبة ${title} مجاناً وبدون تحميل على كايراكسو! أفضل بديل ويب سريع ومطور لـ ${benchmarkName}. متوافقة 100% مع الموبايل والكمبيوتر وبأعلى جودة.`
      : `Play ${title} online for free on KYRAXO! The ultimate browser alternative to ${benchmarkName}. No download or installation required. 100% free HTML5 gameplay on mobile and PC.`
    : description;

  const seoKeywords = Array.from(
    new Set(
      (game.searchKeywords || [])
        .concat(game.tags || [])
        .concat(game.similarTo || [])
        .concat(benchmarkName ? [benchmarkName, `games like ${game.benchmarkGame || ''}`] : [])
    )
  ).join(', ');

  const canonicalUrl = `${window.location.origin}/game/${game.slug}`;

  // Social sharing handlers
  const handleCopyLink = () => {
    navigator.clipboard.writeText(canonicalUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const shareText = lang === 'ar'
    ? `العب الآن لعبة ${title} مجاناً وبدون تحميل على كايراكسو! 🎮🔥`
    : `Play ${title} for free online on KYRAXO! No download required. 🎮🔥`;

  const shareWhatsApp = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText}\n${canonicalUrl}`)}`;
  const shareTelegram = `https://t.me/share/url?url=${encodeURIComponent(canonicalUrl)}&text=${encodeURIComponent(shareText)}`;
  const shareTwitter = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(canonicalUrl)}`;

  // Dedicated Lookalike Benchmark FAQ for Rich Snippets
  const benchmarkFaq = benchmarkName
    ? lang === 'ar'
      ? {
          q: `هل لعبة ${title} تشبه لعبة ${benchmarkName}؟`,
          a: `نعم! تقدم لعبة ${title} تجربة لعب ممتعة ومجانية ومطورة مستوحاة من أسلوب وميكانيكية ${benchmarkName}، وتعمل مباشرة عبر المتصفح بتقنية HTML5 الحديثة على الهواتف الذكية وأجهزة الكمبيوتر بدون تحميل وبدون مساحة تخزين.`
        }
      : {
          q: `Is ${title} similar to ${benchmarkName}?`,
          a: `Yes! ${title} is an exciting, free HTML5 web alternative inspired by ${benchmarkName}. It is fully optimized for instant browser play on both mobile and desktop with zero downloads.`
        }
    : null;

  // Tailored Game FAQs for Users and Google Search Snippets
  const faqs = lang === 'ar' ? [
    ...(benchmarkFaq ? [benchmarkFaq] : []),
    {
      q: `كيف تلعب ${title} على الموبايل والكمبيوتر؟`,
      a: `${instructions} يمكنك اللعب بلمس الشاشة وسحب أصابعك على جميع الهواتف الذكية (iOS و Android)، أو استخدام الفأرة ولوحة المفاتيح على الكمبيوتر.`
    },
    {
      q: `هل لعبة ${title} مجانية بالكامل وبدون تحميل؟`,
      a: `نعم، لعبة ${title} مجانية 100% وتعمل مباشرة عبر المتصفح بتقنية HTML5 الحديثة بدون الحاجة لتثبيت أي برامج أو تسجيل دخول.`
    },
    {
      q: `ما هي ميزات وتصنيف لعبة ${title}؟`,
      a: `تنتمي اللعبة إلى تصنيف ${categoryName}، وتتميز باستجابة فورية بدون بطء، وتوافق تام مع متصفحات جوجل كروم وسفاري وفايرفوكس وإيدج.`
    },
    {
      q: `هل يمكنني مشاركة اللعبة وتحدي الأصدقاء؟`,
      a: `بالتأكيد! يمكنك نسخ رابط اللعبة أو مشاركتها بضغطة زر عبر واتساب وتيليجرام وتحدي أصدقائك لتسجيل أعلى النقاط القياسية.`
    }
  ] : [
    ...(benchmarkFaq ? [benchmarkFaq] : []),
    {
      q: `How do I play ${title} on mobile and desktop?`,
      a: `${instructions} Simply touch, tap, and drag on your smartphone or tablet, or use your keyboard and mouse controls on PC.`
    },
    {
      q: `Is ${title} completely free without downloads?`,
      a: `Yes! ${title} is 100% free to play directly in your web browser. There are no downloads, subscriptions, or installations required.`
    },
    {
      q: `What devices and browsers support ${title}?`,
      a: `It runs seamlessly on all modern devices including iPhone, Android, iPad, Mac, and Windows PC across Chrome, Safari, Edge, and Firefox.`
    },
    {
      q: `Can I share ${title} with friends?`,
      a: `Yes, use the quick share buttons below to send the game to friends on WhatsApp, Telegram, or X and see who gets the highest score!`
    }
  ];

  // Comprehensive Google Schema Graph (VideoGame + BreadcrumbList + FAQPage)
  const gameSchema = [
    {
      '@type': 'VideoGame',
      name: game.title,
      headline: title,
      description: seoDescription,
      image: `${window.location.origin}${game.thumbnail}`,
      genre: game.category,
      keywords: seoKeywords,
      isSimilarTo: game.similarTo || (game.benchmarkGame ? [game.benchmarkGame] : []),
      applicationCategory: 'Game',
      operatingSystem: 'Any, Web Browser, iOS, Android, Windows, macOS',
      inLanguage: ['ar', 'en'],
      playMode: game.category === 'two-player' ? 'MultiPlayer' : 'SinglePlayer',
      url: canonicalUrl,
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: game.rating || 4.9,
        ratingCount: game.ratingCount || 520,
        bestRating: '5',
        worstRating: '1',
      },
      author: {
        '@type': 'Organization',
        name: game.author || 'KYRAXO Studios',
        url: window.location.origin,
      },
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
      },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: lang === 'ar' ? 'الرئيسية' : 'Home',
          item: window.location.origin,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: lang === 'ar' ? 'التصنيفات' : 'Categories',
          item: `${window.location.origin}/categories`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: categoryName,
          item: `${window.location.origin}/category/${game.category}`,
        },
        {
          '@type': 'ListItem',
          position: 4,
          name: title,
          item: canonicalUrl,
        },
      ],
    },
    {
      '@type': 'FAQPage',
      mainEntity: faqs.map(f => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: f.a,
        },
      })),
    },
  ];

  const breadcrumbItems = [
    { label: t.nav.categories, path: '/categories' },
    { label: categoryName, path: `/category/${game.category}` },
    { label: title },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        keywords={seoKeywords}
        canonicalUrl={canonicalUrl}
        ogImage={game.thumbnail}
        ogType="game"
        schemaData={gameSchema}
        lang={lang}
      />

      {/* Breadcrumb Navigation */}
      <Breadcrumb items={breadcrumbItems} />

      {/* Main Game Section with Player and Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 my-4">
        {/* Left Column: Player & Game Details (3 cols) */}
        <div className="lg:col-span-3 flex flex-col gap-4 sm:gap-6">
          {/* Banner Ad positioned directly above game */}
          <AdSlot placement="above-game" className="!my-0 !mb-1" />

          {/* Responsive Game Player Component */}
          <GamePlayer game={game} />

          {/* Interactive Game Reaction & Rating Widget */}
          <GameRatingWidget gameId={game.id} />

          {/* VIRAL SOCIAL SHARE BAR */}
          <div className="bg-dark-900 border border-dark-800 rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2 text-white font-bold text-xs sm:text-sm">
              <Share2 className="w-4 h-4 text-brand-cyan" />
              <span>{lang === 'ar' ? 'شارك اللعبة مع أصدقائك:' : 'Share this game:'}</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* WhatsApp */}
              <a
                href={shareWhatsApp}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center gap-1.5 transition-colors"
                title="WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>واتساب</span>
              </a>

              {/* Telegram */}
              <a
                href={shareTelegram}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-400 font-bold text-xs flex items-center gap-1.5 transition-colors"
                title="Telegram"
              >
                <Send className="w-3.5 h-3.5" />
                <span>تيليجرام</span>
              </a>

              {/* Twitter / X */}
              <a
                href={shareTwitter}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors"
                title="X (Twitter)"
              >
                <span>𝕏</span>
                <span>تويتر</span>
              </a>

              {/* Copy Link Button */}
              <button
                onClick={handleCopyLink}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all border ${
                  copiedLink
                    ? 'bg-brand-emerald text-white border-brand-emerald shadow-glow-emerald'
                    : 'bg-dark-850 hover:bg-dark-800 text-slate-300 border-dark-700'
                }`}
                title="Copy Link"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? (lang === 'ar' ? 'تم النسخ!' : 'Copied!') : (lang === 'ar' ? 'نسخ الرابط' : 'Copy Link')}</span>
              </button>
            </div>
          </div>

          {/* Ad Slot safely positioned below game with safe margin */}
          <AdSlot placement="below-game" className="my-2" />

          {/* Game Overview / Description Card */}
          <div className="bg-dark-900 border border-dark-800 rounded-2xl p-5 sm:p-7 space-y-4">
            <div className="flex items-center gap-4 border-b border-dark-800 pb-4">
              <img
                src={game.thumbnail}
                alt={title}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-brand-cyan/40 shadow-glow-cyan shrink-0"
              />
              <div className="flex flex-col gap-1">
                <h2 className="text-lg sm:text-xl font-black text-white">{title}</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-brand-violet/20 text-brand-cyan font-bold text-xs border border-brand-violet/30 uppercase">
                    {categoryName}
                  </span>
                  {benchmarkName && (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-xs shadow-sm">
                      <span>⭐</span>
                      <span>{lang === 'ar' ? `بديل مجاني لـ ${benchmarkName}` : `Free ${benchmarkName} Alternative`}</span>
                    </span>
                  )}
                  <span className="text-xs text-slate-400">★ {game.rating} ({game.ratingCount} {t.game.votes})</span>
                </div>
              </div>
            </div>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              {description}
            </p>

            {/* How to Play Section */}
            <div className="pt-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
                <HelpCircle className="w-4 h-4 text-brand-cyan" />
                <span>{t.game.instructions}</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 bg-dark-850 p-3.5 rounded-xl border border-dark-750/70 leading-relaxed">
                {instructions}
              </p>
            </div>

            {/* Controls Matrix */}
            <div className="pt-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                <Keyboard className="w-4 h-4 text-brand-amber" />
                <span>{t.game.controls}</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Desktop controls */}
                <div className="bg-dark-850 p-3 rounded-xl border border-dark-750">
                  <span className="font-bold text-brand-cyan block mb-1.5 flex items-center gap-1.5">
                    <Keyboard className="w-3.5 h-3.5" />
                    {t.game.desktopControls}
                  </span>
                  <ul className="space-y-1 text-slate-300">
                    {game.controls.desktop.map((c: string, i: number) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Mobile controls */}
                <div className="bg-dark-850 p-3 rounded-xl border border-dark-750">
                  <span className="font-bold text-brand-purple block mb-1.5 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5" />
                    {t.game.mobileControls}
                  </span>
                  <ul className="space-y-1 text-slate-300">
                    {game.controls.mobile.map((c: string, i: number) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-purple" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Tags Pill List */}
            <div className="flex items-center flex-wrap gap-2 pt-3 border-t border-dark-800">
              <Tag className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs text-slate-500 font-bold">{t.game.tags}:</span>
              {game.tags.map((tag: string) => (
                <Link
                  key={tag}
                  to={`/search?q=${encodeURIComponent(tag)}`}
                  className="px-2.5 py-1 rounded-lg bg-dark-800 hover:bg-dark-750 text-slate-300 hover:text-white text-xs transition-colors border border-dark-700/60"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          </div>

          {/* INTERACTIVE SEO FAQ SECTION (Poki / CrazyGames Ranking Engine) */}
          <div className="bg-dark-900 border border-dark-800 rounded-2xl p-5 sm:p-7 space-y-3">
            <div className="flex items-center gap-2 border-b border-dark-800 pb-3">
              <HelpCircle className="w-5 h-5 text-brand-cyan" />
              <h2 className="text-lg font-black text-white">
                {lang === 'ar' ? `الأسئلة الشائعة حول لعبة ${title}` : `Frequently Asked Questions about ${title}`}
              </h2>
            </div>

            <div className="space-y-2.5 pt-2">
              {faqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={idx}
                    className="border border-dark-800 rounded-xl overflow-hidden bg-dark-850/60 transition-colors"
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full p-3.5 sm:p-4 text-left rtl:text-right flex items-center justify-between gap-3 font-bold text-xs sm:text-sm text-white hover:text-brand-cyan transition-colors"
                    >
                      <span>{faq.q}</span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-brand-cyan shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-3.5 sm:px-4 pb-3.5 sm:pb-4 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-dark-800/80 pt-2.5 animate-fadeIn">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Game Metadata & Sidebar Ads (1 col) */}
        <aside className="lg:col-span-1 flex flex-col gap-5">
          {/* Metadata Card */}
          <div className="bg-dark-900 border border-dark-800 rounded-2xl p-5 space-y-4 text-xs">
            <h3 className="font-black text-sm text-white uppercase tracking-wider border-b border-dark-800 pb-2">
              {lang === 'ar' ? 'معلومات اللعبة' : 'Game Info'}
            </h3>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-brand-amber fill-brand-amber" />
                  <span>{t.game.rating}</span>
                </span>
                <span className="font-bold text-white">
                  {game.rating} / 5.0 ({game.ratingCount} {t.game.votes})
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Gamepad2 className="w-3.5 h-3.5 text-brand-cyan" />
                  <span>{t.game.category}</span>
                </span>
                <Link
                  to={`/category/${game.category}`}
                  className="font-bold text-brand-cyan hover:underline capitalize"
                >
                  {categoryName}
                </Link>
              </div>

              {game.author && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-brand-purple" />
                    <span>{t.game.author}</span>
                  </span>
                  <span className="font-semibold text-slate-200 truncate max-w-[130px]">
                    {game.author}
                  </span>
                </div>
              )}

              {game.license && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-brand-emerald" />
                    <span>{t.game.license}</span>
                  </span>
                  <span className="font-semibold text-slate-300">
                    {game.license}
                  </span>
                </div>
              )}

              {game.releaseDate && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>{t.game.releaseDate}</span>
                  </span>
                  <span className="font-semibold text-slate-300">
                    {game.releaseDate}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Banner Ad */}
          <AdSlot placement="game-sidebar" />
        </aside>
      </div>

      {/* SECTION: Related Games */}
      {relatedGames.length > 0 && (
        <section className="mt-14 mb-8">
          <div className="flex items-center gap-2 mb-5">
            <Sparkles className="w-5 h-5 text-brand-cyan" />
            <h2 className="text-xl sm:text-2xl font-black text-white">
              {t.game.relatedGames}
            </h2>
          </div>
          <GameGrid games={relatedGames} />
        </section>
      )}

      {/* SECTION: Recommended Games */}
      {recommendedGames.length > 0 && (
        <section className="my-10">
          <div className="flex items-center gap-2 mb-5">
            <Star className="w-5 h-5 text-brand-amber fill-brand-amber" />
            <h2 className="text-xl sm:text-2xl font-black text-white">
              {t.game.recommendedForYou}
            </h2>
          </div>
          <GameGrid games={recommendedGames} />
        </section>
      )}
    </div>
  );
};
