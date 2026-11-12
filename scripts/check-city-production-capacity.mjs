import assert from 'node:assert/strict';
import { createInitialCityLayout, validateCityLayout } from '../src/app/game/city-layout-core.ts';
import { placeCityBuilding } from '../src/app/game/city-placement-core.ts';
import { productionActiveSlots, replayProductionConstructionMilestones } from '../src/app/game/city-production-capacity-core.ts';
import { migrateCityEconomy } from '../src/app/game/city-economy-core.ts';
import { initializeCityConstruction, startCityConstruction, CITY_CONSTRUCTION_DURATION_MS } from '../src/app/game/city-construction-core.ts';
import { hasForgeCapacity, enqueueForgeJob, advanceForgeJobs } from '../src/app/game/forge-core.ts';
import { hasMarketCapacity, enqueueMarketJob, advanceMarketJobs } from '../src/app/game/market-core.ts';
import { createTeam } from '../src/app/game/team-core.ts';
import { encodeSave, decodeSave, SAVE_VERSION } from '../src/app/game/save-codec.ts';
import { validateImportedSave } from '../src/app/game/save-transfer-core.ts';

function createGame() {
  const state={gold:2_000_000,cityLayout:createInitialCityLayout(),
    upgrades:{forgeSlots:1,forgeQueue:3,marketSlots:1,marketQueue:3},
    teams:{1:createTeam(1)},characters:[],inventory:{},
    forgeJobs:[],forgeQueue:[],marketJobs:[],marketQueue:[],weaponInventory:[]};
  migrateCityEconomy(state);initializeCityConstruction(state);
  return state;
}
function addBuilding(state,type,x,y,status='placed'){
  const result=placeCityBuilding(state.cityLayout,{
    buildingTypeId:type,x,y,width:2,height:2,status,unitSlots:1,
    teamId:null,workerCharacterId:null,activeJobId:null});
  assert.equal(result.ok,true);
  state.cityLayout=result.layout;
}
for(const amount of [1,2,5]){
 const s=createGame();
 for(let n=1;n<amount;n++){
   addBuilding(s,'forge',(n-1)*2,2);
   addBuilding(s,'market',(n-1)*2,6);
 }
 s.upgrades.forgeSlots=10;
 s.upgrades.marketSlots=10;
 assert.equal(productionActiveSlots(s,'forge'),amount);
 assert.equal(productionActiveSlots(s,'market'),amount);
 assert.equal(productionActiveSlots(s,'forge'),s.cityLayout.buildings.filter(x=>x.buildingTypeId==='forge'&&x.status==='placed').length);
 for(let i=0;i<amount;i++){
   assert.equal(enqueueForgeJob(s,{weaponName:'Job '+i,totalSeconds:100},amount,3,0),'started');
   assert.equal(enqueueMarketJob(s,{type:'material',materialId:1,seconds:100,valueNickel:1},amount,3,0),'started');
 }
 assert.equal(s.forgeJobs.length,amount);
 assert.equal(s.marketJobs.length,amount);
 for(let i=0;i<3;i++){
   assert.equal(enqueueForgeJob(s,{weaponName:'Q '+i,totalSeconds:100},amount,3,0),'queued');
   assert.equal(enqueueMarketJob(s,{type:'material',materialId:1,seconds:100,valueNickel:1},amount,3,0),'queued');
 }
 assert.equal(hasForgeCapacity(s,amount,3),false);
 assert.equal(hasMarketCapacity(s,amount,3),false);
 assert.equal(s.forgeQueue.length,3);
 assert.equal(s.marketQueue.length,3);
 assert.equal(advanceForgeJobs(s,amount,1_000_000,()=>{}),amount+3);
 assert.equal(advanceMarketJobs(s,amount,1_000_000,()=>{}),amount+3);
 assert.equal(s.forgeJobs.length,0);
 assert.equal(s.marketJobs.length,0);
 assert.equal(s.forgeQueue.length,0);
 assert.equal(s.marketQueue.length,0);
 validateCityLayout(s.cityLayout);
}
const planned=createGame();
addBuilding(planned,'forge',2,0,'inactive');
assert.equal(productionActiveSlots(planned,'forge'),1);
const construction=createGame();
const t=1_800_000_000_000;
const build=startCityConstruction(construction,'forge',2,0,t);
assert.equal(build.ok,true);
assert.equal(productionActiveSlots(construction,'forge'),1);
const marketBuild=startCityConstruction(construction,'market',6,0,t);
assert.equal(marketBuild.ok,false,'Nur eine Bauhütte.');
const second=placeCityBuilding(construction.cityLayout,{buildingTypeId:'builder',x:2,y:2,
 width:2,height:2,status:'placed',unitSlots:1,teamId:null,workerCharacterId:null,activeJobId:null});
