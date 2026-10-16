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
assert.ok(browser, 'Chrome/Chromium wurde für den Schmiedeauswahl-E2E-Test nicht gefunden.');

const fixture = JSON.stringify({
  saveVersion: 9,
  savedAt: Date.now(),
  state: {
    inventory: {
      Fichte: { category: 'Holz', qty: 10 },
      Zinn: { category: 'Metall', qty: 10 },
      Lederfetzen: { category: 'Leder', qty: 10 }
    }
  }
});

const seedScript = `<script>
window.__forgeSelectionErrors=[];
window.addEventListener('error',event=>window.__forgeSelectionErrors.push(String(event.error?.stack||event.message||event.error||'error')));
window.addEventListener('unhandledrejection',event=>window.__forgeSelectionErrors.push(String(event.reason?.stack||event.reason||'rejection')));
localStorage.setItem(${JSON.stringify(saveKey)},${JSON.stringify(fixture)});
</script>`;

const probeScript = `<script>
(() => {
  const finish = result => {
    if (document.getElementById('forgeSelectionE2EResult')) return;
    const node = document.createElement('pre');
    node.id = 'forgeSelectionE2EResult';
    node.textContent = JSON.stringify({
      ...result,
      runtimeError: document.querySelector('.legacy-host')?.getAttribute('data-runtime-error') || '',
      browserErrors: Array.isArray(window.__forgeSelectionErrors) ? window.__forgeSelectionErrors : []
    });
    document.body.appendChild(node);
  };

  const choose = (id, value) => {
    const select = document.getElementById(id);
    if (!(select instanceof HTMLSelectElement)) return false;
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return select.value === value;
  };

  const started = Date.now();
  const timer = setInterval(() => {
    const base = document.getElementById('slotBaseMaterial');
    const form = document.getElementById('weaponForm');
    if (base instanceof HTMLSelectElement && form instanceof HTMLSelectElement && base.options.length > 1) {
      clearInterval(timer);
      const baseOptions = Array.from(base.options).map(option => option.value);
      const selected = {
        base: choose('slotBaseMaterial', 'Fichte'),
        blade: choose('slotBlade', 'Zinn'),
        back: choose('slotBack', 'Zinn'),
        gripShape: choose('slotGripShape', 'Fichte'),
        gripMaterial: choose('slotGripMaterial', 'Lederfetzen'),
        reinforcement: choose('slotReinforcementMaterial', 'Fichte'),
        form: choose('weaponForm', 'sword')
      };
      setTimeout(() => {
        finish({
          status: 'tested',
          baseOptions,
          selected,
          finalBase: document.getElementById('slotBaseMaterial')?.value || '',
          finalForm: document.getElementById('weaponForm')?.value || '',
          timeText: document.getElementById('forgeTimePreview')?.textContent || '',
          startDisabled: document.getElementById('forgeStartBtn')?.disabled ?? null
        });
      }, 100);
      return;
    }

    if (Date.now() - started > 4000) {
      clearInterval(timer);
      finish({ status: 'selection-not-ready', baseOptions: [], selected: {} });
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

const browserProfile = mkdtempSync(join(tmpdir(), 'nobrainer-forge-selection-e2e-'));
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
    '--virtual-time-budget=6500',
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

  assert.equal(code, 0, `Chrome/Chromium beendete den Schmiedeauswahl-E2E-Test mit Code ${code}.\n${stderr}`);
  const resultMatch = stdout.match(/<pre id="forgeSelectionE2EResult">([^<]+)<\/pre>/);
  assert.ok(resultMatch, `Der Schmiedeauswahl-E2E-Test hat kein Ergebnis erzeugt.\n${stderr}\nDOM-Ausgabe: ${stdout.slice(-5000)}`);
  const decoded = resultMatch[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&');
  const result = JSON.parse(decoded);

  assert.equal(result.status, 'tested', `Die Schmiedeauswahl wurde nicht testbereit: ${JSON.stringify(result)}`);
  assert.equal(result.browserErrors.length, 0, `Bei der Schmiedeauswahl trat ein Browserfehler auf: ${JSON.stringify(result)}`);
  assert.equal(result.runtimeError, '', `Die Runtime meldet bei der Schmiedeauswahl einen Fehler: ${JSON.stringify(result)}`);
  assert.ok(result.baseOptions.includes('Fichte'), `Grundmaterial enthält Fichte nicht: ${JSON.stringify(result)}`);
  assert.ok(result.baseOptions.includes('Zinn'), `Grundmaterial enthält Metall nicht: ${JSON.stringify(result)}`);
  assert.deepEqual(result.selected, {
    base: true,
    blade: true,
    back: true,
    gripShape: true,
    gripMaterial: true,
    reinforcement: true,
    form: true
  }, `Mindestens eine Schmiedeauswahl ließ sich nicht setzen: ${JSON.stringify(result)}`);
  assert.equal(result.finalBase, 'Fichte', `Grundmaterial blieb nach dem Angular-Re-Render nicht erhalten: ${JSON.stringify(result)}`);
  assert.equal(result.finalForm, 'sword', `Waffenform blieb nach dem Angular-Re-Render nicht erhalten: ${JSON.stringify(result)}`);
  assert.equal(result.timeText, '30 s', `Die Angular-Vorschau liest die Waffenform nicht korrekt: ${JSON.stringify(result)}`);
  assert.equal(result.startDisabled, false, `Vollständige gültige Schmiedeauswahl bleibt fälschlich deaktiviert: ${JSON.stringify(result)}`);

  console.log('Schmiedeauswahl-Browserregression: Grundmaterial ist auswählbar, alle sechs Slots bleiben erhalten und die Angular-Vorschau liest die aktuelle Waffenform.');
} finally {
  if (child) await stopBrowser(child);
  rmSync(browserProfile, { recursive: true, force: true });
  await new Promise(resolveClose => server.close(resolveClose));
}
