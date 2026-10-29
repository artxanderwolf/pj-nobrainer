import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import ts from 'typescript';
import {createDungeonSession} from '../src/app/game/parallel-dungeon-core.ts';
import {createTeam,migrateTeams,teamIds,getTeamOffer,buyTeam,selectTeamDungeon,assignTeamCharacter,characterTeamReservation} from '../src/app/game/team-core.ts';
import {initializeReleaseProgress,recordSuccessfulWave} from '../src/app/game/mission-core.ts';
import {encodeSave,decodeSave} from '../src/app/game/save-codec.ts';
import {calculateUpgradeCost,calculateRecruitCost} from '../src/app/game/economy-core.ts';
const files=[];
async function service(name){
 const url=new URL(`../src/app/core/${name}.team-test.mjs`,import.meta.url);files.push(url);
 const source=readFileSync(new URL(`../src/app/core/${name}.ts`,import.meta.url),'utf8').replace("import { Injectable } from '@angular/core';",'').replace(/@Injectable\([^\n]*\)\n/g,'').replace(/from '(\.[^']+)';/g,(m,p)=>`from '${p.endsWith('.ts')?p:p+'.ts'}';`);
 writeFileSync(url,ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);
 return import(url.href);
}
const character=id=>({id,name:`Charakter ${id}`,classId:'recruit',level:1,xp:0,hp:30,maxHp:30,energy:100,maxEnergy:100,alive:true,equipment:{leftHand:null,rightHand:null}});
try {
 const {GameDungeonService}=await service('game-dungeon.service');
 const {GameDungeonSessionService}=await service('game-dungeon-session.service');
 const {GameDungeonEquipmentSyncService}=await service('game-dungeon-equipment-sync.service');
 const world={characters:Array.from({length:10},(_,i)=>character(i+1)),weaponInventory:[],inventory:{},gold:5000000};
 initializeReleaseProgress(world);migrateTeams(world);
 assert.deepEqual(teamIds(world),[1]);assert.equal(world.dungeons,undefined);
 const prices=[];
 for(let i=1;i<10;i++){prices.push(getTeamOffer(world).costNickel);const before=world.gold;assert.equal(buyTeam(world).ok,true);assert.equal(world.gold,before-prices.at(-1));}
 assert.deepEqual(prices,[5000,10000,20000,40000,80000,160000,320000,640000,1280000]);
 const beforeMax=JSON.stringify(world);assert.equal(buyTeam(world).reason,'max');assert.equal(JSON.stringify(world),beforeMax);
 const poor={gold:4999,teams:{1:createTeam(1)}};assert.equal(buyTeam(poor).ok,false);assert.equal(poor.gold,4999);assert.deepEqual(teamIds(poor),[1]);
 for(const kind of ['inn','forgeSlots','marketSlots']){
  const start=kind==='inn'?2:1,growth=kind==='inn'?2:3,base=kind==='inn'?5000:10000;
  for(let step=0;step<4;step++)assert.equal(calculateUpgradeCost(kind,start+step),base*growth**step);
 }
 assert.equal(calculateUpgradeCost('forgeQueue',1),1000);assert.equal(calculateUpgradeCost('marketQueue',1),1000);assert.equal(calculateRecruitCost(1),2000);
 assert.equal(selectTeamDungeon(world,1,2),false,'Locked dungeon rejected by domain action');
 assert.equal(selectTeamDungeon(world,1,999),false);
 world.releaseProgress.claimed.dungeon_2=true;
 const engine=new GameDungeonService({getState:()=>world}),sessions=new GameDungeonSessionService({getState:()=>world},engine);
 for(let id=1;id<=10;id++){
  assert.equal(selectTeamDungeon(world,id,2),true);
  assert.equal(assignTeamCharacter(world,id,0,id),true);
  sessions.open(1000,id);assert.equal(sessions.toggleRun(1000).alertMessage,undefined);
  assert.equal(world.teams[id].dungeonId,2);assert.equal(world.teams[id].dungeonAuto,true);
 }
 assert.equal(selectTeamDungeon(world,1,1),false,'Target immutable during run');
 assert.equal(assignTeamCharacter(world,2,1,1),false);
 world.characters[0].alive=false;world.characters[0].hp=0;world.teams[1].dungeonCycleActiveIds=[];
 assert.equal(characterTeamReservation(world,1),1,'Fallen character remains reserved');
 const ends=Object.fromEntries(teamIds(world).map(id=>[id,world.teams[id].dungeonSessionEndsAt]));
 sessions.close();sessions.update(1500);
 for(const id of teamIds(world))assert.equal(world.teams[id].dungeonSessionEndsAt,ends[id]);
 world.teams[1].progress.waves=149;world.teams[2].progress.waves=149;
 recordSuccessfulWave(world,1,()=>1);recordSuccessfulWave(world,2,()=>1);assert.equal(world.releaseProgress.qualifiedRuns[2],2);
 recordSuccessfulWave(world,1,()=>1);assert.equal(world.releaseProgress.qualifiedRuns[2],2,'Once per team run, shared dungeon total');
 // A run that started before the threshold cannot begin access search midway.
 world.releaseProgress.qualifiedRuns[2]=20;world.teams[3].progress.waves=100;
 recordSuccessfulWave(world,3,()=>{throw Error('Ineligible run rolled access');});
 const restored=decodeSave(encodeSave(world)).state;assert.equal(migrateTeams(restored),false);
 assert.equal(restored.teams[10].dungeonSessionEndsAt,ends[10]);assert.equal(characterTeamReservation(restored,1),1);
 const resumed=new GameDungeonSessionService({getState:()=>restored},new GameDungeonService({getState:()=>restored}));
 resumed.prepareLoadedSession();for(const id of teamIds(restored))assert.equal(restored.teams[id].dungeonAuto,true);
 restored.teams[2].dungeonSessionEndsAt=2200;resumed.update(2300);
 assert.equal(restored.teams[2].dungeonAuto,false);assert.equal(restored.teams[10].dungeonAuto,true);assert.equal(restored.characters[0].hp,0);
 restored.teams[2].dungeonLoot={'5':{materialId:5,category:'Metall',qty:7}};
 restored.teams[10].dungeonLoot={'10':{materialId:10,category:'Holz',qty:9}};
 assert.equal(selectTeamDungeon(restored,2,1),false,'Cannot change target with uncollected loot');
 resumed.collectLoot(2);resumed.collectLoot(2);assert.equal(restored.inventory['5'].qty,7);assert.equal(restored.teams[10].dungeonLoot['10'].qty,9);
 assert.equal(selectTeamDungeon(restored,2,1),true);
 // Distinct logs/events and manual abort with pending earned drops.
 restored.teams[10].dungeonLootCollect={readyAt:5000,drops:[{materialId:5}],enemyCount:1};
 resumed.open(2400,10);const aborted=resumed.toggleRun(2400);
 assert.ok(aborted.events.every(e=>e.teamId===10));assert.equal(restored.teams[10].dungeonLoot['5'].qty,1);assert.equal(restored.teams[9].dungeonAuto,true);
 restored.teams[2].dungeonTeamSlots=[1,null,null,null];resumed.open(2500,2);assert.match(resumed.toggleRun(2500).alertMessage,/anderen Dungeon/);
 assert.equal(restored.characters[0].hp,0,'Rejected start cannot heal a character in another team');
 for(const id of [3,9]){restored.characters[id-1].hp=10;restored.characters[id-1].alive=true;restored.teams[id].dungeonRun={participantIds:[id],enemies:[],attackPoints:[],dungeonId:2,startedAt:0,energyShare:0,totalEnergyCost:0};}
 new GameDungeonEquipmentSyncService({getState:()=>restored}).refresh(3000);
 assert.equal(restored.teams[3].dungeonRun.attackPoints.length,1);assert.equal(restored.teams[9].dungeonRun.attackPoints.length,1);
 // Released v16: keep idle selection, active run with progress, and separate unclaimed loot.
 const old={characters:[],inventory:{},dungeons:Object.fromEntries([1,2,3,4,5].map(id=>[id,createDungeonSession(id)]))};initializeReleaseProgress(old);
 old.dungeons[2].dungeonTeamSlots=[42,null,null,null];
 Object.assign(old.dungeons[3],{dungeonAuto:true,dungeonSearch:{nextCheckAt:1234},dungeonSessionEndsAt:99999,progress:{dungeonId:3,waves:150,qualified:false,searchEligible:false},log:[{text:'Bestand',className:''}]});
 old.dungeons[5].dungeonLoot={'27':{materialId:27,qty:2,category:'Holz'}};
 migrateTeams(old);assert.deepEqual(teamIds(old),[1,2,3]);assert.equal(old.teams[1].dungeonTeamSlots[0],42);assert.equal(old.teams[2].dungeonSessionEndsAt,99999);assert.equal(old.teams[2].log[0].text,'Bestand');assert.equal(old.teams[3].dungeonLoot['27'].qty,2);assert.equal(old.releaseProgress.qualifiedRuns[3],1);
 const snapshot=JSON.stringify(old);migrateTeams(old);assert.equal(JSON.stringify(old),snapshot);
 // Real older single-session save keeps pending loot, exact deadline, group and progress.
 const v15={characters:[],selectedDungeonId:3,dungeonAuto:true,dungeonSearch:{nextCheckAt:12345},dungeonTeamSlots:[42,null,null,null],dungeonCycleOriginalIds:[42],dungeonSessionEndsAt:99999,dungeonLootCollect:{readyAt:20000,drops:[{materialId:26}],enemyCount:1}};
 initializeReleaseProgress(v15);v15.selectedDungeonId=3;migrateTeams(v15);
 assert.equal(v15.teams[1].dungeonId,3);assert.equal(v15.teams[1].dungeonSessionEndsAt,99999);assert.equal(v15.teams[1].dungeonLootCollect.drops[0].materialId,26);
 const duplicate={characters:[character(1)],teams:{1:createTeam(1),2:createTeam(2)}};initializeReleaseProgress(duplicate);
 for(const t of Object.values(duplicate.teams)){t.dungeonAuto=true;t.dungeonTeamSlots=[1,null,null,null];t.dungeonCycleOriginalIds=[1];}
 duplicate.teams[2].dungeonLootCollect={readyAt:10,drops:[{materialId:10}],enemyCount:1};duplicate.characters[0].hp=7;
 assert.equal(migrateTeams(duplicate),true);assert.equal(duplicate.teams[1].dungeonAuto,true);assert.equal(duplicate.teams[2].dungeonAuto,false);assert.equal(duplicate.teams[2].dungeonLoot['10'].qty,1);assert.equal(duplicate.characters[0].hp,7);
 console.log('Teams: 10 parallele Läufe im selben Dungeon, Kaufpreise/Limit, Zielprüfung, Charakterreservierung, Tod, Timeout, Abbruch, Loot-Isolation, Reload, Save-15/16-Migration, Fortschritt und Ausrüstungs-Timer erfolgreich.');
} finally {for(const file of files)unlinkSync(file);}
