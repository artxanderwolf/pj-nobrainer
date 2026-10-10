import { Injectable } from '@angular/core';
import { GAME_CORE_BRIDGE, GameCoreBridge } from '../game/game-core';
import { SAVE_CODEC_BRIDGE, SaveCodecBridge } from '../game/save-codec';

declare global {
  interface Window {
    NoBrainerGameCore?: GameCoreBridge;
    NoBrainerSaveCodec?: SaveCodecBridge;
  }
}

const SAVE_DECLARATIONS = `const SAVE_KEY="nobrainer_save_v1";
const SAVE_VERSION=8;
let saveTimer=null;
let saveUnavailable=false;
let lastAutoSaveAt=0;`;

const SAVE_DECLARATIONS_WITH_ADAPTER = `const SAVE_KEY="nobrainer_save_v1";
if(!window.NoBrainerSaveCodec)throw new Error("NoBrainer-Save-Codec wurde nicht registriert.");
const SAVE_VERSION=window.NoBrainerSaveCodec.SAVE_VERSION;
let saveTimer=null;
let saveUnavailable=false;
let lastAutoSaveAt=0;
let saveStorage={
  read:()=>localStorage.getItem(SAVE_KEY),
  write:value=>localStorage.setItem(SAVE_KEY,value),
  remove:()=>localStorage.removeItem(SAVE_KEY)
};

function configureSaveStorage(adapter){
  if(!adapter || typeof adapter.read!=="function" || typeof adapter.write!=="function" || typeof adapter.remove!=="function")throw new Error("Ungültiger Save-Storage-Adapter.");
  saveStorage=adapter;
}`;

const LOAD_PARSE_BLOCK = `const parsed=JSON.parse(raw);
    state=normalizeLoadedState(parsed.state||parsed);
    const when=parsed.savedAt?new Date(parsed.savedAt):null;`;
const LOAD_PARSE_WITH_CODEC = `const parsed=window.NoBrainerSaveCodec.decodeSave(raw);
    state=normalizeLoadedState(parsed.state);
    const when=parsed.savedAt?new Date(parsed.savedAt):null;`;

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

const SEARCH_MISS_BLOCK = `if(Math.random()<CONFIG.dungeon.encounterChance){startDungeonRun();}
    else state.dungeonSearch.nextCheckAt+=CONFIG.dungeon.searchStepMs;`;
const SEARCH_MISS_WITH_HP_REGEN = `if(Math.random()<CONFIG.dungeon.encounterChance){startDungeonRun();}
    else{
      getAliveDungeonParticipants().forEach(c=>{c.hp=Math.min(c.maxHp,c.hp+1);});
      state.dungeonSearch.nextCheckAt+=CONFIG.dungeon.searchStepMs;
    }`;

const ENEMY_NAME_BLOCK = 'name:`${cls.name} ${index}`';
const ENEMY_NAME_WITH_PREFIX = 'name:`G ${cls.name} ${index}`';

const DUNGEON_LOAD_RESET_BLOCK = `// v0.12 ersetzt die alte 30-Sekunden-Gesamtberechnung durch eine Echtzeit-Zeitleiste.
  // Laufende alte Wellen werden deshalb beim Laden sauber beendet; Team und Inventar bleiben erhalten.
  merged.dungeonRun=null;
  merged.dungeonSearch=null;
  merged.dungeonLootCollect=null;
  merged.dungeonAuto=false;
  merged.dungeonCycleOriginalIds=[];
  merged.dungeonCycleActiveIds=[];
  merged.dungeonWavesDefeated=Math.max(0,Number(raw.dungeonWavesDefeated)||0);`;

