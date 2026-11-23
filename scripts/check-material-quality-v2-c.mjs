import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MATERIAL_REFERENCES, getMaterialQualityDefinitionById, calculateWeaponStats, rarityFactor, getWeaponForm} from '../src/app/game/game-core.ts';
import {MATERIAL_QUALITIES, rollMaterialQuality, scaleMaterialStat} from '../src/app/game/material-quality-core.ts';
import {getMaterialStorageEntries, getMaterialQuantityById, addMaterialQuantityById, takeMaterialQuantityById, normalizeMaterialInventory, reserveMaterialQuantitiesById} from '../src/app/game/material-storage-core.ts';
import {forgeRequirements, createForgeJob, refreshForgeJobBalance} from '../src/app/game/forge-core.ts';
import {migrateMaterialQualityWorld, normalizeQualityWeapon} from '../src/app/game/material-quality-migration-core.ts';
import {applyRuneBonuses, runeSocketCount, rollRuneDefinition} from '../src/app/game/rune-core.ts';
import {recomputeRunedWeapon, removeRune, equipRune} from '../src/app/game/rune-inventory-core.ts';
import {encodeSave, decodeSave, SAVE_VERSION} from '../src/app/game/save-codec.ts';
import {validateImportedSave} from '../src/app/game/save-transfer-core.ts';

assert.equal(SAVE_VERSION,28);
assert.deepEqual(MATERIAL_REFERENCES.map(r=>r.materialId),Array.from({length:77},(_,i)=>i+1));
let combinations=0;
for(const reference of MATERIAL_REFERENCES) for(const quality of MATERIAL_QUALITIES){
  const material=getMaterialQualityDefinitionById(reference.materialId,quality);
  assert.equal(material.materialId,reference.materialId);
  assert.equal(material.rarity,quality);
  for(const [stat,value] of Object.entries(material.stats)){
    assert.equal(value,scaleMaterialStat(reference.definition.stats[stat],quality));
    assert.ok(Number.isFinite(value)&&value>=0);
    if(reference.definition.stats[stat]===0)assert.equal(value,0);
  }
  const inventory={};addMaterialQuantityById(inventory,reference.materialId,2,quality);
  assert.equal(getMaterialQuantityById(inventory,reference.materialId,quality),2);
  assert.equal(getMaterialStorageEntries(inventory)[0].quality,quality);
  combinations++;
}
assert.equal(combinations,462);
assert.equal(scaleMaterialStat(.01,6),.0255,'Small bonuses must survive fractional-percent rounding');
for(const [roll,quality] of [[0,1],[.699999999,1],[.7,2],[.919999999,2],[.92,3],[.98,4],[.998,5],[.999998999,5],[.999999,6],[1-Number.EPSILON,6]])assert.equal(rollMaterialQuality(roll),quality);
for(const bad of [-1,1,NaN,Infinity])assert.throws(()=>rollMaterialQuality(bad));
const probabilities=[.7,.22,.06,.018,.001999,.000001];
let totalS6=0;
for(const seed of [7919,104729,524287]){
  let rng=seed;const counts=Array(6).fill(0);
  for(let i=0;i<1_000_000;i++){rng=(Math.imul(rng,1664525)+1013904223)>>>0;counts[rollMaterialQuality(rng/4294967296)-1]++;}
  assert.equal(counts.reduce((a,b)=>a+b),1_000_000);
  for(let i=0;i<5;i++)assert.ok(Math.abs(counts[i]-probabilities[i]*1e6)<=6*Math.sqrt(1e6*probabilities[i]*(1-probabilities[i])));
  totalS6+=counts[5];
}
assert.ok(totalS6<12,'Do not demand exactly one S6 per million');
assert.equal(rollRuneDefinition(.000999,0,0,1),'rune-p-1');
assert.equal(rollRuneDefinition(.001,0,0,1),null);
assert.equal(rollRuneDefinition(0,0,0,2),null);
assert.deepEqual(MATERIAL_QUALITIES.map(runeSocketCount),[0,1,2,3,4,5]);

