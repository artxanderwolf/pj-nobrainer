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
      Fichte: { category: 'Holz', qty: 7 },
      Zinn: { category: 'Metall', qty: 20 },
      Lederfetzen: { category: 'Leder', qty: 9 }
    },
    weaponCraftCounts: {
      dagger: 10,
      sword: 10,
      axe1h: 10,
      sword2h: 10,
      axe2h: 10
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

  const describeImage = image => {
    if (!(image instanceof HTMLElement)) return null;
    const style = getComputedStyle(image);
    const layers = [...image.querySelectorAll('.weapon-image-layer')].map(layer => ({
      name: layer.getAttribute('data-weapon-image-layer') || '',
      color: getComputedStyle(layer).backgroundColor
    }));
    return {
      form: image.getAttribute('data-weapon-form') || '',
      kind: image.getAttribute('data-weapon-image-kind') || '',
      cssWidth: style.width,
      cssHeight: style.height,
      layers
    };
  };

  const choose = (id, value) => {
    const select = document.getElementById(id);
    if (!(select instanceof HTMLSelectElement)) return false;
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return select.value === value;
  };

  const chooseWeapon = value => {
    const picker = document.getElementById('forgeWeaponPicker');
    const button = picker?.querySelector('[data-weapon-form="' + value + '"]');
    if (!(picker instanceof HTMLDetailsElement) || !(button instanceof HTMLButtonElement)) return false;
    picker.open = true;
    button.click();
    return document.getElementById('weaponForm')?.value === value;
  };

  const started = Date.now();
  const timer = setInterval(() => {
    const form = document.getElementById('weaponForm');
    const picker = document.getElementById('forgeWeaponPicker');
    const back = document.getElementById('slotBack');
    if (form instanceof HTMLSelectElement && picker instanceof HTMLDetailsElement && back instanceof HTMLSelectElement && back.options.length > 1) {
      clearInterval(timer);
      const formChosen = chooseWeapon('bow');
      setTimeout(() => {
        const incompletePreview = describeImage(document.querySelector('#forgeWeaponImagePreview .forge-preview-weapon-image'));
        const previewOwner = document.getElementById('forgeWeaponImagePreview')?.dataset.forgeWeaponImageOwner || '';
        const selected = {
          back: choose('slotBack', '2'),
          gripCore: choose('slotGripCore', '2'),
          gripWrap: choose('slotGripWrap', '9'),
          special: choose('slotSpecial', '2'),
          bowstring: choose('slotBowstring', '9'),
          form: formChosen
        };
        setTimeout(() => {
          const completePreview = describeImage(document.querySelector('#forgeWeaponImagePreview .forge-preview-weapon-image'));
          const forgePage = document.getElementById('forge-form');
          const forgeCard = forgePage?.querySelector('.forge-build-card');
          const slotWrap = forgePage?.querySelector('.forge-slot-wrap');
          const pickerOptions = document.getElementById('forgeWeaponPickerOptions');
          const pickerText = picker.textContent?.replace(/\\s+/g, ' ').trim() || '';
          const previewButton = document.getElementById('forgePreviewNextBtn');
          const previewNextDisabled = previewButton instanceof HTMLButtonElement ? previewButton.disabled : null;
          const compactUi = {
            pickerText,
            completedProgressVisible: /10\\/10/.test(pickerText),
            oldHeadingsVisible: /1\\. Waffenform wählen|2\\. Materialien wählen|Waffenform bestimmt Bauteile|Materialbedarf:|belegt eine Hand|belegt beide Hände/.test(forgePage?.textContent || ''),
            materialSummaryPresent: Boolean(document.getElementById('forgeMaterialTotalPreview')),
            constructionInfoPresent: Boolean(document.getElementById('forgeParryInfo')),
            cardOverflowY: forgeCard ? getComputedStyle(forgeCard).overflowY : '',
            cardFits: forgeCard ? forgeCard.scrollHeight <= forgeCard.clientHeight + 1 : false,
            slotOverflowY: slotWrap ? getComputedStyle(slotWrap).overflowY : '',
            pickerOverflowY: pickerOptions ? getComputedStyle(pickerOptions).overflowY : '',
            pickerOwner: picker.dataset.forgeWeaponPickerOwner || ''
          };
          if (previewButton instanceof HTMLButtonElement) previewButton.click();
          setTimeout(() => {
            const startButton = document.getElementById('forgeStartBtn');
            const beforeStart = {
              startDisabled: startButton instanceof HTMLButtonElement ? startButton.disabled : null,
              activePage: document.querySelector('.page.active')?.id || '',
              capacityText: document.getElementById('forgeCapacityStatus')?.textContent || ''
            };
            if (startButton instanceof HTMLButtonElement) startButton.click();
            setTimeout(() => {
              finish({
                status: 'tested',
                selected,
                finalForm: document.getElementById('weaponForm')?.value || '',
                timeText: document.getElementById('forgeTimePreview')?.textContent || '',
                damageText: document.getElementById('forgeDamagePreview')?.textContent || '',
                speedText: document.getElementById('forgeSpeedPreview')?.textContent || '',
                previewNextDisabled,
                previewOwner,
                incompletePreview,
                completePreview,
                activeJobImage: describeImage(document.querySelector('#forgeJobCard .forge-job-weapon-image')),
                compactUi,
                beforeStart,
                forgeJobText: document.getElementById('forgeJobCard')?.textContent?.replace(/\\s+/g, ' ').trim() || '',
                forgeQueueText: document.getElementById('forgeQueueCard')?.textContent?.replace(/\\s+/g, ' ').trim() || '',
                afterStartDisabled: document.getElementById('forgeStartBtn')?.disabled ?? null,
                selectedAfterStart: {
                  back: document.getElementById('slotBack')?.value || '',
                  gripCore: document.getElementById('slotGripCore')?.value || '',
                  gripWrap: document.getElementById('slotGripWrap')?.value || '',
                  special: document.getElementById('slotSpecial')?.value || '',
                  bowstring: document.getElementById('slotBowstring')?.value || ''
                },
                workingPartHidden: document.getElementById('forgeWorkingPartRow')?.hidden ?? false,
                parryHidden: document.getElementById('forgeParryRow')?.hidden ?? false,
                bowstringHidden: document.getElementById('forgeBowstringRow')?.hidden ?? true,
                oldBaseMaterialPresent: Boolean(document.getElementById('slotBaseMaterial'))
              });
            }, 120);
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
  child = spawn(browser, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${browserProfile}`, '--window-size=390,844', '--virtual-time-budget=6500', '--dump-dom', pageUrl], { stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
  let stdout = '', stderr = ''; child.stdout.on('data', chunk => { stdout += chunk; }); child.stderr.on('data', chunk => { stderr += chunk; });
  const code = await new Promise((resolveClose, rejectClose) => { child.once('error', rejectClose); child.once('close', resolveClose); });
  assert.equal(code, 0, `Chrome/Chromium beendete den Schmiedeauswahl-E2E-Test mit Code ${code}.\n${stderr}`);
  const resultMatch = stdout.match(/<pre id="forgeSelectionE2EResult">([^<]+)<\/pre>/);
  assert.ok(resultMatch, `Der Schmiedeauswahl-E2E-Test hat kein Ergebnis erzeugt.\n${stderr}\nDOM-Ausgabe: ${stdout.slice(-5000)}`);
  const result = JSON.parse(resultMatch[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&'));

  assert.equal(result.status, 'tested', `Die Schmiedeauswahl wurde nicht testbereit: ${JSON.stringify(result)}`);
  assert.equal(result.browserErrors.length, 0, `Bei der Schmiedeauswahl oder beim Schmiedestart trat ein Browserfehler auf: ${JSON.stringify(result)}`);
  assert.equal(result.runtimeError, '', `Die Runtime meldet bei der Schmiedeauswahl einen Fehler: ${JSON.stringify(result)}`);
  assert.deepEqual(result.selected, { back: true, gripCore: true, gripWrap: true, special: true, bowstring: true, form: true });
  assert.equal(result.finalForm, 'bow');
  assert.equal(result.previewNextDisabled, false, 'Der Vorschau-Button darf nach der Materialauswahl nicht blockiert bleiben.');
  assert.equal(result.previewOwner, 'angular', 'Die Waffengrafik der Schmiedevorschau ist nicht Angular-eigen.');
  assert.ok(result.incompletePreview, 'Die unvollständige Schmiedevorschau besitzt kein Waffenbild.');
  assert.equal(result.incompletePreview.form, 'bow');
  assert.equal(result.incompletePreview.kind, 'materials', 'Offene Schmiedekomponenten müssen im Previewmodus einzeln grau bleiben, nicht als Gesamtfallback.');
  assert.equal(result.incompletePreview.cssWidth, '64px');
  assert.equal(result.incompletePreview.cssHeight, '64px');
  assert.deepEqual(result.incompletePreview.layers.map(layer => layer.name), ['back', 'gripCore', 'gripWrap', 'bowstring', 'outline']);
  assert.ok(result.incompletePreview.layers.slice(0, 4).every(layer => layer.color === 'rgb(138, 138, 138)'), 'Noch offene sichtbare Schmiedekomponenten sind nicht grau.');
  assert.ok(result.completePreview, 'Die vollständige Schmiedevorschau besitzt kein Waffenbild.');
  assert.equal(result.completePreview.form, 'bow');
  assert.equal(result.completePreview.kind, 'materials');
  assert.equal(result.completePreview.cssWidth, '64px');
  assert.equal(result.completePreview.cssHeight, '64px');
  assert.deepEqual(result.completePreview.layers, [
    { name: 'back', color: 'rgb(126, 88, 53)' },
    { name: 'gripCore', color: 'rgb(126, 88, 53)' },
    { name: 'gripWrap', color: 'rgb(112, 83, 64)' },
    { name: 'bowstring', color: 'rgb(112, 83, 64)' },
    { name: 'outline', color: 'rgb(0, 0, 0)' }
  ]);
  assert.ok(result.activeJobImage, 'Der aktive Schmiedeauftrag besitzt kein Waffenbild.');
  assert.equal(result.activeJobImage.form, result.completePreview.form, 'Aktiver Auftrag verwendet nicht dieselbe Waffenform wie die Vorschau.');
  assert.equal(result.activeJobImage.kind, result.completePreview.kind, 'Aktiver Auftrag verwendet nicht denselben Material-Renderplan wie die Vorschau.');
  assert.deepEqual(result.activeJobImage.layers, result.completePreview.layers, 'Schmiedevorschau und aktiver Auftrag zeigen dieselbe Waffe unterschiedlich.');
  assert.equal(result.compactUi.pickerOwner, 'angular', 'Die sichtbare Waffenwahl ist nicht Angular-eigen.');
  assert.equal(result.compactUi.completedProgressVisible, false, 'Abgeschlossene 10/10-Fortschritte dürfen in der Waffenwahl nicht sichtbar bleiben.');
  assert.equal(result.compactUi.oldHeadingsVisible, false, 'Entfernte Schmiede-Erklärungstexte sind noch sichtbar.');
  assert.equal(result.compactUi.materialSummaryPresent, false, 'Der entfernte Materialbedarf-Block existiert noch.');
  assert.equal(result.compactUi.constructionInfoPresent, false, 'Der entfernte 1H/2H-Hinweis existiert noch.');
  assert.equal(result.compactUi.cardOverflowY, 'hidden', 'Die Waffenherstellungs-Karte darf nicht scrollen.');
  assert.equal(result.compactUi.cardFits, true, 'Die Waffenherstellung passt auf dem mobilen Testviewport nicht vollständig in ihre feste Karte.');
  assert.notEqual(result.compactUi.slotOverflowY, 'auto', 'Die Materialauswahl darf nicht scrollbar sein.');
  assert.notEqual(result.compactUi.slotOverflowY, 'scroll', 'Die Materialauswahl darf nicht scrollbar sein.');
  assert.notEqual(result.compactUi.pickerOverflowY, 'auto', 'Die Waffenwahl darf nicht scrollbar sein.');
  assert.notEqual(result.compactUi.pickerOverflowY, 'scroll', 'Die Waffenwahl darf nicht scrollbar sein.');
  assert.equal(result.beforeStart.startDisabled, false, 'Waffe herstellen muss bei vollständiger Auswahl und ausreichendem Bestand aktiv sein.');
  assert.equal(result.beforeStart.activePage, 'forge-preview', 'Der Vorschau-Button muss zur Waffenvorschau navigieren.');
  assert.match(result.beforeStart.capacityText, /^Schmiede \d+\/\d+ · Warteschlange \d+\/\d+$/, 'Die Waffenvorschau muss aktive und maximale Schmiedekapazität anzeigen.');
  assert.match(result.forgeJobText, /Bogen/, 'Der Klick auf Waffe herstellen muss einen aktiven Schmiedeauftrag erzeugen.');
  assert.equal(result.afterStartDisabled, true, 'Nach vollständigem Verbrauch der ausgewählten Materialien darf kein weiterer Auftrag möglich sein.');
  assert.deepEqual(result.selectedAfterStart, { back: '', gripCore: '', gripWrap: '', special: '', bowstring: '' }, 'Verbrauchte Materialauswahlen müssen nach dem Auftrag aus den Selects entfernt werden.');
  assert.equal(result.workingPartHidden, true);
  assert.equal(result.parryHidden, true);
  assert.equal(result.bowstringHidden, false);
  assert.equal(result.oldBaseMaterialPresent, false);

  console.log('Schmiede-Browserregression: Preview zeigt offene Teile grau und fertige Materialfarben; aktive Aufträge übernehmen exakt dasselbe 64x64-Waffenbild.');
} finally {
  if (child) await stopBrowser(child);
  rmSync(browserProfile, { recursive: true, force: true });
  await new Promise(resolveClose => server.close(resolveClose));
}
