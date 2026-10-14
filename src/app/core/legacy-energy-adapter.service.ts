import { Injectable } from '@angular/core';

const UPDATE_ENERGY_BLOCK = `function updateEnergy(){
  const now=Date.now();
  const elapsedMinutes=(now-state.lastEnergyUpdate)/60000;
  state.lastEnergyUpdate=now;
  if(!state.dungeonAuto && !state.dungeonRun && !state.dungeonLootCollect && elapsedMinutes>0){
    state.characters.forEach(c=>{
      if(c.energy<c.maxEnergy)c.energy=Math.min(c.maxEnergy,c.energy+elapsedMinutes*getCharacterClass(c).energyRegenPerMinute);
    });
  }
}`;

const UPDATE_ENERGY_BRIDGE = `function updateEnergy(){
  const energyCompatibility=window.NoBrainerEnergyCompatibility;
  if(!energyCompatibility||typeof energyCompatibility.update!=="function")throw new Error("NoBrainer-Energie-Kompatibilitätsbrücke wurde nicht registriert.");
  return energyCompatibility.update();
}`;

const ENERGY_COST_BLOCK = `function getEnergyCostPerCharacter(count){return count>0?Math.ceil(CONFIG.dungeon.energyCost/count):0;}`;
const ENERGY_COST_BRIDGE = `function getEnergyCostPerCharacter(count){
  const energyCompatibility=window.NoBrainerEnergyCompatibility;
  if(!energyCompatibility||typeof energyCompatibility.costPerCharacter!=="function")throw new Error("NoBrainer-Energie-Kompatibilitätsbrücke wurde nicht registriert.");
  return energyCompatibility.costPerCharacter(count);
}`;

@Injectable({ providedIn: 'root' })
export class LegacyEnergyAdapterService {
  adapt(source: string): string {
    let adapted = this.replaceOnce(source, UPDATE_ENERGY_BLOCK, UPDATE_ENERGY_BRIDGE, 'Energie-Regeneration');
    adapted = this.replaceOnce(adapted, ENERGY_COST_BLOCK, ENERGY_COST_BRIDGE, 'Dungeon-Energiekosten');
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
