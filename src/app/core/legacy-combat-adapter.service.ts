import { Injectable } from '@angular/core';
import { COMBAT_CORE_BRIDGE, type CombatCoreBridge } from '../game/combat-core';

declare global {
  interface Window {
    NoBrainerCombatCore?: CombatCoreBridge;
  }
}

const WEIGHTED_TARGET_BLOCK = `function weightedTarget(targets){
  const alive=targets.filter(x=>x.alive&&x.hp>0);if(!alive.length)return null;
  return weightedPick(alive.map(x=>({target:x,weight:1/Math.max(0.01,(x.distance??getCharacterClass(x).distance??2))})),"weight").target;
}`;

const WEIGHTED_TARGET_BRIDGE = `function weightedTarget(targets){
  const weighted=window.NoBrainerCombatCore.buildWeightedTargets(targets,x=>getCharacterClass(x).distance??2);
  if(!weighted.length)return null;
  return weightedPick(weighted,"weight").target;
}`;

const APPLY_DAMAGE_BLOCK = `function applyAttackDamage(target,damage,penetration){
  const effectiveArmor=Math.max(0,(target.armor||0)*(1-Math.max(0,Math.min(1,penetration||0))));
  const dealt=Math.max(0,damage-effectiveArmor);
  target.hp=Math.max(0,target.hp-dealt);target.alive=target.hp>0;
  return dealt;
}`;

const APPLY_DAMAGE_BRIDGE = `function applyAttackDamage(target,damage,penetration){
  return window.NoBrainerCombatCore.applyAttackDamage(target,damage,penetration);
}`;

@Injectable({ providedIn: 'root' })
export class LegacyCombatAdapterService {
  adapt(source: string): string {
    window.NoBrainerCombatCore = COMBAT_CORE_BRIDGE;
    let adapted = this.replaceOnce(source, WEIGHTED_TARGET_BLOCK, WEIGHTED_TARGET_BRIDGE, 'Dungeon-Zielgewichtung');
    adapted = this.replaceOnce(adapted, APPLY_DAMAGE_BLOCK, APPLY_DAMAGE_BRIDGE, 'Dungeon-Schadensberechnung');
    return adapted;
  }

  private replaceOnce(source: string, search: string, replacement: string, label: string): string {
    const first = source.indexOf(search);
    if (first < 0) throw new Error(`Legacy-Kompatibilität fehlgeschlagen: ${label} wurde nicht gefunden.`);
    if (source.indexOf(search, first + search.length) >= 0) {
      throw new Error(`Legacy-Kompatibilität fehlgeschlagen: ${label} ist nicht eindeutig.`);
    }
    return source.slice(0, first) + replacement + source.slice(first + search.length);
  }
}