const stocks={};
addMaterialQuantityById(stocks,4,3,1);addMaterialQuantityById(stocks,4,2,6);
assert.equal(takeMaterialQuantityById(stocks,4,3,6),false);
const before=JSON.stringify(stocks);
assert.equal(reserveMaterialQuantitiesById(stocks,{'4:1':1,'4:6':3}),false);
assert.equal(JSON.stringify(stocks),before,'Reservation failure must be atomic across qualities');
assert.equal(reserveMaterialQuantitiesById(stocks,{'4:1':2,'4:6':1}),true);
assert.equal(getMaterialQuantityById(stocks,4,1),1);assert.equal(getMaterialQuantityById(stocks,4,6),1);
assert.equal(reserveMaterialQuantitiesById(stocks,{'4':1,'4:1':1}),false,'Aliased requirements cannot double consume a stock');
assert.throws(()=>normalizeMaterialInventory({'4:2':{materialId:4,quality:6,qty:1}}));
assert.throws(()=>normalizeMaterialInventory({'4:7':{materialId:4,qty:1}}));
assert.throws(()=>normalizeMaterialInventory({'4:2':{materialId:4,quality:2,qty:1.1}}));
const duplicated={'4':{materialId:4,qty:2},Zinn:{qty:3}};
const duplicateBefore=JSON.stringify(duplicated);assert.throws(()=>normalizeMaterialInventory(duplicated));assert.equal(JSON.stringify(duplicated),duplicateBefore);

const slots=[{slot:'workingPart',materialId:4,quality:6},{slot:'back',materialId:4,quality:1},{slot:'gripCore',materialId:2,quality:4},{slot:'gripWrap',materialId:9,quality:5}];
assert.deepEqual(forgeRequirements(slots,'dagger'),{'4:6':1,'4:1':1,'2:4':1,'9:5':1});
assert.equal(rarityFactor(slots),1);
const low=calculateWeaponStats(slots.map(s=>({...s,quality:1})),'dagger');
const high=calculateWeaponStats(slots.map(s=>({...s,quality:6})),'dagger');
assert.ok(high.hitChance>low.hitChance);assert.ok(high.characterModifiers.armor>low.characterModifiers.armor);
for(const form of ['dagger','sword','axe1h','sword2h','axe2h','bow','staff']){
  const selection=getWeaponForm(form).parts.map(part=>({slot:part.materialSlot,materialId:part.categories.includes('Metall')?77:part.categories.includes('Holz')?61:68,quality:6}));
  const stats=calculateWeaponStats(selection,form);assert.ok(stats.hitChance>=0&&stats.hitChance<=1);assert.ok(stats.penetration>=0&&stats.penetration<=1);
}

