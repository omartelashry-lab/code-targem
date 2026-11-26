import test from 'node:test';
import assert from 'node:assert/strict';
import {
  auditProjectCompleteness,
  buildApkReadyProjectZipBytes,
  buildSignedApkBytes,
  createDigitalSignature,
  validateOwnershipInput,
} from './apkBuilder';
import { analyzePromptToSpec, generateCleanCode, generateProceduralSvgIcon } from './feemiEngine';
import { BuiltProjectRecord, DEFAULT_DEVELOPER_OWNERSHIP } from '../types/project';

test('validateOwnershipInput allows default and validates custom owner name and email', () => {
  assert.equal(validateOwnershipInput('default', '', '').valid, true);
  assert.equal(validateOwnershipInput('custom', '', 'bad-email').valid, false);
  assert.equal(validateOwnershipInput('custom', 'أحمد علي', 'notanemail').valid, false);
  assert.equal(validateOwnershipInput('custom', 'أحمد علي', 'ahmed@example.com').valid, true);
});

test('buildSignedApkBytes builds a valid ZIP/APK archive with PK header and manifest', () => {
  const spec = analyzePromptToSpec('لعبة صيد العملات', 'text');
  const code = generateCleanCode(spec);
  const svgIcon = generateProceduralSvgIcon(spec);
  const now = '2026-11-26T10:00:00.000Z';
  const signature = createDigitalSignature(spec.packageName, DEFAULT_DEVELOPER_OWNERSHIP, now);

  const project: BuiltProjectRecord = {
    id: 'proj-1',
    shareSlug: 'coin-hunter',
    appName: spec.appName,
    englishSlug: spec.englishSlug,
    packageName: spec.packageName,
    category: spec.category,
    subGenre: spec.subGenre,
    code,
    svgIcon,
    spec,
    ownership: DEFAULT_DEVELOPER_OWNERSHIP,
    signature,
    securityReport: { vulnerabilitiesBlocked: 3, checks: ['CSP', 'XSS', 'Signed'] },
    apkFileName: `${spec.englishSlug}-signed.apk`,
    apkSizeBytes: 0,
    localSavedAt: now,
    cloudUpdatedAt: now,
    aiAudited: false,
  };

  const completeness = auditProjectCompleteness(project);
  assert.equal(completeness.complete, true);

  const bytes = buildSignedApkBytes(project);
  assert.ok(bytes.length > 500);
  // ZIP local file header magic: PK\x03\x04
  assert.equal(bytes[0], 0x50);
  assert.equal(bytes[1], 0x4b);
  assert.equal(bytes[2], 0x03);
  assert.equal(bytes[3], 0x04);
});

test('buildApkReadyProjectZipBytes includes complete package.json, capacitor.config.json, and AndroidManifest.xml', () => {
  const spec = analyzePromptToSpec('تطبيق متجر سحابي حديث', 'text');
  const code = generateCleanCode(spec);
  const svgIcon = generateProceduralSvgIcon(spec);
  const zipBytes = buildApkReadyProjectZipBytes({ spec, code, svgIcon });

  assert.equal(zipBytes[0], 0x50);
  assert.equal(zipBytes[1], 0x4b);
  assert.equal(zipBytes[2], 0x03);
  assert.equal(zipBytes[3], 0x04);

  const decoded = new TextDecoder().decode(zipBytes);
  assert.ok(decoded.includes('package.json'));
  assert.ok(decoded.includes('capacitor.config.json'));
  assert.ok(decoded.includes('android/app/src/main/AndroidManifest.xml'));
  assert.ok(decoded.includes('www/index.html'));
  assert.ok(decoded.includes('@capacitor/android'));
});
