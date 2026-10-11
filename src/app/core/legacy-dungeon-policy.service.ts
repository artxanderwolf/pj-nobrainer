import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LegacyDungeonPolicyService {
  adapt(source: string): string {
    let adapted = this.applyEnergyPrecheck(source);
    adapted = this.applyManualSessionWaveCounter(adapted);
    return adapted;
  }

  private applyEnergyPrecheck(source: string): string {
    const oldBlock = `function beginDungeonSearch(at=Date.now()){
  if(!state.dungeonAuto||state.dungeonRun||state.dungeonLootCollect)return false;
  const participants=getAliveDungeonParticipants();
  if(!participants.length)return false;
  state.expeditionActive=true;
  state.dungeonSearch={nextCheckAt:at+CONFIG.dungeon.searchStepMs};
  return true;
}`;
    const newBlock = `function beginDungeonSearch(at=Date.now()){
  if(!state.dungeonAuto||state.dungeonRun||state.dungeonLootCollect)return false;
  const check=getDungeonStartCheck();
  if(!check.ok){
    if(check.reason.includes("Energie")){
      state.dungeonAuto=false;
      state.dungeonSearch=null;
      state.lastEnergyUpdate=at;
      addLog("Dungeon-Automatik beendet: Nicht genügend Energie für eine weitere Gegnerwelle. Nach der Regeneration muss sie manuell neu gestartet werden.","muted");
      queueSave();
    }
    return false;
  }
  state.expeditionActive=true;
  state.dungeonSearch={nextCheckAt:at+CONFIG.dungeon.searchStepMs};
  return true;
}`;

    return this.replaceOnce(source, oldBlock, newBlock, 'Dungeon-Energieprüfung');
  }

  private applyManualSessionWaveCounter(source: string): string {
    const oldToggle = `function toggleDungeonAuto(){
  if(state.dungeonAuto){state.dungeonAuto=false;state.dungeonSearch=null;addLog(state.dungeonRun?"Dungeon-Automatik angehalten. Die aktuelle Welle wird noch beendet.":state.dungeonLootCollect?"Dungeon-Automatik angehalten. Die aktuelle Beute wird noch eingesammelt.":"Dungeon-Automatik angehalten.","muted");}
  else{if(!getSelectedDungeonIds().length){alert("Bitte zuerst mindestens einen Charakter einem Dungeonplatz zuweisen.");render();return;}beginDungeonExpeditionCycle();state.dungeonAuto=true;addLog("Dungeon-Automatik gestartet. Das ausgewählte Team beginnt mit der Suche.","good");beginDungeonSearch();}
  render();
}`;
    const newToggle = `function toggleDungeonAuto(){
  if(state.dungeonAuto){state.dungeonAuto=false;state.dungeonSearch=null;addLog(state.dungeonRun?"Dungeon-Automatik angehalten. Die aktuelle Welle wird noch beendet.":state.dungeonLootCollect?"Dungeon-Automatik angehalten. Die aktuelle Beute wird noch eingesammelt.":"Dungeon-Automatik angehalten.","muted");}
  else{if(!getSelectedDungeonIds().length){alert("Bitte zuerst mindestens einen Charakter einem Dungeonplatz zuweisen.");render();return;}beginDungeonExpeditionCycle();state.dungeonSessionStartWaves=state.dungeonWavesDefeated||0;state.dungeonAuto=true;addLog("Dungeon-Automatik gestartet. Das ausgewählte Team beginnt mit der Suche.","good");beginDungeonSearch();queueSave();}
  render();
}`;

    const oldRender = 'document.getElementById("runDuration").textContent=`${state.dungeonWavesDefeated||0} besiegt`;';
    const newRender = 'renderDungeonSessionWaveCounter();';
    const gameTickAnchor = `function gameTick(){
  updateEnergy();`;
    const gameTickWithCounter = `function renderDungeonSessionWaveCounter(){
  const counter=document.getElementById("runDuration");
  if(!counter)return;
  const dungeonSessionStart=Number.isFinite(Number(state.dungeonSessionStartWaves))?Number(state.dungeonSessionStartWaves):Number(state.dungeonWavesDefeated||0);
  counter.textContent=\`${'${Math.max(0,Number(state.dungeonWavesDefeated||0)-dungeonSessionStart)}'} besiegt\`;
}

function gameTick(){
  updateEnergy();`;
    const tickDungeonStatus = `  renderDungeonStatus();
  renderDungeonLoot();`;
    const tickDungeonStatusWithCounter = `  renderDungeonStatus();
  renderDungeonSessionWaveCounter();
  renderDungeonLoot();`;

    let adapted = this.replaceOnce(source, oldToggle, newToggle, 'manueller Dungeon-Start');
    adapted = this.replaceOnce(adapted, oldRender, newRender, 'Dungeon-Wellenanzeige');
    adapted = this.replaceOnce(adapted, gameTickAnchor, gameTickWithCounter, 'Dungeon-Wellenanzeige im Runtime-Tick');
    adapted = this.replaceOnce(adapted, tickDungeonStatus, tickDungeonStatusWithCounter, 'Dungeon-Wellenaktualisierung im Runtime-Tick');
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
