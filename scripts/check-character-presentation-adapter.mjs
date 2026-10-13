import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('NoBrainer_GitHub_v0.12.2.html', 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
if (!match) throw new Error('Legacy-JavaScript konnte nicht extrahiert werden.');

let source = match[1];
const pickerKey = 'function weaponPickerKey(characterId,hand){return `${characterId}:${hand}`;}';
const pickerBridge = 'function weaponPickerKey(characterId,hand){return window.NoBrainerCharacterPresentationCore.getWeaponPickerKey(Number(characterId),hand);}';
const startMarker = 'function renderCharacterCard(';
const endMarker = 'function toggleDungeonTeamPicker(';

assert.equal(source.split(pickerKey).length - 1, 1);
source = source.replace(pickerKey, pickerBridge);
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start + startMarker.length);
assert.ok(start >= 0 && end > start);
assert.equal(source.indexOf(startMarker, start + startMarker.length), -1);

const replacement = `function renderCharacterCard(c){
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
source = source.slice(0, start) + replacement + source.slice(end);

new vm.Script(source, { filename: 'NoBrainer_GitHub_v0.12.29.character-presentation.js' });
assert.ok(source.includes('window.NoBrainerCharacterPresentationCore.getCharacterCardPresentation'));
assert.ok(source.includes('window.NoBrainerCharacterPresentationCore.getWeaponPickerKey'));

console.log('Character-Presentation-Adapter: Legacy-Anker und resultierende JavaScript-Syntax sind konsistent.');
