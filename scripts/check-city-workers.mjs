import assert from 'node:assert/strict';
import { createInitialCityLayout,validateCityLayout } from '../src/app/game/city-layout-core.ts';
import { createTeam,assignTeamCharacter } from '../src/app/game/team-core.ts';
import { initializeForgeClaims,advanceForgeJobsToReady } from '../src/app/game/forge-claim-core.ts';
import { initializeMarketClaims,advanceMarketJobsToReady } from '../src/app/game/market-claim-core.ts';
import { enqueueForgeJob } from '../src/app/game/forge-core.ts';
import { enqueueMarketJob } from '../src/app/game/market-core.ts';
import { forgeBaseDurationSeconds,FORGE_MINIMUM_SECONDS } from '../src/app/game/forge-core.ts';
import { encodeSave,decodeSave,SAVE_VERSION } from '../src/app/game/save-codec.ts';
import { validateImportedSave } from '../src/app/game/save-transfer-core.ts';
import { assignCityWorker,changeCityWorker,reconcileProductionAssignments,
  validateCityWorkers,elapsedTimedJobWork,workingCharacterIds } from '../src/app/game/city-worker-core.ts';

const base=1_800_000_000_000;
const forgeJob=name=>({weaponName:name,weaponForm:'dagger',slots:[],stats:{},
  valueNickel:30,performance:1,totalSeconds:60});
const marketJob=name=>({type:'material',materialId:1,quantity:1,
  name,valueNickel:15,seconds:60});
