import { Injectable } from '@angular/core';
import {
  RESOURCE_PRESENTATION_CORE_BRIDGE,
  type ResourcePresentationCoreBridge
} from '../game/resource-presentation-core';

declare global {
  interface Window {
    NoBrainerResourcePresentationCore?: ResourcePresentationCoreBridge;
  }
}

const RESOURCE_HEADER_RENDER = `function renderResourceHeader(){
  const presentation=window.NoBrainerResourcePresentationCore.getResourceHeaderPresentation(state.gold,state.inventory,formatHighestCurrency);
  const gold=document.getElementById("gold"),materials=document.getElementById("matCount");
  if(gold)gold.textContent=presentation.goldText;
  if(materials)materials.textContent=presentation.materialCountText;
}`;

const LEGACY_RESOURCE_HEADER = `  document.getElementById("gold").textContent=formatHighestCurrency(state.gold);
  const total=Object.values(state.inventory).reduce((s,x)=>s+x.qty,0);document.getElementById("matCount").textContent=total;`;

@Injectable({ providedIn: 'root' })
export class LegacyResourcePresentationAdapterService {
  adapt(source: string): string {
    window.NoBrainerResourcePresentationCore = RESOURCE_PRESENTATION_CORE_BRIDGE;

    let adapted = this.replaceOnce(
      source,
      'function render(){',
      `${RESOURCE_HEADER_RENDER}\n\nfunction render(){`,
      'Ressourcen-Kopfzeilen-Renderfunktion'
    );
    adapted = this.replaceOnce(
      adapted,
      LEGACY_RESOURCE_HEADER,
      '  renderResourceHeader();',
      'Ressourcen-Kopfzeilen-Präsentation'
    );
    return adapted;
  }

  private replaceOnce(source: string, search: string, replacement: string, label: string): string {
    const first = source.indexOf(search);
    if (first < 0) throw new Error(`Legacy-Kompatibilität fehlgeschlagen: ${label} wurde nicht gefunden.`);
    if (source.indexOf(search, first + search.length) >= 0) {
      throw new Error(`Legacy-Kompatibilität fehlgeschlagen: ${label} ist nicht eindeutig.`);
    }
    return source.slice(0, first) + replacement + source.slice(first + search.length);
  }
}