assert.equal(second.ok,true);
construction.cityLayout=second.layout;
const marketBuild2=startCityConstruction(construction,'market',6,0,t);
assert.equal(marketBuild2.ok,true);

const forgeActive={weaponName:'original',totalSeconds:3600,startedAt:t,finishesAt:t+3_600_000};
const marketActive={type:'material',materialId:1,seconds:3600,valueNickel:777,startedAt:t,finishesAt:t+3_600_000};
construction.forgeJobs.push(forgeActive);
construction.marketJobs.push(marketActive);
for(let i=0;i<2;i++){
 construction.forgeQueue.push({weaponName:'forgequeued-'+i,totalSeconds:1200});
 construction.marketQueue.push({type:'material',materialId:1,seconds:1200,valueNickel:10+i});
}
const snapshot=structuredClone(construction);
const stored=encodeSave(construction,t);
assert.equal(SAVE_VERSION,20,'S13 benötigt keine neuen persistenten Felder.');
assert.equal(validateImportedSave(stored).ok,true);
const reloaded=decodeSave(stored).state;
assert.deepEqual(reloaded,snapshot);
let forged=0,marketed=0;
const distribute=at=>{
 const forge=advanceForgeJobs(reloaded,productionActiveSlots(reloaded,'forge'),at,()=>forged++);
 const market=advanceMarketJobs(reloaded,productionActiveSlots(reloaded,'market'),at,()=>marketed++);
 assert.ok(forge>=0&&market>=0);
};
const due=t+CITY_CONSTRUCTION_DURATION_MS;
const jobs=replayProductionConstructionMilestones(reloaded,due,distribute);
assert.equal(jobs.length,2);
assert.equal(productionActiveSlots(reloaded,'forge'),2);
assert.equal(productionActiveSlots(reloaded,'market'),2);
assert.equal(reloaded.forgeJobs.length,2);
assert.equal(reloaded.marketJobs.length,2);
assert.equal(reloaded.forgeJobs[0].finishesAt,forgeActive.finishesAt,'Altauftrag nicht neu gestartet.');
assert.equal(reloaded.marketJobs[0].finishesAt,marketActive.finishesAt,'Verkauf nicht neu gestartet.');
assert.equal(reloaded.forgeJobs[1].startedAt,due,'Zweite Schmiede muss nächste Queue genau bei Bauende beginnen.');
assert.equal(reloaded.marketJobs[1].startedAt,due,'Zweiter Markt muss nächste Queue genau bei Bauende beginnen.');
assert.equal(reloaded.forgeQueue.length,1);
assert.equal(reloaded.marketQueue.length,1);
assert.equal(replayProductionConstructionMilestones(reloaded,due,distribute).length,0,'Doppelabschluss verhindern.');
distribute(due+2_400_000);
assert.equal(forged,3);
assert.equal(marketed,3);
assert.equal(reloaded.forgeQueue.length,0);
assert.equal(reloaded.marketQueue.length,0);
assert.equal(reloaded.forgeJobs.length,0);
assert.equal(reloaded.marketJobs.length,0);
assert.deepEqual(reloaded.inventory,snapshot.inventory,'Queue-Verteilung verändert keine Reservierungen.');
assert.deepEqual(reloaded.weaponInventory,snapshot.weaponInventory);
console.log('S13: 1/2/5 Gebäude, fertige/inaktive Kapazität, gemeinsame Listen, volle Queue, Altaufträge und Offline-Baumeilensteine geprüft.');
