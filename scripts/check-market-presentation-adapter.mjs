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
assert.ok(dungeonPresentationStart >= 0 && masterRenderStartBeforeCutover > dungeonPresentationStart);
source = source.slice(0, dungeonPresentationStart) + source.slice(masterRenderStartBeforeCutover);

const adapterText = fs.readFileSync('src/app/core/legacy-market-presentation-adapter.service.ts', 'utf8');
const replacementStartToken = 'const ADAPTED_MARKET_PRESENTATION = `';
const replacementStart = adapterText.indexOf(replacementStartToken);
const replacementEnd = adapterText.indexOf('`;\n\n@Injectable', replacementStart + replacementStartToken.length);
assert.ok(replacementStart >= 0 && replacementEnd > replacementStart);
const replacement = new Function(`return \`${adapterText.slice(replacementStart + replacementStartToken.length, replacementEnd)}\`;`)();
const startMarker = 'function renderMarketJob(){';
const endMarker = 'function render(){';
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start + startMarker.length);
assert.ok(start >= 0 && end > start);
source = source.slice(0, start) + replacement + source.slice(end);
new vm.Script(source, { filename: 'NoBrainer_GitHub_v0.12.81.market-presentation.js' });

assert.match(adapterText, /GameMarketPresentationService/);
assert.match(adapterText, /openLegacyCompatibilityBridge\(\)/);
assert.match(replacement, /NoBrainerMarketPresentationCompatibility/);
assert.match(replacement, /renderJobs\(\)/);
assert.match(replacement, /renderMaterials\(\)/);
assert.match(replacement, /renderWeapons\(\)/);
assert.doesNotMatch(adapterText, /MARKET_PRESENTATION_CORE_BRIDGE/);
assert.doesNotMatch(replacement, /state\.marketJobs|state\.inventory|state\.weaponInventory/);
assert.doesNotMatch(replacement, /getActiveMarketJobPresentation|getMarketMaterialPresentation|getMarketWeaponPresentation/);
assert.equal(source.split('function renderMarketJob(){').length - 1, 1);
assert.equal(source.split('function renderMarketMaterials(){').length - 1, 1);
assert.equal(source.split('function renderMarketWeapons(){').length - 1, 1);
assert.ok(source.includes('function render(){'));

const serviceText = fs.readFileSync('src/app/core/game-market-presentation.service.ts', 'utf8');
assert.match(serviceText, /GameStateService/);
assert.match(serviceText, /GameMarketService/);
assert.match(serviceText, /getActiveMarketJobPresentation/);
assert.match(serviceText, /getQueuedMarketJobPresentation/);
assert.match(serviceText, /getMarketMaterialPresentation/);
assert.match(serviceText, /getMarketWeaponPresentation/);
assert.match(serviceText, /data-market-cancel/);
assert.match(serviceText, /marketPresentationOwner/);
assert.match(serviceText, /Verkauf eingestellt:/);
assert.match(serviceText, /Verkauf abgebrochen:/);

console.log('Market-Presentation-Adapter: Legacy-Marktrenderer delegieren nur noch an die Angular-eigene Marktpräsentation; Verkaufsfeedback bleibt erhalten.');
