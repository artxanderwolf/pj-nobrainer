import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('NoBrainer_GitHub_v0.12.2.html', 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
if (!match) throw new Error('Legacy-JavaScript konnte nicht extrahiert werden.');

let source = match[1];

// Der Forge-Adapter läuft vor dem Progression-Presentation-Adapter und erweitert
// die Signatur von startForgeQueuedJob um einen optionalen Zeitparameter.
source = source.replace(
  'function startForgeQueuedJob(job){',
  'function startForgeQueuedJob(job,at=Date.now()){'
);

const startMarker = 'function upgradeButton(kind,stateKey,cfgKey,label){';
const endMarker = 'function startForgeQueuedJob(';
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start + startMarker.length);
assert.ok(start >= 0 && end > start);
assert.equal(source.indexOf(startMarker, start + startMarker.length), -1);

const replacement = `function renderUpgradeCards(){
  const presentation=window.NoBrainerProgressionPresentationCore.getUpgradeCardsPresentation({
    characterCount:state.characters.length,
    innCapacity:state.upgrades.innCapacity,
    forgeJobCount:state.forgeJobs.length,
    forgeSlotCapacity:state.upgrades.forgeSlots,
    forgeQueueCount:state.forgeQueue.length,
    forgeQueueCapacity:state.upgrades.forgeQueue,
    marketJobCount:state.marketJobs.length,
    marketSlotCapacity:state.upgrades.marketSlots,
    marketQueueCount:state.marketQueue.length,
    marketQueueCapacity:state.upgrades.marketQueue,
    offers:{
      inn:window.NoBrainerProgressionCore.getUpgradeOffer(state,"inn"),
      forgeSlots:window.NoBrainerProgressionCore.getUpgradeOffer(state,"forgeSlots"),
      forgeQueue:window.NoBrainerProgressionCore.getUpgradeOffer(state,"forgeQueue"),
      marketSlots:window.NoBrainerProgressionCore.getUpgradeOffer(state,"marketSlots"),
      marketQueue:window.NoBrainerProgressionCore.getUpgradeOffer(state,"marketQueue")
    }
  },formatCurrencyNickel);
  const renderStats=stats=>stats.map(stat=>\`<div class="stat"><span>\${stat.label}</span><b>\${stat.value}</b></div>\`).join("");
  const renderButtons=buttons=>buttons.map(button=>\`<button class="\${button.primary?"btn primary":"btn"}" onclick="buyUpgrade('\${button.kind}')" \${button.disabled?"disabled":""}>\${button.text}</button>\`).join("");
  const inn=document.getElementById("innUpgradeCard");
  if(inn)inn.innerHTML=\`<div class="statrow">\${renderStats(presentation.inn.stats)}</div><div class="actions">\${renderButtons(presentation.inn.buttons)}</div>\${presentation.inn.note?\`<p class="muted small">\${presentation.inn.note}</p>\`:""}\`;
  const f=document.getElementById("forgeUpgradeCard");
  if(f)f.innerHTML=\`<div class="statrow">\${renderStats(presentation.forge.stats)}</div><div class="actions">\${renderButtons(presentation.forge.buttons)}</div>\`;
  const m=document.getElementById("marketUpgradeCard");
  if(m)m.innerHTML=\`<div class="statrow">\${renderStats(presentation.market.stats)}</div><div class="actions">\${renderButtons(presentation.market.buttons)}</div>\`;
}
`;

source = source.slice(0, start) + replacement + source.slice(end);
new vm.Script(source, { filename: 'NoBrainer_GitHub_v0.12.33.progression-presentation.js' });

assert.ok(source.includes('window.NoBrainerProgressionPresentationCore.getUpgradeCardsPresentation'));
assert.ok(source.includes('window.NoBrainerProgressionCore.getUpgradeOffer(state,"inn")'));
assert.equal(source.includes('function upgradeButton(kind,stateKey,cfgKey,label){'), false);
assert.equal(source.split('function renderUpgradeCards(){').length - 1, 1);
assert.ok(source.includes('function startForgeQueuedJob(job,at=Date.now()){'));

console.log('Progression-Presentation-Adapter: Ausbaukarten-Anker bleibt nach Forge-Adapter kompatibel und resultierende JavaScript-Syntax ist konsistent.');
