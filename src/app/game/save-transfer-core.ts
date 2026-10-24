import { decodeSave, SAVE_VERSION } from './save-codec.ts';

export const MIN_IMPORT_SAVE_VERSION = 8;
export const MAX_IMPORT_FILE_BYTES = 5_000_000;

export type SaveImportValidation =
  | {
      ok: true;
      saveVersion: number;
      savedAt: number;
      state: Record<string, unknown>;
    }
  | {
      ok: false;
      reason: 'invalid-json' | 'invalid-envelope' | 'unsupported-version' | 'future-version' | 'invalid-state';
      message: string;
    };

export function validateImportedSave(raw: string): SaveImportValidation {
  let envelope: unknown;
  try {
    envelope = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'invalid-json', message: 'Die Datei enthält kein gültiges JSON.' };
  }

  if (!isRecord(envelope) || !('state' in envelope) || !('saveVersion' in envelope) || !('savedAt' in envelope)) {
    return { ok: false, reason: 'invalid-envelope', message: 'Die Datei ist kein vollständiger NoBrainer-Spielstand.' };
  }

  let decoded;
  try {
    decoded = decodeSave<Record<string, unknown>>(raw);
  } catch {
    return { ok: false, reason: 'invalid-json', message: 'Die Datei enthält kein gültiges JSON.' };
  }

  const saveVersion = Number(decoded.saveVersion);
  if (!Number.isInteger(saveVersion) || saveVersion < MIN_IMPORT_SAVE_VERSION) {
    return {
      ok: false,
      reason: 'unsupported-version',
      message: `Diese Save-Version wird nicht unterstützt. Unterstützt werden v${MIN_IMPORT_SAVE_VERSION} bis v${SAVE_VERSION}.`
    };
  }
  if (saveVersion > SAVE_VERSION) {
    return {
      ok: false,
      reason: 'future-version',
      message: `Dieser Spielstand stammt aus einer neueren Save-Version (v${saveVersion}). Aktuell unterstützt wird höchstens v${SAVE_VERSION}.`
    };
  }

  const savedAt = Number(decoded.savedAt);
  const state = decoded.state;
  if (!Number.isFinite(savedAt) || savedAt <= 0 || !isRecord(state)) {
    return { ok: false, reason: 'invalid-state', message: 'Der Spielstand enthält ungültige Speicherdaten.' };
  }
  if (!Array.isArray(state['characters']) || !isRecord(state['inventory'])) {
    return { ok: false, reason: 'invalid-state', message: 'Der Spielstand enthält keinen gültigen NoBrainer-Spielzustand.' };
  }

  return { ok: true, saveVersion, savedAt, state };
}

export function buildSaveExportFilename(appVersion: string, savedAt: number): string {
  const date = new Date(savedAt);
  const pad = (value: number): string => String(value).padStart(2, '0');
  const stamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
  return `NoBrainer-Spielstand-v${appVersion}-${stamp}.json`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
