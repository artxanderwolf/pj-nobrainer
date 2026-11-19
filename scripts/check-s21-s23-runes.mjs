import assert from 'node:assert/strict';
import {createInitialCityLayout} from '../src/app/game/city-layout-core.ts';
import {calculateWeaponStats,normalizeWeaponSlots,getMaterialReferenceById,rarityFactor} from '../src/app/game/game-core.ts';
import {
  migrateRuneWorld,migrateClaimedLegacyWeapon,grantDroppedRune,ensureFirstRuneWorkshop,
  availableRuneItems,equipRune,removeRune,replaceRune,recomputeRunedWeapon,validateRuneReferences
} from '../src/app/game/rune-inventory-core.ts';
import {runeDefinitionFromLegacy, RUNE_DEFINITIONS, rollRuneDefinition} from '../src/app/game/rune-core.ts';

const slots=(specialId,rareId=4)=>[
  {slot:'workingPart',materialId:rareId},{slot:'back',materialId:rareId},
  {slot:'gripCore',materialId:rareId},{slot:'gripWrap',materialId:9},
  {slot:'special',materialId:specialId},{slot:'parry',materialId:rareId}
];
const legacy=(specialId,id=101,rareId=4)=>({id,weaponForm:'sword',slots:slots(specialId,rareId),
  name:'Alte Klinge',valueNickel:321,stats:calculateWeaponStats(slots(specialId,rareId),'sword')});
const materials=[...Array(90)].map((_,i)=>getMaterialReferenceById(i+1)).filter(Boolean);
const variants=materials.filter(m=>m.definition.specialEffect&&runeDefinitionFromLegacy(m.definition.specialEffect));
assert.equal(new Set(variants.map(m=>runeDefinitionFromLegacy(m.definition.specialEffect))).size,6,'All six original effects remain mappable');
for(const material of variants){
  const special=material.definition.specialEffect;
  const state={weaponInventory:[legacy(material.materialId)],cityLayout:createInitialCityLayout(),forgeJobs:[],forgeQueue:[],forgeReadyJobs:[]};
  const old=state.weaponInventory[0];
  const base=calculateWeaponStats(old.slots,old.weaponForm);
  const before={...base,characterModifiers:{...base.characterModifiers}};
  if(special.stat==='P')before.characterModifiers.precision+=special.amount;
  if(special.stat==='DS')before.characterModifiers.penetration+=special.amount;
  const oldHit=Math.max(0,Math.min(1,before.weaponBaseHitChance*Math.max(0,1+before.characterModifiers.precision)));
  const oldPen=Math.max(0,Math.min(1,before.weaponBasePenetration+before.characterModifiers.penetration));
  const oldSpeed=before.weaponBaseSpeed*(special.stat==='GES'?1+special.amount:1);
  assert.equal(migrateRuneWorld(state),true);
  assert.equal(migrateRuneWorld(state),false,'Migration must be idempotent');
  const after=state.weaponInventory[0];
  assert.equal(state.runeInventory.length,1);
  assert.equal(after.name,'Alte Klinge');
  assert.equal(after.id,101);
  assert.equal(after.valueNickel,321);
  assert.ok(Math.abs(after.stats.hitChance-oldHit)<1e-9);
  assert.ok(Math.abs(after.stats.penetration-oldPen)<1e-9);
  assert.ok(Math.abs(after.stats.attackSpeed-oldSpeed)<1e-9);
  validateRuneReferences(state);
}
const special=variants[0];
const s1={weaponInventory:[legacy(special.materialId,1001,1)],cityLayout:createInitialCityLayout(),forgeJobs:[],forgeQueue:[],forgeReadyJobs:[]};
migrateRuneWorld(s1);
assert.equal(s1.weaponInventory[0].runeSockets.length,0);
assert.ok(s1.weaponInventory[0].legacyRuneItemId);
assert.equal(s1.runeWorkshopUnlocked,false,'Migrating old effects is not a new dungeon finding');
assert.ok(grantDroppedRune(s1,'rune-ds-1').runeItemId);
assert.equal(s1.runeWorkshopUnlocked,true);
assert.equal(s1.cityLayout.buildings.filter(b=>b.buildingTypeId==='runeWorkshop').length,1);
assert.equal(removeRune(s1,1001,'legacy'),true);
assert.equal(s1.weaponInventory[0].legacyRuneItemId,null);
assert.equal(removeRune(s1,1001,'legacy'),false,'Legacy-only socket is consumed forever');
assert.equal(equipRune(s1,1001,0,availableRuneItems(s1)[0].runeItemId),false);
const oldJob={weaponForm:'sword',slots:slots(special.materialId),stats:calculateWeaponStats(slots(special.materialId),'sword'),valueNickel:777,totalSeconds:180};
const mixed={weaponInventory:[legacy(special.materialId,55)],cityLayout:createInitialCityLayout(),forgeJobs:[oldJob],forgeQueue:[],forgeReadyJobs:[]};
migrateRuneWorld(mixed);
assert.equal(oldJob.legacyForgeJob,true);
assert.equal(oldJob.valueNickel,777);
assert.equal(oldJob.totalSeconds,180);
const newlyClaimed={id:56,weaponForm:'sword',slots:oldJob.slots,stats:oldJob.stats,valueNickel:oldJob.valueNickel};
mixed.weaponInventory.push(newlyClaimed);
migrateClaimedLegacyWeapon(mixed,newlyClaimed,oldJob);
assert.equal(newlyClaimed.valueNickel,777);
assert.equal(mixed.runeInventory.length,2);
assert.equal(migrateRuneWorld(mixed),false,'No repeated item creation on reload');
const extra=grantDroppedRune(mixed,'rune-p-2');
const w=mixed.weaponInventory[0];
if(w.runeSockets.length){
  const first=w.runeSockets[0];
  assert.equal(equipRune(mixed,55,0,extra.runeItemId),true,'Swap is atomic and returns the old rune');
  assert.equal(availableRuneItems(mixed).some(x=>x.runeItemId===first),true);
  assert.equal(replaceRune(mixed,55,0,extra.runeItemId),false,'No duplicated assignment');
  assert.equal(removeRune(mixed,55,0),true);
  assert.equal(availableRuneItems(mixed).some(x=>x.runeItemId===extra.runeItemId),true);
}
validateRuneReferences(mixed);
let drops=0,tiers=[0,0],kinds=[0,0,0];let seed=123456;
const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
for(let i=0;i<1000000;i++){
 const r=rollRuneDefinition(random(),random(),random(),1);
 if(r){drops++;tiers[RUNE_DEFINITIONS[r].tier-1]++;kinds[['P','DS','GES'].indexOf(RUNE_DEFINITIONS[r].kind)]++;}
}
assert.ok(drops>850&&drops<1150,`Expected ~1000 runes, got ${drops}`);
assert.ok(tiers[0]/drops>.75&&tiers[0]/drops<.85);
assert.ok(kinds.every(n=>n/drops>.28&&n/drops<.38));
assert.equal(rollRuneDefinition(0,0,0,2),null,'Only dungeon 1 produces these runes');
console.log('S21-S23: six legacy effects retained, Save migration idempotent, S1 legacy socket, legacy queued job, rune swaps, first-find workshop and one million independent drop trials passed.');
