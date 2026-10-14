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

const statusReplacement = extractTemplateConstant('ADAPTED_DUNGEON_STATUS');
const lootReplacement = extractTemplateConstant('ADAPTED_DUNGEON_LOOT');

let source = scriptMatch[1];
source = replaceOnce(
  source,
  'document.getElementById("runDuration").textContent=`${state.dungeonWavesDefeated||0} besiegt`;',
  'renderDungeonSessionWaveCounter();'
);
source = replaceOnce(
  source,
  '  renderDungeonStatus();\n  renderDungeonLoot();',
  '  renderDungeonStatus();\n  renderDungeonSessionWaveCounter();\n  renderDungeonLoot();'
);
source = replaceRangeOnce(source, 'function renderDungeonStatus(){', 'function renderDungeonLoot(){', statusReplacement + '\n');
source = replaceRangeOnce(source, 'function renderDungeonLoot(){', 'function render(){', lootReplacement + '\n');

new vm.Script(source, { filename: 'NoBrainer_GitHub_v0.12.37.dungeon-presentation.js' });
assert.equal(source.split('function renderDungeonStatus(){').length - 1, 1);
assert.equal(source.split('function renderDungeonLoot(){').length - 1, 1);
assert.ok(source.includes('window.NoBrainerDungeonPresentationCore.getDungeonStatusPresentation'));
assert.ok(source.includes('window.NoBrainerDungeonPresentationCore.getDungeonLootPresentation'));
assert.ok(source.includes('renderDungeonSessionWaveCounter();'));

function makeElement() {
  return {
    className: '',
    innerHTML: '',
    textContent: '',
    disabled: false,
    style: { display: '' },
    children: [],
    appendChild(child) { this.children.push(child); }
  };
}

const elements = {
  dungeonRunCard: makeElement(),
  autoDungeonBtn: makeElement(),
  collectLootBtn: makeElement(),
  dungeonLoot: makeElement(),
  dungeonLootEmpty: makeElement()
};

let capturedStatus = null;
let capturedLoot = null;
const state = {
  dungeonAuto: true,
  dungeonRun: {
    participantIds: [1, 2],
    energyShare: 4,
    enemies: [{ name: 'G Goblin 1', hp: 7, maxHp: 10, alive: true }]
  },
  dungeonLootCollect: null,
  dungeonLoot: {
    Aluminium: { category: 'Metall', qty: 1 },
    Zinn: { category: 'Metall', qty: 2 }
  }
};

const context = {
  state,
  getSelectedDungeonIds: () => [1, 2],
  document: {
    getElementById: id => elements[id] ?? null,
    createElement: () => makeElement()
  }
};
context.window = {
  NoBrainerDungeonPresentationCore: {
    getDungeonStatusPresentation(input) {
      capturedStatus = input;
      return {
        autoButtonText: 'Automatik anhalten',
        autoButtonDisabled: false,
        collectButtonText: 'Einsammeln (3)',
        collectButtonDisabled: false,
        card: {
          mode: 'active',
          className: '',
          title: 'Welle aktiv',
          aliveText: '1 / 1 Gegner leben',
          metaText: '2 Charaktere · 4 EN je Charakter · Automatik aktiv',
          enemies: [{ name: 'G Goblin 1', hpText: '7.0 / 10 HP' }]
        }
      };
    },
    getDungeonLootPresentation(input) {
      capturedLoot = input;
      return {
        empty: false,
        entries: [
          { name: 'Aluminium', quantityText: '×1' },
          { name: 'Zinn', quantityText: '×2' }
        ]
      };
    }
  }
};

vm.createContext(context);
new vm.Script(`${statusReplacement}\n${lootReplacement}\nrenderDungeonStatus();\nrenderDungeonLoot();`).runInContext(context);

assert.equal(capturedStatus.auto, true);
assert.equal(capturedStatus.selectedCharacterCount, 2);
assert.equal(capturedStatus.lootTotal, 3);
assert.equal(capturedStatus.run, state.dungeonRun);
assert.equal(capturedStatus.lootCollect, null);
assert.equal(elements.autoDungeonBtn.textContent, 'Automatik anhalten');
assert.equal(elements.autoDungeonBtn.disabled, false);
assert.equal(elements.collectLootBtn.textContent, 'Einsammeln (3)');
assert.equal(elements.collectLootBtn.disabled, false);
assert.equal(elements.dungeonRunCard.className, '');
assert.ok(elements.dungeonRunCard.innerHTML.includes('Welle aktiv'));
assert.ok(elements.dungeonRunCard.innerHTML.includes('7.0 / 10 HP'));

assert.equal(capturedLoot, state.dungeonLoot);
assert.equal(elements.dungeonLootEmpty.style.display, 'none');
assert.equal(elements.dungeonLoot.children.length, 1);
assert.equal(elements.dungeonLoot.children[0].className, 'loot-grid');
assert.equal(elements.dungeonLoot.children[0].children.length, 2);
assert.equal(elements.dungeonLoot.children[0].children[0].innerHTML, 'Aluminium<b>×1</b>');
assert.equal(elements.dungeonLoot.children[0].children[1].innerHTML, 'Zinn<b>×2</b>');

console.log('Dungeon-Presentation-Adapter: Anker, Syntax, Status-/Beute-Brücke und DOM-Ausgabe sind konsistent.');
