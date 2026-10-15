import { Injectable } from '@angular/core';

const ADAPTED_ADD_LOG = `function addLog(text, cls=""){
  const combatLogCompatibility=window.NoBrainerCombatLogCompatibility;
  if(!combatLogCompatibility)throw new Error("NoBrainer-Kampfprotokoll-Kompatibilitätsbrücke wurde nicht registriert.");
  combatLogCompatibility.add(text,cls);
}
`;

@Injectable({ providedIn: 'root' })
export class LegacyCombatLogPresentationAdapterService {
  adapt(source: string): string {
    return this.replaceRangeOnce(
      source,
      'function addLog(',
      'let openWeaponPickerHand=null;',
      ADAPTED_ADD_LOG + '\n',
      'Kampfprotokoll-Präsentation'
    );
  }

  private replaceRangeOnce(
    source: string,
    startMarker: string,
    endMarker: string,
    replacement: string,
    label: string
  ): string {
    const start = source.indexOf(startMarker);
    if (start < 0) throw new Error(`Legacy-Kompatibilität fehlgeschlagen: Startanker für ${label} wurde nicht gefunden.`);
    if (source.indexOf(startMarker, start + startMarker.length) >= 0) {
      throw new Error(`Legacy-Kompatibilität fehlgeschlagen: Startanker für ${label} ist nicht eindeutig.`);
    }
    const end = source.indexOf(endMarker, start + startMarker.length);
    if (end < 0) throw new Error(`Legacy-Kompatibilität fehlgeschlagen: Endanker für ${label} wurde nicht gefunden.`);
    if (source.indexOf(endMarker, end + endMarker.length) >= 0) {
      throw new Error(`Legacy-Kompatibilität fehlgeschlagen: Endanker für ${label} ist nicht eindeutig.`);
    }
    return source.slice(0, start) + replacement + source.slice(end);
  }
}
