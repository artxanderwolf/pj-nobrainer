import { Injectable } from '@angular/core';

const ADAPTED_FORGE_PREVIEW = `function renderForgePreview(){
  const forgePreviewPresentation=window.NoBrainerForgePreviewPresentationCompatibility;
  if(!forgePreviewPresentation)throw new Error("NoBrainer-Schmiedevorschau-Präsentationsbrücke wurde nicht registriert.");
  forgePreviewPresentation.render();
}
`;

const ADAPTED_FORGE_JOBS = `function renderForgeJob(){
  const forgeJobPresentation=window.NoBrainerForgeJobPresentationCompatibility;
  if(!forgeJobPresentation)throw new Error("NoBrainer-Schmiedeauftrags-Präsentationsbrücke wurde nicht registriert.");
  forgeJobPresentation.render();
}
`;

@Injectable({ providedIn: 'root' })
export class LegacyForgePresentationAdapterService {
  adapt(source: string): string {
    let adapted = this.replaceRangeOnce(
      source,
      'function getMaterialsForCategories(',
      'function getForgeSelection(){',
      '',
      'Schmiede-Materialauswahl-Präsentation'
    );
    adapted = this.replaceRangeOnce(
      adapted,
      'function renderForgePreview(){',
      'function recruitCost(',
      ADAPTED_FORGE_PREVIEW,
      'Schmiedevorschau-Präsentation'
    );
    adapted = this.replaceRangeOnce(
      adapted,
      'function renderForgeJob(){',
      'function getWeaponEquipLocation(',
      ADAPTED_FORGE_JOBS,
      'Schmiedeauftrag-Präsentation'
    );
    return adapted;
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
