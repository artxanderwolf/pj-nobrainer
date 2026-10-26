import assert from 'node:assert/strict';
import {
  ANDROID_UPDATE_SCHEMA_VERSION,
  isAndroidUpdateNewer,
  parseAndroidUpdateManifest
} from '../src/app/game/android-update-core.ts';

const disabled = parseAndroidUpdateManifest({ schemaVersion: 1, available: false });
assert.equal(disabled.schemaVersion, ANDROID_UPDATE_SCHEMA_VERSION);
assert.equal(disabled.available, false);
assert.equal(isAndroidUpdateNewer(disabled, 1), false);

const candidate = parseAndroidUpdateManifest({
  schemaVersion: 1,
  available: true,
  versionName: '0.20.0',
  versionCode: 2,
  apkUrl: 'https://github.com/artxanderwolf/pj-nobrainer/releases/download/android-v2/Smiths-of-Eldravar.apk',
  apkSize: 3456789,
  sha256: 'a'.repeat(64),
  publishedAt: '2026-10-26T12:00:00Z',
  mandatory: false,
  releaseNotes: ['Technischer Update-Test']
});
assert.equal(candidate.available, true);
assert.equal(candidate.versionCode, 2);
assert.equal(isAndroidUpdateNewer(candidate, 1), true);
assert.equal(isAndroidUpdateNewer(candidate, 2), false);

assert.throws(() => parseAndroidUpdateManifest({ ...candidate, apkUrl: 'http://example.invalid/update.apk' }), /HTTPS/);
assert.throws(() => parseAndroidUpdateManifest({ ...candidate, sha256: '1234' }), /sha256/);
assert.throws(() => parseAndroidUpdateManifest({ ...candidate, versionCode: 0 }), /versionCode/);
assert.throws(() => parseAndroidUpdateManifest({ ...candidate, mandatory: true }), /mandatory=false/);
assert.throws(() => parseAndroidUpdateManifest({ ...candidate, schemaVersion: 2 }), /Nicht unterstützte/);

console.log('Android-Update-Core: Manifest-Schema, HTTPS, Versionsvergleich, Hashformat und freiwillige Updates sind konsistent.');
