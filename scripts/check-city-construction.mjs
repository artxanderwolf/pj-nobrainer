import assert from 'node:assert/strict';
import { createInitialCityLayout, validateCityLayout } from '../src/app/game/city-layout-core.ts';
import { placeCityBuilding } from '../src/app/game/city-placement-core.ts';
import { migrateCityEconomy } from '../src/app/game/city-economy-core.ts';
import { createTeam, getTeamOffer } from '../src/app/game/team-core.ts';
import {
  CITY_CONSTRUCTION_DURATION_MS, initializeCityConstruction, validateCityConstruction,
  availableCityBuilders, startCityConstruction, cancelCityConstruction,
  finishCityConstruction
} from '../src/app/game/city-construction-core.ts';
import { encodeSave, decodeSave, SAVE_VERSION } from '../src/app/game/save-codec.ts';
import { validateImportedSave } from '../src/app/game/save-transfer-core.ts';

assert.equal(CITY_CONSTRUCTION_DURATION_MS, 30*60*1000);
function game() {
  const state = { gold: 1_000_000, characters: [], inventory: {},
    teams: { 1: createTeam(1) }, cityLayout: createInitialCityLayout(),
    upgrades: { forgeSlots: 1, marketSlots: 1 }, forgeQueue: [{id:'forge-old-job'}],
    marketQueue: [{id:'market-old-job'}] };
  assert.equal(migrateCityEconomy(state),true);
  assert.equal(initializeCityConstruction(state),true);
  assert.equal(initializeCityConstruction(state),false);
  return state;
}
const now = 1_800_000_000_000;
const state=game();
const original=structuredClone(state);
const first=startCityConstruction(state,'forge',2,0,now);
assert.equal(first.ok,true);
assert.equal(first.costNickel,50_000);
assert.equal(state.gold,original.gold-50_000);
assert.equal(availableCityBuilders(state),0);
assert.equal(state.cityLayout.buildings.find(b=>b.buildingTypeId==='builder').activeJobId,first.jobId);
assert.equal(state.cityConstruction.jobs.length,1);
assert.equal(state.cityConstruction.jobs[0].completesAt,now+CITY_CONSTRUCTION_DURATION_MS);
const snapshot=structuredClone(state);
const busy=startCityConstruction(state,'market',6,0,now);
assert.equal(busy.ok,false);
assert.match(busy.reason,/beschäftigt/);
assert.deepEqual(state,snapshot,'Belegter Baumeister darf keinen zweiten Auftrag eröffnen.');
const collision=startCityConstruction(state,'market',8,0,now);
assert.equal(collision.ok,false);
assert.deepEqual(state,snapshot,'Fehlerfall darf kein Nickel abbuchen.');
const serialized=encodeSave(state,now);
assert.equal(SAVE_VERSION,20);
assert.equal(validateImportedSave(serialized).ok,true);
const reload=decodeSave(serialized).state;
assert.equal(initializeCityConstruction(reload),false);
assert.equal(finishCityConstruction(reload,now+CITY_CONSTRUCTION_DURATION_MS-1).length,0);
assert.deepEqual(reload,state);
assert.deepEqual(finishCityConstruction(reload,now+CITY_CONSTRUCTION_DURATION_MS),[first.jobId]);
assert.equal(finishCityConstruction(reload,now+CITY_CONSTRUCTION_DURATION_MS).length,0);
assert.equal(availableCityBuilders(reload),1);
assert.equal(reload.cityLayout.buildings.find(b=>b.buildingInstanceId===state.cityConstruction.jobs[0].buildingInstanceId).status,'placed');
assert.equal(reload.gold,state.gold);
assert.deepEqual(reload.forgeQueue,original.forgeQueue);
assert.deepEqual(reload.marketQueue,original.marketQueue);
validateCityConstruction(reload);

