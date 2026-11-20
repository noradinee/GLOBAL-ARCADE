/**
 * enrich-all-games-seo.cjs
 *
 * Deterministic Lookalike SEO Enrichment for all 202 games in src/data/games.json.
 */

const fs = require('fs');
const path = require('path');

const gamesPath = path.resolve(__dirname, '../src/data/games.json');
const games = JSON.parse(fs.readFileSync(gamesPath, 'utf8'));

const BENCHMARKS = {
  ANGRY_BIRDS: {
    benchmarkGame: 'Angry Birds',
    benchmarkGameAr: 'أنجري بيردز (الطيور الغاضبة)',
    similarTo: ['Angry Birds Classic', 'Crush the Castle', 'Bad Piggies', 'Slingshot Smash'],
    keywords: [
      'angry birds online free',
      'games like angry birds',
      'play angry birds no download',
      'لعبة الطيور الغاضبة اون لاين مجانا',
      'بديل انجري بيردز بدون تثبيت',
      'angry birds unblocked web'
    ]
  },
  FRUIT_NINJA: {
    benchmarkGame: 'Fruit Ninja',
    benchmarkGameAr: 'فروت نينجا',
    similarTo: ['Fruit Ninja', 'Ninja Slice', 'Fruit Samurai', 'Cut the Rope'],
    keywords: [
      'games like fruit ninja',
      'fruit ninja online free',
      'play fruit ninja no download',
      'بديل فروت نينجا مجانا بالمتصفح',
      'تقطيع الفواكه بالسكين اون لاين',
      'fruit ninja unblocked'
    ]
  },
  SUBWAY_SURFERS: {
    benchmarkGame: 'Subway Surfers',
    benchmarkGameAr: 'صب واي سيرفرز',
    similarTo: ['Subway Surfers', 'Temple Run', 'Talking Tom Gold Run', 'Sonic Dash'],
    keywords: [
      'games like subway surfers',
      'subway surfers online free',
      'subway surfers unblocked',
      'بديل لعبة صب واي بدون تحميل',
      'العاب ركض ومطاردات سريعة',
      'temple run alternative online',
      'subway surfers web browser'
    ]
  },
  PACMAN: {
    benchmarkGame: 'Pac-Man',
    benchmarkGameAr: 'باك مان الكلاسيكية',
    similarTo: ['Pac-Man', 'Ms. Pac-Man', 'Pac-Man Championship', 'Bomberman'],
    keywords: [
      'games like pacman',
      'pacman free online',
      'لعبة باك مان الاصلية اون لاين',
      'باكمان مجانا بدون نت',
      'pacman unblocked google',
      'retro pacman html5'
    ]
  },
  SLITHER_IO: {
    benchmarkGame: 'Slither.io',
    benchmarkGameAr: 'سليذر آيو ولعبة الدودة',
    similarTo: ['Slither.io', 'Worms Zone', 'Classic Nokia Snake', 'Snake.io'],
    keywords: [
      'games like slither io',
      'slither io online unblocked',
      'لعبة الدودة اون لاين بدون تحميل',
      'لعبة الثعبان الكلاسيكية',
      'worms zone io web',
      'snake io browser'
    ]
  },
  CANDY_CRUSH: {
    benchmarkGame: 'Candy Crush & Bubble Shooter',
    benchmarkGameAr: 'كاندي كراش وقاذف الفقاعات',
    similarTo: ['Candy Crush Saga', 'Bubble Shooter', 'Bejeweled', 'Homescapes'],
    keywords: [
      'games like candy crush',
      'bubble shooter free online',
      'العاب تشبه كاندي كراش مجانا',
      'لعبة قاذف الفقاعات الاصلية',
      'candy crush online no download',
      'bubble pop unblocked'
    ]
  },
  MATH_2048: {
    benchmarkGame: '2048',
    benchmarkGameAr: 'لعبة 2048 الأصلية',
    similarTo: ['2048', 'Threes!', 'Drop The Number', '2248 Merge'],
    keywords: [
      '2048 game online',
      'games like 2048',
      'لعبة 2048 الاصلية بدون تحميل',
      'العاب ارقام ودمج ذكاء',
      '2048 unblocked free'
    ]
  },
  FLAPPY_BIRD: {
    benchmarkGame: 'Flappy Bird',
    benchmarkGameAr: 'فلابي بيرد الأصلية',
    similarTo: ['Flappy Bird', 'Ironpants', 'Floppy Bird', 'Flappy Dunk'],
    keywords: [
      'flappy bird online free',
      'games like flappy bird',
      'لعبة فلابي بيرد الاصلية بالمتصفح',
      'flappy bird unblocked google',
      'tap to fly games'
    ]
  },
  TETRIS: {
    benchmarkGame: 'Tetris & Block Blast',
    benchmarkGameAr: 'تتريس وبلوك بلاست',
    similarTo: ['Tetris', 'Block Blast', '1010! Block Puzzle', 'Woodoku'],
    keywords: [
      'games like tetris',
      'tetris online free',
      'block blast online free',
      'بديل لعبة تتريس وبلوك بلاست',
      'العاب ذكاء وتركيب كتل مجانية',
      'tetris unblocked at school'
    ]
  },
  RACING: {
    benchmarkGame: 'Traffic Rider & Need for Speed',
    benchmarkGameAr: 'ترافيك رايدر ونيد فور سبيد',
    similarTo: ['Traffic Rider', 'Need for Speed', 'Asphalt 9', 'OutRun', 'Traffic Racer'],
    keywords: [
      'car racing games online free',
      'games like traffic rider',
      'العاب سيارات ودريفت اون لاين مجانا',
      'سباق سيارات بدون تحميل',
      'unblocked car games at school'
    ]
  },
  STICKMAN: {
    benchmarkGame: 'Stickman Hook & Stick War',
    benchmarkGameAr: 'ستيكمان هوك وستيك وار',
    similarTo: ['Stickman Hook', 'Stick War: Legacy', 'Anger of Stick', 'Stickman Party'],
    keywords: [
      'stickman games online',
      'games like stickman hook',
      'العاب ستيكمان الرجل العصوي',
      'ستيكمان هوك مجانا بالمتصفح',
      'stickman unblocked games'
    ]
  },
  SPORTS: {
    benchmarkGame: 'FIFA Penalty & Score! Hero',
    benchmarkGameAr: 'ضربات جزاء فيفا وسكور هيرو',
    similarTo: ['FIFA Mobile', 'Score! Hero', 'Football Strike', 'Head Soccer'],
    keywords: [
      'penalty shootout games online',
      'games like score hero',
      'العاب ضربات جزاء كرة قدم اون لاين',
      'لعبة كورة قدم مجانا بدون تثبيت',
      'soccer games unblocked'
    ]
  },
  GEOMETRY_DASH: {
    benchmarkGame: 'Geometry Dash',
    benchmarkGameAr: 'جيومتري داش',
    similarTo: ['Geometry Dash Lite', 'The Impossible Game', 'Geometry Dash SubZero'],
    keywords: [
      'geometry dash online free',
      'games like geometry dash',
      'لعبة جيومتري داش اون لاين',
      'geometry dash unblocked web',
      'one button rhythm jump'
    ]
  },
  BREAKOUT: {
    benchmarkGame: 'Atari Breakout & Arkanoid',
    benchmarkGameAr: 'أتاري بريك أوت وأركانويد',
    similarTo: ['Atari Breakout', 'Arkanoid', 'Bricks Ball Crusher', 'DX-Ball'],
    keywords: [
      'atari breakout online free',
      'games like breakout',
      'لعبة تكسير الطوب بالكرة الكلاسيكية',
      'atari breakout unblocked',
      'retro brick paddle games'
    ]
  },
  SPACE_INVADERS: {
    benchmarkGame: 'Space Invaders & Galaga',
    benchmarkGameAr: 'غزو الفضاء وغالاغا (Space Invaders)',
    similarTo: ['Space Invaders', 'Galaga', 'Asteroids', '1942'],
    keywords: [
      'space invaders free online',
      'games like galaga',
      'لعبة غزو الفضاء القديمة مجانا',
      'space invaders unblocked google',
      'retro space shooter web'
    ]
  },
  WATER_SORT: {
    benchmarkGame: 'Water Sort Puzzle',
    benchmarkGameAr: 'ووتر سورت (فرز الماء الملون)',
    similarTo: ['Water Sort Puzzle', 'Ball Sort Color', 'Liquid Sort', 'Get Color'],
    keywords: [
      'water sort puzzle online free',
      'games like water sort',
      'لعبة فرز الماء الملون اون لاين',
      'water sort puzzle unblocked',
      'relaxing color tube puzzle'
    ]
  },
  SUIKA: {
    benchmarkGame: 'Suika Game (Watermelon Game)',
    benchmarkGameAr: 'لعبة البطيخ سويكا (Suika Game)',
    similarTo: ['Suika Game', 'Watermelon Drop', '2048 Watermelon'],
    keywords: [
      'suika game online free',
      'watermelon game browser',
      'لعبة البطيخ الاصلية اون لاين',
      'suika unblocked no lag',
      'merge fruit puzzle web'
    ]
  },
  VAMPIRE: {
    benchmarkGame: 'Vampire Survivors & Brotato',
    benchmarkGameAr: 'فامباير سيرفايفرز وبروتاتو',
    similarTo: ['Vampire Survivors', 'Brotato', 'Survivor.io', '20 Minutes Till Dawn'],
    keywords: [
      'games like vampire survivors',
      'vampire survivors free online',
      'بديل فامباير سيرفايفرز بالمتصفح',
      'survivor io unblocked',
      'auto shooting survival web'
    ]
  },
  TWO_PLAYER: {
    benchmarkGame: 'Fireboy & Watergirl & 2 Player Games',
    benchmarkGameAr: 'ألعاب شخصين (Fireboy & Watergirl)',
    similarTo: ['Fireboy and Watergirl', '2 Player Games Challenge', 'Wii Party', 'Ludo King'],
    keywords: [
      '2 player games unblocked',
      'games like fireboy and watergirl',
      'العاب شخصين على نفس الجهاز بدون نت',
      'العاب ثنائية وتحديات اون لاين',
      'local multiplayer web games'
    ]
  },
  KIDS: {
    benchmarkGame: 'Toca Life & ABCya Kids Learning',
    benchmarkGameAr: 'ألعاب توكا بوكا وبراعم التعليمية',
    similarTo: ['Toca Life World', 'ABCya Games', 'Coloring Club', 'Duolingo Kids'],
    keywords: [
      'educational games for kids free',
      'coloring games online for toddlers',
      'العاب اطفال تعليمية مجانا بدون تحميل',
      'تلوين وتعليم الحروف والارقام للصغار',
      'safe games for kids no ads'
    ]
  },
  DINO: {
    benchmarkGame: 'Chrome Dino Runner',
    benchmarkGameAr: 'ديناصور جوجل كروم (Dino T-Rex)',
    similarTo: ['Chrome Dino Run', 'T-Rex Runner', 'Flappy Bird'],
    keywords: [
      'chrome dino game online',
      'play dinosaur game with internet',
      'لعبة ديناصور جوجل كروم اون لاين',
      'dino unblocked full screen'
    ]
  },
  GENERIC: {
    benchmarkGame: 'Classic Web Arcade Games',
    benchmarkGameAr: 'ألعاب المتصفح والأركيد الكلاسيكية',
    similarTo: ['CrazyGames Classics', 'Poki Arcade', 'Y8 Classic Games'],
    keywords: [
      'free html5 games no download',
      'best browser arcade games',
      'العاب مجانية اون لاين بدون تحميل',
      'العاب خفيفة وسريعة للموبايل والكمبيوتر',
      'unblocked games premium'
    ]
  }
};