const game=()=>{
 const state={cityLayout:createInitialCityLayout(),teams:{1:createTeam(1)},
  characters:[{id:1,name:'A'},{id:2,name:'B'},{id:3,name:'C'},{id:4,name:'D'}],
  forgeJobs:[],forgeQueue:[],forgeReadyJobs:[],marketJobs:[],marketQueue:[],marketReadyJobs:[],
  nextForgeJobNumber:1,nextMarketJobNumber:1,gold:100,inventory:{1:4},weaponInventory:[]};
 initializeForgeClaims(state);initializeMarketClaims(state);
 return state;
};
function add(state,type,x,y){
 const n=state.cityLayout.nextBuildingNumber++;
 const src=state.cityLayout.buildings.find(b=>b.buildingTypeId===type);
 state.cityLayout.buildings.push({...src,buildingInstanceId:'building-'+n,x,y,workerCharacterId:null,activeJobId:null});
 return 'building-'+n;
}
for(const amount of [1,2,5]){
 const s=game();
 for(let i=1;i<amount;i++){add(s,'forge',(i-1)*2,2);add(s,'market',(i-1)*2,6);}
 validateCityLayout(s.cityLayout);
 assert.equal(s.cityLayout.buildings.filter(x=>x.buildingTypeId==='forge').length,amount);
 assert.equal(s.cityLayout.buildings.filter(x=>x.buildingTypeId==='market').length,amount);
 for(let i=0;i<amount;i++){
   const f={...forgeJob('F'+i),jobId:'forge-job-'+(i+1),status:'active',startedAt:base,finishesAt:base+60_000};
   const m={...marketJob('M'+i),jobId:'market-job-'+(i+1),status:'active',startedAt:base,finishesAt:base+60_000};
   s.forgeJobs.push(f);s.marketJobs.push(m);
 }
 assert.equal(reconcileProductionAssignments(s,'forge',base),true);
 assert.equal(reconcileProductionAssignments(s,'market',base),true);
 assert.equal(new Set(s.forgeJobs.map(j=>j.buildingInstanceId)).size,amount);
 assert.equal(new Set(s.marketJobs.map(j=>j.buildingInstanceId)).size,amount);
 assert.equal(reconcileProductionAssignments(s,'forge',base),false);
 validateCityWorkers(s);
}
const s=game();
const forge=s.cityLayout.buildings.find(b=>b.buildingTypeId==='forge');
const market=s.cityLayout.buildings.find(b=>b.buildingTypeId==='market');
assert.ok(forge&&market);
assert.equal(assignCityWorker(s,forge.buildingInstanceId,1).ok,true);
assert.equal(assignCityWorker(s,market.buildingInstanceId,1).reason,'occupied');
assert.equal(assignCityWorker(s,market.buildingInstanceId,2).ok,true);
assert.equal(workingCharacterIds(s).size,2);
assert.equal(assignTeamCharacter(s,1,0,1),false,'Helfer darf nicht ins Team.');
assert.equal(assignTeamCharacter(s,1,0,3),true);
assert.equal(assignCityWorker(s,forge.buildingInstanceId,3).reason,'team','Teamcharakter nicht gleichzeitig Arbeiter.');
assert.equal(changeCityWorker(s,forge.buildingInstanceId,null,base).ok,true);
assert.equal(assignTeamCharacter(s,1,1,1),true);
assert.equal(assignCityWorker(s,forge.buildingInstanceId,1).reason,'team');
assert.equal(assignTeamCharacter(s,1,1,null),true);
assert.equal(assignCityWorker(s,forge.buildingInstanceId,1).ok,true);
validateCityWorkers(s);
assert.equal(forgeBaseDurationSeconds('dagger',1),20);
assert.equal(forgeBaseDurationSeconds('sword',1),45);
assert.equal(forgeBaseDurationSeconds('axe1h',1),45);
assert.equal(forgeBaseDurationSeconds('sword2h',1),75);
assert.equal(forgeBaseDurationSeconds('axe2h',1),75);
assert.equal(forgeBaseDurationSeconds('bow',1),90);
assert.equal(forgeBaseDurationSeconds('staff',1),50);
assert.equal(forgeBaseDurationSeconds('sword',123),123,'Wertabhängige Formel bleibt obere Schranke.');
assert.equal(Object.keys(FORGE_MINIMUM_SECONDS).length,7);
const first={...forgeJob('Helfer'),jobId:'forge-job-1',status:'active',startedAt:base,finishesAt:base+60_000};
s.forgeJobs=[first];
s.nextForgeJobNumber=2;
reconcileProductionAssignments(s,'forge',base);
assert.equal(first.finishesAt,base+50_000,'60 Sekunden bei 120% = 50 Sekunden.');
assert.equal(elapsedTimedJobWork(first,base+25_000),30,'25s × 1,2 = 30s Basisarbeit.');
assert.equal(changeCityWorker(s,forge.buildingInstanceId,null,base+25_000).ok,true);
assert.equal(first.finishesAt,base+55_000,'30s Restarbeit mit 100%=30s.');
assert.equal(elapsedTimedJobWork(first,base+25_000),30,'Helferwechsel verliert keine Arbeit.');
assert.equal(changeCityWorker(s,forge.buildingInstanceId,1,base+35_000).ok,true);
assert.equal(first.finishesAt,base+51_667,'20s Basisrestarbeit /1.2=16,667s.');
assert.ok(elapsedTimedJobWork(first,base+35_000)>=40);
const initialMarket={...marketJob('Helfer Markt'),jobId:'market-job-1',status:'active',startedAt:base,finishesAt:base+60_000};
s.marketJobs=[initialMarket];
s.nextMarketJobNumber=2;
reconcileProductionAssignments(s,'market',base);
assert.equal(initialMarket.finishesAt,base+50_000,'Markt nutzt denselben Worker-Multiplikator.');
const snap=JSON.parse(encodeSave(s,base+35_000));
assert.equal(SAVE_VERSION,23);
assert.equal(snap.saveVersion,23);
assert.equal(validateImportedSave(JSON.stringify(snap)).ok,true,'Save23 mit Gebäudehelfern ist importierbar.');
const loaded=decodeSave(JSON.stringify(snap)).state;
assert.deepEqual(loaded,s);
assert.equal(reconcileProductionAssignments(loaded,'forge',base+35_000),false);
assert.equal(loaded.forgeJobs[0].finishesAt,base+51_667);
assert.equal(changeCityWorker(loaded,forge.buildingInstanceId,null,base+36_000).ok,true);
const after=loaded.forgeJobs[0].finishesAt;
assert.equal(after,base+54_800,'Fortschritt bleibt auch nach Neustart beim Helferwechsel.');
const legacy=game();
legacy.nextForgeJobNumber=10;
legacy.nextMarketJobNumber=10;
legacy.forgeJobs=[{...forgeJob('Save22'),jobId:'forge-job-9',status:'active',startedAt:base-30_000,finishesAt:base+30_000}];
legacy.marketJobs=[{...marketJob('Save22'),jobId:'market-job-9',status:'active',startedAt:base-30_000,finishesAt:base+30_000}];
reconcileProductionAssignments(legacy,'forge',base);
reconcileProductionAssignments(legacy,'market',base);
assert.equal(legacy.forgeJobs[0].finishesAt,base+30_000,'Save22-Kontinuität Forge.');
assert.equal(legacy.marketJobs[0].finishesAt,base+30_000,'Save22-Kontinuität Market.');
assert.equal(legacy.forgeJobs[0].workSpeed,1);
assert.equal(legacy.marketJobs[0].workSpeed,1);
// Queued work must start at actual offline finish time, not at return-to-game time.
const queue=game();
assert.equal(assignCityWorker(queue,queue.cityLayout.buildings.find(b=>b.buildingTypeId==='forge').buildingInstanceId,1).ok,true);
const f1={...forgeJob('Start'),jobId:'forge-job-1',status:'active',startedAt:base,finishesAt:base+60_000};
const f2={...forgeJob('Queue'),jobId:'forge-job-2',status:'queued'};
queue.forgeJobs=[f1];queue.forgeQueue=[f2];queue.nextForgeJobNumber=3;
reconcileProductionAssignments(queue,'forge',base);
assert.equal(f1.finishesAt,base+50_000);
let ready=0;
assert.equal(advanceForgeJobsToReady(queue,1,base+100_000,()=>ready++,
  (_job,at)=>reconcileProductionAssignments(queue,'forge',at)),2);
assert.equal(ready,2);
assert.equal(f2.startedAt,base+50_000);
assert.equal(f2.finishesAt,base+100_000);
assert.equal(queue.forgeReadyJobs.length,2);
assert.equal(advanceForgeJobsToReady(queue,1,base+100_000),0,'Offline-Laden ist idempotent.');
const old=JSON.parse(encodeSave(legacy,base));
old.saveVersion=22;
assert.equal(validateImportedSave(JSON.stringify(old)).ok,true,'Save22-Altstand weiterhin importierbar.');
console.log('S16: 1/2/5 Betriebe, +20%, sieben Waffenminimums, Teamexklusivität, Helferwechsel, Offline und Save22→23 geprüft.');
