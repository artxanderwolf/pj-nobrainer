import { Injectable } from '@angular/core';
import {
  FORGE_PRESENTATION_CORE_BRIDGE,
  type ForgePresentationCoreBridge
} from '../game/forge-presentation-core';

declare global {
  interface Window {
    NoBrainerForgePresentationCore?: ForgePresentationCoreBridge;
  }
}

const ADAPTED_FORGE_PREVIEW = `function renderForgePreview(){
  if(!document.getElementById("forgeStartBtn"))return;
  populateForgeSelects();

  const preview=forgePreview();
  const allSelected=preview.slots.every(slot=>slot.material);
  const required=requirements(preview.slots);
  const presentation=window.NoBrainerForgePresentationCore.getForgePreviewPresentation({
    complete:allSelected,
    hasMaterials:hasMaterials(required),
    hasCapacity:state.forgeJobs.length+state.forgeQueue.length<state.upgrades.forgeSlots+state.upgrades.forgeQueue,
    seconds:preview.seconds,
    valueNickel:preview.valueNickel,
    factor:preview.factor,
    stats:preview.stats,
    reinforcementMaterial:preview.slots.find(slot=>slot.slot==="reinforcementMaterial")?.material||null
  },formatCurrencyNickel,reinforcementEffectText);

  document.getElementById("forgeTimePreview").textContent=presentation.timeText;
  document.getElementById("forgeValuePreview").textContent=presentation.valueText;
  document.getElementById("forgeDamagePreview").textContent=presentation.damageText;
  const damageInfo=document.getElementById("forgeDamageBaseInfo");
  if(damageInfo)damageInfo.textContent=presentation.damageBaseInfo;
  document.getElementById("forgeSpeedPreview").textContent=presentation.speedText;
  const speedInfo=document.getElementById("forgeSpeedBaseInfo");
  if(speedInfo)speedInfo.textContent=presentation.speedBaseInfo;
  document.getElementById("forgeHitPreview").textContent=presentation.hitText;
  document.getElementById("forgeRawPreview").textContent=presentation.rawText;
  document.getElementById("forgePenPreview").textContent=presentation.penetrationText;
  document.getElementById("forgeRarityPreview").textContent=presentation.rarityText;
  const reinforcementPreview=document.getElementById("forgeReinforcementPreview");
  if(reinforcementPreview)reinforcementPreview.textContent=presentation.reinforcementText;
  document.getElementById("forgeStartBtn").disabled=presentation.startDisabled;
}
`;

const ADAPTED_FORGE_JOBS = `function renderForgeJob(){
  const box=document.getElementById("forgeJobCard"),q=document.getElementById("forgeQueueCard"),now=Date.now();
  if(box){
    const jobs=state.forgeJobs.map((job,index)=>window.NoBrainerForgePresentationCore.getActiveForgeJobPresentation(job,index,now,formatCurrencyNickel,formatDuration));
    box.className=jobs.length?"":"empty";
    box.innerHTML=jobs.length?jobs.map(item=>\`<div class="sell-row"><div style="width:100%"><strong>\${item.title}</strong><p class="muted">\${item.remainingText}</p><div class="bar energy"><i style="width:\${item.progressPercent}%"></i></div><p>ROH <b>\${item.rawText}</b> · Wert <b>\${item.valueText}</b></p></div></div>\`).join(""):"Kein aktiver Schmiedeauftrag.";
  }
  if(q){
    const queue=state.forgeQueue.map((job,index)=>window.NoBrainerForgePresentationCore.getQueuedForgeJobPresentation(job,index,formatDuration));
    q.className=queue.length?"":"empty";
    q.innerHTML=queue.length?queue.map(item=>\`<div class="sell-row"><div><strong>\${item.title}</strong><div class="sell-meta">\${item.metaText}</div></div></div>\`).join(""):"Warteschlange leer.";
  }
  renderUpgradeCards();
}
`;

@Injectable({ providedIn: 'root' })
export class LegacyForgePresentationAdapterService {
  adapt(source: string): string {
    window.NoBrainerForgePresentationCore = FORGE_PRESENTATION_CORE_BRIDGE;
    let adapted = this.replaceRangeOnce(
      source,
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
