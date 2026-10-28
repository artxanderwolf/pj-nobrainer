import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, normalize, resolve } from 'node:path';

const distRoot = resolve('dist/nobrainer/browser');
const basePath = '/pj-nobrainer/';
const saveKey = 'nobrainer_save_v1';
assert.ok(existsSync(join(distRoot, 'index.html')), 'Der gebaute Angular-Index fehlt.');

const browser = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].find(candidate => {
  const probe = spawnSync('which', [candidate], { encoding: 'utf8' });
  return probe.status === 0 && probe.stdout.trim();
});
assert.ok(browser, 'Chrome/Chromium wurde für den Dungeon-Neustarttest nicht gefunden.');

const earlyScript = `<script>
window.__dungeonResumeErrors=[];
window.__dungeonResumeAlerts=[];
window.alert=message=>window.__dungeonResumeAlerts.push(String(message));
window.addEventListener('error',event=>window.__dungeonResumeErrors.push(String(event.error?.stack||event.message||event.error||'error')));
window.addEventListener('unhandledrejection',event=>window.__dungeonResumeErrors.push(String(event.reason?.stack||event.reason||'rejection')));
if(new URLSearchParams(location.search).get('phase')==='legacy'){
  try{
    const raw=localStorage.getItem('${saveKey}');
    if(raw){
      const parsed=JSON.parse(raw);
      const state=parsed&&parsed.state&&typeof parsed.state==='object'?parsed.state:parsed;
      if(state&&typeof state==='object')delete state.dungeonSessionEndsAt;
      if(parsed&&typeof parsed==='object'&&'state' in parsed)parsed.saveVersion=13;
      if(parsed&&typeof parsed==='object'&&'savedAt' in parsed)parsed.savedAt=Date.now();
      localStorage.setItem('${saveKey}',JSON.stringify(parsed));
    }
  }catch(error){window.__dungeonResumeErrors.push(String(error?.stack||error));}
}
</script>`;

const probeScript = `<script>
(() => {
  const phase=new URLSearchParams(location.search).get('phase')||'start';
  const normalizeText=value=>String(value||'').replace(/\\s+/g,' ').trim();
  const readSave=()=>{
    const raw=localStorage.getItem('${saveKey}');
    if(!raw)return {state:null,saveVersion:null};
    const parsed=JSON.parse(raw);
    const state=parsed&&parsed.state&&typeof parsed.state==='object'?parsed.state:parsed;
    const saveVersion=parsed&&typeof parsed==='object'&&Number.isFinite(Number(parsed.saveVersion))?Number(parsed.saveVersion):null;
    return {state,saveVersion};
  };
  const active=state=>Boolean(state?.dungeonAuto||state?.dungeonRun||state?.dungeonSearch||state?.dungeonLootCollect);
  const finish=result=>{
    if(document.getElementById('dungeonResumeE2EResult'))return;
    const node=document.createElement('pre');
    node.id='dungeonResumeE2EResult';
    node.textContent=JSON.stringify({
      phase,
      ...result,
      runtimeError:document.querySelector('.legacy-host')?.getAttribute('data-runtime-error')||'',
      browserErrors:Array.isArray(window.__dungeonResumeErrors)?window.__dungeonResumeErrors:[],
      alerts:Array.isArray(window.__dungeonResumeAlerts)?window.__dungeonResumeAlerts:[]
    });
    document.body.appendChild(node);
  };
  const openDungeon=callback=>{
    document.querySelector('[data-page="dungeon"]')?.click();
    setTimeout(()=>{
      document.getElementById('dungeonOverviewOpenBtn')?.click();
      setTimeout(callback,250);
    },100);
  };

  const started=Date.now();
  const timer=setInterval(()=>{
    const open=document.getElementById('dungeonOverviewOpenBtn');
    const primary=document.getElementById('dungeonPrimaryBtn');
    const modal=document.getElementById('dungeon-select');
    if(open&&primary&&modal&&!open.getAttribute('onclick')){
      clearInterval(timer);
      openDungeon(()=>{
        if(phase==='start'){
          primary.click();
          setTimeout(()=>{
            const save=readSave();
            const state=save.state;
            const endsAt=Number(state?.dungeonSessionEndsAt);
            finish({
              status:'checked',
              primaryText:normalizeText(primary.textContent),
              timeText:normalizeText(document.getElementById('dungeonTimeText')?.textContent),
              stateActive:active(state),
              saveVersion:save.saveVersion,
              endsAt:Number.isFinite(endsAt)?endsAt:null,
              remainingMs:Number.isFinite(endsAt)?endsAt-Date.now():null,
              teamSlots:Array.isArray(state?.dungeonTeamSlots)?state.dungeonTeamSlots:[],
              weaponCount:Array.isArray(state?.weaponInventory)?state.weaponInventory.length:null
            });
          },500);
          return;
        }

        setTimeout(()=>{
          const save=readSave();
          const state=save.state;
          const endsAt=Number(state?.dungeonSessionEndsAt);
          finish({
            status:'checked',
            primaryText:normalizeText(primary.textContent),
            timeText:normalizeText(document.getElementById('dungeonTimeText')?.textContent),
            stateActive:active(state),
            saveVersion:save.saveVersion,
            endsAt:Number.isFinite(endsAt)?endsAt:null,
            remainingMs:Number.isFinite(endsAt)?endsAt-Date.now():null,
            dungeonAuto:Boolean(state?.dungeonAuto),
            hasRun:Boolean(state?.dungeonRun),
            hasSearch:Boolean(state?.dungeonSearch),
            hasLootCollect:Boolean(state?.dungeonLootCollect),
            teamSlots:Array.isArray(state?.dungeonTeamSlots)?state.dungeonTeamSlots:[],
            weaponCount:Array.isArray(state?.weaponInventory)?state.weaponInventory.length:null
          });
        },500);
      });
      return;
    }

    if(Date.now()-started>5000){
      clearInterval(timer);
      finish({status:'runtime-not-ready'});
    }
  },50);
})();
</script>`;

