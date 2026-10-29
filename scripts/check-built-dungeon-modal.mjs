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
assert.ok(browser, 'Chrome/Chromium wurde für den Trainingslager-Popup-E2E-Test nicht gefunden.');

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
  const layoutSnapshot = () => {
    const dialog = document.querySelector('.dungeon-modal-dialog');
    const layout = document.querySelector('.dungeon-modal-layout');
    const log = document.getElementById('dungeonCombatLog');
    if (!dialog || !layout || !log) return null;
    return {
      dialogClientHeight: dialog.clientHeight,
      dialogScrollHeight: dialog.scrollHeight,
      dialogOverflowY: getComputedStyle(dialog).overflowY,
      layoutClientHeight: layout.clientHeight,
      layoutScrollHeight: layout.scrollHeight,
      layoutOverflowY: getComputedStyle(layout).overflowY,
      logOverflowY: getComputedStyle(log).overflowY,
      bodyOverflowY: getComputedStyle(document.body).overflowY
    };
  };

  const started = Date.now();
  const timer = setInterval(() => {
    const open = document.getElementById('dungeonOverviewOpenBtn');
    const primary = document.getElementById('dungeonPrimaryBtn');
    const modal = document.getElementById('dungeon-select');
    if (open && primary && modal && !open.getAttribute('onclick')) {
      clearInterval(timer);
      document.querySelector('[data-page="dungeon"]')?.click();
      setTimeout(() => {
        const hubTitle = normalize(document.querySelector('.dungeon-overview-card .menu-card-title')?.textContent);
        open.click();
        setTimeout(() => {
          const firstTeamText = normalize(document.getElementById('dungeonTeamCard')?.textContent);
          const first = {
            hubTitle,
            modalOpen: modal.classList.contains('dungeon-modal-open') && !modal.hidden,
            modalTitle: normalize(document.getElementById('dungeonModalTitle')?.textContent),
            slotCount: document.querySelectorAll('#dungeonTeamCard .team-slot').length,
            characterHpBars: document.querySelectorAll('#dungeonTeamCard .dungeon-character-hp').length,
            teamText: firstTeamText,
            timeText: normalize(document.getElementById('dungeonTimeText')?.textContent),
            timeWidth: document.getElementById('dungeonTimeBar')?.style.width || '',
            teamPurchasePresent: Boolean(document.getElementById('buyTeamButton')),
            layout: layoutSnapshot()
          };

          primary.click();
          setTimeout(() => {
            const running = {
              primaryText: normalize(primary.textContent),
              disabledTeamActions: document.querySelectorAll('#dungeonTeamCard [data-dungeon-action][disabled]').length,
              timeText: normalize(document.getElementById('dungeonTimeText')?.textContent),
              timeWidth: document.getElementById('dungeonTimeBar')?.style.width || '',
              logText: normalize(document.getElementById('dungeonCombatLog')?.textContent)
            };

            document.getElementById('dungeonModalCloseBtn')?.click();
            setTimeout(() => {
              const closed = {
                hidden: modal.hidden && !modal.classList.contains('dungeon-modal-open'),
                hubCopy: normalize(document.querySelector('.dungeon-overview-card .menu-card-copy')?.textContent)
              };
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
                    timeWidth: document.getElementById('dungeonTimeBar')?.style.width || '',
                    teamText: reopenedTeamText,
                    logText: normalize(document.getElementById('dungeonCombatLog')?.textContent),
                    enemyText: normalize(document.getElementById('dungeonActiveEnemies')?.textContent),
                    layout: layoutSnapshot()
                  }
                });
              }, 300);
            }, 1700);
          }, 1300);
        }, 200);
      }, 100);
      return;
    }

    if (Date.now() - started > 5000) {
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
function timeToSeconds(value) {
  const parts = String(value).split(':').map(Number);
  assert.equal(parts.length, 3, `Ungültige Laufzeitanzeige: ${value}`);
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

await new Promise((resolveListen, rejectListen) => {
  server.once('error', rejectListen);
  server.listen(0, '127.0.0.1', resolveListen);
});

const browserProfile = mkdtempSync(join(tmpdir(), 'nobrainer-trainingslager-modal-e2e-'));
let child = null;
try {
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const pageUrl = `http://127.0.0.1:${address.port}${basePath}`;
  child=spawn(browser,[
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=390,844',
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
  const code = await new Promise((resolveClose, rejectClose) => {
    child.once('error', rejectClose);
    child.once('close', resolveClose);
  });

  assert.equal(code, 0, `Chrome/Chromium beendete den Trainingslager-Popup-E2E-Test mit Code ${code}.\n${stderr}`);
  const resultMatch = stdout.match(/<pre id="dungeonModalE2EResult">([^<]+)<\/pre>/);
  assert.ok(resultMatch, `Der Trainingslager-Popup-E2E-Test hat kein Ergebnis erzeugt.\n${stderr}\nDOM-Ausgabe: ${stdout.slice(-5000)}`);
  const decoded = resultMatch[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&');
  const result = JSON.parse(decoded);

  assert.equal(result.status, 'checked', `Trainingslager-Popup-Runtime wurde nicht bereit: ${JSON.stringify(result)}`);
  assert.equal(result.browserErrors.length, 0, `Beim Trainingslager-Popup trat ein Browserfehler auf: ${JSON.stringify(result)}`);
  assert.equal(result.runtimeError, '', `Die Runtime meldet während des Trainingslager-Popup-Tests einen Fehler: ${JSON.stringify(result)}`);
  assert.equal(result.first.hubTitle, 'Team 1', 'Dungeon 1 verwendet im Hub nicht den Anzeigenamen Trainingslager.');
  assert.equal(result.first.modalTitle, 'Team 1 · Trainingslager', 'Das Popup verwendet nicht den Anzeigenamen Trainingslager.');
  assert.equal(result.first.modalOpen, true, 'Trainingslager öffnet sich nicht als Popup.');
  assert.equal(result.first.slotCount, 4, 'Trainingslager zeigt nicht genau vier Charakterplätze.');
  assert.ok(result.first.characterHpBars > 0, 'Belegte Charakterplätze zeigen keinen Lebensbalken.');
  assert.equal(/\bEN\b|Energie|\bHP\b/i.test(result.first.teamText), false, `Dungeon-Team zeigt weiterhin numerische Ressourcenlabels: ${result.first.teamText}`);
  assert.equal(result.first.timeText, '05:00:00', 'Trainingslager startet nicht mit fünf Stunden Laufzeit.');
  assert.equal(result.first.timeWidth, '100%', 'Laufzeitbalken startet nicht vollständig gefüllt.');
  assert.equal(result.first.teamPurchasePresent, true, 'Der alte zusätzliche Dungeon-Hubknopf ist weiterhin sichtbar.');
  assert.ok(result.first.layout, 'Layoutmessung fehlt.');
  assert.equal(result.first.layout.dialogOverflowY, 'hidden', 'Der Trainingslager-Dialog ist weiterhin scrollbar.');
  assert.equal(result.first.layout.layoutOverflowY, 'hidden', 'Die Trainingslager-Gesamtansicht ist weiterhin scrollbar.');
  assert.ok(result.first.layout.dialogScrollHeight <= result.first.layout.dialogClientHeight + 2, 'Der Dialog benötigt vertikales Scrollen.');
  assert.ok(result.first.layout.layoutScrollHeight <= result.first.layout.layoutClientHeight + 2, 'Die Dungeon-Anzeige passt nicht vollständig in die verfügbare Höhe.');
  assert.equal(result.first.layout.logOverflowY, 'auto', 'Das Protokoll besitzt keinen eigenen Scrollbereich.');

  assert.equal(result.running.primaryText, 'Lauf abbrechen', 'Ein gestarteter Trainingslager-Run kann nicht manuell abgebrochen werden.');
  assert.ok(result.running.disabledTeamActions > 0, 'Teamauswahl bleibt während eines laufenden Trainingslagers editierbar.');
  assert.match(result.running.timeText, /^0[0-4]:[0-5]\d:[0-5]\d$/);
  assert.ok(timeToSeconds(result.running.timeText) < 5 * 3600, 'Der Countdown läuft nach dem Start nicht herunter.');
  assert.match(result.running.logText, /Trainingslager/, 'Der Start des Runs erscheint nicht im Live-Protokoll.');
  assert.equal(/\([\d.,]+\s*HP\)/i.test(result.running.logText), false, `Das Live-Protokoll zeigt weiterhin numerische Rest-HP: ${result.running.logText}`);

  assert.equal(result.closed.hidden, true, 'Schließen blendet das Trainingslager-Popup nicht aus.');
  assert.match(result.closed.hubCopy, /Trainingslager.*verbleibend/, 'Die Teamkarte zeigt Ziel und Restzeit des Hintergrundlaufs nicht an.');
  assert.equal(result.reopened.modalOpen, true, 'Trainingslager kann nach dem Schließen nicht erneut geöffnet werden.');
  assert.equal(result.reopened.primaryText, 'Lauf abbrechen', 'Schließen des Popups beendet den laufenden Trainingslager-Run.');
  assert.ok(timeToSeconds(result.reopened.timeText) < timeToSeconds(result.running.timeText), 'Der Countdown ist bei geschlossenem Popup nicht weitergelaufen.');
  assert.match(result.reopened.teamText, /Platz 1:/, 'Die gewählte Charaktergruppe ist beim erneuten Öffnen nicht mehr vorhanden.');
  assert.match(result.reopened.logText, /Trainingslager/, 'Das Live-Protokoll desselben Runs wurde beim Schließen verworfen.');
  assert.doesNotMatch(result.reopened.logText, /^Noch kein Lauf gestartet\.$/, 'Das Live-Protokoll wurde beim erneuten Öffnen zurückgesetzt.');
  assert.ok(result.reopened.layout.layoutScrollHeight <= result.reopened.layout.layoutClientHeight + 2, 'Die wiedergeöffnete Dungeon-Anzeige ist vertikal scrollbar.');
  assert.equal(result.reopened.layout.logOverflowY, 'auto', 'Nur das Protokoll soll intern scrollbar bleiben.');

  console.log('Trainingslager-Popup-Browserregression: 2x2-Team, reine Lebensbalken, einseitiges Layout und fortlaufender 5-Stunden-Run bei geschlossenem Popup sind konsistent.');
} finally {
  if (child) await stopBrowser(child);
  rmSync(browserProfile, { recursive: true, force: true });
  await new Promise(resolveClose => server.close(resolveClose));
}
