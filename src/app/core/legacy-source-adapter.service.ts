import { Injectable } from '@angular/core';
import { GAME_CORE_BRIDGE, GameCoreBridge } from '../game/game-core';

declare global {
  interface Window {
    NoBrainerGameCore?: GameCoreBridge;
  }
}

const SAVE_DECLARATIONS = `const SAVE_KEY="nobrainer_save_v1";
const SAVE_VERSION=8;
let saveTimer=null;
let saveUnavailable=false;
let lastAutoSaveAt=0;`;

const SAVE_DECLARATIONS_WITH_ADAPTER = `${SAVE_DECLARATIONS}
let saveStorage={
  read:()=>localStorage.getItem(SAVE_KEY),
  write:value=>localStorage.setItem(SAVE_KEY,value),
  remove:()=>localStorage.removeItem(SAVE_KEY)
};

function configureSaveStorage(adapter){
  if(!adapter || typeof adapter.read!=="function" || typeof adapter.write!=="function" || typeof adapter.remove!=="function")throw new Error("Ungültiger Save-Storage-Adapter.");
  saveStorage=adapter;
}`;

const STARTUP_BLOCK = `loadGame();
updateEnergy();
updateForgeJob();
updateMarketJob();
updateDungeonAutomation();

// Timer zuerst registrieren: Ein Fehler im anschließenden UI-Render darf
// die Zeitlogik nicht mehr komplett deaktivieren.
setInterval(gameTick,250);
render();`;

const RUNTIME_BRIDGE = `function prepareGameRuntime(){
  loadGame();
  updateEnergy();
  updateForgeJob();
  updateMarketJob();
  updateDungeonAutomation();
}

window.NoBrainerLegacyRuntime={
  configureSaveStorage,
  prepare:prepareGameRuntime,
  tick:gameTick,
  renderInitial:render,
  save:saveGame,
  resetSave
};`;

const CORE_DATA_BRIDGE = `if(!window.NoBrainerGameCore)throw new Error("NoBrainer-Game-Core wurde nicht registriert.");
const CONFIG=window.NoBrainerGameCore.CONFIG;
const CHARACTER_CLASSES=window.NoBrainerGameCore.CHARACTER_CLASSES;

`;

const MATERIAL_DATA_BRIDGE = `const MATERIAL_SALE_RARITY_BONUS=window.NoBrainerGameCore.MATERIAL_SALE_RARITY_BONUS;
const MATERIALS=window.NoBrainerGameCore.MATERIALS;

`;

const LOOT_DATA_BRIDGE = `const DUNGEON_LOOT_TABLES=window.NoBrainerGameCore.DUNGEON_LOOT_TABLES;

`;

const WEAPON_DAMAGE_BRIDGE = `function weaponDamageAfterArmor(weapon,enemyArmor=CONFIG.dungeon.enemyArmor,character=null){
  return window.NoBrainerGameCore.weaponDamageAfterArmor(weapon,enemyArmor,character);
}

`;

const NORMALIZE_SLOTS_BRIDGE = `function normalizeWeaponSlots(slots){
  return window.NoBrainerGameCore.normalizeWeaponSlots(slots);
}

`;

const RARITY_FACTOR_BRIDGE = `function rarityFactor(slots){
  return window.NoBrainerGameCore.rarityFactor(slots);
}

`;

const REINFORCEMENT_TEXT_BRIDGE = `function reinforcementEffectText(materialName){
  return window.NoBrainerGameCore.reinforcementEffectText(materialName);
}

`;

const WEAPON_STATS_BRIDGE = `function calculateWeaponStats(slots,weaponType){
  return window.NoBrainerGameCore.calculateWeaponStats(slots,weaponType);
}

`;

