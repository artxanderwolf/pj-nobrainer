import { Injectable } from '@angular/core';

const ADAPTED_MARKET_PRESENTATION = `function getMarketPresentationCompatibility(){
  const presentation=window.NoBrainerMarketPresentationCompatibility;
  if(!presentation)throw new Error("NoBrainer-Markt-Präsentationsbrücke wurde nicht registriert.");
  return presentation;
}

function renderMarketJob(){getMarketPresentationCompatibility().renderJobs();}
function renderMarketMaterials(){getMarketPresentationCompatibility().renderMaterials();}
function renderMarketWeapons(){getMarketPresentationCompatibility().renderWeapons();}
`;

@Injectable({ providedIn: 'root' })
export class LegacyMarketPresentationAdapterService {
  adapt(source: string): string {
    return this.replaceRangeOnce(
      source,
      'function renderMarketJob(){',
      'function render(){',
      ADAPTED_MARKET_PRESENTATION,
      'Markt-Präsentation'
    );
  }

  private replaceRangeOnce(source: string, startMarker: string, endMarker: string, replacement: string, label: string): string {
    const start = source.indexOf(startMarker);
    if (start < 0) throw new Error(`Legacy-Kompatibilität fehlgeschlagen: Startanker für ${label} wurde nicht gefunden.`);
    if (source.indexOf(startMarker, start + startMarker.length) >= 0) throw new Error(`Legacy-Kompatibilität fehlgeschlagen: Startanker für ${label} ist nicht eindeutig.`);
    const end = source.indexOf(endMarker, start + startMarker.length);
    if (end < 0) throw new Error(`Legacy-Kompatibilität fehlgeschlagen: Endanker für ${label} wurde nicht gefunden.`);
    if (source.indexOf(endMarker, end + endMarker.length) >= 0) throw new Error(`Legacy-Kompatibilität fehlgeschlagen: Endanker für ${label} ist nicht eindeutig.`);
    return source.slice(0, start) + replacement + source.slice(end);
  }
}
