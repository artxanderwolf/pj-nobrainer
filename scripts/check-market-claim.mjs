import assert from 'node:assert/strict';
import {
  initializeMarketClaims, identifyNewMarketJob, advanceMarketJobsToReady, takeReadyMarketJob
} from '../src/app/game/market-claim-core.ts';
import { enqueueMarketJob, hasMarketCapacity, cancelMarketJob } from '../src/app/game/market-core.ts';
import { encodeSave, decodeSave, SAVE_VERSION } from '../src/app/game/save-codec.ts';
import { validateImportedSave } from '../src/app/game/save-transfer-core.ts';

const now=1_800_000_000_000;
const material=(id,qty=2)=>({type:'material',materialId:id,quantity:qty,valueNickel:10*qty,seconds:10});
const weapon=(id)=>({type:'weapon',weaponId:id,name:'Schwert '+id,
  weaponSnapshot:{id,name:'Schwert '+id,valueNickel:100},valueNickel:100,seconds:10});
function state(){return {marketJobs:[],marketQueue:[],marketReadyJobs:undefined,
  gold:250,inventory:{1:20},weaponInventory:[],characters:[]};}
const s=state();
assert.equal(initializeMarketClaims(s),true);
assert.equal(initializeMarketClaims(s),false);
for(let i=0;i<7;i++){
  const job=identifyNewMarketJob(s,i%2===0?material(1):weapon(i+10));
  const result=enqueueMarketJob(s,job,2,5,now);
  assert.equal(result,i<2?'started':'queued');
  job.status=result==='started'?'active':'queued';
}
assert.equal(new Set([...s.marketJobs,...s.marketQueue].map(job=>job.jobId)).size,7);
assert.equal(s.marketJobs.length,2);
assert.equal(s.marketQueue.length,5);
assert.equal(hasMarketCapacity(s,2,5),false,'Auch Ready zählt zum 2+5-Gesamtkontingent.');
assert.equal(advanceMarketJobsToReady(s,2,now+10_000),2);
assert.equal(s.marketJobs.length,2);
assert.equal(s.marketQueue.length,3);
assert.equal(s.marketReadyJobs.length,2);
assert.equal(s.gold,250,'Fertigstellung schreibt keinen Nickel gut.');
assert.equal(hasMarketCapacity(s,2,5),false,'Ready blockiert nur das Gesamtkontingent.');
assert.equal(s.marketReadyJobs[0].status,'ready');
const serialized=encodeSave(s,now+10_000);
assert.equal(SAVE_VERSION,22);
assert.equal(validateImportedSave(serialized).ok,true,'Save22-Export kann wieder importiert werden.');
const restored=decodeSave(serialized).state;
assert.deepEqual(restored,s);
assert.equal(initializeMarketClaims(restored),false,'Neustart darf keine Aufträge duplizieren.');
assert.equal(advanceMarketJobsToReady(restored,2,now+10_000),0,'Offline kein doppelter Fertigabschluss.');
const firstId=restored.marketReadyJobs[0].jobId;
const first=takeReadyMarketJob(restored,firstId);
assert.equal(first.status,'claimed');
assert.equal(takeReadyMarketJob(restored,firstId),null,'ID wird nur einmal ausgezahlt.');
restored.gold+=first.valueNickel;
assert.equal(restored.gold,270);
assert.equal(restored.marketReadyJobs.length,1);
assert.equal(hasMarketCapacity(restored,2,5),true,'Erst Claim macht einen Gesamtplatz frei.');
assert.equal(advanceMarketJobsToReady(restored,2,now+50_000),5);
assert.equal(restored.marketJobs.length,0);
assert.equal(restored.marketQueue.length,0);
assert.equal(restored.marketReadyJobs.length,6);
assert.equal(restored.gold,270,'Auch Offlineverkäufe zahlen nicht automatisch aus.');
const claimed=new Set([firstId]);
for(const job of [...restored.marketReadyJobs]){
  const paid=takeReadyMarketJob(restored,job.jobId);
  assert.ok(paid&&!claimed.has(job.jobId));
  claimed.add(job.jobId);
  restored.gold+=paid.valueNickel;
}
assert.equal(claimed.size,7);
assert.equal(restored.marketReadyJobs.length,0);
assert.equal(takeReadyMarketJob(restored,firstId),null);
const expected=250 + [material(1),weapon(11),material(1),weapon(13),material(1),weapon(15),material(1)].reduce((v,j)=>v+j.valueNickel,0);
assert.equal(restored.gold,expected,'Material- und Waffenverkäufe zahlen genau einmal aus.');

const legacy={marketJobs:[{...material(1),startedAt:now,finishesAt:now+30_000}],
  marketQueue:[weapon(201)],gold:100,inventory:{1:0},weaponInventory:[]};
assert.equal(initializeMarketClaims(legacy),true,'Save21-Migration fügt IDs und Status hinzu.');
assert.equal(initializeMarketClaims(legacy),false);
assert.equal(legacy.marketJobs[0].startedAt,now);
assert.equal(legacy.marketJobs[0].finishesAt,now+30_000);
assert.deepEqual(legacy.marketJobs.map(j=>j.status),['active']);
assert.deepEqual(legacy.marketQueue.map(j=>j.status),['queued']);
assert.equal(advanceMarketJobsToReady(legacy,1,now+30_000),1);
assert.equal(legacy.marketReadyJobs.length,1);
assert.equal(legacy.marketJobs[0].startedAt,now+30_000);
assert.equal(legacy.gold,100,'Keine rückwirkende Nickelgutschrift.');
const canceled=cancelMarketJob(legacy,'active',0,1,now+31_000);
assert.equal(canceled.weaponSnapshot.id,201,'Aktiver Verkauf kann storniert und Ware zurückgegeben werden.');
assert.equal(legacy.marketReadyJobs.length,1,'Storno berührt keinen fertigen Verkauf.');
const paid=takeReadyMarketJob(legacy,legacy.marketReadyJobs[0].jobId);
assert.equal(paid.valueNickel,20);
assert.equal(takeReadyMarketJob(legacy,paid.jobId),null);
assert.equal(legacy.marketReadyJobs.length,0);
console.log('S15: 2+5-Grenze, Material-/Waffenverkäufe, Offline, Storno, Save21→22 und genau einmalige Auszahlung geprüft.');
