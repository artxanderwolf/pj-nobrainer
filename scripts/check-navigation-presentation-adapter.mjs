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

const legacyTitles = [
  'const titles = {',
  '  base:"Stützpunkt", dungeon:"Dungeon", tavern:"Taverne", roster:"Kader",',
  '  storage:"Lager", forge:"Schmiede", market:"Markt", index:"Index"',
  '};'
].join('\n');

const legacyGo = [
  'function go(page){',
  '  document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));',
  '  document.querySelectorAll("#nav button").forEach(x=>x.classList.remove("active"));',
  '  document.getElementById(page).classList.add("active");',
  '  document.querySelector(`#nav button[data-page="${page}"]`).classList.add("active");',
  '  document.getElementById("pageTitle").textContent = titles[page];',
  '  render();',
  '}'
].join('\n');

const navigationGoBridge = [
  'function applyNavigationPresentation(presentation){',
  '  document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));',
  '  document.querySelectorAll("#nav button").forEach(x=>x.classList.remove("active"));',
  '  const pageElement=document.getElementById(presentation.pageId);',
  '  if(pageElement)pageElement.classList.add("active");',
  '  const sectionButton=document.querySelector(`#nav button[data-section="${presentation.sectionId}"]`);',
  '  if(sectionButton)sectionButton.classList.add("active");',
  '  const titleElement=document.getElementById("pageTitle");',
  '  if(titleElement)titleElement.textContent=presentation.title;',
  '  const backButton=document.getElementById("backBtn");',
  '  if(backButton){',
  '    backButton.hidden=!presentation.parentPageId;',
  '    backButton.dataset.parentPage=presentation.parentPageId||"";',
  '  }',
  '}',
  '',
  'function go(page){',
  '  const presentation=window.NoBrainerNavigationPresentationCore.getNavigationPresentation(page);',
  '  applyNavigationPresentation(presentation);',
  '  render();',
  '}',
  '',
  'function goBack(){',
  '  const current=document.querySelector(".page.active");',
  '  const currentId=current?.id||"base";',
  '  const presentation=window.NoBrainerNavigationPresentationCore.getNavigationPresentation(currentId);',
  '  go(presentation.parentPageId||"base");',
  '}'
].join('\n');

let source = match[1];
source = replaceOnce(source, legacyTitles, '', 'Legacy-Seitentitel');
source = replaceOnce(source, legacyGo, navigationGoBridge, 'Legacy-Navigation');

new vm.Script(source, { filename: 'NoBrainer_GitHub_v0.12.0.navigation-presentation.js' });
assert.equal(source.includes('const titles = {'), false);
assert.equal((source.match(/getNavigationPresentation\(/g) || []).length, 2);
assert.ok(source.includes('function goBack(){'));
assert.ok(source.includes('data-section="${presentation.sectionId}"'));
assert.ok(source.includes('backButton.hidden=!presentation.parentPageId;'));
assert.ok(source.includes('document.getElementById("nav").addEventListener'));
assert.ok(source.includes('if(e.target.dataset.page) go(e.target.dataset.page);'));
assert.ok(source.includes('  render();'));

// Regression-Sicherung für empfindliche Vollrender-Bereiche.
assert.ok(source.includes('renderForgePreview();'));
assert.ok(source.includes('renderDungeonStatus();'));
assert.ok(source.includes('const tbody=document.getElementById("inventoryRows");tbody.innerHTML="";'));

const app = fs.readFileSync('src/app/app.component.ts', 'utf8');
const sourceAdapterIndex = app.indexOf('let adaptedScript = this.legacySourceAdapter.adapt(source);');
const navigationAdapterIndex = app.indexOf('adaptedScript = this.legacyNavigationPresentationAdapter.adapt(adaptedScript);');
assert.ok(sourceAdapterIndex >= 0, 'LegacySourceAdapter-Aufruf fehlt.');
assert.ok(navigationAdapterIndex > sourceAdapterIndex, 'Navigation-Adapter muss nach dem Source-Adapter laufen.');

console.log('Navigation-Presentation-Adapter: hierarchische Navigation, Zurück-Pfad und Bottom-Navigation bleiben mit der Legacy-Runtime kompatibel.');