// Real Save27: same material ID at several qualities, runed weapon, stored jobs and pending offline loot.
const oldSlots=[{slot:'workingPart',materialId:3},{slot:'back',materialId:3},{slot:'gripCore',materialId:3},{slot:'gripWrap',materialId:8}];
const oldBase=calculateWeaponStats(oldSlots.map(s=>({...s,quality:1})),'dagger');
const oldStats=applyRuneBonuses(oldBase,['rune-p-1']);
const oldWeapon={id:8,name:'Bestand',weaponForm:'dagger',slots:oldSlots,stats:oldStats,valueNickel:123,craftedSeconds:42,raritySnapshot:2,runeSockets:['rune-item-1'],runeMigrationVersion:1};
const job={...createForgeJob('dagger','Reserviert',oldSlots),totalSeconds:97,remainingWorkSeconds:31,valueNickel:123,stats:oldBase};
const oldState={characters:[],inventory:{'3':{materialId:3,qty:9},'8':{materialId:8,qty:4}},weaponInventory:[oldWeapon],runeInventory:[{runeItemId:'rune-item-1',runeDefinitionId:'rune-p-1'}],runeWorkshopUnlocked:true,nextRuneNumber:2,forgeJobs:[job],forgeQueue:[structuredClone(job)],forgeReadyJobs:[structuredClone(job)],marketQueue:[{type:'material',materialId:3,quantity:2,valueNickel:40,seconds:80}],teams:{1:{dungeonLoot:{'3':{materialId:3,qty:2}},dungeonLootCollect:{readyAt:1,drops:[{materialId:3},{runeDefinitionId:'rune-p-1'}]}}}};
const oldSnapshot=structuredClone(oldState);
assert.equal(migrateMaterialQualityWorld(oldState),true);
assert.deepEqual(oldState.inventory,{'3:2':{materialId:3,quality:2,category:'Holz',qty:9},'8:2':{materialId:8,quality:2,category:'Leder',qty:4}});
assert.deepEqual(oldState.weaponInventory[0].stats,oldSnapshot.weaponInventory[0].stats);
assert.deepEqual(recomputeRunedWeapon(oldState,oldState.weaponInventory[0]),oldSnapshot.weaponInventory[0].stats);
assert.equal(oldState.weaponInventory[0].valueNickel,123);
for(const jobs of [oldState.forgeJobs,oldState.forgeQueue,oldState.forgeReadyJobs]){assert.equal(refreshForgeJobBalance(jobs[0]),false);assert.equal(jobs[0].totalSeconds,97);assert.equal(jobs[0].valueNickel,123);assert.deepEqual(jobs[0].stats,oldBase);}
assert.equal(oldState.marketQueue[0].quality,2);assert.equal(oldState.marketQueue[0].valueNickel,40);
assert.equal(oldState.teams[1].dungeonLootCollect.drops[0].quality,2);
const once=JSON.stringify(oldState);assert.equal(migrateMaterialQualityWorld(oldState),false);assert.equal(JSON.stringify(oldState),once);
const loaded=decodeSave(encodeSave(oldState)).state;assert.equal(migrateMaterialQualityWorld(loaded),false);assert.deepEqual(loaded,oldState);
assert.equal(removeRune(loaded,8,0),true);assert.ok(Math.abs(loaded.weaponInventory[0].stats.characterModifiers.precision-oldBase.characterModifiers.precision)<1e-12);
assert.equal(equipRune(loaded,8,0,'rune-item-1'),true);assert.deepEqual(loaded.weaponInventory[0].stats,oldStats);
assert.deepEqual(normalizeQualityWeapon(oldState.weaponInventory[0]).stats,oldStats,'Legacy loader delegate retains authoritative snapshots');
for(const bad of [0,7,1.5,'6']){
  const invalid=structuredClone(oldState);invalid.inventory['3:2'].quality=bad;
  assert.equal(validateImportedSave(JSON.stringify({saveVersion:28,savedAt:1,state:invalid})).reason,'invalid-state');
  assert.equal(JSON.stringify(oldState),once,'Bad import must not mutate the current world');
}
for (const drop of [{materialId:3,name:'Zinn'},{materialId:999,name:'Zinn'},{materialId:3,quality:7}]) {
  const invalid=structuredClone(oldState);invalid.teams[1].dungeonLootCollect.drops=[drop];
  assert.equal(validateImportedSave(JSON.stringify({saveVersion:28,savedAt:1,state:invalid})).reason,'invalid-state');
}
const migrationSource=readFileSync('src/app/game/weapon-naming.ts','utf8');
assert.match(migrationSource,/NoBrainerMaterialQualityMigration\.weapon/);
assert.doesNotMatch(migrationSource,/const stats=calculateWeaponStats\(slots,weaponForm\)/,'Active old-load business logic must delegate to Angular');
console.log('Etappe C: 462 combinations, 3 million seeded rolls, boundaries, separated reservations, Save27 migration, preserved weapons/jobs/runes and invalid import rollback passed.');