const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'application/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.ico', 'image/x-icon']
]);

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
    let html = body.toString('utf8');
    html = html.replace('</head>', `${earlyScript}</head>`).replace('</body>', `${probeScript}</body>`);
    body = Buffer.from(html, 'utf8');
  }
  response.writeHead(200, {
    'content-type': contentTypes.get(extname(filePath)) ?? 'application/octet-stream',
    'cache-control': 'no-store'
  });
  response.end(body);
});

const delay = ms => new Promise(resolveDelay => setTimeout(resolveDelay, ms));
async function runBrowser(pageUrl, profile) {
  const child = spawn(browser, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=390,844',
    `--user-data-dir=${profile}`,
    '--virtual-time-budget=7000',
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
  assert.equal(code, 0, `Chrome/Chromium beendete den Dungeon-Neustarttest mit Code ${code}.\n${stderr}`);
  const resultMatch = stdout.match(/<pre id="dungeonResumeE2EResult">([^<]+)<\/pre>/);
  assert.ok(resultMatch, `Der Dungeon-Neustarttest hat kein Ergebnis erzeugt.\n${stderr}\nDOM-Ausgabe: ${stdout.slice(-5000)}`);
  const decoded = resultMatch[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&');
  return JSON.parse(decoded);
}

await new Promise((resolveListen, rejectListen) => {
  server.once('error', rejectListen);
  server.listen(0, '127.0.0.1', resolveListen);
});

const profile = mkdtempSync(join(tmpdir(), 'nobrainer-dungeon-resume-e2e-'));
try {
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const baseUrl = `http://127.0.0.1:${address.port}${basePath}`;

  const first = await runBrowser(`${baseUrl}?phase=start`, profile);
  assert.equal(first.status, 'checked', `Dungeonstart wurde nicht geprüft: ${JSON.stringify(first)}`);
  assert.equal(first.browserErrors.length, 0, `Browserfehler beim Dungeonstart: ${JSON.stringify(first)}`);
  assert.equal(first.runtimeError, '', `Runtimefehler beim Dungeonstart: ${JSON.stringify(first)}`);
  assert.equal(first.primaryText, 'Lauf abbrechen', 'Der Trainingslagerlauf wurde nicht gestartet.');
  assert.equal(first.stateActive, true, 'Der gestartete Dungeon ist im Save nicht aktiv.');
  assert.equal(first.saveVersion, 15, 'Ein neuer persistenter Dungeonlauf wird nicht als Save-Version 15 gespeichert.');
  assert.ok(Number.isFinite(first.endsAt) && first.endsAt > Date.now(), 'Der gestartete Dungeon besitzt keine zukünftige persistierte Endzeit.');
  assert.ok(first.remainingMs > 4.9 * 60 * 60 * 1000, 'Die gespeicherte Restzeit startet nicht nahe fünf Stunden.');

  await delay(750);
  const resumed = await runBrowser(`${baseUrl}?phase=resume`, profile);
  assert.equal(resumed.status, 'checked', `Dungeonfortsetzung wurde nicht geprüft: ${JSON.stringify(resumed)}`);
  assert.equal(resumed.browserErrors.length, 0, `Browserfehler nach Neustart: ${JSON.stringify(resumed)}`);
  assert.equal(resumed.runtimeError, '', `Runtimefehler nach Neustart: ${JSON.stringify(resumed)}`);
  assert.equal(resumed.primaryText, 'Lauf abbrechen', 'Browser-Neustart beendet den modernen Trainingslagerlauf.');
  assert.equal(resumed.stateActive, true, 'Der moderne Dungeon ist nach Browser-Neustart im Save nicht mehr aktiv.');
  assert.equal(resumed.saveVersion, 15, 'Der fortgesetzte Dungeon verliert die Save-Version 15.');
  assert.equal(resumed.endsAt, first.endsAt, 'Browser-Neustart vergibt dem Dungeon eine neue Endzeit.');
  assert.ok(resumed.remainingMs > 0 && resumed.remainingMs <= first.remainingMs, 'Die Restzeit wird nach Browser-Neustart nicht aus derselben Endzeit fortgeführt.');
  assert.deepEqual(resumed.teamSlots, first.teamSlots, 'Die Dungeon-Teamauswahl verändert sich beim Browser-Neustart.');
  assert.equal(resumed.weaponCount, first.weaponCount, 'Das Waffeninventar verändert sich beim Browser-Neustart.');

  const legacy = await runBrowser(`${baseUrl}?phase=legacy`, profile);
  assert.equal(legacy.status, 'checked', `Altstand-Migration wurde nicht geprüft: ${JSON.stringify(legacy)}`);
  assert.equal(legacy.browserErrors.length, 0, `Browserfehler bei Altstand-Migration: ${JSON.stringify(legacy)}`);
  assert.equal(legacy.runtimeError, '', `Runtimefehler bei Altstand-Migration: ${JSON.stringify(legacy)}`);
  assert.equal(legacy.primaryText, 'Lauf starten', 'Ein aktiver v13-Altstand ohne Endzeit wird nicht einmalig beendet.');
  assert.equal(legacy.stateActive, false, 'v13-Altstand ohne Endzeit bleibt nach Migration aktiv.');
  assert.equal(legacy.saveVersion, 15, 'Ein migrierter v13-Dungeonstand wird nicht als Save-Version 15 zurückgeschrieben.');
  assert.equal(legacy.dungeonAuto, false, 'Altstand-Migration lässt dungeonAuto aktiv.');
  assert.equal(legacy.hasRun, false, 'Altstand-Migration lässt eine aktive Kampfwelle bestehen.');
  assert.equal(legacy.hasSearch, false, 'Altstand-Migration lässt eine aktive Suche bestehen.');
  assert.equal(legacy.hasLootCollect, false, 'Altstand-Migration lässt eine ausstehende Beutesammlung bestehen.');
  assert.equal(legacy.endsAt, 0, 'Altstand-Migration bereinigt die fehlende Endzeit nicht auf den neutralen Zustand.');
  assert.deepEqual(legacy.teamSlots, first.teamSlots, 'Altstand-Migration löscht die gespeicherte Teamauswahl.');
  assert.equal(legacy.weaponCount, first.weaponCount, 'Altstand-Migration verändert das Waffeninventar.');

  console.log('Dungeon-Neustart-Browserregression: Save v15 persistiert die absolute Endzeit über Browserprozesse; aktive v13-Altstände ohne Endzeit werden einmalig bereinigt und als v15 zurückgeschrieben, Team und Inventar bleiben erhalten.');
} finally {
  rmSync(profile, { recursive: true, force: true });
  await new Promise(resolveClose => server.close(resolveClose));
}