const DUNGEON_LOAD_PRESERVE_BLOCK = `// Moderne Echtzeit-Dungeonstände werden erhalten, damit vergangene reale Zeit beim nächsten Start nachsimuliert werden kann.
  // Unbekannte/alte Laufstrukturen werden weiterhin verworfen.
  const modernDungeonRun=raw.dungeonRun&&Array.isArray(raw.dungeonRun.enemies)&&Array.isArray(raw.dungeonRun.attackPoints);
  const modernDungeonSearch=raw.dungeonSearch&&Number.isFinite(Number(raw.dungeonSearch.nextCheckAt));
  const modernDungeonLoot=raw.dungeonLootCollect&&Number.isFinite(Number(raw.dungeonLootCollect.readyAt));
  merged.dungeonRun=modernDungeonRun?raw.dungeonRun:null;
  merged.dungeonSearch=modernDungeonSearch?raw.dungeonSearch:null;
  merged.dungeonLootCollect=modernDungeonLoot?raw.dungeonLootCollect:null;
  merged.dungeonAuto=Boolean(raw.dungeonAuto&&(merged.dungeonRun||merged.dungeonSearch||merged.dungeonLootCollect));
  merged.dungeonCycleOriginalIds=Array.isArray(raw.dungeonCycleOriginalIds)?raw.dungeonCycleOriginalIds.filter(id=>validIds.has(Number(id))).map(Number):[];
  merged.dungeonCycleActiveIds=Array.isArray(raw.dungeonCycleActiveIds)?raw.dungeonCycleActiveIds.filter(id=>validIds.has(Number(id))).map(Number):[];
  merged.dungeonWavesDefeated=Math.max(0,Number(raw.dungeonWavesDefeated)||0);`;

const FORGE_START_BLOCK = `function startForgeQueuedJob(job){const now=Date.now();job.startedAt=now;job.finishesAt=now+job.totalSeconds*1000;state.forgeJobs.push(job);}
function fillForgeSlots(){while(state.forgeJobs.length<state.upgrades.forgeSlots&&state.forgeQueue.length)startForgeQueuedJob(state.forgeQueue.shift());}`;
const FORGE_START_WITH_TIME = `function startForgeQueuedJob(job,at=Date.now()){job.startedAt=at;job.finishesAt=at+job.totalSeconds*1000;state.forgeJobs.push(job);}
function fillForgeSlots(at=Date.now()){while(state.forgeJobs.length<state.upgrades.forgeSlots&&state.forgeQueue.length)startForgeQueuedJob(state.forgeQueue.shift(),at);}`;
const FORGE_UPDATE_BLOCK = `function updateForgeJob(){
  const now=Date.now(),done=state.forgeJobs.filter(j=>now>=j.finishesAt);
  done.forEach(finishForgeJob);
  if(done.length)state.forgeJobs=state.forgeJobs.filter(j=>now<j.finishesAt);
  fillForgeSlots();
  return done.length>0;
}`;
const FORGE_UPDATE_OFFLINE = `function updateForgeJob(){
  const now=Date.now();let completed=0,guard=0;
  while(guard++<10000){
    const next=state.forgeJobs.filter(j=>Number.isFinite(j.finishesAt)&&j.finishesAt<=now).sort((a,b)=>a.finishesAt-b.finishesAt)[0];
    if(!next)break;
    const at=next.finishesAt;
    const done=state.forgeJobs.filter(j=>j.finishesAt<=at);
    done.forEach(finishForgeJob);completed+=done.length;
    state.forgeJobs=state.forgeJobs.filter(j=>j.finishesAt>at);
    fillForgeSlots(at);
  }
  fillForgeSlots(now);
  return completed>0;
}`;

const MARKET_START_BLOCK = `function startMarketQueuedJob(job){const now=Date.now();job.startedAt=now;job.finishesAt=now+job.seconds*1000;state.marketJobs.push(job);}
function fillMarketSlots(){while(state.marketJobs.length<state.upgrades.marketSlots&&state.marketQueue.length)startMarketQueuedJob(state.marketQueue.shift());}`;
const MARKET_START_WITH_TIME = `function startMarketQueuedJob(job,at=Date.now()){job.startedAt=at;job.finishesAt=at+job.seconds*1000;state.marketJobs.push(job);}
function fillMarketSlots(at=Date.now()){while(state.marketJobs.length<state.upgrades.marketSlots&&state.marketQueue.length)startMarketQueuedJob(state.marketQueue.shift(),at);}`;
const MARKET_UPDATE_BLOCK = `function updateMarketJob(){
  const now=Date.now(),done=state.marketJobs.filter(j=>now>=j.finishesAt);
  done.forEach(j=>{state.gold+=j.valueNickel;addLog(\`Verkauf abgeschlossen: \${j.name} → \${formatCurrencyNickel(j.valueNickel)}.\`,"good");});
  if(done.length)state.marketJobs=state.marketJobs.filter(j=>now<j.finishesAt);
  fillMarketSlots();
  return done.length>0;
}`;
const MARKET_UPDATE_OFFLINE = `function updateMarketJob(){
  const now=Date.now();let completed=0,guard=0;
  while(guard++<10000){
    const next=state.marketJobs.filter(j=>Number.isFinite(j.finishesAt)&&j.finishesAt<=now).sort((a,b)=>a.finishesAt-b.finishesAt)[0];
    if(!next)break;
    const at=next.finishesAt;
    const done=state.marketJobs.filter(j=>j.finishesAt<=at);
    done.forEach(j=>{state.gold+=j.valueNickel;addLog(\`Verkauf abgeschlossen: \${j.name} → \${formatCurrencyNickel(j.valueNickel)}.\`,"good");});completed+=done.length;
    state.marketJobs=state.marketJobs.filter(j=>j.finishesAt>at);
    fillMarketSlots(at);
  }
  fillMarketSlots(now);
  return completed>0;
}`;

