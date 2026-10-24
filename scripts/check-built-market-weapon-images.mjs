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
assert.ok(browser, 'Chrome/Chromium wurde für den Markt-Waffenbild-E2E-Test nicht gefunden.');

const fixture = JSON.stringify({
  saveVersion: 13,
  savedAt: Date.now(),
  state: {
    weaponInventory: [
      {
        id: 901,
        name: 'Marktdolch',
        weaponForm: 'dagger',
        slots: [
          { slot: 'workingPart', materialId: 5 },
          { slot: 'back', materialId: 4 },
          { slot: 'gripCore', materialId: 2 },
          { slot: 'gripWrap', materialId: 8 },
          { slot: 'special', materialId: 6 }
        ],
        valueNickel: 100,
        craftedSeconds: 10
      },
      {
        id: 902,
        name: 'Marktschwert',
        weaponForm: 'sword',
        slots: [
          { slot: 'workingPart', materialId: 6 },
          { slot: 'back', materialId: 5 },
          { slot: 'gripCore', materialId: 3 },
          { slot: 'gripWrap', materialId: 7 },
          { slot: 'parry', materialId: 4 },
          { slot: 'special', materialId: 6 }
        ],
        valueNickel: 120,
        craftedSeconds: 12
      }
    ],
    nextWeaponId: 903,
    marketJobs: [],
    marketQueue: [],
    upgrades: {
      marketSlots: 1,
      marketQueue: 1
    },
    characters: []
  }
});

const seedScript = `<script>
window.__marketWeaponImageErrors=[];
window.addEventListener('error',event=>window.__marketWeaponImageErrors.push(String(event.error?.stack||event.message||event.error||'error')));
window.addEventListener('unhandledrejection',event=>window.__marketWeaponImageErrors.push(String(event.reason?.stack||event.reason||'rejection')));
localStorage.setItem(${JSON.stringify(saveKey)},${JSON.stringify(fixture)});
</script>`;

