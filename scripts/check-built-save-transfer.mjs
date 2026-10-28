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
assert.ok(browser, 'Chrome/Chromium wurde für den Spielstandtransfer-E2E-Test nicht gefunden.');

const errorScript = `<script>
window.__saveTransferErrors=[];
window.addEventListener('error',event=>window.__saveTransferErrors.push(String(event.error?.stack||event.message||event.error||'error')));
window.addEventListener('unhandledrejection',event=>window.__saveTransferErrors.push(String(event.reason?.stack||event.reason||'rejection')));
window.confirm=()=>true;
</script>`;

const probeScript = `<script>
(() => {
  const SAVE_KEY='nobrainer_save_v1';
  const BACKUP_KEY='nobrainer_save_import_backup_v1';
  const PHASE_KEY='__nobrainer_save_transfer_phase';
  const FIRST_KEY='__nobrainer_save_transfer_first';
  const SECOND_KEY='__nobrainer_save_transfer_second';
  const ORIGINAL_GOLD_KEY='__nobrainer_save_transfer_original_gold';
  const IMPORTED_GOLD_KEY='__nobrainer_save_transfer_imported_gold';
  const normalize=value=>String(value||'').replace(/\\s+/g,' ').trim();
  const finish=result=>{
    if(document.getElementById('saveTransferE2EResult'))return;
    const node=document.createElement('pre');
    node.id='saveTransferE2EResult';
    node.textContent=JSON.stringify({
      ...result,
      runtimeError:document.querySelector('.legacy-host')?.getAttribute('data-runtime-error')||'',
      browserErrors:Array.isArray(window.__saveTransferErrors)?window.__saveTransferErrors:[]
    });
    document.body.appendChild(node);
  };
  const assignFile=(input,file)=>{
    const transfer=new DataTransfer();
    transfer.items.add(file);
    input.files=transfer.files;
    input.dispatchEvent(new Event('change',{bubbles:true}));
  };
  const openSaveTab=()=>{
    document.querySelector('.help-btn')?.click();
    document.getElementById('indexSaveTab')?.click();
  };
  const started=Date.now();
  const timer=setInterval(()=>{
    const saveBtn=document.getElementById('saveTransferSaveBtn');
    const exportBtn=document.getElementById('saveTransferExportBtn');
    const importBtn=document.getElementById('saveTransferImportBtn');
    const input=document.getElementById('saveTransferImportInput');
    const undoBtn=document.getElementById('saveTransferUndoBtn');
    if(!(saveBtn&&exportBtn&&importBtn&&input&&undoBtn)){
      if(Date.now()-started>8000){clearInterval(timer);finish({status:'runtime-not-ready',phase:localStorage.getItem(PHASE_KEY)||'start'});}
      return;
    }
    clearInterval(timer);
    const phase=localStorage.getItem(PHASE_KEY)||'start';

    if(phase==='start'){
      openSaveTab();
      const infoPanel=document.getElementById('indexInfoPanel');
      const savePanel=document.getElementById('indexSavePanel');
      const ui={
        infoTab:normalize(document.getElementById('indexInfoTab')?.textContent),
        saveTab:normalize(document.getElementById('indexSaveTab')?.textContent),
        infoHidden:Boolean(infoPanel?.hidden),
        saveHidden:Boolean(savePanel?.hidden),
        infoDisplay:infoPanel?getComputedStyle(infoPanel).display:'missing',
        saveDisplay:savePanel?getComputedStyle(savePanel).display:'missing',
        saveLabel:normalize(saveBtn.textContent),
        exportLabel:normalize(exportBtn.textContent),
        importLabel:normalize(importBtn.textContent),
        accept:input.getAttribute('accept')||''
      };
      document.getElementById('indexInfoTab')?.click();
      ui.infoDisplayAfterInfoClick=infoPanel?getComputedStyle(infoPanel).display:'missing';
      ui.saveDisplayAfterInfoClick=savePanel?getComputedStyle(savePanel).display:'missing';
      document.getElementById('indexSaveTab')?.click();
      ui.infoDisplayAfterSaveClick=infoPanel?getComputedStyle(infoPanel).display:'missing';
      ui.saveDisplayAfterSaveClick=savePanel?getComputedStyle(savePanel).display:'missing';
      saveBtn.click();
      setTimeout(()=>{
        exportBtn.click();
        setTimeout(()=>{
          const exportStatus=normalize(document.getElementById('saveTransferStatus')?.textContent);
          const baseline=localStorage.getItem(SAVE_KEY);
          if(!baseline){finish({status:'missing-baseline',ui,exportStatus});return;}
          const original=JSON.parse(baseline);
          const originalGold=Number(original.state?.gold||0);
          const invalidFile=new File(['{\\"saveVersion\\":14}'],'ungueltig.json',{type:'application/json'});
          assignFile(input,invalidFile);
          setTimeout(()=>{
            const invalidStatus=normalize(document.getElementById('saveTransferStatus')?.textContent);
            // A scheduled normal save may update timestamps while File.text() resolves.
            // Compare all persisted gameplay data, excluding only those two clocks.
            const gameplaySnapshot=raw=>{
              const save=JSON.parse(raw);
              delete save.savedAt;
              if(save.state)delete save.state.lastEnergyUpdate;
              return JSON.stringify(save);
            };
            const unchangedAfterInvalid=gameplaySnapshot(localStorage.getItem(SAVE_KEY))===gameplaySnapshot(baseline);
            const imported=JSON.parse(baseline);
            const importedGold=originalGold+12345;
            imported.savedAt=Date.now();
            imported.state.gold=importedGold;
            localStorage.setItem(FIRST_KEY,JSON.stringify({ui,exportStatus,invalidStatus,unchangedAfterInvalid}));
            localStorage.setItem(ORIGINAL_GOLD_KEY,String(originalGold));
            localStorage.setItem(IMPORTED_GOLD_KEY,String(importedGold));
            localStorage.setItem(PHASE_KEY,'imported');
            assignFile(input,new File([JSON.stringify(imported)],'NoBrainer-Test-Spielstand.json',{type:'application/json'}));
          },600);
        },150);
      },100);
      return;
    }

    if(phase==='imported'){
      openSaveTab();
      const current=JSON.parse(localStorage.getItem(SAVE_KEY)||'{}');
      const importedGold=Number(localStorage.getItem(IMPORTED_GOLD_KEY));
      const second={
        importedGold:Number(current.state?.gold),
        expectedImportedGold:importedGold,
        backupExists:localStorage.getItem(BACKUP_KEY)!==null,
        undoEnabled:!undoBtn.disabled
      };
      localStorage.setItem(SECOND_KEY,JSON.stringify(second));
      localStorage.setItem(PHASE_KEY,'restored');
      undoBtn.click();
      return;
    }

    if(phase==='restored'){
      openSaveTab();
      const current=JSON.parse(localStorage.getItem(SAVE_KEY)||'{}');
      const originalGold=Number(localStorage.getItem(ORIGINAL_GOLD_KEY));
      const first=JSON.parse(localStorage.getItem(FIRST_KEY)||'{}');
      const second=JSON.parse(localStorage.getItem(SECOND_KEY)||'{}');
      const result={
        status:'checked',
        first,
        second,
        restoredGold:Number(current.state?.gold),
        expectedOriginalGold:originalGold,
        backupRemoved:localStorage.getItem(BACKUP_KEY)===null
      };
      [PHASE_KEY,FIRST_KEY,SECOND_KEY,ORIGINAL_GOLD_KEY,IMPORTED_GOLD_KEY].forEach(key=>localStorage.removeItem(key));
      finish(result);
      return;
    }

    finish({status:'unknown-phase',phase});
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
    html = html.replace('</head>', `${errorScript}</head>`).replace('</body>', `${probeScript}</body>`);
    body = Buffer.from(html, 'utf8');
  }
  response.writeHead(200, {
    'content-type': contentTypes.get(extname(filePath)) ?? 'application/octet-stream',
    'cache-control': 'no-store'
  });
  response.end(body);
});

const delay = ms => new Promise(resolveDelay => setTimeout(resolveDelay, ms));
async function stopBrowser(child) {
  if (child.exitCode !== null) return;
  child.kill('SIGTERM');
  const closed = await Promise.race([
    new Promise(resolveClose => child.once('close', () => resolveClose(true))),
    delay(1500).then(() => false)
  ]);
  if (!closed && child.exitCode === null) child.kill('SIGKILL');
}

await new Promise((resolveListen, rejectListen) => {
  server.once('error', rejectListen);
  server.listen(0, '127.0.0.1', resolveListen);
});

const browserProfile = mkdtempSync(join(tmpdir(), 'nobrainer-save-transfer-e2e-'));
let child = null;
try {
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const pageUrl = `http://127.0.0.1:${address.port}${basePath}`;
  child = spawn(browser, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=390,844',
    `--user-data-dir=${browserProfile}`,
    '--virtual-time-budget=18000',
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

  assert.equal(code, 0, `Chrome/Chromium beendete den Spielstandtransfer-E2E-Test mit Code ${code}.\n${stderr}`);
  const resultMatch = stdout.match(/<pre id="saveTransferE2EResult">([^<]+)<\/pre>/);
  assert.ok(resultMatch, `Der Spielstandtransfer-E2E-Test hat kein Ergebnis erzeugt.\n${stderr}\nDOM-Ausgabe: ${stdout.slice(-6000)}`);
  const decoded = resultMatch[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&');
  const result = JSON.parse(decoded);

  assert.equal(result.status, 'checked', `Spielstandtransfer wurde nicht vollständig geprüft: ${JSON.stringify(result)}`);
  assert.equal(result.browserErrors.length, 0, `Beim Spielstandtransfer trat ein Browserfehler auf: ${JSON.stringify(result)}`);
  assert.equal(result.runtimeError, '', `Die Runtime meldet beim Spielstandtransfer einen Fehler: ${JSON.stringify(result)}`);
  assert.equal(result.first.ui.infoTab, 'Info');
  assert.equal(result.first.ui.saveTab, 'Spielstand');
  assert.equal(result.first.ui.infoHidden, true, 'Der Info-Inhalt wird beim Wechsel zum Spielstand-Reiter nicht ausgeblendet.');
  assert.equal(result.first.ui.saveHidden, false, 'Der Spielstand-Reiter wird nicht sichtbar.');
  assert.equal(result.first.ui.infoDisplay, 'none', 'Der Info-Inhalt bleibt trotz aktivem Spielstand-Reiter visuell sichtbar.');
  assert.equal(result.first.ui.saveDisplay, 'grid', 'Der Spielstand-Inhalt wird im Spielstand-Reiter nicht tatsächlich dargestellt.');
  assert.equal(result.first.ui.infoDisplayAfterInfoClick, 'grid', 'Der Info-Inhalt wird beim Zurückwechseln nicht sichtbar.');
  assert.equal(result.first.ui.saveDisplayAfterInfoClick, 'none', 'Der Spielstand-Inhalt bleibt beim Info-Reiter sichtbar.');
  assert.equal(result.first.ui.infoDisplayAfterSaveClick, 'none', 'Der Info-Inhalt wird beim erneuten Wechsel zum Spielstand-Reiter nicht ausgeblendet.');
  assert.equal(result.first.ui.saveDisplayAfterSaveClick, 'grid', 'Der Spielstand-Inhalt wird beim erneuten Wechsel nicht sichtbar.');
  assert.equal(result.first.ui.saveLabel, 'Jetzt speichern');
  assert.equal(result.first.ui.exportLabel, 'JSON exportieren');
  assert.equal(result.first.ui.importLabel, 'JSON laden');
  assert.match(result.first.ui.accept, /json/i, 'Die Dateiauswahl ist nicht auf JSON ausgerichtet.');
  assert.match(result.first.exportStatus, /JSON-Datei exportiert:/, 'Der JSON-Export wurde nicht bestätigt.');
  assert.match(result.first.exportStatus, /NoBrainer-Spielstand-v0\.4\.0\.0-/, 'Der Export verwendet nicht den versionierten JSON-Dateinamen.');
  assert.match(result.first.invalidStatus, /kein vollständiger NoBrainer-Spielstand/, 'Eine ungültige JSON-Datei wird nicht verständlich abgelehnt.');
  assert.equal(result.first.unchangedAfterInvalid, true, 'Ein ungültiger Import verändert den lokalen Spielstand.');
  assert.equal(result.second.importedGold, result.second.expectedImportedGold, 'Der gültige JSON-Import wurde nach dem Reload nicht geladen.');
  assert.equal(result.second.backupExists, true, 'Vor dem Import wurde keine automatische Sicherung angelegt.');
  assert.equal(result.second.undoEnabled, true, 'Die Rückgängig-Aktion ist nach dem Import nicht verfügbar.');
  assert.equal(result.restoredGold, result.expectedOriginalGold, 'Rückgängig stellt den vorherigen Spielstand nicht wieder her.');
  assert.equal(result.backupRemoved, true, 'Die verwendete Import-Sicherung bleibt nach erfolgreicher Wiederherstellung liegen.');

  console.log('Spielstandtransfer-E2E: Reiter wechseln sichtbar korrekt; manuelles Speichern, JSON-Export, Importvalidierung, Reload und Import-Rückgängig sind funktionsfähig.');
} finally {
  if (child) await stopBrowser(child);
  rmSync(browserProfile, { recursive: true, force: true });
  await new Promise(resolveClose => server.close(resolveClose));
}
