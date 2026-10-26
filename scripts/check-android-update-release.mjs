import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  createReleaseManifest,
  normalizeCertificateSha256,
  readExpectedAndroidVersion,
  validateApkMetadata,
  verifyRemoteApk
} from './prepare-android-update.mjs';

const expected = readExpectedAndroidVersion(readFileSync(new URL('../android/app/build.gradle', import.meta.url), 'utf8'));
const certificate = 'a1'.repeat(32);
const fingerprint = certificate.match(/../g).join(':').toUpperCase();
const badging = `package: name='${expected.packageName}' versionCode='${expected.versionCode}' versionName='${expected.versionName}' platformBuildVersionName='16'\n`;
const signature = `Verifies\nVerified using v2 scheme (APK Signature Scheme v2): true\nNumber of signers: 1\nSigner #1 certificate SHA-256 digest: ${certificate}\n`;

assert.equal(normalizeCertificateSha256(fingerprint), certificate);
assert.throws(() => normalizeCertificateSha256('1234'), /64 Hex/);
assert.throws(() => readExpectedAndroidVersion('versionName "0.19.4"'), /nicht eindeutig/);
assert.deepEqual(validateApkMetadata(badging, signature, expected, fingerprint), { ...expected, certificateSha256: certificate });
assert.throws(() => validateApkMetadata(badging, signature.replace(certificate, 'b2'.repeat(32)), expected, certificate), /Signierer/);
assert.throws(() => validateApkMetadata(`${badging}application-debuggable\n`, signature, expected, certificate), /debuggable/);
assert.throws(() => validateApkMetadata(badging.replace(expected.packageName, 'other.package'), signature, expected, certificate), /Paket-ID/);
assert.throws(() => validateApkMetadata(badging.replace(`versionCode='${expected.versionCode}'`, "versionCode='1'"), signature, expected, certificate), /APK-Version/);
assert.throws(() => validateApkMetadata(badging.replace(`versionName='${expected.versionName}'`, "versionName='0.0.1'"), signature, expected, certificate), /APK-Version/);
assert.throws(() => validateApkMetadata(badging, 'DOES NOT VERIFY', expected, certificate), /keine gültige/);
assert.throws(() => validateApkMetadata(badging, `${signature}Signer #2 certificate SHA-256 digest: ${certificate}\n`, expected, certificate), /Signierer/);

// These bytes and tool reports are fixtures, not a real APK or a real signature verification.
const bytes = new TextEncoder().encode('release-download-fixture');
const file = { apkSize: bytes.byteLength, sha256: createHash('sha256').update(bytes).digest('hex') };
const url = 'https://example.invalid/release.apk';
const response = data => new Response(data, { status: 200 });
const validFetch = async (_url, options) => {
  assert.equal(options.redirect, 'manual');
  assert.equal(options.cache, 'no-store');
  return response(bytes);
};
assert.deepEqual(await verifyRemoteApk(url, file, { fetchImpl: validFetch }), file);
await assert.rejects(verifyRemoteApk('http://example.invalid/a.apk', file, { fetchImpl: validFetch }), /HTTPS/);
await assert.rejects(verifyRemoteApk('https://user:password@example.invalid/a.apk', file, { fetchImpl: validFetch }), /Zugangsdaten/);
await assert.rejects(verifyRemoteApk(url, file, { fetchImpl: async () => new Response(null, { status: 404 }) }), /HTTP 404/);
await assert.rejects(verifyRemoteApk(url, file, { fetchImpl: async () => response(bytes.slice(1)) }), /APK-Größe/);
await assert.rejects(verifyRemoteApk(url, { ...file, apkSize: bytes.length - 1 }, { fetchImpl: validFetch }), /größer/);
await assert.rejects(verifyRemoteApk(url, { ...file, sha256: '0'.repeat(64) }, { fetchImpl: validFetch }), /SHA-256/);
await assert.rejects(verifyRemoteApk(url, file, { fetchImpl: async () => new Response(null, { status: 302, headers: { location: 'http://example.invalid/a.apk' } }) }), /HTTPS/);
await assert.rejects(verifyRemoteApk(url, file, { fetchImpl: async () => new Response(null, { status: 302 }) }), /kein Ziel/);
await assert.rejects(verifyRemoteApk(url, file, { fetchImpl: async () => new Response(null, { status: 302, headers: { location: '/loop.apk' } }) }), /fünf Weiterleitungen/);
let redirects = 0;
assert.deepEqual(await verifyRemoteApk(url, file, { fetchImpl: async currentUrl => {
  if (redirects++ === 0) return new Response(null, { status: 302, headers: { location: 'https://assets.example.invalid/signed.apk' } });
  assert.equal(currentUrl.toString(), 'https://assets.example.invalid/signed.apk');
  return response(bytes);
} }), file);

const manifest = createReleaseManifest(expected, file, url, ['Android-Updatetest'], '2026-10-26T12:00:00Z');
assert.equal(manifest.available, true);
assert.equal(manifest.mandatory, false);
assert.equal(manifest.versionCode, expected.versionCode);
assert.equal(manifest.versionName, expected.versionName);
assert.equal(manifest.sha256, file.sha256);
assert.throws(() => createReleaseManifest(expected, file, url, ['']), /releaseNotes/);
assert.throws(() => createReleaseManifest(expected, file, url, 'not-an-array'), /releaseNotes/);

console.log('Android-Releasevorbereitung: Metadaten-Fixtures und simulierte HTTPS-Downloads geprüft; keine echte APK-, Signatur- oder Geräteabnahme.');
