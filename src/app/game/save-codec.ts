export const SAVE_VERSION = 9;

export interface SaveEnvelope<TState = unknown> {
  saveVersion: number;
  savedAt: number;
  state: TState;
}

export interface DecodedSave<TState = unknown> {
  state: TState;
  savedAt: number | null;
  saveVersion: number | null;
}

export function decodeSave<TState = unknown>(raw: string): DecodedSave<TState> {
  const parsed = JSON.parse(raw) as SaveEnvelope<TState> | TState;
  if (isSaveEnvelope<TState>(parsed)) {
    return {
      state: parsed.state,
      savedAt: Number.isFinite(Number(parsed.savedAt)) ? Number(parsed.savedAt) : null,
      saveVersion: Number.isFinite(Number(parsed.saveVersion)) ? Number(parsed.saveVersion) : null
    };
  }

  return { state: parsed as TState, savedAt: null, saveVersion: null };
}

export function encodeSave<TState>(state: TState, savedAt = Date.now()): string {
  return JSON.stringify({ saveVersion: SAVE_VERSION, savedAt, state });
}

function isSaveEnvelope<TState>(value: unknown): value is SaveEnvelope<TState> {
  return !!value && typeof value === 'object' && 'state' in value;
}

export interface SaveCodecBridge {
  SAVE_VERSION: number;
  decodeSave: typeof decodeSave;
  encodeSave: typeof encodeSave;
}

export const SAVE_CODEC_BRIDGE: SaveCodecBridge = {
  SAVE_VERSION,
  decodeSave,
  encodeSave
};
