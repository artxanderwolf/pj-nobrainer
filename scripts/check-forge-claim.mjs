import assert from 'node:assert/strict';
import { initializeForgeClaims, identifyNewForgeJob, advanceForgeJobsToReady, takeReadyForgeJob } from '../src/app/game/forge-claim-core.ts';
import { enqueueForgeJob, hasForgeCapacity } from '../src/app/game/forge-core.ts';
import { encodeSave, decodeSave, SAVE_VERSION } from '../src/app/game/save-codec.ts';
import { validateImportedSave } from '../src/app/game/save-transfer-core.ts';

const t=1_800_000_000_000;
function job(name, seconds=10){return {weaponName:name,weaponForm:'dagger',slots:[],stats:{},valueNickel:10,performance:1,totalSeconds:seconds};}
const state={forgeJobs:[],forgeQueue:[],weaponInventory:[],nextWeaponId:1,inventory:{4:100}};
assert.equal(initializeForgeClaims(state),true);
assert.equal(initializeForgeClaims(state),false,'Migration ist idempotent.');
for(let i=1;i<=7;i++){
 const j=identifyNewForgeJob(state,job('Waffe '+i));
 const status=enqueueForgeJob(state,j,2,5,t);
 assert.equal(status,i<=2?'started':'queued');
 if(status==='started') j.status='active';
}
assert.equal(state.forgeJobs.length,2);
assert.equal(state.forgeQueue.length,5);
assert.equal(hasForgeCapacity(state,2,5),false,'2 + 5 ist das Gesamtkontingent.');
assert.equal(state.nextForgeJobNumber,8);
assert.equal(new Set([...state.forgeJobs,...state.forgeQueue].map(j=>j.jobId)).size,7);
assert.equal(advanceForgeJobsToReady(state,2,t+10_000),2);
assert.equal(state.forgeReadyJobs.length,2);
assert.equal(state.forgeJobs.length,2,'Ready gibt aktive Schmiedeplätze sofort frei.');
assert.equal(state.forgeQueue.length,3);
assert.equal(hasForgeCapacity(state,2,5),false,'Ready bleibt im Gesamtkontingent.');
assert.equal(state.weaponInventory.length,0,'Keine Waffe vor Claim einlagern.');
assert.deepEqual(state.inventory,{4:100},'Keine zweite Materialreservierung.');
const beforeSave=structuredClone(state);
const raw=encodeSave(state,t+10_000);
assert.equal(SAVE_VERSION,21);
assert.equal(validateImportedSave(raw).ok,true);
const restored=decodeSave(raw).state;
assert.deepEqual(restored,beforeSave);
assert.equal(initializeForgeClaims(restored),false,'Neustart vergibt keine neue ID.');
assert.equal(advanceForgeJobsToReady(restored,2,t+10_000),0,'Kein Offline-Doppelabschluss.');
const id=restored.forgeReadyJobs[0].jobId;
const taken=takeReadyForgeJob(restored,id);
assert.equal(taken.jobId,id);
assert.equal(taken.status,'ready');
assert.equal(takeReadyForgeJob(restored,id),null,'Doppelclaim ist unmöglich.');
assert.equal(restored.forgeReadyJobs.length,1);
assert.equal(hasForgeCapacity(restored,2,5),true,'Abholung schafft erst jetzt neuen Gesamtplatz.');
assert.equal(advanceForgeJobsToReady(restored,2,t+50_000),5);
assert.equal(restored.forgeJobs.length,0);
assert.equal(restored.forgeQueue.length,0);
assert.equal(restored.forgeReadyJobs.length,6);
assert.equal(restored.weaponInventory.length,0,'Auch offline bleibt das Waffenlager unverändert.');
assert.equal(restored.forgeReadyJobs.reduce((a,j)=>a+(j.status==='ready'?1:0),0),6);
const claimedIds=new Set();
for (const ready of [...restored.forgeReadyJobs]){
 const finished=takeReadyForgeJob(restored,ready.jobId);
 assert.ok(finished && !claimedIds.has(finished.jobId));
 claimedIds.add(finished.jobId);
}
assert.equal(restored.forgeReadyJobs.length,0);
assert.equal(takeReadyForgeJob(restored,id),null);
assert.equal(initializeForgeClaims(restored),false);

const legacy={forgeJobs:[{...job('Laufend'),startedAt:t,finishesAt:t+30_000}],forgeQueue:[job('Wartend')]};
assert.equal(initializeForgeClaims(legacy),true,'S13-Save20 wird migriert.');
assert.deepEqual(legacy.forgeJobs.map(j=>j.status),['active']);
assert.deepEqual(legacy.forgeQueue.map(j=>j.status),['queued']);
assert.equal(legacy.forgeJobs[0].finishesAt,t+30_000);
assert.equal(legacy.forgeJobs[0].startedAt,t);
assert.equal(legacy.forgeQueue[0].startedAt,undefined);
assert.equal(initializeForgeClaims(legacy),false);
assert.equal(advanceForgeJobsToReady(legacy,1,t+30_000),1);
assert.equal(legacy.forgeReadyJobs.length,1);
assert.equal(legacy.forgeJobs[0].startedAt,t+30_000,'Altqueue startet zum genauen Zeitpunkt.');
assert.equal(legacy.forgeReadyJobs[0].jobId,'forge-job-1');
assert.equal(legacy.forgeJobs[0].jobId,'forge-job-2');
console.log('S14: 2+5-Kontingent, separate Ready-Jobs, Offline, Claim-Idempotenz und Save20→21-Migration geprüft.');
