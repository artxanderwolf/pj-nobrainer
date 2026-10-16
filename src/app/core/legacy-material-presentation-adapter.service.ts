import { Injectable } from '@angular/core';

const MATERIAL_INDEX_BRIDGE = `function renderMaterialIndex(){
  const presentation=window.NoBrainerMaterialIndexPresentationCompatibility;
  if(!presentation||typeof presentation.render!=="function")throw new Error("NoBrainer-Materialindex-Präsentationsbrücke wurde nicht registriert.");
  presentation.render();
}`;

const MATERIAL_STORAGE_BRIDGE = `function renderMaterialStorage(){
  const presentation=window.NoBrainerMaterialStoragePresentationCompatibility;
  if(!presentation||typeof presentation.render!=="function")throw new Error("NoBrainer-Materiallager-Präsentationsbrücke wurde nicht registriert.");
  presentation.render();
}`;

@Injectable({ providedIn: 'root' })
export class LegacyMaterialPresentationAdapterService {
  adapt(source: string): string {
    let adapted = this.replaceRangeOnce(
      source,
      'function displayVal(',
      'function rarityFactorFromRarity(',
      MATERIAL_INDEX_BRIDGE,
      'Materialindex-Präsentation'
    );
    adapted = this.replaceRangeOnce(
      adapted,
      '  const tbody=document.getElementById("inventoryRows");tbody.innerHTML="";',
      '  renderForgePreview();',
      '  renderMaterialStorage();',
      'Materiallager-Präsentation'
    );
    adapted = this.replaceRangeOnce(
      adapted,
      'function render(){',
      '  updateEnergy();',
      `${MATERIAL_STORAGE_BRIDGE}\n\nfunction render(){`,
      'Materiallager-Renderfunktion'
    );
    return adapted;
  }

  private replaceRangeOnce(source: string, startMarker: string, endMarker: string, replacement: string, label: string): string {
    const start = source.indexOf(startMarker);
    if (start < 0) throw new Error(`Legacy-Kompatibilität fehlgeschlagen: ${label} wurde nicht gefunden.`);
    if (source.indexOf(startMarker, start + startMarker.length) >= 0) {
      throw new Error(`Legacy-Kompatibilität fehlgeschlagen: ${label} ist nicht eindeutig.`);
    }
    const end = source.indexOf(endMarker, start + startMarker.length);
    if (end < 0) throw new Error(`Legacy-Kompatibilität fehlgeschlagen: Endanker für ${label} wurde nicht gefunden.`);
    return source.slice(0, start) + replacement + '\n\n' + source.slice(end);
  }
}
