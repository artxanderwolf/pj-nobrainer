import { Injectable } from '@angular/core';
import {
  COMBAT_LOG_PRESENTATION_CORE_BRIDGE,
  type CombatLogPresentationCoreBridge
} from '../game/combat-log-presentation-core';

declare global {
  interface Window {
    NoBrainerCombatLogPresentationCore?: CombatLogPresentationCoreBridge;
  }
}

const ADAPTED_ADD_LOG = `function addLog(text, cls=""){
  const log=document.getElementById("combatLog");if(!log)return;
  const first=log.firstElementChild;
  const presentation=window.NoBrainerCombatLogPresentationCore.getCombatLogEntryPresentation(text,cls,{
    childCount:log.children.length,
    firstChildClassName:first?.className||"",
    firstChildText:first?.textContent||""
  });
  if(presentation.clearPlaceholder)log.innerHTML="";
  const row=document.createElement("div");
  row.className=presentation.className;
  row.textContent=presentation.text;
  log.prepend(row);
}
`;

@Injectable({ providedIn: 'root' })
export class LegacyCombatLogPresentationAdapterService {
  adapt(source: string): string {
    window.NoBrainerCombatLogPresentationCore = COMBAT_LOG_PRESENTATION_CORE_BRIDGE;
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
