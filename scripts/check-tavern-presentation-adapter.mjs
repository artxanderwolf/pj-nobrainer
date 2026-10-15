import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('NoBrainer_GitHub_v0.12.2.html', 'utf8');
const adapter = fs.readFileSync('src/app/core/legacy-tavern-presentation-adapter.service.ts', 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
if (!match) throw new Error('Legacy-JavaScript konnte nicht extrahiert werden.');

const replacementMatch = adapter.match(/const TAVERN_PRESENTATION_BRIDGE = `([\s\S]*?)`;/);
assert.ok(replacementMatch, 'Die Tavernen-Präsentationsbrücke konnte nicht aus dem Adapter gelesen werden.');
const replacement = replacementMatch[1];

let source = match[1];
const startMarker = 'function renderTavern(){';
const endMarker = 'function upgradeCost(kind,current){';
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start + startMarker.length);
assert.ok(start >= 0 && end > start);
assert.equal(source.indexOf(startMarker, start + startMarker.length), -1);

source = source.slice(0, start) + replacement + source.slice(end);
new vm.Script(source, { filename: 'NoBrainer_GitHub_v0.12.76.tavern-presentation.js' });

assert.ok(source.includes('window.NoBrainerTavernPresentationCompatibility'));
assert.ok(source.includes('tavernPresentation.render();'));
assert.equal(source.split('function renderTavern(){').length - 1, 1);
assert.ok(source.includes('function upgradeCost(kind,current){'));
assert.doesNotMatch(adapter, /TAVERN_PRESENTATION_CORE_BRIDGE|NoBrainerTavernPresentationCore/);

console.log('Tavernen-Präsentationsadapter: Legacy-renderTavern ist nur noch ein dünner Aufruf der Angular-Präsentationsbrücke; Anker und JavaScript-Syntax bleiben konsistent.');
