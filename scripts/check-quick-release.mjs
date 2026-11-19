import {migrateTeams} from '../src/app/game/team-core.ts';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import ts from 'typescript';
import { initializeReleaseProgress, startProgressSession, recordSuccessfulWave, missions, claimMission, dungeonUnlocked, weaponUnlocked, refreshMissionNotifications } from '../src/app/game/mission-core.ts';
import { healParty, selectHealingTarget } from '../src/app/game/healing-core.ts';
import { MATERIAL_REFERENCES, CHARACTER_CLASSES, calculateCharacterStats, calculateWeaponStats, getStarterBlueprint, getDungeonEnemyDefinition } from '../src/app/game/game-core.ts';
import { GENERATED_DUNGEONS, GENERATED_DUNGEON_ENEMY_DEFINITIONS } from '../src/app/game/data/generated/game-data.generated.ts';
import { getWeaponMaterialColorById } from '../src/app/game/weapon-material-colors.ts';
import { resolveDungeonSearch } from '../src/app/game/dungeon-search-core.ts';
import { getClassEquipmentRule } from '../src/app/game/equipment-rules-core.ts';
import { getRecruitOffer } from '../src/app/game/progression-core.ts';
import { encodeSave, decodeSave } from '../src/app/game/save-codec.ts';

const state={weaponCraftCounts:{dagger:0}},p=initializeReleaseProgress(state);
let draws=0;const random=()=>{draws++;return 0;};
migrateTeams(state);startProgressSession(state,1);
for(let i=0;i<149;i++)recordSuccessfulWave(state,1,random);
assert.equal(p.qualifiedRuns[1],undefined);assert.equal(draws,0);
recordSuccessfulWave(state,1,random);assert.equal(p.qualifiedRuns[1],1);
for(let i=0;i<400;i++)recordSuccessfulWave(state,1,random);
assert.equal(p.qualifiedRuns[1],1,'A session counts at most once');
for(let run=1;run<20;run++){migrateTeams(state);startProgressSession(state,1);for(let wave=0;wave<150;wave++)recordSuccessfulWave(state,1,random);}
assert.equal(p.qualifiedRuns[1],20);assert.equal(draws,0,'20th qualifying run cannot search before a new run');
migrateTeams(state);startProgressSession(state,1);for(let wave=0;wave<99;wave++)recordSuccessfulWave(state,1,random);
assert.equal(draws,0);recordSuccessfulWave(state,1,()=>{draws++;return .05;});assert.equal(p.accessFound[2],undefined);
recordSuccessfulWave(state,1,()=>{draws++;return .049999;});assert.equal(p.accessFound[2],true);assert.equal(dungeonUnlocked(state,2),false);
const saved=decodeSave(encodeSave(state)).state;
recordSuccessfulWave(saved,1,()=>{throw Error('No reroll after reload/find');});
assert.equal(claimMission(saved,'dungeon_2'),true);assert.equal(claimMission(saved,'dungeon_2'),false);assert.equal(dungeonUnlocked(saved,2),true);
assert.equal(claimMission(saved,'dungeon_3'),false);
const migration={weaponCraftCounts:{dagger:10,sword:10,axe1h:10,sword2h:10,axe2h:10}};
initializeReleaseProgress(migration);for(const form of ['dagger','sword','axe1h','sword2h','axe2h','bow','staff'])assert.equal(weaponUnlocked(migration,form),true,'Preserve v14 unlock');
state.weaponCraftCounts.dagger=10;refreshMissionNotifications(state);assert.equal(weaponUnlocked(state,'sword'),false);assert.equal(claimMission(state,'weapon_sword'),true);
assert.equal(claimMission(state,'weapon_sword'),false);
state.weaponCraftCounts.axe2h=10;state.weaponCraftCounts.sword2h=10;refreshMissionNotifications(state);
assert.equal(missions(state).find(m=>m.id==='weapon_bow').visible,false);assert.ok(!p.notificationQueue.includes('weapon_bow'));
p.claimed.weapon_sword2h=true;p.claimed.weapon_axe2h=true;refreshMissionNotifications(state);
assert.ok(p.notificationQueue.includes('weapon_bow'));assert.equal(missions(state).find(m=>m.id==='weapon_bow').complete,true);
assert.equal(new Set(p.notificationQueue).size,p.notificationQueue.length);
const resumed={};initializeReleaseProgress(resumed);migrateTeams(resumed);startProgressSession(resumed,1);for(let i=0;i<150;i++)recordSuccessfulWave(resumed,1,()=>1);
const resumed2=decodeSave(encodeSave(resumed)).state;recordSuccessfulWave(resumed2,1,()=>1);assert.equal(resumed2.releaseProgress.qualifiedRuns[1],1);

