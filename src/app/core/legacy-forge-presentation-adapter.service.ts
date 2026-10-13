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

@Injectable({ providedIn: 'root' })
export class LegacyForgePresentationAdapterService {
  adapt(source: string): string {
    window.NoBrainerForgePresentationCore = FORGE_PRESENTATION_CORE_BRIDGE;
    return this.replaceRangeOnce(
      source,
      'function renderForgePreview(){',
      'function recruitCost(',
      ADAPTED_FORGE_PREVIEW,
      'Schmiedevorschau-Präsentation'
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
