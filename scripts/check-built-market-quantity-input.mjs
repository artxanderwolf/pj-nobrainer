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
assert.ok(existsSync(join(distRoot, 'index.html')), 'Der gebaute Angular-Index fehlt.');

const browser = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].find(candidate => {
  const probe = spawnSync('which', [candidate], { encoding: 'utf8' });
  return probe.status === 0 && probe.stdout.trim();
});
assert.ok(browser, 'Chrome/Chromium wurde für den Markt-Mengen-E2E-Test nicht gefunden.');

const fixture = JSON.stringify({
  saveVersion: 9,
  savedAt: Date.now(),
  state: {
    inventory: {
      [materialName]: { category: 'Holz', qty: 5 }
    }
  }
});

const seedScript = `<script>
window.__marketQuantityErrors=[];
window.addEventListener('error',event=>window.__marketQuantityErrors.push(String(event.error?.stack||event.message||event.error||'error')));
window.addEventListener('unhandledrejection',event=>window.__marketQuantityErrors.push(String(event.reason?.stack||event.reason||'rejection')));
localStorage.setItem(${JSON.stringify(saveKey)},${JSON.stringify(fixture)});
</script>`;

const probeScript = `<script>
(() => {
  const finish = result => {
    if (document.getElementById('marketQuantityE2EResult')) return;
    const node = document.createElement('pre');
    node.id = 'marketQuantityE2EResult';
    node.textContent = JSON.stringify({
      ...result,
      runtimeError: document.querySelector('.legacy-host')?.getAttribute('data-runtime-error') || '',
      browserErrors: Array.isArray(window.__marketQuantityErrors) ? window.__marketQuantityErrors : []
    });
    document.body.appendChild(node);
  };

  const started = Date.now();
  const timer = setInterval(() => {
    const input = document.querySelector('#marketMaterials input[data-material=${JSON.stringify(materialName)}]');
    const row = input?.closest('.sell-row');
    const buttons = row?.querySelectorAll('button');
    if (input && buttons && buttons.length >= 3) {
      clearInterval(timer);
      const values = { initial: input.value };

      buttons[1].click();
      values.afterPlus = input.value;
      buttons[0].click();
      values.afterMinus = input.value;

      input.focus();
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      values.afterClearInput = input.value;

      input.value = '4';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      values.afterKeyboardInput = input.value;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      values.afterChange = input.value;

      setTimeout(() => {
        values.afterTickDelay = input.isConnected ? input.value : 'detached';
        finish({ status: 'tested', values });
      }, 750);
      return;
    }

    if (Date.now() - started > 4000) {
      clearInterval(timer);
      finish({ status: 'input-not-ready', values: {} });
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

const browserProfile = mkdtempSync(join(tmpdir(), 'nobrainer-market-quantity-e2e-'));
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

  assert.equal(code, 0, `Chrome/Chromium beendete den Markt-Mengen-E2E-Test mit Code ${code}.\n${stderr}`);
  const resultMatch = stdout.match(/<pre id="marketQuantityE2EResult">([^<]+)<\/pre>/);
  assert.ok(resultMatch, `Der Markt-Mengen-E2E-Test hat kein Ergebnis erzeugt.\n${stderr}\nDOM-Ausgabe: ${stdout.slice(-5000)}`);
  const decoded = resultMatch[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&');
  const result = JSON.parse(decoded);

  assert.equal(result.status, 'tested', `Das Mengenfeld wurde nicht testbereit: ${JSON.stringify(result)}`);
  assert.equal(result.browserErrors.length, 0, `Beim Mengen-Editor trat ein Browserfehler auf: ${JSON.stringify(result)}`);
  assert.equal(result.runtimeError, '', `Die Runtime meldet beim Mengen-Editor einen Fehler: ${JSON.stringify(result)}`);
  assert.deepEqual(result.values, {
    initial: '1',
    afterPlus: '2',
    afterMinus: '1',
    afterClearInput: '',
    afterKeyboardInput: '4',
    afterChange: '4',
    afterTickDelay: '4'
  }, `Plus/Minus oder Tastatureingabe im Markt-Mengenfeld funktionieren nicht stabil: ${JSON.stringify(result)}`);

  console.log('Markt-Mengen-Browserregression: Plus, Minus und Tastatureingabe bleiben im echten Angular-Build bedienbar und überstehen den Runtime-Tick.');
} finally {
  if (child) await stopBrowser(child);
  rmSync(browserProfile, { recursive: true, force: true });
  await new Promise(resolveClose => server.close(resolveClose));
}
