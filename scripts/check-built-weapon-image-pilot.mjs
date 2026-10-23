import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, normalize, resolve } from 'node:path';
import { getWeaponImageRenderPlan } from '../src/app/game/weapon-image-presentation-core.ts';
import { getWeaponImageMarkup } from '../src/app/game/weapon-image-markup-presentation.ts';

const distRoot = resolve('dist/nobrainer/browser');
const basePath = '/pj-nobrainer/';
assert.ok(existsSync(join(distRoot, 'index.html')), 'Der gebaute Angular-Index fehlt.');

const browser = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].find(candidate => {
  const probe = spawnSync('which', [candidate], { encoding: 'utf8' });
  return probe.status === 0 && probe.stdout.trim();
});
assert.ok(browser, 'Chrome/Chromium wurde für den Waffenbild-Pilottest nicht gefunden.');

const cases = [
  {
    id: 'dagger', label: 'Dolch', atlasName: 'dagger-mask-atlas-64',
    weapon: { weaponForm: 'dagger', slots: [
      { slot: 'workingPart', materialId: 5 }, { slot: 'back', materialId: 4 },
      { slot: 'gripCore', materialId: 2 }, { slot: 'gripWrap', materialId: 8 }
    ] },
    layers: ['workingPart', 'back', 'gripCore', 'gripWrap', 'outline'],
    positions: ['-128px', '-192px', '-256px', '-320px', '-64px'],
    colors: ['rgb(182, 106, 71)', 'rgb(154, 163, 176)', 'rgb(126, 88, 53)', 'rgb(155, 90, 50)', 'rgb(0, 0, 0)']
  },
  {
    id: 'sword', label: '1H-Schwert', atlasName: 'sword-mask-atlas-64',
    weapon: { weaponForm: 'sword', slots: [
      { slot: 'workingPart', materialId: 6 }, { slot: 'back', materialId: 5 },
      { slot: 'gripCore', materialId: 3 }, { slot: 'gripWrap', materialId: 7 },
      { slot: 'parry', materialId: 4 }
    ] },
    layers: ['workingPart', 'back', 'gripCore', 'gripWrap', 'parry', 'outline'],
    positions: ['-128px', '-192px', '-256px', '-320px', '-384px', '-64px'],
    colors: ['rgb(170, 182, 194)', 'rgb(182, 106, 71)', 'rgb(148, 96, 56)', 'rgb(125, 91, 67)', 'rgb(154, 163, 176)', 'rgb(0, 0, 0)']
  },
  {
    id: 'axe1h', label: '1H-Axt', atlasName: 'axe1h-mask-atlas-64',
    weapon: { weaponForm: 'axe1h', slots: [
      { slot: 'workingPart', materialId: 4 }, { slot: 'back', materialId: 5 },
      { slot: 'gripCore', materialId: 1 }, { slot: 'gripWrap', materialId: 9 }
    ] },
    layers: ['workingPart', 'back', 'gripCore', 'gripWrap', 'outline'],
    positions: ['-128px', '-192px', '-256px', '-320px', '-64px'],
    colors: ['rgb(154, 163, 176)', 'rgb(182, 106, 71)', 'rgb(106, 75, 49)', 'rgb(112, 83, 64)', 'rgb(0, 0, 0)']
  },
  {
    id: 'sword2h', label: '2H-Schwert', atlasName: 'sword2h-mask-atlas-64',
    weapon: { weaponForm: 'sword2h', slots: [
      { slot: 'workingPart', materialId: 6 }, { slot: 'back', materialId: 4 },
      { slot: 'gripCore', materialId: 3 }, { slot: 'gripWrap', materialId: 8 },
      { slot: 'parry', materialId: 5 }
    ] },
    layers: ['workingPart', 'back', 'gripCore', 'gripWrap', 'parry', 'outline'],
    positions: ['-128px', '-192px', '-256px', '-320px', '-384px', '-64px'],
    colors: ['rgb(170, 182, 194)', 'rgb(154, 163, 176)', 'rgb(148, 96, 56)', 'rgb(155, 90, 50)', 'rgb(182, 106, 71)', 'rgb(0, 0, 0)']
  },
  {
    id: 'axe2h', label: '2H-Axt', atlasName: 'axe2h-mask-atlas-64',
    weapon: { weaponForm: 'axe2h', slots: [
      { slot: 'workingPart', materialId: 5 }, { slot: 'back', materialId: 6 },
      { slot: 'gripCore', materialId: 2 }, { slot: 'gripWrap', materialId: 7 }
    ] },
    layers: ['workingPart', 'back', 'gripCore', 'gripWrap', 'outline'],
    positions: ['-128px', '-192px', '-256px', '-320px', '-64px'],
    colors: ['rgb(182, 106, 71)', 'rgb(170, 182, 194)', 'rgb(126, 88, 53)', 'rgb(125, 91, 67)', 'rgb(0, 0, 0)']
  },
  {
    id: 'bow', label: 'Bogen', atlasName: 'bow-mask-atlas-64',
    weapon: { weaponForm: 'bow', slots: [
      { slot: 'back', materialId: 3 }, { slot: 'gripCore', materialId: 2 },
      { slot: 'gripWrap', materialId: 9 }, { slot: 'bowstring', materialId: 7 }
    ] },
    layers: ['back', 'gripCore', 'gripWrap', 'bowstring', 'outline'],
    positions: ['-192px', '-256px', '-320px', '-448px', '-64px'],
    colors: ['rgb(148, 96, 56)', 'rgb(126, 88, 53)', 'rgb(112, 83, 64)', 'rgb(125, 91, 67)', 'rgb(0, 0, 0)']
  },
  {
    id: 'staff', label: 'Stab', atlasName: 'staff-mask-atlas-64',
    weapon: { weaponForm: 'staff', slots: [
      { slot: 'back', materialId: 3 }, { slot: 'gripCore', materialId: 1 },
      { slot: 'gripWrap', materialId: 8 }
    ] },
    layers: ['back', 'gripCore', 'gripWrap', 'outline'],
    positions: ['-192px', '-256px', '-320px', '-64px'],
    colors: ['rgb(148, 96, 56)', 'rgb(106, 75, 49)', 'rgb(155, 90, 50)', 'rgb(0, 0, 0)']
  }
];

