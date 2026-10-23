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
assert.ok(browser, 'Chrome/Chromium wurde für den gemeinsamen Waffenkarten-Browsertest nicht gefunden.');

const probeScript = `<script>
window.__sharedWeaponCardErrors=[];
window.addEventListener('error',event=>window.__sharedWeaponCardErrors.push(String(event.error?.stack||event.message||event.error||'error')));
window.addEventListener('unhandledrejection',event=>window.__sharedWeaponCardErrors.push(String(event.reason?.stack||event.reason||'rejection')));
(() => {
  const finish = result => {
    if (document.getElementById('sharedWeaponCardResult')) return;
    const node = document.createElement('pre');
    node.id = 'sharedWeaponCardResult';
    node.textContent = JSON.stringify({
      ...result,
      runtimeError: document.querySelector('.legacy-host')?.getAttribute('data-runtime-error') || '',
      browserErrors: window.__sharedWeaponCardErrors
    });
    document.body.appendChild(node);
  };

  const describeImage = image => {
    if (!(image instanceof HTMLElement)) return null;
    const style = getComputedStyle(image);
    const layers = [...image.querySelectorAll('.weapon-image-layer')].map(layer => {
      const layerStyle = getComputedStyle(layer);
      return {
        name: layer.getAttribute('data-weapon-image-layer') || '',
        color: layerStyle.backgroundColor,
        maskImage: layerStyle.maskImage && layerStyle.maskImage !== 'none' ? layerStyle.maskImage : layerStyle.webkitMaskImage,
        maskPosition: layerStyle.maskPosition && layerStyle.maskPosition !== '0% 0%' ? layerStyle.maskPosition : layerStyle.webkitMaskPosition
      };
    });
    const generic = image.querySelector('.weapon-image-generic-shape');
    return {
      form: image.getAttribute('data-weapon-form') || '',
      kind: image.getAttribute('data-weapon-image-kind') || '',
      cssWidth: style.width,
      cssHeight: style.height,
      layers,
      genericColor: generic ? getComputedStyle(generic).backgroundColor : ''
    };
  };

  const started = Date.now();
  const timer = setInterval(() => {
    const inventoryCard = document.querySelector('#weaponInventory .weapon-card');
    const inventoryImage = inventoryCard?.querySelector('.weapon-card-image');
    const inventoryAction = inventoryCard?.querySelector('[data-weapon-inventory-action]');
    const characterNav = document.querySelector('#nav button[data-page="character"]');
    const rosterMenu = document.querySelector('#character .menu-card[onclick*="roster"]');
    if (!inventoryCard || !inventoryImage || !inventoryAction || !characterNav || !rosterMenu) {
      if (Date.now() - started > 6000) {
        clearInterval(timer);
        finish({ status: 'initial-ui-not-ready' });
      }
      return;
    }

    clearInterval(timer);
    const title = inventoryCard.querySelector('.weapon-card-title')?.textContent?.trim() || '';
    const inventory = describeImage(inventoryImage);
    characterNav.click();
    rosterMenu.click();

    setTimeout(() => {
      document.querySelector('#rosterCard .roster-list-item')?.click();
      setTimeout(() => {
        document.querySelector('.roster-equipment-slot[data-hand="leftHand"]')?.click();
        setTimeout(() => {
          const pickerCards = [...document.querySelectorAll('.roster-weapon-picker .weapon-card')];
          const pickerCard = pickerCards.find(card => card.querySelector('.weapon-card-title')?.textContent?.trim() === title) || null;
          const pickerImage = pickerCard?.querySelector('.weapon-card-image') || null;
          const pickerAction = pickerCard?.querySelector('[data-roster-action="equip-weapon"]') || null;
          finish({
            status: 'tested',
            title,
            inventory,
            picker: describeImage(pickerImage),
            inventoryAction: inventoryAction.getAttribute('data-weapon-inventory-action') || '',
            pickerActionPresent: Boolean(pickerAction),
            pickerCardFound: Boolean(pickerCard)
          });
        }, 100);
      }, 80);
    }, 50);
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
  if (safePath === 'index.html') body = Buffer.from(body.toString('utf8').replace('</body>', `${probeScript}</body>`), 'utf8');
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
const browserProfile = mkdtempSync(join(tmpdir(), 'nobrainer-shared-weapon-card-images-'));
let child = null;
try {
  const address = server.address(); assert.ok(address && typeof address === 'object');
  const pageUrl = `http://127.0.0.1:${address.port}${basePath}`;
  child=spawn(browser,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--hide-scrollbars','--no-first-run','--no-default-browser-check',`--user-data-dir=${browserProfile}`,'--window-size=390,844','--virtual-time-budget=8000','--dump-dom',pageUrl],{stdio:['ignore','pipe','pipe']});
  child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
  let stdout = '', stderr = ''; child.stdout.on('data', chunk => { stdout += chunk; }); child.stderr.on('data', chunk => { stderr += chunk; });
  const code = await new Promise((resolveClose, rejectClose) => { child.once('error', rejectClose); child.once('close', resolveClose); });
  assert.equal(code, 0, `Chrome/Chromium beendete den gemeinsamen Waffenkarten-Browsertest mit Code ${code}.\n${stderr}`);
  const match = stdout.match(/<pre id="sharedWeaponCardResult">([^<]+)<\/pre>/);
  assert.ok(match, `Der gemeinsame Waffenkarten-Browsertest hat kein Ergebnis erzeugt.\n${stderr}\nDOM-Ausgabe: ${stdout.slice(-7000)}`);
  const result = JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&'));

  assert.equal(result.status, 'tested', JSON.stringify(result));
  assert.deepEqual(result.browserErrors, [], `Browserfehler: ${JSON.stringify(result)}`);
  assert.equal(result.runtimeError, '', `Runtimefehler: ${JSON.stringify(result)}`);
  assert.ok(result.title, 'Die geprüfte Waffe besitzt keinen Kartentitel.');
  assert.ok(result.inventory, 'Im Waffenlager fehlt das zentrale Waffenbild.');
  assert.equal(result.inventory.cssWidth, '64px');
  assert.equal(result.inventory.cssHeight, '64px');
  assert.ok(result.inventory.form, 'Das Waffenlagerbild besitzt keine technische Waffenform.');
  assert.ok(result.inventory.kind, 'Das Waffenlagerbild besitzt keinen Renderkind.');
  assert.ok(['equip', 'unequip'].includes(result.inventoryAction), 'Die bestehende Waffenlageraktion ging beim Bildumbau verloren.');
  assert.equal(result.pickerCardFound, true, 'Dieselbe Waffenkarte wurde im Kader-Waffenpicker nicht gefunden.');
  assert.ok(result.picker, 'Im Kader-Waffenpicker fehlt das zentrale Waffenbild.');
  assert.equal(result.picker.cssWidth, '64px');
  assert.equal(result.picker.cssHeight, '64px');
  assert.equal(result.picker.form, result.inventory.form, 'Waffenlager und Kader-Picker verwenden nicht dieselbe Waffenform.');
  assert.equal(result.picker.kind, result.inventory.kind, 'Waffenlager und Kader-Picker verwenden nicht denselben Renderplan.');
  assert.deepEqual(result.picker.layers, result.inventory.layers, 'Waffenlager und Kader-Picker rendern dieselbe Waffe unterschiedlich.');
  assert.equal(result.picker.genericColor, result.inventory.genericColor, 'Fallback-Darstellung unterscheidet sich zwischen Waffenlager und Kader-Picker.');
  assert.equal(result.pickerActionPresent, true, 'Die bestehende Ausrüsten-Aktion im Kader-Picker ging beim Bildumbau verloren.');

  console.log('Gemeinsame Waffenkarten-Browserregression: Waffenlager und Kader-Waffenpicker zeigen dieselbe 64x64-Waffe über den zentralen Materialbild-Renderer; bestehende Ausrüstungsaktionen bleiben erhalten.');
} finally {
  if (child) await stopBrowser(child);
  rmSync(browserProfile, { recursive: true, force: true });
  await new Promise(resolveClose => server.close(resolveClose));
}
