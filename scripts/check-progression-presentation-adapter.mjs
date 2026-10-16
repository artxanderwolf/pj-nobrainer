import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('NoBrainer_GitHub_v0.12.2.html', 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
if (!match) throw new Error('Legacy-JavaScript konnte nicht extrahiert werden.');

const adapter = fs.readFileSync('src/app/core/legacy-progression-presentation-adapter.service.ts', 'utf8');
const bridgeMatch = adapter.match(/const PROGRESSION_PRESENTATION_BRIDGE = `([\s\S]*?)`;/);
assert.ok(bridgeMatch, 'Die Progressions-Renderbrücke konnte nicht aus dem Adapter gelesen werden.');
const progressionBridge = bridgeMatch[1].replace(/\\`/g, '`');

let source = match[1];

// Der aktuelle Forge-Cutover läuft vor dem Progression-Presentation-Adapter und
// entfernt startForgeQueuedJob/fillForgeSlots vollständig. startForgeJob bleibt
// als stabiler Übergang zur UI-Kompatibilitätsfunktion erhalten.
const forgeSlotsStart = source.indexOf('function startForgeQueuedJob(');
const forgeJobStart = source.indexOf('function startForgeJob(){', forgeSlotsStart);
assert.ok(forgeSlotsStart >= 0 && forgeJobStart > forgeSlotsStart, 'Der aktuelle Forge-Slot-Cutover konnte nicht simuliert werden.');
source = source.slice(0, forgeSlotsStart) + source.slice(forgeJobStart);
assert.equal(source.includes('function startForgeQueuedJob('), false, 'Die alte Forge-Slot-Hilfsfunktion wurde in der Simulation nicht entfernt.');

const startMarker = 'function upgradeButton(kind,stateKey,cfgKey,label){';
const endMarker = 'function startForgeJob(){';
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start + startMarker.length);
assert.ok(start >= 0 && end > start);
assert.equal(source.indexOf(startMarker, start + startMarker.length), -1);

source = source.slice(0, start) + `${progressionBridge}\n` + source.slice(end);
new vm.Script(source, { filename: 'NoBrainer_GitHub_v0.12.77.progression-presentation-compatibility.js' });

assert.match(adapter, /window\.NoBrainerProgressionPresentationCompatibility/);
assert.match(adapter, /progressionPresentation\.render\(\);/);
assert.doesNotMatch(adapter, /NoBrainerProgressionPresentationCore|PROGRESSION_PRESENTATION_CORE_BRIDGE|getUpgradeCardsPresentation|state\.characters|state\.upgrades/, 'Legacy-Progressionsadapter enthält weiterhin Präsentations- oder State-Logik.');
assert.equal(source.includes('function upgradeButton(kind,stateKey,cfgKey,label){'), false);
assert.equal(source.split('function renderUpgradeCards(){').length - 1, 1);
assert.ok(source.includes('function startForgeJob(){'));
assert.equal(source.includes('function startForgeQueuedJob('), false);

console.log('Progression-Presentation-Adapter: Ausbaukarten delegieren nur noch über einen dünnen Renderwrapper an Angular; nachfolgende Forge-Anker bleiben intakt.');
