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
  return text.slice(0, start) + replacement + '\n\n' + text.slice(end);
}

const materialIndexBridge = `function renderMaterialIndex(){
  const presentation=window.NoBrainerMaterialIndexPresentationCompatibility;
  if(!presentation||typeof presentation.render!=="function")throw new Error("NoBrainer-Materialindex-Präsentationsbrücke wurde nicht registriert.");
  presentation.render();
}`;

const materialStorageBridge = `function renderMaterialStorage(){
  const presentation=window.NoBrainerMaterialStoragePresentationCompatibility;
  if(!presentation||typeof presentation.render!=="function")throw new Error("NoBrainer-Materiallager-Präsentationsbrücke wurde nicht registriert.");
  presentation.render();
}`;

source = replaceRangeOnce(source, 'function displayVal(', 'function rarityFactorFromRarity(', materialIndexBridge, 'Materialindex-Präsentation');
source = replaceRangeOnce(
  source,
  'function renderDungeonStatus(){',
  'function render(){',
  '',
  'vorheriger Dungeon-Präsentations-Cutover'
);
source = source.replace('renderDungeonStatus();renderDungeonLoot();renderForgePreview();', 'renderForgePreview();');
source = replaceRangeOnce(
  source,
  '  const tbody=document.getElementById("inventoryRows");tbody.innerHTML="";',
  '  renderForgePreview();',
  '  renderMaterialStorage();',
  'Materiallager-Präsentation'
);
source = replaceRangeOnce(
  source,
  'function render(){',
  '  updateEnergy();',
  `${materialStorageBridge}\n\nfunction render(){`,
  'Materiallager-Renderfunktion'
);

new vm.Script(source, { filename: 'NoBrainer_GitHub_v0.12.82.material-presentation.js' });
assert.ok(source.includes('window.NoBrainerMaterialIndexPresentationCompatibility'));
assert.ok(source.includes('window.NoBrainerMaterialStoragePresentationCompatibility'));
assert.ok(source.includes('presentation.render();'));
assert.equal(source.includes('window.NoBrainerMaterialPresentationCore'), false);
assert.equal(source.includes('function displayVal('), false);
assert.ok(source.includes('function rarityFactorFromRarity(rarity)'));
assert.ok(source.includes('function renderMaterialIndex(){'));
assert.ok(source.includes('function renderMaterialStorage(){'));
assert.ok(source.includes('  renderMaterialStorage();\n\n  renderForgePreview();'));
assert.equal((source.match(/function renderMaterialIndex\(/g) || []).length, 1);
assert.equal((source.match(/function renderMaterialStorage\(/g) || []).length, 1);
assert.equal(source.includes('const tbody=document.getElementById("inventoryRows");tbody.innerHTML="";'), false);

const indexStart = source.indexOf('function renderMaterialIndex(){');
const indexEnd = source.indexOf('function rarityFactorFromRarity(', indexStart);
assert.ok(indexStart >= 0 && indexEnd > indexStart, 'Materialindex-Wrapper konnte nicht isoliert werden.');
const indexWrapper = source.slice(indexStart, indexEnd);
assert.equal(indexWrapper.includes('MATERIALS'), false);
assert.equal(indexWrapper.includes('reinforcementEffectText'), false);
assert.equal(indexWrapper.includes('getDungeonMaterialChance'), false);
assert.equal(indexWrapper.includes('getMaterialIndexRowPresentation'), false);
assert.equal(indexWrapper.includes('document.getElementById'), false);

const storageStart = source.indexOf('function renderMaterialStorage(){');
const storageEnd = source.indexOf('function render(){', storageStart);
assert.ok(storageStart >= 0 && storageEnd > storageStart, 'Materiallager-Wrapper konnte nicht isoliert werden.');
const storageWrapper = source.slice(storageStart, storageEnd);
assert.equal(storageWrapper.includes('state.inventory'), false);
assert.equal(storageWrapper.includes('sortMaterialStorageEntries'), false);
assert.equal(storageWrapper.includes('getMaterialStorageRowPresentation'), false);
assert.equal(storageWrapper.includes('materialSellData'), false);

const masterRenderStart = source.indexOf('function render(){');
const masterRenderEnd = source.indexOf('function gameTick(){', masterRenderStart);
assert.ok(masterRenderStart >= 0 && masterRenderEnd > masterRenderStart, 'Der Legacy-Gesamtrender konnte nicht isoliert werden.');
assert.equal(source.slice(masterRenderStart, masterRenderEnd).includes('renderDungeonStatus();'), false);

console.log('Material-Presentation-Adapter: Materialindex und Materiallager delegieren ausschließlich an Angular; der alte globale Material-Presentation-Core ist aus dem Legacy-Laufzeitpfad entfernt.');
