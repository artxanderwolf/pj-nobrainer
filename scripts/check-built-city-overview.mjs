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
  const result = { openedPages: {}, errors: [] };
  let phase = 0;
  let route = 0;
  let currentRoute = null;
  const targets = [
    { id: 'cityBuilding-building-1', page: 'roster' },
    { id: 'cityBuilding-building-2', page: 'tavern' },
    { id: 'cityBuilding-building-3', page: 'forge' },
    { id: 'cityBuilding-building-4', page: 'market' },
    { id: 'cityAction-dungeon', page: 'dungeon' },
    { id: 'cityAction-materials', page: 'storage-materials' },
    { id: 'cityAction-weapons', page: 'storage-weapons' }
  ];
  const finish = payload => {
    if(document.getElementById('cityOverviewResult')) return;
    const node=document.createElement('pre');
    node.id='cityOverviewResult';
    node.textContent=JSON.stringify(payload);
    document.body.appendChild(node);
  };
  const active = id => document.getElementById(id)?.classList.contains('active') === true;
  const timer=setInterval(() => {
    try {
      const city=document.getElementById('cityOverview');
      const grid=document.getElementById('cityGrid');
      const viewport=document.querySelector('.city-grid-viewport');
      const shell=document.querySelector('.modular-ui');
      const nav=document.getElementById('nav');
      const buildings=Array.from(document.querySelectorAll('[data-city-building-id]'));
      if(!(city&&grid&&viewport&&shell&&nav&&buildings.length===6)) return;

      if(phase===0) {
        result.cityOwner=city.dataset.cityOverviewOwner;
        result.grid=[Number(grid.dataset.gridWidth),Number(grid.dataset.gridHeight)];
        result.buildingIds=buildings.map(b=>b.dataset.cityBuildingId);
        result.buildingTypes=buildings.map(b=>b.dataset.cityBuildingType);
        result.coords=buildings.map(b=>[getComputedStyle(b).gridColumnStart,getComputedStyle(b).gridRowStart]);
        result.assetKeys=buildings.map(b=>b.dataset.cityAssetKey);
        result.builderDisabled=document.getElementById('cityBuilding-building-6')?.disabled;
        result.builderExplanation=document.getElementById('cityBuilding-building-6')?.title;
        result.quickLabels=Array.from(document.querySelectorAll('button[data-city-quick-id]')).map(b=>b.textContent?.trim());
        result.backgroundAbsent=!document.getElementById('cityOverviewBackground');
        result.legacyHotspotAbsent=!document.querySelector('.city-map-action');
        result.oldDashboardPresent=Boolean(document.querySelector('#base .dashboard-menu'));
        result.baseShellActive=shell.classList.contains('city-overview-active');
        result.baseNavDisplay=getComputedStyle(nav).display;
        result.scrollArea=[viewport.scrollWidth,viewport.clientWidth];
        viewport.scrollLeft=viewport.scrollWidth;
        result.canScroll=viewport.scrollWidth<=viewport.clientWidth+2 || viewport.scrollLeft>0;
        phase=1;
        return;
      }

      if(phase===1) {
        if(!active('base')) return;
        if(route<targets.length) {
          currentRoute=targets[route];
          const button=document.getElementById(currentRoute.id);
          if(!button || button.disabled) throw new Error('Navigation missing: '+currentRoute.id);
          button.click();
          phase=2;
          return;
        }
        document.getElementById('cityAction-missions')?.click();
        phase=3;
        return;
      }

      if(phase===2) {
        if(!active(currentRoute.page)) return;
        result.openedPages[currentRoute.id]=true;
        result.subpageShellActive=shell.classList.contains('city-overview-active');
        result.subpageNavVisible=getComputedStyle(nav).display!=='none';
        window.go('base');
        route++;
        phase=1;
        return;
      }

      if(phase===3) {
        const dialog=document.getElementById('missionDialog');
        if(!dialog?.open) return;
        result.missionsOpened=true;
        dialog.close();
        document.getElementById('cityBuilding-building-5')?.click();
        phase=4;
        return;
      }

      if(phase===4) {
        const dungeon=document.getElementById('dungeon');
        const modal=document.getElementById('dungeon-select');
        if(!dungeon?.classList.contains('active')||!modal||modal.hidden) return;
        result.teamOpened=modal.dataset.teamId==='1'&&modal.getAttribute('aria-hidden')==='false';
        result.saveUnchanged=JSON.parse(localStorage.getItem('nobrainer_save_v1')||'{}').state?.cityLayout?.buildings?.length===6;
        clearInterval(timer);
        finish({ status:'passed', ...result });
      }
    } catch(error) {
      clearInterval(timer);
      finish({status:'error',message:String(error?.stack||error),...result});
    }
  },50);
})();
`;

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
  assert.equal(result.cityOwner, 'angular', 'Die Stadt muss weiterhin Angular-eigen sein.');
  assert.deepEqual(result.grid, [12,8], 'Die angezeigte Stadt braucht das persistierte 12x8-Raster.');
  assert.deepEqual(result.buildingIds,['building-1','building-2','building-3','building-4','building-5','building-6']);
  assert.deepEqual(result.buildingTypes,['roster','tavern','forge','market','team','builder']);
  assert.deepEqual(result.coords,[['1','1'],['5','1'],['9','1'],['1','5'],['5','5'],['9','5']],
    'Gebäude müssen die S07-Rasterkoordinaten verwenden.');
  assert.equal(result.assetKeys.length,6);
  assert.ok(result.assetKeys.every(key=>key?.startsWith('city.building.')));
  assert.equal(result.builderDisabled,true,'Bauhütte darf vor S11 keine echten Bauaufträge starten.');
  assert.match(result.builderExplanation,/S11/);
  assert.deepEqual(result.quickLabels,['⚔️Dungeonweg','🪵Materiallager','🗡️Waffenlager','📜Missionen']);
  assert.equal(result.backgroundAbsent,true,'Die starre alte Stadtkarte darf nicht zweite Pflichtansicht bleiben.');
  assert.equal(result.legacyHotspotAbsent,true,'Alte Prozent-Hotspots dürfen nicht weiter benutzt werden.');
  assert.equal(result.oldDashboardPresent,false);
  assert.equal(result.baseShellActive,true);
  assert.equal(result.baseNavDisplay,'none');
  assert.equal(result.canScroll,true,'Die 12-Spalten-Stadt muss auf schmalem Bildschirm horizontal bedienbar sein.');
  assert.equal(Object.keys(result.openedPages).length,7,'Alle sieben Stadt-/Lager-/Dungeon-Navigationen müssen funktionieren.');
  assert.ok(Object.values(result.openedPages).every(Boolean));
  assert.equal(result.subpageShellActive,false,'Der Stadtmodus muss auf Unterseiten enden.');
  assert.equal(result.subpageNavVisible,true,'Die bisherige Hauptnavigation muss auf Unterseiten erhalten bleiben.');
  assert.equal(result.missionsOpened,true,'Missionen müssen über die Stadt geöffnet werden.');
  assert.equal(result.teamOpened,true,'Team 1 muss die richtige Teamansicht öffnen.');
  assert.equal(result.saveUnchanged,true,'Reine Stadtanzeige darf keine Gebäudedaten verlieren.');

  console.log('S08-Stadt-Browserregression: 12x8-Raster aus Save18, sechs persistierte Gebäude-IDs, mobile Scrollbarkeit, sieben Ziele, Missionen, Team1 und Navigation erfolgreich.');
} finally {
  rmSync(browserProfile,{recursive:true,force:true});
  await new Promise(resolveClose=>server.close(resolveClose));
}
