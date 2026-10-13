import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('NoBrainer_GitHub_v0.12.2.html', 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
if (!match) throw new Error('Legacy-JavaScript konnte nicht extrahiert werden.');

let source = match[1];
source = source.replace('function startForgeQueuedJob(job){', 'function startForgeQueuedJob(job,at=Date.now()){');

const startMarker = 'function renderForgePreview(){';
const endMarker = 'function recruitCost(';
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start + startMarker.length);
assert.ok(start >= 0 && end > start);
assert.equal(source.indexOf(startMarker, start + startMarker.length), -1);
assert.equal(source.indexOf(endMarker, end + endMarker.length), -1);

const replacement = `function renderForgePreview(){
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

source = source.slice(0, start) + replacement + source.slice(end);
new vm.Script(source, { filename: 'NoBrainer_GitHub_v0.12.34.forge-presentation.js' });
assert.ok(source.includes('window.NoBrainerForgePresentationCore.getForgePreviewPresentation'));
assert.equal(source.split('function renderForgePreview(){').length - 1, 1);
assert.ok(source.includes('function startForgeQueuedJob(job,at=Date.now()){'));
assert.ok(source.includes('function recruitCost(){'));

const ids = [
  'forgeStartBtn', 'forgeTimePreview', 'forgeValuePreview', 'forgeDamagePreview', 'forgeDamageBaseInfo',
  'forgeSpeedPreview', 'forgeSpeedBaseInfo', 'forgeHitPreview', 'forgeRawPreview', 'forgePenPreview',
  'forgeRarityPreview', 'forgeReinforcementPreview'
];
const elements = Object.fromEntries(ids.map((id) => [id, { textContent: '', disabled: false }]));
let populateCalls = 0;
let captured = null;
const context = {
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
  state: { forgeJobs: [], forgeQueue: [], upgrades: { forgeSlots: 1, forgeQueue: 1 } },
  formatCurrencyNickel: (value) => `${value} Nickel`,
  reinforcementEffectText: (material) => material === 'Kupfer' ? 'Kupfer-Effekt' : 'Kein Zusatzeffekt'
};
context.window = {
  NoBrainerForgePresentationCore: {
    getForgePreviewPresentation(input, formatCurrency, formatReinforcement) {
      captured = {
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
    }
  }
};
vm.createContext(context);
new vm.Script(`${replacement}\nrenderForgePreview();`).runInContext(context);

assert.equal(populateCalls, 1);
assert.equal(captured.input.complete, true);
assert.equal(captured.input.hasMaterials, true);
assert.equal(captured.input.hasCapacity, true);
assert.equal(captured.input.reinforcementMaterial, 'Kupfer');
assert.equal(captured.formattedCurrency, '140 Nickel');
assert.equal(captured.reinforcement, 'Kupfer-Effekt');
assert.equal(elements.forgeTimePreview.textContent, '42 s');
assert.equal(elements.forgeDamageBaseInfo.textContent, 'Materialbasis 10.00 × Waffenform 1.2');
assert.equal(elements.forgeReinforcementPreview.textContent, 'Verstärkungseffekt: Kupfer-Effekt');
assert.equal(elements.forgeStartBtn.disabled, false);

console.log('Forge-Presentation-Adapter: Adapterreihenfolge, Anker, Syntax und DOM-Brücke der Schmiedevorschau sind konsistent.');