const probeScript = `<script>
(() => {
  const finish = result => {
    if (document.getElementById('marketWeaponImageE2EResult')) return;
    const node = document.createElement('pre');
    node.id = 'marketWeaponImageE2EResult';
    node.textContent = JSON.stringify({
      ...result,
      runtimeError: document.querySelector('.legacy-host')?.getAttribute('data-runtime-error') || '',
      browserErrors: Array.isArray(window.__marketWeaponImageErrors) ? window.__marketWeaponImageErrors : []
    });
    document.body.appendChild(node);
  };

  const describeImage = image => {
    if (!(image instanceof HTMLElement)) return null;
    return {
      form: image.getAttribute('data-weapon-form') || '',
      kind: image.getAttribute('data-weapon-image-kind') || '',
      layers: [...image.querySelectorAll('.weapon-image-layer')].map(layer => {
        const style = getComputedStyle(layer);
        return {
          name: layer.getAttribute('data-weapon-image-layer') || '',
          color: style.backgroundColor,
          maskPosition: style.maskPosition && style.maskPosition !== '0% 0%' ? style.maskPosition : style.webkitMaskPosition
        };
      })
    };
  };

  const saleRow = id => document.querySelector('#marketWeapons [data-market-weapon-id="' + id + '"]');
  const activeRow = id => document.querySelector('#marketJobCard [data-market-weapon-id="' + id + '"]');
  const queueRow = id => document.querySelector('#marketQueueCard [data-market-weapon-id="' + id + '"]');

  const started = Date.now();
  const timer = setInterval(() => {
    const first = saleRow(901);
    const second = saleRow(902);
    const firstButton = first?.querySelector('button');
    const secondButton = second?.querySelector('button');
    const firstImage = first?.querySelector('.market-weapon-sale-image');
    const secondImage = second?.querySelector('.market-weapon-sale-image');
    if (!(firstButton instanceof HTMLButtonElement) || !(secondButton instanceof HTMLButtonElement) || !firstImage || !secondImage) {
      if (Date.now() - started > 5000) {
        clearInterval(timer);
        finish({ status: 'sale-list-not-ready' });
      }
      return;
    }

    clearInterval(timer);
    const saleOne = describeImage(firstImage);
    const saleTwo = describeImage(secondImage);
    firstButton.click();

    setTimeout(() => {
      const activeOne = activeRow(901);
      const activeImage = activeOne?.querySelector('.market-job-weapon-image');
      const secondAfterFirstSale = saleRow(902);
      const secondAfterFirstButton = secondAfterFirstSale?.querySelector('button');
      if (!activeImage || !(secondAfterFirstButton instanceof HTMLButtonElement)) {
        finish({ status: 'active-sale-not-ready', saleOne, saleTwo });
        return;
      }
      const activeOneImage = describeImage(activeImage);
      secondAfterFirstButton.click();

      setTimeout(() => {
        const queuedTwo = queueRow(902);
        const queueImage = queuedTwo?.querySelector('.market-queue-weapon-image');
        const cancel = activeRow(901)?.querySelector('[data-market-cancel="active"]');
        if (!queueImage || !(cancel instanceof HTMLButtonElement)) {
          finish({ status: 'queued-sale-not-ready', saleOne, saleTwo, activeOneImage });
          return;
        }
        const queuedTwoImage = describeImage(queueImage);
        cancel.click();

        setTimeout(() => {
          const returned = saleRow(901);
          const returnedImage = returned?.querySelector('.market-weapon-sale-image');
          const promoted = activeRow(902);
          const promotedImage = promoted?.querySelector('.market-job-weapon-image');
          finish({
            status: returnedImage && promotedImage ? 'tested' : 'cancel-return-not-ready',
            saleOne,
            saleTwo,
            activeOne: activeOneImage,
            queuedTwo: queuedTwoImage,
            returnedOne: describeImage(returnedImage),
            promotedTwo: describeImage(promotedImage),
            queueEmptyAfterPromotion: !queueRow(902),
            returnedTitle: returned?.querySelector('strong')?.textContent?.trim() || '',
            promotedTitle: promoted?.querySelector('strong')?.textContent?.trim() || ''
          });
        }, 180);
      }, 180);
    }, 180);
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
const browserProfile = mkdtempSync(join(tmpdir(), 'nobrainer-market-weapon-images-e2e-'));
let child = null;
try {
  const address = server.address(); assert.ok(address && typeof address === 'object');
  const pageUrl = `http://127.0.0.1:${address.port}${basePath}`;
  child = spawn(browser, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${browserProfile}`, '--virtual-time-budget=7500', '--dump-dom', pageUrl], { stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
  let stdout = '', stderr = ''; child.stdout.on('data', chunk => { stdout += chunk; }); child.stderr.on('data', chunk => { stderr += chunk; });
  const code = await new Promise((resolveClose, rejectClose) => { child.once('error', rejectClose); child.once('close', resolveClose); });
  assert.equal(code, 0, `Chrome/Chromium beendete den Markt-Waffenbild-E2E-Test mit Code ${code}.\n${stderr}`);
  const resultMatch = stdout.match(/<pre id="marketWeaponImageE2EResult">([^<]+)<\/pre>/);
  assert.ok(resultMatch, `Der Markt-Waffenbild-E2E-Test hat kein Ergebnis erzeugt.\n${stderr}\nDOM-Ausgabe: ${stdout.slice(-6000)}`);
  const result = JSON.parse(resultMatch[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&'));

  assert.equal(result.status, 'tested', `Der Markt-Waffenbild-Ablauf wurde nicht vollständig testbereit: ${JSON.stringify(result)}`);
  assert.equal(result.browserErrors.length, 0, `Beim Markt-Waffenbild-Ablauf trat ein Browserfehler auf: ${JSON.stringify(result)}`);
  assert.equal(result.runtimeError, '', `Die Runtime meldet beim Markt-Waffenbild-Ablauf einen Fehler: ${JSON.stringify(result)}`);
  assert.deepEqual(result.activeOne, result.saleOne, 'Die aktive Verkaufsdarstellung stimmt nicht mit der Verkaufsliste derselben Waffe überein.');
  assert.deepEqual(result.queuedTwo, result.saleTwo, 'Die Warteschlange stimmt nicht mit der Verkaufsliste derselben Waffe überein.');
  assert.deepEqual(result.returnedOne, result.saleOne, 'Nach Abbruch kehrt die Waffe nicht mit identischer Materialdarstellung in die Verkaufsliste zurück.');
  assert.deepEqual(result.promotedTwo, result.saleTwo, 'Die aus der Warteschlange nachgerückte Waffe verändert ihre Materialdarstellung.');
  assert.equal(result.queueEmptyAfterPromotion, true, 'Nach Abbruch des aktiven Verkaufs muss die Warteschlangenwaffe in den aktiven Slot nachrücken.');
  assert.match(result.returnedTitle, /Marktdolch/, 'Die abgebrochene Waffe wurde nicht in die Verkaufsliste zurückgegeben.');
  assert.match(result.promotedTitle, /Marktschwert/, 'Die Warteschlangenwaffe wurde nach Abbruch nicht zum aktiven Verkauf.');

  console.log('Markt-Waffenbild-Browserregression: Verkaufsliste, aktiver Verkauf, Warteschlange, Nachrücken und Rückgabe verwenden identische zentrale Materialwaffenbilder.');
} finally {
  if (child) await stopBrowser(child);
  rmSync(browserProfile, { recursive: true, force: true });
  await new Promise(resolveClose => server.close(resolveClose));
}
