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

const adaptedMobileLabels = `function prepareMobileTableLabels(){
  document.querySelectorAll(".mobile-stack table").forEach(table=>{
    const headers=[...table.querySelectorAll("thead th")].map(x=>x.textContent||"");
    table.querySelectorAll("tbody tr").forEach(tr=>{
      const cells=[...tr.children];
      const presentation=window.NoBrainerMobileTablePresentationCore.getMobileTableLabelPresentation(headers,cells.length);
      cells.forEach((cell,i)=>{const label=presentation.labels[i];if(label)cell.dataset.label=label;});
    });
  });
}
`;

let source = match[1];
source = replaceRangeOnce(
  source,
  'function prepareMobileTableLabels(){',
  'function go(page){',
  adaptedMobileLabels + '\n',
  'Mobile-Tabellen-Präsentation'
);

new vm.Script(source, { filename: 'NoBrainer_GitHub_v0.12.48.mobile-table-presentation.js' });
assert.equal((source.match(/getMobileTableLabelPresentation\(/g) || []).length, 1);
assert.ok(source.includes('document.querySelectorAll(".mobile-stack table")'));
assert.ok(source.includes('prepareMobileTableLabels();queueSave();'));
assert.ok(source.includes('function go(page){'));

// Regression-Sicherung für die zuletzt empfindlichen Vollrender-Bereiche.
assert.ok(source.includes('renderForgePreview();'));
assert.ok(source.includes('renderDungeonStatus();'));
assert.ok(source.includes('const tbody=document.getElementById("inventoryRows");tbody.innerHTML="";'));

const app = fs.readFileSync('src/app/app.component.ts', 'utf8');
const sourceAdapterIndex = app.indexOf('let adaptedScript = this.legacySourceAdapter.adapt(source);');
const mobileTableAdapterIndex = app.indexOf('adaptedScript = this.legacyMobileTablePresentationAdapter.adapt(adaptedScript);');
const navigationAdapterIndex = app.indexOf('adaptedScript = this.legacyNavigationPresentationAdapter.adapt(adaptedScript);');
assert.ok(sourceAdapterIndex >= 0, 'LegacySourceAdapter-Aufruf fehlt.');
assert.ok(mobileTableAdapterIndex > sourceAdapterIndex, 'Mobile-Table-Adapter muss nach dem Source-Adapter laufen.');
assert.ok(navigationAdapterIndex > mobileTableAdapterIndex, 'Mobile-Table-Adapter muss vor dem Navigation-Adapter laufen, solange sein Endanker go(page) ist.');

console.log('Mobile-Table-Presentation-Adapter: Responsive Tabellenlabels migriert; Render- und Navigationspfade bleiben erhalten.');
