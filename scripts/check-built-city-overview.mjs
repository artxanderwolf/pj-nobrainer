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
        const initial=JSON.parse(localStorage.getItem('nobrainer_save_v1')||'{}');
        result.saveUnchanged=initial.state?.cityLayout?.buildings?.length===6;
        result.goldBefore=initial.state?.gold;
        result.paidBefore=initial.state?.cityEconomy?.paidExpansions ?? 0;
        result.initialBuildings=initial.state?.cityLayout?.buildings;
        window.go('base');
        phase=5;
        return;
      }

      if(phase===5) {
        if(!active('base')) return;
        const toggle=document.querySelector('[data-city-move-toggle]');
        if(!toggle) throw new Error('S09 Verschiebemodus-Schaltfläche fehlt.');
        toggle.click();
        const select=document.getElementById('cityMoveBuildingSelect');
        if(!(select instanceof HTMLSelectElement))throw new Error('S09 Gebäude-Auswahl fehlt.');
        result.moveModeReady=!!document.querySelector('[data-city-target-x="4"][data-city-target-y="0"]');
        select.value='building-3';
        select.dispatchEvent(new Event('change',{bubbles:true}));
        phase=6;
        return;
      }

      if(phase===6) {
        const invalidCell=document.querySelector('[data-city-target-x="4"][data-city-target-y="0"]');
        if(!invalidCell)return;
        invalidCell.click();
        phase=7;
        return;
      }

      if(phase===7) {
        const unchanged=JSON.parse(localStorage.getItem('nobrainer_save_v1')||'{}').state?.cityLayout;
        result.invalidMoveUnchanged=JSON.stringify(unchanged?.buildings)===JSON.stringify(result.initialBuildings);
        result.invalidMoveMessage=document.querySelector('.city-placement-notice')?.textContent?.trim()||'';
        const target=document.querySelector('[data-city-target-x="8"][data-city-target-y="2"]');
        if(!target) throw new Error('S09 gültiges Zielfeld fehlt.');
        target.click();
        phase=8;
        return;
      }

      if(phase===8) {
        const snapshot=JSON.parse(localStorage.getItem('nobrainer_save_v1')||'{}');
        const forge=snapshot.state?.cityLayout?.buildings?.find(b=>b.buildingInstanceId==='building-3');
        result.movedForge=[forge?.x,forge?.y];
        result.movedJobFieldsStable=forge?.buildingInstanceId===result.initialBuildings?.[2]?.buildingInstanceId &&
          forge?.unitSlots===result.initialBuildings?.[2]?.unitSlots &&
          forge?.activeJobId===result.initialBuildings?.[2]?.activeJobId;
        result.goldAfterMove=snapshot.state?.gold;
        for(const direction of ['left','right','up','down']){
          const button=document.querySelector('[data-city-expand="'+direction+'"]');
          if(!button)throw new Error('S09 Erweiterungsrichtung fehlt: '+direction);
          button.click();
        }
        phase=9;
        return;
      }

      if(phase===9) {
        const snapshot=JSON.parse(localStorage.getItem('nobrainer_save_v1')||'{}');
        const layout=snapshot.state?.cityLayout;
        result.gridAfterExpand=layout?.grid;
        result.goldAfterExpand=snapshot.state?.gold;
        result.paidAfter=snapshot.state?.cityEconomy?.paidExpansions ?? 0;
        result.saveVersion=snapshot.saveVersion;
        result.buildingsAfterExpand=layout?.buildings?.map(b=>b.buildingInstanceId);
        result.moveStillSaved=layout?.buildings?.find(b=>b.buildingInstanceId==='building-3')?.y===2;
        result.noConstructionStarted=layout?.buildings?.length===6;
        result.cellCount=document.querySelectorAll('.city-placement-cell').length;
        result.finalNotice=document.querySelector('.city-placement-notice')?.textContent?.trim()||'';
        const buildToggle=document.querySelector('[data-city-build-toggle]');
        result.buildTogglePresent=buildToggle instanceof HTMLButtonElement;
        buildToggle?.click();
        result.buildSelectPresent=document.querySelector('[data-city-build-select]') instanceof HTMLSelectElement;
        result.build30MinutesShown=Boolean(document.querySelector('.city-placement-tools')?.textContent?.includes('30 Minuten'));
        const beforeBuild=JSON.parse(localStorage.getItem('nobrainer_save_v1')||'{}');
        const buildCell=document.querySelector('[data-city-target-x="2"][data-city-target-y="0"]');
        if(!buildCell)throw new Error('S11 Baumodus muss ein freies Zielfeld anbieten.');
        buildCell.click();
        const afterBuild=JSON.parse(localStorage.getItem('nobrainer_save_v1')||'{}');
        result.buildNoNickelRejected=beforeBuild.state?.gold===afterBuild.state?.gold &&
          beforeBuild.state?.cityLayout?.buildings?.length===afterBuild.state?.cityLayout?.buildings?.length &&
          /Nicht genügend Nickel/.test(document.querySelector('.city-placement-notice')?.textContent||'');
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
  assert.equal(result.builderDisabled,true,'Bauhütte hat keinen eigenen Seitenzugang; Bauaufträge starten im Baumodus.');
  assert.match(result.builderExplanation,/Baumeister/);
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
  assert.equal(result.moveModeReady,true,'Verschiebemodus muss für alle Zielfelder bedienbar sein.');
  assert.equal(result.invalidMoveUnchanged,true,'Kollision darf weder State noch Save verändern.');
  assert.match(result.invalidMoveMessage,/belegt/, 'Ungültiges Zielfeld benötigt verständliche Rückmeldung.');
  assert.deepEqual(result.movedForge,[8,2], 'Die Schmiede muss auf das freie Zielfeld verschoben und gespeichert sein.');
  assert.equal(result.movedJobFieldsStable,true, 'Gebäude-ID, Plätze und Auftragsbezug müssen beim Move erhalten bleiben.');
  assert.equal(result.goldAfterMove,result.goldBefore,'Kostenloses Verschieben darf keinen Nickel abziehen.');
  const purchases = result.paidAfter - result.paidBefore;
  const expectedCost = Array.from({ length: purchases }, (_, i) =>
    Math.round(30_000 * 1.5 ** (result.paidBefore + i))).reduce((a,b)=>a+b,0);
  assert.equal(result.goldAfterExpand,result.goldBefore-expectedCost,'Erweiterungen dürfen Nickel nur einmal abziehen.');
  assert.ok(purchases>=0 && purchases<=4,'Keine unautorisierte Stadterweiterung.');
  assert.equal(result.gridAfterExpand.width,12+4*Math.min(purchases,2));
  assert.equal(result.gridAfterExpand.height,8+4*Math.max(0,purchases-2));
  assert.equal(result.saveVersion,23,'S14 verwendet Save23.');
  assert.deepEqual(result.buildingsAfterExpand,result.buildingIds,'Alle Gebäude-IDs müssen identisch bleiben.');
  assert.equal(result.moveStillSaved,true,'Die verschobene Position muss auch nach Erweiterungen persistiert bleiben.');
  assert.equal(result.noConstructionStarted,true,'S09 darf keine kostenlosen zusätzlichen Gebäude bauen.');
  assert.equal(result.cellCount,result.gridAfterExpand.width*result.gridAfterExpand.height,'Zielfeld-Overlay wächst mit.');
  if(purchases>0) assert.match(result.finalNotice,/erweitert/,'Kostenpflichtige Erweiterung muss bestätigt werden.');
  assert.equal(result.buildTogglePresent,true,'S11 benötigt einen sichtbaren Baumodus.');
  assert.equal(result.buildSelectPresent,true,'S11 benötigt eine Gebäudetyp-Auswahl.');
  assert.equal(result.build30MinutesShown,true,'S11 zeigt 30 Minuten Bauzeit an.');
  assert.equal(result.buildNoNickelRejected,true,'S11 darf ohne Nickel weder bauen noch abbuchen.');

  console.log('S09-Stadt-Browserregression: sechs Gebäude-IDs, alle Navigationsziele, Kollisionsablehnung, kostenloser persistenter Gebäude-Move und S10-Kaufprüfung erfolgreich.');
} finally {
  rmSync(browserProfile,{recursive:true,force:true});
  await new Promise(resolveClose=>server.close(resolveClose));
}
