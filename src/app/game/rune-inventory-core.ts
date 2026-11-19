import {
  calculateWeaponStats, getMaterialDefinitionById, normalizeWeaponSlots, rarityFactor,
  type WeaponSlot, type WeaponStats
} from './game-core.ts';
import type { ForgeJob } from './forge-core.ts';
import { placeCityBuilding } from './city-placement-core.ts';
import type { CityLayoutWorldState } from './city-layout-core.ts';
import {
  applyRuneBonuses, runeDefinitionFromLegacy, runeSocketCount,
  RUNE_DEFINITIONS, type RuneDefinitionId
} from './rune-core.ts';

export const RUNE_SAVE_SCHEMA = 1;
export interface RuneItem {
  runeItemId: string;
  runeDefinitionId: RuneDefinitionId;
}
export interface RunedWeapon {
  id: number;
  name: string;
  weaponForm: string;
  slots: WeaponSlot[];
  stats?: WeaponStats;
  valueNickel?: number;
  starter?: boolean;
  /** Original minimum material rarity for pre-S21 weapons; not recalculated from removed special material. */
  raritySnapshot?: number;
  runeSockets?: Array<string|null>;
  /** A non-replaceable legacy-only slot; disappears when the inherited rune is removed. */
  legacyRuneItemId?: string|null;
  runeMigrationVersion?: number;
}
export interface RunedForgeJob extends ForgeJob {
  /** The S14 claim system supplies these when the job becomes identified. */
  jobId?: string;
  status?: 'queued' | 'active' | 'ready' | 'claimed';
  /** Existing jobs are finalized using their stored reservation/economy snapshot. */
  legacyForgeJob?: boolean;
  legacyRuneDefinitionId?: RuneDefinitionId|null;
  legacyRaritySnapshot?: number;
  runeMigrationVersion?: number;
}
export interface RuneWorldState extends CityLayoutWorldState {
  weaponInventory?: RunedWeapon[];
  runeInventory?: RuneItem[];
  nextRuneNumber?: number;
  runeWorkshopUnlocked?: boolean;
  runeWorkshopClaimPending?: boolean;
  forgeJobs?: RunedForgeJob[];
  forgeQueue?: RunedForgeJob[];
  forgeReadyJobs?: RunedForgeJob[];
}
const ID_PATTERN=/^rune-item-([1-9][0-9]*)$/;

