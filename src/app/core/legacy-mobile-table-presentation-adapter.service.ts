import { Injectable } from '@angular/core';
import {
  MOBILE_TABLE_PRESENTATION_CORE_BRIDGE,
  type MobileTablePresentationCoreBridge
} from '../game/mobile-table-presentation-core';

declare global {
  interface Window {
    NoBrainerMobileTablePresentationCore?: MobileTablePresentationCoreBridge;
  }
}

const ADAPTED_MOBILE_TABLE_LABELS = `function prepareMobileTableLabels(){
  document.querySelectorAll(".mobile-stack table").forEach(table=>{
    const headers=[...table.querySelectorAll("thead th")].map(x=>x.textContent||"");
    table.querySelectorAll("tbody tr").forEach(tr=>{
      const cells=[...tr.children];
      const presentation=window.NoBrainerMobileTablePresentationCore.getMobileTableLabelPresentation(headers,cells.length);
      cells.forEach((cell,i)=>{const label=presentation.labels[i];if(label)cell.dataset.label=label;});
    });
  });
}
`;

@Injectable({ providedIn: 'root' })
export class LegacyMobileTablePresentationAdapterService {
  adapt(source: string): string {
    window.NoBrainerMobileTablePresentationCore = MOBILE_TABLE_PRESENTATION_CORE_BRIDGE;
    return this.replaceRangeOnce(
      source,
      'function prepareMobileTableLabels(){',
      'function go(page){',
      ADAPTED_MOBILE_TABLE_LABELS + '\n',
      'Mobile-Tabellen-Präsentation'
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
