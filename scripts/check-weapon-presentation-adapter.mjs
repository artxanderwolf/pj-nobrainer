import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('NoBrainer_GitHub_v0.12.2.html', 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
if (!match) throw new Error('Legacy-JavaScript konnte nicht extrahiert werden.');

const adapter = fs.readFileSync('src/app/core/legacy-weapon-presentation-adapter.service.ts', 'utf8');
const bridgeMatch = adapter.match(/const WEAPON_INVENTORY_BRIDGE = `([\s\S]*?)`;/);
assert.ok(bridgeMatch, 'Die Waffenlager-Renderbrücke konnte nicht aus dem Adapter gelesen werden.');
const weaponInventoryBridge = bridgeMatch[1].replace(/\\`/g, '`');

function replaceRangeOnce(text, startMarker, endMarker, replacement, label) {
  const start = text.indexOf(startMarker);
  assert.ok(start >= 0, `${label}: Startanker fehlt.`);
  assert.equal(text.indexOf(startMarker, start + startMarker.length), -1, `${label}: Startanker ist nicht eindeutig.`);
  const end = text.indexOf(endMarker, start + startMarker.length);
  assert.ok(end > start, `${label}: Endanker fehlt.`);
  return text.slice(0, start) + replacement + text.slice(end);
}

const source = replaceRangeOnce(
  match[1],
  'function renderWeaponInventory(',
  'function displayVal(',
  `${weaponInventoryBridge}\n`,
  'Waffenlager-Präsentation'
);

new vm.Script(source, { filename: 'NoBrainer_GitHub_v0.12.75.weapon-inventory-compatibility.js' });
assert.match(adapter, /window\.NoBrainerWeaponInventoryPresentationCompatibility/);
assert.match(adapter, /weaponInventoryPresentation\.render\(\);/);
assert.doesNotMatch(adapter, /equipmentCompatibility\.getWeaponInventoryPresentation|state\.weaponInventory/);
assert.equal((source.match(/function renderWeaponInventory\(/g) || []).length, 1);
assert.ok(source.includes('function displayVal('), 'Nachfolgender Material-/Index-Anker wurde beschädigt.');

console.log('Weapon-Presentation-Adapter: Das Legacy-Waffenlager besitzt nur noch einen dünnen Renderwrapper; DOM-Präsentation und Equipment-Aktionen liegen in Angular.');