const a={hp:10,maxHp:100,alive:true,threat:10},b={hp:5,maxHp:50,alive:true,threat:20},dead={hp:0,maxHp:100,alive:false,threat:100};
assert.equal(selectHealingTarget([a,b,dead],x=>x.threat),b);
b.threat=10;assert.equal(selectHealingTarget([a,b],x=>x.threat),a);
assert.equal(healParty([a,b],500,x=>x.threat).target,a);assert.equal(a.hp,100);
assert.equal(healParty([a,b],500,x=>x.threat).target,b);assert.equal(b.hp,50);
assert.equal(healParty([a,b,dead],10,x=>x.threat),null);assert.equal(dead.hp,0);
const self={hp:1,maxHp:22,alive:true};assert.equal(healParty([self],4,()=>25).target,self);
assert.deepEqual(Object.keys(CHARACTER_CLASSES),['recruit','fighter','archer','scholar'],'S18 has four classes only');
assert.equal(getClassEquipmentRule('healer'),null);
const recruitState={gold:100000,characters:[],upgrades:{innCapacity:4}};
assert.equal(getRecruitOffer(recruitState,'healer').ok,false);recruitState.releaseProgress={...p,claimed:{healer:true}};assert.equal(getRecruitOffer(recruitState,'healer').ok,false,'Legacy quest claim must not reenable class');
assert.equal(MATERIAL_REFERENCES.length,77);assert.deepEqual(MATERIAL_REFERENCES.map(r=>r.materialId),Array.from({length:77},(_,i)=>i+1));
const seen=new Set();let poolCount=0;
for(const [did,enemies] of Object.entries(GENERATED_DUNGEON_ENEMY_DEFINITIONS)) {
  for(const enemy of Object.values(enemies)) {
    if(+did===1)continue;
    poolCount++;assert.equal(enemy.lootMaterialIds.length,+did===4&&enemy===enemies.scholar?8:4);
    assert.deepEqual(enemy.lootMaterialIds.map(id=>MATERIAL_REFERENCES[id-1].definition.dungeonDropWeight),enemy.lootMaterialIds.length===8?[50,30,15,5,50,30,15,5]:[50,30,15,5]);
    for(const id of enemy.lootMaterialIds){assert.ok(!seen.has(id));seen.add(id);assert.match(getWeaponMaterialColorById(id),/^#[0-9A-F]{6}$/i);const r=MATERIAL_REFERENCES[id-1].definition;assert.equal(r.rarity,+did);assert.equal(r.specialEffect,null);assert.equal(r.stats.lifeSteal,0);assert.equal(r.stats.hpRegenPerMinute,0);}
  }
}
assert.equal(poolCount,16);assert.equal(seen.size,68);
const catalog=JSON.parse(readFileSync(new URL('./fixtures/quick-release-materials.json',import.meta.url),'utf8'));
const dungeonIds={'Waffenkammer':2,'Wald':3,'Einsame Stadt':4,'Heilige Ebenen':5},classIds={'Neuling':'recruit','Tank':'fighter','Jäger':'archer','Lehrling':'scholar','Heiler':'scholar'};
for(const [index,row] of catalog.rows.entries()){
  const [dungeon,enemy,name,category,color,drop,...values]=row,reference=MATERIAL_REFERENCES[index+9],m=reference.definition;
  assert.equal(reference.displayName,name);assert.equal(m.category,category);assert.equal(getWeaponMaterialColorById(reference.materialId),color);
  assert.equal(m.dungeonDropWeight,Number(drop.replace(' %','')));
  const fields=['hp','armor','dodge','strengthFactor','precision','critChance','penetration'];
  fields.forEach((field,i)=>assert.equal(m.stats[field],Number(values[i].replace(',','.')),`${reference.materialId}.${field}`));
  assert.equal(m.rarity,Number(values[7]));assert.ok(getDungeonEnemyDefinition(dungeonIds[dungeon],classIds[enemy]).lootMaterialIds.includes(reference.materialId));
}
for(const c of ['recruit','fighter'])assert.ok(!getDungeonEnemyDefinition(1,c).lootMaterialIds.includes(9));
for(const c of ['archer','scholar'])assert.ok(getDungeonEnemyDefinition(1,c).lootMaterialIds.includes(9));
assert.deepEqual(Object.values(GENERATED_DUNGEONS).map(d=>d.encounterChance),[.05,.05,.05,.05,.05]);
for (const dungeon of Object.values(GENERATED_DUNGEONS)) assert.equal(dungeon.searchStepMs,1000,'Ein Suchwurf pro Sekunde');
for (const dungeon of Object.values(GENERATED_DUNGEONS)) {
  assert.equal(resolveDungeonSearch(dungeon.encounterChance,0),'encounter','Fund im ersten Suchschritt möglich');
  for (let second=1;second<=40;second++) assert.equal(resolveDungeonSearch(dungeon.encounterChance,.5),'miss','Auch nach 20 Sekunden kein erzwungener Fund');
  assert.equal(resolveDungeonSearch(dungeon.encounterChance,.049999),'encounter');
  assert.equal(resolveDungeonSearch(dungeon.encounterChance,.05),'miss');
}
assert.equal(GENERATED_DUNGEONS[4].enemyClassWeights.healer,undefined);assert.equal(GENERATED_DUNGEONS[4].enemyClassWeights.scholar,23.5);
assert.equal(Object.values(GENERATED_DUNGEONS[4].enemyClassWeights).reduce((a,b)=>a+b,0),100);
assert.equal(getStarterBlueprint().stats.expectedRaw,5.775);assert.ok(getStarterBlueprint().slots.every(s=>s.materialId<=9));

// Exercise actual service paths, including healer early returns and boss pool sampling.
const temporary=new URL('../src/app/core/quick-release.test.mjs',import.meta.url);
let source=readFileSync(new URL('../src/app/core/game-dungeon.service.ts',import.meta.url),'utf8')
 .replace("import { Injectable } from '@angular/core';",'').replace("@Injectable({ providedIn: 'root' })",'')
 .replace(/from '(\.\.[^']+|\.\/[^']+)';/g,(m,path)=>`from '${path.endsWith('.ts')?path:path+'.ts'}';`);
source=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
writeFileSync(temporary,source);
const rng=Math.random;
try{
  const {GameDungeonService}=await import(temporary.href);
  const {createDungeonEnemy,createDungeonEnemies}=await import('../src/app/game/dungeon-core.ts');
  for(let did=1;did<=5;did++){
    const normal=createDungeonEnemy(1,'recruit',did),boss=createDungeonEnemy(1,'recruit',did,true);
    assert.equal(boss.maxHp,normal.maxHp*10);assert.equal(boss.damage,normal.damage*2);assert.equal(boss.speed,.8);
    const service=new GameDungeonService({getState:()=>({})});Math.random=()=>0;
    const drops=service.rollDrops([boss],did);
    const materials=drops.filter(drop=>Number.isInteger(drop.materialId));
    assert.equal(materials.length,5);
    assert.equal(new Set(materials.map(d=>d.materialId)).size,5);
    assert.equal(drops.some(d=>d.runeDefinitionId),did===1,'Nur Dungeon 1 darf unabhängige Rune droppen');
  }
  assert.equal(createDungeonEnemies(1,()=>0,2,()=>.009999)[0].boss,true);assert.equal(createDungeonEnemies(1,()=>0,2,()=>.01)[0].boss,false);
  const service=new GameDungeonService({getState:()=>({})});
  for(const [roll,id] of [[0,10],[.49999,10],[.50001,11],[.79999,11],[.80001,12],[.94999,12],[.95001,13]]){
    let draw=0;
    Math.random=()=>draw++===4?roll:.5; // drei unabhängige Rune-Würfe, dann Materialchance und gewichteter Pool
    assert.equal(service.rollDrops([createDungeonEnemy(1,'recruit',2)],2)[0].materialId,id);
  }
  Math.random=()=>.6;
  assert.deepEqual(service.rollDrops([createDungeonEnemy(1,'recruit',2)],2),[],
    'Bei 40 % der Ergebnisse darf kein Material gewählt werden.');
  // S18: the real service resolves periodic healing without consuming the attack damage path.
  const highElf={id:1,classId:'archer',raceId:'high-elf',hp:1,maxHp:26,alive:true,
    equipment:{leftHand:null,rightHand:null},name:'Bogner',level:1};
  const enemy=createDungeonEnemy(1,'recruit');const hp=enemy.hp;
  const root={characters:[highElf],weaponInventory:[],inventory:{}};migrateTeams(root);
  const svc=new GameDungeonService({getState:()=>root});
  const out={events:[],saveRequested:false};const run={participantIds:[1],enemies:[enemy]};
  svc.playerAttack(svc.getState(1),{ownerId:1,kind:'race-heal',nextAt:10000},run,out);
  assert.equal(enemy.hp,hp,'A healing action must not damage opponents');
  assert.equal(highElf.hp,2,'High Elf archer heals exactly one HP');
  assert.equal(out.saveRequested,true,'Healing is persisted');
}finally{Math.random=rng;unlinkSync(temporary);}
console.log('Schnellrelease: Qualifikation, Suchgrenzen, Claims, Migration, verborgene Missionen, Heilung, 68 Materialien, Dropgrenzen, Bossloot und echte Kampfpfade erfolgreich.');
