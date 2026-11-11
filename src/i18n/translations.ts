export type Language = 'en' | 'ar';

export interface TranslationDictionary {
  siteTitle: string;
  siteTagline: string;
  nav: {
    home: string;
    allGames: string;
    categories: string;
    trending: string;
    popular: string;
    favorites: string;
    search: string;
    about: string;
    contact: string;
  };
  home: {
    heroTitle: string;
    heroSubtitle: string;
    playNow: string;
    exploreCategories: string;
    featuredGames: string;
    trendingGames: string;
    popularGames: string;
    recentlyAdded: string;
    recommendedGames: string;
    allCategories: string;
    viewAll: string;
    noDownloads: string;
    instantPlay: string;
    freeForever: string;
    gamesAvailable: string;
  };
  game: {
    playNow: string;
    loadingGame: string;
    fullscreen: string;
    exitFullscreen: string;
    restart: string;
    share: string;
    copied: string;
    addToFavorites: string;
    removeFromFavorites: string;
    rating: string;
    votes: string;
    category: string;
    tags: string;
    description: string;
    instructions: string;
    controls: string;
    desktopControls: string;
    mobileControls: string;
    author: string;
    license: string;
    releaseDate: string;
    relatedGames: string;
    recommendedForYou: string;
    errorLoading: string;
    errorRetry: string;
  };
  category: {
    titlePrefix: string;
    allCategoriesTitle: string;
    exploreDesc: string;
    gamesCount: string;
    noGamesFound: string;
    sortBy: string;
    popularFirst: string;
    highestRated: string;
    alphabetical: string;
  };
  search: {
    placeholder: string;
    searchTitle: string;
    resultsFor: string;
    noResults: string;
    noResultsHint: string;
    allCategories: string;
    filterByCategory: string;
    quickTags: string;
  };
  ads: {
    advertisement: string;
    sponsored: string;
    devNotice: string;
  };
  cookies: {
    title: string;
    message: string;
    acceptAll: string;
    decline: string;
    learnMore: string;
  };
  footer: {
    description: string;
    quickLinks: string;
    categories: string;
    legal: string;
    aboutUs: string;
    contactUs: string;
    privacyPolicy: string;
    termsOfService: string;
    cookiePolicy: string;
    copyright: string;
    disclaimer: string;
  };
  common: {
    loading: string;
    close: string;
    backToHome: string;
    shareSuccess: string;
  };
}

