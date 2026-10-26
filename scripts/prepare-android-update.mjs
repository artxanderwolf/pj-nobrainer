import { createHash, randomBytes } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ANDROID_APP_ID, parseAndroidUpdateManifest } from '../src/app/game/android-update-core.ts';

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_OUTPUT = '.generated/android-release/stable.json';
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export function normalizeCertificateSha256(value) {
  if (typeof value !== 'string') throw new Error('Der bekannte Zertifikat-Fingerabdruck fehlt.');
  const fingerprint = value.replace(/[:\s]/g, '').toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(fingerprint)) throw new Error('Der Zertifikat-Fingerabdruck muss SHA-256 mit 64 Hex-Zeichen sein.');
  return fingerprint;
}

export function readExpectedAndroidVersion(gradle) {
  const packageName = gradle.match(/^\s*applicationId\s+"([^"]+)"/m)?.[1];
  const versionName = gradle.match(/^\s*versionName\s+"([^"]+)"/m)?.[1];
  const versionCode = Number(gradle.match(/^\s*versionCode\s+(\d+)\s*$/m)?.[1]);
  if (packageName !== ANDROID_APP_ID || !versionName || !Number.isSafeInteger(versionCode) || versionCode <= 0) {
    throw new Error('Die freigegebene Android-Identität/Version ist in android/app/build.gradle nicht eindeutig lesbar.');
  }
  return { packageName, versionName, versionCode };
}

export function validateApkMetadata(badging, signatureReport, expected, certificateSha256) {
  const packageLine = badging.match(/^package:\s+.*$/m)?.[0] ?? '';
  const packageName = packageLine.match(/\bname='([^']+)'/)?.[1];
  const versionName = packageLine.match(/\bversionName='([^']+)'/)?.[1];
  const versionCode = Number(packageLine.match(/\bversionCode='(\d+)'/)?.[1]);
  if (packageName !== expected.packageName) throw new Error('APK-Paket-ID stimmt nicht mit dem Projekt überein.');
  if (versionName !== expected.versionName || versionCode !== expected.versionCode) {
    throw new Error('APK-Version stimmt nicht mit android/app/build.gradle überein.');
  }
  if (/^application-debuggable(?:\s|$)/m.test(badging)) throw new Error('Eine debuggable APK darf nicht veröffentlicht werden.');
  if (!/^Verifies\s*$/m.test(signatureReport)) throw new Error('apksigner hat keine gültige APK-Signatur bestätigt.');

  const fingerprints = [...signatureReport.matchAll(/^Signer #\d+ certificate SHA-256 digest:\s*([a-fA-F0-9: ]+)\s*$/gm)]
    .map(match => normalizeCertificateSha256(match[1]));
  if (fingerprints.length !== 1 || fingerprints[0] !== normalizeCertificateSha256(certificateSha256)) {
    throw new Error('APK-Signierer stimmt nicht mit dem bekannten dauerhaften Release-Zertifikat überein.');
  }
  return { packageName, versionName, versionCode, certificateSha256: fingerprints[0] };
}

function httpsUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('Die APK-Adresse ist keine gültige URL.'); }
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new Error('Die APK-Adresse und alle Weiterleitungen müssen HTTPS ohne Zugangsdaten verwenden.');
  }
  return url;
}

export async function verifyRemoteApk(apkUrl, expected, { fetchImpl = fetch, timeoutMs = 120_000 } = {}) {
  if (!Number.isSafeInteger(expected.apkSize) || expected.apkSize <= 0 || !/^[a-f0-9]{64}$/.test(expected.sha256)) {
    throw new Error('Lokale APK-Größe oder SHA-256 ist ungültig.');
  }
  let url = httpsUrl(apkUrl);
  const signal = AbortSignal.timeout(timeoutMs);
  for (let redirects = 0; redirects <= 5; redirects++) {
    const response = await fetchImpl(url, {
      redirect: 'manual', signal, cache: 'no-store',
      headers: { Accept: 'application/vnd.android.package-archive, application/octet-stream' }
    });
    if (REDIRECT_STATUSES.has(response.status)) {
      await response.body?.cancel();
      if (redirects === 5) throw new Error('APK-Download hat mehr als fünf Weiterleitungen.');
      const location = response.headers.get('location');
      if (!location) throw new Error('APK-Weiterleitung enthält kein Ziel.');
      url = httpsUrl(new URL(location, url).toString());
      continue;
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`APK-Download fehlgeschlagen (HTTP ${response.status}).`);
    }
    if (!response.body) throw new Error('APK-Download enthält keine Datei.');
    const digest = createHash('sha256');
    let bytes = 0;
    for await (const chunk of response.body) {
      bytes += chunk.byteLength;
      if (bytes > expected.apkSize) throw new Error('Hochgeladene APK ist größer als die geprüfte lokale APK.');
      digest.update(chunk);
    }
    if (bytes !== expected.apkSize) throw new Error('Hochgeladene APK-Größe stimmt nicht mit der lokalen APK überein.');
    const sha256 = digest.digest('hex');
    if (sha256 !== expected.sha256) throw new Error('Hochgeladene APK-SHA-256 stimmt nicht mit der lokalen APK überein.');
    return { apkSize: bytes, sha256 };
  }
  throw new Error('APK-Download konnte nicht abgeschlossen werden.');
}

