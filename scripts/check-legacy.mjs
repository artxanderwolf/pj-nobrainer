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

let adapted = source
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
if (adapted.includes('setInterval(gameTick,250);')) {
  throw new Error('Der Legacy-Timer wurde beim Kompatibilitätscheck nicht entfernt.');
}

console.log('Legacy-Syntax, Migration-Adapter und kritische Invarianten sind in Ordnung.');
