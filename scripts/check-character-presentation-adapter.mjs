import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('NoBrainer_GitHub_v0.12.2.html', 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
if (!match) throw new Error('Legacy-JavaScript konnte nicht extrahiert werden.');

const adapterSource = fs.readFileSync('src/app/core/legacy-character-presentation-adapter.service.ts', 'utf8');

function extractTemplateConstant(name) {
  const prefix = 'const ' + name + ' = `';
  const start = adapterSource.indexOf(prefix);
  assert.ok(start >= 0, `${name} wurde im Adapter nicht gefunden.`);
  const bodyStart = start + prefix.length;
  const end = adapterSource.indexOf('`;\n', bodyStart);
  assert.ok(end > bodyStart, `${name} konnte nicht aus dem Adapter gelesen werden.`);
  const rawBody = adapterSource.slice(bodyStart, end);
  return vm.runInNewContext('`' + rawBody + '`');
}

function extractQuotedConstant(name) {
  const match = adapterSource.match(new RegExp(`const ${name} = '([^']*)';`));
  assert.ok(match, `${name} wurde im Adapter nicht gefunden.`);
  return match[1];
}

function replaceOnce(text, search, replacement, label) {
  const start = text.indexOf(search);
  assert.ok(start >= 0, `${label}: Anker fehlt.`);
  assert.equal(text.indexOf(search, start + search.length), -1, `${label}: Anker ist nicht eindeutig.`);
  return text.slice(0, start) + replacement + text.slice(start + search.length);
}

function replaceRangeOnce(text, startMarker, endMarker, replacement, label) {
  const start = text.indexOf(startMarker);
  assert.ok(start >= 0, `${label}: Startanker fehlt.`);
  assert.equal(text.indexOf(startMarker, start + startMarker.length), -1, `${label}: Startanker ist nicht eindeutig.`);
  const end = text.indexOf(endMarker, start + startMarker.length);
  assert.ok(end > start, `${label}: Endanker fehlt.`);
  assert.equal(text.indexOf(endMarker, end + endMarker.length), -1, `${label}: Endanker ist nicht eindeutig.`);
  return text.slice(0, start) + replacement + text.slice(end);
}

const legacyPickerKey = extractQuotedConstant('LEGACY_PICKER_KEY');
const adaptedPickerKey = extractTemplateConstant('ADAPTED_PICKER_KEY');
const legacyDungeonPickerState = extractQuotedConstant('LEGACY_DUNGEON_PICKER_STATE');
const characterReplacement = extractTemplateConstant('ADAPTED_CHARACTER_CARD');
const legacyRenderCharacter = extractTemplateConstant('LEGACY_RENDER_CHARACTER');
const adaptedRenderCharacter = extractTemplateConstant('ADAPTED_RENDER_CHARACTER');

let source = match[1];
source = replaceOnce(source, legacyDungeonPickerState, '', 'Legacy-Dungeon-Team-Pickerzustand');
source = replaceOnce(source, legacyPickerKey, adaptedPickerKey, 'Waffenpicker-Schlüssel');
source = replaceRangeOnce(
  source,
  'function renderCharacterCard(',
  'function toggleDungeonTeamPicker(',
  characterReplacement,
  'Kader-/Charakter-Präsentation'
);
source = replaceRangeOnce(
  source,
  'function toggleDungeonTeamPicker(',
  'function renderCharacter(target){',
  '',
  'Legacy-Dungeon-Team-Interaktionen und -Präsentation'
);
source = replaceOnce(
  source,
  legacyRenderCharacter,
  adaptedRenderCharacter,
  'Dungeon-Team-Routing im Charakterrender'
);

new vm.Script(source, { filename: 'NoBrainer_GitHub_v0.12.67.character-presentation.js' });
assert.ok(source.includes('window.NoBrainerCharacterPresentationCore.getCharacterCardPresentation'));
assert.ok(source.includes('window.NoBrainerCharacterPresentationCore.getWeaponPickerKey'));
assert.ok(source.includes('getDungeonPresentationCompatibility().renderTeam()'));
assert.equal(source.includes('openDungeonTeamPickerSlot'), false);
assert.equal(source.includes('function toggleDungeonTeamPicker('), false);
assert.equal(source.includes('function assignDungeonCharacter('), false);
assert.equal(source.includes('function removeDungeonCharacter('), false);
assert.equal(source.includes('function dungeonTeamPickerHtml('), false);
assert.equal(source.includes('function renderDungeonTeam('), false);
assert.equal(source.includes('window.NoBrainerCharacterPresentationCore.getDungeonTeamPickerPresentation'), false);
assert.equal(source.includes('window.NoBrainerCharacterPresentationCore.getDungeonTeamPresentation'), false);

console.log('Character-Presentation-Adapter: Kaderdarstellung bleibt im bestehenden Presentation-Core; Dungeon-Team-Rendering und -Interaktionen sind aus der Legacy-Runtime entfernt.');