const DUNGEON_RUNTIME = `function enemyDisplayName(enemy){
  const name=String(enemy?.name||"Gegner");
  return name.startsWith("G ")?name:\`G \${name}\`;
}
let dungeonCatchupMode=false;
function dungeonCombatLog(text,cls=""){if(!dungeonCatchupMode)addLog(text,cls);}
function enemyAttack(point,run,now){
  const enemy=run.enemies.find(e=>e.id===point.ownerId);if(!enemy||!enemy.alive)return;
  const target=weightedTarget(run.participantIds.map(getCharacterById).filter(Boolean));if(!target)return;
  const enemyName=enemyDisplayName(enemy);
  const hitChance=Math.min(1,enemy.hitChance*enemy.precision);
  if(Math.random()>=hitChance){dungeonCombatLog(\`\${enemyName} verfehlt \${target.name}.\`,"muted");return;}
  if(Math.random()<target.dodge){dungeonCombatLog(\`\${target.name} weicht dem Angriff von \${enemyName} aus.\`,"muted");return;}
  const dealt=applyAttackDamage(target,enemy.damage*enemy.strengthFactor,enemy.penetration);
  dungeonCombatLog(\`\${enemyName} trifft \${target.name} für \${dealt.toFixed(2)} Schaden\${target.alive?\` (\${target.hp.toFixed(1)} HP)\`:" – gefallen"}.\`,target.alive?"":"bad");
}
function beginDungeonSearch(at=Date.now()){
  if(!state.dungeonAuto||state.dungeonRun||state.dungeonLootCollect)return false;
  const participants=getAliveDungeonParticipants();
  if(!participants.length)return false;
  state.expeditionActive=true;
  state.dungeonSearch={nextCheckAt:at+CONFIG.dungeon.searchStepMs};
  return true;
}
function startDungeonRun(at=Date.now()){
  if(state.dungeonRun||state.dungeonLootCollect)return false;
  state.dungeonSearch=null;
  const check=getDungeonStartCheck();
  if(!check.ok){
    if(state.dungeonAuto&&check.reason.includes("Energie")){state.dungeonAuto=false;addLog("Dungeon-Automatik beendet: Nicht genügend Energie für die gefundene Gegnerwelle. Nach der Regeneration muss sie manuell neu gestartet werden.","muted");queueSave();}
    return false;
  }
  check.participants.forEach(c=>{c.energy=Math.max(0,c.energy-check.share);});
  const enemyCount=rollEnemyCount(check.participants.length),enemies=Array.from({length:enemyCount},(_,i)=>createDungeonEnemy(i+1));
  const attackPoints=[];
  check.participants.forEach(c=>getCharacterAttackPoints(c).forEach(p=>attackPoints.push({side:"player",ownerId:c.id,kind:p.kind,weaponId:p.weapon?.id??null,label:p.label,nextAt:at+1000/Math.max(0.01,p.speed)})));
  enemies.forEach(e=>attackPoints.push({side:"enemy",ownerId:e.id,kind:"enemy",nextAt:at+1000/Math.max(0.01,e.speed)}));
  state.expeditionActive=true;
  state.dungeonRun={dungeonId:CONFIG.dungeon.id,startedAt:at,participantIds:check.participants.map(c=>c.id),energyShare:check.share,totalEnergyCost:check.totalCost,enemies,attackPoints};
  if(!dungeonCatchupMode)addLog(\`Gegner gefunden: \${enemyCount} Gegner · \${check.participants.length} Charakter\${check.participants.length===1?"":"e"} · \${check.share} EN je Charakter.\`,"muted");
  queueSave();return true;
}
function toggleDungeonAuto(){
  if(state.dungeonAuto){state.dungeonAuto=false;state.dungeonSearch=null;addLog(state.dungeonRun?"Dungeon-Automatik angehalten. Die aktuelle Welle wird noch beendet.":state.dungeonLootCollect?"Dungeon-Automatik angehalten. Die aktuelle Beute wird noch eingesammelt.":"Dungeon-Automatik angehalten.","muted");}
  else{if(!getSelectedDungeonIds().length){alert("Bitte zuerst mindestens einen Charakter einem Dungeonplatz zuweisen.");render();return;}beginDungeonExpeditionCycle();state.dungeonAuto=true;addLog("Dungeon-Automatik gestartet. Das ausgewählte Team beginnt mit der Suche.","good");beginDungeonSearch();}
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
  }else{
    resetCycleAfterFailure();
    if(state.dungeonAuto)beginDungeonSearch(at);
  }
  queueSave();
}
function completeDungeonLootCollect(at=Date.now()){
  const collect=state.dungeonLootCollect;if(!collect)return;
  collect.drops.forEach(d=>{state.dungeonLoot[d.name]??={category:d.category,qty:0};state.dungeonLoot[d.name].qty++;});
  if(!dungeonCatchupMode)addLog(\`BEUTE EINGESAMMELT – \${collect.drops.map(d=>d.name).join(", ")}.\`,"good");
  state.dungeonLootCollect=null;
  queueSave();
  if(state.dungeonAuto)beginDungeonSearch(at);
}
function updateDungeonAutomation(){
  const now=Date.now();
  const firstEventAt=state.dungeonLootCollect?.readyAt??state.dungeonRun?.attackPoints?.reduce((m,p)=>Math.min(m,p.nextAt),Infinity)??state.dungeonSearch?.nextCheckAt??now;
  const catchingUp=Number.isFinite(firstEventAt)&&now-firstEventAt>2000;
  const previousCatchup=dungeonCatchupMode;dungeonCatchupMode=catchingUp;
  const wavesBefore=state.dungeonWavesDefeated||0;let events=0;
  try{
    while(events++<100000){
      if(state.dungeonLootCollect){
        if(state.dungeonLootCollect.readyAt>now)break;
        const at=state.dungeonLootCollect.readyAt;completeDungeonLootCollect(at);continue;
      }
      const run=state.dungeonRun;
      if(run){
        const alivePlayers=run.participantIds.map(getCharacterById).filter(c=>c&&c.alive&&c.hp>0),aliveEnemies=run.enemies.filter(e=>e.alive&&e.hp>0);
        const nextAt=run.attackPoints.reduce((m,p)=>Math.min(m,p.nextAt),Infinity);
        if(!aliveEnemies.length){finishDungeonWave(true,Number.isFinite(nextAt)?Math.min(nextAt,now):now);continue;}
        if(!alivePlayers.length){finishDungeonWave(false,Number.isFinite(nextAt)?Math.min(nextAt,now):now);continue;}
        const due=run.attackPoints.filter(p=>p.nextAt<=now).sort((a,b)=>a.nextAt-b.nextAt)[0];if(!due)break;
        const at=due.nextAt;
        if(due.side==="player")playerAttack(due,run,at);else enemyAttack(due,run,at);
        let speed=1;
        if(due.side==="player"){
          const c=getCharacterById(due.ownerId);if(c){if(due.kind==="fist")speed=1;else speed=Math.max(0.01,getWeaponById(due.weaponId)?.stats?.attackSpeed||1);}
        }else speed=Math.max(0.01,run.enemies.find(e=>e.id===due.ownerId)?.speed||1);
        due.nextAt+=1000/speed;
        continue;
      }
      if(!state.dungeonAuto)break;
      if(!state.dungeonSearch){beginDungeonSearch(now);break;}
      if(state.dungeonSearch.nextCheckAt>now)break;
      const at=state.dungeonSearch.nextCheckAt;
      if(Math.random()<CONFIG.dungeon.encounterChance){startDungeonRun(at);}
      else{
        getAliveDungeonParticipants().forEach(c=>{c.hp=Math.min(c.maxHp,c.hp+1);});
        state.dungeonSearch.nextCheckAt=at+CONFIG.dungeon.searchStepMs;
      }
    }
  }finally{
    dungeonCatchupMode=previousCatchup;
  }
  if(catchingUp){
    const waves=(state.dungeonWavesDefeated||0)-wavesBefore;
    addLog(\`Offline-Fortschritt nachgeholt\${waves>0?\`: \${waves} Welle\${waves===1?"":"n"} besiegt\`:""}.\`,"muted");
  }
}
function collectDungeonLoot(){`;

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
    window.NoBrainerSaveCodec = SAVE_CODEC_BRIDGE;
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
    adapted = this.replaceOnce(adapted, LOAD_PARSE_BLOCK, LOAD_PARSE_WITH_CODEC, 'Save-Decodierung');
    adapted = this.replaceOnce(adapted, 'localStorage.setItem(SAVE_KEY,JSON.stringify({saveVersion:SAVE_VERSION,savedAt,state}));', 'saveStorage.write(window.NoBrainerSaveCodec.encodeSave(state,savedAt));', 'Save-Schreiben');
    adapted = this.replaceOnce(adapted, 'try{localStorage.removeItem(SAVE_KEY);}catch(err){}', 'try{saveStorage.remove();}catch(err){}', 'Save-Zurücksetzen');
    adapted = this.replaceOnce(adapted, DUNGEON_LOAD_RESET_BLOCK, DUNGEON_LOAD_PRESERVE_BLOCK, 'Dungeon-Zustand beim Laden');
    adapted = this.replaceOnce(adapted, SEARCH_MISS_BLOCK, SEARCH_MISS_WITH_HP_REGEN, 'HP-Regeneration bei erfolgloser Dungeonsuche');
    adapted = this.replaceOnce(adapted, ENEMY_NAME_BLOCK, ENEMY_NAME_WITH_PREFIX, 'Gegnernamen-Präfix');
    adapted = this.replaceOnce(adapted, FORGE_START_BLOCK, FORGE_START_WITH_TIME, 'Zeitbasierter Schmiedestart');
    adapted = this.replaceOnce(adapted, FORGE_UPDATE_BLOCK, FORGE_UPDATE_OFFLINE, 'Offline-Schmiedefortschritt');
    adapted = this.replaceOnce(adapted, MARKET_START_BLOCK, MARKET_START_WITH_TIME, 'Zeitbasierter Marktstart');
    adapted = this.replaceOnce(adapted, MARKET_UPDATE_BLOCK, MARKET_UPDATE_OFFLINE, 'Offline-Marktforschritt');
    adapted = this.replaceRangeOnce(adapted, 'function enemyAttack(', 'function collectDungeonLoot(){', DUNGEON_RUNTIME, 'Zeitbasierte Dungeon-Simulation');
    adapted = this.replaceOnce(adapted, STARTUP_BLOCK, RUNTIME_BRIDGE, 'Runtime-Startblock');
    return adapted;
  }

  private replaceRangeOnce(source: string, startMarker: string, endMarker: string, replacement: string, label: string): string {
    const start = source.indexOf(startMarker);
    if (start < 0) throw new Error(`Legacy-Kompatibilität fehlgeschlagen: Startanker für ${label} wurde nicht gefunden.`);
    if (source.indexOf(startMarker, start + startMarker.length) >= 0) throw new Error(`Legacy-Kompatibilität fehlgeschlagen: Startanker für ${label} ist nicht eindeutig.`);
    const end = source.indexOf(endMarker, start + startMarker.length);
    if (end < 0) throw new Error(`Legacy-Kompatibilität fehlgeschlagen: Endanker für ${label} wurde nicht gefunden.`);
    return source.slice(0, start) + replacement + source.slice(end + (replacement.endsWith('{') ? endMarker.length : 0));
  }

  private replaceOnce(source: string, search: string, replacement: string, label: string): string {
    const first = source.indexOf(search);
    if (first < 0) throw new Error(`Legacy-Kompatibilität fehlgeschlagen: ${label} wurde nicht gefunden.`);
    if (source.indexOf(search, first + search.length) >= 0) throw new Error(`Legacy-Kompatibilität fehlgeschlagen: ${label} ist nicht eindeutig.`);
    return source.slice(0, first) + replacement + source.slice(first + search.length);
  }
}
