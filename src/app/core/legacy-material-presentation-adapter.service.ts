import { Injectable } from '@angular/core';
import {
  MATERIAL_PRESENTATION_CORE_BRIDGE,
  type MaterialPresentationCoreBridge
} from '../game/material-presentation-core';
import { GameMaterialStoragePresentationService } from './game-material-storage-presentation.service';

declare global {
  interface Window {
    NoBrainerMaterialPresentationCore?: MaterialPresentationCoreBridge;
  }
}

const DISPLAY_VALUE_BRIDGE = `function displayVal(v,kind="number"){
  return window.NoBrainerMaterialPresentationCore.formatMaterialValue(v,kind);
}`;

const MATERIAL_INDEX_BRIDGE = `function renderMaterialIndex(){
  const body=document.getElementById("materialIndexRows");
  if(!body)return;
  body.innerHTML="";
  Object.entries(MATERIALS).forEach(([name,m])=>{
    const presentation=window.NoBrainerMaterialPresentationCore.getMaterialIndexRowPresentation(name,m,reinforcementEffectText(name),getDungeonMaterialChance(1,name));
    const tr=document.createElement("tr");
    tr.innerHTML="<td>"+presentation.category+"</td>"+
      "<td><strong>"+presentation.name+"</strong></td>"+
      "<td class='rarity'>"+presentation.rarityText+"</td>"+
      "<td>"+presentation.baseDamageText+"</td>"+
      "<td>"+presentation.baseSpeedText+"</td>"+
      "<td>"+presentation.bladeText+"</td>"+
      "<td>"+presentation.penetrationText+"</td>"+
      "<td>"+presentation.gripSpeedText+"</td>"+
      "<td>"+presentation.hitChanceText+"</td>"+
      "<td>"+presentation.reinforcementText+"</td>"+
      "<td>"+presentation.dungeonChanceText+"</td>";
    body.appendChild(tr);
  });
}`;

const MATERIAL_STORAGE_BRIDGE = `function renderMaterialStorage(){
  const presentation=window.NoBrainerMaterialStoragePresentationCompatibility;
  if(!presentation||typeof presentation.render!=="function")throw new Error("NoBrainer-Materiallager-Präsentationsbrücke wurde nicht registriert.");
  presentation.render();
}`;

@Injectable({ providedIn: 'root' })
export class LegacyMaterialPresentationAdapterService {
  constructor(private readonly materialStoragePresentation: GameMaterialStoragePresentationService) {}

  adapt(source: string): string {
    window.NoBrainerMaterialPresentationCore = MATERIAL_PRESENTATION_CORE_BRIDGE;
    this.materialStoragePresentation.openLegacyCompatibilityBridge();

    let adapted = this.replaceRangeOnce(
      source,
      'function displayVal(',
      'function renderMaterialIndex(',
      DISPLAY_VALUE_BRIDGE,
      'Materialwert-Formatierung'
    );
    adapted = this.replaceRangeOnce(
      adapted,
      'function renderMaterialIndex(',
      'function rarityFactorFromRarity(',
      MATERIAL_INDEX_BRIDGE,
      'Materialindex-Präsentation'
    );
    adapted = this.replaceRangeOnce(
      adapted,
      '  const tbody=document.getElementById("inventoryRows");tbody.innerHTML="";',
      '  renderForgePreview();',
      '  renderMaterialStorage();',
      'Materiallager-Präsentation'
    );
    adapted = this.replaceRangeOnce(
      adapted,
      'function render(){',
      '  updateEnergy();',
      `${MATERIAL_STORAGE_BRIDGE}\n\nfunction render(){`,
      'Materiallager-Renderfunktion'
    );
    return adapted;
  }

  private replaceRangeOnce(source: string, startMarker: string, endMarker: string, replacement: string, label: string): string {
    const start = source.indexOf(startMarker);
    if (start < 0) throw new Error(`Legacy-Kompatibilität fehlgeschlagen: ${label} wurde nicht gefunden.`);
    if (source.indexOf(startMarker, start + startMarker.length) >= 0) {
      throw new Error(`Legacy-Kompatibilität fehlgeschlagen: ${label} ist nicht eindeutig.`);
    }
    const end = source.indexOf(endMarker, start + startMarker.length);
    if (end < 0) throw new Error(`Legacy-Kompatibilität fehlgeschlagen: Endanker für ${label} wurde nicht gefunden.`);
    return source.slice(0, start) + replacement + '\n\n' + source.slice(end);
  }
}
