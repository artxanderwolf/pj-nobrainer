import { Injectable } from '@angular/core';
import { COMBAT_CORE_BRIDGE, type CombatCoreBridge } from '../game/combat-core';
import { DUNGEON_CORE_BRIDGE, type DungeonCoreBridge } from '../game/dungeon-core';

declare global {
  interface Window {
    NoBrainerCombatCore?: CombatCoreBridge;
    NoBrainerDungeonCore?: DungeonCoreBridge;
  }
}

const DUNGEON_RUNTIME = `function getDungeonStartCheck(){
  return window.NoBrainerDungeonCore.checkDungeonStart(getAliveDungeonParticipants());
}
function beginDungeonExpeditionCycle(){
  const ids=getSelectedDungeonIds();
  state.dungeonCycleOriginalIds=[...ids];state.dungeonCycleActiveIds=[...ids];
  window.NoBrainerDungeonCore.resetDungeonCycle(ids.map(getCharacterById).filter(Boolean));
  state.expeditionActive=ids.length>0;
}
function resetCycleAfterFailure(){
  const ids=(state.dungeonCycleOriginalIds||[]).filter(id=>getCharacterById(id));
  window.NoBrainerDungeonCore.resetDungeonCycle(ids.map(getCharacterById).filter(Boolean));
  state.dungeonCycleActiveIds=[...ids];
  addLog("Welle verloren: Das ursprünglich ausgewählte Team startet mit vollen HP wieder im Suchmodus.","bad");
}
function rollEnemyCount(teamSize){return window.NoBrainerDungeonCore.rollEnemyCount(teamSize,Math.random());}
function rollEnemyClass(){return window.NoBrainerDungeonCore.rollEnemyClass(Math.random());}
function createDungeonEnemy(index){return window.NoBrainerDungeonCore.createDungeonEnemy(index,rollEnemyClass());}
function weightedTarget(targets){
  const weighted=window.NoBrainerCombatCore.buildWeightedTargets(targets,x=>getCharacterClass(x)?.distance??2);
  if(!weighted.length)return null;
  return weightedPick(weighted,"weight").target;
}
function applyAttackDamage(target,damage,penetration){return window.NoBrainerCombatCore.applyAttackDamage(target,damage,penetration);}
function enemyDisplayName(enemy){const name=String(enemy?.name||"Gegner");return name.startsWith("G ")?name:\`G \${name}\`;}
let dungeonCatchupMode=false;
function dungeonCombatLog(text,cls=""){if(!dungeonCatchupMode)addLog(text,cls);}
function playerAttack(point,run,now){
  const c=getCharacterById(point.ownerId);if(!c||!c.alive)return;
  const target=weightedTarget(run.enemies);if(!target)return;
  let damage,hitChance,penetration,label;
  if(point.kind==="fist"){damage=1*c.strengthFactor;hitChance=Math.min(1,0.50*c.precision);penetration=0;label="Faust";}
  else{const w=getWeaponById(point.weaponId);if(!w)return;damage=(w.stats?.damagePerHit||0)*c.strengthFactor;hitChance=Math.min(1,(w.stats?.hitChance||0)*c.precision);penetration=w.stats?.penetration||0;label=w.name;}
  const result=window.NoBrainerCombatCore.resolveAttack(target,damage,hitChance,penetration,Math.random(),Math.random());
  if(result.outcome==="miss"){dungeonCombatLog(\`\${c.name} · \${label}: verfehlt \${target.name}.\`,"muted");return;}
  if(result.outcome==="dodge"){dungeonCombatLog(\`\${target.name} weicht \${c.name} · \${label} aus.\`,"muted");return;}
  dungeonCombatLog(\`\${c.name} · \${label} trifft \${target.name} für \${result.dealt.toFixed(2)} Schaden\${target.alive?\` (\${target.hp.toFixed(1)} HP)\`:" – besiegt"}.\`,target.alive?"":"good");
}
function enemyAttack(point,run,now){
  const enemy=run.enemies.find(e=>e.id===point.ownerId);if(!enemy||!enemy.alive)return;
  const target=weightedTarget(run.participantIds.map(getCharacterById).filter(Boolean));if(!target)return;
  const enemyName=enemyDisplayName(enemy),hitChance=Math.min(1,enemy.hitChance*enemy.precision);
  const result=window.NoBrainerCombatCore.resolveAttack(target,enemy.damage*enemy.strengthFactor,hitChance,enemy.penetration,Math.random(),Math.random());
  if(result.outcome==="miss"){dungeonCombatLog(\`\${enemyName} verfehlt \${target.name}.\`,"muted");return;}
  if(result.outcome==="dodge"){dungeonCombatLog(\`\${target.name} weicht dem Angriff von \${enemyName} aus.\`,"muted");return;}
  dungeonCombatLog(\`\${enemyName} trifft \${target.name} für \${result.dealt.toFixed(2)} Schaden\${target.alive?\` (\${target.hp.toFixed(1)} HP)\`:" – gefallen"}.\`,target.alive?"":"bad");
}
function stopDungeonForEnergy(at,message){
  state.dungeonAuto=false;state.dungeonSearch=null;state.lastEnergyUpdate=at;addLog(message,"muted");queueSave();
}
function beginDungeonSearch(at=Date.now()){
  if(!state.dungeonAuto||state.dungeonRun||state.dungeonLootCollect)return false;
  const check=getDungeonStartCheck();
  if(!check.ok){if(check.reason.includes("Energie"))stopDungeonForEnergy(at,"Dungeon-Automatik beendet: Nicht genügend Energie für eine weitere Gegnerwelle. Nach der Regeneration muss sie manuell neu gestartet werden.");return false;}
  state.expeditionActive=true;state.dungeonSearch={nextCheckAt:at+CONFIG.dungeon.searchStepMs};return true;
}
function startDungeonRun(at=Date.now()){
  if(state.dungeonRun||state.dungeonLootCollect)return false;
  state.dungeonSearch=null;
  const check=getDungeonStartCheck();
  if(!check.ok){if(state.dungeonAuto&&check.reason.includes("Energie"))stopDungeonForEnergy(at,"Dungeon-Automatik beendet: Nicht genügend Energie für die gefundene Gegnerwelle. Nach der Regeneration muss sie manuell neu gestartet werden.");return false;}
  window.NoBrainerDungeonCore.payDungeonEnergy(check.participants,check.share);
  const enemyCount=window.NoBrainerDungeonCore.rollEnemyCount(check.participants.length,Math.random());
  const enemies=window.NoBrainerDungeonCore.createDungeonEnemies(enemyCount,()=>Math.random());
  const attackPoints=window.NoBrainerDungeonCore.createDungeonAttackPoints(check.participants,enemies,at,c=>getCharacterAttackPoints(c).map(p=>({kind:p.kind,weaponId:p.weapon?.id??null,label:p.label,speed:p.speed})));
  state.expeditionActive=true;
  state.dungeonRun={dungeonId:CONFIG.dungeon.id,startedAt:at,participantIds:check.participants.map(c=>c.id),energyShare:check.share,totalEnergyCost:check.totalCost,enemies,attackPoints};
  if(!dungeonCatchupMode)addLog(\`Gegner gefunden: \${enemyCount} Gegner · \${check.participants.length} Charakter\${check.participants.length===1?"":"e"} · \${check.share} EN je Charakter.\`,"muted");
  queueSave();return true;
}
function toggleDungeonAuto(){
  if(state.dungeonAuto){state.dungeonAuto=false;state.dungeonSearch=null;addLog(state.dungeonRun?"Dungeon-Automatik angehalten. Die aktuelle Welle wird noch beendet.":state.dungeonLootCollect?"Dungeon-Automatik angehalten. Die aktuelle Beute wird noch eingesammelt.":"Dungeon-Automatik angehalten.","muted");}
  else{if(!getSelectedDungeonIds().length){alert("Bitte zuerst mindestens einen Charakter einem Dungeonplatz zuweisen.");render();return;}beginDungeonExpeditionCycle();state.dungeonSessionStartWaves=state.dungeonWavesDefeated||0;state.dungeonAuto=true;addLog("Dungeon-Automatik gestartet. Das ausgewählte Team beginnt mit der Suche.","good");beginDungeonSearch();queueSave();}
  render();
}
function finishDungeonWave(success,at=Date.now()){
  const run=state.dungeonRun;if(!run)return;state.dungeonRun=null;
  if(success){
    const drops=[];for(let i=0;i<run.enemies.length;i++)drops.push(...rollDrops(run.dungeonId,1));
    state.dungeonWavesDefeated=(state.dungeonWavesDefeated||0)+1;
    state.dungeonCycleActiveIds=run.participantIds.map(getCharacterById).filter(c=>c&&c.alive).map(c=>c.id);
    state.dungeonLootCollect={readyAt:at+CONFIG.dungeon.lootCollectMs,drops,enemyCount:run.enemies.length};
    if(!dungeonCatchupMode)addLog(\`WELLE BESIEGT – Beute wird eingesammelt (\${run.enemies.length} Materialwurf\${run.enemies.length===1?"":"würfe"}).\`,"good");
  }else{resetCycleAfterFailure();if(state.dungeonAuto)beginDungeonSearch(at);}
  queueSave();
}
function completeDungeonLootCollect(at=Date.now()){
  const collect=state.dungeonLootCollect;if(!collect)return;
  collect.drops.forEach(d=>{state.dungeonLoot[d.name]??={category:d.category,qty:0};state.dungeonLoot[d.name].qty++;});
  if(!dungeonCatchupMode)addLog(\`BEUTE EINGESAMMELT – \${collect.drops.map(d=>d.name).join(", ")}.\`,"good");
  state.dungeonLootCollect=null;queueSave();if(state.dungeonAuto)beginDungeonSearch(at);
}
function getDungeonFirstEventAt(now){
  if(state.dungeonLootCollect)return Number(state.dungeonLootCollect.readyAt);
  if(state.dungeonRun)return state.dungeonRun.attackPoints.reduce((m,p)=>Math.min(m,p.nextAt),Infinity);
  if(state.dungeonSearch)return Number(state.dungeonSearch.nextCheckAt);
  return now;
}
function getAttackPointSpeed(point,run){
  if(point.side==="enemy")return Math.max(0.01,run.enemies.find(e=>e.id===point.ownerId)?.speed||1);
  if(point.kind==="fist")return 1;
  return Math.max(0.01,getWeaponById(point.weaponId)?.stats?.attackSpeed||1);
}
function updateDungeonAutomation(){
  const now=Date.now(),firstEventAt=getDungeonFirstEventAt(now);
  const catchingUp=window.NoBrainerDungeonCore.isDungeonCatchup(firstEventAt,now);
  const previousCatchup=dungeonCatchupMode;dungeonCatchupMode=catchingUp;
  const wavesBefore=state.dungeonWavesDefeated||0;let events=0;
  try{
    while(events++<100000){
      const phase=window.NoBrainerDungeonCore.getDungeonPhase(state);
      if(phase==="loot"){
        if(state.dungeonLootCollect.readyAt>now)break;
        completeDungeonLootCollect(state.dungeonLootCollect.readyAt);continue;
      }
      if(phase==="combat"){
        const run=state.dungeonRun;
        const alivePlayers=run.participantIds.map(getCharacterById).filter(c=>c&&c.alive&&c.hp>0),aliveEnemies=run.enemies.filter(e=>e.alive&&e.hp>0);
        const nextAt=run.attackPoints.reduce((m,p)=>Math.min(m,p.nextAt),Infinity);
        if(!aliveEnemies.length){finishDungeonWave(true,Number.isFinite(nextAt)?Math.min(nextAt,now):now);continue;}
        if(!alivePlayers.length){finishDungeonWave(false,Number.isFinite(nextAt)?Math.min(nextAt,now):now);continue;}
        run.attackPoints=window.NoBrainerDungeonCore.filterActiveDungeonAttackPoints(run.attackPoints,alivePlayers.map(c=>c.id),aliveEnemies.map(e=>e.id));
        const due=window.NoBrainerDungeonCore.getNextDueAttack(run.attackPoints,now);if(!due)break;
        const at=due.nextAt;if(due.side==="player")playerAttack(due,run,at);else enemyAttack(due,run,at);
        window.NoBrainerDungeonCore.rescheduleDungeonAttack(due,getAttackPointSpeed(due,run),run.attackPoints);continue;
      }
      if(phase==="idle")break;
      if(!state.dungeonSearch){beginDungeonSearch(now);break;}
      if(state.dungeonSearch.nextCheckAt>now)break;
      const at=state.dungeonSearch.nextCheckAt;
      const result=window.NoBrainerDungeonCore.resolveSearchStep(getAliveDungeonParticipants(),Math.random());
      if(result==="encounter")startDungeonRun(at);else state.dungeonSearch.nextCheckAt=at+CONFIG.dungeon.searchStepMs;
    }
  }finally{dungeonCatchupMode=previousCatchup;}
  if(catchingUp){const waves=(state.dungeonWavesDefeated||0)-wavesBefore;addLog(\`Offline-Fortschritt nachgeholt\${waves>0?\`: \${waves} Welle\${waves===1?"":"n"} besiegt\`:""}.\`,"muted");}
}
function renderDungeonSessionWaveCounter(){
  const counter=document.getElementById("runDuration");if(!counter)return;
  const start=Number.isFinite(Number(state.dungeonSessionStartWaves))?Number(state.dungeonSessionStartWaves):Number(state.dungeonWavesDefeated||0);
  counter.textContent=\`${'${Math.max(0,Number(state.dungeonWavesDefeated||0)-start)}'} besiegt\`;
}
function collectDungeonLoot(){`;

@Injectable({ providedIn: 'root' })
export class LegacyDungeonDomainAdapterService {
  adapt(source: string): string {
    window.NoBrainerCombatCore = COMBAT_CORE_BRIDGE;
    window.NoBrainerDungeonCore = DUNGEON_CORE_BRIDGE;
    const startMarker = 'function getDungeonStartCheck(){';
    const endMarker = 'function collectDungeonLoot(){';
    const start = source.indexOf(startMarker);
    if (start < 0) throw new Error('Legacy-Kompatibilität fehlgeschlagen: Dungeon-Domänenstart wurde nicht gefunden.');
    if (source.indexOf(startMarker, start + startMarker.length) >= 0) throw new Error('Legacy-Kompatibilität fehlgeschlagen: Dungeon-Domänenstart ist nicht eindeutig.');
    const end = source.indexOf(endMarker, start + startMarker.length);
    if (end < 0) throw new Error('Legacy-Kompatibilität fehlgeschlagen: Dungeon-Domänenende wurde nicht gefunden.');
    return source.slice(0, start) + DUNGEON_RUNTIME + source.slice(end + endMarker.length);
  }
}
