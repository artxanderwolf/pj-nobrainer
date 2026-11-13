import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
const url=new URL('../src/app/game/production-worker-core.ts',import.meta.url);
const stub=new URL('../src/app/game/team-core.worker-check.ts',import.meta.url);
const tmp=new URL('../src/app/game/production-worker-core.worker-check.ts',import.meta.url);
const teamStub=`export interface TeamWorldState {teams?: Record<number,unknown>}
export function characterTeamReservation(state:TeamWorldState,id:number):number|null{
 for(const [key,session] of Object.entries(state.teams??{})){
  const t=session as {expeditionActive?:boolean;dungeonAuto?:boolean;dungeonRun?:{participantIds?:number[]};dungeonTeamSlots?:number[]};
  if((t.expeditionActive||t.dungeonAuto||t.dungeonRun) && [...(t.dungeonTeamSlots??[]),...(t.dungeonRun?.participantIds??[])].includes(id))return Number(key);
 }
 return null;
}`;
writeFileSync(stub,teamStub);
writeFileSync(tmp,readFileSync(url,'utf8').replace("from './team-core.ts'","from './team-core.worker-check.ts'"));
try{
 const {createInitialCityLayout}=await import('../src/app/game/city-layout-core.ts');
 const {minimumForgeSeconds,migrateProductionWorkers,operatingBuildings,dispatchProductionQueue,
  advanceProductionToReady,assignProductionHelper,validateWorkerAssignments,mayWorkInBuilding,
  isProductionWorkerReserved}=await import(tmp.href+'?v='+Date.now());
 const t=1_800_000_000_000;
 const city=createInitialCityLayout();
 const make=()=>({cityLayout:structuredClone(city),characters:[{id:1,name:'Schmied'},{id:2,name:'Händler'}],
   teams:{},forgeJobs:[],forgeQueue:[],forgeReadyJobs:[],marketJobs:[],marketQueue:[],marketReadyJobs:[]});
 const state=make();
 assert.equal(migrateProductionWorkers(state),false,'Neuer Stadt-Save braucht keine Arbeitsmigration.');
 const forge=operatingBuildings(state,'forge')[0];
 const market=operatingBuildings(state,'market')[0];
 assert.ok(forge&&market);
 assert.equal(minimumForgeSeconds('dagger',4),20);
 assert.equal(minimumForgeSeconds('sword',20),45);
 assert.equal(minimumForgeSeconds('axe1h',7),45);
 assert.equal(minimumForgeSeconds('sword2h',8),75);
 assert.equal(minimumForgeSeconds('axe2h',8),75);
 assert.equal(minimumForgeSeconds('bow',11),90);
 assert.equal(minimumForgeSeconds('staff',5),50);
 assert.equal(minimumForgeSeconds('bow',100),100,'Wertformel hat Vorrang, wenn länger.');
 const forgeJob={jobId:'forge-job-1',status:'queued',totalSeconds:60};
 state.forgeQueue.push(forgeJob);
 dispatchProductionQueue(state,'forge',state.forgeJobs,state.forgeQueue,t);
 assert.equal(state.forgeJobs.length,1);
 assert.equal(forgeJob.buildingInstanceId,forge.buildingInstanceId);
 assert.equal(forge.activeJobId,forgeJob.jobId);
 assert.equal(forgeJob.finishesAt,t+60_000,'Grundarbeiter arbeitet mit 100%.');
 assert.equal(assignProductionHelper(state,forge.buildingInstanceId,1,t),'assigned');
 assert.equal(forgeJob.finishesAt,t+50_000,'60s physische Arbeit wird mit +20% zu 50s.');
 assert.equal(isProductionWorkerReserved(state,1),true);
 assert.equal(assignProductionHelper(state,market.buildingInstanceId,1,t),'occupied','Kein zweiter Arbeitsplatz.');
 assert.equal(assignProductionHelper(state,forge.buildingInstanceId,999,t),'invalid-character');
 assert.equal(assignProductionHelper(state,forge.buildingInstanceId,null,t+20_000),'assigned');
 assert.equal(forgeJob.finishesAt,t+56_000,'20s bei 120% => 24/60 gearbeitet; Rest 36s.');
 assert.equal(assignProductionHelper(state,forge.buildingInstanceId,1,t+26_000),'assigned');
 assert.equal(forgeJob.finishesAt,t+51_000,'Rest 30s bei 120% => 25s, keine Arbeit verloren.');
 state.forgeQueue.push({jobId:'forge-job-2',status:'queued',totalSeconds:60});
 assert.equal(advanceProductionToReady(state,'forge',state.forgeJobs,state.forgeQueue,state.forgeReadyJobs,t+50_000),0);
 assert.equal(advanceProductionToReady(state,'forge',state.forgeJobs,state.forgeQueue,state.forgeReadyJobs,t+51_000),1);
 assert.equal(state.forgeReadyJobs.length,1);
 assert.equal(state.forgeJobs[0].jobId,'forge-job-2');
 assert.equal(state.forgeJobs[0].startedAt,t+51_000,'Offline-Queue startet zum echten Abschluss.');
 assert.equal(state.forgeJobs[0].finishesAt,t+101_000,'Folgeauftrag erhält Helfergeschwindigkeit.');
 assert.equal(forge.activeJobId,'forge-job-2');
 assert.equal(advanceProductionToReady(state,'forge',state.forgeJobs,state.forgeQueue,state.forgeReadyJobs,t+101_000),1);
 assert.equal(forge.activeJobId,null);
 assert.equal(state.forgeReadyJobs.length,2,'Ready belegt keinen Betrieb.');

 const legacy=make();
 const legacyForge=operatingBuildings(legacy,'forge')[0];
 const old={jobId:'forge-job-41',status:'active',totalSeconds:60,startedAt:t,finishesAt:t+60_000};
 legacy.forgeJobs.push(old);
 legacy.marketJobs.push({jobId:'market-job-42',status:'active',seconds:30,startedAt:t,finishesAt:t+30_000});
 assert.equal(migrateProductionWorkers(legacy),true);
 assert.equal(old.finishesAt,t+60_000,'Save22-Deadline bleibt erhalten.');
 assert.equal(old.buildingInstanceId,legacyForge.buildingInstanceId);
 assert.equal(migrateProductionWorkers(legacy),false,'Migration idempotent.');
 const decoded=structuredClone(legacy);
 assert.equal(migrateProductionWorkers(decoded),false,'Persistenz über JSON-Restart.');
 assert.equal(assignProductionHelper(decoded,legacyForge.buildingInstanceId,1,t+10_000),'assigned');
 assert.equal(decoded.forgeJobs[0].finishesAt,t+10_000+Math.ceil(50_000/1.2));

 const exclusive=make();
 exclusive.teams={1:{expeditionActive:true,dungeonTeamSlots:[2]}};
 assert.equal(mayWorkInBuilding(exclusive,forge.buildingInstanceId,2),false,'Kein Dungeoncharakter als Helfer.');
 exclusive.cityLayout.buildings.find(b=>b.buildingInstanceId===forge.buildingInstanceId).workerCharacterId=1;
 exclusive.cityLayout.buildings.find(b=>b.buildingInstanceId===market.buildingInstanceId).workerCharacterId=1;
 assert.equal(validateWorkerAssignments(exclusive),true,'Ungültige doppelte Save-Buchung wird bereinigt.');
 assert.equal(exclusive.cityLayout.buildings.filter(b=>b.workerCharacterId===1).length,1);
 console.log('S16: Mindestzeiten, Grundarbeiter, 60->50s, Restfortschritt, Offline, Save22->23, Exklusivität und doppelte Arbeit getestet.');
}finally{
 unlinkSync(stub);unlinkSync(tmp);
}
