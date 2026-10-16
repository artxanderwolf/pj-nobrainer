import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('NoBrainer_GitHub_v0.12.2.html', 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
if (!match) throw new Error('Legacy-JavaScript konnte nicht extrahiert werden.');

const adapterSource = fs.readFileSync('src/app/core/legacy-forge-presentation-adapter.service.ts', 'utf8');
function extractTemplate(name) {
  const prefix = `const ${name} = \``;
  const start = adapterSource.indexOf(prefix);
  assert.ok(start >= 0, `${name} wurde im Adapter nicht gefunden.`);
  const bodyStart = start + prefix.length;
  const end = adapterSource.indexOf('`;\n', bodyStart);
  assert.ok(end > bodyStart, `${name} konnte nicht gelesen werden.`);
  return adapterSource.slice(bodyStart, end);
}
const previewReplacement = extractTemplate('ADAPTED_FORGE_PREVIEW');
const jobsReplacement = extractTemplate('ADAPTED_FORGE_JOBS');

function replaceRangeOnce(input, startMarker, endMarker, replacement) {
  const start = input.indexOf(startMarker);
  assert.ok(start >= 0, `Startanker fehlt: ${startMarker}`);
  assert.equal(input.indexOf(startMarker, start + startMarker.length), -1, `Startanker nicht eindeutig: ${startMarker}`);
  const end = input.indexOf(endMarker, start + startMarker.length);
  assert.ok(end > start, `Endanker fehlt: ${endMarker}`);
  assert.equal(input.indexOf(endMarker, end + endMarker.length), -1, `Endanker nicht eindeutig: ${endMarker}`);
  return input.slice(0, start) + replacement + input.slice(end);
}

let source = match[1];
source = replaceRangeOnce(source, 'function renderForgePreview(){', 'function recruitCost(', previewReplacement);
source = replaceRangeOnce(source, 'function renderForgeJob(){', 'function getWeaponEquipLocation(', jobsReplacement);
new vm.Script(source, { filename: 'NoBrainer_GitHub_v0.12.79.forge-presentation.js' });

assert.ok(source.includes('window.NoBrainerForgePresentationCore.getForgePreviewPresentation'));
assert.ok(source.includes('window.NoBrainerForgeJobPresentationCompatibility'));
assert.equal(source.split('function renderForgePreview(){').length - 1, 1);
assert.equal(source.split('function renderForgeJob(){').length - 1, 1);
assert.ok(source.includes('function recruitCost(){'));
assert.ok(source.includes('function getWeaponEquipLocation(weaponId){'));
assert.doesNotMatch(jobsReplacement, /state\.forgeJobs|state\.forgeQueue|getActiveForgeJobPresentation|getQueuedForgeJobPresentation|innerHTML|renderUpgradeCards/, 'Legacy-renderForgeJob enthält weiterhin Präsentationslogik.');

let bridgeCalls = 0;
const context = {
  window: {
    NoBrainerForgeJobPresentationCompatibility: {
      render() { bridgeCalls += 1; }
    }
  }
};
vm.createContext(context);
new vm.Script(`${jobsReplacement}\nrenderForgeJob();`).runInContext(context);
assert.equal(bridgeCalls, 1, 'Legacy-renderForgeJob delegiert nicht genau einmal an Angular.');

console.log('Forge-Presentation-Adapter: Schmiedevorschau bleibt am bestehenden Presentation-Core; renderForgeJob ist nur noch eine dünne Angular-Brücke und die Legacy-Anker bleiben stabil.');
