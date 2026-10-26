export const ANDROID_UPDATE_SCHEMA_VERSION = 1 as const;
export const ANDROID_APP_ID = 'com.smithsofeldravar.game';

export interface AndroidUpdateDisabledManifest {
  schemaVersion: typeof ANDROID_UPDATE_SCHEMA_VERSION;
  available: false;
}

export interface AndroidUpdateReleaseManifest {
  schemaVersion: typeof ANDROID_UPDATE_SCHEMA_VERSION;
  available: true;
  versionName: string;
  versionCode: number;
  apkUrl: string;
  apkSize: number;
  sha256: string;
  publishedAt: string;
  mandatory: false;
  releaseNotes: string[];
}

export type AndroidUpdateManifest = AndroidUpdateDisabledManifest | AndroidUpdateReleaseManifest;

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Das Android-Update-Manifest ist kein JSON-Objekt.');
  }
  return value as Record<string, unknown>;
}

function positiveSafeInteger(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${label} muss eine positive ganze Zahl sein.`);
  }
  return value;
}

function requiredString(value: unknown, label: string, maxLength = 200): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > maxLength) {
    throw new Error(`${label} ist ungültig.`);
  }
  return value.trim();
}

export function parseAndroidUpdateManifest(value: unknown): AndroidUpdateManifest {
  const source = record(value);
  if (source['schemaVersion'] !== ANDROID_UPDATE_SCHEMA_VERSION) {
    throw new Error(`Nicht unterstützte Update-Manifest-Version: ${String(source['schemaVersion'])}.`);
  }

  if (source['available'] === false) {
    return { schemaVersion: ANDROID_UPDATE_SCHEMA_VERSION, available: false };
  }
  if (source['available'] !== true) {
    throw new Error('Das Update-Manifest muss available=true oder available=false enthalten.');
  }

  const versionName = requiredString(source['versionName'], 'versionName', 64);
  const versionCode = positiveSafeInteger(source['versionCode'], 'versionCode');
  const apkSize = positiveSafeInteger(source['apkSize'], 'apkSize');
  const sha256 = requiredString(source['sha256'], 'sha256', 64).toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(sha256)) throw new Error('sha256 muss genau 64 Hex-Zeichen enthalten.');

  const apkUrl = requiredString(source['apkUrl'], 'apkUrl', 2048);
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(apkUrl);
  } catch {
    throw new Error('apkUrl ist keine gültige URL.');
  }
  if (parsedUrl.protocol !== 'https:') throw new Error('Android-Updates dürfen ausschließlich über HTTPS geladen werden.');

  const publishedAt = requiredString(source['publishedAt'], 'publishedAt', 64);
  if (!Number.isFinite(Date.parse(publishedAt))) throw new Error('publishedAt ist kein gültiger Zeitstempel.');

  if (source['mandatory'] !== false) {
    throw new Error('Gate B unterstützt ausschließlich freiwillige Updates (mandatory=false).');
  }
  if (!Array.isArray(source['releaseNotes']) || source['releaseNotes'].length > 20) {
    throw new Error('releaseNotes muss ein Array mit höchstens 20 Einträgen sein.');
  }
  const releaseNotes = source['releaseNotes'].map((note, index) => requiredString(note, `releaseNotes[${index}]`, 300));

  return {
    schemaVersion: ANDROID_UPDATE_SCHEMA_VERSION,
    available: true,
    versionName,
    versionCode,
    apkUrl: parsedUrl.toString(),
    apkSize,
    sha256,
    publishedAt,
    mandatory: false,
    releaseNotes
  };
}

export function isAndroidUpdateNewer(manifest: AndroidUpdateManifest, currentVersionCode: number): manifest is AndroidUpdateReleaseManifest {
  return manifest.available && Number.isSafeInteger(currentVersionCode) && manifest.versionCode > currentVersionCode;
}
