import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, normalize, resolve } from 'node:path';

const distRoot = resolve('dist/nobrainer/browser');
const basePath = '/pj-nobrainer/';
assert.ok(existsSync(join(distRoot, 'index.html')), 'Der gebaute Angular-Index fehlt.');

const browser = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].find(candidate => {
  const probe = spawnSync('which', [candidate], { encoding: 'utf8' });
  return probe.status === 0 && probe.stdout.trim();
});
assert.ok(browser, 'Chrome/Chromium wurde für den Stadt-Header-E2E-Test nicht gefunden.');

const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'application/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.ico', 'image/x-icon']
]);

let probeScript = '';
const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1');
  if (!url.pathname.startsWith(basePath)) {
    response.writeHead(404).end('Not found');
    return;
  }
  let relativePath = decodeURIComponent(url.pathname.slice(basePath.length));
  if (!relativePath) relativePath = 'index.html';
  const safePath = normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
  const filePath = join(distRoot, safePath);
  if (!existsSync(filePath)) {
    response.writeHead(404).end('Not found');
    return;
  }
  let body = readFileSync(filePath);
  if (safePath === 'index.html') {
    const html = body.toString('utf8').replace('</body>', `<script>${probeScript}</script></body>`);
    body = Buffer.from(html, 'utf8');
  }
  response.writeHead(200, {
    'content-type': contentTypes.get(extname(filePath)) ?? 'application/octet-stream',
    'cache-control': 'no-store'
  });
  response.end(body);
});

const browserProfile = mkdtempSync(join(tmpdir(), 'nobrainer-city-header-e2e-'));
const delay = ms => new Promise(resolveDelay => setTimeout(resolveDelay, ms));

