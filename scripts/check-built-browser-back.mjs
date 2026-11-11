import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, normalize, resolve } from 'node:path';

const distRoot = resolve('dist/nobrainer/browser');
const basePath = '/pj-nobrainer/';
const appVersion = JSON.parse(readFileSync('package.json', 'utf8')).version;
const escapedAppVersion = appVersion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
assert.ok(existsSync(join(distRoot, 'index.html')), 'Der gebaute Angular-Index fehlt.');

const browser = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].find(candidate => {
  const probe = spawnSync('which', [candidate], { encoding: 'utf8' });
  return probe.status === 0 && probe.stdout.trim();
});
assert.ok(browser, 'Chrome/Chromium wurde für den Spielstandtransfer-E2E-Test nicht gefunden.');

const errorScript = `<script>
window.__browserBackErrors=[];
window.addEventListener('error',event=>window.__browserBackErrors.push(String(event.error?.stack||event.message||event.error||'error')));
window.addEventListener('unhandledrejection',event=>window.__browserBackErrors.push(String(event.reason?.stack||event.reason||'rejection')));
</script>`;

const probeScript = `<script>
(() => {
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const page = () => document.querySelector('.page.active')?.id || '';
  const trace = [];
  const record = (name, result) => trace.push({ name, result, page:page(), state:window.history.state });
  const finish = result => {
    if (document.getElementById('browserBackE2EResult')) return;
    const node = document.createElement('pre');
    node.id = 'browserBackE2EResult';
    node.textContent = JSON.stringify({
      ...result, trace,
      runtimeError:document.querySelector('.legacy-host')?.getAttribute('data-runtime-error')||'',
      browserErrors:window.__browserBackErrors || []
    });
    document.body.append(node);
  };
  const waitUntil = async (predicate, label, maxMs=3000) => {
    const start = Date.now();
    while (Date.now() - start < maxMs) {
      if (predicate()) return;
      await sleep(40);
    }
    throw new Error('Timeout: '+label+' / page='+page());
  };
  const back = async (label, condition) => {
    window.history.back();
    await waitUntil(condition,label);
    record(label,true);
    await sleep(100);
  };
  const run = async () => {
    await waitUntil(()=>page()==='base' && !!document.querySelector('#nav button[data-page="storage"]')
      && !!document.getElementById('indexSaveTab'),'bootstrap');
    record('ready',true);
    document.querySelector('#nav button[data-page="storage"]').click();
    await waitUntil(()=>page()==='storage' && window.history.state?.__soeInGameBack===true,'storage navigation');
    record('storage guard',true);
    await back('storage to city',()=>page()==='base');
    if (window.history.state?.__soeInGameBack) throw new Error('Guard remained armed on city after browser back.');

    document.querySelector('.help-btn[aria-label="Hilfe"]').click();
    await waitUntil(()=>page()==='index' && window.history.state?.__soeInGameBack===true,'index guard');
    document.getElementById('indexSaveTab').click();
    await waitUntil(()=>document.getElementById('indexSaveTab').getAttribute('aria-selected')==='true','save tab');
    await back('save tab to info',()=>page()==='index'
      && document.getElementById('indexInfoTab').getAttribute('aria-selected')==='true');
    await waitUntil(()=>window.history.state?.__soeInGameBack===true,'index rearmed after first back');
    await back('index to city',()=>page()==='base');

    document.getElementById('questHeaderButton').click();
    await waitUntil(()=>Boolean(document.querySelector('#missionDialog[open]'))
      && window.history.state?.__soeInGameBack===true,'mission dialog guard');
    await back('mission dialog closed',()=>!document.querySelector('#missionDialog[open]'));
    if(page()!=='base') throw new Error('Mission dialog browser back switched main page.');

    // Auch die sichtbare Zurueck-Schaltflaeche muss den Guard abbauen.
    document.querySelector('#nav button[data-page="storage"]').click();
    await waitUntil(()=>page()==='storage' && window.history.state?.__soeInGameBack===true,'storage reopened');
    document.getElementById('backBtn').click();
    await waitUntil(()=>page()==='base' && !window.history.state?.__soeInGameBack,'UI back disarms history guard');
    record('visible back disarmed',true);
    finish({status:'checked'});
  };
  run().catch(error=>finish({status:'error',message:String(error?.stack||error)}));
})();
</script>`;\n\nconst contentTypes = new Map([
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


const delay = ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function stopBrowser(child) {
  if(child.exitCode !== null) return;
  child.kill('SIGTERM');
  const finished=await Promise.race([new Promise(resolve=>child.once('close',()=>resolve(true))),delay(1500).then(()=>false)]);
  if(!finished && child.exitCode===null) child.kill('SIGKILL');
}
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const profile=mkdtempSync(join(tmpdir(),'eldravar-browser-back-e2e-'));
let child=null;
try {
 const addr=server.address(); assert.ok(addr&&typeof addr==='object');
 child=spawn(browser,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
  '--hide-scrollbars','--no-first-run','--no-default-browser-check','--window-size=390,844',
  `--user-data-dir=${profile}`,'--virtual-time-budget=14500','--dump-dom',
  `http://127.0.0.1:${addr.port}${basePath}`],{stdio:['ignore','pipe','pipe']});
 child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
 let out='',err='';
 child.stdout.on('data',chunk=>out+=chunk);child.stderr.on('data',chunk=>err+=chunk);
 const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve);});
 assert.equal(code,0,'Browser-Probe fehlgeschlagen: '+err);
 const match=out.match(/<pre id="browserBackE2EResult">([^<]+)<\/pre>/);
 assert.ok(match,'Browser-Zuruecktest lieferte kein Ergebnis. '+err+' DOM:'+out.slice(-4000));
 const result=JSON.parse(match[1].replaceAll('&quot;','"').replaceAll('&amp;','&'));
 assert.equal(result.status,'checked','Browser-Zurueck fehlgeschlagen: '+JSON.stringify(result));
 assert.deepEqual(result.browserErrors,[],'JavaScript-Fehler in Browser-Zuruecktest.');
 assert.equal(result.runtimeError,'');
 assert.ok(result.trace.some(x=>x.name==='save tab to info'));
 assert.ok(result.trace.some(x=>x.name==='mission dialog closed'));
 console.log('Web-Browser-Zurueck: Unterseite, Info/Spielstand, Missionen und sichtbare Zuruecktaste geprueft.');
}finally{
 if(child)await stopBrowser(child);
 rmSync(profile,{recursive:true,force:true});
 await new Promise(resolve=>server.close(resolve));
}
