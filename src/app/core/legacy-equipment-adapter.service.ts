import { Injectable } from '@angular/core';

const LEGACY_EQUIPMENT_BLOCK = `function getWeaponEquipLocation(weaponId){
  for(const c of state.characters){
    if(c.equipment.leftHand===weaponId)return {characterId:c.id,hand:"leftHand"};
    if(c.equipment.rightHand===weaponId)return {characterId:c.id,hand:"rightHand"};
  }
  return null;
}
function getEquippedHandForWeapon(weaponId){return getWeaponEquipLocation(weaponId);}
function equipWeapon(weaponId,hand,characterId){
  const c=getCharacterById(characterId);if(!c||!["leftHand","rightHand"].includes(hand))return;
  const existing=getWeaponEquipLocation(weaponId);
  if(existing&&existing.characterId!==c.id){alert("Diese konkrete Waffe ist bereits bei einem anderen Charakter ausgerüstet.");return;}
  const other=hand==="leftHand"?"rightHand":"leftHand";
  if(c.equipment[other]===weaponId)c.equipment[other]=null;
  c.equipment[hand]=weaponId;render();
}
function unequipHand(characterId,hand){
  const c=getCharacterById(characterId);if(!c||!["leftHand","rightHand"].includes(hand))return;
  c.equipment[hand]=null;render();
}`;

const ADAPTED_EQUIPMENT_BLOCK = `function getWeaponEquipLocation(weaponId){
  const equipmentCompatibility=window.NoBrainerEquipmentCompatibility;
  if(!equipmentCompatibility)throw new Error("NoBrainer-Equipment-Kompatibilitätsbrücke fehlt.");
  return equipmentCompatibility.getWeaponEquipLocation(Number(weaponId));
}
function getEquippedHandForWeapon(weaponId){return getWeaponEquipLocation(weaponId);}
function equipWeapon(weaponId,hand,characterId){
  const equipmentCompatibility=window.NoBrainerEquipmentCompatibility;
  if(!equipmentCompatibility)throw new Error("NoBrainer-Equipment-Kompatibilitätsbrücke fehlt.");
  const result=equipmentCompatibility.equipWeapon(Number(weaponId),hand,Number(characterId));
  if(!result.ok){if(result.reason==="weapon-in-use")alert("Diese konkrete Waffe ist bereits bei einem anderen Charakter ausgerüstet.");return;}
  render();
}
function unequipHand(characterId,hand){
  const equipmentCompatibility=window.NoBrainerEquipmentCompatibility;
  if(!equipmentCompatibility)throw new Error("NoBrainer-Equipment-Kompatibilitätsbrücke fehlt.");
  if(!equipmentCompatibility.unequipHand(Number(characterId),hand))return;
  render();
}`;

function replaceOnce(source: string, expected: string, replacement: string): string {
  const first = source.indexOf(expected);
  if (first < 0) throw new Error('Legacy-Equipment-Block wurde nicht gefunden.');
  if (source.indexOf(expected, first + expected.length) >= 0) throw new Error('Legacy-Equipment-Block ist nicht eindeutig.');
  return source.replace(expected, replacement);
}

@Injectable({ providedIn: 'root' })
export class LegacyEquipmentAdapterService {
  adapt(source: string): string {
    const adapted = replaceOnce(source, LEGACY_EQUIPMENT_BLOCK, ADAPTED_EQUIPMENT_BLOCK);
    return replaceOnce(adapted,
      'function cloneStarterWeapon(){\n  return JSON.parse(JSON.stringify(STARTER_WEAPON));\n}',
      'function cloneStarterWeapon(){\n  return window.NoBrainerEquipmentCompatibility.cloneStarterWeapon(STARTER_WEAPON);\n}');
  }
}
