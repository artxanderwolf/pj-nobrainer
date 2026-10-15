import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('NoBrainer_GitHub_v0.12.2.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
if (!scriptMatch) throw new Error('Legacy-JavaScript konnte nicht extrahiert werden.');
const adapterSource = fs.readFileSync('src/app/core/legacy-dungeon-presentation-adapter.service.ts', 'utf8');

assert.doesNotMatch(adapterSource, /NoBrainerDungeonPresentationCore|DUNGEON_PRESENTATION_CORE_BRIDGE|getDungeonStatusPresentation|getDungeonLootPresentation/, 'Der Adapter enthält weiterhin die alte Dungeon-Presentation-Bridge.');

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

function replaceRangeIncludingEndOnce(source, startMarker, endMarker, replacement) {
  const start = source.indexOf(startMarker);
  assert.ok(start >= 0, `Startanker fehlt: ${startMarker}`);
  assert.equal(source.indexOf(startMarker, start + startMarker.length), -1, `Startanker ist nicht eindeutig: ${startMarker}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.ok(end > start, `Endanker fehlt: ${endMarker}`);
  assert.equal(source.indexOf(endMarker, end + endMarker.length), -1, `Endanker ist nicht eindeutig: ${endMarker}`);
  return source.slice(0, start) + replacement + source.slice(end + endMarker.length);
}

let source = scriptMatch[1];
source = replaceRangeOnce(source, 'function renderDungeonStatus(){', 'function render(){', '');
source = replaceRangeIncludingEndOnce(
  source,
  '  const displayedCount=state.dungeonRun?.participantIds?.length||getSelectedDungeonIds().length;',
  '  renderCharacter("teamCard");renderCharacter("rosterCard");renderTavern();',
  '  renderCharacter("rosterCard");renderTavern();'
);
source = replaceOnce(source, 'renderDungeonStatus();renderDungeonLoot();renderForgePreview();', 'renderForgePreview();');

new vm.Script(source, { filename: 'NoBrainer_GitHub_v0.12.68.dungeon-presentation-cutover.js' });
assert.equal(source.includes('function renderDungeonStatus(){'), false, 'Legacy-Dungeon-Statusrenderer bleibt erhalten.');
assert.equal(source.includes('function renderDungeonLoot(){'), false, 'Legacy-Dungeon-Lootrenderer bleibt erhalten.');
assert.equal(source.includes('window.NoBrainerDungeonPresentationCore'), false, 'Legacy-Dungeon-Presentation-Core bleibt global registriert.');

const renderStart = source.indexOf('function render(){');
const renderEnd = source.indexOf('function gameTick(){', renderStart);
assert.ok(renderStart >= 0 && renderEnd > renderStart, 'Master-Render konnte nicht isoliert werden.');
const masterRender = source.slice(renderStart, renderEnd);
for (const obsolete of ['displayedCount', 'enemyHp', 'enemyArmor', 'enemyDamage', 'energyCost', 'runDuration', 'renderCharacter("teamCard")', 'renderDungeonStatus()', 'renderDungeonLoot()']) {
  assert.equal(masterRender.includes(obsolete), false, `Legacy-Gesamtrender enthält weiterhin Dungeon-Präsentation: ${obsolete}`);
}
assert.ok(masterRender.includes('renderCharacter("rosterCard");renderTavern();'), 'Kader- und Tavernenrender wurden beim Dungeon-Cutover beschädigt.');
assert.ok(masterRender.includes('renderForgePreview();'), 'Schmiede-Renderpfad wurde beim Dungeon-Cutover beschädigt.');
assert.ok(masterRender.includes('renderMarketMaterials();'), 'Markt-Renderpfad wurde beim Dungeon-Cutover beschädigt.');
assert.ok(masterRender.includes('queueSave();'), 'Save-Anker des Gesamtrenders wurde beim Dungeon-Cutover beschädigt.');

console.log('Dungeon-Presentation-Adapter: Legacy-Status, -Loot, -Übersicht und Teamaufruf sind aus dem Gesamtrender entfernt; Angular ist alleiniger aktiver Dungeon-Präsentationspfad.');
