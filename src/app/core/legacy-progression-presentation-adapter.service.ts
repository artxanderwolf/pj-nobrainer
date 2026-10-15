import { Injectable } from '@angular/core';

const PROGRESSION_PRESENTATION_BRIDGE = `function renderUpgradeCards(){
  const progressionPresentation=window.NoBrainerProgressionPresentationCompatibility;
  if(!progressionPresentation)throw new Error("NoBrainer-Progressions-Präsentationsbrücke fehlt.");
  progressionPresentation.render();
}
`;

@Injectable({ providedIn: 'root' })
export class LegacyProgressionPresentationAdapterService {
  adapt(source: string): string {
    return this.replaceRangeOnce(
      source,
      'function upgradeButton(kind,stateKey,cfgKey,label){',
      'function startForgeJob(){',
      PROGRESSION_PRESENTATION_BRIDGE,
      'Ausbaukarten-Präsentation'
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
