import { Injectable } from '@angular/core';
import {
  DUNGEON_PRESENTATION_CORE_BRIDGE,
  type DungeonPresentationCoreBridge
} from '../game/dungeon-presentation-core';

declare global {
  interface Window {
    NoBrainerDungeonPresentationCore?: DungeonPresentationCoreBridge;
  }
}

const ADAPTED_DUNGEON_OVERVIEW = `function renderDungeonOverview(){
  const participantCount=state.dungeonRun?.participantIds?.length||getSelectedDungeonIds().length;
  const presentation=window.NoBrainerDungeonPresentationCore.getDungeonOverviewPresentation({
    enemyBaseDamage:CONFIG.dungeon.enemyBase.damage,
    enemyBaseHitChance:CONFIG.dungeon.enemyBase.hitChance,
    enemyBaseSpeed:CONFIG.dungeon.enemyBase.speed,
    participantCount,
    energyCostPerCharacter:getEnergyCostPerCharacter(participantCount)
  });
  const damage=document.getElementById("enemyHp"),hit=document.getElementById("enemyArmor"),speed=document.getElementById("enemyDamage"),energy=document.getElementById("energyCost");
  if(damage)damage.textContent=presentation.enemyDamageText;
  if(hit)hit.textContent=presentation.enemyHitChanceText;
  if(speed)speed.textContent=presentation.enemySpeedText;
  if(energy)energy.textContent=presentation.energyCostText;
}
`;

const ADAPTED_DUNGEON_STATUS = `function renderDungeonStatus(){
  const box=document.getElementById("dungeonRunCard"),autoBtn=document.getElementById("autoDungeonBtn"),collectBtn=document.getElementById("collectLootBtn");if(!box||!autoBtn||!collectBtn)return;
  const presentation=window.NoBrainerDungeonPresentationCore.getDungeonStatusPresentation({
    auto:!!state.dungeonAuto,
    selectedCharacterCount:getSelectedDungeonIds().length,
    run:state.dungeonRun||null,
    lootCollect:state.dungeonLootCollect||null,
    lootTotal:Object.values(state.dungeonLoot||{}).reduce((sum,item)=>sum+(item.qty||0),0)
  });
  autoBtn.textContent=presentation.autoButtonText;autoBtn.disabled=presentation.autoButtonDisabled;
  collectBtn.textContent=presentation.collectButtonText;collectBtn.disabled=presentation.collectButtonDisabled;
  const card=presentation.card;box.className=card.className;
  if(card.mode==="active"){
    box.innerHTML='<strong>'+card.title+'</strong><p>'+card.aliveText+'</p><p class="muted small">'+card.metaText+'</p><div class="statrow">'+card.enemies.map(enemy=>'<div class="stat"><span>'+enemy.name+'</span><b>'+enemy.hpText+'</b></div>').join("")+'</div>';return;
  }
  if(card.mode==="collecting"||card.mode==="searching"){
    box.innerHTML='<strong>'+card.title+'</strong><br><span class="small">'+card.detailText+'</span>';return;
  }
  box.innerHTML=card.text;
}
`;

const ADAPTED_DUNGEON_LOOT = `function renderDungeonLoot(){
  const box=document.getElementById("dungeonLoot"),empty=document.getElementById("dungeonLootEmpty");if(!box||!empty)return;
  const presentation=window.NoBrainerDungeonPresentationCore.getDungeonLootPresentation(state.dungeonLoot||{});
  box.innerHTML="";empty.style.display=presentation.empty?"block":"none";if(presentation.empty)return;
  const grid=document.createElement("div");grid.className="loot-grid";
  presentation.entries.forEach(entry=>{
    const chip=document.createElement("div");chip.className="loot-chip";chip.innerHTML=entry.name+'<b>'+entry.quantityText+'</b>';grid.appendChild(chip);
  });
  box.appendChild(grid);
}
`;

@Injectable({ providedIn: 'root' })
export class LegacyDungeonPresentationAdapterService {
  adapt(source: string): string {
    window.NoBrainerDungeonPresentationCore = DUNGEON_PRESENTATION_CORE_BRIDGE;
    let adapted = this.replaceOnce(
      source,
      'document.getElementById("runDuration").textContent=`${state.dungeonWavesDefeated||0} besiegt`;',
      'renderDungeonSessionWaveCounter();',
      'Dungeon-Wellenanzeige'
    );
    adapted = this.replaceOnce(
      adapted,
      '  renderDungeonStatus();\n  renderDungeonLoot();',
      '  renderDungeonStatus();\n  renderDungeonSessionWaveCounter();\n  renderDungeonLoot();',
      'Dungeon-Wellenaktualisierung im Runtime-Tick'
    );
    adapted = this.replaceOnce(
      adapted,
      'function renderDungeonStatus(){',
      ADAPTED_DUNGEON_OVERVIEW + '\nfunction renderDungeonStatus(){',
      'Dungeon-Übersicht-Renderfunktion'
    );
    adapted = this.replaceRangeOnce(
      adapted,
      '  const displayedCount=state.dungeonRun?.participantIds?.length||getSelectedDungeonIds().length;',
      '  renderCharacter("teamCard");renderCharacter("rosterCard");renderTavern();',
      '  renderDungeonOverview();\n  renderDungeonSessionWaveCounter();\n\n',
      'Dungeon-Übersicht-Präsentation'
    );
    adapted = this.replaceRangeOnce(
      adapted,
      'function renderDungeonStatus(){',
      'function renderDungeonLoot(){',
      ADAPTED_DUNGEON_STATUS + '\n',
      'Dungeon-Status-Präsentation'
    );
    adapted = this.replaceRangeOnce(
      adapted,
      'function renderDungeonLoot(){',
      'function render(){',
      ADAPTED_DUNGEON_LOOT + '\n',
      'Dungeon-Beute-Präsentation'
    );
    return adapted;
  }

  private replaceOnce(source: string, search: string, replacement: string, label: string): string {
    const first = source.indexOf(search);
    if (first < 0) throw new Error(`Legacy-Kompatibilität fehlgeschlagen: ${label} wurde nicht gefunden.`);
    if (source.indexOf(search, first + search.length) >= 0) throw new Error(`Legacy-Kompatibilität fehlgeschlagen: ${label} ist nicht eindeutig.`);
    return source.slice(0, first) + replacement + source.slice(first + search.length);
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