export const translations: Record<Language, TranslationDictionary> = {
  en: {
    siteTitle: 'Global Arcade',
    siteTagline: 'Play the Best Free HTML5 Browser Games Online',
    nav: {
      home: 'Home',
      allGames: 'All Games',
      categories: 'Categories',
      trending: 'Trending',
      popular: 'Popular',
      favorites: 'Favorites',
      search: 'Search Games...',
      about: 'About',
      contact: 'Contact',
    },
    home: {
      heroTitle: 'Instant Free Browser Gaming',
      heroSubtitle: 'No downloads. No installs. Play hundreds of curated HTML5 games directly in your browser on desktop, tablet, and mobile.',
      playNow: 'Play Now',
      exploreCategories: 'Explore Categories',
      featuredGames: 'Featured Games',
      trendingGames: 'Trending Now',
      popularGames: 'Most Popular',
      recentlyAdded: 'Recently Added',
      recommendedGames: 'Recommended For You',
      allCategories: 'Browse by Category',
      viewAll: 'View All',
      noDownloads: 'Instant Play',
      instantPlay: '100% Free Forever',
      freeForever: 'Mobile & Desktop Friendly',
      gamesAvailable: 'Games in Library',
    },
    game: {
      playNow: 'Play Game',
      loadingGame: 'Initializing game engine...',
      fullscreen: 'Fullscreen',
      exitFullscreen: 'Exit Fullscreen',
      restart: 'Restart',
      share: 'Share Game',
      copied: 'Link copied to clipboard!',
      addToFavorites: 'Add to Favorites',
      removeFromFavorites: 'Remove from Favorites',
      rating: 'Rating',
      votes: 'ratings',
      category: 'Category',
      tags: 'Tags',
      description: 'Game Overview',
      instructions: 'How to Play',
      controls: 'Controls & Keys',
      desktopControls: 'Desktop Keyboard & Mouse',
      mobileControls: 'Mobile & Tablet Touch',
      author: 'Developer / Studio',
      license: 'License',
      releaseDate: 'Released',
      relatedGames: 'Similar Games',
      recommendedForYou: 'Players Also Enjoyed',
      errorLoading: 'Could not load game files. Please check connection.',
      errorRetry: 'Retry Loading',
    },
    category: {
      titlePrefix: 'Free Online',
      allCategoriesTitle: 'Game Categories',
      exploreDesc: 'Discover top browser games grouped by genre and gameplay style.',
      gamesCount: 'games available',
      noGamesFound: 'No games found in this category yet. Check back soon!',
      sortBy: 'Sort By',
      popularFirst: 'Most Popular',
      highestRated: 'Highest Rated',
      alphabetical: 'A to Z',
    },
    search: {
      placeholder: 'Search by title, tag, or category...',
      searchTitle: 'Search Games',
      resultsFor: 'Search results for',
      noResults: 'No games found matching',
      noResultsHint: 'Try searching with different keywords, tags, or browse our categories.',
      allCategories: 'All Categories',
      filterByCategory: 'Filter by Category',
      quickTags: 'Popular Searches',
    },
    ads: {
      advertisement: 'ADVERTISEMENT',
      sponsored: 'Sponsored Partner',
      devNotice: 'Ad Placeholder — Active in Production',
    },
    cookies: {
      title: 'Cookie & Privacy Preferences',
      message: 'Global Arcade uses cookies and local storage to personalize game settings, save high scores, and deliver relevant advertisements.',
      acceptAll: 'Accept All',
      decline: 'Necessary Only',
      learnMore: 'Cookie Policy',
    },
    footer: {
      description: 'Global Arcade is a premier free online gaming platform delivering high-speed, instant-play HTML5 games without downloads across desktop and mobile devices.',
      quickLinks: 'Quick Links',
      categories: 'Top Genres',
      legal: 'Legal & Privacy',
      aboutUs: 'About Us',
      contactUs: 'Contact Us',
      privacyPolicy: 'Privacy Policy',
      termsOfService: 'Terms of Service',
      cookiePolicy: 'Cookie Policy',
      copyright: 'All rights reserved.',
      disclaimer: 'All game trademarks, logos, and character designs are property of their respective creators.',
    },
    common: {
      loading: 'Loading...',
      close: 'Close',
      backToHome: 'Back to Homepage',
      shareSuccess: 'Game link copied!',
    },
  },
  ar: {
    siteTitle: 'جلوبال أركيد',
    siteTagline: 'أفضل منصة ألعاب مجانية بدون تحميل أونلاين',
    nav: {
      home: 'الرئيسية',
      allGames: 'كل الألعاب',
      categories: 'الأقسام',
      trending: 'الأكثر تداولاً',
      popular: 'الأكثر شهرة',
      favorites: 'المفضلة',
      search: 'ابحث عن لعبة...',
      about: 'من نحن',
      contact: 'اتصل بنا',
    },
    home: {
      heroTitle: 'العب فوراً بدون تحميل أو تثبيت',
      heroSubtitle: 'استمتع بمئات من ألعاب HTML5 المميزة مباشرة على متصفحك عبر الكمبيوتر والجوال والتابلت بجودة عالية وسرعة فائقة.',
      playNow: 'العب الآن',
      exploreCategories: 'استكشف الأقسام',
      featuredGames: 'ألعاب مميزة',
      trendingGames: 'الرائجة حالياً',
      popularGames: 'الأكثر لعباً',
      recentlyAdded: 'أضيف حديثاً',
      recommendedGames: 'ألعاب مختارة لك',
      allCategories: 'تصفح حسب القسم',
      viewAll: 'عرض الكل',
      noDownloads: 'لعب فوري مباشر',
      instantPlay: 'مجانية 100% للأبد',
      freeForever: 'متوافقة مع الموبايل والكمبيوتر',
      gamesAvailable: 'لعبة في المكتبة',
    },
    game: {
      playNow: 'ابدأ اللعب',
      loadingGame: 'جاري تشغيل محرك اللعبة...',
      fullscreen: 'ملء الشاشة',
      exitFullscreen: 'إنهاء ملء الشاشة',
      restart: 'إعادة التشغيل',
      share: 'مشاركة اللعبة',
      copied: 'تم نسخ رابط اللعبة!',
      addToFavorites: 'إضافة للمفضلة',
      removeFromFavorites: 'إزالة من المفضلة',
      rating: 'التقييم',
      votes: 'تقييم',
      category: 'القسم',
      tags: 'الوسوم',
      description: 'نبذة عن اللعبة',
      instructions: 'طريقة اللعب',
      controls: 'أزرار التحكم',
      desktopControls: 'أزرار الكيبورد والفأرة (الكمبيوتر)',
      mobileControls: 'التحكم باللمس (الموبايل والتابلت)',
      author: 'المطور / الاستوديو',
      license: 'الترخيص',
      releaseDate: 'تاريخ الإطلاق',
      relatedGames: 'ألعاب مشابهة',
      recommendedForYou: 'ألعاب نالت إعجاب اللاعبين',
      errorLoading: 'تعذر تحميل ملفات اللعبة. يرجى التحقق من الاتصال.',
      errorRetry: 'إعادة المحاولة',
    },
    category: {
      titlePrefix: 'ألعاب مجانية في قسم',
      allCategoriesTitle: 'أقسام وتصنيفات الألعاب',
      exploreDesc: 'اكتشف أفضل ألعاب المتصفح مرتبة حسب النوع وأسلوب اللعب.',
      gamesCount: 'لعبة متاحة',
      noGamesFound: 'لا توجد ألعاب في هذا القسم حالياً. ترقبوا المزيد قريباً!',
      sortBy: 'الترتيب حسب',
      popularFirst: 'الأكثر شعبية',
      highestRated: 'الأعلى تقييماً',
      alphabetical: 'أبجدياً',
    },
    search: {
      placeholder: 'ابحث بالاسم، الوسم، أو القسم...',
      searchTitle: 'البحث عن ألعاب',
      resultsFor: 'نتائج البحث عن',
      noResults: 'لم يتم العثور على ألعاب تطابق',
      noResultsHint: 'جرب البحث بكلمات أخرى أو تصفح الأقسام الرئيسية في المنصة.',
      allCategories: 'جميع الأقسام',
      filterByCategory: 'تصفية حسب القسم',
      quickTags: 'عمليات بحث شائعة',
    },
    ads: {
      advertisement: 'إعلان ممول',
      sponsored: 'شريك إعلاني',
      devNotice: 'مساحة إعلانية — تعمل بكفاءة عند تفعيل الشبكة',
    },
    cookies: {
      title: 'سياسة ملفات تعريف الارتباط والخصوصية',
      message: 'يستخدم موقع جلوبال أركيد ملفات تعريف الارتباط لحفظ تقدمك في الألعاب وعرض الإعلانات المناسبة.',
      acceptAll: 'موافق على الكل',
      decline: 'الضروري فقط',
      learnMore: 'سياسة الكوكيز',
    },
    footer: {
      description: 'جلوبال أركيد هي منصتك الرائدة لألعاب المتصفح السريعة والمجانية بدون الحاجة لأي تحميل، متوافقة تماماً مع أجهزة الهاتف والحاسوب.',
      quickLinks: 'روابط سريعة',
      categories: 'أشهر الأقسام',
      legal: 'الشروط والخصوصية',
      aboutUs: 'من نحن',
      contactUs: 'اتصل بنا',
      privacyPolicy: 'سياسة الخصوصية',
      termsOfService: 'شروط الاستخدام',
      cookiePolicy: 'سياسة الكوكيز',
      copyright: 'جميع الحقوق محفوظة.',
      disclaimer: 'جميع العلامات التجارية وحقوق الألعاب مملوكة لأصحابها ومطوريها الأصليين.',
    },
    common: {
      loading: 'جاري التحميل...',
      close: 'إغلاق',
      backToHome: 'العودة للرئيسية',
      shareSuccess: 'تم نسخ الرابط بنجاح!',
    },
  },
};