async function runBrowser(script, resultId) {
  probeScript = script;
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const pageUrl = `http://127.0.0.1:${address.port}${basePath}`;
  const child = spawn(browser, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=390,844',
    `--user-data-dir=${browserProfile}`,
    '--virtual-time-budget=8000',
    '--dump-dom',
    pageUrl
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', chunk => { stdout += chunk; });
  child.stderr.on('data', chunk => { stderr += chunk; });
  const code = await new Promise((resolveClose, rejectClose) => {
    child.once('error', rejectClose);
    child.once('close', resolveClose);
  });
  assert.equal(code, 0, `Chrome/Chromium beendete den Stadt-Header-Test mit Code ${code}.\n${stderr}`);
  const match = stdout.match(new RegExp(`<pre id="${resultId}">([^<]+)<\\/pre>`));
  assert.ok(match, `Der Stadt-Header-Test hat kein Ergebnis ${resultId} erzeugt.\n${stderr}\nDOM-Ausgabe: ${stdout.slice(-7000)}`);
  return JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&'));
}

const firstProbe = `
(() => {
  const SAVE_KEY='nobrainer_save_v1';
  const started=Date.now();
  let phase=0;
  const finish=result=>{
    if(document.getElementById('cityHeaderResult'))return;
    const node=document.createElement('pre');
    node.id='cityHeaderResult';
    node.textContent=JSON.stringify(result);
    document.body.appendChild(node);
  };
  const timer=setInterval(()=>{
    const title=document.getElementById('pageTitle');
    const base=document.getElementById('base');
    const characterButton=document.querySelector('#nav button[data-page="character"]');
    const baseButton=document.querySelector('#nav button[data-page="base"]');
    const money=document.getElementById('gold');
    const coin=document.getElementById('goldIcon');
    const quest=document.querySelector('#questHeaderButton img');
    const help=document.querySelector('button[aria-label="Hilfe"] img');
    const overview=document.querySelector('#questOverviewButton img');
    if(!(title&&base&&characterButton&&baseButton&&money&&coin&&quest&&help&&overview&&coin.complete&&quest.complete&&help.complete&&overview.complete)){
      if(Date.now()-started>7000){clearInterval(timer);finish({status:'not-ready'});}
      return;
    }
    if(phase===0){
      if(title.textContent.trim()!=='Stadt Name')return;
      const initialEditable=title.contentEditable==='true';
      title.textContent='Eisenfels';
      title.dispatchEvent(new Event('blur'));
      phase=1;
      window.__initialEditable=initialEditable;
      return;
    }
    if(phase===1){
      let save=null;
      try{save=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');}catch{}
      if(save?.state?.cityName!=='Eisenfels')return;
      characterButton.click();
      phase=2;
      return;
    }
    if(phase===2){
      if(title.textContent.trim()!=='Charakter')return;
      const characterEditable=title.contentEditable==='true';
      baseButton.click();
      phase=3;
      window.__characterEditable=characterEditable;
      return;
    }
    if(phase===3){
      if(title.textContent.trim()!=='Eisenfels')return;
      clearInterval(timer);
      finish({
        status:'passed',
        initialEditable:window.__initialEditable,
        characterEditable:window.__characterEditable,
        baseEditable:title.contentEditable==='true',
        cityName:title.textContent.trim(),
        moneyText:money.textContent.trim(),
        moneyDenomination:money.dataset.currencyDenomination,
        coinSrc:coin.getAttribute('src'),
        coinSize:[coin.naturalWidth,coin.naturalHeight],
        questSrc:quest.getAttribute('src'),
        helpSrc:help.getAttribute('src'),
        overviewSrc:overview.getAttribute('src'),
        questSize:[quest.naturalWidth,quest.naturalHeight],
        helpSize:[help.naturalWidth,help.naturalHeight],
        overviewSize:[overview.naturalWidth,overview.naturalHeight]
      });
    }
  },50);
})();`;

const secondProbe = `
(() => {
  const SAVE_KEY='nobrainer_save_v1';
  const started=Date.now();
  const timer=setInterval(()=>{
    const title=document.getElementById('pageTitle');
    if(!title||title.textContent.trim()!=='Eisenfels'){
      if(Date.now()-started>7000){
        clearInterval(timer);
        const node=document.createElement('pre');node.id='cityHeaderReloadResult';node.textContent=JSON.stringify({status:'not-restored',title:title?.textContent||''});document.body.appendChild(node);
      }
      return;
    }
    let save=null;
    try{save=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');}catch{}
    clearInterval(timer);
    const node=document.createElement('pre');
    node.id='cityHeaderReloadResult';
    node.textContent=JSON.stringify({status:'passed',title:title.textContent.trim(),savedCityName:save?.state?.cityName,editable:title.contentEditable==='true'});
    document.body.appendChild(node);
  },50);
})();`;

await new Promise((resolveListen, rejectListen) => {
  server.once('error', rejectListen);
  server.listen(0, '127.0.0.1', resolveListen);
});

try {
  const first = await runBrowser(firstProbe, 'cityHeaderResult');
  assert.equal(first.status, 'passed', `Stadt-Header konnte nicht vollständig geprüft werden: ${JSON.stringify(first)}`);
  assert.equal(first.initialEditable, true, 'Der Stadtname ist auf der Übersicht nicht bearbeitbar.');
  assert.equal(first.characterEditable, false, 'Der Seitentitel bleibt außerhalb der Übersicht bearbeitbar.');
  assert.equal(first.baseEditable, true, 'Der Stadtname ist nach Rückkehr zur Übersicht nicht bearbeitbar.');
  assert.equal(first.cityName, 'Eisenfels');
  assert.equal(first.moneyText, '0 Nickel', 'Ein frischer Spielstand wird im Header nicht als Nickel dargestellt.');
  assert.equal(first.moneyDenomination, 'Nickel', 'Die sichtbare Münzstufe ist beim frischen Spielstand nicht Nickel.');
  assert.equal(first.coinSrc, 'ui/coin_1nic_32.png', 'Das Nickel-PNG wird für den frischen Stadtgeldbestand nicht verwendet.');
  assert.deepEqual(first.coinSize, [32, 32], 'Das Nickel-PNG wird nicht als echtes 32x32-Asset geladen.');
  assert.equal(first.questSrc, 'ui/quest_32.png');
  assert.equal(first.helpSrc, 'ui/fragezeichen_32.png');
  assert.equal(first.overviewSrc, 'ui/quest_32.png');
  assert.deepEqual(first.questSize, [32, 32], 'Das Quest-PNG wird nicht als echtes 32x32-Asset geladen.');
  assert.deepEqual(first.helpSize, [32, 32], 'Das Hilfe-PNG wird nicht als echtes 32x32-Asset geladen.');
  assert.deepEqual(first.overviewSize, [32, 32], 'Der Missionszugang verwendet nicht dasselbe Quest-PNG.');

  await delay(250);
  const second = await runBrowser(secondProbe, 'cityHeaderReloadResult');
  assert.equal(second.status, 'passed', `Der Stadtname wurde nach Browser-Neustart nicht wiederhergestellt: ${JSON.stringify(second)}`);
  assert.equal(second.title, 'Eisenfels');
  assert.equal(second.savedCityName, 'Eisenfels');
  assert.equal(second.editable, true);

  console.log('Stadt-Header-Browserregression: Stadtname, Browser-Neustart, Nickel-Stadtgeld-PNG sowie Quest-/Hilfe-PNGs sind konsistent.');
} finally {
  rmSync(browserProfile, { recursive: true, force: true });
  await new Promise(resolveClose => server.close(resolveClose));
}
