import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, normalize, resolve } from 'node:path';

const distRoot = resolve('dist/nobrainer/browser');
const basePath = '/pj-nobrainer/';
const saveKey = 'nobrainer_save_v1';
const materialName = 'Zinn';
const expectedQuantity = 2;

assert.ok(existsSync(join(distRoot, 'index.html')), 'Der gebaute Angular-Index fehlt.');

const browser = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].find(candidate => {
  const probe = spawnSync('which', [candidate], { encoding: 'utf8' });
  return probe.status === 0 && probe.stdout.trim();
});
assert.ok(browser, 'Chrome/Chromium wurde für den Dungeon-Loot-Browsertest nicht gefunden.');

const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'application/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.ico', 'image/x-icon']
]);

const seededSave = {
  saveVersion: 8,
  savedAt: Date.now() - 60_000,
  state: {
    inventory: {},
    dungeonLoot: {
      [materialName]: { category: 'Metall', qty: expectedQuantity }
    }
  }
};

const harness = `<script>
(() => {
  localStorage.setItem(${JSON.stringify(saveKey)}, ${JSON.stringify(JSON.stringify(seededSave))});
  const finish = payload => {
    const marker = document.createElement('pre');
    marker.id = 'lootE2EResult';
    marker.textContent = JSON.stringify(payload);
    document.body.appendChild(marker);
  };
  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    const host = document.querySelector('.legacy-host');
    const runtimeError = host?.dataset?.runtimeError;
    if (runtimeError) {
      clearInterval(timer);
      finish({ error: 'runtime-error', runtimeError });
      return;
    }

    const button = document.getElementById('collectLootBtn');
    if (button && !button.disabled && String(button.textContent || '').includes('(${expectedQuantity})')) {
      clearInterval(timer);
      button.click();
      setTimeout(() => {
        let saved = null;
        try { saved = JSON.parse(localStorage.getItem(${JSON.stringify(saveKey)}) || 'null'); } catch {}
        finish({
          error: null,
          materialCountText: document.getElementById('matCount')?.textContent || '',
          storageText: document.getElementById('inventoryRows')?.textContent || '',
          forgeOptions: [...document.querySelectorAll('#slotWeaponType option')].map(option => option.textContent || ''),
          marketText: document.getElementById('marketMaterials')?.textContent || '',
          dungeonLootText: document.getElementById('dungeonLoot')?.textContent || '',
          savedInventoryQty: saved?.state?.inventory?.[${JSON.stringify(materialName)}]?.qty ?? null,
          savedDungeonLootQty: saved?.state?.dungeonLoot?.[${JSON.stringify(materialName)}]?.qty ?? null
        });
      }, 500);
      return;
    }

    if (attempts >= 160) {
      clearInterval(timer);
      finish({
        error: 'collect-button-not-ready',
        buttonText: button?.textContent || '',
        buttonDisabled: button?.disabled ?? null,
        dungeonLootText: document.getElementById('dungeonLoot')?.textContent || '',
        materialCountText: document.getElementById('matCount')?.textContent || ''
      });
    }
  }, 50);
})();
</script>`;

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
  if (relativePath === 'index.html' && url.searchParams.get('loot-e2e') === '1') {
    const html = body.toString('utf8');
    assert.ok(html.includes('<body>'), 'Der gebaute Index besitzt keinen erwarteten body-Anker.');
    body = Buffer.from(html.replace('<body>', `<body>${harness}`), 'utf8');
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

const browserProfile = mkdtempSync(join(tmpdir(), 'nobrainer-dungeon-loot-e2e-'));
let child = null;
try {
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const pageUrl = `http://127.0.0.1:${address.port}${basePath}?loot-e2e=1`;
  child = spawn(browser, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${browserProfile}`,
    '--virtual-time-budget=10000',
    '--dump-dom',
    pageUrl
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', chunk => { stdout += chunk; });
  child.stderr.on('data', chunk => { stderr += chunk; });

  const exitCode = await Promise.race([
    new Promise((resolveClose, rejectClose) => {
      child.once('error', rejectClose);
      child.once('close', code => resolveClose(code));
    }),
    delay(60_000).then(() => 'timeout')
  ]);

  if (exitCode === 'timeout') {
    throw new Error(`Der Dungeon-Loot-Browsertest hat das Zeitlimit überschritten.\n${stderr}\nDOM-Ausgabe: ${stdout.slice(-5000)}`);
  }
  assert.equal(exitCode, 0, `Chrome/Chromium beendete den Dungeon-Loot-Browsertest mit Code ${exitCode}.\n${stderr}`);

  const markerMatch = stdout.match(/<pre id="lootE2EResult">([^<]*)<\/pre>/);
  assert.ok(markerMatch, `Der Dungeon-Loot-Browsertest lieferte kein Ergebnis.\n${stderr}\nDOM-Ausgabe: ${stdout.slice(-5000)}`);
  const payload = JSON.parse(markerMatch[1].replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>'));

  assert.equal(payload.error, null, `Dungeon-Loot-Browserablauf scheiterte: ${JSON.stringify(payload)}`);
  assert.equal(payload.materialCountText, String(expectedQuantity), `Der Materialzähler wurde nach dem Einsammeln nicht aktualisiert: ${JSON.stringify(payload)}`);
  assert.match(payload.storageText, new RegExp(materialName), `Das eingesammelte Material erscheint nicht im Lager: ${JSON.stringify(payload)}`);
  assert.ok(payload.forgeOptions.some(text => text.includes(materialName)), `Das eingesammelte Material erscheint nicht in der Schmiedeauswahl: ${JSON.stringify(payload)}`);
  assert.match(payload.marketText, new RegExp(materialName), `Das eingesammelte Material erscheint nicht im Markt: ${JSON.stringify(payload)}`);
  assert.equal(payload.dungeonLootText.trim(), '', `Die eingesammelte Dungeon-Beute bleibt sichtbar: ${JSON.stringify(payload)}`);
  assert.equal(payload.savedInventoryQty, expectedQuantity, `Der eingesammelte Loot wurde nicht im Spielstand-Inventar gespeichert: ${JSON.stringify(payload)}`);
  assert.equal(payload.savedDungeonLootQty, null, `Der eingesammelte Loot bleibt fälschlich im Dungeon-Loot gespeichert: ${JSON.stringify(payload)}`);

  console.log('Dungeon-Loot-Browserablauf: Einsammeln aktualisiert Materialzähler, Lager, Schmiede, Markt und gespeicherten Inventarzustand.');
} finally {
  if (child) await stopBrowser(child);
  rmSync(browserProfile, { recursive: true, force: true });
  await new Promise(resolveClose => server.close(resolveClose));
}
