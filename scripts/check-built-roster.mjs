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
assert.ok(browser, 'Chrome/Chromium wurde für den Kader-E2E-Test nicht gefunden.');

const probeScript = `<script>
window.__rosterModalErrors=[];
window.addEventListener('error',event=>window.__rosterModalErrors.push(String(event.error?.stack||event.message||event.error||'error')));
window.addEventListener('unhandledrejection',event=>window.__rosterModalErrors.push(String(event.reason?.stack||event.reason||'rejection')));
(() => {
  const finish = result => {
    if (document.getElementById('rosterModalE2EResult')) return;
    const node = document.createElement('pre');
    node.id = 'rosterModalE2EResult';
    node.textContent = JSON.stringify({
      ...result,
      runtimeError: document.querySelector('.legacy-host')?.getAttribute('data-runtime-error') || '',
      browserErrors: window.__rosterModalErrors
    });
    document.body.appendChild(node);
  };

  const started = Date.now();
  const timer = setInterval(() => {
    const firstRow = document.querySelector('#rosterCard .roster-list-item');
    const characterNav = document.querySelector('#nav button[data-page="character"]');
    const rosterMenu = document.querySelector('#character .menu-card[onclick*="roster"]');
    if (!firstRow || !characterNav || !rosterMenu) {
      if (Date.now() - started > 5000) { clearInterval(timer); finish({ status: 'roster-not-ready' }); }
      return;
    }

    clearInterval(timer);
    characterNav.click();
    rosterMenu.click();

    const beforeModal = Boolean(document.querySelector('[data-character-modal="roster"]'));
    const smallEmblem = firstRow.querySelector('.class-emblem-small');
    const smallClassId = smallEmblem?.getAttribute('data-class-id') || '';
    const smallComputed = smallEmblem ? getComputedStyle(smallEmblem) : null;
    const smallBackground = smallComputed?.backgroundImage || '';
    const smallBackgroundSize = smallComputed?.backgroundSize || '';
    firstRow.click();

    setTimeout(() => {
      const modal = document.querySelector('[data-character-modal="roster"]');
      const largeEmblem = modal?.querySelector('.class-emblem-large');
      const largeComputed = largeEmblem ? getComputedStyle(largeEmblem) : null;
      const largeBackground = largeComputed?.backgroundImage || '';
      const largeBackgroundSize = largeComputed?.backgroundSize || '';
      const largeRect = largeEmblem?.getBoundingClientRect();
      const largeWidth = largeRect?.width || 0;
      const largeHeight = largeRect?.height || 0;
      const largeClassId = largeEmblem?.getAttribute('data-class-id') || '';

      modal?.querySelector('[data-roster-action="edit-name"]')?.click();
      const input = document.querySelector('[data-roster-name-input]');
      const oldName = input?.value || '';
      if (input) input.value = oldName + ' Test';
      document.querySelector('[data-roster-action="save-name"]')?.click();

      document.querySelector('[data-roster-action="stat-page-next"]')?.click();
      const statPageText = document.querySelector('.roster-stat-pagination span')?.textContent?.trim() || '';

      document.querySelector('.roster-equipment-slot[data-hand="leftHand"]')?.click();
      const pickerOpened = Boolean(document.querySelector('.roster-weapon-picker'));
      document.querySelector('.roster-equipment-slot[data-hand="leftHand"]')?.click();

      setTimeout(() => {
        const modalAfterTick = Boolean(document.querySelector('[data-character-modal="roster"]'));
        const statPageAfterTick = document.querySelector('.roster-stat-pagination span')?.textContent?.trim() || '';
        document.querySelector('[data-character-modal="roster"] .character-modal-close')?.click();
        const modalAfterClose = Boolean(document.querySelector('[data-character-modal="roster"]'));
        const listName = document.querySelector('#rosterCard .roster-list-item .character-list-copy strong')?.textContent?.trim() || '';
        finish({
          status: 'tested', beforeModal, smallClassId, largeClassId,
          smallBackground, smallBackgroundSize, largeBackground, largeBackgroundSize,
          largeWidth, largeHeight,
          renamed: listName === oldName + ' Test',
          statPageText, pickerOpened, modalAfterTick, statPageAfterTick, modalAfterClose
        });
      }, 700);
    }, 50);
  }, 50);
})();
</script>`;

const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.js', 'application/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'], ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'], ['.png', 'image/png'], ['.ico', 'image/x-icon']
]);
const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1');
  if (!url.pathname.startsWith(basePath)) { response.writeHead(404).end('Not found'); return; }
  let relativePath = decodeURIComponent(url.pathname.slice(basePath.length));
  if (!relativePath) relativePath = 'index.html';
  const safePath = normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
  const filePath = join(distRoot, safePath);
  if (!existsSync(filePath)) { response.writeHead(404).end('Not found'); return; }
  let body = readFileSync(filePath);
  if (safePath === 'index.html') body = Buffer.from(body.toString('utf8').replace('</body>', `${probeScript}</body>`), 'utf8');
  response.writeHead(200, { 'content-type': contentTypes.get(extname(filePath)) ?? 'application/octet-stream', 'cache-control': 'no-store' });
  response.end(body);
});

