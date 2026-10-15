import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('NoBrainer_GitHub_v0.12.2.html', 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
if (!match) throw new Error('Legacy-JavaScript konnte nicht extrahiert werden.');

const adapter = fs.readFileSync('src/app/core/legacy-combat-log-presentation-adapter.service.ts', 'utf8');
const service = fs.readFileSync('src/app/core/game-combat-log.service.ts', 'utf8');
const runtime = fs.readFileSync('src/app/core/game-runtime.service.ts', 'utf8');
const registration = fs.readFileSync('src/app/core/legacy-runtime-registration-adapter.service.ts', 'utf8');
const app = fs.readFileSync('src/app/app.component.ts', 'utf8');

function replaceRangeOnce(source, startMarker, endMarker, replacement, label) {
  const start = source.indexOf(startMarker);
  assert.ok(start >= 0, `${label}: Startanker fehlt.`);
  assert.equal(source.indexOf(startMarker, start + startMarker.length), -1, `${label}: Startanker ist nicht eindeutig.`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.ok(end >= 0, `${label}: Endanker fehlt.`);
  assert.equal(source.indexOf(endMarker, end + endMarker.length), -1, `${label}: Endanker ist nicht eindeutig.`);
  return source.slice(0, start) + replacement + source.slice(end);
}

const replacementMatch = adapter.match(/const ADAPTED_ADD_LOG = `([\s\S]*?)`;/);
assert.ok(replacementMatch, 'Die Legacy-Kampfprotokoll-Brücke konnte nicht aus dem Adapter gelesen werden.');
const adaptedAddLog = replacementMatch[1].replace(/\\`/g, '`');

let source = match[1];
source = replaceRangeOnce(
  source,
  'function addLog(',
  'let openWeaponPickerHand=null;',
  `${adaptedAddLog}\n`,
  'Kampfprotokoll-Präsentation'
);
new vm.Script(source, { filename: 'NoBrainer_GitHub_v0.12.75.combat-log-compatibility.js' });

assert.match(adapter, /window\.NoBrainerCombatLogCompatibility/);
assert.match(adapter, /combatLogCompatibility\.add\(text,cls\);/);
assert.doesNotMatch(adapter, /NoBrainerCombatLogPresentationCore/);

assert.match(service, /getCombatLogEntryPresentation/);
assert.match(service, /document\.getElementById\('combatLog'\)/);
assert.match(service, /log\.prepend\(row\);/);
assert.match(service, /openLegacyCompatibilityBridge\(\): void/);
assert.match(service, /closeLegacyCompatibilityBridge\(\): void/);
assert.match(service, /window\.NoBrainerCombatLogCompatibility = \{/);
assert.match(service, /delete window\.NoBrainerCombatLogCompatibility;/);

assert.match(runtime, /private readonly combatLog: GameCombatLogService/);
assert.match(runtime, /this\.combatLog\.add\(`/);
assert.doesNotMatch(runtime, /\baddLog\(text: string/);
assert.doesNotMatch(runtime, /runtime\.addLog\(/);
assert.doesNotMatch(registration, /\n  addLog,/);

const openIndex = app.indexOf('this.gameCombatLog.openLegacyCompatibilityBridge();');
const installIndex = app.indexOf('this.installLegacyScript(adaptedScript);');
assert.ok(openIndex >= 0 && installIndex > openIndex, 'Die Kampfprotokoll-Brücke muss vor der Legacy-Script-Installation geöffnet werden.');
assert.match(app, /this\.gameCombatLog\.closeLegacyCompatibilityBridge\(\);/);

// Noch nicht migrierte Legacy-Aktionen dürfen weiterhin addLog aufrufen; der dünne Wrapper hält sie funktionsfähig.
assert.ok(source.includes('addLog(`Schmiedeauftrag gestartet: ${finalName}.`,"good")'));
assert.ok(source.includes('addLog(`Verkauf abgeschlossen: ${j.name} → ${formatCurrencyNickel(j.valueNickel)}.`,"good")'));

console.log('Kampfprotokoll-Eigentümerschaft: DOM-Präsentation und Angular-Runtime-Ereignisse laufen über GameCombatLogService; Legacy-Aktionen besitzen nur noch einen dünnen addLog-Wrapper.');
