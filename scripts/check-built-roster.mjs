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

const seedScript = `<script>
window.__rosterErrors=[];
window.addEventListener('error',event=>window.__rosterErrors.push(String(event.error?.stack||event.message||event.error||'error')));
window.addEventListener('unhandledrejection',event=>window.__rosterErrors.push(String(event.reason?.stack||event.reason||'rejection')));
</script>`;

const probeScript = `<script>
(() => {
  const finish = result => {
    if (document.getElementById('rosterE2EResult')) return;
    const node = document.createElement('pre');
    node.id = 'rosterE2EResult';
    node.textContent = JSON.stringify({
      ...result,
      runtimeError: document.querySelector('.legacy-host')?.getAttribute('data-runtime-error') || '',
      browserErrors: Array.isArray(window.__rosterErrors) ? window.__rosterErrors : []
    });
    document.body.appendChild(node);
  };

  const started = Date.now();
  const timer = setInterval(() => {
    const root = document.querySelector('[data-roster-presentation-owner="angular"]');
    const listItem = root?.querySelector('.roster-list-item.selected');
    const smallIcon = root?.querySelector('.class-emblem-small');
    const largeIcon = root?.querySelector('.class-emblem-large');
    const editButton = root?.querySelector('[data-roster-action="edit-name"]');
    const equipment = root?.querySelector('.roster-equipment-slot');
    const nextStats = root?.querySelector('[data-roster-action="stat-page-next"]');
    if (root && listItem && smallIcon && largeIcon && editButton && equipment && nextStats) {
      clearInterval(timer);
      const values = {
        smallClassId: smallIcon.getAttribute('data-class-id'),
        largeClassId: largeIcon.getAttribute('data-class-id'),
        smallBackground: getComputedStyle(smallIcon).backgroundImage,
        largeBackground: getComputedStyle(largeIcon).backgroundImage,
        initialPage: root.querySelector('.roster-stat-pagination span')?.textContent?.trim() || ''
      };

      editButton.click();
      const input = document.querySelector('[data-roster-name-input]');
      if (!(input instanceof HTMLInputElement)) {
        finish({ status: 'rename-input-missing', values });
        return;
      }
      input.value = 'Testheld';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('[data-roster-action="save-name"]')?.click();
      values.renamedDetail = document.querySelector('.roster-name-display strong')?.textContent?.trim() || '';
      values.renamedList = document.querySelector('.roster-list-item.selected .roster-list-name')?.textContent?.trim() || '';

      document.querySelector('.roster-equipment-slot')?.click();
      values.pickerOpened = Boolean(document.querySelector('.roster-weapon-picker'));

      document.querySelector('[data-roster-action="toggle-picker"]')?.click();
      document.querySelector('[data-roster-action="stat-page-next"]')?.click();
      values.nextPage = document.querySelector('.roster-stat-pagination span')?.textContent?.trim() || '';
      values.statCount = document.querySelectorAll('.roster-stat').length;
      values.listRows = document.querySelectorAll('.roster-list-item').length;

      setTimeout(() => {
        values.nameAfterTick = document.querySelector('.roster-name-display strong')?.textContent?.trim() || '';
        values.pageAfterTick = document.querySelector('.roster-stat-pagination span')?.textContent?.trim() || '';
        finish({ status: 'tested', values });
      }, 750);
      return;
    }

    if (Date.now() - started > 5000) {
      clearInterval(timer);
      finish({ status: 'roster-not-ready', values: {} });
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

const browserProfile = mkdtempSync(join(tmpdir(), 'nobrainer-roster-e2e-'));
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
    '--virtual-time-budget=7500',
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

  assert.equal(code, 0, `Chrome/Chromium beendete den Kader-E2E-Test mit Code ${code}.\n${stderr}`);
  const resultMatch = stdout.match(/<pre id="rosterE2EResult">([^<]+)<\/pre>/);
  assert.ok(resultMatch, `Der Kader-E2E-Test hat kein Ergebnis erzeugt.\n${stderr}\nDOM-Ausgabe: ${stdout.slice(-6500)}`);
  const decoded = resultMatch[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&');
  const result = JSON.parse(decoded);

  assert.equal(result.status, 'tested', `Der Kader wurde nicht testbereit: ${JSON.stringify(result)}`);
  assert.equal(result.browserErrors.length, 0, `Beim Kader trat ein Browserfehler auf: ${JSON.stringify(result)}`);
  assert.equal(result.runtimeError, '', `Die Runtime meldet beim Kader einen Fehler: ${JSON.stringify(result)}`);
  assert.equal(result.values.smallClassId, result.values.largeClassId, 'Kleine und große Klassenansicht müssen dieselbe stabile Klassen-ID verwenden.');
  assert.match(result.values.smallBackground, /class-emblems-compact/, 'Das kleine Klassenemblem verwendet nicht das kompakte Asset.');
  assert.match(result.values.largeBackground, /class-emblems-detail/, 'Das große Klassenemblem verwendet nicht das Detail-Asset.');
  assert.equal(result.values.initialPage, 'Seite 1 / 2');
  assert.equal(result.values.renamedDetail, 'Testheld');
  assert.equal(result.values.renamedList, 'Testheld');
  assert.equal(result.values.pickerOpened, true, 'Der Ausrüstungs-Layer öffnet den vorhandenen Waffenpicker nicht.');
  assert.equal(result.values.nextPage, 'Seite 2 / 2');
  assert.equal(result.values.pageAfterTick, 'Seite 2 / 2', 'Der Runtime-Tick darf die gewählte Werteseite nicht zurücksetzen.');
  assert.equal(result.values.nameAfterTick, 'Testheld', 'Der Runtime-Tick darf den geänderten Namen nicht zurücksetzen.');
  assert.ok(result.values.statCount > 0 && result.values.statCount <= 8, 'Eine Werteseite darf höchstens acht Werte anzeigen.');
  assert.ok(result.values.listRows >= 1, 'Die kompakte Kaderliste enthält keinen Charakter.');

  console.log('Kader-Browserregression: Klassenassets, Umbenennen, Ausrüstungs-Layer und zweiseitige Werteansicht funktionieren im echten Angular-Build und bleiben über den Runtime-Tick stabil.');
} finally {
  if (child) await stopBrowser(child);
  rmSync(browserProfile, { recursive: true, force: true });
  await new Promise(resolveClose => server.close(resolveClose));
}
