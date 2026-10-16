import { Injectable } from '@angular/core';

const RESOURCE_HEADER_RENDER = `function renderResourceHeader(){
  const resourcePresentation=window.NoBrainerResourcePresentationCompatibility;
  if(!resourcePresentation)throw new Error("NoBrainer-Ressourcen-Präsentationsbrücke fehlt.");
  resourcePresentation.render();
}`;

const LEGACY_RESOURCE_HEADER = `  document.getElementById("gold").textContent=formatHighestCurrency(state.gold);
  const total=Object.values(state.inventory).reduce((s,x)=>s+x.qty,0);document.getElementById("matCount").textContent=total;`;

@Injectable({ providedIn: 'root' })
export class LegacyResourcePresentationAdapterService {
  adapt(source: string): string {
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
