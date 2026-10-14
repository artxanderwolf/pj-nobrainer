export type SaveStatusKind = 'new' | 'loaded' | 'saved' | 'unavailable' | 'reset';

export type SaveStatusTimeFormatter = (timestamp: number) => string;

export interface SaveStatusPresentationOptions {
  timestamp?: number | null;
  manual?: boolean;
  formatTime?: SaveStatusTimeFormatter;
}

export interface SaveStatusPresentation {
  text: string;
}

function formattedTime(
  timestamp: number | null | undefined,
  formatter: SaveStatusTimeFormatter | undefined
): string | null {
  const value = Number(timestamp);
  if (!Number.isFinite(value) || !formatter) return null;
  const formatted = formatter(value);
  return typeof formatted === 'string' && formatted.length ? formatted : null;
}

export function getSaveStatusPresentation(
  kind: SaveStatusKind,
  options: SaveStatusPresentationOptions = {}
): SaveStatusPresentation {
  switch (kind) {
    case 'new':
      return { text: 'Neuer Spielstand' };
    case 'loaded': {
      const time = formattedTime(options.timestamp, options.formatTime);
      return { text: time ? `Geladen · ${time}` : 'Spielstand geladen' };
    }
    case 'saved': {
      const prefix = options.manual ? 'Manuell gespeichert' : 'Gespeichert';
      const time = formattedTime(options.timestamp, options.formatTime);
      return { text: time ? `${prefix} · ${time}` : prefix };
    }
    case 'unavailable':
      return { text: 'Lokaler Save nicht verfügbar' };
    case 'reset':
      return { text: 'Spielstand zurückgesetzt' };
  }
}

export const SAVE_STATUS_PRESENTATION_CORE_BRIDGE = {
  getSaveStatusPresentation
};

export type SaveStatusPresentationCoreBridge = typeof SAVE_STATUS_PRESENTATION_CORE_BRIDGE;
