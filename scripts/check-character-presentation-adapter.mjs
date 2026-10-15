import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('NoBrainer_GitHub_v0.12.2.html', 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
if (!match) throw new Error('Legacy-JavaScript konnte nicht extrahiert werden.');
const adapterSource = fs.readFileSync('src/app/core/legacy-character-presentation-adapter.service.ts', 'utf8');

assert.doesNotMatch(adapterSource, /NoBrainerCharacterPresentationCore|CHARACTER_PRESENTATION_CORE_BRIDGE/, 'Der Legacy-Character-Adapter registriert weiterhin eine Presentation-Brücke.');
assert.match(adapterSource, /'function weaponPickerKey\('/, 'Der Kader-Cutover besitzt keinen eindeutigen Startanker.');
assert.match(adapterSource, /'function getMaterialsForCategories\('/, 'Der Kader-Cutover besitzt keinen stabilen Endanker.');
assert.match(adapterSource, /'  renderCharacter\("rosterCard"\);renderTavern\(\);'/, 'Der alte Kader-Aufruf im Legacy-Gesamtrender wird nicht entfernt.');

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
source = replaceOnce(source, '  renderCharacter("teamCard");renderCharacter("rosterCard");renderTavern();', '  renderCharacter("rosterCard");renderTavern();');
source = replaceOnce(source, 'let openWeaponPickerHand=null;\nlet openDungeonTeamPickerSlot=null;', '');
source = replaceRangeOnce(source, 'function weaponPickerKey(', 'function getMaterialsForCategories(', '');
source = replaceOnce(source, '  renderCharacter("rosterCard");renderTavern();', '  renderTavern();');

new vm.Script(source, { filename: 'NoBrainer_GitHub_v0.12.74.character-presentation-cutover.js' });
for (const obsolete of [
  'function weaponPickerKey(',
  'function toggleWeaponPicker(',
  'function equipFromWeaponPicker(',
  'function weaponPickerHtml(',
  'function renderCharacterCard(',
  'function toggleDungeonTeamPicker(',
  'function assignDungeonCharacter(',
  'function removeDungeonCharacter(',
  'function dungeonTeamPickerHtml(',
  'function renderDungeonTeam(',
  'function renderCharacter(target)'
]) {
  assert.equal(source.includes(obsolete), false, `Veralteter Character-Präsentationspfad bleibt im adaptierten Script: ${obsolete}`);
}
assert.ok(source.includes('function getMaterialsForCategories('), 'Nachfolgender Schmiede-/Materialbereich wurde beschädigt.');
assert.ok(source.includes('  renderTavern();'), 'Der Kader-Cutover beschädigt den verbleibenden Taverne-Render.');

console.log('Character-Presentation-Adapter: Kader-, Waffenpicker- und alter Dungeon-Team-Pfad werden vollständig aus der Legacy-Runtime entfernt.');
