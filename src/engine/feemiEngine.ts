import {
  AppSubGenre,
  CharacterBlueprint,
  FeemiDesignSpec,
  GameSubGenre,
  ImagePixelAnalysis,
  InputSourceMode,
  ProjectCategory,
  SubGenre,
} from '../types/project';

const ARABIC_TO_LATIN_MAP: Record<string, string> = {
  أ: 'a',
  إ: 'e',
  آ: 'a',
  ا: 'a',
  ب: 'b',
  ت: 't',
  ث: 'th',
  ج: 'j',
  ح: 'h',
  خ: 'kh',
  د: 'd',
  ذ: 'dh',
  ر: 'r',
  ز: 'z',
  س: 's',
  ش: 'sh',
  ص: 's',
  ض: 'd',
  ط: 't',
  ظ: 'z',
  ع: 'a',
  غ: 'gh',
  ف: 'f',
  ق: 'q',
  ك: 'k',
  ل: 'l',
  م: 'm',
  ن: 'n',
  ه: 'h',
  ة: 'a',
  و: 'w',
  ي: 'y',
  ى: 'a',
  ئ: 'y',
  ؤ: 'w',
};

export function transliterateToEnglishSlug(input: string): string {
  const cleaned = input.trim().toLowerCase();
  let result = '';
  for (const ch of cleaned) {
    if (/[a-z0-9]/.test(ch)) {
      result += ch;
    } else if (ARABIC_TO_LATIN_MAP[ch]) {
      result += ARABIC_TO_LATIN_MAP[ch];
    } else if (/[\s_-]/.test(ch)) {
      result += '-';
    }
  }
  const normalized = result.replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 28);
  return normalized || 'targem-project';
}

export function slugToPackageSegment(slug: string): string {
  const seg = slug.replace(/[^a-z0-9]/g, '').slice(0, 18);
  if (!seg || /^[0-9]/.test(seg)) {
    return `app${seg || 'targem'}`;
  }
  return seg;
}

export function detectGenreFromPrompt(prompt: string): {
  category: ProjectCategory;
  subGenre: SubGenre;
  defaultTitleAr: string;
} {
  const p = prompt.toLowerCase();
  const hasExplicitGameSignal =
    /لعبة|ألعاب|game|3d|ثلاثي الأبعاد|منصات|قفز|جري|باركور|فضاء|مجرة|ليزر|قتال|مغامر|توم|فارس|نينجا|tom|platformer|shooter|parkour/.test(
      p
    );

  // Standard App detection (strictly no 3D/physics unless explicitly requested as a game)
  if (
    !hasExplicitGameSignal &&
    /تطبيق|برنامج|متجر|تسوق|منتج|سلة|بيع|شراء|مهام|مفكرة|جدول|تنظيم|تذكير|محاسبة|مصاريف|ميزانية|مالية|فواتير|رصيد|بنك|حجز|عيادة|مطعم|قائمة|store|shop|ecommerce|commerce|cart|todo|task|planner|notes|checklist|finance|budget|ledger|expense|wallet|app|utility|dashboard/.test(
      p
    )
  ) {
    if (/متجر|تسوق|منتج|سلة|بيع|شراء|store|shop|ecommerce|commerce|cart/.test(p)) {
      return {
        category: 'app',
        subGenre: 'storefront' as AppSubGenre,
        defaultTitleAr: 'متجر السحابة الذكي',
      };
    }
    if (/محاسبة|مصاريف|ميزانية|مالية|فواتير|رصيد|بنك|finance|budget|ledger|expense|wallet/.test(p)) {
      return {
        category: 'app',
        subGenre: 'finance_ledger' as AppSubGenre,
        defaultTitleAr: 'المحفظة والميزانية',
      };
    }
    return {
      category: 'app',
      subGenre: 'task_manager' as AppSubGenre,
      defaultTitleAr: 'منظم المهام الاحترافي',
    };
  }

  // 3D Character / Hero / Tom prompts always activate interactive 3D Character & Game World
  if (
    /شخصية|توم|قط|بطل|فارس|محارب|روبوت|سايبر|3d|ثلاثي الأبعاد|tom|cat|hero|knight|character|robot/.test(
      p
    )
  ) {
    const isTom = /توم|قط|tom|cat/.test(p);
    const isJump = /منصات|قفز|جري|platform|jump|parkour/.test(p);
    return {
      category: 'game',
      subGenre: (isJump || isTom ? 'platformer' : 'space_shooter') as GameSubGenre,
      defaultTitleAr: isTom ? 'شخصية توم ثلاثية الأبعاد' : 'بطل الألعاب ثلاثي الأبعاد',
    };
  }

  // App detection fallback
  if (
    /متجر|تسوق|منتج|سلة|بيع|شراء|store|shop|ecommerce|commerce|cart/.test(p)
  ) {
    return {
      category: 'app',
      subGenre: 'storefront' as AppSubGenre,
      defaultTitleAr: 'متجر السحابة الذكي',
    };
  }
  if (
    /مهام|مفكرة|جدول|تنظيم|تذكير|todo|task|planner|notes|checklist/.test(p)
  ) {
    return {
      category: 'app',
      subGenre: 'task_manager' as AppSubGenre,
      defaultTitleAr: 'منظم المهام الاحترافي',
    };
  }
  if (
    /محاسبة|مصاريف|ميزانية|مالية|فواتير|رصيد|بنك|finance|budget|ledger|expense|wallet/.test(
      p
    )
  ) {
    return {
      category: 'app',
      subGenre: 'finance_ledger' as AppSubGenre,
      defaultTitleAr: 'المحفظة والميزانية',
    };
  }

  // Game detection
  if (
    /منصات|قفز|جري|عقبات|نينجا|ماريو|platform|jump|mario|ninja|parkour/.test(p)
  ) {
    return {
      category: 'game',
      subGenre: 'platformer' as GameSubGenre,
      defaultTitleAr: 'مغامرة القفز السريع',
    };
  }
  if (
    /عملات|جمع|تجميع|كنز|ذهب|ركض|سباق|coin|runner|collect|treasure|race/.test(p)
  ) {
    return {
      category: 'game',
      subGenre: 'coin_runner' as GameSubGenre,
      defaultTitleAr: 'سباق صيد العملات',
    };
  }
  if (
    /ألغاز|ذكاء|ذاكرة|توصيل|مربعات|puzzle|memory|match|grid|logic/.test(p)
  ) {
    return {
      category: 'game',
      subGenre: 'puzzle_grid' as GameSubGenre,
      defaultTitleAr: 'تحدي الألغاز الهندسي',
    };
  }
  if (
    /تطبيق|برنامج|app|utility|dashboard/.test(p) &&
    !/لعبة|game|shooter|فضاء|سفينة|وحوش/.test(p)
  ) {
    return {
      category: 'app',
      subGenre: 'task_manager' as AppSubGenre,
      defaultTitleAr: 'تطبيق الإنتاجية الذكي',
    };
  }

  // Default game: space shooter
  return {
    category: 'game',
    subGenre: 'space_shooter' as GameSubGenre,
    defaultTitleAr: 'حارس المجرة المطور',
  };
}

