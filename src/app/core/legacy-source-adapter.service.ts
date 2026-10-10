import { Injectable } from '@angular/core';

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

@Injectable({ providedIn: 'root' })
export class LegacySourceAdapterService {
  adapt(source: string): string {
    let adapted = this.replaceOnce(source, SAVE_DECLARATIONS, SAVE_DECLARATIONS_WITH_ADAPTER, 'Save-Deklarationen');
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