function legacyRarity(slots: readonly WeaponSlot[]):number {
  const rarities=normalizeWeaponSlots(slots).filter(s=>s.slot!=='baseMaterial')
    .map(s=>getMaterialDefinitionById(s.materialId)?.rarity)
    .filter((value):value is number=>Number.isFinite(value));
  return rarities.length?Math.min(...rarities):1;
}
function specialRune(slots:readonly WeaponSlot[]):RuneDefinitionId|null {
  const id=normalizeWeaponSlots(slots).find(slot=>slot.slot==='special')?.materialId;
  return runeDefinitionFromLegacy(getMaterialDefinitionById(id)?.specialEffect);
}
function allocate(state:RuneWorldState,definitionId:RuneDefinitionId):RuneItem {
  const next=state.nextRuneNumber;
  if(!Number.isSafeInteger(next)||!next||next<1||!Number.isSafeInteger(next+1))throw new Error('Ungültiger Runen-ID-Zähler.');
  const item={runeItemId:`rune-item-${next}`,runeDefinitionId:definitionId};
  state.nextRuneNumber=next+1;
  state.runeInventory!.push(item);
  return item;
}
export function connectedRunes(state:RuneWorldState,weapon:RunedWeapon):RuneDefinitionId[]{
  const byId=new Map((state.runeInventory??[]).map(item=>[item.runeItemId,item.runeDefinitionId]));
  return [...(weapon.runeSockets??[]),weapon.legacyRuneItemId??null]
    .filter((id):id is string=>typeof id==='string')
    .map(id=>{const definition=byId.get(id);if(!definition)throw new Error('Waffenrune ohne Inventar-ID: '+id);return definition;});
}
export function recomputeRunedWeapon(state:RuneWorldState,weapon:RunedWeapon):WeaponStats {
  const base=calculateWeaponStats(weapon.slots,weapon.weaponForm);
  const stats=applyRuneBonuses(base,connectedRunes(state,weapon));
  weapon.stats=stats;
  return stats;
}
export function migrateRuneWorld(state:RuneWorldState):boolean {
  if(!Array.isArray(state.weaponInventory))return false;
  let changed=false;
  if(!Array.isArray(state.runeInventory)){state.runeInventory=[];changed=true;}
  const used=new Set<string>();
  let max=0;
  for(const item of state.runeInventory){
    const match=ID_PATTERN.exec(item.runeItemId??'');
    if(!match||used.has(item.runeItemId)||!RUNE_DEFINITIONS[item.runeDefinitionId])throw new Error('Ungültiges oder doppeltes Runenitem.');
    used.add(item.runeItemId);
    max=Math.max(max,Number(match[1]));
  }
  if(state.nextRuneNumber===undefined){state.nextRuneNumber=max+1;changed=true;}
  if(!Number.isSafeInteger(state.nextRuneNumber)||state.nextRuneNumber!<=max)throw new Error('Runen-ID-Zähler nicht monoton.');
  if(typeof state.runeWorkshopUnlocked!=='boolean'){state.runeWorkshopUnlocked=false;changed=true;}
  if(typeof state.runeWorkshopClaimPending!=='boolean'){state.runeWorkshopClaimPending=false;changed=true;}

  for(const weapon of state.weaponInventory){
    if(weapon.starter||weapon.id===0)continue;
    if(weapon.runeMigrationVersion===RUNE_SAVE_SCHEMA)continue;
    if(!Array.isArray(weapon.slots)||!weapon.weaponForm||!Number.isInteger(weapon.id))throw new Error('Alte Waffe ohne gültige technische Identität.');
    const originalQuality=legacyRarity(weapon.slots);
    const special=specialRune(weapon.slots);
    const capacity=runeSocketCount(originalQuality);
    weapon.raritySnapshot=originalQuality;
    weapon.runeSockets=Array(capacity).fill(null);
    weapon.legacyRuneItemId=null;
    if(special){
      const item=allocate(state,special);
      if(capacity>0)weapon.runeSockets[0]=item.runeItemId;
      else weapon.legacyRuneItemId=item.runeItemId;
    }
    weapon.runeMigrationVersion=RUNE_SAVE_SCHEMA;
    recomputeRunedWeapon(state,weapon);
    changed=true;
  }
  for(const jobs of [state.forgeJobs,state.forgeQueue,state.forgeReadyJobs]){
    for(const job of jobs??[]){
      if(job.runeMigrationVersion===RUNE_SAVE_SCHEMA)continue;
      if(!Array.isArray(job.slots)||!job.weaponForm)continue;
      if(job.slots.some(slot=>slot.slot==='special')){
        job.legacyForgeJob=true;
        job.legacyRaritySnapshot=legacyRarity(job.slots);
        job.legacyRuneDefinitionId=specialRune(job.slots);
      }
      job.runeMigrationVersion=RUNE_SAVE_SCHEMA;
      changed=true;
    }
  }
  validateRuneReferences(state);
  return changed;
}
export function validateRuneReferences(state:RuneWorldState):void {
  const items=new Set((state.runeInventory??[]).map(i=>i.runeItemId));
  const bound=new Set<string>();
  for(const weapon of state.weaponInventory??[]){
    if(!weapon.runeSockets)continue;
    if(weapon.runeSockets.length!==runeSocketCount(weapon.raritySnapshot??rarityFactor(weapon.slots)))throw new Error('Ungültige reguläre Sockelzahl.');
    for(const id of [...weapon.runeSockets,weapon.legacyRuneItemId??null]){
      if(id===null)continue;
      if(!items.has(id)||bound.has(id))throw new Error('Runenitem fehlt oder ist doppelt ausgerüstet.');
      bound.add(id);
    }
  }
}
/** One-time conversion only after an old, already-reserved forge job is actually claimed. */
export function migrateClaimedLegacyWeapon(state:RuneWorldState,weapon:RunedWeapon,job:RunedForgeJob):void {
  if(job.legacyForgeJob){
    weapon.raritySnapshot=job.legacyRaritySnapshot??legacyRarity(weapon.slots);
    weapon.runeSockets=Array(runeSocketCount(weapon.raritySnapshot)).fill(null);
    weapon.legacyRuneItemId=null;
    if(job.legacyRuneDefinitionId){
      const item=allocate(state,job.legacyRuneDefinitionId);
      if(weapon.runeSockets.length)weapon.runeSockets[0]=item.runeItemId;
      else weapon.legacyRuneItemId=item.runeItemId;
    }
    weapon.runeMigrationVersion=RUNE_SAVE_SCHEMA;
    recomputeRunedWeapon(state,weapon);
  }else{
    weapon.raritySnapshot=rarityFactor(weapon.slots);
    weapon.runeSockets=Array(runeSocketCount(weapon.raritySnapshot)).fill(null);
    weapon.legacyRuneItemId=null;
    weapon.runeMigrationVersion=RUNE_SAVE_SCHEMA;
  }
  validateRuneReferences(state);
}
export function availableRuneItems(state:RuneWorldState):RuneItem[]{
  const used=new Set((state.weaponInventory??[]).flatMap(w=>[...(w.runeSockets??[]),w.legacyRuneItemId??null]).filter(Boolean));
  return (state.runeInventory??[]).filter(item=>!used.has(item.runeItemId));
}
export function equipRune(state:RuneWorldState,weaponId:number,index:number,runeItemId:string):boolean {
  const weapon=state.weaponInventory?.find(w=>w.id===weaponId);
  if(!state.runeWorkshopUnlocked||!weapon||!Array.isArray(weapon.runeSockets)||!Number.isSafeInteger(index)||index<0||index>=weapon.runeSockets.length)return false;
  if(!state.runeInventory?.some(r=>r.runeItemId===runeItemId))return false;
  if(!availableRuneItems(state).some(r=>r.runeItemId===runeItemId))return false;
  weapon.runeSockets[index]=runeItemId;
  validateRuneReferences(state);
  recomputeRunedWeapon(state,weapon);
  return true;
}
export function removeRune(state:RuneWorldState,weaponId:number,index:number|'legacy'):boolean {
  const weapon=state.weaponInventory?.find(w=>w.id===weaponId);
  if(!state.runeWorkshopUnlocked||!weapon)return false;
  if(index==='legacy'){
    if(!weapon.legacyRuneItemId)return false;
    weapon.legacyRuneItemId=null;
  }else{
    if(!Array.isArray(weapon.runeSockets)||!Number.isSafeInteger(index)||index<0||index>=weapon.runeSockets.length||!weapon.runeSockets[index])return false;
    weapon.runeSockets[index]=null;
  }
  recomputeRunedWeapon(state,weapon);
  return true;
}
/** Atomically replace one regular socket; existing rune stays owned and becomes available. */
export function replaceRune(state:RuneWorldState,weaponId:number,index:number,runeItemId:string):boolean{
  return equipRune(state,weaponId,index,runeItemId);
}
export function ensureFirstRuneWorkshop(state:RuneWorldState):boolean{
  if(!state.runeWorkshopUnlocked||!state.cityLayout)return false;
  if(state.cityLayout.buildings.some(b=>b.buildingTypeId==='runeWorkshop')){
    if(state.runeWorkshopClaimPending){state.runeWorkshopClaimPending=false;return true;}
    return false;
  }
  const {grid}=state.cityLayout;
  for(let y=grid.minY;y<=grid.minY+grid.height-2;y++){
    for(let x=grid.minX;x<=grid.minX+grid.width-2;x++){
      const outcome=placeCityBuilding(state.cityLayout,{
        buildingTypeId:'runeWorkshop',x,y,width:2,height:2,status:'placed',
        unitSlots:1,teamId:null,workerCharacterId:null,activeJobId:null
      });
      if(outcome.ok){
        state.cityLayout=outcome.layout;
        state.runeWorkshopClaimPending=false;
        return true;
      }
    }
  }
  state.runeWorkshopClaimPending=true;
  return false;
}
export function grantDroppedRune(state:RuneWorldState,definitionId:RuneDefinitionId):RuneItem {
  migrateRuneWorld(state);
  const item=allocate(state,definitionId);
  if(!state.runeWorkshopUnlocked)state.runeWorkshopUnlocked=true;
  ensureFirstRuneWorkshop(state);
  return item;
}
