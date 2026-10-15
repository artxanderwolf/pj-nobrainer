import { Injectable } from '@angular/core';

const LEGACY_RUNTIME_REGISTRATION = `function prepareGameRuntime(){
  loadGame();
  updateEnergy();
  updateForgeJob();
  updateMarketJob();
  updateDungeonAutomation();
  updateEnergy();
}

window.NoBrainerLegacyRuntime={
  configureSaveStorage,
  prepare:prepareGameRuntime,
  tick:gameTick,
  renderInitial:render,
  save:saveGame,
  resetSave
};`;

const ANGULAR_RUNTIME_REGISTRATION = `function prepareGameRuntime(){
  loadGame();
}

const runtimeBootstrap=window.NoBrainerRuntimeBootstrap;
if(!runtimeBootstrap||typeof runtimeBootstrap.register!=="function")throw new Error("NoBrainer-Runtime-Bootstrap wurde nicht registriert.");
runtimeBootstrap.register({
  configureSaveStorage,
  prepare:prepareGameRuntime,
  renderForgeJob,
  renderMarketJob,
  renderForgePreview,
  renderMarketMaterials,
  renderMarketWeapons,
  renderInventoryState:()=>{
    renderResourceHeader();
    renderMaterialStorage();
    renderForgePreview();
    renderMarketMaterials();
  },
  refreshGold:()=>{
    const goldEl=document.getElementById("gold");
    if(goldEl)goldEl.textContent=formatHighestCurrency(state.gold);
  },
  shouldAutoSave:now=>!saveUnavailable&&now-lastAutoSaveAt>=10000,
  renderInitial:render,
  save:saveGame,
  resetSave
});`;

@Injectable({ providedIn: 'root' })
export class LegacyRuntimeRegistrationAdapterService {
  adapt(source: string): string {
    const first = source.indexOf(LEGACY_RUNTIME_REGISTRATION);
    if (first < 0) {
      throw new Error('Legacy-Kompatibilität fehlgeschlagen: Runtime-Registrierung wurde nicht gefunden.');
    }
    if (source.indexOf(LEGACY_RUNTIME_REGISTRATION, first + LEGACY_RUNTIME_REGISTRATION.length) >= 0) {
      throw new Error('Legacy-Kompatibilität fehlgeschlagen: Runtime-Registrierung ist nicht eindeutig.');
    }

    return source.slice(0, first) + ANGULAR_RUNTIME_REGISTRATION + source.slice(first + LEGACY_RUNTIME_REGISTRATION.length);
  }
}
