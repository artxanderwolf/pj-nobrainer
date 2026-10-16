import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('NoBrainer_GitHub_v0.12.2.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
if (!scriptMatch) throw new Error('Legacy-JavaScript konnte nicht extrahiert werden.');

let source = scriptMatch[1];
source = source.replace('function startMarketQueuedJob(job){', 'function startMarketQueuedJob(job,at=Date.now()){');

const dungeonPresentationStart = source.indexOf('function renderDungeonStatus(){');
const masterRenderStartBeforeCutover = source.indexOf('function render(){', dungeonPresentationStart);
assert.ok(dungeonPresentationStart >= 0 && masterRenderStartBeforeCutover > dungeonPresentationStart, 'Dungeon-Präsentationsbereich konnte nicht für die Adapterreihenfolge entfernt werden.');
source = source.slice(0, dungeonPresentationStart) + source.slice(masterRenderStartBeforeCutover);

const adapterText = fs.readFileSync('src/app/core/legacy-market-presentation-adapter.service.ts', 'utf8');
const replacementStartToken = 'const ADAPTED_MARKET_PRESENTATION = `';
const replacementStart = adapterText.indexOf(replacementStartToken);
const replacementEnd = adapterText.indexOf('`;\n\n@Injectable', replacementStart + replacementStartToken.length);
assert.ok(replacementStart >= 0 && replacementEnd > replacementStart);
const rawReplacement = adapterText.slice(replacementStart + replacementStartToken.length, replacementEnd);
const replacement = new Function(`return \`${rawReplacement}\`;`)();

const startMarker = 'function renderMarketJob(){';
const endMarker = 'function render(){';
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start + startMarker.length);
assert.ok(start >= 0 && end > start);
assert.equal(source.indexOf(startMarker, start + startMarker.length), -1);
assert.equal(source.indexOf(endMarker, end + endMarker.length), -1);

source = source.slice(0, start) + replacement + source.slice(end);
new vm.Script(source, { filename: 'NoBrainer_GitHub_v0.12.81.market-presentation.js' });
assert.ok(source.includes('window.NoBrainerMarketJobPresentationCompatibility'));
assert.ok(source.includes('window.NoBrainerMarketPresentationCore.getMarketMaterialPresentation'));
assert.ok(source.includes('window.NoBrainerMarketPresentationCore.getMarketWeaponPresentation'));
assert.ok(source.includes('window.NoBrainerMarketCompatibility.hasCapacity'));
assert.ok(!source.includes('window.NoBrainerMarketCore.hasMarketCapacity'));
assert.equal(source.split('function renderMarketJob(){').length - 1, 1);
assert.ok(source.includes('function startMarketQueuedJob(job,at=Date.now()){'));
assert.ok(source.includes('function render(){'));
assert.ok(!source.includes('function renderDungeonStatus(){'));

const marketJobFunction = replacement.slice(0, replacement.indexOf('function setMarketQty('));
assert.doesNotMatch(marketJobFunction, /NoBrainerMarketPresentationCore|getActiveMarketJobPresentation|getQueuedMarketJobPresentation|state\.marketJobs|state\.marketQueue|innerHTML|renderUpgradeCards/);
let jobRenderCalls = 0;
const context = {
  window: {
    NoBrainerMarketJobPresentationCompatibility: {
      render() { jobRenderCalls += 1; }
    }
  }
};
vm.createContext(context);
new vm.Script(`${marketJobFunction}\nrenderMarketJob();`).runInContext(context);
assert.equal(jobRenderCalls, 1, 'Legacy-renderMarketJob delegiert nicht genau einmal an Angular.');

console.log('Market-Presentation-Adapter: Marktaufträge delegieren nur noch an Angular; Material- und Waffenverkaufslisten bleiben über den gemeinsamen Presentation-Core stabil.');
