import { Injectable } from '@angular/core';
import { CONFIG, rarityFactor, reinforcementEffectText } from '../game/game-core';
import { createWeaponPresentationCore, type WeaponPresentationCoreBridge } from '../game/weapon-presentation-core';

declare global {
  interface Window {
    NoBrainerWeaponPresentationCore?: WeaponPresentationCoreBridge;
  }
}

const WEAPON_PRESENTATION_CORE_BRIDGE = createWeaponPresentationCore({
  resolveFormName: (weaponForm, starter) =>
    CONFIG.forge.weaponForms[weaponForm ?? '']?.name ?? (starter ? 'Einhänder' : 'Waffe'),
  rarityFactor,
  reinforcementEffectText
});

const ADAPTED_WEAPON_CARD_PRESENTATION = `function rarityLabelForWeapon(w){
  return window.NoBrainerWeaponPresentationCore.getRarityLabel(w);
}
function formatDiff(v,b,p=false){
  const diff=window.NoBrainerWeaponPresentationCore.getComparisonPresentation(Number(v)||0,b,p);
  if(!diff)return "";
  return \` <span class="weapon-diff \${diff.tone}">\${diff.text}</span>\`;
}
function weaponCardHtml(w,o={}){
  const presentation=window.NoBrainerWeaponPresentationCore.getWeaponCardPresentation(w,o.compare||null);
  const statHtml=presentation.stats.map(stat=>{
    const value=stat.value.kind==="currency"?formatCurrencyNickel(stat.value.nickel):stat.value.text;
    const diff=stat.diff?\` <span class="weapon-diff \${stat.diff.tone}">\${stat.diff.text}</span>\`:"";
    return \`<div class="weapon-stat"><span>\${stat.label}</span><b>\${value}\${diff}</b></div>\`;
  }).join("");
  return \`<div class="weapon-card"><div class="weapon-card-head"><div><div class="weapon-card-title">\${presentation.title}</div><div class="weapon-card-sub">\${presentation.formName} · \${presentation.rarityLabel}\${presentation.reinforcementText?\` · \${presentation.reinforcementText}\`:""}</div></div>\${o.status?\`<span class="tag fixed">\${o.status}</span>\`:""}</div><div class="weapon-stats">\${statHtml}</div>\${o.actions||""}</div>\`;
}

`;

const WEAPON_INVENTORY_BRIDGE = `function renderWeaponInventory(){
  const weaponInventoryPresentation=window.NoBrainerWeaponInventoryPresentationCompatibility;
  if(!weaponInventoryPresentation)throw new Error("NoBrainer-Waffenlager-Präsentationsbrücke fehlt.");
  weaponInventoryPresentation.render();
}

`;

@Injectable({ providedIn: 'root' })
export class LegacyWeaponPresentationAdapterService {
  adapt(source: string): string {
    window.NoBrainerWeaponPresentationCore = WEAPON_PRESENTATION_CORE_BRIDGE;
    let adapted = this.replaceRangeOnce(
      source,
      'function rarityLabelForWeapon(',
      'function weaponPickerKey(',
      ADAPTED_WEAPON_CARD_PRESENTATION,
      'Waffenkarten-Präsentation'
    );
    adapted = this.replaceRangeOnce(
      adapted,
      'function renderWeaponInventory(',
      'function displayVal(',
      WEAPON_INVENTORY_BRIDGE,
      'Waffenlager-Präsentation'
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
    return source.slice(0, start) + replacement + source.slice(end);
  }
}
