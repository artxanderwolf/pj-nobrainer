import { Injectable } from '@angular/core';
import {
  PROGRESSION_PRESENTATION_CORE_BRIDGE,
  type ProgressionPresentationCoreBridge
} from '../game/progression-presentation-core';

declare global {
  interface Window {
    NoBrainerProgressionPresentationCore?: ProgressionPresentationCoreBridge;
  }
}

const ADAPTED_UPGRADE_CARDS = `function renderUpgradeCards(){
  const presentation=window.NoBrainerProgressionPresentationCore.getUpgradeCardsPresentation({
    characterCount:state.characters.length,
    innCapacity:state.upgrades.innCapacity,
    forgeJobCount:state.forgeJobs.length,
    forgeSlotCapacity:state.upgrades.forgeSlots,
    forgeQueueCount:state.forgeQueue.length,
    forgeQueueCapacity:state.upgrades.forgeQueue,
    marketJobCount:state.marketJobs.length,
    marketSlotCapacity:state.upgrades.marketSlots,
    marketQueueCount:state.marketQueue.length,
    marketQueueCapacity:state.upgrades.marketQueue,
    offers:{
      inn:window.NoBrainerProgressionCore.getUpgradeOffer(state,"inn"),
      forgeSlots:window.NoBrainerProgressionCore.getUpgradeOffer(state,"forgeSlots"),
      forgeQueue:window.NoBrainerProgressionCore.getUpgradeOffer(state,"forgeQueue"),
      marketSlots:window.NoBrainerProgressionCore.getUpgradeOffer(state,"marketSlots"),
      marketQueue:window.NoBrainerProgressionCore.getUpgradeOffer(state,"marketQueue")
    }
  },formatCurrencyNickel);
  const renderStats=stats=>stats.map(stat=>\`<div class="stat"><span>\${stat.label}</span><b>\${stat.value}</b></div>\`).join("");
  const renderButtons=buttons=>buttons.map(button=>\`<button class="\${button.primary?"btn primary":"btn"}" onclick="buyUpgrade('\${button.kind}')" \${button.disabled?"disabled":""}>\${button.text}</button>\`).join("");
  const inn=document.getElementById("innUpgradeCard");
  if(inn)inn.innerHTML=\`<div class="statrow">\${renderStats(presentation.inn.stats)}</div><div class="actions">\${renderButtons(presentation.inn.buttons)}</div>\${presentation.inn.note?\`<p class="muted small">\${presentation.inn.note}</p>\`:""}\`;
  const f=document.getElementById("forgeUpgradeCard");
  if(f)f.innerHTML=\`<div class="statrow">\${renderStats(presentation.forge.stats)}</div><div class="actions">\${renderButtons(presentation.forge.buttons)}</div>\`;
  const m=document.getElementById("marketUpgradeCard");
  if(m)m.innerHTML=\`<div class="statrow">\${renderStats(presentation.market.stats)}</div><div class="actions">\${renderButtons(presentation.market.buttons)}</div>\`;
}
`;

@Injectable({ providedIn: 'root' })
export class LegacyProgressionPresentationAdapterService {
  adapt(source: string): string {
    window.NoBrainerProgressionPresentationCore = PROGRESSION_PRESENTATION_CORE_BRIDGE;
    return this.replaceRangeOnce(
      source,
      'function upgradeButton(kind,stateKey,cfgKey,label){',
      'function startForgeJob(){',
      ADAPTED_UPGRADE_CARDS,
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
