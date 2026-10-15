import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('NoBrainer_GitHub_v0.12.2.html', 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
if (!match) throw new Error('Legacy-JavaScript konnte nicht extrahiert werden.');
const adapterSource = fs.readFileSync('src/app/core/legacy-character-presentation-adapter.service.ts', 'utf8');

assert.match(adapterSource, /NoBrainerCharacterPresentationCore\.getCharacterCardPresentation/, 'Kaderkarten delegieren nicht an den Character-Presentation-Core.');
assert.match(adapterSource, /NoBrainerCharacterPresentationCore\.getWeaponPickerKey/, 'Waffenpicker-Schlüssel delegiert nicht an den Character-Presentation-Core.');
assert.doesNotMatch(adapterSource, /ADAPTED_DUNGEON_TEAM|ADAPTED_DUNGEON_TEAM_PICKER|getDungeonTeamPresentation|getDungeonTeamPickerPresentation/, 'Der Legacy-Character-Adapter enthält weiterhin eine zweite Dungeon-Team-Präsentation.');
assert.match(adapterSource, /if\(target!=="rosterCard"\)return;/, 'Der verbleibende Legacy-Charakterrenderer ist nicht auf den Kader begrenzt.');

function replaceOnce(source, search, replacement) {
  const first = source.indexOf(search);
  assert.ok(first >= 0, `Anker fehlt: ${search}`);
  assert.equal(source.indexOf(search, first + search.length), -1, `Anker ist nicht eindeutig: ${search}`);
  return source.slice(0, first) + replacement + source.slice(first + search.length);
}

function replaceRangeOnce(source, startMarker, endMarker, replacement) {
  const start = source.indexOf(startMarker);
  assert.ok(start >= 0, `Startanker fehlt: ${startMarker}`);
  assert.equal(source.indexOf(startMarker, start + startMarker.length), -1, `Startanker ist nicht eindeutig: ${startMarker}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.ok(end > start, `Endanker fehlt: ${endMarker}`);
  assert.equal(source.indexOf(endMarker, end + endMarker.length), -1, `Endanker ist nicht eindeutig: ${endMarker}`);
  return source.slice(0, start) + replacement + source.slice(end);
}

let source = match[1];
source = replaceOnce(source, 'let openWeaponPickerHand=null;\nlet openDungeonTeamPickerSlot=null;', 'let openWeaponPickerHand=null;');
source = replaceRangeOnce(source, 'function toggleDungeonTeamPicker(', 'function renderCharacter(', '');
source = replaceRangeOnce(
  source,
  'function renderCharacter(',
  'function getMaterialsForCategories(',
  `function renderCharacter(target){
  if(target!=="rosterCard")return;
  const root=document.getElementById(target);if(!root)return;
  root.innerHTML=state.characters.map(renderCharacterCard).join("");
}

`
);

new vm.Script(source, { filename: 'NoBrainer_GitHub_v0.12.68.character-presentation-cutover.js' });
for (const obsolete of [
  'openDungeonTeamPickerSlot',
  'function toggleDungeonTeamPicker(',
  'function assignDungeonCharacter(',
  'function removeDungeonCharacter(',
  'function dungeonTeamPickerHtml(',
  'function renderDungeonTeam('
]) {
  assert.equal(source.includes(obsolete), false, `Veralteter Dungeon-Team-Pfad bleibt im adaptierten Character-Script: ${obsolete}`);
}
assert.ok(source.includes('function renderCharacter(target){\n  if(target!=="rosterCard")return;'), 'Kaderrenderer wurde beim Team-Cutover nicht auf rosterCard begrenzt.');
assert.ok(source.includes('function renderCharacterCard(c){'), 'Kaderkarten wurden beim Team-Cutover entfernt.');
assert.ok(source.includes('function getMaterialsForCategories('), 'Nachfolgender Schmiede-/Materialbereich wurde beschädigt.');

console.log('Character-Presentation-Adapter: Kader- und Waffenpicker-Präsentation bleiben erhalten; der doppelte Legacy-Dungeon-Team-Pfad ist vollständig entfernt.');