const pilotMarkup = cases.map(entry => {
  const plan = getWeaponImageRenderPlan(entry.weapon);
  assert.equal(plan.kind, 'materials', `${entry.id}: Der Pilot benötigt einen vollständigen Material-Renderplan.`);
  return `<div data-weapon-image-pilot="${entry.id}">${getWeaponImageMarkup(plan, { ariaLabel: `${entry.label} Materialvorschau`, className: 'weapon-image-pilot' })}</div>`;
}).join('');

const expected = JSON.stringify(cases.map(({ id, atlasName, layers, positions, colors }) => ({ id, atlasName, layers, positions, colors })));
const probeScript = `<script>
window.__weaponImagePilotErrors=[];
window.addEventListener('error',event=>window.__weaponImagePilotErrors.push(String(event.error?.stack||event.message||event.error||'error')));
window.addEventListener('unhandledrejection',event=>window.__weaponImagePilotErrors.push(String(event.reason?.stack||event.reason||'rejection')));
(() => {
  const expected=${expected};
  const extractUrl=value=>{const match=String(value||'').match(/url\\(["']?(.*?)["']?\\)/);return match?match[1]:'';};
  const finish=async()=>{
    const results=[];
    for(const entry of expected){
      const root=document.querySelector('[data-weapon-image-pilot="'+entry.id+'"] .weapon-image');
      const rect=root?.getBoundingClientRect();
      const layers=[...(root?.querySelectorAll('.weapon-image-layer')||[])].map(node=>{
        const style=getComputedStyle(node);
        const maskImage=style.maskImage&&style.maskImage!=='none'?style.maskImage:style.webkitMaskImage;
        const maskPosition=style.maskPosition&&style.maskPosition!=='0% 0%'?style.maskPosition:style.webkitMaskPosition;
        const maskSize=style.maskSize&&style.maskSize!=='auto'?style.maskSize:style.webkitMaskSize;
        return { name:node.getAttribute('data-weapon-image-layer')||'', color:style.backgroundColor, maskImage, maskPosition, maskSize };
      });
      const urls=[...new Set(layers.map(layer=>extractUrl(layer.maskImage)).filter(Boolean))];
      const assets=[];
      for(const url of urls){
        const response=await fetch(url,{cache:'no-store'});
        const bytes=await response.arrayBuffer();
        assets.push({url,status:response.status,type:response.headers.get('content-type')||'',size:bytes.byteLength});
      }
      results.push({
        id:entry.id, width:rect?.width||0, height:rect?.height||0,
        form:root?.getAttribute('data-weapon-form')||'', kind:root?.getAttribute('data-weapon-image-kind')||'',
        role:root?.getAttribute('role')||'', aria:root?.getAttribute('aria-label')||'', layers, assets
      });
    }
    const node=document.createElement('pre'); node.id='weaponImagePilotResult';
    node.textContent=JSON.stringify({support:CSS.supports('mask-image','url("x")')||CSS.supports('-webkit-mask-image','url("x")'),browserErrors:window.__weaponImagePilotErrors,results});
    document.body.appendChild(node);
  };
  const layoutStarted=Date.now();
  const waitForLayout=()=>{
    const ready=expected.every(entry=>{
      const root=document.querySelector('[data-weapon-image-pilot="'+entry.id+'"] .weapon-image');
      const rect=root?.getBoundingClientRect();
      return rect?.width===64&&rect?.height===64;
    });
    if(ready||Date.now()-layoutStarted>2000){finish();return;}
    setTimeout(waitForLayout,50);
  };
  requestAnimationFrame(()=>requestAnimationFrame(()=>waitForLayout()));
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
    body = Buffer.from(body.toString('utf8').replace('</body>', `<div id="weaponImagePilot" style="position:fixed;left:0;top:0;z-index:99999;background:#fff">${pilotMarkup}</div>${probeScript}</body>`), 'utf8');
  }
  response.writeHead(200, { 'content-type': contentTypes.get(extname(filePath)) ?? 'application/octet-stream', 'cache-control':'no-store' });
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
const browserProfile = mkdtempSync(join(tmpdir(), 'nobrainer-weapon-image-pilot-'));
let child = null;
try {
  const address = server.address(); assert.ok(address && typeof address === 'object');
  const pageUrl = `http://127.0.0.1:${address.port}${basePath}`;
  child = spawn(browser, ['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--hide-scrollbars','--no-first-run','--no-default-browser-check',`--user-data-dir=${browserProfile}`,'--virtual-time-budget=7000','--dump-dom',pageUrl], { stdio: ['ignore','pipe','pipe'] });
  child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
  let stdout = '', stderr = ''; child.stdout.on('data', chunk => { stdout += chunk; }); child.stderr.on('data', chunk => { stderr += chunk; });
  const code = await new Promise((resolveClose, rejectClose) => { child.once('error', rejectClose); child.once('close', resolveClose); });
  assert.equal(code, 0, `Chrome/Chromium beendete den Waffenbild-Pilottest mit Code ${code}.\n${stderr}`);
  const match = stdout.match(/<pre id="weaponImagePilotResult">([^<]+)<\/pre>/);
  assert.ok(match, `Der Waffenbild-Pilottest hat kein Ergebnis erzeugt.\n${stderr}\nDOM-Ausgabe: ${stdout.slice(-7000)}`);
  const result = JSON.parse(match[1].replaceAll('&quot;', '"').replaceAll('&amp;', '&'));
  assert.equal(result.support, true, 'Der Browser meldet keine CSS-Masken-Unterstützung.');
  assert.deepEqual(result.browserErrors, [], `Browserfehler: ${JSON.stringify(result.browserErrors)}`);

  for (const expectedCase of cases) {
    const actual = result.results.find(entry => entry.id === expectedCase.id);
    assert.ok(actual, `${expectedCase.id}: Browserergebnis fehlt.`);
    assert.equal(actual.width, 64); assert.equal(actual.height, 64);
    assert.equal(actual.form, expectedCase.id); assert.equal(actual.kind, 'materials');
    assert.equal(actual.role, 'img'); assert.ok(actual.aria);
    assert.deepEqual(actual.layers.map(layer => layer.name), expectedCase.layers, `${expectedCase.id}: Layerreihenfolge falsch.`);
    assert.deepEqual(actual.layers.map(layer => layer.color), expectedCase.colors, `${expectedCase.id}: Materialfarben falsch.`);
    actual.layers.forEach((layer, index) => {
      assert.ok(layer.maskImage && layer.maskImage !== 'none', `${expectedCase.id}/${layer.name}: Maske fehlt.`);
      assert.match(layer.maskImage, new RegExp(expectedCase.atlasName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${expectedCase.id}/${layer.name}: falscher Atlas.`);
      assert.ok(String(layer.maskPosition).startsWith(expectedCase.positions[index]), `${expectedCase.id}/${layer.name}: falsche Maskenposition ${layer.maskPosition}.`);
      assert.equal(layer.maskSize, '512px 64px', `${expectedCase.id}/${layer.name}: falsche Maskengröße.`);
    });
    assert.equal(actual.assets.length, 1, `${expectedCase.id}: Es sollte genau ein Atlas geladen werden.`);
    assert.equal(actual.assets[0].status, 200, `${expectedCase.id}: Atlas wurde nicht erfolgreich geladen.`);
    assert.match(actual.assets[0].type, /^image\/png/);
    assert.ok(actual.assets[0].size > 1000, `${expectedCase.id}: Atlas ist unerwartet klein.`);
  }

  console.log('Waffenbild-Browserregression: Alle sieben Waffenformen rendern im echten Angular-Build mit korrekten Materialfarben, Slot-Layern, Maskenpositionen und geladenen PNG-Atlanten.');
} finally {
  if (child) await stopBrowser(child);
  rmSync(browserProfile, { recursive: true, force: true });
  await new Promise(resolveClose => server.close(resolveClose));
}
