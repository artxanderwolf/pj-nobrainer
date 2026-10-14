import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('NoBrainer_GitHub_v0.12.2.html', 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
if (!match) throw new Error('Legacy-JavaScript konnte nicht extrahiert werden.');

const adapterSource = fs.readFileSync('src/app/core/legacy-resource-presentation-adapter.service.ts', 'utf8');
const prefix = 'const RESOURCE_HEADER_RENDER = `';
const start = adapterSource.indexOf(prefix);
assert.ok(start >= 0, 'RESOURCE_HEADER_RENDER wurde im Adapter nicht gefunden.');
const bodyStart = start + prefix.length;
const end = adapterSource.indexOf('`;\n', bodyStart);
assert.ok(end > bodyStart, 'RESOURCE_HEADER_RENDER konnte nicht gelesen werden.');
const resourceHeaderRender = adapterSource.slice(bodyStart, end);

function replaceOnce(source, search, replacement) {
  const first = source.indexOf(search);
  assert.ok(first >= 0, `Anker fehlt: ${search}`);
  assert.equal(source.indexOf(search, first + search.length), -1, `Anker ist nicht eindeutig: ${search}`);
  return source.slice(0, first) + replacement + source.slice(first + search.length);
}

const legacyHeader = `  document.getElementById("gold").textContent=formatHighestCurrency(state.gold);
  const total=Object.values(state.inventory).reduce((s,x)=>s+x.qty,0);document.getElementById("matCount").textContent=total;`;

let source = match[1];
source = replaceOnce(source, 'function render(){', `${resourceHeaderRender}\n\nfunction render(){`);
source = replaceOnce(source, legacyHeader, '  renderResourceHeader();');

new vm.Script(source, { filename: 'NoBrainer_GitHub_v0.12.44.resource-presentation.js' });
assert.equal((source.match(/function renderResourceHeader\(/g) || []).length, 1);
assert.ok(source.includes('window.NoBrainerResourcePresentationCore.getResourceHeaderPresentation'));
assert.ok(source.includes('  renderResourceHeader();'));
assert.equal(source.includes('const total=Object.values(state.inventory).reduce((s,x)=>s+x.qty,0);'), false);

// Regression-Sicherung für den v0.12.43-Fehlerbereich: Der kleine Kopfzeilen-Patch darf
// weder das Materiallager noch die Schmiedevorschau aus dem Legacy-Renderpfad entfernen.
assert.ok(source.includes('const tbody=document.getElementById("inventoryRows");tbody.innerHTML="";'));
assert.ok(source.includes('renderForgePreview();'));
assert.ok(source.includes('renderDungeonStatus();'));

console.log('Ressourcen-Presentation-Adapter: Kopfzeile migriert; Materiallager, Schmiede und Dungeon-Render bleiben erhalten.');
