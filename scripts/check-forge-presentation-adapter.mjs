import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('NoBrainer_GitHub_v0.12.2.html', 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
if (!match) throw new Error('Legacy-JavaScript konnte nicht extrahiert werden.');

let source = match[1];
source = source.replace('function startForgeQueuedJob(job){', 'function startForgeQueuedJob(job,at=Date.now()){');

function replaceRangeOnce(input, startMarker, endMarker, replacement) {
  const start = input.indexOf(startMarker);
  assert.ok(start >= 0, `Startanker fehlt: ${startMarker}`);
  assert.equal(input.indexOf(startMarker, start + startMarker.length), -1, `Startanker nicht eindeutig: ${startMarker}`);
  const end = input.indexOf(endMarker, start + startMarker.length);
  assert.ok(end > start, `Endanker fehlt: ${endMarker}`);
  assert.equal(input.indexOf(endMarker, end + endMarker.length), -1, `Endanker nicht eindeutig: ${endMarker}`);
  return input.slice(0, start) + replacement + input.slice(end);
}

const previewReplacement = `function renderForgePreview(){
  if(!document.getElementById("forgeStartBtn"))return;
  populateForgeSelects();

  const preview=forgePreview();
  const allSelected=preview.slots.every(slot=>slot.material);
  const required=requirements(preview.slots);
  const presentation=window.NoBrainerForgePresentationCore.getForgePreviewPresentation({
    complete:allSelected,
    hasMaterials:hasMaterials(required),
    hasCapacity:state.forgeJobs.length+state.forgeQueue.length<state.upgrades.forgeSlots+state.upgrades.forgeQueue,
    seconds:preview.seconds,
    valueNickel:preview.valueNickel,
    factor:preview.factor,
    stats:preview.stats,
    reinforcementMaterial:preview.slots.find(slot=>slot.slot==="reinforcementMaterial")?.material||null
  },formatCurrencyNickel,reinforcementEffectText);

  document.getElementById("forgeTimePreview").textContent=presentation.timeText;
  document.getElementById("forgeValuePreview").textContent=presentation.valueText;
  document.getElementById("forgeDamagePreview").textContent=presentation.damageText;
  const damageInfo=document.getElementById("forgeDamageBaseInfo");
  if(damageInfo)damageInfo.textContent=presentation.damageBaseInfo;
  document.getElementById("forgeSpeedPreview").textContent=presentation.speedText;
  const speedInfo=document.getElementById("forgeSpeedBaseInfo");
  if(speedInfo)speedInfo.textContent=presentation.speedBaseInfo;
  document.getElementById("forgeHitPreview").textContent=presentation.hitText;
  document.getElementById("forgeRawPreview").textContent=presentation.rawText;
  document.getElementById("forgePenPreview").textContent=presentation.penetrationText;
  document.getElementById("forgeRarityPreview").textContent=presentation.rarityText;
  const reinforcementPreview=document.getElementById("forgeReinforcementPreview");
  if(reinforcementPreview)reinforcementPreview.textContent=presentation.reinforcementText;
  document.getElementById("forgeStartBtn").disabled=presentation.startDisabled;
}
`;

const jobsReplacement = `function renderForgeJob(){
  const box=document.getElementById("forgeJobCard"),q=document.getElementById("forgeQueueCard"),now=Date.now();
  if(box){
    const jobs=state.forgeJobs.map((job,index)=>window.NoBrainerForgePresentationCore.getActiveForgeJobPresentation(job,index,now,formatCurrencyNickel,formatDuration));
    box.className=jobs.length?"":"empty";
    box.innerHTML=jobs.length?jobs.map(item=>\`<div class="sell-row"><div style="width:100%"><strong>\${item.title}</strong><p class="muted">\${item.remainingText}</p><div class="bar energy"><i style="width:\${item.progressPercent}%"></i></div><p>ROH <b>\${item.rawText}</b> · Wert <b>\${item.valueText}</b></p></div></div>\`).join(""):"Kein aktiver Schmiedeauftrag.";
  }
  if(q){
    const queue=state.forgeQueue.map((job,index)=>window.NoBrainerForgePresentationCore.getQueuedForgeJobPresentation(job,index,formatDuration));
    q.className=queue.length?"":"empty";
    q.innerHTML=queue.length?queue.map(item=>\`<div class="sell-row"><div><strong>\${item.title}</strong><div class="sell-meta">\${item.metaText}</div></div></div>\`).join(""):"Warteschlange leer.";
  }
  renderUpgradeCards();
}
`;

source = replaceRangeOnce(source, 'function renderForgePreview(){', 'function recruitCost(', previewReplacement);
source = replaceRangeOnce(source, 'function renderForgeJob(){', 'function getWeaponEquipLocation(', jobsReplacement);
new vm.Script(source, { filename: 'NoBrainer_GitHub_v0.12.36.forge-presentation.js' });
assert.ok(source.includes('window.NoBrainerForgePresentationCore.getForgePreviewPresentation'));
assert.ok(source.includes('window.NoBrainerForgePresentationCore.getActiveForgeJobPresentation'));
assert.ok(source.includes('window.NoBrainerForgePresentationCore.getQueuedForgeJobPresentation'));
assert.equal(source.split('function renderForgePreview(){').length - 1, 1);
assert.equal(source.split('function renderForgeJob(){').length - 1, 1);
assert.ok(source.includes('function startForgeQueuedJob(job,at=Date.now()){'));
assert.ok(source.includes('function recruitCost(){'));
assert.ok(source.includes('function getWeaponEquipLocation(weaponId){'));

const ids = [
  'forgeStartBtn', 'forgeTimePreview', 'forgeValuePreview', 'forgeDamagePreview', 'forgeDamageBaseInfo',
  'forgeSpeedPreview', 'forgeSpeedBaseInfo', 'forgeHitPreview', 'forgeRawPreview', 'forgePenPreview',
  'forgeRarityPreview', 'forgeReinforcementPreview', 'forgeJobCard', 'forgeQueueCard'
];
const elements = Object.fromEntries(ids.map((id) => [id, { textContent: '', disabled: false, className: '', innerHTML: '' }]));
let populateCalls = 0;
let previewCaptured = null;
let activeCaptured = null;
let queueCaptured = null;
let upgradeRenderCalls = 0;
const context = {
  Date: class { static now() { return 1_000; } },
  document: { getElementById: (id) => elements[id] ?? null },
  populateForgeSelects: () => { populateCalls += 1; },
  forgePreview: () => ({
    slots: [
      { slot: 'baseMaterial', material: 'Eisen' },
      { slot: 'blade', material: 'Eisen' },
      { slot: 'back', material: 'Eisen' },
      { slot: 'gripShape', material: 'Holz' },
      { slot: 'gripMaterial', material: 'Leder' },
      { slot: 'reinforcementMaterial', material: 'Kupfer' }
    ],
    seconds: 42,
    valueNickel: 140,
    factor: 1.4,
    stats: { expectedRaw: 9.87 }
  }),
  requirements: () => ({ Kupfer: 1 }),
  hasMaterials: () => true,
  state: {
    forgeJobs: [{ weaponName: 'Aktivklinge', totalSeconds: 60, finishesAt: 31_000, valueNickel: 175, stats: { expectedRaw: 8.77 } }],
    forgeQueue: [{ weaponName: 'Wartedolch', totalSeconds: 45, valueNickel: 120 }],
    upgrades: { forgeSlots: 2, forgeQueue: 2 }
  },
  formatCurrencyNickel: (value) => `${value} Nickel`,
  formatDuration: (seconds) => `${seconds}s`,
  reinforcementEffectText: (material) => material === 'Kupfer' ? 'Kupfer-Effekt' : 'Kein Zusatzeffekt',
  renderUpgradeCards: () => { upgradeRenderCalls += 1; }
};
context.window = {
  NoBrainerForgePresentationCore: {
    getForgePreviewPresentation(input, formatCurrency, formatReinforcement) {
      previewCaptured = {
        input,
        formattedCurrency: formatCurrency(input.valueNickel),
        reinforcement: formatReinforcement(input.reinforcementMaterial)
      };
      return {
        timeText: '42 s',
        valueText: '140 Nickel',
        damageText: '12.00',
        damageBaseInfo: 'Materialbasis 10.00 × Waffenform 1.2',
        speedText: '1.20',
        speedBaseInfo: 'Materialbasis 1.00 × Waffenform 1.2',
        hitText: '80 %',
        rawText: '9.87',
        penetrationText: '20 %',
        rarityText: '× 1.4',
        reinforcementText: 'Verstärkungseffekt: Kupfer-Effekt',
        startDisabled: false
      };
    },
    getActiveForgeJobPresentation(job, index, now, formatCurrency, formatDuration) {
      activeCaptured = { job, index, now, value: formatCurrency(job.valueNickel), duration: formatDuration(30) };
      return { title: 'Platz 1: Aktivklinge', remainingText: '30s verbleibend', progressPercent: 50, rawText: '8.77', valueText: '175 Nickel' };
    },
    getQueuedForgeJobPresentation(job, index, formatDuration) {
      queueCaptured = { job, index, duration: formatDuration(job.totalSeconds) };
      return { title: '1. Wartedolch', metaText: '45s Herstellungszeit' };
    }
  }
};
vm.createContext(context);
new vm.Script(`${previewReplacement}\n${jobsReplacement}\nrenderForgePreview();\nrenderForgeJob();`).runInContext(context);

assert.equal(populateCalls, 1);
assert.equal(previewCaptured.input.complete, true);
assert.equal(previewCaptured.input.hasMaterials, true);
assert.equal(previewCaptured.input.hasCapacity, true);
assert.equal(previewCaptured.input.reinforcementMaterial, 'Kupfer');
assert.equal(previewCaptured.formattedCurrency, '140 Nickel');
assert.equal(previewCaptured.reinforcement, 'Kupfer-Effekt');
assert.equal(elements.forgeTimePreview.textContent, '42 s');
assert.equal(elements.forgeDamageBaseInfo.textContent, 'Materialbasis 10.00 × Waffenform 1.2');
assert.equal(elements.forgeReinforcementPreview.textContent, 'Verstärkungseffekt: Kupfer-Effekt');
assert.equal(elements.forgeStartBtn.disabled, false);

assert.equal(activeCaptured.index, 0);
assert.equal(activeCaptured.now, 1_000);
assert.equal(activeCaptured.value, '175 Nickel');
assert.equal(activeCaptured.duration, '30s');
assert.match(elements.forgeJobCard.innerHTML, /Platz 1: Aktivklinge/);
assert.match(elements.forgeJobCard.innerHTML, /width:50%/);
assert.match(elements.forgeJobCard.innerHTML, /ROH <b>8\.77<\/b>/);
assert.equal(queueCaptured.index, 0);
assert.equal(queueCaptured.duration, '45s');
assert.match(elements.forgeQueueCard.innerHTML, /1\. Wartedolch/);
assert.match(elements.forgeQueueCard.innerHTML, /45s Herstellungszeit/);
assert.equal(upgradeRenderCalls, 1);

console.log('Forge-Presentation-Adapter: Adapterreihenfolge, Anker, Syntax und DOM-Brücken für Vorschau und Aufträge sind konsistent.');
