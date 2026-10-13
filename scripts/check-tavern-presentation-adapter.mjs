import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('NoBrainer_GitHub_v0.12.2.html', 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
if (!match) throw new Error('Legacy-JavaScript konnte nicht extrahiert werden.');

let source = match[1];
const startMarker = 'function renderTavern(){';
const endMarker = 'function upgradeCost(kind,current){';
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start + startMarker.length);
assert.ok(start >= 0 && end > start);
assert.equal(source.indexOf(startMarker, start + startMarker.length), -1);

const replacement = `function renderTavern(){
  const offer=document.getElementById("tavernOffer"),cap=document.getElementById("tavernCapacity"),summary=document.getElementById("baseTavernSummary");
  const cost=recruitCost();
  const presentation=window.NoBrainerTavernPresentationCore.getTavernPresentation(Object.values(CHARACTER_CLASSES),state.characters.length,state.upgrades.innCapacity,state.gold,cost,formatCurrencyNickel(cost));
  const renderStats=stats=>stats.map(stat=>\`<div class="stat"><span>\${stat.label}</span><b>\${stat.value}</b></div>\`).join("");
  if(summary)summary.innerHTML=\`<div class="statrow">\${renderStats(presentation.summaryStats)}</div>\`;
  if(offer)offer.innerHTML=presentation.offers.map(entry=>\`<div class="tavern-offer"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><strong>\${entry.name}</strong><span class="tag fixed">\${entry.roleTag}</span></div><div class="statrow">\${renderStats(entry.stats)}</div><div class="actions"><button class="btn primary" onclick="recruitCharacter('\${entry.classId}')" \${entry.disabled?"disabled":""}>\${entry.recruitLabel}</button></div></div>\`).join("")+(presentation.statusText?\`<p class="status-line">\${presentation.statusText}</p>\`:"");
  if(cap)cap.innerHTML=\`<div class="statrow">\${renderStats(presentation.capacityStats)}</div><div class="actions"><button class="btn" onclick="go('base')">\${presentation.openInnLabel}</button></div>\`;
}
`;

source = source.slice(0, start) + replacement + source.slice(end);
new vm.Script(source, { filename: 'NoBrainer_GitHub_v0.12.31.tavern-presentation.js' });

assert.ok(source.includes('window.NoBrainerTavernPresentationCore.getTavernPresentation'));
assert.ok(source.includes('formatCurrencyNickel(cost)'));
assert.equal(source.split('function renderTavern(){').length - 1, 1);
assert.ok(source.includes('function upgradeCost(kind,current){'));

console.log('Tavernen-Präsentationsadapter: Legacy-Anker und resultierende JavaScript-Syntax sind konsistent.');
