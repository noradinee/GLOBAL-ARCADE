export type Language = 'en' | 'ar' | 'fr' | 'es' | 'de' | 'pt';

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
    sortBy: string;
    mostPlayed: string;
    highestRated: string;
    alphabeticalAZ: string;
    alphabeticalZA: string;
    newest: string;
    trending: string;
    letters: string;
    allLetters: string;
    quickSuggestions: string;
    autoComplete: string;
    playDirectly: string;
    pressEnterForResults: string;
    clearFilters: string;
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
  // English
  en: {
    siteTitle: 'KYRAXO',
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
      sortBy: 'Sort by',
      mostPlayed: 'Most Played',
      highestRated: 'Highest Rated',
      alphabeticalAZ: 'Alphabetical (A - Z)',
      alphabeticalZA: 'Reverse (Z - A)',
      newest: 'Newest Games',
      trending: 'Trending',
      letters: 'Filter by Letter',
      allLetters: 'All Letters',
      quickSuggestions: 'Instant Suggestions & Autocomplete',
      autoComplete: 'Fill Name',
      playDirectly: 'Play Now',
      pressEnterForResults: 'Press Enter for all results',
      clearFilters: 'Clear Filters',
    },
    ads: {
      advertisement: 'ADVERTISEMENT',
      sponsored: 'Sponsored Partner',
      devNotice: 'Ad Placeholder — Active in Production',
    },
    cookies: {
      title: 'Cookie & Privacy Preferences',
      message: 'KYRAXO uses cookies and browser storage to save your game progress, high scores, and personalize your experience.',
      acceptAll: 'Accept All',
      decline: 'Essential Only',
      learnMore: 'Cookie Policy',
    },
    footer: {
      description: 'KYRAXO is the premier instant gaming portal with 3,200+ curated HTML5 games playable without downloads on any desktop or mobile device.',
      quickLinks: 'Quick Links',
      categories: 'Top Categories',
      legal: 'Legal & Privacy',
      aboutUs: 'About Us',
      contactUs: 'Contact Support',
      privacyPolicy: 'Privacy Policy',
      termsOfService: 'Terms of Service',
      cookiePolicy: 'Cookie Policy',
      copyright: 'All rights reserved.',
      disclaimer: 'All game trademarks and copyrights belong to their respective original creators and studios.',
    },
    common: {
      loading: 'Loading...',
      close: 'Close',
      backToHome: 'Back to Home',
      shareSuccess: 'Link copied to clipboard!',
    },
  },

  // Arabic
  ar: {
    siteTitle: 'كايراكسو',
    siteTagline: 'أفضل ألعاب المتصفح المجانية بدون تحميل أونلاين',
    nav: {
      home: 'الرئيسية',
      allGames: 'جميع الألعاب',
      categories: 'التصنيفات',
      trending: 'الأكثر تداولاً',
      popular: 'الأكثر شعبية',
      favorites: 'المفضلة',
      search: 'ابحث عن لعبة...',
      about: 'عن كايراكسو',
      contact: 'اتصل بنا',
    },
    home: {
      heroTitle: 'ألعاب متصفح مجانية وفورية',
      heroSubtitle: 'بدون أي تحميل وبدون تثبيت. العب مئات ألعاب HTML5 المختارة بعناية مباشرة عبر متصفحك على الكمبيوتر والهاتف والجهاز اللوحي.',
      playNow: 'العب الآن',
      exploreCategories: 'استكشف التصنيفات',
      featuredGames: 'ألعاب مميزة',
      trendingGames: 'الأكثر تداولاً الآن',
      popularGames: 'الأعلى تقييماً',
      recentlyAdded: 'أحدث الإضافات',
      recommendedGames: 'ترشيحات مخصصة لك',
      allCategories: 'تصفح حسب التصنيف',
      viewAll: 'عرض الكل',
      noDownloads: 'لعب فوري',
      instantPlay: 'مجانية 100% للأبد',
      freeForever: 'متوافقة مع الموبايل والكمبيوتر',
      gamesAvailable: 'لعبة في المكتبة',
    },
    game: {
      playNow: 'العب اللعبة',
      loadingGame: 'جاري تهيئة محرك اللعبة...',
      fullscreen: 'شاشة كاملة',
      exitFullscreen: 'إنهاء الشاشة الكاملة',
      restart: 'إعادة البدء',
      share: 'مشاركة اللعبة',
      copied: 'تم نسخ الرابط إلى الحافظة!',
      addToFavorites: 'إضافة للمفضلة',
      removeFromFavorites: 'إزالة من المفضلة',
      rating: 'التقييم',
      votes: 'صوت',
      category: 'التصنيف',
      tags: 'الوسوم',
      description: 'نظرة عامة عن اللعبة',
      instructions: 'طريقة اللعب',
      controls: 'أزرار التحكم',
      desktopControls: 'لوحة المفاتيح والفأرة للكمبيوتر',
      mobileControls: 'التحكم باللمس للهواتف والأجهزة اللوحية',
      author: 'المطور / الاستوديو',
      license: 'الترخيص',
      releaseDate: 'تاريخ الإصدار',
      relatedGames: 'ألعاب مشابهة',
      recommendedForYou: 'ألعاب نالت إعجاب اللاعبين',
      errorLoading: 'تعذر تحميل ملفات اللعبة. يرجى التحقق من اتصالك بالإنترنت.',
      errorRetry: 'إعادة المحاولة',
    },
    category: {
      titlePrefix: 'ألعاب أونلاين',
      allCategoriesTitle: 'تصنيفات الألعاب',
      exploreDesc: 'استكشف أفضل ألعاب المتصفح مصنفة حسب النوع وأسلوب اللعب.',
      gamesCount: 'لعبة متاحة',
      noGamesFound: 'لا توجد ألعاب مضافة في هذا التصنيف حالياً. ترقبوا المزيد قريباً!',
      sortBy: 'ترتيب حسب',
      popularFirst: 'الأكثر شعبية',
      highestRated: 'الأعلى تقييماً',
      alphabetical: 'أبجدياً (أ - ي)',
    },
    search: {
      placeholder: 'ابحث باسم اللعبة، الوسم، أو التصنيف...',
      searchTitle: 'البحث عن الألعاب',
      resultsFor: 'نتائج البحث عن',
      noResults: 'لم يتم العثور على ألعاب تطابق',
      noResultsHint: 'جرب البحث بكلمات أخرى أو تصفح الأقسام الرئيسية في المنصة.',
      allCategories: 'جميع الأقسام',
      filterByCategory: 'تصفية حسب القسم',
      quickTags: 'عمليات بحث شائعة',
      sortBy: 'ترتيب حسب',
      mostPlayed: 'الأكثر لعباً',
      highestRated: 'الأعلى تقييماً',
      alphabeticalAZ: 'أبجدي (A - Z)',
      alphabeticalZA: 'عكسي (Z - A)',
      newest: 'أحدث الألعاب',
      trending: 'الأكثر رواجاً',
      letters: 'فلترة بالحروف',
      allLetters: 'كل الحروف',
      quickSuggestions: 'اقتراحات فورية وإكمال الاسم',
      autoComplete: 'إكمال الاسم',
      playDirectly: 'العب فوراً',
      pressEnterForResults: 'اضغط Enter لعرض كافة النتائج',
      clearFilters: 'مسح الفلاتر',
    },
    ads: {
      advertisement: 'إعلان ممول',
      sponsored: 'شريك إعلاني',
      devNotice: 'مساحة إعلانية — تعمل بكفاءة عند تفعيل الشبكة',
    },
    cookies: {
      title: 'سياسة ملفات تعريف الارتباط والخصوصية',
      message: 'يستخدم موقع كايراكسو ملفات تعريف الارتباط لحفظ تقدمك في الألعاب وعرض الإعلانات المناسبة.',
      acceptAll: 'موافق على الكل',
      decline: 'الضروري فقط',
      learnMore: 'سياسة الكوكيز',
    },
    footer: {
      description: 'كايراكسو (KYRAXO) هي منصتك الرائدة لألعاب المتصفح السريعة والمجانية بدون الحاجة لأي تحميل، متوافقة تماماً مع أجهزة الهاتف والحاسوب.',
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

  // French (Français)
  fr: {
    siteTitle: 'KYRAXO',
    siteTagline: 'Jouez aux Meilleurs Jeux Navigateur HTML5 Gratuits',
    nav: {
      home: 'Accueil',
      allGames: 'Tous les Jeux',
      categories: 'Catégories',
      trending: 'Tendances',
      popular: 'Populaires',
      favorites: 'Favoris',
      search: 'Rechercher un jeu...',
      about: 'À propos',
      contact: 'Contact',
    },
    home: {
      heroTitle: 'Jeux Gratuits en Ligne Immédiats',
      heroSubtitle: 'Sans téléchargement ni installation. Jouez à plus de 3 200 jeux HTML5 soigneusement sélectionnés sur PC, tablette et mobile.',
      playNow: 'Jouer Maintenant',
      exploreCategories: 'Explorer les Catégories',
      featuredGames: 'Jeux Vedettes',
      trendingGames: 'Tendances Actuelles',
      popularGames: 'Les Plus Populaires',
      recentlyAdded: 'Récemment Ajoutés',
      recommendedGames: 'Recommandés Pour Vous',
      allCategories: 'Parcourir par Catégorie',
      viewAll: 'Voir Tout',
      noDownloads: 'Jeu Instantané',
      instantPlay: '100% Gratuit à Vie',
      freeForever: 'Optimisé Mobile & PC',
      gamesAvailable: 'Jeux en Bibliothèque',
    },
    game: {
      playNow: 'Lancer le Jeu',
      loadingGame: 'Chargement du jeu en cours...',
      fullscreen: 'Plein Écran',
      exitFullscreen: 'Quitter Plein Écran',
      restart: 'Recommencer',
      share: 'Partager',
      copied: 'Lien copié dans le presse-papier !',
      addToFavorites: 'Ajouter aux Favoris',
      removeFromFavorites: 'Retirer des Favoris',
      rating: 'Note',
      votes: 'avis',
      category: 'Catégorie',
      tags: 'Mots-clés',
      description: 'Aperçu du Jeu',
      instructions: 'Comment Jouer',
      controls: 'Commandes de Jeu',
      desktopControls: 'Clavier et Souris sur PC',
      mobileControls: 'Contrôles Tactiles Mobile',
      author: 'Développeur / Studio',
      license: 'Licence',
      releaseDate: 'Date de sortie',
      relatedGames: 'Jeux Similaires',
      recommendedForYou: 'Recommandations pour Joueurs',
      errorLoading: 'Impossible de charger le jeu. Vérifiez votre connexion.',
      errorRetry: 'Réessayer',
    },
    category: {
      titlePrefix: 'Jeux en Ligne',
      allCategoriesTitle: 'Catégories de Jeux',
      exploreDesc: 'Découvrez les meilleurs jeux classés par genre et style de jeu.',
      gamesCount: 'jeux disponibles',
      noGamesFound: 'Aucun jeu dans cette catégorie pour le moment.',
      sortBy: 'Trier Par',
      popularFirst: 'Plus Populaires',
      highestRated: 'Mieux Notés',
      alphabetical: 'A à Z',
    },
    search: {
      placeholder: 'Chercher par titre, tag ou catégorie...',
      searchTitle: 'Rechercher des Jeux',
      resultsFor: 'Résultats pour',
      noResults: 'Aucun jeu ne correspond à',
      noResultsHint: 'Essayez avec d\'autres termes de recherche ou explorez les catégories.',
      allCategories: 'Toutes les Catégories',
      filterByCategory: 'Filtrer par Catégorie',
      quickTags: 'Recherches Fréquentes',
      sortBy: 'Trier par',
      mostPlayed: 'Les Plus Joués',
      highestRated: 'Mieux Notés',
      alphabeticalAZ: 'Alphabétique (A - Z)',
      alphabeticalZA: 'Inverse (Z - A)',
      newest: 'Nouveaux Jeux',
      trending: 'Tendances',
      letters: 'Filtrer par Lettre',
      allLetters: 'Toutes les Lettres',
      quickSuggestions: 'Suggestions & Autocomplétion',
      autoComplete: 'Compléter le Nom',
      playDirectly: 'Jouer Directement',
      pressEnterForResults: 'Appuyez sur Entrée pour tous les résultats',
      clearFilters: 'Effacer les Filtres',
    },
    ads: {
      advertisement: 'PUBLICITÉ',
      sponsored: 'Partenaire Sponsorisé',
      devNotice: 'Espace Publicitaire Actif',
    },
    cookies: {
      title: 'Cookies & Confidentialité',
      message: 'KYRAXO utilise des cookies pour sauvegarder votre progression et offrir la meilleure expérience de jeu.',
      acceptAll: 'Tout Accepter',
      decline: 'Essentiel Uniquement',
      learnMore: 'Politique de Cookies',
    },
    footer: {
      description: 'KYRAXO est le portail de jeux nouvelle génération avec plus de 3 200 jeux HTML5 instantanés sans téléchargement sur tous supports.',
      quickLinks: 'Liens Rapides',
      categories: 'Top Catégories',
      legal: 'Mentions Légales',
      aboutUs: 'À Propos de Nous',
      contactUs: 'Support Client',
      privacyPolicy: 'Confidentialité',
      termsOfService: 'Conditions d\'Utilisation',
      cookiePolicy: 'Politique de Cookies',
      copyright: 'Tous droits réservés.',
      disclaimer: 'Tous les droits d\'auteur des jeux appartiennent à leurs créateurs respectifs.',
    },
    common: {
      loading: 'Chargement...',
      close: 'Fermer',
      backToHome: 'Retour à l\'Accueil',
      shareSuccess: 'Lien copié avec succès !',
    },
  },

  // Spanish (Español)
  es: {
    siteTitle: 'KYRAXO',
    siteTagline: 'Los Mejores Juegos Gratis de Navegador HTML5',
    nav: {
      home: 'Inicio',
      allGames: 'Todos los Juegos',
      categories: 'Categorías',
      trending: 'Tendencias',
      popular: 'Populares',
      favorites: 'Favoritos',
      search: 'Buscar juegos...',
      about: 'Acerca de',
      contact: 'Contacto',
    },
    home: {
      heroTitle: 'Juegos Gratis de Navegador al Instante',
      heroSubtitle: 'Sin descargas ni instalaciones. Juega a más de 3200 juegos HTML5 seleccionados en PC, tablet y móvil.',
      playNow: 'Jugar Ahora',
      exploreCategories: 'Explorar Categorías',
      featuredGames: 'Juegos Destacados',
      trendingGames: 'Tendencias Ahora',
      popularGames: 'Más Populares',
      recentlyAdded: 'Recién Agregados',
      recommendedGames: 'Recomendados Para Ti',
      allCategories: 'Explorar por Categoría',
      viewAll: 'Ver Todo',
      noDownloads: 'Juego Instantáneo',
      instantPlay: '100% Gratis Siempre',
      freeForever: 'Compatible Móvil y PC',
      gamesAvailable: 'Juegos en Biblioteca',
    },
    game: {
      playNow: 'Jugar',
      loadingGame: 'Iniciando motor de juego...',
      fullscreen: 'Pantalla Completa',
      exitFullscreen: 'Salir de Pantalla Completa',
      restart: 'Reiniciar',
      share: 'Compartir Juego',
      copied: '¡Enlace copiado al portapapeles!',
      addToFavorites: 'Añadir a Favoritos',
      removeFromFavorites: 'Quitar de Favoritos',
      rating: 'Calificación',
      votes: 'votos',
      category: 'Categoría',
      tags: 'Etiquetas',
      description: 'Descripción del Juego',
      instructions: 'Cómo Jugar',
      controls: 'Controles y Teclas',
      desktopControls: 'Teclado y Ratón para PC',
      mobileControls: 'Controles Táctiles para Móvil',
      author: 'Desarrollador / Estudio',
      license: 'Licencia',
      releaseDate: 'Fecha de Lanzamiento',
      relatedGames: 'Juegos Similares',
      recommendedForYou: 'También Te Puede Gustar',
      errorLoading: 'No se pudo cargar el juego. Comprueba tu conexión.',
      errorRetry: 'Reintentar',
    },
    category: {
      titlePrefix: 'Juegos Online',
      allCategoriesTitle: 'Categorías de Juegos',
      exploreDesc: 'Descubre los mejores juegos clasificados por género y estilo.',
      gamesCount: 'juegos disponibles',
      noGamesFound: 'No hay juegos en esta categoría todavía.',
      sortBy: 'Ordenar Por',
      popularFirst: 'Más Populares',
      highestRated: 'Mejor Valorados',
      alphabetical: 'A a la Z',
    },
    search: {
      placeholder: 'Buscar por título, etiqueta o categoría...',
      searchTitle: 'Buscar Juegos',
      resultsFor: 'Resultados para',
      noResults: 'No se encontraron juegos para',
      noResultsHint: 'Prueba buscando con otras palabras o navega por las categorías.',
      allCategories: 'Todas las Categorías',
      filterByCategory: 'Filtrar por Categoría',
      quickTags: 'Búsquedas Populares',
      sortBy: 'Ordenar por',
      mostPlayed: 'Más Jugados',
      highestRated: 'Mejor Valorados',
      alphabeticalAZ: 'Alfabético (A - Z)',
      alphabeticalZA: 'Inverso (Z - A)',
      newest: 'Más Recientes',
      trending: 'Tendencias',
      letters: 'Filtrar por Letra',
      allLetters: 'Todas las Letras',
      quickSuggestions: 'Sugerencias y Autocompletar',
      autoComplete: 'Completar Nombre',
      playDirectly: 'Jugar Ahora',
      pressEnterForResults: 'Presiona Enter para ver todos los resultados',
      clearFilters: 'Limpiar Filtros',
    },
    ads: {
      advertisement: 'PUBLICIDAD',
      sponsored: 'Socio Patrocinado',
      devNotice: 'Espacio Publicitario Activo',
    },
    cookies: {
      title: 'Privacidad y Cookies',
      message: 'KYRAXO utiliza cookies para guardar tus puntuaciones y personalizar tu experiencia de juego.',
      acceptAll: 'Aceptar Todo',
      decline: 'Solo Esenciales',
      learnMore: 'Política de Cookies',
    },
    footer: {
      description: 'KYRAXO es el portal líder en juegos instantáneos HTML5 con más de 3200 títulos gratuitos sin descarga para cualquier dispositivo.',
      quickLinks: 'Enlaces Rápidos',
      categories: 'Principales Categorías',
      legal: 'Aviso Legal',
      aboutUs: 'Quiénes Somos',
      contactUs: 'Soporte',
      privacyPolicy: 'Política de Privacidad',
      termsOfService: 'Términos de Servicio',
      cookiePolicy: 'Política de Cookies',
      copyright: 'Todos los derechos reservados.',
      disclaimer: 'Todas las marcas comerciales y derechos pertenecen a sus respectivos creadores.',
    },
    common: {
      loading: 'Cargando...',
      close: 'Cerrar',
      backToHome: 'Volver al Inicio',
      shareSuccess: '¡Enlace copiado con éxito!',
    },
  },

  // German (Deutsch)
  de: {
    siteTitle: 'KYRAXO',
    siteTagline: 'Die besten kostenlosen HTML5-Browserspiele online',
    nav: {
      home: 'Startseite',
      allGames: 'Alle Spiele',
      categories: 'Kategorien',
      trending: 'Trends',
      popular: 'Beliebt',
      favorites: 'Favoriten',
      search: 'Spiel suchen...',
      about: 'Über uns',
      contact: 'Kontakt',
    },
    home: {
      heroTitle: 'Kostenlose Browserspiele Sofort Spielen',
      heroSubtitle: 'Ohne Download oder Installation. Spiele über 3.200 ausgewählte HTML5-Spiele direkt im Browser auf PC, Tablet und Handy.',
      playNow: 'Jetzt Spielen',
      exploreCategories: 'Kategorien Entdecken',
      featuredGames: 'Empfohlene Spiele',
      trendingGames: 'Aktuelle Trends',
      popularGames: 'Beliebteste Spiele',
      recentlyAdded: 'Neu Hinzugefügt',
      recommendedGames: 'Für Dich Empfohlen',
      allCategories: 'Nach Kategorie Durchsuchen',
      viewAll: 'Alle Anzeigen',
      noDownloads: 'Sofortspiel',
      instantPlay: '100% Kostenlos',
      freeForever: 'Mobil & Desktop Bereit',
      gamesAvailable: 'Spiele Verfügbar',
    },
    game: {
      playNow: 'Spiel Starten',
      loadingGame: 'Spiel-Engine wird initialisiert...',
      fullscreen: 'Vollbild',
      exitFullscreen: 'Vollbild Beenden',
      restart: 'Neustart',
      share: 'Spiel Teilen',
      copied: 'Link in Zwischenablage kopiert!',
      addToFavorites: 'Zu Favoriten Hinzufügen',
      removeFromFavorites: 'Aus Favoriten Entfernen',
      rating: 'Bewertung',
      votes: 'Stimmen',
      category: 'Kategorie',
      tags: 'Schlagwörter',
      description: 'Spielübersicht',
      instructions: 'Spielanleitung',
      controls: 'Steuerung & Tasten',
      desktopControls: 'Tastatur & Maus für PC',
      mobileControls: 'Touch-Steuerung für Mobilgeräte',
      author: 'Entwickler / Studio',
      license: 'Lizenz',
      releaseDate: 'Veröffentlichungsdatum',
      relatedGames: 'Ähnliche Spiele',
      recommendedForYou: 'Spieler Empfehlen Auch',
      errorLoading: 'Spiel konnte nicht geladen werden. Bitte Verbindung prüfen.',
      errorRetry: 'Erneut Versuchen',
    },
    category: {
      titlePrefix: 'Kostenlose Online',
      allCategoriesTitle: 'Spielkategorien',
      exploreDesc: 'Entdecke Top-Browserspiele sortiert nach Genre und Gameplay.',
      gamesCount: 'Spiele verfügbar',
      noGamesFound: 'Noch keine Spiele in dieser Kategorie vorhanden.',
      sortBy: 'Sortieren Nach',
      popularFirst: 'Beliebteste',
      highestRated: 'Bestbewertet',
      alphabetical: 'A bis Z',
    },
    search: {
      placeholder: 'Nach Titel, Tag oder Kategorie suchen...',
      searchTitle: 'Spiele Suchen',
      resultsFor: 'Suchergebnisse für',
      noResults: 'Keine Spiele gefunden für',
      noResultsHint: 'Versuche es mit anderen Begriffen oder durchstöbere unsere Kategorien.',
      allCategories: 'Alle Kategorien',
      filterByCategory: 'Nach Kategorie Filtern',
      quickTags: 'Beliebte Suchanfragen',
      sortBy: 'Sortieren nach',
      mostPlayed: 'Meistgespielt',
      highestRated: 'Bestbewertet',
      alphabeticalAZ: 'Alphabetisch (A - Z)',
      alphabeticalZA: 'Rückwärts (Z - A)',
      newest: 'Neueste Spiele',
      trending: 'Beliebt',
      letters: 'Nach Buchstaben filtern',
      allLetters: 'Alle Buchstaben',
      quickSuggestions: 'Vorschläge & Autovervollständigung',
      autoComplete: 'Namen ausfüllen',
      playDirectly: 'Jetzt spielen',
      pressEnterForResults: 'Drücken Sie Enter für alle Ergebnisse',
      clearFilters: 'Filter zurücksetzen',
    },
    ads: {
      advertisement: 'WERBUNG',
      sponsored: 'Gesponserter Partner',
      devNotice: 'Werbebereich Aktiv',
    },
    cookies: {
      title: 'Cookie- & Datenschutzeinstellungen',
      message: 'KYRAXO verwendet Cookies, um Spielstände zu speichern und die beste Performance zu bieten.',
      acceptAll: 'Alle Akzeptieren',
      decline: 'Nur Notwendige',
      learnMore: 'Cookie-Richtlinie',
    },
    footer: {
      description: 'KYRAXO ist das führende Instant-Gaming-Portal mit über 3.200 kuratierten HTML5-Spielen ohne Download auf jedem Gerät.',
      quickLinks: 'Direktlinks',
      categories: 'Top-Kategorien',
      legal: 'Rechtliches',
      aboutUs: 'Über Uns',
      contactUs: 'Kundendienst',
      privacyPolicy: 'Datenschutz',
      termsOfService: 'Nutzungsbedingungen',
      cookiePolicy: 'Cookie-Richtlinie',
      copyright: 'Alle Rechte vorbehalten.',
      disclaimer: 'Alle Spielmarken gehören ihren jeweiligen Schöpfern und Studios.',
    },
    common: {
      loading: 'Wird geladen...',
      close: 'Schließen',
      backToHome: 'Zurück zur Startseite',
      shareSuccess: 'Link erfolgreich kopiert!',
    },
  },

  // Portuguese (Português)
  pt: {
    siteTitle: 'KYRAXO',
    siteTagline: 'Jogue os Melhores Jogos de Navegador HTML5 Grátis',
    nav: {
      home: 'Início',
      allGames: 'Todos os Jogos',
      categories: 'Categorias',
      trending: 'Em Alta',
      popular: 'Populares',
      favorites: 'Favoritos',
      search: 'Buscar jogos...',
      about: 'Sobre',
      contact: 'Contato',
    },
    home: {
      heroTitle: 'Jogos de Navegador Grátis e Instantâneos',
      heroSubtitle: 'Sem downloads nem instalação. Jogue mais de 3.200 jogos HTML5 diretamente no seu navegador no PC, tablet e celular.',
      playNow: 'Jogar Agora',
      exploreCategories: 'Explorar Categorias',
      featuredGames: 'Jogos em Destaque',
      trendingGames: 'Em Alta Agora',
      popularGames: 'Mais Populares',
      recentlyAdded: 'Adicionados Recentemente',
      recommendedGames: 'Recomendados Para Você',
      allCategories: 'Navegar por Categoria',
      viewAll: 'Ver Tudo',
      noDownloads: 'Jogo Instantâneo',
      instantPlay: '100% Grátis Para Sempre',
      freeForever: 'Compatível com Celular e PC',
      gamesAvailable: 'Jogos na Biblioteca',
    },
    game: {
      playNow: 'Iniciar Jogo',
      loadingGame: 'Iniciando motor de jogo...',
      fullscreen: 'Tela Cheia',
      exitFullscreen: 'Sair de Tela Cheia',
      restart: 'Reiniciar',
      share: 'Compartilhar Jogo',
      copied: 'Link copiado para a área de transferência!',
      addToFavorites: 'Adicionar aos Favoritos',
      removeFromFavorites: 'Remover dos Favoritos',
      rating: 'Avaliação',
      votes: 'avaliações',
      category: 'Categoria',
      tags: 'Tags',
      description: 'Visão Geral do Jogo',
      instructions: 'Como Jogar',
      controls: 'Controles e Teclas',
      desktopControls: 'Teclado e Mouse para PC',
      mobileControls: 'Controles de Toque no Celular',
      author: 'Desenvolvedor / Estúdio',
      license: 'Licença',
      releaseDate: 'Data de Lançamento',
      relatedGames: 'Jogos Semelhantes',
      recommendedForYou: 'Jogadores Também Gostaram',
      errorLoading: 'Não foi possível carregar o jogo. Verifique sua conexão.',
      errorRetry: 'Tentar Novamente',
    },
    category: {
      titlePrefix: 'Jogos Online',
      allCategoriesTitle: 'Categorias de Jogos',
      exploreDesc: 'Descubra os melhores jogos agrupados por gênero e estilo.',
      gamesCount: 'jogos disponíveis',
      noGamesFound: 'Nenhum jogo nesta categoria ainda.',
      sortBy: 'Ordenar Por',
      popularFirst: 'Mais Populares',
      highestRated: 'Melhor Avaliados',
      alphabetical: 'A a Z',
    },
    search: {
      placeholder: 'Buscar por título, tag ou categoria...',
      searchTitle: 'Buscar Jogos',
      resultsFor: 'Resultados para',
      noResults: 'Nenhum jogo encontrado para',
      noResultsHint: 'Tente palavras-chave diferentes ou explore nossas categorias.',
      allCategories: 'Todas as Categorias',
      filterByCategory: 'Filtrar por Categoria',
      quickTags: 'Buscas Populares',
      sortBy: 'Ordenar por',
      mostPlayed: 'Mais Jogados',
      highestRated: 'Mais Bem Avaliados',
      alphabeticalAZ: 'Alfabético (A - Z)',
      alphabeticalZA: 'Inverso (Z - A)',
      newest: 'Mais Recentes',
      trending: 'Em Alta',
      letters: 'Filtrar por Letra',
      allLetters: 'Todas as Letras',
      quickSuggestions: 'Sugestões e Autocompletar',
      autoComplete: 'Preencher Nome',
      playDirectly: 'Jogar Agora',
      pressEnterForResults: 'Pressione Enter para ver todos os resultados',
      clearFilters: 'Limpar Filtros',
    },
    ads: {
      advertisement: 'PUBLICIDADE',
      sponsored: 'Parceiro Patrocinado',
      devNotice: 'Espaço Publicitário Ativo',
    },
    cookies: {
      title: 'Preferências de Privacidade e Cookies',
      message: 'KYRAXO utiliza cookies para salvar seu progresso e pontuações nos jogos.',
      acceptAll: 'Aceitar Todos',
      decline: 'Apenas Essenciais',
      learnMore: 'Política de Cookies',
    },
    footer: {
      description: 'KYRAXO é o principal portal de jogos instantâneos com mais de 3.200 jogos HTML5 para jogar sem download em qualquer dispositivo.',
      quickLinks: 'Links Rápidos',
      categories: 'Top Categorias',
      legal: 'Aviso Legal',
      aboutUs: 'Sobre Nós',
      contactUs: 'Suporte',
      privacyPolicy: 'Política de Privacidade',
      termsOfService: 'Termos de Serviço',
      cookiePolicy: 'Política de Cookies',
      copyright: 'Todos os direitos reservados.',
      disclaimer: 'Todas as marcas registradas pertencem aos seus respectivos proprietários.',
    },
    common: {
      loading: 'Carregando...',
      close: 'Fechar',
      backToHome: 'Voltar ao Início',
      shareSuccess: 'Link copiado com sucesso!',
    },
  },
};
