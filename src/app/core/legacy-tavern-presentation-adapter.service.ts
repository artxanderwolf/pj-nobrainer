import { Injectable } from '@angular/core';
import {
  TAVERN_PRESENTATION_CORE_BRIDGE,
  type TavernPresentationCoreBridge
} from '../game/tavern-presentation-core';

declare global {
  interface Window {
    NoBrainerTavernPresentationCore?: TavernPresentationCoreBridge;
  }
}

const ADAPTED_TAVERN = `function renderTavern(){
  const offer=document.getElementById("tavernOffer"),cap=document.getElementById("tavernCapacity"),summary=document.getElementById("baseTavernSummary");
  const presentation=window.NoBrainerTavernPresentationCore.getTavernPresentation(Object.values(CHARACTER_CLASSES),state.characters.length,state.upgrades.innCapacity,state.gold,recruitCost());
  const renderStats=stats=>stats.map(stat=>\`<div class="stat"><span>\${stat.label}</span><b>\${stat.value}</b></div>\`).join("");
  if(summary)summary.innerHTML=\`<div class="statrow">\${renderStats(presentation.summaryStats)}</div>\`;
  if(offer)offer.innerHTML=presentation.offers.map(entry=>\`<div class="tavern-offer"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><strong>\${entry.name}</strong><span class="tag fixed">\${entry.roleTag}</span></div><div class="statrow">\${renderStats(entry.stats)}</div><div class="actions"><button class="btn primary" onclick="recruitCharacter('\${entry.classId}')" \${entry.disabled?"disabled":""}>\${entry.recruitLabel}</button></div></div>\`).join("")+(presentation.statusText?\`<p class="status-line">\${presentation.statusText}</p>\`:"");
  if(cap)cap.innerHTML=\`<div class="statrow">\${renderStats(presentation.capacityStats)}</div><div class="actions"><button class="btn" onclick="go('base')">\${presentation.openInnLabel}</button></div>\`;
}
`;

@Injectable({ providedIn: 'root' })
export class LegacyTavernPresentationAdapterService {
  adapt(source: string): string {
    window.NoBrainerTavernPresentationCore = TAVERN_PRESENTATION_CORE_BRIDGE;
    return this.replaceRangeOnce(
      source,
      'function renderTavern(){',
      'function upgradeCost(kind,current){',
      ADAPTED_TAVERN,
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
