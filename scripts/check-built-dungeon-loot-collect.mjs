import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, normalize, resolve } from 'node:path';

const distRoot = resolve('dist/nobrainer/browser');
const basePath = '/pj-nobrainer/';
const saveKey = 'nobrainer_save_v1';
const materialName = 'Morsche Fichte';
const materialId = 1;
assert.ok(existsSync(join(distRoot, 'index.html')), 'Der gebaute Angular-Index fehlt.');

const browser = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].find(candidate => {
  const probe = spawnSync('which', [candidate], { encoding:'utf8' });
  return probe.status === 0 && probe.stdout.trim();
});
assert.ok(browser, 'Chrome/Chromium wurde für den Loot-E2E-Test nicht gefunden.');

// Absichtlich alter v9-Spielstand mit materialnamenbasiertem Dungeon-Loot.
const fixture = JSON.stringify({
  saveVersion: 9,
  savedAt: Date.now(),
  state: {
    inventory: {},
    dungeonAuto: false,
    dungeonStopRequested: false,
    dungeonRun: null,
    dungeonSearch: null,
    dungeonLootCollect: null,
    dungeonLoot: {
      [materialName]: { category: 'Holz', qty: 2 }
    }
  }
});

const seedScript = `<script>
window.__lootErrors=[];
window.addEventListener('error',event=>window.__lootErrors.push(String(event.error?.stack||event.message||event.error||'error')));
window.addEventListener('unhandledrejection',event=>window.__lootErrors.push(String(event.reason?.stack||event.reason||'rejection')));
localStorage.setItem(${JSON.stringify(saveKey)},${JSON.stringify(fixture)});
</script>`;
const probeScript = `<script>
(() => {
  const finish = status => {
    if (document.getElementById('lootE2EResult')) return;
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(${JSON.stringify(saveKey)}) || 'null'); } catch {}
    const result = {
      status,
      saveVersion: Number(saved?.saveVersion || 0),
      inventoryQty: Number(saved?.state?.inventory?.[${JSON.stringify(String(materialId))}]?.qty || 0),
      canonicalMaterialId: Number(saved?.state?.inventory?.[${JSON.stringify(String(materialId))}]?.materialId || 0),
      legacyInventoryKeyPresent: Boolean(saved?.state?.inventory?.[${JSON.stringify(materialName)}]),
      legacyDungeonLootKeyPresent: Boolean(saved?.state?.dungeonLoot?.[${JSON.stringify(materialName)}]),
      materialCount: document.getElementById('matCount')?.textContent?.trim() || '',
      storageText: document.getElementById('inventoryRows')?.textContent?.replace(/\\s+/g, ' ').trim() || '',
      dungeonLootText: document.getElementById('dungeonLoot')?.textContent?.replace(/\\s+/g, ' ').trim() || '',
      overviewText: document.getElementById('dungeonOverviewAction')?.textContent?.replace(/\\s+/g, ' ').trim() || '',
      primaryText: document.getElementById('dungeonPrimaryBtn')?.textContent?.replace(/\\s+/g, ' ').trim() || '',
      runtimeError: document.querySelector('.legacy-host')?.getAttribute('data-runtime-error') || '',
      browserErrors: Array.isArray(window.__lootErrors) ? window.__lootErrors : []
    };
    const node = document.createElement('pre');
    node.id = 'lootE2EResult';
    node.textContent = JSON.stringify(result);
    document.body.appendChild(node);
  };

  const started = Date.now();
  const timer = setInterval(() => {
    const button = document.getElementById('dungeonOverviewAction');
    if (button && !button.disabled && /Loot sammeln/.test(button.textContent || '')) {
      clearInterval(timer);
      button.click();
      setTimeout(() => finish('clicked'), 750);
      return;
    }
    if (Date.now() - started > 3500) {
      clearInterval(timer);
      finish('button-not-ready');
    }
  }, 50);
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
    html = html.replace('</head>', `${seedScript}</head>`).replace('</body>', `${probeScript}</body>`);
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

const browserProfile = mkdtempSync(join(tmpdir(), 'nobrainer-loot-e2e-'));
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
    `--user-data-dir=${browserProfile}`,
    '--virtual-time-budget=6000',
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

  assert.equal(code, 0, `Chrome/Chromium beendete den Loot-E2E-Test mit Code ${code}.\n${stderr}`);
  const resultMatch = stdout.match(/<pre id="lootE2EResult">([^<]+)<\/pre>/);
  assert.ok(resultMatch, `Der Loot-E2E-Test hat kein Ergebnis erzeugt.\n${stderr}\nDOM-Ausgabe: ${stdout.slice(-5000)}`);
  const decoded = resultMatch[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&');
  const result = JSON.parse(decoded);

  assert.equal(result.status, 'clicked', `Der unsichtbare Dungeon-Loot-Kompatibilitätsanker wurde zum Einsammeln nicht verwendbar: ${JSON.stringify(result)}`);
  assert.equal(result.saveVersion, 14, `Der migrierte Altstand wurde nicht als Save v14 persistiert: ${JSON.stringify(result)}`);
  assert.equal(result.inventoryQty, 2, `Dungeon-Loot wurde nicht in das ID-keyed gespeicherte Inventar übertragen: ${JSON.stringify(result)}`);
  assert.equal(result.canonicalMaterialId, materialId, `Der kanonische Lagereintrag trägt nicht die erwartete Material-ID: ${JSON.stringify(result)}`);
  assert.equal(result.legacyInventoryKeyPresent, false, `Der Materialname blieb fälschlich als Inventarschlüssel erhalten: ${JSON.stringify(result)}`);
  assert.equal(result.legacyDungeonLootKeyPresent, false, `Der Materialname blieb fälschlich als Dungeon-Loot-Schlüssel erhalten: ${JSON.stringify(result)}`);
  assert.equal(result.browserErrors.length, 0, `Beim Loot-Einsammeln trat ein Browserfehler auf: ${JSON.stringify(result)}`);
  assert.equal(result.materialCount, '2', `Der Materialzähler wurde nach dem Einsammeln nicht aktualisiert: ${JSON.stringify(result)}`);
  assert.match(result.storageText, /Morsche Fichte/, `Das Materiallager zeigt den eingesammelten Loot nicht mit Anzeigenamen: ${JSON.stringify(result)}`);
  assert.equal(result.dungeonLootText, '', `Die Dungeon-Lootanzeige wurde nach dem Einsammeln nicht geleert: ${JSON.stringify(result)}`);
  assert.equal(result.overviewText, 'Trainingslager öffnen', `Nach dem Einsammeln muss der unsichtbare Hub-Kompatibilitätsanker wieder das Trainingslager-Popup anbieten: ${JSON.stringify(result)}`);
  assert.equal(result.primaryText, 'Lauf starten', `Nach dem Einsammeln muss der Trainingslager-Popup-Button wieder einen neuen Lauf anbieten: ${JSON.stringify(result)}`);
  assert.equal(result.runtimeError, '', `Die Runtime meldet während des Loot-E2E-Tests einen Fehler: ${JSON.stringify(result)}`);

  console.log('Dungeon-Loot-Browserregression: v9-Namensloot wird zu ID-keyed Save v14 migriert, eingesammelt und im Trainingslager-Popup korrekt angezeigt.');
} finally {
  if (child) await stopBrowser(child);
  rmSync(browserProfile, { recursive: true, force: true });
  await new Promise(resolveClose => server.close(resolveClose));
}
