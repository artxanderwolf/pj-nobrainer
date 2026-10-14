import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('NoBrainer_GitHub_v0.12.2.html', 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
if (!match) throw new Error('Legacy-JavaScript konnte nicht extrahiert werden.');

let source = match[1];

function replaceRangeOnce(text, startMarker, endMarker, replacement, label) {
  const start = text.indexOf(startMarker);
  assert.ok(start >= 0, `${label}: Startanker fehlt.`);
  assert.equal(text.indexOf(startMarker, start + startMarker.length), -1, `${label}: Startanker ist nicht eindeutig.`);
  const end = text.indexOf(endMarker, start + startMarker.length);
  assert.ok(end > start, `${label}: Endanker fehlt.`);
  return text.slice(0, start) + replacement + text.slice(end);
}

function replaceOnce(text, expected, replacement, label) {
  const first = text.indexOf(expected);
  assert.ok(first >= 0, `${label}: Block fehlt.`);
  assert.equal(text.indexOf(expected, first + expected.length), -1, `${label}: Block ist nicht eindeutig.`);
  return text.slice(0, first) + replacement + text.slice(first + expected.length);
}

const weaponCardBridge = `function rarityLabelForWeapon(w){
  return window.NoBrainerWeaponPresentationCore.getRarityLabel(w);
}
function formatDiff(v,b,p=false){
  const diff=window.NoBrainerWeaponPresentationCore.getComparisonPresentation(Number(v)||0,b,p);
  return diff?diff.text:"";
}
function weaponCardHtml(w,o={}){
  const presentation=window.NoBrainerWeaponPresentationCore.getWeaponCardPresentation(w,o.compare||null);
  return \`<div class="weapon-card">\${presentation.title}</div>\`;
}

`;

const weaponInventoryBridge = `function renderWeaponInventory(){
  const box=document.getElementById("weaponInventory"),empty=document.getElementById("weaponInventoryEmpty");if(!box||!empty)return;
  const ws=window.NoBrainerWeaponPresentationCore.sortWeaponInventory(state.weaponInventory);
  box.innerHTML="";empty.style.display=ws.length?"none":"block";
  ws.forEach((w,index)=>{
    const presentation=window.NoBrainerEquipmentCore.getWeaponInventoryPresentation(state.characters,Number(w.id));
    const loc=presentation.location;let actions="";
    if(loc){
      actions=\`<div class="weapon-card-actions"><button class="btn" onclick="unequipHand(\${loc.characterId},'\${loc.hand}')">Ablegen</button></div>\`;
    }else{
      const selectId=\`lagerEquip_\${index}\`;
      const opts=presentation.targets.map(t=>{const c=getCharacterById(t.characterId);return \`<option value="\${t.characterId}:\${t.hand}">\${c?.name||"Charakter"} · \${t.label}</option>\`;}).join("");
      actions=opts?\`<div class="weapon-card-actions" style="display:grid;grid-template-columns:1fr auto"><select id="\${selectId}" class="equip-select">\${opts}</select><button class="btn primary" onclick="equipWeaponFromInventory(\${w.id},'\${selectId}')">Ausrüsten</button></div>\`:\`<div class="weapon-card-actions"><button class="btn" disabled>Keine freie Hand</button></div>\`;
    }
    const d=document.createElement("div");d.innerHTML=weaponCardHtml(w,{status:presentation.status,actions});box.appendChild(d.firstElementChild);
  });
}

`;

const legacyEquipmentBlock = `function getWeaponEquipLocation(weaponId){
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

const adaptedEquipmentBlock = `function getWeaponEquipLocation(weaponId){return window.NoBrainerEquipmentCore.getWeaponEquipLocation(state.characters,Number(weaponId));}
function getEquippedHandForWeapon(weaponId){return getWeaponEquipLocation(weaponId);}
function equipWeapon(weaponId,hand,characterId){
  const result=window.NoBrainerEquipmentCore.equipWeapon(state.characters,Number(weaponId),hand,Number(characterId));
  if(!result.ok)return;
  render();
}
function unequipHand(characterId,hand){
  if(!window.NoBrainerEquipmentCore.unequipHand(state.characters,Number(characterId),hand))return;
  render();
}`;

const legacyPickerPresentation = `const loc=getWeaponEquipLocation(w.id);let st="",dis=false;
    if(w.id===curId){st="AUSGERÜSTET";dis=true;}
    else if(w.id===otherId){st="ANDERE HAND";dis=true;}
    else if(loc){const owner=getCharacterById(loc.characterId);st=\`BELEGT: \${owner?.name||"Charakter"}\`;dis=true;}`;
const adaptedPickerPresentation = `const pickerPresentation=window.NoBrainerEquipmentCore.getWeaponPickerPresentation(state.characters,Number(w.id),Number(c.id),hand);const st=pickerPresentation.status,dis=pickerPresentation.disabled;`;

source = replaceRangeOnce(source, 'function rarityLabelForWeapon(', 'function weaponPickerKey(', weaponCardBridge, 'Waffenkarten-Präsentation');
source = replaceRangeOnce(source, 'function renderWeaponInventory(', 'function displayVal(', weaponInventoryBridge, 'Waffenlager-Präsentation');
source = replaceOnce(source, legacyEquipmentBlock, adaptedEquipmentBlock, 'Equipment-Domain');
source = replaceOnce(source, legacyPickerPresentation, adaptedPickerPresentation, 'Weapon-Picker-Präsentation');

new vm.Script(source, { filename: 'NoBrainer_GitHub_v0.12.41.weapon-inventory-presentation.js' });
assert.ok(source.includes('window.NoBrainerWeaponPresentationCore.sortWeaponInventory(state.weaponInventory)'));
assert.ok(source.includes('window.NoBrainerEquipmentCore.getWeaponInventoryPresentation(state.characters,Number(w.id))'));
assert.ok(source.includes('weaponCardHtml(w,{status:presentation.status,actions})'));
assert.ok(source.includes('function displayVal('));
assert.ok(source.includes('window.NoBrainerEquipmentCore.getWeaponPickerPresentation'));
assert.equal((source.match(/function renderWeaponInventory\(/g) || []).length, 1);
assert.equal(source.includes('[...state.weaponInventory].sort((a,b)=>a.id-b.id)'), false);

console.log('Weapon-Presentation-Adapter: Waffenlager, bestehender Equipment-Core, Picker-Reihenfolge und nachfolgende Materialanker bleiben konsistent.');
