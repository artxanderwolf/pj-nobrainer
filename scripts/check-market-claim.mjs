import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { createInitialCityLayout } from '../src/app/game/city-layout-core.ts';
import { availableRuneItems } from '../src/app/game/rune-inventory-core.ts';
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
assert.equal(SAVE_VERSION,29);
assert.equal(validateImportedSave(serialized).ok,true,'Save-29-Export kann wieder importiert werden.');
const previousSave = validateImportedSave(JSON.stringify({saveVersion:28,savedAt:now+10_000,state:s}));
assert.equal(previousSave.ok,true);
assert.deepEqual(previousSave.state,s,'Save-28-Aufträge behalten ihren gespeicherten Zustand.');
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

const serviceUrl = new URL('../src/app/core/game-market.service.ts', import.meta.url);
const marketSource = readFileSync(serviceUrl, 'utf8')
  .replace("import { Injectable } from '@angular/core';", '')
  .replace("@Injectable({ providedIn: 'root' })", '')
  .replace(/from '(\.\.?\/[^']+)';/g, (_, path) =>
    `from '${new URL(path.endsWith('.ts') ? path : path + '.ts', serviceUrl).href}';`);
const compiled = ts.transpileModule(marketSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
}).outputText;
const { GameMarketService } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

const runeWorld = {
  ...state(), gold: 0, cityLayout: createInitialCityLayout(), upgrades: {marketQueue:2},
  forgeJobs:[], forgeQueue:[], forgeReadyJobs:[],
  runeInventory:[
    {runeItemId:'rune-item-1',runeDefinitionId:'rune-p-1'},
    {runeItemId:'rune-item-2',runeDefinitionId:'rune-p-2'},
    {runeItemId:'rune-item-3',runeDefinitionId:'rune-p-1'}
  ],
  weaponInventory:[{id:8,runeSockets:['rune-item-3']}]
};
let current = runeWorld;
const service = new GameMarketService({ getState: () => current });
assert.equal(service.startRune('rune-item-3', now).status,'not-available');
assert.equal(service.startRune('missing', now).status,'not-available');
assert.equal(service.startRune('rune-item-1', now).status,'started');
assert.equal(service.startRune('rune-item-1', now).status,'not-available');
assert.equal(service.startRune('rune-item-2', now).status,'queued');
assert.deepEqual(availableRuneItems(current),[]);
assert.equal(current.marketJobs[0].finishesAt,now+2_515_000);
assert.equal(current.marketQueue[0].seconds,7515);

const savedRunes = encodeSave(current, now);
assert.equal(validateImportedSave(savedRunes).ok,true);
current = decodeSave(savedRunes).state;
assert.deepEqual(availableRuneItems(current),[]);
const invalidRunes = structuredClone(current);
invalidRunes.marketQueue[0] = { ...invalidRunes.marketJobs[0], jobId: 'market-job-2' };
assert.equal(validateImportedSave(encodeSave(invalidRunes, now)).reason,'invalid-state');
assert.equal(service.cancel('queue',0,now).name,'Präzision II (+10 %)');
assert.deepEqual(availableRuneItems(current),[runeWorld.runeInventory[1]]);
assert.equal(service.startRune('rune-item-2',now).status,'queued');
assert.equal(service.cancel('active',0,now).name,'Präzision I (+5 %)');
assert.deepEqual(availableRuneItems(current),[runeWorld.runeInventory[0]]);
assert.equal(current.marketJobs[0].finishesAt,now+7_515_000);
assert.equal(service.update(now+7_515_000).completedCount,1);
assert.equal(current.gold,0);
assert.equal(service.startRune('rune-item-2',now+7_515_000).status,'not-available');
current = decodeSave(encodeSave(current,now+7_515_000)).state;
const readyId = current.marketReadyJobs[0].jobId;
assert.equal(service.claim(readyId).valueNickel,15000);
assert.equal(service.claim(readyId),null);
assert.equal(current.gold,15000);
assert.deepEqual(current.runeInventory,[runeWorld.runeInventory[0],runeWorld.runeInventory[2]]);
assert.equal(service.claimAll().length,0);
console.log('S11: identische Rune reserviert und storniert, Save 29, Warteschlange, Offlineabschluss und einmalige Auszahlung geprüft.');
