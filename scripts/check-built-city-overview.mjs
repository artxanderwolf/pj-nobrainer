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
assert.ok(browser, 'Chrome/Chromium wurde für den Stadtübersicht-E2E-Test nicht gefunden.');

const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'application/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.ico', 'image/x-icon']
]);

const probeScript = `
(() => {
  let phase=0;
  const result={};
  const finish=payload=>{
    if(document.getElementById('cityOverviewResult'))return;
    const node=document.createElement('pre');
    node.id='cityOverviewResult';
    node.textContent=JSON.stringify(payload);
    document.body.appendChild(node);
  };
  const click=id=>document.getElementById(id)?.click();
  const timer=setInterval(()=>{
    const city=document.getElementById('cityOverview');
    const bg=document.getElementById('cityOverviewBackground');
    const shell=document.querySelector('.modular-ui');
    const nav=document.getElementById('nav');
    if(!(city&&bg&&shell&&nav))return;

    if(phase===0){
      const enabledIds=['recruit','market','dungeon','roster','forge','materials','weapons','missions'];
      const disabledIds=['team-2','team-3','team-4','team-5','team-6','team-7','team-8','team-9','team-10','armor','upgrade','activity'];
      result.backgroundSrc=bg.getAttribute('src');
      result.cityOwner=city.dataset.cityOverviewOwner;
      result.baseShellActive=shell.classList.contains('city-overview-active');
      result.baseNavDisplay=getComputedStyle(nav).display;
      result.oldDashboardPresent=Boolean(document.querySelector('#base .dashboard-menu'));
      result.team1Disabled=document.getElementById('cityAction-team-1')?.disabled;
      result.enabledStates=Object.fromEntries(enabledIds.map(id=>[id,document.getElementById('cityAction-'+id)?.disabled===false]));
      result.disabledStates=Object.fromEntries(disabledIds.map(id=>[id,document.getElementById('cityAction-'+id)?.disabled===true]));
      click('cityAction-roster');
      phase=1;
      return;
    }

    if(phase===1){
      if(!document.getElementById('roster')?.classList.contains('active'))return;
      result.rosterOpened=document.getElementById('pageTitle')?.textContent?.trim()==='Kader';
      result.subpageShellActive=shell.classList.contains('city-overview-active');
      result.subpageNavVisible=getComputedStyle(nav).display!=='none';
      window.go('base');
      phase=2;
      return;
    }

    if(phase===2){
      if(!document.getElementById('base')?.classList.contains('active')||!shell.classList.contains('city-overview-active'))return;
      click('cityAction-missions');
      phase=3;
      return;
    }

    if(phase===3){
      const dialog=document.getElementById('missionDialog');
      if(!dialog?.open)return;
      result.missionsOpened=true;
      dialog.close();
      click('cityAction-team-1');
      phase=4;
      return;
    }

    if(phase===4){
      const dungeon=document.getElementById('dungeon');
      const modal=document.getElementById('dungeon-select');
      if(!dungeon?.classList.contains('active')||!modal||modal.hidden)return;
      result.teamOpened=modal.dataset.teamId==='1' && modal.getAttribute('aria-hidden')==='false';
      result.backgroundComplete=bg.complete;
      result.backgroundSize=[bg.naturalWidth,bg.naturalHeight];
      clearInterval(timer);
      finish({status:'passed',...result});
    }
  },50);
})();`;

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
    body = Buffer.from(body.toString('utf8').replace('</body>', `<script>${probeScript}</script></body>`), 'utf8');
  }
  response.writeHead(200, {
    'content-type': contentTypes.get(extname(filePath)) ?? 'application/octet-stream',
    'cache-control': 'no-store'
  });
  response.end(body);
});

const browserProfile = mkdtempSync(join(tmpdir(), 'nobrainer-city-overview-e2e-'));
await new Promise((resolveListen, rejectListen) => {
  server.once('error', rejectListen);
  server.listen(0, '127.0.0.1', resolveListen);
});

try {
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
    '--window-size=500,961',
    `--user-data-dir=${browserProfile}`,
    '--virtual-time-budget=12000',
    '--dump-dom',
    pageUrl
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  let stdout='';
  let stderr='';
  child.stdout.on('data',chunk=>{stdout+=chunk;});
  child.stderr.on('data',chunk=>{stderr+=chunk;});
  const code=await new Promise((resolveClose,rejectClose)=>{child.once('error',rejectClose);child.once('close',resolveClose);});
  assert.equal(code,0,`Chrome/Chromium beendete den Stadtübersicht-Test mit Code ${code}.\n${stderr}`);
  const match=stdout.match(/<pre id="cityOverviewResult">([^<]+)<\/pre>/);
  assert.ok(match,`Die Stadtübersicht hat kein Testergebnis erzeugt.\n${stderr}\nDOM-Ausgabe: ${stdout.slice(-8000)}`);
  const result=JSON.parse(match[1].replaceAll('&quot;','"').replaceAll('&amp;','&'));
  assert.equal(result.status,'passed',`Stadtübersicht konnte nicht vollständig geprüft werden: ${JSON.stringify(result)}`);
  assert.equal(result.backgroundSrc,'ui/city.png');
  assert.equal(result.backgroundComplete,true,'Der Stadt-Hintergrund wurde im Browser nicht vollständig geladen.');
  assert.deepEqual(result.backgroundSize,[256,465],'Der Stadt-Hintergrund wird nicht als 256x465-PNG geladen.');
  assert.equal(result.cityOwner,'angular');
  assert.equal(result.baseShellActive,true,'Die Übersicht aktiviert den Stadtmodus der Shell nicht.');
  assert.equal(result.baseNavDisplay,'none','Die alte untere Hauptnavigation bleibt auf der Stadtübersicht sichtbar.');
  assert.equal(result.oldDashboardPresent,false,'Das alte Übersichts-Dashboard ist unter der Stadtkarte noch vorhanden.');
  assert.equal(result.team1Disabled,false,'Das vorhandene Startteam ist auf der Stadtkarte deaktiviert.');
  for (const [id,enabled] of Object.entries(result.enabledStates)) assert.equal(enabled,true,`${id} ist trotz vorhandener Mechanik nicht aktiv.`);
  for (const [id,disabled] of Object.entries(result.disabledStates)) assert.equal(disabled,true,`${id} ist trotz fehlender Freischaltung/Mechanik aktiv.`);
  assert.equal(result.rosterOpened,true,'Der Kader-Button öffnet nicht die bestehende Kaderseite.');
  assert.equal(result.subpageShellActive,false,'Der Stadtmodus bleibt auf einer Unterseite aktiv.');
  assert.equal(result.subpageNavVisible,true,'Die bestehende Hauptnavigation erscheint auf Unterseiten nicht wieder.');
  assert.equal(result.missionsOpened,true,'Der Missionsbutton öffnet nicht den bestehenden Missionsdialog.');
  assert.equal(result.teamOpened,true,'Team 1 öffnet nicht das bestehende Team-/Dungeonfenster.');

  console.log('Stadtübersicht-Browserregression: Hintergrund, aktive/deaktivierte Stadtbuttons, Kader, Missionen, Team 1 und Shell-Umschaltung funktionieren.');
} finally {
  rmSync(browserProfile,{recursive:true,force:true});
  await new Promise(resolveClose=>server.close(resolveClose));
}
