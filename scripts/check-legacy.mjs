import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

const html = readFileSync('NoBrainer_GitHub_v0.12.2.html', 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);

if (!match) {
  throw new Error('Legacy-JavaScript konnte nicht aus der HTML-Datei extrahiert werden.');
}

const source = match[1];
new Script(source, { filename: 'NoBrainer_GitHub_v0.12.2.legacy.js' });

const requiredSnippets = [
  'function displayVal(',
  'function getMaterialsForCategories(',
  'function gameTick(',
  'function updateEnergy(',
  'function updateForgeJob(',
  'function updateMarketJob(',
  'function updateDungeonAutomation(',
  '!state.dungeonAuto && !state.dungeonRun && !state.dungeonLootCollect',
  'setInterval(gameTick,250);'
];

for (const snippet of requiredSnippets) {
  if (!source.includes(snippet)) {
    throw new Error(`Legacy-Invariante fehlt: ${snippet}`);
  }
}

const saveDeclarations = `const SAVE_KEY="nobrainer_save_v1";
const SAVE_VERSION=8;
let saveTimer=null;
let saveUnavailable=false;
let lastAutoSaveAt=0;`;
const saveDeclarationsWithAdapter = `${saveDeclarations}
let saveStorage={
  read:()=>localStorage.getItem(SAVE_KEY),
  write:value=>localStorage.setItem(SAVE_KEY,value),
  remove:()=>localStorage.removeItem(SAVE_KEY)
};

function configureSaveStorage(adapter){
  if(!adapter || typeof adapter.read!=="function" || typeof adapter.write!=="function" || typeof adapter.remove!=="function")throw new Error("Ungültiger Save-Storage-Adapter.");
  saveStorage=adapter;
}`;
const startupBlock = `loadGame();
updateEnergy();
updateForgeJob();
updateMarketJob();
updateDungeonAutomation();

// Timer zuerst registrieren: Ein Fehler im anschließenden UI-Render darf
// die Zeitlogik nicht mehr komplett deaktivieren.
setInterval(gameTick,250);
render();`;
const runtimeBridge = `function prepareGameRuntime(){
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

function replaceRangeOnce(text, startMarker, endMarker, replacement, label) {
  const start = text.indexOf(startMarker);
  if (start < 0 || text.indexOf(startMarker, start + startMarker.length) >= 0) {
    throw new Error(`Game-Core-Adapteranker ungültig: ${label}.`);
  }
  const end = text.indexOf(endMarker, start + startMarker.length);
  if (end < 0) {
    throw new Error(`Game-Core-Endanker fehlt: ${label}.`);
  }
  return text.slice(0, start) + replacement + text.slice(end);
}

let adapted = source;
adapted = replaceRangeOnce(adapted, 'const CONFIG = {', 'function getCharacterClass(c){', `if(!window.NoBrainerGameCore)throw new Error("NoBrainer-Game-Core wurde nicht registriert.");\nconst CONFIG=window.NoBrainerGameCore.CONFIG;\nconst CHARACTER_CLASSES=window.NoBrainerGameCore.CHARACTER_CLASSES;\n\n`, 'Konfiguration und Klassen');
adapted = replaceRangeOnce(adapted, 'const MATERIAL_SALE_RARITY_BONUS=', 'function findWeakestStarterSlots(){', `const MATERIAL_SALE_RARITY_BONUS=window.NoBrainerGameCore.MATERIAL_SALE_RARITY_BONUS;\nconst MATERIALS=window.NoBrainerGameCore.MATERIALS;\n\n`, 'Materialdaten');
adapted = replaceRangeOnce(adapted, 'const DUNGEON_LOOT_TABLES={', 'const titles = {', `const DUNGEON_LOOT_TABLES=window.NoBrainerGameCore.DUNGEON_LOOT_TABLES;\n\n`, 'Dungeon-Lootdaten');
adapted = replaceRangeOnce(adapted, 'function weaponDamageAfterArmor(', 'function getCharacterById(', `function weaponDamageAfterArmor(weapon,enemyArmor=CONFIG.dungeon.enemyArmor,character=null){\n  return window.NoBrainerGameCore.weaponDamageAfterArmor(weapon,enemyArmor,character);\n}\n\n`, 'Rüstungsberechnung');
adapted = replaceRangeOnce(adapted, 'function normalizeWeaponSlots(', 'function rarityFactor(', `function normalizeWeaponSlots(slots){\n  return window.NoBrainerGameCore.normalizeWeaponSlots(slots);\n}\n\n`, 'Waffenslot-Normalisierung');
adapted = replaceRangeOnce(adapted, 'function rarityFactor(', 'function reinforcementEffectText(', `function rarityFactor(slots){\n  return window.NoBrainerGameCore.rarityFactor(slots);\n}\n\n`, 'Seltenheitsberechnung');
adapted = replaceRangeOnce(adapted, 'function reinforcementEffectText(', 'function requirements(', `function reinforcementEffectText(materialName){\n  return window.NoBrainerGameCore.reinforcementEffectText(materialName);\n}\n\n`, 'Verstärkungstext');
adapted = replaceRangeOnce(adapted, 'function calculateWeaponStats(', 'function forgePreview(', `function calculateWeaponStats(slots,weaponType){\n  return window.NoBrainerGameCore.calculateWeaponStats(slots,weaponType);\n}\n\n`, 'Waffenwertberechnung');

adapted = adapted
  .replace(saveDeclarations, saveDeclarationsWithAdapter)
  .replace('const raw=localStorage.getItem(SAVE_KEY);', 'const raw=saveStorage.read();')
  .replace(
    'localStorage.setItem(SAVE_KEY,JSON.stringify({saveVersion:SAVE_VERSION,savedAt,state}));',
    'saveStorage.write(JSON.stringify({saveVersion:SAVE_VERSION,savedAt,state}));'
  )
  .replace('try{localStorage.removeItem(SAVE_KEY);}catch(err){}', 'try{saveStorage.remove();}catch(err){}')
  .replace(startupBlock, runtimeBridge);

new Script(adapted, { filename: 'NoBrainer_GitHub_v0.12.2.adapted.js' });

if (!adapted.includes('window.NoBrainerLegacyRuntime=')) {
  throw new Error('Der Angular-Runtime-Bridge konnte nicht erzeugt werden.');
}
if (!adapted.includes('window.NoBrainerGameCore.calculateWeaponStats')) {
  throw new Error('Der Game-Core-Bridge konnte nicht erzeugt werden.');
}
if (adapted.includes('setInterval(gameTick,250);')) {
  throw new Error('Der Legacy-Timer wurde beim Kompatibilitätscheck nicht entfernt.');
}
if (adapted.includes('const CONFIG = {') || adapted.includes('const MATERIALS={')) {
  throw new Error('Statische Game-Core-Daten verblieben unerwartet im adaptierten Legacy-Code.');
}

console.log('Legacy-Syntax, Runtime-/Game-Core-Adapter und kritische Invarianten sind in Ordnung.');
