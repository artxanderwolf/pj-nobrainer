import { Injectable } from '@angular/core';

const LEGACY_GAME_TICK_BLOCK = `function gameTick(){
  updateEnergy();
  const forgeCompleted=updateForgeJob();
  const marketCompleted=updateMarketJob();
  updateDungeonAutomation();

  renderForgeJob();
  renderMarketJob();
  renderDungeonStatus();
  renderDungeonLoot();
  renderCharacter("teamCard");

  // Kapazitätsabhängige Bedienelemente sofort freigeben, sobald ein Auftrag endet.
  // Dadurch muss die Seite nicht mehr verlassen und erneut geöffnet werden.
  if(forgeCompleted){
    renderForgePreview();
    renderWeaponInventory();
  }
  if(marketCompleted){
    renderMarketMaterials();
    renderMarketWeapons();
    const goldEl=document.getElementById("gold");
    if(goldEl)goldEl.textContent=formatHighestCurrency(state.gold);
  }

  const rosterRoot=document.getElementById("rosterCard");
  const rosterIsBeingUsed=rosterRoot&&rosterRoot.contains(document.activeElement);
  if(!rosterIsBeingUsed&&!openWeaponPickerHand)renderCharacter("rosterCard");
  if(!saveUnavailable&&Date.now()-lastAutoSaveAt>=10000)saveGame(false);
}`;

@Injectable({ providedIn: 'root' })
export class LegacyGameTickAdapterService {
  adapt(source: string): string {
    const first = source.indexOf(LEGACY_GAME_TICK_BLOCK);
    if (first < 0) {
      throw new Error('Legacy-Kompatibilität fehlgeschlagen: gameTick wurde nicht gefunden.');
    }
    if (source.indexOf(LEGACY_GAME_TICK_BLOCK, first + LEGACY_GAME_TICK_BLOCK.length) >= 0) {
      throw new Error('Legacy-Kompatibilität fehlgeschlagen: gameTick ist nicht eindeutig.');
    }

    return source.slice(0, first) + source.slice(first + LEGACY_GAME_TICK_BLOCK.length);
  }
}
