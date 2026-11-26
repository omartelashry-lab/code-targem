import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzePromptToSpec,
  applyFeemiCommand,
  applyUnrestrictedCommand,
  createCustomCharacterBlueprint,
  generateCleanCode,
  generateProceduralSvgIcon,
  sanitizeAndCleanCode,
  transliterateToEnglishSlug,
} from './feemiEngine';

test('transliterateToEnglishSlug converts Arabic titles to clean ASCII slugs', () => {
  const slug = transliterateToEnglishSlug('حارس المجرة الفضائية');
  assert.match(slug, /^[a-z0-9-]+$/);
  assert.ok(slug.length > 3);
});

test('analyzePromptToSpec detects game and app genres deterministically', () => {
  const gameSpec = analyzePromptToSpec('لعبة منصات وقفز سريعة', 'text');
  assert.equal(gameSpec.category, 'game');
  assert.equal(gameSpec.subGenre, 'platformer');
  assert.equal(gameSpec.playerSpeed, 380);
  assert.match(gameSpec.packageName, /^com\.codetargem\.[a-z0-9]+$/);

  const appSpec = analyzePromptToSpec('تطبيق متجر إلكتروني لبيع المنتجات', 'gallery');
  assert.equal(appSpec.category, 'app');
  assert.equal(appSpec.subGenre, 'storefront');
  assert.equal(appSpec.inputSource, 'gallery');
  assert.equal(appSpec.gravity, 0);
  assert.equal(appSpec.playerSpeed, 0);
  assert.equal(appSpec.characterBlueprint, undefined);
  assert.equal(appSpec.characterRoster, undefined);
});

test('generateCleanCode outputs LTR English runtime and blocks dangerous sinks', () => {
  const spec = analyzePromptToSpec('لعبة تصويب فضائية', 'text');
  const code = generateCleanCode(spec);
  assert.ok(code.includes('dir="ltr"'));
  assert.ok(code.includes('data-start="true"'));
  assert.ok(code.includes(spec.packageName));

  const appSpec = analyzePromptToSpec('تطبيق محاسبة وميزانية ذكية', 'text');
  const appCode = generateCleanCode(appSpec);
  assert.ok(appCode.includes('nav-tabs'));
  assert.ok(!appCode.includes('<canvas'));

  const dirty = 'const x = 1; eval("alert(1)"); document.write("hi");';
  const cleaned = sanitizeAndCleanCode(dirty);
  assert.equal(cleaned.issuesFixed.length, 2);
  assert.ok(!cleaned.cleanCode.includes('eval('));
});

test('generateProceduralSvgIcon returns valid SVG markup', () => {
  const spec = analyzePromptToSpec('تطبيق محاسبة ومصاريف', 'text');
  const svg = generateProceduralSvgIcon(spec);
  assert.ok(svg.startsWith('<svg'));
  assert.ok(svg.includes('</svg>'));
});

test('applyFeemiCommand and applyUnrestrictedCommand update spec and code', () => {
  const spec = analyzePromptToSpec('لعبة فضائية', 'text');
  const code = generateCleanCode(spec);
  const res1 = applyFeemiCommand(code, spec, 'زيادة السرعة واللون أزرق');
  assert.ok(res1.spec.playerSpeed > spec.playerSpeed);

  const res2 = applyUnrestrictedCommand(res1.code, res1.spec, 'SET packageName=com.omar.vip');
  assert.equal(res2.spec.packageName, 'com.omar.vip');
  assert.ok(res2.code.includes('com.omar.vip'));
});

test('analyzePromptToSpec builds single and multi-character 3D rosters for games only', () => {
  const tomSpec = analyzePromptToSpec('شخصية توم القط الذكي ثلاثي الأبعاد', 'text');
  assert.equal(tomSpec.category, 'game');
  assert.equal(tomSpec.characterBlueprint?.archetype, 'cat_tom');
  assert.equal(tomSpec.characterBlueprint?.hasTail, true);
  assert.equal(tomSpec.characterBlueprint?.hasEars, 'cat');

  const multiSpec = analyzePromptToSpec('لعبة تجمع توم وبطل فارس مدرع وروبوت', 'text');
  assert.equal(multiSpec.category, 'game');
  assert.equal(multiSpec.characterRoster?.length, 3);
  assert.equal(multiSpec.characterRoster?.[0].archetype, 'cat_tom');
  assert.equal(multiSpec.characterRoster?.[1].archetype, 'knight_hero');
  assert.equal(multiSpec.characterRoster?.[2].archetype, 'cyber_bot');

  const customJerry = createCustomCharacterBlueprint('جيري البطل', '#f59e0b', '#38bdf8', 'cat_tom', 1, 'companion');
  assert.equal(customJerry.displayNameAr, 'جيري البطل');
  assert.equal(customJerry.hasTail, true);
});

