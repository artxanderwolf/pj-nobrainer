import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';

const distRoot = resolve('dist/nobrainer/browser');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const expectedVersion = packageJson.version;
const basePath = '/pj-nobrainer/';

assert.ok(existsSync(join(distRoot, 'index.html')), 'Das gebaute Angular-Artefakt fehlt: dist/nobrainer/browser/index.html');

const browserCandidates = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'];
const browser = browserCandidates.find(candidate => {
  const probe = spawnSync('which', [candidate], { encoding: 'utf8' });
  return probe.status === 0 && probe.stdout.trim();
});
assert.ok(browser, 'Für den Runtime-Smoke-Test wurde kein Chrome/Chromium auf dem CI-Runner gefunden.');

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

  response.writeHead(200, {
    'content-type': contentTypes.get(extname(filePath)) ?? 'application/octet-stream',
    'cache-control': 'no-store'
  });
  response.end(readFileSync(filePath));
});

await new Promise((resolveListen, rejectListen) => {
  server.once('error', rejectListen);
  server.listen(0, '127.0.0.1', resolveListen);
});

try {
  const address = server.address();
  assert.ok(address && typeof address === 'object', 'Der lokale Runtime-Smoke-Testserver konnte keinen Port bereitstellen.');
  const pageUrl = `http://127.0.0.1:${address.port}${basePath}`;
  const browserArgs = [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--hide-scrollbars',
    '--virtual-time-budget=3500',
    '--dump-dom',
    pageUrl
  ];

  const child = spawn(browser, browserArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', chunk => { stdout += chunk; });
  child.stderr.on('data', chunk => { stderr += chunk; });

  const result = await new Promise((resolveRun, rejectRun) => {
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      rejectRun(new Error('Der Browser-Runtime-Smoke-Test hat das Zeitlimit überschritten.'));
    }, 20_000);

    child.once('error', error => {
      clearTimeout(timeout);
      rejectRun(error);
    });
    child.once('close', code => {
      clearTimeout(timeout);
      resolveRun(code);
    });
  });

  assert.equal(result, 0, `Chrome/Chromium beendete den Runtime-Smoke-Test mit Code ${result}.\n${stderr}`);
  assert.doesNotMatch(
    stdout,
    /Die NoBrainer-Runtime konnte nicht geladen werden/,
    `Die gebaute Anwendung fiel beim Browserstart in den Runtime-Fehlerzustand.\n${stderr}`
  );
  assert.match(stdout, new RegExp(`Prototype v${expectedVersion.replaceAll('.', '\\.')}`), 'Die erwartete Versionsanzeige fehlt im gestarteten Build.');
  assert.match(stdout, /id="nav"/, 'Die Navigation wurde beim Browserstart nicht aufgebaut.');
  assert.match(stdout, /id="marketJobCard"/, 'Der Markt wurde beim Browserstart nicht aufgebaut.');
  assert.match(stdout, /id="dungeonRunCard"/, 'Der Dungeon wurde beim Browserstart nicht aufgebaut.');

  console.log(`Browser-Runtime-Smoke-Test: Prototype v${expectedVersion} startet aus dem finalen Angular-Build ohne Runtime-Fallback.`);
} finally {
  await new Promise(resolveClose => server.close(resolveClose));
}
