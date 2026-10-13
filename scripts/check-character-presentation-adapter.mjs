import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('NoBrainer_GitHub_v0.12.2.html', 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
if (!match) throw new Error('Legacy-JavaScript konnte nicht extrahiert werden.');

let source = match[1];
const pickerKey = 'function weaponPickerKey(characterId,hand){return `${characterId}:${hand}`;}';
const pickerBridge = 'function weaponPickerKey(characterId,hand){return window.NoBrainerCharacterPresentationCore.getWeaponPickerKey(Number(characterId),hand);}';

function replaceRangeOnce(text, startMarker, endMarker, replacement, label) {
  const start = text.indexOf(startMarker);
  assert.ok(start >= 0, `${label}: Startanker fehlt.`);
  assert.equal(text.indexOf(startMarker, start + startMarker.length), -1, `${label}: Startanker ist nicht eindeutig.`);
  const end = text.indexOf(endMarker, start + startMarker.length);
  assert.ok(end > start, `${label}: Endanker fehlt.`);
  return text.slice(0, start) + replacement + text.slice(end);
}

assert.equal(source.split(pickerKey).length - 1, 1);
source = source.replace(pickerKey, pickerBridge);

const characterReplacement = `function renderCharacterCard(c){
  const cls=getCharacterClass(c);
  const presentation=window.NoBrainerCharacterPresentationCore.getCharacterCardPresentation(c,cls,effectiveOffense(c),openWeaponPickerHand);
  const stats=presentation.stats.map(stat=>\`<div class="stat"><span>\${stat.label}</span><b>\${stat.value}</b></div>\`).join("");
  const hands=presentation.hands.map(handPresentation=>{
    const w=getWeaponById(handPresentation.weaponId);
    const weaponHtml=w?weaponCardHtml(w,{status:handPresentation.equippedStatus}):'<div class="empty">'+handPresentation.emptyText+'</div>';
    return \`<div class="hand-section"><div class="hand-section-head"><strong>\${handPresentation.label}</strong><button class="btn smallbtn" onclick="toggleWeaponPicker(\${c.id},'\${handPresentation.hand}')">\${handPresentation.toggleLabel}</button></div><div style="margin-top:10px">\${weaponHtml}</div>\${weaponPickerHtml(c,handPresentation.hand)}</div>\`;
  }).join("");
  return \`<div class="roster-character"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><strong>\${presentation.name}</strong><span class="tag fixed">\${presentation.classTag}</span></div>
    <div class="statrow">\${stats}</div>\${hands}</div>\`;
}

`;
source = replaceRangeOnce(source, 'function renderCharacterCard(', 'function toggleDungeonTeamPicker(', characterReplacement, 'Kader-/Charakter-Präsentation');

const dungeonPickerReplacement = `function dungeonTeamPresentationCharacters(){
  return state.characters.map(c=>({id:c.id,name:c.name,hp:c.hp,maxHp:c.maxHp,energy:c.energy,maxEnergy:c.maxEnergy,className:getCharacterClass(c).name}));
}
function dungeonTeamPickerHtml(slot){
  const presentation=window.NoBrainerCharacterPresentationCore.getDungeonTeamPickerPresentation(state.dungeonTeamSlots,dungeonTeamPresentationCharacters(),Number(slot),openDungeonTeamPickerSlot);
  if(!presentation.open)return "";
  if(!presentation.candidates.length)return '<div class="team-slot-picker muted small">'+presentation.emptyText+'</div>';
  return '<div class="team-slot-picker">'+presentation.candidates.map(candidate=>'<div class="team-candidate"><div><strong>'+candidate.name+'</strong><div class="sell-meta">'+candidate.meta+'</div></div><button class="btn smallbtn primary" onclick="assignDungeonCharacter('+slot+','+candidate.id+')">'+candidate.assignLabel+'</button></div>').join("")+'</div>';
}
`;
source = replaceRangeOnce(source, 'function dungeonTeamPickerHtml(', 'function renderDungeonTeam(', dungeonPickerReplacement, 'Dungeon-Team-Picker-Präsentation');

const dungeonTeamReplacement = `function renderDungeonTeam(root){
  const characters=dungeonTeamPresentationCharacters();
  const locked=!!state.dungeonRun||!!state.dungeonAuto;
  const cycleActive=!!(state.dungeonAuto||state.dungeonRun||state.dungeonCycleOriginalIds?.length);
  const presentation=window.NoBrainerCharacterPresentationCore.getDungeonTeamPresentation(state.dungeonTeamSlots,characters,locked,state.dungeonCycleActiveIds||[],cycleActive);
  const slots=presentation.slots.map(slot=>{
    const picker=dungeonTeamPickerHtml(slot.slotIndex);
    if(!slot.occupied){
      return '<div class="team-slot"><div class="team-slot-head"><strong>'+slot.title+'</strong></div><div class="empty">'+slot.emptyText+'</div><div class="actions"><button class="btn primary" '+(presentation.locked?'disabled':'')+' onclick="toggleDungeonTeamPicker('+slot.slotIndex+')">'+slot.addLabel+'</button></div>'+picker+'</div>';
    }
    const fallen=slot.fallen?'<span class="tag temp">'+slot.fallenLabel+'</span>':"";
    return '<div class="team-slot"><div class="team-slot-head"><strong>'+slot.title+'</strong>'+fallen+'</div><div class="statrow"><div class="stat"><span>HP</span><b>'+slot.hpValue+'</b></div><div class="stat"><span>EN</span><b>'+slot.energyValue+'</b></div></div><div class="actions"><button class="btn" '+(presentation.locked?'disabled':'')+' onclick="removeDungeonCharacter('+slot.slotIndex+')">'+slot.removeLabel+'</button><button class="btn" '+(presentation.locked?'disabled':'')+' onclick="toggleDungeonTeamPicker('+slot.slotIndex+')">'+slot.switchLabel+'</button></div>'+picker+'</div>';
  }).join("");
  root.innerHTML='<div class="team-slot-grid">'+slots+'</div>'+(presentation.locked?'<p class="status-line">'+presentation.lockedText+'</p>':"");
}
`;
source = replaceRangeOnce(source, 'function renderDungeonTeam(', 'function renderCharacter(', dungeonTeamReplacement, 'Dungeon-Team-Präsentation');

new vm.Script(source, { filename: 'NoBrainer_GitHub_v0.12.30.character-presentation.js' });
assert.ok(source.includes('window.NoBrainerCharacterPresentationCore.getCharacterCardPresentation'));
assert.ok(source.includes('window.NoBrainerCharacterPresentationCore.getWeaponPickerKey'));
assert.ok(source.includes('window.NoBrainerCharacterPresentationCore.getDungeonTeamPickerPresentation'));
assert.ok(source.includes('window.NoBrainerCharacterPresentationCore.getDungeonTeamPresentation'));
assert.ok(source.includes('function toggleDungeonTeamPicker(slot)'));
assert.ok(source.includes('function assignDungeonCharacter(slot,characterId)'));
assert.ok(source.includes('function removeDungeonCharacter(slot)'));

console.log('Character-Presentation-Adapter: Kader- und Dungeon-Team-Präsentationsanker sowie resultierende JavaScript-Syntax sind konsistent.');