@Injectable({ providedIn: 'root' })
export class LegacySourceAdapterService {
  adapt(source: string): string {
    window.NoBrainerGameCore = GAME_CORE_BRIDGE;
    let adapted = this.replaceRangeOnce(source, 'const CONFIG = {', 'function getCharacterClass(c){', CORE_DATA_BRIDGE, 'Konfiguration und Klassen');
    adapted = this.replaceRangeOnce(adapted, 'const MATERIAL_SALE_RARITY_BONUS=', 'function findWeakestStarterSlots(){', MATERIAL_DATA_BRIDGE, 'Materialdaten');
    adapted = this.replaceRangeOnce(adapted, 'const DUNGEON_LOOT_TABLES={', 'const titles = {', LOOT_DATA_BRIDGE, 'Dungeon-Lootdaten');
    adapted = this.replaceRangeOnce(adapted, 'function weaponDamageAfterArmor(', 'function getCharacterById(', WEAPON_DAMAGE_BRIDGE, 'Rüstungsberechnung');
    adapted = this.replaceRangeOnce(adapted, 'function normalizeWeaponSlots(', 'function rarityFactor(', NORMALIZE_SLOTS_BRIDGE, 'Waffenslot-Normalisierung');
    adapted = this.replaceRangeOnce(adapted, 'function rarityFactor(', 'function reinforcementEffectText(', RARITY_FACTOR_BRIDGE, 'Seltenheitsberechnung');
    adapted = this.replaceRangeOnce(adapted, 'function reinforcementEffectText(', 'function requirements(', REINFORCEMENT_TEXT_BRIDGE, 'Verstärkungstext');
    adapted = this.replaceRangeOnce(adapted, 'function calculateWeaponStats(', 'function forgePreview(', WEAPON_STATS_BRIDGE, 'Waffenwertberechnung');

    adapted = this.replaceOnce(adapted, SAVE_DECLARATIONS, SAVE_DECLARATIONS_WITH_ADAPTER, 'Save-Deklarationen');
    adapted = this.replaceOnce(adapted, 'const raw=localStorage.getItem(SAVE_KEY);', 'const raw=saveStorage.read();', 'Save-Laden');
    adapted = this.replaceOnce(
      adapted,
      'localStorage.setItem(SAVE_KEY,JSON.stringify({saveVersion:SAVE_VERSION,savedAt,state}));',
      'saveStorage.write(JSON.stringify({saveVersion:SAVE_VERSION,savedAt,state}));',
      'Save-Schreiben'
    );
    adapted = this.replaceOnce(adapted, 'try{localStorage.removeItem(SAVE_KEY);}catch(err){}', 'try{saveStorage.remove();}catch(err){}', 'Save-Zurücksetzen');
    adapted = this.replaceOnce(adapted, STARTUP_BLOCK, RUNTIME_BRIDGE, 'Runtime-Startblock');
    return adapted;
  }

  private replaceRangeOnce(source: string, startMarker: string, endMarker: string, replacement: string, label: string): string {
    const start = source.indexOf(startMarker);
    if (start < 0) {
      throw new Error(`Legacy-Kompatibilität fehlgeschlagen: Startanker für ${label} wurde nicht gefunden.`);
    }
    if (source.indexOf(startMarker, start + startMarker.length) >= 0) {
      throw new Error(`Legacy-Kompatibilität fehlgeschlagen: Startanker für ${label} ist nicht eindeutig.`);
    }

    const end = source.indexOf(endMarker, start + startMarker.length);
    if (end < 0) {
      throw new Error(`Legacy-Kompatibilität fehlgeschlagen: Endanker für ${label} wurde nicht gefunden.`);
    }
    return source.slice(0, start) + replacement + source.slice(end);
  }

  private replaceOnce(source: string, search: string, replacement: string, label: string): string {
    const first = source.indexOf(search);
    if (first < 0) {
      throw new Error(`Legacy-Kompatibilität fehlgeschlagen: ${label} wurde nicht gefunden.`);
    }
    if (source.indexOf(search, first + search.length) >= 0) {
      throw new Error(`Legacy-Kompatibilität fehlgeschlagen: ${label} ist nicht eindeutig.`);
    }
    return source.slice(0, first) + replacement + source.slice(first + search.length);
  }
}
