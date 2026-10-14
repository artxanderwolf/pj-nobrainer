import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('NoBrainer_GitHub_v0.12.2.html', 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
if (!match) throw new Error('Legacy-JavaScript konnte nicht extrahiert werden.');

function replaceOnce(source, search, replacement, label) {
  const first = source.indexOf(search);
  assert.ok(first >= 0, `${label}: Anker fehlt.`);
  assert.equal(source.indexOf(search, first + search.length), -1, `${label}: Anker ist nicht eindeutig.`);
  return source.slice(0, first) + replacement + source.slice(first + search.length);
}

function replaceExactCount(source, search, replacement, expectedCount, label) {
  const count = source.split(search).length - 1;
  assert.equal(count, expectedCount, `${label}: unerwartete Trefferzahl.`);
  return source.split(search).join(replacement);
}

let source = match[1];
source = replaceOnce(
  source,
  'if(!raw){setSaveStatus("Neuer Spielstand");return false;}',
  'if(!raw){setSaveStatus(window.NoBrainerSaveStatusPresentationCore.getSaveStatusPresentation("new").text);return false;}',
  'Neuer Spielstand'
);
source = replaceOnce(
  source,
  'setSaveStatus(when?`Geladen · ${when.toLocaleTimeString("de-DE")}`:"Spielstand geladen");',
  'setSaveStatus(window.NoBrainerSaveStatusPresentationCore.getSaveStatusPresentation("loaded",{timestamp:when?when.getTime():null,formatTime:value=>new Date(value).toLocaleTimeString("de-DE")}).text);',
  'Geladener Spielstand'
);
source = replaceOnce(
  source,
  'setSaveStatus(`${manual?"Manuell gespeichert":"Gespeichert"} · ${new Date(savedAt).toLocaleTimeString("de-DE")}`);',
  'setSaveStatus(window.NoBrainerSaveStatusPresentationCore.getSaveStatusPresentation("saved",{timestamp:savedAt,manual,formatTime:value=>new Date(value).toLocaleTimeString("de-DE")}).text);',
  'Gespeicherter Spielstand'
);
source = replaceExactCount(
  source,
  'setSaveStatus("Lokaler Save nicht verfügbar");',
  'setSaveStatus(window.NoBrainerSaveStatusPresentationCore.getSaveStatusPresentation("unavailable").text);',
  2,
  'Nicht verfügbarer Save'
);
source = replaceOnce(
  source,
  'setSaveStatus("Spielstand zurückgesetzt");',
  'setSaveStatus(window.NoBrainerSaveStatusPresentationCore.getSaveStatusPresentation("reset").text);',
  'Spielstand-Reset'
);

new vm.Script(source, { filename: 'NoBrainer_GitHub_v0.12.45.save-status-presentation.js' });
assert.equal((source.match(/getSaveStatusPresentation\(/g) || []).length, 6);
assert.ok(source.includes('function setSaveStatus(text){'));
assert.ok(source.includes('function loadGame(){'));
assert.ok(source.includes('function saveGame(manual=false){'));
assert.ok(source.includes('function resetSave(){'));

// Regression-Sicherung für die zuletzt empfindlichen Vollrender-Bereiche.
assert.ok(source.includes('renderForgePreview();'));
assert.ok(source.includes('renderDungeonStatus();'));
assert.ok(source.includes('const tbody=document.getElementById("inventoryRows");tbody.innerHTML="";'));

const app = fs.readFileSync('src/app/app.component.ts', 'utf8');
const sourceAdapterIndex = app.indexOf('this.legacySourceAdapter.adapt(adaptedScript)');
const saveStatusAdapterIndex = app.indexOf('this.legacySaveStatusPresentationAdapter.adapt(adaptedScript)');
assert.ok(sourceAdapterIndex >= 0, 'LegacySourceAdapter-Aufruf fehlt.');
assert.ok(saveStatusAdapterIndex > sourceAdapterIndex, 'Save-Status-Adapter muss nach dem Source-Adapter laufen.');

console.log('Save-Status-Presentation-Adapter: Statusdarstellung migriert; Save-Verhalten und Vollrender-Anker bleiben erhalten.');