export function findAndroidBuildTools(sdkRoot, platform = process.platform) {
  if (!sdkRoot) throw new Error('--sdk oder ANDROID_HOME/ANDROID_SDK_ROOT muss auf das Android SDK zeigen.');
  const buildToolsRoot = join(resolve(sdkRoot), 'build-tools');
  if (!existsSync(buildToolsRoot)) throw new Error('Android SDK enthält keine build-tools.');
  const versions = readdirSync(buildToolsRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && /^\d+\.\d+\.\d+$/.test(entry.name))
    .map(entry => entry.name)
    .sort((a, b) => b.localeCompare(a, 'en', { numeric: true }));
  for (const version of versions) {
    const directory = join(buildToolsRoot, version);
    const aapt = join(directory, platform === 'win32' ? 'aapt.exe' : 'aapt');
    const apksigner = join(directory, 'lib', 'apksigner.jar');
    if (existsSync(aapt) && existsSync(apksigner)) return { aapt, apksigner };
  }
  throw new Error('Keine vollständigen stabilen Android build-tools mit aapt und apksigner.jar gefunden.');
}

export function createReleaseManifest(metadata, file, apkUrl, releaseNotes, publishedAt = new Date().toISOString()) {
  return parseAndroidUpdateManifest({
    schemaVersion: 1, available: true,
    versionName: metadata.versionName, versionCode: metadata.versionCode,
    apkUrl, apkSize: file.apkSize, sha256: file.sha256, publishedAt,
    mandatory: false, releaseNotes
  });
}

function parseArguments(args) {
  const options = {};
  const allowed = new Set(['apk', 'apk-url', 'certificate-sha256', 'notes', 'sdk', 'java', 'output']);
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (argument === '--help') return { help: true };
    const name = argument.startsWith('--') ? argument.slice(2) : '';
    if (!allowed.has(name) || options[name] !== undefined || !args[index + 1] || args[index + 1].startsWith('--')) {
      throw new Error(`Ungültiges oder unvollständiges Argument: ${argument}. Siehe --help.`);
    }
    options[name] = args[++index];
  }
  for (const name of ['apk', 'apk-url', 'certificate-sha256', 'notes']) {
    if (!options[name]) throw new Error(`--${name} ist erforderlich. Siehe --help.`);
  }
  return options;
}

function runTool(executable, args, label) {
  try {
    return execFileSync(executable, args, { encoding: 'utf8', windowsHide: true, timeout: 60_000, maxBuffer: 8 * 1024 * 1024 });
  } catch {
    throw new Error(`${label} ist fehlgeschlagen. Prüfe SDK/Java, APK und Signierung; es wurde kein Manifest geschrieben.`);
  }
}

async function hashFile(path) {
  const digest = createHash('sha256');
  for await (const chunk of createReadStream(path)) digest.update(chunk);
  return digest.digest('hex');
}

function writeManifest(output, manifest) {
  mkdirSync(dirname(output), { recursive: true });
  const temporary = `${output}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`;
  try {
    writeFileSync(temporary, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
    renameSync(temporary, output);
  } finally {
    if (existsSync(temporary)) unlinkSync(temporary);
  }
}

export async function main(args = process.argv.slice(2)) {
  const options = parseArguments(args);
  if (options.help) {
    console.log(`Geprüftes Android-Update-Manifest lokal vorbereiten (keine Veröffentlichung).
Aufruf: npm run android:prepare-update -- \\
  --apk <signierte-release.apk> --apk-url <öffentliche-HTTPS-APK-Adresse> \\
  --certificate-sha256 <bekannter-dauerhafter-Zertifikat-Fingerabdruck> \\
  --notes <JSON-Datei-mit-Textarray> [--sdk <Android-SDK>] [--java <java.exe>] \\
  [--output <lokale-Datei>]
Standardausgabe: ${DEFAULT_OUTPUT}
Der Schlüssel selbst und Passwörter werden nicht benötigt. Die APK muss bereits
mit dem bisherigen Release-Key signiert und über HTTPS hochgeladen sein.`);
    return;
  }

  const output = resolve(options.output ?? DEFAULT_OUTPUT);
  if (output === join(REPOSITORY_ROOT, 'public', 'android-update', 'stable.json')) {
    throw new Error('Dieses Werkzeug schreibt nur einen lokalen Entwurf. Stable nach Prüfung separat freigeben.');
  }
  const apk = resolve(options.apk);
  const size = statSync(apk);
  if (!size.isFile() || size.size <= 0) throw new Error('--apk muss eine vorhandene, nicht leere APK-Datei sein.');
  const expected = readExpectedAndroidVersion(readFileSync(join(REPOSITORY_ROOT, 'android/app/build.gradle'), 'utf8'));
  const certificate = normalizeCertificateSha256(options['certificate-sha256']);
  const apkUrl = httpsUrl(options['apk-url']).toString();
  const notes = JSON.parse(readFileSync(resolve(options.notes), 'utf8'));
  // Validate notes and all manifest fields before invoking native tools or network access.
  createReleaseManifest(expected, { apkSize: size.size, sha256: '0'.repeat(64) }, apkUrl, notes);
  const tools = findAndroidBuildTools(options.sdk ?? process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT);
  const java = options.java ?? (process.env.JAVA_HOME ? join(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java') : 'java');
  const badging = runTool(tools.aapt, ['dump', 'badging', apk], 'aapt');
  const signatureReport = runTool(java, ['-jar', tools.apksigner, 'verify', '--verbose', '--print-certs', apk], 'apksigner');
  const metadata = validateApkMetadata(badging, signatureReport, expected, certificate);
  const file = { apkSize: size.size, sha256: await hashFile(apk) };
  await verifyRemoteApk(apkUrl, file);
  const manifest = createReleaseManifest(metadata, file, apkUrl, notes);
  writeManifest(output, manifest);
  console.log(`Signatur, Paket-ID, Version und öffentlicher Download geprüft. Lokaler Manifestentwurf: ${output}`);
  console.log('Noch nicht veröffentlicht. Gerätetest mit erhaltenem Spielstand bleibt erforderlich.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(`Android-Release: ${error.message}`); process.exitCode = 1; });
}
