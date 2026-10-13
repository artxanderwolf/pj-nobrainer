import { Injectable } from '@angular/core';
import { CHARACTER_CORE_BRIDGE, type CharacterCoreBridge } from '../game/character-core';

declare global {
  interface Window {
    NoBrainerCharacterCore?: CharacterCoreBridge;
  }
}

const CHARACTER_BLOCK = `function createCharacter(id,name,classId="recruit",withStarter=false){
  const cls=CHARACTER_CLASSES[classId]||CHARACTER_CLASSES.recruit;
  return {id,name,classId:cls.id,maxHp:cls.maxHp,hp:cls.maxHp,maxEnergy:cls.maxEnergy,energy:cls.maxEnergy,dodge:cls.dodge,armor:cls.armor,strengthFactor:cls.strengthFactor,precision:cls.precision,alive:true,equipment:{leftHand:null,rightHand:withStarter?0:null}};
}`;

const CHARACTER_BRIDGE = `function createCharacter(id,name,classId="recruit",withStarter=false){
  return window.NoBrainerCharacterCore.createCharacter(id,name,classId,withStarter);
}`;

@Injectable({ providedIn: 'root' })
export class LegacyCharacterAdapterService {
  adapt(source: string): string {
    window.NoBrainerCharacterCore = CHARACTER_CORE_BRIDGE;
    const first = source.indexOf(CHARACTER_BLOCK);
    if (first < 0) throw new Error('Legacy-Kompatibilität fehlgeschlagen: Charaktererzeugung wurde nicht gefunden.');
    if (source.indexOf(CHARACTER_BLOCK, first + CHARACTER_BLOCK.length) >= 0) throw new Error('Legacy-Kompatibilität fehlgeschlagen: Charaktererzeugung ist nicht eindeutig.');
    return source.slice(0, first) + CHARACTER_BRIDGE + source.slice(first + CHARACTER_BLOCK.length);
  }
}
