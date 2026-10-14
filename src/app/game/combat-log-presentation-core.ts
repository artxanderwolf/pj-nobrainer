export interface CombatLogSnapshot {
  childCount: number;
  firstChildClassName: string;
  firstChildText: string;
}

export interface CombatLogEntryPresentation {
  text: string;
  className: string;
  clearPlaceholder: boolean;
  placement: 'prepend';
}

function hasClass(className: string, expected: string): boolean {
  return className.split(/\s+/).filter(Boolean).includes(expected);
}

export function getCombatLogEntryPresentation(
  text: string,
  className = '',
  snapshot: CombatLogSnapshot = { childCount: 0, firstChildClassName: '', firstChildText: '' }
): CombatLogEntryPresentation {
  return {
    text,
    className,
    clearPlaceholder:
      snapshot.childCount === 1 &&
      hasClass(snapshot.firstChildClassName, 'muted') &&
      snapshot.firstChildText.includes('Noch kein'),
    placement: 'prepend'
  };
}

export const COMBAT_LOG_PRESENTATION_CORE_BRIDGE = {
  getCombatLogEntryPresentation
};

export type CombatLogPresentationCoreBridge = typeof COMBAT_LOG_PRESENTATION_CORE_BRIDGE;
