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
assert.ok(browser, 'Chrome/Chromium wurde für den Rekrutierungs-E2E-Test nicht gefunden.');

const fixture = JSON.stringify({
  saveVersion: 13,
  savedAt: Date.now(),
  state: {
    gold: 100000,
    upgrades: { innCapacity: 4 }
  }
});

const seedScript = `<script>localStorage.setItem(${JSON.stringify(saveKey)},${JSON.stringify(fixture)});</script>`;

const probeScript = `<script>
window.__tavernModalErrors=[];
window.addEventListener('error',event=>window.__tavernModalErrors.push(String(event.error?.stack||event.message||event.error||'error')));
window.addEventListener('unhandledrejection',event=>window.__tavernModalErrors.push(String(event.reason?.stack||event.reason||'rejection')));
(() => {
  const finish = result => {
    if (document.getElementById('tavernModalE2EResult')) return;
    const node = document.createElement('pre');
    node.id = 'tavernModalE2EResult';
    node.textContent = JSON.stringify({
      ...result,
      runtimeError: document.querySelector('.legacy-host')?.getAttribute('data-runtime-error') || '',
      browserErrors: window.__tavernModalErrors
    });
    document.body.appendChild(node);
  };

  const started = Date.now();
  const timer = setInterval(() => {
    const firstOffer = document.querySelector('#tavernOffer .recruitment-list-item');
    const characterNav = document.querySelector('#nav button[data-page="character"]');
    const recruitMenu = document.querySelector('#character .menu-card[onclick*="tavern"]');
    if (!firstOffer || !characterNav || !recruitMenu) {
      if (Date.now() - started > 5000) { clearInterval(timer); finish({ status: 'tavern-not-ready' }); }
      return;
    }

    clearInterval(timer);
    characterNav.click();
    recruitMenu.click();

    const currentOffer = document.querySelector('#tavernOffer .recruitment-list-item');
    if (!currentOffer) { finish({ status: 'offer-missing-after-navigation' }); return; }
    const beforeModal = Boolean(document.querySelector('[data-character-modal="recruitment"]'));
    const smallEmblem = currentOffer.querySelector('.class-emblem-small');
    const smallClassId = smallEmblem?.getAttribute('data-class-id') || '';
    const smallComputed = smallEmblem ? getComputedStyle(smallEmblem) : null;
    const smallBackground = smallComputed?.backgroundImage || '';
    const smallBackgroundSize = smallComputed?.backgroundSize || '';
    const rosterCountBefore = document.querySelectorAll('#rosterCard .roster-list-item').length;
    const goldBefore = document.querySelector('#gold')?.textContent?.trim() || '';
    currentOffer.click();

    setTimeout(() => {
      const modal = document.querySelector('[data-character-modal="recruitment"]');
      const largeEmblem = modal?.querySelector('.class-emblem-large');
      const largeComputed = largeEmblem ? getComputedStyle(largeEmblem) : null;
      const largeBackground = largeComputed?.backgroundImage || '';
      const largeBackgroundSize = largeComputed?.backgroundSize || '';
      const largeRect = largeEmblem?.getBoundingClientRect();
      const largeWidth = largeRect?.width || 0;
      const largeHeight = largeRect?.height || 0;
      const largeClassId = largeEmblem?.getAttribute('data-class-id') || '';
      const recruitButton = modal?.querySelector('[data-tavern-action="recruit"]');
      const hasLegacyOnclick = Boolean(recruitButton?.getAttribute('onclick'));
      const recruitEnabled = Boolean(recruitButton && !recruitButton.disabled);
      recruitButton?.click();

      setTimeout(() => {
        const modalAfterRecruit = Boolean(document.querySelector('[data-character-modal="recruitment"]'));
        const rosterCountAfter = document.querySelectorAll('#rosterCard .roster-list-item').length;
        const goldAfter = document.querySelector('#gold')?.textContent?.trim() || '';
        finish({
          status: 'tested', beforeModal, smallClassId, largeClassId,
          smallBackground, smallBackgroundSize, largeBackground, largeBackgroundSize,
          largeWidth, largeHeight,
          hasLegacyOnclick, recruitEnabled, modalAfterRecruit,
          rosterCountBefore, rosterCountAfter, goldBefore, goldAfter
        });
      }, 100);
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
  if (safePath === 'index.html') {
    let html = body.toString('utf8');
    html = html.replace('</head>', `${seedScript}</head>`).replace('</body>', `${probeScript}</body>`);
    body = Buffer.from(html, 'utf8');
  }
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
const browserProfile = mkdtempSync(join(tmpdir(), 'nobrainer-tavern-modal-e2e-'));
let child = null;
try {
  const address = server.address(); assert.ok(address && typeof address === 'object');
  const pageUrl = `http://127.0.0.1:${address.port}${basePath}`;
  child = spawn(browser, ['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--hide-scrollbars','--no-first-run','--no-default-browser-check',`--user-data-dir=${browserProfile}`,'--virtual-time-budget=8000','--dump-dom',pageUrl], { stdio: ['ignore','pipe','pipe'] });
  child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
  let stdout = '', stderr = '';
  child.stdout.on('data', chunk => { stdout += chunk; }); child.stderr.on('data', chunk => { stderr += chunk; });
  const code = await new Promise((resolveClose, rejectClose) => { child.once('error', rejectClose); child.once('close', resolveClose); });
  assert.equal(code, 0, `Chrome/Chromium beendete den Rekrutierungs-E2E-Test mit Code ${code}.\n${stderr}`);
  const match = stdout.match(/<pre id="tavernModalE2EResult">([^<]+)<\/pre>/);
  assert.ok(match, `Der Rekrutierungs-E2E-Test hat kein Ergebnis erzeugt.\n${stderr}\nDOM-Ausgabe: ${stdout.slice(-7000)}`);
  const result = JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&'));
  assert.equal(result.status, 'tested', JSON.stringify(result));
  assert.equal(result.browserErrors.length, 0, `Browserfehler: ${JSON.stringify(result)}`);
  assert.equal(result.runtimeError, '', `Runtimefehler: ${JSON.stringify(result)}`);
  assert.equal(result.beforeModal, false, 'Die Rekrutierungsseite darf vor der Auswahl kein Detailmodal enthalten.');
  assert.ok(result.smallClassId && result.smallClassId === result.largeClassId, 'Kleines und großes Rekrutierungsasset gehören nicht zur selben Klassen-ID.');
  assert.notEqual(result.smallBackground, 'none', 'Das kleine Rekrutierungs-Klassenbild wurde nicht geladen.');
  assert.notEqual(result.largeBackground, 'none', 'Das große Rekrutierungs-Klassenbild wurde nicht geladen.');
  assert.equal(result.smallBackgroundSize, 'contain');
  assert.equal(result.largeBackgroundSize, 'contain');
  assert.ok(result.largeWidth >= 120 && result.largeHeight >= 120, `Das große Rekrutierungsbild ist abgeschnitten oder kollabiert: ${JSON.stringify(result)}`);
  assert.equal(result.hasLegacyOnclick, false, 'Das Rekrutierungsmodal hängt noch an einem Legacy-onclick.');
  assert.equal(result.recruitEnabled, true, 'Rekrutierung ist trotz Test-Fixture mit genügend Geld und freiem Kaderplatz deaktiviert.');
  assert.equal(result.modalAfterRecruit, false, 'Das Rekrutierungsmodal bleibt nach erfolgreichem Anwerben offen.');
  assert.equal(result.rosterCountAfter, result.rosterCountBefore + 1, 'Erfolgreiches Anwerben aktualisiert den Kader nicht.');
  assert.notEqual(result.goldAfter, result.goldBefore, 'Erfolgreiches Anwerben aktualisiert die Geldanzeige nicht.');
  console.log('Rekrutierungs-Browserregression: Listenansicht und separates Detailmodal verwenden vollständige Klassenassets; Anwerben läuft direkt über Angular und aktualisiert Kader sowie Geld.');
} finally {
  if (child) await stopBrowser(child);
  rmSync(browserProfile, { recursive: true, force: true });
  await new Promise(resolveClose => server.close(resolveClose));
}
