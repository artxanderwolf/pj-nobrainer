import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import ts from 'typescript';
import {createDungeonSession,getDungeonSession,migrateParallelDungeons,assignDungeonCharacter,characterDungeonReservation} from '../src/app/game/parallel-dungeon-core.ts';
import {initializeReleaseProgress,recordSuccessfulWave,claimMission,missions} from '../src/app/game/mission-core.ts';
import {encodeSave,decodeSave} from '../src/app/game/save-codec.ts';
const createCharacter=(id,name)=>({id,name,classId:'recruit',level:1,xp:0,hp:30,maxHp:30,energy:100,maxEnergy:100,alive:true,equipment:{leftHand:null,rightHand:null}});
const files=[];
async function service(name){
 const url=new URL(`../src/app/core/${name}.parallel-test.mjs`,import.meta.url);files.push(url);
 const source=readFileSync(new URL(`../src/app/core/${name}.ts`,import.meta.url),'utf8').replace("import { Injectable } from '@angular/core';",'').replace(/@Injectable\([^\n]*\)\n/g,'').replace(/from '(\.[^']+)';/g,(m,p)=>`from '${p.endsWith('.ts')?p:p+'.ts'}';`);
 writeFileSync(url,ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);
 return import(url.href);
}
try{
 const {GameDungeonService}=await service('game-dungeon.service');
 const {GameDungeonSessionService}=await service('game-dungeon-session.service');
 const {GameDungeonEquipmentSyncService}=await service('game-dungeon-equipment-sync.service');
 const world={characters:Array.from({length:5},(_,i)=>createCharacter(i+1,`Charakter ${i+1}`)),weaponInventory:[],inventory:{}};
 initializeReleaseProgress(world);migrateParallelDungeons(world);for(let i=2;i<=5;i++)world.releaseProgress.claimed[`dungeon_${i}`]=true;
 const state={getState:()=>world},engine=new GameDungeonService(state),sessions=new GameDungeonSessionService(state,engine);
 for(let id=1;id<=5;id++){
  assert.equal(assignDungeonCharacter(world,id,0,id),true);sessions.open(1000,id);const result=sessions.toggleRun(1000+id);assert.equal(result.alertMessage,undefined);assert.equal(world.dungeons[id].dungeonAuto,true);
 }
 assert.equal(characterDungeonReservation(world,1),1);
 assert.equal(assignDungeonCharacter(world,2,1,1),false);
 world.dungeons[1].dungeonCycleActiveIds=[];world.characters[0].alive=false;world.characters[0].hp=0;
 assert.equal(characterDungeonReservation(world,1),1,'Fallen participants stay reserved');
 const before=Object.fromEntries(Object.entries(world.dungeons).map(([id,d])=>[id,d.dungeonSessionEndsAt]));
 sessions.close();sessions.update(1500);for(let id=1;id<=5;id++)assert.equal(world.dungeons[id].dungeonSessionEndsAt,before[id]);
 sessions.open(1600,2);sessions.toggleRun(1600);
 assert.equal(world.dungeons[2].dungeonAuto,false);for(const id of [1,3,4,5])assert.equal(world.dungeons[id].dungeonAuto,true);
 assert.equal(world.characters[0].hp,0,'Stopping another dungeon must not heal this participant');
 world.dungeons[2].dungeonTeamSlots=[1,null,null,null];sessions.open(1700,2);const rejected=sessions.toggleRun(1700);assert.match(rejected.alertMessage,/anderen Dungeon/);assert.equal(world.dungeons[2].dungeonAuto,false);
 assert.equal(assignDungeonCharacter(world,2,0,2),true);sessions.toggleRun(1800);
 world.dungeons[1].progress.waves=359;world.dungeons[2].progress.waves=359;
 recordSuccessfulWave(world,1,()=>1);assert.equal(world.releaseProgress.qualifiedRuns[1],1);assert.equal(world.releaseProgress.qualifiedRuns[2],undefined);
 recordSuccessfulWave(world,2,()=>1);assert.equal(world.releaseProgress.qualifiedRuns[2],1);
 const restored=decodeSave(encodeSave(world)).state;migrateParallelDungeons(restored);
 assert.equal(restored.dungeons[1].progress.qualified,true);assert.equal(restored.dungeons[2].progress.qualified,true);
 assert.equal(characterDungeonReservation(restored,2),2);assert.equal(restored.dungeons[5].dungeonSessionEndsAt,before[5]);
 const restoredEngine=new GameDungeonService({getState:()=>restored}),restoredSessions=new GameDungeonSessionService({getState:()=>restored},restoredEngine);
 restoredSessions.prepareLoadedSession(2000);for(let id=1;id<=5;id++)assert.equal(restored.dungeons[id].dungeonAuto,true);
 // Only the timed-out run ends. Other runs keep their deadlines and reservations.
 restored.dungeons[2].dungeonSessionEndsAt=2200;restoredSessions.update(2300);assert.equal(restored.dungeons[2].dungeonAuto,false);assert.equal(restored.dungeons[3].dungeonAuto,true);
 restored.dungeons[2].dungeonLoot={'5':{materialId:5,category:'Metall',qty:7}};
 restored.dungeons[3].dungeonLoot={'10':{materialId:10,category:'Holz',qty:9}};
 restoredSessions.collectLoot(2);assert.equal(restored.inventory['5'].qty,7);assert.equal(restored.dungeons[3].dungeonLoot['10'].qty,9);
 // Migration preserves a real v15 selected session, including unfinished loot and progress.
 const old={characters:[],weaponInventory:[],inventory:{},selectedDungeonId:3,dungeonAuto:true,dungeonSearch:{nextCheckAt:12345},dungeonTeamSlots:[42,null,null,null],dungeonCycleOriginalIds:[42],dungeonCycleActiveIds:[42],dungeonRun:null,dungeonLootCollect:{readyAt:20000,drops:[{materialId:26}],enemyCount:1},dungeonLoot:{'27':{materialId:27,category:'Holz',qty:2}},dungeonWavesDefeated:500,dungeonSessionStartWaves:100,dungeonSessionEndsAt:99999};
 initializeReleaseProgress(old);old.selectedDungeonId=3;old.releaseProgress.session={dungeonId:3,waves:400,qualified:true,searchEligible:true};migrateParallelDungeons(old);
 assert.equal(old.dungeons[3].dungeonSessionEndsAt,99999);assert.equal(old.dungeons[3].dungeonLootCollect.drops[0].materialId,26);assert.equal(old.dungeons[3].progress.searchEligible,true);assert.equal('dungeonAuto' in old,false);assert.equal('session' in old.releaseProgress,false);
 const snapshot=JSON.stringify(old);migrateParallelDungeons(old);assert.equal(JSON.stringify(old),snapshot,'Migration must be idempotent');
 // Imported double booking: stop only the later dungeon and preserve earned drops.
 const bad={characters:[createCharacter(1,'A')],inventory:{},weaponInventory:{}};initializeReleaseProgress(bad);migrateParallelDungeons(bad);
 for(const id of [1,2]){const d=bad.dungeons[id];d.dungeonAuto=true;d.dungeonTeamSlots=[1,null,null,null];d.dungeonCycleOriginalIds=[1];}
 bad.dungeons[2].dungeonLootCollect={readyAt:10,drops:[{materialId:10}],enemyCount:1};bad.characters[0].hp=7;migrateParallelDungeons(bad);
 assert.equal(bad.dungeons[1].dungeonAuto,true);assert.equal(bad.dungeons[2].dungeonAuto,false);assert.equal(bad.dungeons[2].dungeonLoot['10'].qty,1);assert.equal(bad.characters[0].hp,7);
 // Equipment timers refresh every session, not only the visible one.
 for(const id of [1,3]){const d=restored.dungeons[id];d.dungeonRun={participantIds:[id],enemies:[],attackPoints:[],dungeonId:id,startedAt:0,energyShare:0,totalEnergyCost:0};restored.characters[id-1].alive=true;restored.characters[id-1].hp=10;}
 new GameDungeonEquipmentSyncService({getState:()=>restored}).refresh(3000);assert.equal(restored.dungeons[1].dungeonRun.attackPoints.length,1);assert.equal(restored.dungeons[3].dungeonRun.attackPoints.length,1);
 console.log('Parallele Dungeons: fünf unabhängige Läufe, doppelte Belegung blockiert, Tod/Abbruch/Timeout, Migration, Reload, Beute, Fortschritt und Ausrüstungs-Timer erfolgreich.');
}finally{for(const file of files)unlinkSync(file);}
