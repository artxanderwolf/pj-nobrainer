import type { WeaponStats } from './game-core.ts';

export type RuneKind = 'P' | 'DS' | 'GES';
export type RuneTier = 1 | 2;
export type RuneDefinitionId = 'rune-p-1' | 'rune-p-2' | 'rune-ds-1' | 'rune-ds-2' | 'rune-ges-1' | 'rune-ges-2';

export interface RuneDefinition {
  runeDefinitionId: RuneDefinitionId;
  kind: RuneKind;
  tier: RuneTier;
  amount: number;
  label: string;
}
export const RUNE_DEFINITIONS: Readonly<Record<RuneDefinitionId,RuneDefinition>> = {
  'rune-p-1': {runeDefinitionId:'rune-p-1',kind:'P',tier:1,amount:.05,label:'Präzision I (+5 %)'},
  'rune-p-2': {runeDefinitionId:'rune-p-2',kind:'P',tier:2,amount:.10,label:'Präzision II (+10 %)'},
  'rune-ds-1': {runeDefinitionId:'rune-ds-1',kind:'DS',tier:1,amount:.05,label:'Durchschlag I (+5 %)'},
  'rune-ds-2': {runeDefinitionId:'rune-ds-2',kind:'DS',tier:2,amount:.10,label:'Durchschlag II (+10 %)'},
  'rune-ges-1': {runeDefinitionId:'rune-ges-1',kind:'GES',tier:1,amount:.10,label:'Geschwindigkeit I (+10 %)'},
  'rune-ges-2': {runeDefinitionId:'rune-ges-2',kind:'GES',tier:2,amount:.15,label:'Geschwindigkeit II (+15 %)'}
};
export const RUNE_IDS = Object.freeze(Object.keys(RUNE_DEFINITIONS) as RuneDefinitionId[]);
export const RUNE_DROP_CHANCE = .001;
export const RUNE_DROP_DUNGEON_ID = 2;

export const RUNE_SALE_TERMS = {
  1: { valueNickel: 5000, seconds: 2515 },
  2: { valueNickel: 15000, seconds: 7515 }
} as const;

export function runeDefinitionFromLegacy(effect: {stat:string;amount:number}|null|undefined): RuneDefinitionId|null {
  if(!effect)return null;
  const found=RUNE_IDS.find(id=>RUNE_DEFINITIONS[id].kind===effect.stat&&Math.abs(RUNE_DEFINITIONS[id].amount-effect.amount)<1e-9);
  return found??null;
}
/** S1=0 ... S6=5. S6 is modeled but currently not obtainable via materials. */
export function runeSocketCount(rarity:number):number {
  const rank=Math.floor(Number(rarity));
  return Number.isFinite(rank)?Math.max(0,Math.min(5,rank-1)):0;
}
export function summarizeRuneBonuses(ids:readonly string[]):{precision:number;penetration:number;speed:number}{
  let precision=0,penetration=0,speed=0;
  for(const id of ids){
    const rune=RUNE_DEFINITIONS[id as RuneDefinitionId];
    if(!rune)throw new Error('Unbekannte Runen-ID: '+id);
    if(rune.kind==='P')precision+=rune.amount;
    else if(rune.kind==='DS')penetration+=rune.amount;
    else speed+=rune.amount;
  }
  return {precision,penetration,speed};
}
/** Rune effects enter the already active Eldravar stat fields; no extra global cap. */
export function applyRuneBonuses(stats:WeaponStats,ids:readonly string[]):WeaponStats {
  const delta=summarizeRuneBonuses(ids);
  const modifiers={...stats.characterModifiers,
    precision:stats.characterModifiers.precision+delta.precision,
    penetration:stats.characterModifiers.penetration+delta.penetration};
  const specialSpeedFactor=1+delta.speed;
  const attackSpeed=stats.weaponBaseSpeed*Math.max(.01,specialSpeedFactor);
  const hitChance=Math.max(0,Math.min(1,stats.weaponBaseHitChance*Math.max(0,1+modifiers.precision)));
  const penetration=Math.max(0,Math.min(1,stats.weaponBasePenetration+modifiers.penetration));
  return {...stats,characterModifiers:modifiers,specialSpeedFactor,
    reinforcementSpeedFactor:specialSpeedFactor,
    reinforcementHitChanceAdd:delta.precision,
    reinforcementPenetrationAdd:delta.penetration,
    attackSpeed,hitChance,penetration,
    expectedRaw:stats.damagePerHit*attackSpeed*hitChance};
}
export function rollRuneDefinition(rollChance:number,rollKind:number,rollTier:number,dungeonId:number,isBoss:boolean):RuneDefinitionId|null {
  if(dungeonId!==RUNE_DROP_DUNGEON_ID||!isBoss||!Number.isFinite(rollChance)||rollChance<0||rollChance>=RUNE_DROP_CHANCE)return null;
  const kind= Math.min(2,Math.max(0,Math.floor(3*Math.max(0,Math.min(.999999999999,rollKind))))) as 0|1|2;
  const tier: RuneTier=rollTier<.8?1:2;
  const label=(['p','ds','ges'] as const)[kind];
  return `rune-${label}-${tier}` as RuneDefinitionId;
}
