import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('NoBrainer_GitHub_v0.12.2.html', 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
if (!match) throw new Error('Legacy-JavaScript konnte nicht extrahiert werden.');

function replaceRangeOnce(source, startMarker, endMarker, replacement, label) {
  const start = source.indexOf(startMarker);
  assert.ok(start >= 0, `${label}: Startanker fehlt.`);
  assert.equal(source.indexOf(startMarker, start + startMarker.length), -1, `${label}: Startanker ist nicht eindeutig.`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.ok(end >= 0, `${label}: Endanker fehlt.`);
  assert.equal(source.indexOf(endMarker, end + endMarker.length), -1, `${label}: Endanker ist nicht eindeutig.`);
  return source.slice(0, start) + replacement + source.slice(end);
}

const adaptedAddLog = `function addLog(text, cls=""){
  const log=document.getElementById("combatLog");if(!log)return;
  const first=log.firstElementChild;
  const presentation=window.NoBrainerCombatLogPresentationCore.getCombatLogEntryPresentation(text,cls,{
    childCount:log.children.length,
    firstChildClassName:first?.className||"",
    firstChildText:first?.textContent||""
  });
  if(presentation.clearPlaceholder)log.innerHTML="";
  const row=document.createElement("div");
  row.className=presentation.className;
  row.textContent=presentation.text;
  log.prepend(row);
}
\n`;

let source = match[1];
source = replaceRangeOnce(
  source,
  'function addLog(',
  'let openWeaponPickerHand=null;',
  adaptedAddLog,
  'Kampfprotokoll-Präsentation'
);

new vm.Script(source, { filename: 'NoBrainer_GitHub_v0.12.47.combat-log-presentation.js' });
assert.equal((source.match(/getCombatLogEntryPresentation\(/g) || []).length, 1);
assert.ok(source.includes('log.prepend(row);'));

// Die bestehenden Ereignisquellen bleiben unverändert und liefern weiterhin Text/Klasse an addLog.
assert.ok(source.includes('addLog(`${enemy.name} trifft ${target.name} für ${dealt.toFixed(2)} Schaden'));
assert.ok(source.includes('addLog(`Schmiedeauftrag gestartet: ${finalName}.`,"good")'));
assert.ok(source.includes('addLog(`Verkauf abgeschlossen: ${j.name} → ${formatCurrencyNickel(j.valueNickel)}.`,"good")'));

// Regression-Sicherung für zuletzt empfindliche Vollrender-Bereiche.
assert.ok(source.includes('renderForgePreview();'));
assert.ok(source.includes('renderDungeonStatus();'));
assert.ok(source.includes('const tbody=document.getElementById("inventoryRows");tbody.innerHTML="";'));

const app = fs.readFileSync('src/app/app.component.ts', 'utf8');
const sourceAdapterIndex = app.indexOf('let adaptedScript = this.legacySourceAdapter.adapt(legacyScript.textContent ?? \'\');');
const combatLogAdapterIndex = app.indexOf('adaptedScript = this.legacyCombatLogPresentationAdapter.adapt(adaptedScript);');
const dungeonDomainAdapterIndex = app.indexOf('adaptedScript = this.legacyDungeonDomainAdapter.adapt(adaptedScript);');
assert.ok(sourceAdapterIndex >= 0, 'LegacySourceAdapter-Aufruf fehlt.');
assert.ok(combatLogAdapterIndex > sourceAdapterIndex, 'Combat-Log-Adapter muss nach dem Source-Adapter laufen.');
assert.ok(dungeonDomainAdapterIndex > combatLogAdapterIndex, 'Dungeon-Domain-Adapter muss nach dem Combat-Log-Adapter laufen.');

console.log('Combat-Log-Presentation-Adapter: DOM-Darstellung migriert; Ereignisquellen und Renderpfade bleiben erhalten.');