const delay = ms => new Promise(resolveDelay => setTimeout(resolveDelay, ms));
async function stopBrowser(child) {
  if (child.exitCode !== null) return;
  child.kill('SIGTERM');
  const closed = await Promise.race([new Promise(resolveClose => child.once('close', () => resolveClose(true))), delay(1500).then(() => false)]);
  if (!closed && child.exitCode === null) child.kill('SIGKILL');
}

await new Promise((resolveListen, rejectListen) => { server.once('error', rejectListen); server.listen(0, '127.0.0.1', resolveListen); });
const browserProfile = mkdtempSync(join(tmpdir(), 'nobrainer-roster-modal-e2e-'));
let child = null;
try {
  const address = server.address(); assert.ok(address && typeof address === 'object');
  const pageUrl = `http://127.0.0.1:${address.port}${basePath}`;
  child = spawn(browser, ['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--hide-scrollbars','--no-first-run','--no-default-browser-check',`--user-data-dir=${browserProfile}`,'--virtual-time-budget=8000','--dump-dom',pageUrl], { stdio: ['ignore','pipe','pipe'] });
  child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
  let stdout = '', stderr = '';
  child.stdout.on('data', chunk => { stdout += chunk; }); child.stderr.on('data', chunk => { stderr += chunk; });
  const code = await new Promise((resolveClose, rejectClose) => { child.once('error', rejectClose); child.once('close', resolveClose); });
  assert.equal(code, 0, `Chrome/Chromium beendete den Kader-E2E-Test mit Code ${code}.\n${stderr}`);
  const match = stdout.match(/<pre id="rosterModalE2EResult">([^<]+)<\/pre>/);
  assert.ok(match, `Der Kader-E2E-Test hat kein Ergebnis erzeugt.\n${stderr}\nDOM-Ausgabe: ${stdout.slice(-7000)}`);
  const result = JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&'));
  assert.equal(result.status, 'tested', JSON.stringify(result));
  assert.equal(result.browserErrors.length, 0, `Browserfehler: ${JSON.stringify(result)}`);
  assert.equal(result.runtimeError, '', `Runtimefehler: ${JSON.stringify(result)}`);
  assert.equal(result.beforeModal, false, 'Die Kaderseite darf vor der Auswahl kein Detailmodal enthalten.');
  assert.ok(result.smallClassId && result.smallClassId === result.largeClassId, 'Kleines und großes Klassenasset gehören nicht zur selben stabilen Klassen-ID.');
  assert.notEqual(result.smallBackground, 'none', 'Das kleine Klassenbild wurde nicht geladen.');
  assert.notEqual(result.largeBackground, 'none', 'Das große Klassenbild wurde nicht geladen.');
  assert.equal(result.smallBackgroundSize, 'contain', 'Das kleine Klassenbild wird nicht vollständig skaliert.');
  assert.equal(result.largeBackgroundSize, 'contain', 'Das große Klassenbild wird nicht vollständig skaliert.');
  assert.ok(result.largeWidth >= 120 && result.largeHeight >= 120, `Das große Klassenbild ist abgeschnitten oder kollabiert: ${JSON.stringify(result)}`);
  assert.equal(result.renamed, true, 'Umbenennen im Charaktermodal aktualisiert die Kaderliste nicht.');
  assert.equal(result.statPageText, 'Seite 2 / 2', 'Die zweite Werteseite lässt sich im Modal nicht öffnen.');
  assert.equal(result.pickerOpened, true, 'Der Ausrüstungs-Picker öffnet sich im Charaktermodal nicht.');
  assert.equal(result.modalAfterTick, true, 'Das Charaktermodal wird vom Runtime-Tick unerwartet geschlossen.');
  assert.equal(result.statPageAfterTick, 'Seite 2 / 2', 'Der Runtime-Tick setzt die Werteseite zurück.');
  assert.equal(result.modalAfterClose, false, 'Das Charaktermodal lässt sich nicht schließen.');
  console.log('Kader-Browserregression: reine Listenseite, vollständige Einzelassets und separates Detailmodal mit Rename, Ausrüstung und Werteseiten funktionieren im echten Angular-Build.');
} finally {
  if (child) await stopBrowser(child);
  rmSync(browserProfile, { recursive: true, force: true });
  await new Promise(resolveClose => server.close(resolveClose));
}
