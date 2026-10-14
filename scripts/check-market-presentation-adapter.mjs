import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('NoBrainer_GitHub_v0.12.2.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
if (!scriptMatch) throw new Error('Legacy-JavaScript konnte nicht extrahiert werden.');

let source = scriptMatch[1];
source = source.replace('function startMarketQueuedJob(job){', 'function startMarketQueuedJob(job,at=Date.now()){');

const adapterText = fs.readFileSync('src/app/core/legacy-market-presentation-adapter.service.ts', 'utf8');
const replacementStartToken = 'const ADAPTED_MARKET_PRESENTATION = `';
const replacementStart = adapterText.indexOf(replacementStartToken);
const replacementEnd = adapterText.indexOf('`;\n\n@Injectable', replacementStart + replacementStartToken.length);
assert.ok(replacementStart >= 0 && replacementEnd > replacementStart);
const rawReplacement = adapterText.slice(replacementStart + replacementStartToken.length, replacementEnd);
const replacement = new Function(`return \`${rawReplacement}\`;`)();

const startMarker = 'function renderMarketJob(){';
const endMarker = 'function renderDungeonStatus(';
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start + startMarker.length);
assert.ok(start >= 0 && end > start);
assert.equal(source.indexOf(startMarker, start + startMarker.length), -1);
assert.equal(source.indexOf(endMarker, end + endMarker.length), -1);

source = source.slice(0, start) + replacement + source.slice(end);
new vm.Script(source, { filename: 'NoBrainer_GitHub_v0.12.35.market-presentation.js' });
assert.ok(source.includes('window.NoBrainerMarketPresentationCore.getActiveMarketJobPresentation'));
assert.ok(source.includes('window.NoBrainerMarketPresentationCore.getQueuedMarketJobPresentation'));
assert.ok(source.includes('window.NoBrainerMarketPresentationCore.getMarketMaterialPresentation'));
assert.ok(source.includes('window.NoBrainerMarketPresentationCore.getMarketWeaponPresentation'));
assert.ok(source.includes('window.NoBrainerMarketCore.hasMarketCapacity'));
assert.equal(source.split('function renderMarketJob(){').length - 1, 1);
assert.ok(source.includes('function startMarketQueuedJob(job,at=Date.now()){'));
assert.ok(source.includes('function renderDungeonStatus(){'));

const marketJobFunction = replacement.slice(0, replacement.indexOf('function setMarketQty('));
const elements = {
  marketJobCard: { className: '', innerHTML: '' },
  marketQueueCard: { className: '', innerHTML: '' }
};
let upgradeCalls = 0;
let activeCalls = 0;
let queueCalls = 0;
const context = {
  document: { getElementById: (id) => elements[id] ?? null },
  state: {
    marketJobs: [{ type: 'material', name: 'Kupfer', quantity: 2, valueNickel: 80, seconds: 20, finishesAt: Date.now() + 10_000 }],
    marketQueue: [{ type: 'weapon', name: 'Klinge', valueNickel: 120, seconds: 30 }]
  },
  formatCurrencyNickel: (value) => `${value} Nickel`,
  formatDuration: (seconds) => `${seconds}s`,
  renderUpgradeCards: () => { upgradeCalls += 1; }
};
context.window = {
  NoBrainerMarketPresentationCore: {
    getActiveMarketJobPresentation(job, index, now, formatCurrency, formatDuration) {
      activeCalls += 1;
      assert.equal(index, 0);
      assert.equal(formatCurrency(job.valueNickel), '80 Nickel');
      assert.equal(typeof now, 'number');
      assert.equal(formatDuration(10), '10s');
      return { title: 'Platz 1: 2× Kupfer', remainingText: '10s', revenueValueText: '80 Nickel', progressPercent: 50 };
    },
    getQueuedMarketJobPresentation(job, index, formatCurrency, formatDuration) {
      queueCalls += 1;
      assert.equal(index, 0);
      assert.equal(formatCurrency(job.valueNickel), '120 Nickel');
      assert.equal(formatDuration(job.seconds), '30s');
      return { title: '1. Klinge', metaText: '30s · 120 Nickel' };
    }
  }
};
vm.createContext(context);
new vm.Script(`${marketJobFunction}\nrenderMarketJob();`).runInContext(context);
assert.equal(activeCalls, 1);
assert.equal(queueCalls, 1);
assert.equal(upgradeCalls, 1);
assert.match(elements.marketJobCard.innerHTML, /Platz 1: 2× Kupfer/);
assert.match(elements.marketJobCard.innerHTML, /width:50%/);
assert.match(elements.marketJobCard.innerHTML, /80 Nickel/);
assert.match(elements.marketQueueCard.innerHTML, /1\. Klinge/);
assert.match(elements.marketQueueCard.innerHTML, /30s · 120 Nickel/);

console.log('Market-Presentation-Adapter: Adapterreihenfolge, Anker, Syntax und Markt-DOM-Brücke sind konsistent.');