function extractExplicitName(prompt: string, fallback: string): string {
  const quoteMatch = prompt.match(/["«]([^"»]{2,36})["»]/);
  if (quoteMatch) return quoteMatch[1].trim();
  const namedMatch = prompt.match(/(?:اسمها|اسمه|بعنوان|تسمى)\s+([^\n.,،]{2,32})/);
  if (namedMatch) return namedMatch[1].trim();
  const cleaned = prompt.trim().split(/[\n.,،]/)[0]?.trim() || '';
  if (cleaned.length >= 3 && cleaned.length <= 28) {
    return cleaned;
  }
  return fallback;
}

function detectPaletteFromPrompt(
  prompt: string,
  imageMetrics?: ImagePixelAnalysis | null
): { primary: string; accent: string; bg: string } {
  if (imageMetrics) {
    return {
      primary: imageMetrics.dominantColor,
      accent: imageMetrics.accentColor,
      bg: imageMetrics.brightness > 150 ? '#111827' : imageMetrics.backgroundColor,
    };
  }
  const p = prompt.toLowerCase();
  if (/أزرق|بحر|ماء|سماء|blue|ocean|cyber/.test(p)) {
    return { primary: '#38bdf8', accent: '#6366f1', bg: '#09111f' };
  }
  if (/أحمر|نار|بركان|قتال|red|fire|lava/.test(p)) {
    return { primary: '#f43f5e', accent: '#fb923c', bg: '#160b12' };
  }
  if (/ذهبي|صحراء|كنز|ذهب|gold|desert|sun/.test(p)) {
    return { primary: '#f59e0b', accent: '#10b981', bg: '#14110b' };
  }
  if (/بنفسجي|سحر|خيال|purple|magic|galaxy/.test(p)) {
    return { primary: '#a855f7', accent: '#22d3ee', bg: '#110b1f' };
  }
  return { primary: '#10b981', accent: '#38bdf8', bg: '#0b1220' };
}

export function detectCharacterBlueprint(
  prompt: string,
  primaryColor: string,
  accentColor: string,
  subGenre?: SubGenre
): CharacterBlueprint {
  const p = prompt.toLowerCase();

  // 1. Tom / Cat character
  if (/توم|قط|هر|tom|cat|kitty/.test(p)) {
    return {
      archetype: 'cat_tom',
      displayNameAr: 'شخصية توم (القط الذكي ثلاثي الأبعاد)',
      englishCharacterId: 'tom-cat-hero',
      skinOrFurColor: '#5c7499',
      secondaryFurOrAccent: '#f8fafc',
      outfitColor: primaryColor && primaryColor !== '#10b981' ? primaryColor : '#2563eb',
      outfitSecondaryColor: '#fbbf24',
      eyeColor: '#22c55e',
      hairOrHelmetColor: '#475569',
      shoeColor: '#f1f5f9',
      hasTail: true,
      hasEars: 'cat',
      hasCapeOrPack: 'none',
      scaleY: 1,
      headScale: 1.08,
    };
  }

  // 2. Knight / Armored Hero
  if (/فارس|محارب|درع|سيف|قلعة|knight|warrior|paladin|king/.test(p)) {
    return {
      archetype: 'knight_hero',
      displayNameAr: 'فارس المعركة المدرع 3D',
      englishCharacterId: 'armored-knight-hero',
      skinOrFurColor: '#f1c2a0',
      secondaryFurOrAccent: '#cbd5e1',
      outfitColor: primaryColor || '#1e40af',
      outfitSecondaryColor: '#f59e0b',
      eyeColor: '#38bdf8',
      hairOrHelmetColor: '#94a3b8',
      shoeColor: '#334155',
      hasTail: false,
      hasEars: 'helmet',
      hasCapeOrPack: 'cape',
      scaleY: 1.04,
      headScale: 1,
    };
  }

  // 3. Robot / Cyber Hero
  if (/روبوت|آلي|سايبر|ميكانيكي|robot|cyber|mech|android/.test(p)) {
    return {
      archetype: 'cyber_bot',
      displayNameAr: 'البطل الآلي المتطور 3D',
      englishCharacterId: 'cyber-guardian-bot',
      skinOrFurColor: '#cbd5e1',
      secondaryFurOrAccent: '#38bdf8',
      outfitColor: primaryColor || '#0f172a',
      outfitSecondaryColor: accentColor || '#22d3ee',
      eyeColor: '#22d3ee',
      hairOrHelmetColor: '#334155',
      shoeColor: '#1e293b',
      hasTail: false,
      hasEars: 'visor',
      hasCapeOrPack: 'jetpack',
      scaleY: 1.02,
      headScale: 1,
    };
  }

  // 4. Ninja / Agile Jumper
  if (/نينجا|ظل|خفي|باركور|قفز|منصات|ninja|parkour|shadow|platform/.test(p)) {
    return {
      archetype: 'ninja_runner',
      displayNameAr: 'بطل النينجا السريع 3D',
      englishCharacterId: 'shadow-ninja-hero',
      skinOrFurColor: '#eab692',
      secondaryFurOrAccent: primaryColor || '#10b981',
      outfitColor: '#1e293b',
      outfitSecondaryColor: primaryColor || '#ef4444',
      eyeColor: '#0f172a',
      hairOrHelmetColor: '#0f172a',
      shoeColor: '#0f172a',
      hasTail: false,
      hasEars: 'human',
      hasCapeOrPack: 'cape',
      scaleY: 1,
      headScale: 1,
    };
  }

  // 5. Space Ranger / Galaxy Guardian
  if (
    subGenre === 'space_shooter' ||
    /فضاء|مجرة|كوكب|رائد|حارس|ليزر|space|galaxy|astronaut|ranger/.test(p)
  ) {
    return {
      archetype: 'space_ranger',
      displayNameAr: 'حارس المجرة ثلاثي الأبعاد',
      englishCharacterId: 'galaxy-space-ranger',
      skinOrFurColor: '#f2c6a5',
      secondaryFurOrAccent: '#e2e8f0',
      outfitColor: primaryColor || '#10b981',
      outfitSecondaryColor: accentColor || '#38bdf8',
      eyeColor: '#2563eb',
      hairOrHelmetColor: '#e2e8f0',
      shoeColor: '#1e293b',
      hasTail: false,
      hasEars: 'visor',
      hasCapeOrPack: 'jetpack',
      scaleY: 1.02,
      headScale: 1,
    };
  }

  // 6. Default Adventurer Hero (detailed stylized human hero)
  return {
    id: 'char-hero-1',
    role: 'hero',
    archetype: 'adventurer_hero',
    displayNameAr: 'بطل المغامرات ثلاثي الأبعاد',
    englishCharacterId: 'adventurer-3d-hero',
    skinOrFurColor: '#f1c19e',
    secondaryFurOrAccent: '#fde68a',
    outfitColor: primaryColor || '#10b981',
    outfitSecondaryColor: accentColor || '#38bdf8',
    eyeColor: '#1d4ed8',
    hairOrHelmetColor: '#3b2416',
    shoeColor: '#7c2d12',
    hasTail: false,
    hasEars: 'human',
    hasCapeOrPack: 'none',
    scaleY: 1,
    headScale: 1,
  };
}

const ARCHETYPE_PRESETS: Array<{
  regex: RegExp;
  archetype: CharacterBlueprint['archetype'];
  label: string;
}> = [
  { regex: /توم|قط|هر|tom|cat|kitty/, archetype: 'cat_tom', label: 'توم (القط الذكي)' },
  { regex: /فارس|محارب|درع|سيف|قلعة|knight|warrior|paladin|king/, archetype: 'knight_hero', label: 'الفارس المدرع' },
  { regex: /روبوت|آلي|سايبر|ميكانيكي|robot|cyber|mech|android/, archetype: 'cyber_bot', label: 'البطل الآلي' },
  { regex: /نينجا|ظل|خفي|باركور|ninja|parkour|shadow/, archetype: 'ninja_runner', label: 'بطل النينجا' },
  { regex: /فضاء|مجرة|رائد|حارس|space|galaxy|astronaut|ranger/, archetype: 'space_ranger', label: 'حارس المجرة' },
];

/**
 * Builds a customized 3D character blueprint for any requested character name or archetype.
 */
export function createCustomCharacterBlueprint(
  nameOrPrompt: string,
  primaryColor: string,
  accentColor: string,
  archetypeOverride?: CharacterBlueprint['archetype'],
  index = 0,
  role: 'hero' | 'companion' | 'rival' = index === 0 ? 'hero' : 'companion'
): CharacterBlueprint {
  const cleanName = nameOrPrompt.trim();
  const base = detectCharacterBlueprint(cleanName, primaryColor, accentColor);

  const overrideMap: Record<CharacterBlueprint['archetype'], Partial<CharacterBlueprint>> = {
    cat_tom: {
      archetype: 'cat_tom',
      skinOrFurColor: '#5c7499',
      secondaryFurOrAccent: '#f8fafc',
      outfitColor: primaryColor || '#2563eb',
      outfitSecondaryColor: '#fbbf24',
      eyeColor: '#22c55e',
      hairOrHelmetColor: '#475569',
      shoeColor: '#f1f5f9',
      hasTail: true,
      hasEars: 'cat',
      hasCapeOrPack: 'none',
      headScale: 1.08,
    },
    knight_hero: {
      archetype: 'knight_hero',
      skinOrFurColor: '#f1c2a0',
      secondaryFurOrAccent: '#cbd5e1',
      outfitColor: primaryColor || '#1e40af',
      outfitSecondaryColor: '#f59e0b',
      eyeColor: '#38bdf8',
      hairOrHelmetColor: '#94a3b8',
      shoeColor: '#334155',
      hasTail: false,
      hasEars: 'helmet',
      hasCapeOrPack: 'cape',
      scaleY: 1.04,
      headScale: 1,
    },
    cyber_bot: {
      archetype: 'cyber_bot',
      skinOrFurColor: '#cbd5e1',
      secondaryFurOrAccent: '#38bdf8',
      outfitColor: primaryColor || '#0f172a',
      outfitSecondaryColor: accentColor || '#22d3ee',
      eyeColor: '#22d3ee',
      hairOrHelmetColor: '#334155',
      shoeColor: '#1e293b',
      hasTail: false,
      hasEars: 'visor',
      hasCapeOrPack: 'jetpack',
      scaleY: 1.02,
      headScale: 1,
    },
    ninja_runner: {
      archetype: 'ninja_runner',
      skinOrFurColor: '#eab692',
      secondaryFurOrAccent: primaryColor || '#10b981',
      outfitColor: '#1e293b',
      outfitSecondaryColor: primaryColor || '#ef4444',
      eyeColor: '#0f172a',
      hairOrHelmetColor: '#0f172a',
      shoeColor: '#0f172a',
      hasTail: false,
      hasEars: 'human',
      hasCapeOrPack: 'cape',
      scaleY: 1,
      headScale: 1,
    },
    space_ranger: {
      archetype: 'space_ranger',
      skinOrFurColor: '#f2c6a5',
      secondaryFurOrAccent: '#e2e8f0',
      outfitColor: primaryColor || '#10b981',
      outfitSecondaryColor: accentColor || '#38bdf8',
      eyeColor: '#2563eb',
      hairOrHelmetColor: '#e2e8f0',
      shoeColor: '#1e293b',
      hasTail: false,
      hasEars: 'visor',
      hasCapeOrPack: 'jetpack',
      scaleY: 1.02,
      headScale: 1,
    },
    adventurer_hero: {
      archetype: 'adventurer_hero',
      skinOrFurColor: '#f1c19e',
      secondaryFurOrAccent: '#fde68a',
      outfitColor: primaryColor || '#10b981',
      outfitSecondaryColor: accentColor || '#38bdf8',
      eyeColor: '#1d4ed8',
      hairOrHelmetColor: '#3b2416',
      shoeColor: '#7c2d12',
      hasTail: false,
      hasEars: 'human',
      hasCapeOrPack: 'none',
      scaleY: 1,
      headScale: 1,
    },
  };

  const chosen = archetypeOverride ? { ...base, ...overrideMap[archetypeOverride] } : base;
  const isJerryOrMouse = /جيري|فأر|jerry|mouse/.test(cleanName.toLowerCase());
  const resolvedSkin = isJerryOrMouse ? '#b47441' : chosen.skinOrFurColor;
  const resolvedSecondary = isJerryOrMouse ? '#fde68a' : chosen.secondaryFurOrAccent;
  const resolvedEars = isJerryOrMouse ? 'cat' : chosen.hasEars;
  const resolvedTail = isJerryOrMouse ? true : chosen.hasTail;
  const resolvedScaleY = isJerryOrMouse ? 0.84 : chosen.scaleY;

  const slug = transliterateToEnglishSlug(cleanName || chosen.displayNameAr);
  return {
    ...chosen,
    id: `char-${index + 1}-${slug.slice(0, 12)}`,
    role,
    displayNameAr: cleanName || chosen.displayNameAr,
    englishCharacterId: slug || chosen.englishCharacterId,
    skinOrFurColor: resolvedSkin,
    secondaryFurOrAccent: resolvedSecondary,
    hasEars: resolvedEars,
    hasTail: resolvedTail,
    scaleY: resolvedScaleY,
    outfitColor:
      index > 0 && primaryColor === '#10b981'
        ? ['#2563eb', '#f59e0b', '#a855f7', '#f43f5e'][index % 4]
        : chosen.outfitColor,
  };
}

/**
 * Detects one or multiple requested characters from a game prompt so multiple 3D characters
 * can share and interact inside the same game world.
 */
export function detectCharacterRoster(
  prompt: string,
  primaryColor: string,
  accentColor: string,
  subGenre?: SubGenre
): CharacterBlueprint[] {
  const p = prompt.toLowerCase();
  const roster: CharacterBlueprint[] = [];
  const seen = new Set<string>();

  for (const preset of ARCHETYPE_PRESETS) {
    if (preset.regex.test(p) && !seen.has(preset.archetype)) {
      seen.add(preset.archetype);
      const idx = roster.length;
      const custom = createCustomCharacterBlueprint(
        preset.label,
        idx === 0 ? primaryColor : ['#f59e0b', '#a855f7', '#ef4444'][idx % 3],
        accentColor,
        preset.archetype,
        idx,
        idx === 0 ? 'hero' : 'companion'
      );
      if (preset.archetype === 'cat_tom') {
        custom.displayNameAr = 'شخصية توم (القط الذكي ثلاثي الأبعاد)';
      }
      roster.push(custom);
    }
  }

  // Special companion check for Jerry / second named pet character
  if (/جيري|فأر|jerry|mouse/.test(p)) {
    roster.push(
      createCustomCharacterBlueprint(
        'شخصية جيري',
        '#f59e0b',
        accentColor,
        'cat_tom',
        roster.length,
        roster.length === 0 ? 'hero' : 'companion'
      )
    );
  }

  // Fallback to single detected character if none of the multi-match presets fired
  if (roster.length === 0) {
    const single = detectCharacterBlueprint(prompt, primaryColor, accentColor, subGenre);
    roster.push({ ...single, id: 'char-1-hero', role: 'hero' });
  }

  return roster.slice(0, 4);
}

/**
 * Stage 1: Feemi Smart Engine (100% deterministic logic, ZERO AI).
 * - Games: builds 3D articulated Character Roster + Physics + Gravity + Game Runtime.
 * - Standard Apps: builds professional interactive App UI (buttons, menus, tabs, lists) WITHOUT physics or 3D.
 */
export function analyzePromptToSpec(
  prompt: string,
  inputSource: InputSourceMode = 'text',
  imageMetrics?: ImagePixelAnalysis | null
): FeemiDesignSpec {
  const { category, subGenre, defaultTitleAr } = detectGenreFromPrompt(prompt);
  const appName = extractExplicitName(prompt, defaultTitleAr);
  const englishSlug = transliterateToEnglishSlug(appName);
  const pkgSegment = slugToPackageSegment(englishSlug);
  const palette = detectPaletteFromPrompt(prompt, imageMetrics);

  const p = prompt.toLowerCase();
  const isFast = /سريع|سرعة|fast|turbo|speed/.test(p);
  const isHard = /صعب|تحدي|hard|extreme/.test(p);

  if (category === 'app') {
    return {
      appName,
      englishSlug,
      packageName: `com.codetargem.${pkgSegment}`,
      category: 'app',
      subGenre,
      primaryColor: palette.primary,
      accentColor: palette.accent,
      bgColor: palette.bg,
      playerSpeed: 0,
      gravity: 0,
      difficulty: 'medium',
      soundEnabled: false,
      securityShieldLevel: 'strict',
      versionName: '1.0.0',
      versionCode: 1,
      sourcePrompt: prompt,
      inputSource,
      customPatches: [],
      characterBlueprint: undefined,
      characterRoster: undefined,
      activeCharacterId: undefined,
    };
  }

  const characterRoster = detectCharacterRoster(
    prompt,
    palette.primary,
    palette.accent,
    subGenre
  );
  const primaryCharacter = characterRoster[0];

  return {
    appName,
    englishSlug,
    packageName: `com.codetargem.${pkgSegment}`,
    category: 'game',
    subGenre,
    primaryColor: palette.primary,
    accentColor: palette.accent,
    bgColor: palette.bg,
    playerSpeed: isFast ? 380 : 290,
    gravity: subGenre === 'platformer' ? 1280 : 980,
    difficulty: isHard ? 'hard' : 'medium',
    soundEnabled: true,
    securityShieldLevel: 'strict',
    versionName: '1.0.0',
    versionCode: 1,
    sourcePrompt: prompt,
    inputSource,
    customPatches: [],
    characterBlueprint: primaryCharacter,
    characterRoster,
    activeCharacterId: primaryCharacter?.id,
  };
}

/**
 * Generates procedural SVG app icon without external images or AI.
 */
export function generateProceduralSvgIcon(spec: FeemiDesignSpec): string {
  const { primaryColor, accentColor, bgColor, subGenre } = spec;
  let glyph = '';
  if (subGenre === 'space_shooter') {
    glyph = `<polygon points="64,22 92,88 64,74 36,88" fill="${primaryColor}" stroke="#ffffff" stroke-width="3" stroke-linejoin="round"/>
      <circle cx="64" cy="54" r="9" fill="${accentColor}"/>
      <rect x="60" y="92" width="8" height="16" rx="4" fill="${accentColor}"/>`;
  } else if (subGenre === 'platformer') {
    glyph = `<rect x="24" y="84" width="80" height="14" rx="5" fill="${accentColor}"/>
      <rect x="46" y="42" width="36" height="36" rx="10" fill="${primaryColor}" stroke="#ffffff" stroke-width="3"/>
      <circle cx="57" cy="57" r="4" fill="#ffffff"/>
      <circle cx="71" cy="57" r="4" fill="#ffffff"/>`;
  } else if (subGenre === 'coin_runner') {
    glyph = `<circle cx="64" cy="64" r="34" fill="${primaryColor}" stroke="#ffffff" stroke-width="4"/>
      <circle cx="64" cy="64" r="22" fill="none" stroke="${accentColor}" stroke-width="3" stroke-dasharray="6 4"/>
      <polygon points="64,42 70,58 86,58 73,68 78,84 64,74 50,84 55,68 42,58 58,58" fill="#ffffff"/>`;
  } else if (subGenre === 'puzzle_grid') {
    glyph = `<rect x="28" y="28" width="32" height="32" rx="7" fill="${primaryColor}"/>
      <rect x="68" y="28" width="32" height="32" rx="7" fill="${accentColor}"/>
      <rect x="28" y="68" width="32" height="32" rx="7" fill="${accentColor}" opacity="0.75"/>
      <rect x="68" y="68" width="32" height="32" rx="7" fill="#ffffff"/>`;
  } else if (subGenre === 'storefront') {
    glyph = `<path d="M36 46 H92 L86 98 H42 Z" fill="${primaryColor}" stroke="#ffffff" stroke-width="3" stroke-linejoin="round"/>
      <path d="M48 46 V38 C48 29 55 24 64 24 C73 24 80 29 80 38 V46" fill="none" stroke="${accentColor}" stroke-width="5" stroke-linecap="round"/>`;
  } else if (subGenre === 'finance_ledger') {
    glyph = `<rect x="26" y="34" width="76" height="60" rx="12" fill="${primaryColor}" stroke="#ffffff" stroke-width="3"/>
      <polyline points="38,76 54,58 68,66 88,44" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="88" cy="44" r="5" fill="${accentColor}"/>`;
  } else {
    glyph = `<rect x="28" y="28" width="72" height="72" rx="16" fill="${primaryColor}" stroke="#ffffff" stroke-width="3"/>
      <polyline points="44,64 58,78 84,48" fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="100%" height="100%">
  <defs>
    <linearGradient id="ctBgGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bgColor}"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="28" fill="url(#ctBgGrad)"/>
  <rect x="4" y="4" width="120" height="120" rx="24" fill="none" stroke="${primaryColor}" stroke-opacity="0.35" stroke-width="2"/>
  ${glyph}
</svg>`;
}

/**
 * Generates a procedural SVG visual sprite/architecture blueprint for Stage 1 inspection.
 */
export function generateProceduralSpriteSvg(spec: FeemiDesignSpec): string {
  const { primaryColor, accentColor, bgColor, category } = spec;
  if (category === 'app') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 140" width="100%" height="100%">
  <rect width="360" height="140" rx="12" fill="${bgColor}"/>
  <rect x="16" y="16" width="328" height="24" rx="6" fill="#1e293b"/>
  <circle cx="32" cy="28" r="5" fill="${primaryColor}"/>
  <rect x="46" y="24" width="90" height="8" rx="4" fill="#cbd5e1"/>
  <rect x="16" y="52" width="100" height="72" rx="8" fill="${primaryColor}" fill-opacity="0.18" stroke="${primaryColor}"/>
  <rect x="130" y="52" width="100" height="72" rx="8" fill="${accentColor}" fill-opacity="0.18" stroke="${accentColor}"/>
  <rect x="244" y="52" width="100" height="72" rx="8" fill="#1e293b" stroke="#334155"/>
  <rect x="28" y="68" width="54" height="8" rx="4" fill="${primaryColor}"/>
  <rect x="142" y="68" width="54" height="8" rx="4" fill="${accentColor}"/>
  <rect x="256" y="68" width="60" height="8" rx="4" fill="#94a3b8"/>
</svg>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 140" width="100%" height="100%">
  <rect width="360" height="140" rx="12" fill="${bgColor}"/>
  <g transform="translate(24,20)">
    <rect width="90" height="100" rx="10" fill="#162032" stroke="#28354d"/>
    <polygon points="45,22 68,72 45,60 22,72" fill="${primaryColor}" stroke="#ffffff" stroke-width="2"/>
    <circle cx="45" cy="48" r="6" fill="${accentColor}"/>
  </g>
  <g transform="translate(135,20)">
    <rect width="90" height="100" rx="10" fill="#162032" stroke="#28354d"/>
    <polygon points="45,24 68,46 45,74 22,46" fill="#f43f5e" stroke="#fecdd3" stroke-width="2"/>
    <circle cx="45" cy="46" r="7" fill="#0f172a"/>
  </g>
  <g transform="translate(246,20)">
    <rect width="90" height="100" rx="10" fill="#162032" stroke="#28354d"/>
    <circle cx="45" cy="48" r="18" fill="${accentColor}" stroke="#ffffff" stroke-width="2"/>
    <circle cx="45" cy="48" r="8" fill="#ffffff"/>
  </g>
</svg>`;
}

/**
 * Cleans and hardens generated or manually edited code deterministically without AI.
 */
export function sanitizeAndCleanCode(rawCode: string): {
  cleanCode: string;
  issuesFixed: string[];
} {
  const issuesFixed: string[] = [];
  let code = rawCode.replace(/\r\n/g, '\n');

  if (/\beval\s*\(/.test(code)) {
    code = code.replace(/\beval\s*\(/g, '/* blocked_eval */ (');
    issuesFixed.push('Blocked unsafe eval() invocation');
  }
  if (/new\s+Function\s*\(/.test(code)) {
    code = code.replace(/new\s+Function\s*\(/g, '/* blocked_Function */ void(');
    issuesFixed.push('Blocked dynamic Function() constructor');
  }
  if (/document\.write\s*\(/.test(code)) {
    code = code.replace(/document\.write\s*\(/g, 'console.warn(');
    issuesFixed.push('Replaced unsafe document.write() call');
  }
  if (/<script[^>]+src=["']http:\/\//i.test(code)) {
    code = code.replace(/src=["']http:\/\//gi, 'src="https://');
    issuesFixed.push('Upgraded insecure http:// script transport to https://');
  }

  // Trim trailing whitespace per line
  code = code
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .trimEnd() + '\n';

  return { cleanCode: code, issuesFixed };
}

function buildSecurityUtilitySnippet(level: 'standard' | 'strict'): string {
  return `  const SECURITY_POLICY = Object.freeze({
    level: "${level}",
    xssEscape: true,
    clampInputs: true
  });

  function escapeHtmlSafe(raw) {
    return String(raw).replace(/[&<>"']/g, function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
    });
  }`;
}

function generateGameHtmlCode(spec: FeemiDesignSpec): string {
  const patchComment =
    spec.customPatches.length > 0
      ? `  // Feemi Custom Patches: ${spec.customPatches.join(' | ')}`
      : `  // Feemi Procedural Engine Output - Zero-Error Standard English Runtime`;

  const modeComment = spec.subGenre;
  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' data: blob:;" />
  <title>${spec.englishSlug}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: ${spec.bgColor}; color: #f8fafc; font-family: system-ui, -apple-system, sans-serif; }
    #game-shell { position: relative; width: 100%; height: 100%; }
    canvas { display: block; width: 100%; height: 100%; touch-action: none; }
    .hud-layer { position: fixed; inset: 0; pointer-events: none; display: flex; flex-direction: column; justify-content: space-between; padding: 14px; }
    .hud-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
    .hud-cluster { display: flex; gap: 14px; align-items: center; background: rgba(11, 15, 23, 0.78); border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; padding: 8px 14px; }
    .hud-metric { display: flex; flex-direction: column; }
    .hud-kicker { font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: #94a3b8; }
    .hud-val { font-size: 20px; font-weight: 700; font-variant-numeric: tabular-nums; color: #ffffff; }
    .hud-actions { display: flex; gap: 8px; pointer-events: auto; }
    .icon-btn { width: 38px; height: 38px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.16); background: rgba(15, 23, 42, 0.85); color: #f8fafc; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
    .icon-btn:hover { border-color: ${spec.primaryColor}; }
    .overlay-screen { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(8, 12, 20, 0.84); pointer-events: auto; padding: 20px; }
    .overlay-card { width: 100%; max-width: 400px; background: #111827; border: 1px solid rgba(255,255,255,0.14); border-radius: 16px; padding: 24px; text-align: center; }
    .overlay-title { font-size: 26px; font-weight: 800; margin-bottom: 8px; color: #ffffff; }
    .overlay-sub { font-size: 13px; color: #94a3b8; margin-bottom: 18px; }
    .primary-btn { width: 100%; padding: 12px 18px; border: none; border-radius: 10px; background: ${spec.primaryColor}; color: #06120e; font-weight: 800; font-size: 15px; cursor: pointer; }
    .secondary-btn { width: 100%; margin-top: 8px; padding: 10px 16px; border: 1px solid rgba(255,255,255,0.15); border-radius: 10px; background: transparent; color: #e2e8f0; font-weight: 600; cursor: pointer; }
    .touch-pad { display: none; justify-content: space-between; align-items: flex-end; pointer-events: none; padding-bottom: 6px; }
    .touch-group { display: flex; gap: 8px; pointer-events: auto; }
    .touch-btn { width: 52px; height: 52px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.2); background: rgba(15, 23, 42, 0.72); color: #fff; font-weight: 700; font-size: 16px; }
    @media (pointer: coarse), (max-width: 720px) { .touch-pad { display: flex; } }
    .hidden { display: none !important; }
  </style>
</head>
<body data-state="title">
  <div id="game-shell">
    <canvas id="stage-canvas"></canvas>

    <div id="hud-layer" class="hud-layer hidden">
      <div class="hud-top">
        <div class="hud-cluster">
          <div class="hud-metric">
            <span class="hud-kicker">SCORE</span>
            <span id="hud-score" class="hud-val">0</span>
          </div>
          <div class="hud-metric">
            <span class="hud-kicker">HP</span>
            <span id="hud-hp" class="hud-val">100</span>
          </div>
          <div class="hud-metric">
            <span class="hud-kicker">LEVEL</span>
            <span id="hud-wave" class="hud-val">1</span>
          </div>
        </div>
        <div class="hud-actions">
          <button id="btn-mute" class="icon-btn" type="button" title="Mute [M]">M</button>
          <button id="btn-pause" class="icon-btn" type="button" title="Pause [P]">II</button>
          <button id="btn-restart-hud" class="icon-btn" type="button" title="Restart [R]">R</button>
        </div>
      </div>

      <div class="touch-pad">
        <div class="touch-group">
          <button id="touch-left" class="touch-btn" type="button">&lt;</button>
          <button id="touch-right" class="touch-btn" type="button">&gt;</button>
        </div>
        <div class="touch-group">
          <button id="touch-action" class="touch-btn" type="button">ACT</button>
        </div>
      </div>
    </div>

    <div id="screen-title" class="overlay-screen">
      <div class="overlay-card">
        <div style="margin: 0 auto 14px; width: 68px; height: 68px;">
          <svg viewBox="0 0 64 64" width="68" height="68">
            <rect width="64" height="64" rx="16" fill="${spec.bgColor}" stroke="${spec.primaryColor}" stroke-width="2"/>
            <polygon points="32,12 48,46 32,38 16,46" fill="${spec.primaryColor}"/>
            <circle cx="32" cy="30" r="5" fill="${spec.accentColor}"/>
          </svg>
        </div>
        <h1 class="overlay-title">${spec.englishSlug}</h1>
        <p class="overlay-sub">Mode: ${modeComment} · Arrow Keys / WASD / Space · Esc Pause</p>
        <button id="btn-start" data-start="true" class="primary-btn" type="button">START GAME</button>
      </div>
    </div>

    <div id="screen-pause" class="overlay-screen hidden">
      <div class="overlay-card">
        <h2 class="overlay-title">PAUSED</h2>
        <p class="overlay-sub">Simulation suspended safely</p>
        <button id="btn-resume" class="primary-btn" type="button">RESUME</button>
        <button id="btn-restart-pause" class="secondary-btn" type="button">RESTART</button>
      </div>
    </div>

    <div id="screen-gameover" class="overlay-screen hidden">
      <div class="overlay-card">
        <h2 id="end-title" class="overlay-title">MISSION COMPLETE</h2>
        <p id="end-summary" class="overlay-sub">Score: 0</p>
        <button id="btn-play-again" data-start="true" class="primary-btn" type="button">PLAY AGAIN</button>
      </div>
    </div>
  </div>

  <script>
  (function () {
    "use strict";
${patchComment}
${buildSecurityUtilitySnippet(spec.securityShieldLevel)}

    const GAME_CONFIG = Object.freeze({
      packageName: "${spec.packageName}",
      versionName: "${spec.versionName}",
      versionCode: ${spec.versionCode},
      mode: "${spec.subGenre}",
      primaryColor: "${spec.primaryColor}",
      accentColor: "${spec.accentColor}",
      bgColor: "${spec.bgColor}",
      playerSpeed: ${spec.playerSpeed},
      gravity: ${spec.gravity},
      difficultyMultiplier: ${spec.difficulty === 'hard' ? 1.35 : spec.difficulty === 'easy' ? 0.8 : 1.0},
      soundEnabled: ${spec.soundEnabled},
      characters: ${JSON.stringify(
        (spec.characterRoster && spec.characterRoster.length > 0
          ? spec.characterRoster
          : spec.characterBlueprint
          ? [spec.characterBlueprint]
          : []
        ).map((c) => ({
          id: c.englishCharacterId,
          archetype: c.archetype,
          skin: c.skinOrFurColor,
          outfit: c.outfitColor,
          hair: c.hairOrHelmetColor,
          catEars: c.hasEars === 'cat',
        }))
      )}
    });

    const canvas = document.getElementById("stage-canvas");
    const ctx = canvas.getContext("2d");
    const hudLayer = document.getElementById("hud-layer");
    const screenTitle = document.getElementById("screen-title");
    const screenPause = document.getElementById("screen-pause");
    const screenGameOver = document.getElementById("screen-gameover");
    const hudScore = document.getElementById("hud-score");
    const hudHp = document.getElementById("hud-hp");
    const hudWave = document.getElementById("hud-wave");
    const endTitle = document.getElementById("end-title");
    const endSummary = document.getElementById("end-summary");

    let width = 800;
    let height = 500;
    let state = "title";
    let muted = !GAME_CONFIG.soundEnabled;
    let score = 0;
    let bestScore = 0;
    let hp = 100;
    let wave = 1;
    let elapsed = 0;
    let hitstopTimer = 0;
    let shakeTrauma = 0;
    let shootCooldown = 0;
    let spawnTimer = 0.6;
    let audioCtx = null;

    const keys = new Set();
    const touchState = { left: false, right: false, action: false };

    const player = { x: 400, y: 400, vx: 0, vy: 0, w: 36, h: 36, grounded: false, jumpsLeft: 2, flash: 0 };
    const bullets = [];
    const entities = [];
    const stars = Array.from({ length: 48 }, (_, idx) => ({
      x: (idx * 97) % 1200,
      y: (idx * 61) % 800,
      r: (idx % 3) + 1,
      s: 22 + (idx % 5) * 14
    }));

    // Zero-GC fixed particle pool
    const PARTICLE_POOL_SIZE = 90;
    const particles = Array.from({ length: PARTICLE_POOL_SIZE }, () => ({
      active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0.4, color: "#fff", size: 3
    }));
    let particleCursor = 0;

    function spawnParticles(x, y, color, count) {
      for (let i = 0; i < count; i++) {
        const p = particles[particleCursor];
        particleCursor = (particleCursor + 1) % PARTICLE_POOL_SIZE;
        const ang = (Math.PI * 2 * i) / count + Math.random() * 0.4;
        const spd = 70 + Math.random() * 140;
        p.active = true;
        p.x = x;
        p.y = y;
        p.vx = Math.cos(ang) * spd;
        p.vy = Math.sin(ang) * spd;
        p.life = 0.35 + Math.random() * 0.2;
        p.maxLife = p.life;
        p.color = color;
        p.size = 2.5 + Math.random() * 2.5;
      }
    }

    function playTone(freq, duration, type) {
      if (muted) return;
      try {
        if (!audioCtx) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return;
          audioCtx = new AC();
        }
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type || "triangle";
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
      } catch (_) {}
    }

    function resizeCanvas() {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(320, Math.floor(rect.width));
      height = Math.max(240, Math.floor(rect.height));
      canvas.width = width;
      canvas.height = height;
      if (state === "title") {
        player.x = width * 0.5;
        player.y = GAME_CONFIG.mode === "platformer" ? height - 90 : height - 76;
      }
    }

    function setScreenState(nextState) {
      state = nextState;
      document.body.dataset.state = nextState;
      hudLayer.classList.toggle("hidden", nextState !== "playing");
      screenTitle.classList.toggle("hidden", nextState !== "title");
      screenPause.classList.toggle("hidden", nextState !== "paused");
      screenGameOver.classList.toggle("hidden", nextState !== "gameover");
      if (nextState === "playing") {
        keys.clear();
        if (document.activeElement && document.activeElement.blur) {
          document.activeElement.blur();
        }
      }
    }

    function resetRun() {
      score = 0;
      hp = 100;
      wave = 1;
      elapsed = 0;
      hitstopTimer = 0;
      shakeTrauma = 0;
      shootCooldown = 0;
      spawnTimer = 0.5;
      bullets.length = 0;
      entities.length = 0;
      player.x = width * 0.5;
      player.y = GAME_CONFIG.mode === "platformer" ? height - 90 : height - 76;
      player.vx = 0;
      player.vy = 0;
      player.grounded = true;
      player.jumpsLeft = 2;
      player.flash = 0;
      updateHud();
    }

    function startGame() {
      resetRun();
      setScreenState("playing");
      playTone(520, 0.12, "sine");
    }

    function updateHud() {
      hudScore.textContent = String(Math.round(score));
      hudHp.textContent = String(Math.max(0, Math.round(hp)));
      hudWave.textContent = String(wave);
    }

    function triggerAction() {
      if (state !== "playing") return;
      if (GAME_CONFIG.mode === "platformer") {
        if (player.jumpsLeft > 0) {
          player.vy = -520;
          player.grounded = false;
          player.jumpsLeft -= 1;
          spawnParticles(player.x, player.y + 18, GAME_CONFIG.accentColor, 6);
          playTone(390, 0.1, "triangle");
        }
      } else if (shootCooldown <= 0) {
        bullets.push({ x: player.x, y: player.y - 22, vx: 0, vy: -580, r: 5 });
        shootCooldown = 0.16;
        playTone(680, 0.06, "square");
      }
    }

    function spawnWaveEntity() {
      const x = 36 + Math.random() * Math.max(40, width - 72);
      const kindRoll = Math.random();
      if (GAME_CONFIG.mode === "coin_runner" || GAME_CONFIG.mode === "puzzle_grid") {
        const isHazard = kindRoll < 0.34;
        entities.push({
          kind: isHazard ? "hazard" : "coin",
          x,
          y: -24,
          vx: (Math.random() - 0.5) * 60,
          vy: (155 + wave * 22) * GAME_CONFIG.difficultyMultiplier,
          r: isHazard ? 18 : 15,
          hp: 1
        });
      } else if (GAME_CONFIG.mode === "platformer") {
        const fromRight = Math.random() > 0.5;
        entities.push({
          kind: kindRoll < 0.35 ? "coin" : "chaser",
          x: fromRight ? width + 24 : -24,
          y: height - 64 - (kindRoll < 0.35 ? 60 : 0),
          vx: (fromRight ? -1 : 1) * (150 + wave * 18) * GAME_CONFIG.difficultyMultiplier,
          vy: 0,
          r: 17,
          hp: 1
        });
      } else {
        // Space shooter with 3 distinct enemy policies (chaser, kiter, charger)
        const archetype = kindRoll < 0.4 ? "chaser" : kindRoll < 0.75 ? "kiter" : "charger";
        entities.push({
          kind: archetype,
          x,
          y: -24,
          vx: archetype === "kiter" ? (Math.random() > 0.5 ? 110 : -110) : 0,
          vy: (archetype === "charger" ? 210 : 120 + wave * 14) * GAME_CONFIG.difficultyMultiplier,
          r: archetype === "charger" ? 20 : 16,
          hp: archetype === "charger" ? 2 : 1,
          phase: Math.random() * 6
        });
      }
    }

    function stepSimulation(dt) {
      if (hitstopTimer > 0) {
        hitstopTimer = Math.max(0, hitstopTimer - dt);
        return;
      }
      elapsed += dt;
      wave = 1 + Math.floor(elapsed / 15);
      if (shootCooldown > 0) shootCooldown -= dt;
      if (player.flash > 0) player.flash -= dt;
      shakeTrauma = Math.max(0, shakeTrauma - dt * 1.8);

      const moveLeft = keys.has("ArrowLeft") || keys.has("KeyA") || touchState.left;
      const moveRight = keys.has("ArrowRight") || keys.has("KeyD") || touchState.right;
      const moveUp = keys.has("ArrowUp") || keys.has("KeyW");
      const moveDown = keys.has("ArrowDown") || keys.has("KeyS");

      const dirX = (moveRight ? 1 : 0) - (moveLeft ? 1 : 0);
      player.x += dirX * GAME_CONFIG.playerSpeed * dt;

      if (GAME_CONFIG.mode === "platformer") {
        player.vy += GAME_CONFIG.gravity * dt;
        player.y += player.vy * dt;
        const floorY = height - 66;
        if (player.y >= floorY) {
          player.y = floorY;
          player.vy = 0;
          player.grounded = true;
          player.jumpsLeft = 2;
        }
      } else {
        const dirY = (moveDown ? 1 : 0) - (moveUp ? 1 : 0);
        player.y += dirY * GAME_CONFIG.playerSpeed * 0.85 * dt;
        player.y = Math.max(40, Math.min(height - 46, player.y));
        if (keys.has("Space") || touchState.action) {
          triggerAction();
        }
      }
      player.x = Math.max(24, Math.min(width - 24, player.x));

      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnWaveEntity();
        spawnTimer = Math.max(0.28, 0.95 - wave * 0.06);
      }

      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.y < -20) bullets.splice(i, 1);
      }

      for (let i = entities.length - 1; i >= 0; i--) {
        const e = entities[i];
        if (e.kind === "kiter") {
          e.phase += dt * 3;
          e.x += Math.sin(e.phase) * 120 * dt;
        } else if (e.kind === "chaser" && GAME_CONFIG.mode !== "platformer") {
          const dx = player.x - e.x;
          e.x += Math.sign(dx) * 75 * dt;
        }
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.x = Math.max(20, Math.min(width - 20, e.x));

        // Bullet hits
        let destroyed = false;
        for (let j = bullets.length - 1; j >= 0; j--) {
          const b = bullets[j];
          const dist = Math.hypot(b.x - e.x, b.y - e.y);
          if (dist < e.r + b.r) {
            bullets.splice(j, 1);
            e.hp -= 1;
            if (e.hp <= 0) {
              score += 25;
              hitstopTimer = 0.03;
              spawnParticles(e.x, e.y, GAME_CONFIG.primaryColor, 14);
              playTone(220, 0.1, "sawtooth");
              entities.splice(i, 1);
              destroyed = true;
              break;
            }
          }
        }
        if (destroyed) continue;

        // Player collision
        const pDist = Math.hypot(player.x - e.x, player.y - e.y);
        if (pDist < e.r + 18) {
          if (e.kind === "coin") {
            score += 30;
            spawnParticles(e.x, e.y, "#facc15", 10);
            playTone(780, 0.08, "sine");
          } else {
            hp -= 20;
            player.flash = 0.18;
            hitstopTimer = 0.05;
            shakeTrauma = 0.5;
            spawnParticles(player.x, player.y, "#f43f5e", 16);
            playTone(130, 0.16, "sawtooth");
          }
          entities.splice(i, 1);
          if (hp <= 0) {
            bestScore = Math.max(bestScore, score);
            endTitle.textContent = score >= 300 ? "GREAT RUN!" : "GAME OVER";
            endSummary.textContent = "Score: " + Math.round(score) + " · Best: " + Math.round(bestScore);
            setScreenState("gameover");
            return;
          }
          continue;
        }

        if (e.y > height + 40 || e.x < -60 || e.x > width + 60) {
          entities.splice(i, 1);
        }
      }

      if (GAME_CONFIG.mode === "platformer" || GAME_CONFIG.mode === "coin_runner") {
        score += dt * 10;
      }
      updateHud();
    }

    function renderFrame(dt) {
      ctx.save();
      if (shakeTrauma > 0) {
        const mag = shakeTrauma * shakeTrauma * 10;
        ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
      }
      ctx.fillStyle = GAME_CONFIG.bgColor;
      ctx.fillRect(0, 0, width, height);

      // Ambient starfield / parallax
      for (const s of stars) {
        s.y = (s.y + s.s * dt) % height;
        ctx.fillStyle = "rgba(226, 232, 240, 0.25)";
        ctx.fillRect(s.x % width, s.y, s.r, s.r);
      }

      if (GAME_CONFIG.mode === "platformer") {
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(0, height - 48, width, 48);
        ctx.fillStyle = GAME_CONFIG.accentColor;
        ctx.fillRect(0, height - 48, width, 4);
      }

      // Draw entities
      for (const e of entities) {
        ctx.save();
        ctx.translate(e.x, e.y);
        if (e.kind === "coin") {
          ctx.fillStyle = "#facc15";
          ctx.beginPath();
          ctx.arc(0, 0, e.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#fef08a";
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          ctx.fillStyle = e.kind === "charger" ? "#fb7185" : e.kind === "kiter" ? "#a855f7" : "#f43f5e";
          ctx.beginPath();
          ctx.moveTo(0, e.r);
          ctx.lineTo(-e.r, -e.r * 0.7);
          ctx.lineTo(e.r, -e.r * 0.7);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      // Draw bullets
      ctx.fillStyle = GAME_CONFIG.accentColor;
      for (const b of bullets) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw articulated characters from GAME_CONFIG.characters (hero + companions)
      const stride = performance.now() * 0.01;
      const moving = keys.has("ArrowLeft") || keys.has("ArrowRight") || keys.has("KeyA") || keys.has("KeyD") || touchState.left || touchState.right;
      const swing = moving ? Math.sin(stride) * 9 : 0;
      const rosterList = GAME_CONFIG.characters.length > 0
        ? GAME_CONFIG.characters
        : [{
            id: "hero",
            skin: "${spec.characterBlueprint?.skinOrFurColor || '#f1c19e'}",
            outfit: GAME_CONFIG.primaryColor,
            hair: "${spec.characterBlueprint?.hairOrHelmetColor || '#334155'}",
            catEars: ${spec.characterBlueprint?.hasEars === 'cat'}
          }];

      rosterList.forEach(function (charDef, charIdx) {
        const offsetX = charIdx === 0 ? 0 : (charIdx % 2 === 1 ? -46 : 46) * Math.ceil(charIdx / 2);
        const offsetY = charIdx === 0 ? 0 : 6;
        const charSwing = charIdx === 0 ? swing : Math.sin(stride + charIdx * 1.3) * 5;
        ctx.save();
        ctx.translate(player.x + offsetX, player.y + offsetY);
        // Contact shadow
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.beginPath();
        ctx.ellipse(0, 22, 18, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Legs
        ctx.lineWidth = 6;
        ctx.lineCap = "round";
        ctx.strokeStyle = "#1e293b";
        ctx.beginPath();
        ctx.moveTo(-6, 8);
        ctx.lineTo(-7 - charSwing * 0.4, 21);
        ctx.moveTo(6, 8);
        ctx.lineTo(7 + charSwing * 0.4, 21);
        ctx.stroke();
        // Torso
        ctx.fillStyle = charIdx === 0 && player.flash > 0 ? "#ffffff" : charDef.outfit;
        ctx.beginPath();
        ctx.roundRect(-12, -12, 24, 22, 6);
        ctx.fill();
        ctx.fillStyle = GAME_CONFIG.accentColor;
        ctx.fillRect(-12, 3, 24, 4);
        // Arms
        ctx.strokeStyle = charDef.skin;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(-13, -8);
        ctx.lineTo(-17 + charSwing * 0.5, 5);
        ctx.moveTo(13, -8);
        ctx.lineTo(17 - charSwing * 0.5, 5);
        ctx.stroke();
        // Head + Ears + Facial Features
        ctx.fillStyle = charDef.skin;
        ctx.beginPath();
        ctx.arc(0, -23, 12, 0, Math.PI * 2);
        ctx.fill();
        if (charDef.catEars) {
          ctx.fillStyle = charDef.skin;
          ctx.beginPath();
          ctx.moveTo(-11, -30); ctx.lineTo(-6, -42); ctx.lineTo(-1, -33);
          ctx.moveTo(11, -30); ctx.lineTo(6, -42); ctx.lineTo(1, -33);
          ctx.fill();
        } else {
          ctx.fillStyle = charDef.hair;
          ctx.beginPath();
          ctx.arc(0, -26, 12, Math.PI, 0);
          ctx.fill();
        }
        // Eyes & Smile
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(-4.5, -24, 3, 0, Math.PI * 2);
        ctx.arc(4.5, -24, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.arc(-4.5, -24, 1.5, 0, Math.PI * 2);
        ctx.arc(4.5, -24, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, -20, 4, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
        ctx.restore();
      });

      // Update & draw pooled particles
      for (const p of particles) {
        if (!p.active) continue;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
          continue;
        }
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size * 0.5, p.y - p.size * 0.5, p.size, p.size);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    let lastTime = performance.now();
    function loop(now) {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0), 0.05);
      if (state === "playing") {
        stepSimulation(dt);
      }
      renderFrame(dt);
      requestAnimationFrame(loop);
    }

    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("blur", () => keys.clear());
    window.addEventListener("keydown", (e) => {
      keys.add(e.code);
      if (state === "title" && (e.code === "Enter" || e.code === "Space")) {
        e.preventDefault();
        startGame();
        return;
      }
      if (e.code === "Escape" || e.code === "KeyP") {
        if (state === "playing") setScreenState("paused");
        else if (state === "paused") setScreenState("playing");
        return;
      }
      if (e.code === "KeyM") {
        muted = !muted;
      }
      if (e.code === "KeyR" && state === "playing") {
        startGame();
      }
      if ((e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") && state === "playing" && GAME_CONFIG.mode === "platformer") {
        triggerAction();
      }
    });
    window.addEventListener("keyup", (e) => keys.delete(e.code));

    document.getElementById("btn-start").addEventListener("click", startGame);
    document.getElementById("btn-play-again").addEventListener("click", startGame);
    document.getElementById("btn-resume").addEventListener("click", () => setScreenState("playing"));
    document.getElementById("btn-restart-pause").addEventListener("click", startGame);
    document.getElementById("btn-restart-hud").addEventListener("click", startGame);
    document.getElementById("btn-pause").addEventListener("click", () => setScreenState(state === "playing" ? "paused" : "playing"));
    document.getElementById("btn-mute").addEventListener("click", () => { muted = !muted; });

    function bindTouch(id, key) {
      const el = document.getElementById(id);
      el.addEventListener("pointerdown", (e) => { e.preventDefault(); touchState[key] = true; if (key === "action") triggerAction(); });
      el.addEventListener("pointerup", () => { touchState[key] = false; });
      el.addEventListener("pointercancel", () => { touchState[key] = false; });
    }
    bindTouch("touch-left", "left");
    bindTouch("touch-right", "right");
    bindTouch("touch-action", "action");

    resizeCanvas();
    if (new URLSearchParams(window.location.search).get("autostart") === "1") {
      startGame();
    }
    requestAnimationFrame(loop);
  })();
  </script>
</body>
</html>
`;
}

function generateAppHtmlCode(spec: FeemiDesignSpec): string {
  const modeTitle =
    spec.subGenre === 'storefront'
      ? 'Cloud Storefront'
      : spec.subGenre === 'finance_ledger'
      ? 'Smart Finance Ledger'
      : 'Task Workspace';

  const defaultItemsJson =
    spec.subGenre === 'storefront'
      ? JSON.stringify([
          { id: 1, title: 'Smart Cloud Bundle', amount: 149, category: 'Featured' },
          { id: 2, title: 'Mobile Security Pack', amount: 79, category: 'Popular' },
          { id: 3, title: 'Pro Workspace License', amount: 199, category: 'Featured' },
        ])
      : spec.subGenre === 'finance_ledger'
      ? JSON.stringify([
          { id: 1, title: 'Monthly Cloud Revenue', amount: 1250, category: 'Income' },
          { id: 2, title: 'Infrastructure Budget', amount: 340, category: 'Expense' },
          { id: 3, title: 'Design Retainer', amount: 620, category: 'Income' },
        ])
      : JSON.stringify([
          { id: 1, title: 'Review Security Checklist', amount: 1, category: 'Today' },
          { id: 2, title: 'Prepare Release Notes', amount: 2, category: 'Active' },
          { id: 3, title: 'Sync Team Tasks', amount: 3, category: 'Today' },
        ]);

  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' data: blob:;" />
  <title>${spec.englishSlug}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: ${spec.bgColor}; color: #f8fafc; font-family: system-ui, -apple-system, sans-serif; padding: 18px; min-height: 100vh; }
    .app-shell { max-width: 720px; margin: 0 auto; background: #0f172a; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; overflow: hidden; }
    .app-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.08); background: #111827; }
    .title { font-size: 18px; font-weight: 800; color: #fff; }
    .subtitle { font-size: 12px; color: #94a3b8; margin-top: 2px; }
    .nav-tabs { display: flex; gap: 8px; padding: 10px 20px; background: #0b1220; border-bottom: 1px solid rgba(255,255,255,0.08); }
    .tab-btn { padding: 8px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.12); background: transparent; color: #cbd5e1; font-weight: 600; font-size: 13px; cursor: pointer; }
    .tab-btn.active { background: ${spec.primaryColor}; color: #05110d; border-color: ${spec.primaryColor}; font-weight: 800; }
    .content { padding: 18px 20px; }
    .form-row { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; }
    input, select { flex: 1; min-width: 140px; padding: 10px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.14); background: #0b1220; color: #fff; font-size: 14px; }
    .primary-btn { padding: 10px 18px; border-radius: 10px; border: none; background: ${spec.primaryColor}; color: #05110d; font-weight: 800; cursor: pointer; }
    .list { display: grid; gap: 10px; }
    .item { display: flex; align-items: center; justify-content: space-between; background: #131c2e; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 12px 14px; }
    .item-meta { font-size: 11px; color: ${spec.accentColor}; margin-top: 2px; }
    .del-btn { background: transparent; color: #fb7185; border: 1px solid rgba(251,113,133,0.3); padding: 6px 10px; border-radius: 8px; font-size: 12px; cursor: pointer; }
    .summary { margin-top: 16px; padding: 12px 14px; border-radius: 10px; background: rgba(255,255,255,0.04); font-size: 13px; color: ${spec.accentColor}; display: flex; justify-content: space-between; font-variant-numeric: tabular-nums; }
    .hidden { display: none; }
  </style>
</head>
<body>
  <div class="app-shell">
    <header class="app-header">
      <div>
        <div class="title">${spec.englishSlug}</div>
        <div class="subtitle">${modeTitle} · ${spec.packageName}</div>
      </div>
      <div id="count-label" class="subtitle">0 items</div>
    </header>

    <nav class="nav-tabs" aria-label="App Navigation">
      <button type="button" class="tab-btn active" data-tab="workspace">Workspace</button>
      <button type="button" class="tab-btn" data-tab="overview">Overview</button>
      <button type="button" class="tab-btn" data-tab="settings">Settings</button>
    </nav>

    <main class="content">
      <section id="panel-workspace">
        <form id="entry-form" class="form-row">
          <input id="entry-input" type="text" placeholder="Add new record..." required />
          <input id="entry-value" type="number" placeholder="Amount" style="max-width: 110px;" value="25" />
          <button type="submit" class="primary-btn">Add Item</button>
        </form>
        <div id="items-list" class="list"></div>
      </section>

      <section id="panel-overview" class="hidden">
        <div class="item">
          <div>
            <div>Active Records Summary</div>
            <div class="item-meta">Standard App UI · Zero Physics Engine</div>
          </div>
          <strong id="overview-count">0</strong>
        </div>
      </section>

      <section id="panel-settings" class="hidden">
        <div class="item">
          <div>
            <div>Security Policy</div>
            <div class="item-meta">Level: ${spec.securityShieldLevel}</div>
          </div>
          <span style="color:${spec.primaryColor};font-weight:700;">Enabled</span>
        </div>
      </section>

      <div id="summary-bar" class="summary">
        <span>Total Value: <strong id="summary-total">0</strong></span>
        <span>${modeTitle}</span>
      </div>
    </main>
  </div>

  <script>
  (function () {
    "use strict";
${buildSecurityUtilitySnippet(spec.securityShieldLevel)}
    const STORAGE_KEY = "codetargem_${spec.englishSlug}_items";
    const defaultItems = ${defaultItemsJson};
    let items = defaultItems;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) items = JSON.parse(saved);
    } catch (_) {}

    const listEl = document.getElementById("items-list");
    const countEl = document.getElementById("count-label");
    const overviewCountEl = document.getElementById("overview-count");
    const totalEl = document.getElementById("summary-total");
    const form = document.getElementById("entry-form");
    const inputEl = document.getElementById("entry-input");
    const valEl = document.getElementById("entry-value");
    const tabBtns = document.querySelectorAll(".tab-btn");

    tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.getAttribute("data-tab");
        tabBtns.forEach((b) => b.classList.toggle("active", b === btn));
        ["workspace", "overview", "settings"].forEach((name) => {
          document.getElementById("panel-" + name).classList.toggle("hidden", name !== target);
        });
      });
    });

    function render() {
      listEl.textContent = "";
      let total = 0;
      items.forEach((item) => {
        total += Number(item.amount) || 0;
        const row = document.createElement("div");
        row.className = "item";
        const left = document.createElement("div");
        const title = document.createElement("div");
        title.textContent = escapeHtmlSafe(item.title) + " (" + Number(item.amount) + ")";
        const meta = document.createElement("div");
        meta.className = "item-meta";
        meta.textContent = escapeHtmlSafe(item.category || "General");
        left.appendChild(title);
        left.appendChild(meta);
        const del = document.createElement("button");
        del.className = "del-btn";
        del.type = "button";
        del.textContent = "Remove";
        del.addEventListener("click", () => {
          items = items.filter((x) => x.id !== item.id);
          saveAndRender();
        });
        row.appendChild(left);
        row.appendChild(del);
        listEl.appendChild(row);
      });
      countEl.textContent = items.length + " items";
      overviewCountEl.textContent = String(items.length);
      totalEl.textContent = String(total);
    }

    function saveAndRender() {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch (_) {}
      render();
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const title = inputEl.value.trim();
      if (!title) return;
      items.unshift({ id: Date.now(), title, amount: Number(valEl.value) || 0, category: "Custom" });
      inputEl.value = "";
      saveAndRender();
    });

    render();
  })();
  </script>
</body>
</html>
`;
}

export function generateCleanCode(spec: FeemiDesignSpec): string {
  const raw =
    spec.category === 'game' ? generateGameHtmlCode(spec) : generateAppHtmlCode(spec);
  return sanitizeAndCleanCode(raw).cleanCode;
}

/**
 * Applies unlimited Arabic or English modification commands via Feemi Smart Engine (no AI).
 */
export function applyFeemiCommand(
  currentCode: string,
  spec: FeemiDesignSpec,
  command: string
): { code: string; spec: FeemiDesignSpec; summaryAr: string } {
  const cmd = command.trim();
  const lower = cmd.toLowerCase();
  const nextSpec: FeemiDesignSpec = {
    ...spec,
    customPatches: [...spec.customPatches, cmd],
  };

  if (/أسرع|سرعة|speed|faster/.test(lower)) {
    nextSpec.playerSpeed = Math.min(680, spec.playerSpeed + 60);
    return {
      code: generateCleanCode(nextSpec),
      spec: nextSpec,
      summaryAr: `تمت زيادة سرعة الحركة إلى ${nextSpec.playerSpeed} عبر المعدل الفيمي الذكي.`,
    };
  }

  if (/أبطأ|slow/.test(lower)) {
    nextSpec.playerSpeed = Math.max(140, spec.playerSpeed - 50);
    return {
      code: generateCleanCode(nextSpec),
      spec: nextSpec,
      summaryAr: `تم تقليل السرعة إلى ${nextSpec.playerSpeed} لتحكم أدق.`,
    };
  }

  if (/جاذبية|gravity/.test(lower)) {
    nextSpec.gravity = /أقل|خف|low/.test(lower)
      ? Math.max(500, spec.gravity - 220)
      : Math.min(2000, spec.gravity + 200);
    return {
      code: generateCleanCode(nextSpec),
      spec: nextSpec,
      summaryAr: `تم تعديل معامل الجاذبية الفيزيائي إلى ${nextSpec.gravity}.`,
    };
  }

  if (/أزرق|blue/.test(lower)) {
    nextSpec.primaryColor = '#38bdf8';
    nextSpec.accentColor = '#6366f1';
    return {
      code: generateCleanCode(nextSpec),
      spec: nextSpec,
      summaryAr: 'تم تحديث لوحة الألوان الرسومية إلى الأزرق السماوي.',
    };
  }

  if (/أحمر|red/.test(lower)) {
    nextSpec.primaryColor = '#f43f5e';
    nextSpec.accentColor = '#fb923c';
    return {
      code: generateCleanCode(nextSpec),
      spec: nextSpec,
      summaryAr: 'تم تحديث لوحة الألوان الرسومية إلى الأحمر الناري.',
    };
  }

  if (/أخضر|emerald|green/.test(lower)) {
    nextSpec.primaryColor = '#10b981';
    nextSpec.accentColor = '#38bdf8';
    return {
      code: generateCleanCode(nextSpec),
      spec: nextSpec,
      summaryAr: 'تم تحديث لوحة الألوان الرسومية إلى الأخضر الزمردي.',
    };
  }

  if (/صعب|hard/.test(lower)) {
    nextSpec.difficulty = 'hard';
    return {
      code: generateCleanCode(nextSpec),
      spec: nextSpec,
      summaryAr: 'تم رفع مستوى الصعوبة والتحدي إلى (صعب).',
    };
  }

  if (/سهل|easy/.test(lower)) {
    nextSpec.difficulty = 'easy';
    return {
      code: generateCleanCode(nextSpec),
      spec: nextSpec,
      summaryAr: 'تم ضبط مستوى الصعوبة إلى (سهل).',
    };
  }

  // Fallback: safely inject structured Feemi patch block into the existing code without losing manual edits
  const safeAsciiNote = transliterateToEnglishSlug(cmd).replace(/-/g, ' ');
  const patchSnippet = `\n  // [Feemi Command Patch]: ${safeAsciiNote || 'custom-rule-applied'}\n`;
  let patchedCode = currentCode;
  if (patchedCode.includes('"use strict";')) {
    patchedCode = patchedCode.replace('"use strict";', `"use strict";${patchSnippet}`);
  } else {
    patchedCode = `${patchedCode}\n/* ${safeAsciiNote} */\n`;
  }
  const cleaned = sanitizeAndCleanCode(patchedCode).cleanCode;
  return {
    code: cleaned,
    spec: nextSpec,
    summaryAr: `تم تنفيذ الأمر البرمجي وتنظيف الكود بدون أخطاء: "${cmd}".`,
  };
}

/**
 * Secret Gear Panel unrestricted command executor.
 * Supports: SET packageName=..., SET versionCode=..., SET speed=..., REPLACE old => new, or raw JS/HTML patch.
 */
export function applyUnrestrictedCommand(
  currentCode: string,
  spec: FeemiDesignSpec,
  rawCommand: string
): { code: string; spec: FeemiDesignSpec; logAr: string } {
  const cmd = rawCommand.trim();
  const nextSpec: FeemiDesignSpec = { ...spec };
  let nextCode = currentCode;

  if (/^SET\s+packageName\s*=\s*/i.test(cmd)) {
    const val = cmd.replace(/^SET\s+packageName\s*=\s*/i, '').trim();
    if (/^[a-zA-Z0-9._-]+$/.test(val)) {
      nextSpec.packageName = val;
      nextCode = nextCode.replace(
        /packageName:\s*"[^"]*"/,
        `packageName: "${val}"`
      );
      return {
        code: nextCode,
        spec: nextSpec,
        logAr: `تم تغيير معرف الحزمة جذرياً إلى ${val}`,
      };
    }
  }

  if (/^SET\s+versionCode\s*=\s*/i.test(cmd)) {
    const num = Number(cmd.replace(/^SET\s+versionCode\s*=\s*/i, '').trim());
    if (Number.isFinite(num) && num > 0) {
      nextSpec.versionCode = Math.floor(num);
      nextCode = nextCode.replace(
        /versionCode:\s*\d+/,
        `versionCode: ${nextSpec.versionCode}`
      );
      return {
        code: nextCode,
        spec: nextSpec,
        logAr: `تم تعيين رقم الإصدار إلى ${nextSpec.versionCode}`,
      };
    }
  }

  if (/^SET\s+speed\s*=\s*/i.test(cmd)) {
    const num = Number(cmd.replace(/^SET\s+speed\s*=\s*/i, '').trim());
    if (Number.isFinite(num) && num >= 50) {
      nextSpec.playerSpeed = num;
      nextCode = nextCode.replace(
        /playerSpeed:\s*\d+/,
        `playerSpeed: ${num}`
      );
      return {
        code: nextCode,
        spec: nextSpec,
        logAr: `تم فرض سرعة مخصصة: ${num}`,
      };
    }
  }

  if (cmd.includes('=>') && /^REPLACE\s+/i.test(cmd)) {
    const body = cmd.replace(/^REPLACE\s+/i, '');
    const [fromStr, toStr] = body.split('=>').map((s) => s.trim());
    if (fromStr) {
      nextCode = nextCode.split(fromStr).join(toStr ?? '');
      return {
        code: nextCode,
        spec: nextSpec,
        logAr: `تم استبدال "${fromStr}" بـ "${toStr ?? ''}" في الكود.`,
      };
    }
  }

  // Direct unrestricted code injection into <script> or end of file
  if (nextCode.includes('</body>')) {
    nextCode = nextCode.replace(
      '</body>',
      `  <script>\n    /* Secret Panel Root Override */\n    ${cmd}\n  </script>\n</body>`
    );
  } else {
    nextCode = `${nextCode}\n${cmd}\n`;
  }

  return {
    code: nextCode,
    spec: nextSpec,
    logAr: 'تم تنفيذ التعديل الجذري المباشر في الكود بنجاح.',
  };
}