const cancelGame=game();
const started=startCityConstruction(cancelGame,'tavern',2,0,now);
assert.equal(started.ok,true);
assert.equal(cancelCityConstruction(cancelGame,started.jobId,now+1000).refundedNickel,200_000);
assert.equal(cancelGame.gold,1_000_000);
assert.equal(cancelGame.cityConstruction.jobs.length,0);
assert.equal(cancelGame.cityLayout.buildings.length,6);
assert.equal(availableCityBuilders(cancelGame),1);
assert.equal(cancelCityConstruction(cancelGame,started.jobId,now+2000).ok,false);
assert.equal(cancelGame.gold,1_000_000,'Keine zweite Rückerstattung.');
const late=game();
const lateJob=startCityConstruction(late,'market',2,0,now);
assert.equal(lateJob.ok,true);
assert.equal(cancelCityConstruction(late,lateJob.jobId,now+CITY_CONSTRUCTION_DURATION_MS).ok,false);
assert.equal(late.cityConstruction.jobs.length,1,'Nach Ablauf muss der Offlineabschluss greifen.');

const noMoney=game();
noMoney.gold=1;
const noMoneyState=structuredClone(noMoney);
assert.equal(startCityConstruction(noMoney,'builder',2,2,now).ok,false);
assert.deepEqual(noMoney,noMoneyState);
const noSpace=game();
const noSpaceState=structuredClone(noSpace);
assert.equal(startCityConstruction(noSpace,'market',11,7,now).ok,false);
assert.deepEqual(noSpace,noSpaceState);
assert.equal(startCityConstruction(noSpace,'market',0,0,now).ok,false);
assert.deepEqual(noSpace,noSpaceState);

const two=game();
const secondBuilder=placeCityBuilding(two.cityLayout,{
  buildingTypeId:'builder',x:2,y:2,width:2,height:2,status:'placed',
  unitSlots:1,teamId:null,workerCharacterId:null,activeJobId:null
});
assert.equal(secondBuilder.ok,true);
two.cityLayout=secondBuilder.layout;
assert.equal(availableCityBuilders(two),2);
const job1=startCityConstruction(two,'forge',2,0,now);
const job2=startCityConstruction(two,'market',6,0,now);
assert.equal(job1.ok,true);
assert.equal(job2.ok,true);
assert.notEqual(job1.jobId,job2.jobId);
assert.equal(availableCityBuilders(two),0);
const double=structuredClone(two);
assert.equal(startCityConstruction(two,'tavern',10,0,now).ok,false);
assert.deepEqual(two,double);
assert.equal(finishCityConstruction(two,now+CITY_CONSTRUCTION_DURATION_MS).length,2);
assert.equal(availableCityBuilders(two),2);
validateCityLayout(two.cityLayout);

const teamGame=game();
const teamJob=startCityConstruction(teamGame,'team',2,0,now);
assert.equal(teamJob.ok,true);
assert.equal(teamGame.teams[2],undefined);
assert.equal(getTeamOffer(teamGame).reason,'building-required','Zusätzliche Teams dürfen nur über Teamgebäude gekauft werden.');
finishCityConstruction(teamGame,now+CITY_CONSTRUCTION_DURATION_MS);
assert.ok(teamGame.teams[2]);
assert.equal(teamGame.cityLayout.buildings.find(b=>b.buildingTypeId==='team'&&b.teamId===2).status,'placed');
assert.equal(startCityConstruction(teamGame,'runeWorkshop',6,0,now).ok,false,
  'Runenwerkstatt erst nach Freischaltung baubar.');
const invalid=structuredClone(two);
invalid.cityConstruction.jobs.push({...double.cityConstruction.jobs[0]});
assert.throws(()=>validateCityConstruction(invalid));
const corrupted=encodeSave(invalid,now);
assert.equal(validateImportedSave(corrupted).ok,false);
console.log('S11: 30-Minuten-Bauzeit, zwei parallele Bauhütten, stabile Job-IDs, Vollerstattung, Platz-/Geldprüfung, Save20 und Offlineabschluss geprüft.');
