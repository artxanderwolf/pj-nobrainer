import { Injectable } from '@angular/core';

const TAVERN_PRESENTATION_BRIDGE = `function renderTavern(){
  const tavernPresentation=window.NoBrainerTavernPresentationCompatibility;
  if(!tavernPresentation)throw new Error("NoBrainer-Tavernen-Präsentationsbrücke fehlt.");
  tavernPresentation.render();
}
`;

@Injectable({ providedIn: 'root' })
export class LegacyTavernPresentationAdapterService {
  adapt(source: string): string {
    return this.replaceRangeOnce(
      source,
      'function renderTavern(){',
      'function upgradeCost(kind,current){',
      TAVERN_PRESENTATION_BRIDGE,
      'Tavernen-Präsentation'
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
    return source.slice(0, start) + replacement + source.slice(end);
  }
}
