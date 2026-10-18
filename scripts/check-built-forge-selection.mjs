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
      Fichte: { category: 'Holz', qty: 20 },
      Zinn: { category: 'Metall', qty: 20 },
      Lederfetzen: { category: 'Leder', qty: 20 }
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
    const form = document.getElementById('weaponForm');
    const back = document.getElementById('slotBack');
    if (form instanceof HTMLSelectElement && back instanceof HTMLSelectElement && back.options.length > 1) {
      clearInterval(timer);
      const formChosen = choose('weaponForm', 'bow');
      setTimeout(() => {
        const selected = {
          back: choose('slotBack', 'Fichte'),
          gripCore: choose('slotGripCore', 'Fichte'),
          gripWrap: choose('slotGripWrap', 'Lederfetzen'),
          special: choose('slotSpecial', 'Fichte'),
          bowstring: choose('slotBowstring', 'Lederfetzen'),
          form: formChosen
        };
        setTimeout(() => {
          const previewButton = document.getElementById('forgePreviewNextBtn');
          const previewNextDisabled = previewButton instanceof HTMLButtonElement ? previewButton.disabled : null;
          if (previewButton instanceof HTMLButtonElement) previewButton.click();
          setTimeout(() => {
            finish({
              status: 'tested',
              selected,
              finalForm: document.getElementById('weaponForm')?.value || '',
              timeText: document.getElementById('forgeTimePreview')?.textContent || '',
              materialTotalText: document.getElementById('forgeMaterialTotalPreview')?.textContent || '',
              constructionText: document.getElementById('forgeParryInfo')?.textContent || '',
              damageText: document.getElementById('forgeDamagePreview')?.textContent || '',
              speedText: document.getElementById('forgeSpeedPreview')?.textContent || '',
              startDisabled: document.getElementById('forgeStartBtn')?.disabled ?? null,
              previewNextDisabled,
              activePage: document.querySelector('.page.active')?.id || '',
              capacityText: document.getElementById('forgeCapacityStatus')?.textContent || '',
              workingPartHidden: document.getElementById('forgeWorkingPartRow')?.hidden ?? false,
              parryHidden: document.getElementById('forgeParryRow')?.hidden ?? false,
              bowstringHidden: document.getElementById('forgeBowstringRow')?.hidden ?? true,
              oldBaseMaterialPresent: Boolean(document.getElementById('slotBaseMaterial'))
            });
          }, 100);
        }, 180);
      }, 120);
      return;
    }

    if (Date.now() - started > 4000) {
      clearInterval(timer);
      finish({ status: 'selection-not-ready', selected: {} });
    }
  }, 50);
})();
</script>`;

const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.js', 'application/javascript; charset=utf-8'], ['.css', 'text/css; charset=utf-8'], ['.json', 'application/json; charset=utf-8'], ['.svg', 'image/svg+xml'], ['.png', 'image/png'], ['.ico', 'image/x-icon']
]);

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1');
  if (!url.pathname.startsWith(basePath)) return response.writeHead(404).end('Not found');
  let relativePath = decodeURIComponent(url.pathname.slice(basePath.length));
  if (!relativePath) relativePath = 'index.html';
  const safePath = normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
  const filePath = join(distRoot, safePath);
  if (!existsSync(filePath)) return response.writeHead(404).end('Not found');
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
const browserProfile = mkdtempSync(join(tmpdir(), 'nobrainer-forge-selection-e2e-'));
let child = null;
try {
  const address = server.address(); assert.ok(address && typeof address === 'object');
  const pageUrl = `http://127.0.0.1:${address.port}${basePath}`;
  child = spawn(browser, ['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--hide-scrollbars','--no-first-run','--no-default-browser-check',`--user-data-dir=${browserProfile}`,'--virtual-time-budget=6500','--dump-dom',pageUrl], { stdio: ['ignore','pipe','pipe'] });
  child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
  let stdout = '', stderr = ''; child.stdout.on('data', chunk => { stdout += chunk; }); child.stderr.on('data', chunk => { stderr += chunk; });
  const code = await new Promise((resolveClose, rejectClose) => { child.once('error', rejectClose); child.once('close', resolveClose); });
  assert.equal(code, 0, `Chrome/Chromium beendete den Schmiedeauswahl-E2E-Test mit Code ${code}.\n${stderr}`);
  const resultMatch = stdout.match(/<pre id="forgeSelectionE2EResult">([^<]+)<\/pre>/);
  assert.ok(resultMatch, `Der Schmiedeauswahl-E2E-Test hat kein Ergebnis erzeugt.\n${stderr}\nDOM-Ausgabe: ${stdout.slice(-5000)}`);
  const result = JSON.parse(resultMatch[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&'));

  assert.equal(result.status, 'tested', `Die Schmiedeauswahl wurde nicht testbereit: ${JSON.stringify(result)}`);
  assert.equal(result.browserErrors.length, 0, `Bei der Schmiedeauswahl trat ein Browserfehler auf: ${JSON.stringify(result)}`);
  assert.equal(result.runtimeError, '', `Die Runtime meldet bei der Schmiedeauswahl einen Fehler: ${JSON.stringify(result)}`);
  assert.deepEqual(result.selected, { back: true, gripCore: true, gripWrap: true, special: true, bowstring: true, form: true });
  assert.equal(result.finalForm, 'bow');
  assert.equal(result.timeText, '80 s');
  assert.equal(result.materialTotalText, '16 Materialeinheiten');
  assert.match(result.constructionText, /2H · belegt beide Hände/);
  assert.match(result.constructionText, /3× Sehne/);
  assert.equal(result.damageText, '11.11');
  assert.equal(result.speedText, '0.90');
  assert.equal(result.startDisabled, false);
  assert.equal(result.previewNextDisabled, false, 'Der Vorschau-Button darf nach der Materialauswahl nicht blockiert bleiben.');
  assert.equal(result.activePage, 'forge-preview', 'Der Vorschau-Button muss zur Waffenvorschau navigieren.');
  assert.match(result.capacityText, /^Schmiede \d+\/\d+ · Warteschlange \d+\/\d+$/, 'Die Waffenvorschau muss aktive und maximale Schmiedekapazität anzeigen.');
  assert.equal(result.workingPartHidden, true);
  assert.equal(result.parryHidden, true);
  assert.equal(result.bowstringHidden, false);
  assert.equal(result.oldBaseMaterialPresent, false);

  console.log('Schmiedeauswahl-Browserregression: Materialwahl, Vorschau-Navigation und Kapazitätsanzeige funktionieren gemeinsam.');
} finally {
  if (child) await stopBrowser(child);
  rmSync(browserProfile, { recursive: true, force: true });
  await new Promise(resolveClose => server.close(resolveClose));
}
