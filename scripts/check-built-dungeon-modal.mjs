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
assert.ok(browser, 'Chrome/Chromium wurde für den Dungeon-Popup-E2E-Test nicht gefunden.');

const errorScript = `<script>
window.__dungeonModalErrors=[];
window.addEventListener('error',event=>window.__dungeonModalErrors.push(String(event.error?.stack||event.message||event.error||'error')));
window.addEventListener('unhandledrejection',event=>window.__dungeonModalErrors.push(String(event.reason?.stack||event.reason||'rejection')));
</script>`;

const probeScript = `<script>
(() => {
  const normalize = value => String(value || '').replace(/\\s+/g, ' ').trim();
  const finish = result => {
    if (document.getElementById('dungeonModalE2EResult')) return;
    const node = document.createElement('pre');
    node.id = 'dungeonModalE2EResult';
    node.textContent = JSON.stringify({
      ...result,
      runtimeError: document.querySelector('.legacy-host')?.getAttribute('data-runtime-error') || '',
      browserErrors: Array.isArray(window.__dungeonModalErrors) ? window.__dungeonModalErrors : []
    });
    document.body.appendChild(node);
  };

  const started = Date.now();
  const timer = setInterval(() => {
    const open = document.getElementById('dungeonOverviewOpenBtn');
    const primary = document.getElementById('dungeonPrimaryBtn');
    const modal = document.getElementById('dungeon-select');
    if (open && primary && modal && !open.getAttribute('onclick')) {
      clearInterval(timer);
      document.querySelector('[data-page="dungeon"]')?.click();
      open.click();
      setTimeout(() => {
        const firstTeamText = normalize(document.getElementById('dungeonTeamCard')?.textContent);
        const first = {
          modalOpen: modal.classList.contains('dungeon-modal-open') && !modal.hidden,
          slotCount: document.querySelectorAll('#dungeonTeamCard .team-slot').length,
          teamText: firstTeamText,
          timeText: normalize(document.getElementById('dungeonTimeText')?.textContent),
          timeWidth: document.getElementById('dungeonTimeBar')?.style.width || '',
          hiddenOverviewAction: Boolean(document.getElementById('dungeonOverviewAction')?.hidden),
          introText: normalize(modal.querySelector('.dungeon-modal-intro')?.textContent)
        };

        primary.click();
        setTimeout(() => {
          const running = {
            primaryText: normalize(primary.textContent),
            disabledTeamActions: document.querySelectorAll('#dungeonTeamCard [data-dungeon-action][disabled]').length,
            timeText: normalize(document.getElementById('dungeonTimeText')?.textContent),
            timeWidth: document.getElementById('dungeonTimeBar')?.style.width || ''
          };

          document.getElementById('dungeonModalCloseBtn')?.click();
          setTimeout(() => {
            const closed = modal.hidden && !modal.classList.contains('dungeon-modal-open');
            open.click();
            setTimeout(() => {
              const reopenedTeamText = normalize(document.getElementById('dungeonTeamCard')?.textContent);
              finish({
                status: 'checked',
                first,
                running,
                closed,
                reopened: {
                  modalOpen: modal.classList.contains('dungeon-modal-open') && !modal.hidden,
                  primaryText: normalize(primary.textContent),
                  timeText: normalize(document.getElementById('dungeonTimeText')?.textContent),
                  teamText: reopenedTeamText,
                  logText: normalize(document.getElementById('dungeonCombatLog')?.textContent),
                  enemyText: normalize(document.getElementById('dungeonActiveEnemies')?.textContent)
                }
              });
            }, 150);
          }, 150);
        }, 450);
      }, 150);
      return;
    }

    if (Date.now() - started > 4000) {
      clearInterval(timer);
      finish({ status: 'runtime-not-ready' });
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

const browserProfile = mkdtempSync(join(tmpdir(), 'nobrainer-dungeon-modal-e2e-'));
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
    '--virtual-time-budget=7000',
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

  assert.equal(code, 0, `Chrome/Chromium beendete den Dungeon-Popup-E2E-Test mit Code ${code}.\n${stderr}`);
  const resultMatch = stdout.match(/<pre id="dungeonModalE2EResult">([^<]+)<\/pre>/);
  assert.ok(resultMatch, `Der Dungeon-Popup-E2E-Test hat kein Ergebnis erzeugt.\n${stderr}\nDOM-Ausgabe: ${stdout.slice(-5000)}`);
  const decoded = resultMatch[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&');
  const result = JSON.parse(decoded);

  assert.equal(result.status, 'checked', `Dungeon-Popup-Runtime wurde nicht bereit: ${JSON.stringify(result)}`);
  assert.equal(result.browserErrors.length, 0, `Beim Dungeon-Popup trat ein Browserfehler auf: ${JSON.stringify(result)}`);
  assert.equal(result.runtimeError, '', `Die Runtime meldet während des Dungeon-Popup-Tests einen Fehler: ${JSON.stringify(result)}`);
  assert.equal(result.first.modalOpen, true, 'Dungeon 1 öffnet sich nicht als Popup.');
  assert.equal(result.first.slotCount, 4, 'Dungeon 1 zeigt nicht genau vier Charakterplätze.');
  assert.equal(/\bEN\b|Energie/i.test(result.first.teamText), false, `Dungeon-Team zeigt weiterhin Energie: ${result.first.teamText}`);
  assert.equal(result.first.timeText, '05:00:00', 'Dungeon 1 startet nicht mit fünf Stunden Laufzeit.');
  assert.equal(result.first.timeWidth, '100%', 'Dungeon-Laufzeitbalken startet nicht vollständig gefüllt.');
  assert.equal(result.first.hiddenOverviewAction, true, 'Der alte zusätzliche Dungeon-Hubknopf ist weiterhin sichtbar.');
  assert.match(result.first.introText, /5 Stunden/);
  assert.match(result.first.introText, /manuellen Abbruch/);

  assert.equal(result.running.primaryText, 'Lauf abbrechen', 'Ein gestarteter Dungeon kann nicht manuell abgebrochen werden.');
  assert.ok(result.running.disabledTeamActions > 0, 'Teamauswahl bleibt während eines laufenden Dungeons editierbar.');
  assert.match(result.running.timeText, /^0[0-5]:[0-5]\d:[0-5]\d$/);
  assert.notEqual(result.running.timeWidth, '', 'Laufzeitbalken wird während des Runs nicht aktualisiert.');

  assert.equal(result.closed, true, 'Schließen beendet das Dungeon-Popup nicht.');
  assert.equal(result.reopened.modalOpen, true, 'Dungeon 1 kann nach dem Schließen nicht erneut geöffnet werden.');
  assert.equal(result.reopened.primaryText, 'Lauf starten', 'Nach erneutem Öffnen läuft die alte Dungeon-Sitzung weiter.');
  assert.equal(result.reopened.timeText, '05:00:00', 'Der Countdown wird beim erneuten Öffnen nicht zurückgesetzt.');
  assert.match(result.reopened.teamText, /Platz 1:/, 'Die zuletzt gewählte Charaktergruppe wird beim erneuten Öffnen nicht wiederverwendet.');
  assert.match(result.reopened.logText, /Noch kein Lauf gestartet/);
  assert.match(result.reopened.enemyText, /Keine aktiven Gegner/);

  console.log('Dungeon-Popup-Browserregression: 2x2-Team, energiefreie Ansicht, 5-Stunden-Balken, Run-Sperre und Session-Reset beim Schließen sind konsistent.');
} finally {
  if (child) await stopBrowser(child);
  rmSync(browserProfile, { recursive: true, force: true });
  await new Promise(resolveClose => server.close(resolveClose));
}
