import { Injectable } from '@angular/core';
import { EQUIPMENT_CORE_BRIDGE, type EquipmentCoreBridge } from '../game/equipment-core';

declare global {
  interface Window {
    NoBrainerEquipmentCore?: EquipmentCoreBridge;
  }
}

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

const ADAPTED_EQUIPMENT_BLOCK = `function getWeaponEquipLocation(weaponId){return window.NoBrainerEquipmentCore.getWeaponEquipLocation(state.characters,Number(weaponId));}
function getEquippedHandForWeapon(weaponId){return getWeaponEquipLocation(weaponId);}
function equipWeapon(weaponId,hand,characterId){
  const result=window.NoBrainerEquipmentCore.equipWeapon(state.characters,Number(weaponId),hand,Number(characterId));
  if(!result.ok){if(result.reason==="weapon-in-use")alert("Diese konkrete Waffe ist bereits bei einem anderen Charakter ausgerüstet.");return;}
  render();
}
function unequipHand(characterId,hand){
  if(!window.NoBrainerEquipmentCore.unequipHand(state.characters,Number(characterId),hand))return;
  render();
}`;

const LEGACY_INVENTORY_PRESENTATION = `const loc=getWeaponEquipLocation(w.id);let status="",actions="";
    if(loc){
      const c=getCharacterById(loc.characterId);status=\`\${c?.name||"Charakter"} · \${loc.hand==="leftHand"?"LINKE":"RECHTE"} HAND\`;
      actions=\`<div class="weapon-card-actions"><button class="btn" onclick="unequipHand(\${loc.characterId},'\${loc.hand}')">Ablegen</button></div>\`;
    }else{
      const selectId=\`lagerEquip_\${index}\`;
      const opts=state.characters.flatMap(c=>[[c,"leftHand","Linke Hand"],[c,"rightHand","Rechte Hand"]]).filter(([c,h])=>c.equipment[h]==null).map(([c,h,l])=>\`<option value="\${c.id}:\${h}">\${c.name} · \${l}</option>\`).join("");
      actions=opts?\`<div class="weapon-card-actions" style="display:grid;grid-template-columns:1fr auto"><select id="\${selectId}" class="equip-select">\${opts}</select><button class="btn primary" onclick="equipWeaponFromInventory(\${w.id},'\${selectId}')">Ausrüsten</button></div>\`:\`<div class="weapon-card-actions"><button class="btn" disabled>Keine freie Hand</button></div>\`;
    }`;

const ADAPTED_INVENTORY_PRESENTATION = `const presentation=window.NoBrainerEquipmentCore.getWeaponInventoryPresentation(state.characters,Number(w.id));const loc=presentation.location;let status=presentation.status,actions="";
    if(loc){
      actions=\`<div class="weapon-card-actions"><button class="btn" onclick="unequipHand(\${loc.characterId},'\${loc.hand}')">Ablegen</button></div>\`;
    }else{
      const selectId=\`lagerEquip_\${index}\`;
      const opts=presentation.targets.map(t=>{const c=getCharacterById(t.characterId);return \`<option value="\${t.characterId}:\${t.hand}">\${c?.name||"Charakter"} · \${t.label}</option>\`;}).join("");
      actions=opts?\`<div class="weapon-card-actions" style="display:grid;grid-template-columns:1fr auto"><select id="\${selectId}" class="equip-select">\${opts}</select><button class="btn primary" onclick="equipWeaponFromInventory(\${w.id},'\${selectId}')">Ausrüsten</button></div>\`:\`<div class="weapon-card-actions"><button class="btn" disabled>Keine freie Hand</button></div>\`;
    }`;

const LEGACY_PICKER_PRESENTATION = `const loc=getWeaponEquipLocation(w.id);let st="",dis=false;
    if(w.id===curId){st="AUSGERÜSTET";dis=true;}
    else if(w.id===otherId){st="ANDERE HAND";dis=true;}
    else if(loc){const owner=getCharacterById(loc.characterId);st=\`BELEGT: \${owner?.name||"Charakter"}\`;dis=true;}`;

const ADAPTED_PICKER_PRESENTATION = `const pickerPresentation=window.NoBrainerEquipmentCore.getWeaponPickerPresentation(state.characters,Number(w.id),Number(c.id),hand);const st=pickerPresentation.status,dis=pickerPresentation.disabled;`;

function replaceOnce(source: string, expected: string, replacement: string): string {
  const first = source.indexOf(expected);
  if (first < 0) throw new Error('Legacy-Equipment-Block wurde nicht gefunden.');
  if (source.indexOf(expected, first + expected.length) >= 0) throw new Error('Legacy-Equipment-Block ist nicht eindeutig.');
  return source.replace(expected, replacement);
}

@Injectable({ providedIn: 'root' })
export class LegacyEquipmentAdapterService {
  adapt(source: string): string {
    window.NoBrainerEquipmentCore = EQUIPMENT_CORE_BRIDGE;
    let adapted = replaceOnce(source, LEGACY_EQUIPMENT_BLOCK, ADAPTED_EQUIPMENT_BLOCK);
    adapted = replaceOnce(adapted, LEGACY_INVENTORY_PRESENTATION, ADAPTED_INVENTORY_PRESENTATION);
    adapted = replaceOnce(adapted, LEGACY_PICKER_PRESENTATION, ADAPTED_PICKER_PRESENTATION);
    return adapted;
  }
}