function resolveBenchmark(g) {
  const s = (g.slug || '').toLowerCase();
  const t = (g.title || '').toLowerCase();
  const cat = (g.category || '').toLowerCase();

  // 1. Angry birds specific
  if (s.includes('angry') || t.includes('angry') || s.includes('slingshot')) {
    return BENCHMARKS.ANGRY_BIRDS;
  }
  // 2. Fruit ninja specific
  if (s.includes('fruit') || s.includes('slice') || s.includes('blade') || t.includes('fruit')) {
    return BENCHMARKS.FRUIT_NINJA;
  }
  // 3. Dino
  if (s.includes('dino') || s.includes('t-rex')) {
    return BENCHMARKS.DINO;
  }
  // 4. Suika
  if (s.includes('suika') || s.includes('watermelon')) {
    return BENCHMARKS.SUIKA;
  }
  // 5. Water sort
  if (s.includes('water-sort') || s.includes('liquid') || s.includes('sort-puzzle')) {
    return BENCHMARKS.WATER_SORT;
  }
  // 6. Vampire
  if (s.includes('vampire') || s.includes('survivor') || s.includes('horde')) {
    return BENCHMARKS.VAMPIRE;
  }
  // 7. Flappy
  if (s.includes('flappy') || s.includes('floppy') || s.includes('tap-the-frog')) {
    return BENCHMARKS.FLAPPY_BIRD;
  }
  // 8. Pacman
  if (s.includes('pac') || t.includes('pac-man') || t.includes('pacman') || s.includes('maze')) {
    return BENCHMARKS.PACMAN;
  }
  // 9. Snake
  if (s.includes('snake') || s.includes('slither') || s.includes('worm')) {
    return BENCHMARKS.SLITHER_IO;
  }
  // 10. Stickman
  if (s.includes('stickman') || s.includes('stick-') || s.includes('archer') || s.includes('sniper')) {
    return BENCHMARKS.STICKMAN;
  }
  // 11. Geometry
  if (s.includes('geometry') || s.includes('gravity') || s.includes('jumpman') || s.includes('jump')) {
    return BENCHMARKS.GEOMETRY_DASH;
  }
  // 12. Breakout
  if (s.includes('breakout') || s.includes('breaker') || s.includes('arkanoid') || s.includes('brickout')) {
    return BENCHMARKS.BREAKOUT;
  }
  // 13. Space
  if (s.includes('space') || s.includes('invader') || s.includes('asteroid') || s.includes('astro') || s.includes('alien') || s.includes('orbit-defender')) {
    return BENCHMARKS.SPACE_INVADERS;
  }
  // 14. 2048
  if (s.includes('2048') || s.includes('number') || s.includes('math')) {
    return BENCHMARKS.MATH_2048;
  }
  // 15. Tetris
  if (s.includes('tetris') || s.includes('tetrix') || s.includes('block') || s.includes('hexa') || s.includes('jewel')) {
    return BENCHMARKS.TETRIS;
  }
  // 16. Match-3 / Candy
  if (s.includes('candy') || s.includes('bubble') || s.includes('pop') || s.includes('bobble') || s.includes('sweet')) {
    return BENCHMARKS.CANDY_CRUSH;
  }
  // 17. Racing
  if (s.includes('race') || s.includes('racer') || s.includes('car') || s.includes('drift') || s.includes('speed') || s.includes('driver') || s.includes('drive') || s.includes('traffic') || s.includes('parking') || cat === 'racing') {
    return BENCHMARKS.RACING;
  }
  // 18. Sports
  if (s.includes('penalty') || s.includes('kick') || s.includes('soccer') || s.includes('football') || s.includes('tennis') || s.includes('basketball') || s.includes('hockey') || cat === 'sports') {
    return BENCHMARKS.SPORTS;
  }
  // 19. Runners
  if (s.includes('runner') || s.includes('subway') || s.includes('metro') || s.includes('dash') || s.includes('sprint') || s.includes('lane') || s.includes('run')) {
    return BENCHMARKS.SUBWAY_SURFERS;
  }
  // 20. 2-Player
  if (cat === 'two-player' || s.includes('two-player') || s.includes('2-player') || s.includes('duel') || s.includes('clash') || s.includes('pong') || s.includes('tank') || s.includes('ludo') || s.includes('chess') || s.includes('checkers')) {
    return BENCHMARKS.TWO_PLAYER;
  }
  // 21. Kids
  if (cat === 'kids' || s.includes('kids') || s.includes('alphabet') || s.includes('tracing') || s.includes('counting') || s.includes('coloring') || s.includes('toddler') || s.includes('baby') || s.includes('draw')) {
    return BENCHMARKS.KIDS;
  }

  return BENCHMARKS.GENERIC;
}

const cleanedTagStoppers = [
  'tetris & block blast',
  'flappy bird',
  'no download',
  'unblocked',
  'html5 game',
  'free online'
];

games.forEach(game => {
  // Clean previously appended test tags
  if (game.tags && Array.isArray(game.tags)) {
    game.tags = game.tags.filter(t => !cleanedTagStoppers.includes(t.toLowerCase()));
  }

  const b = resolveBenchmark(game);

  game.benchmarkGame = b.benchmarkGame;
  game.benchmarkGameAr = b.benchmarkGameAr;
  game.similarTo = b.similarTo;
  game.searchKeywords = b.keywords;

  const extraTags = [
    b.benchmarkGame.toLowerCase(),
    'no download',
    'unblocked',
    'html5 game',
    'free online'
  ];
  game.tags = Array.from(new Set([...(game.tags || []), ...extraTags]));
});

fs.writeFileSync(gamesPath, JSON.stringify(games, null, 2), 'utf8');
console.log(`✅ Deterministically enriched all ${games.length} games with precision benchmark SEO!`);
