import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('NoBrainer_GitHub_v0.12.2.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
if (!scriptMatch) throw new Error('Legacy-JavaScript konnte nicht extrahiert werden.');

const adapterSource = fs.readFileSync('src/app/core/legacy-dungeon-presentation-adapter.service.ts', 'utf8');
function extractTemplateConstant(name) {
  const prefix = 'const ' + name + ' = `';
  const start = adapterSource.indexOf(prefix);
  assert.ok(start >= 0, `${name} wurde im Adapter nicht gefunden.`);
  const bodyStart = start + prefix.length;
  const end = adapterSource.indexOf('`;\n', bodyStart);
  assert.ok(end > bodyStart, `${name} konnte nicht aus dem Adapter gelesen werden.`);
  return adapterSource.slice(bodyStart, end);
}

function replaceOnce(source, search, replacement) {
  const first = source.indexOf(search);
  assert.ok(first >= 0, `Anker fehlt: ${search.slice(0, 80)}`);
  assert.equal(source.indexOf(search, first + search.length), -1, 'Anker ist nicht eindeutig.');
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

const summaryBlock = [
  '  const displayedCount=state.dungeonRun?.participantIds?.length||getSelectedDungeonIds().length;',
  '  document.getElementById("enemyHp").textContent=`${CONFIG.dungeon.enemyBase.damage} Basis-SCH`;',
  '  document.getElementById("enemyArmor").textContent=`${Math.round(CONFIG.dungeon.enemyBase.hitChance*100)} % Basis-TRF`;',
  '  document.getElementById("enemyDamage").textContent=`${CONFIG.dungeon.enemyBase.speed.toFixed(2)} Basis-GES`;',
  '  const share=getEnergyCostPerCharacter(displayedCount);',
  '  document.getElementById("energyCost").textContent=displayedCount?`${share} je Char. (${share*displayedCount} gesamt)`:"–";',
  '  document.getElementById("runDuration").textContent=`${state.dungeonWavesDefeated||0} besiegt`;',
  '',
  ''
].join('\n');
const accessor = extractTemplateConstant('DUNGEON_PRESENTATION_ACCESSOR');
const statusReplacement = extractTemplateConstant('ADAPTED_DUNGEON_STATUS');
const lootReplacement = extractTemplateConstant('ADAPTED_DUNGEON_LOOT');

let source = scriptMatch[1];
source = replaceOnce(source, summaryBlock, '');
source = replaceRangeOnce(
  source,
  'function renderDungeonStatus(){',
  'function renderDungeonLoot(){',
  accessor + statusReplacement + '\n'
);
source = replaceRangeOnce(
  source,
  'function renderDungeonLoot(){',
  'function render(){',
  lootReplacement + '\n'
);

new vm.Script(source, { filename: 'NoBrainer_GitHub_v0.12.67.dungeon-presentation.js' });
assert.equal(source.split('function renderDungeonStatus(){').length - 1, 1);
assert.equal(source.split('function renderDungeonLoot(){').length - 1, 1);
assert.ok(source.includes('getDungeonPresentationCompatibility().renderStatus();'));
assert.ok(source.includes('getDungeonPresentationCompatibility().renderLoot();'));
assert.equal(source.includes('window.NoBrainerDungeonPresentationCore'), false);
assert.equal(source.includes('renderDungeonSessionWaveCounter'), false);
assert.equal(source.includes('const displayedCount=state.dungeonRun?.participantIds?.length||getSelectedDungeonIds().length;'), false);

const renderStart = source.indexOf('function render(){');
const renderEnd = source.indexOf('function gameTick(){', renderStart);
assert.ok(renderStart >= 0 && renderEnd > renderStart, 'Master-Render konnte nicht isoliert werden.');
const masterRender = source.slice(renderStart, renderEnd);
assert.ok(masterRender.includes('renderDungeonStatus();renderDungeonLoot();'));
assert.ok(masterRender.includes('const tbody=document.getElementById("inventoryRows");tbody.innerHTML="";'));
assert.ok(masterRender.includes('renderForgePreview();'));

let statusCalls = 0;
let lootCalls = 0;
const context = {
  window: {
    NoBrainerDungeonPresentationCompatibility: {
      renderStatus() { statusCalls += 1; },
      renderLoot() { lootCalls += 1; },
      renderTeam() {}
    }
  }
};
vm.createContext(context);
new vm.Script(`${accessor}\n${statusReplacement}\n${lootReplacement}\nrenderDungeonStatus();\nrenderDungeonLoot();`).runInContext(context);
assert.equal(statusCalls, 1);
assert.equal(lootCalls, 1);

console.log('Dungeon-Presentation-Adapter: Legacy-Runtime besitzt nur noch Render-Weiterleitungen; Status, Kennzahlen und Loot werden durch den Angular-Präsentationsservice erzeugt.');
