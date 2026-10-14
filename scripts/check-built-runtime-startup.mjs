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
assert.equal(typeof WebSocket, 'function', 'Die Node-Laufzeit stellt für den Browser-Smoke-Test kein WebSocket bereit.');

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

function delay(ms) {
  return new Promise(resolveDelay => setTimeout(resolveDelay, ms));
}

async function listenOnFreePort(testServer) {
  await new Promise((resolveListen, rejectListen) => {
    testServer.once('error', rejectListen);
    testServer.listen(0, '127.0.0.1', resolveListen);
  });
  const address = testServer.address();
  assert.ok(address && typeof address === 'object', 'Ein freier Port konnte nicht bereitgestellt werden.');
  return address.port;
}

async function reserveFreePort() {
  const probe = createServer();
  const port = await listenOnFreePort(probe);
  await new Promise(resolveClose => probe.close(resolveClose));
  return port;
}

async function waitForPageTarget(debugPort, child, stderr) {
  const endpoint = `http://127.0.0.1:${debugPort}/json/list`;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`Chrome/Chromium wurde vor dem Runtime-Smoke-Test beendet (Code ${child.exitCode}).\n${stderr()}`);
    }
    try {
      const response = await fetch(endpoint, { cache: 'no-store' });
      if (response.ok) {
        const targets = await response.json();
        const target = targets.find(entry => entry.type === 'page' && entry.webSocketDebuggerUrl);
        if (target) return target;
      }
    } catch {}
    await delay(125);
  }
  throw new Error(`Chrome-DevTools-Ziel wurde nicht rechtzeitig verfügbar.\n${stderr()}`);
}

function evaluateInPage(webSocketDebuggerUrl, expression) {
  return new Promise((resolveEvaluation, rejectEvaluation) => {
    const socket = new WebSocket(webSocketDebuggerUrl);
    const requestId = 1;
    const timeout = setTimeout(() => {
      socket.close();
      rejectEvaluation(new Error('Chrome-DevTools-Auswertung hat das Zeitlimit überschritten.'));
    }, 5000);

    const cleanup = () => clearTimeout(timeout);
    socket.addEventListener('error', () => {
      cleanup();
      rejectEvaluation(new Error('Chrome-DevTools-WebSocket konnte nicht geöffnet werden.'));
    }, { once: true });
    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({
        id: requestId,
        method: 'Runtime.evaluate',
        params: { expression, returnByValue: true, awaitPromise: true }
      }));
    }, { once: true });
    socket.addEventListener('message', event => {
      const message = JSON.parse(String(event.data));
      if (message.id !== requestId) return;
      cleanup();
      socket.close();
      if (message.error) {
        rejectEvaluation(new Error(`Chrome-DevTools-Auswertung fehlgeschlagen: ${JSON.stringify(message.error)}`));
        return;
      }
      if (message.result?.exceptionDetails) {
        rejectEvaluation(new Error(`JavaScript-Auswertung im Browser schlug fehl: ${message.result.exceptionDetails.text ?? 'unbekannt'}`));
        return;
      }
      resolveEvaluation(message.result?.result?.value);
    });
  });
}

async function stopBrowser(child) {
  if (child.exitCode !== null) return;
  child.kill('SIGTERM');
  const closed = await Promise.race([
    new Promise(resolveClose => child.once('close', () => resolveClose(true))),
    delay(2000).then(() => false)
  ]);
  if (!closed && child.exitCode === null) child.kill('SIGKILL');
}

const serverPort = await listenOnFreePort(server);
let child = null;
let stderr = '';

try {
  const pageUrl = `http://127.0.0.1:${serverPort}${basePath}`;
  const debugPort = await reserveFreePort();
  const browserArgs = [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--hide-scrollbars',
    `--remote-debugging-port=${debugPort}`,
    pageUrl
  ];

  child = spawn(browser, browserArgs, { stdio: ['ignore', 'ignore', 'pipe'] });
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', chunk => { stderr += chunk; });

  const target = await waitForPageTarget(debugPort, child, () => stderr);
  const expression = `(() => ({
    bodyText: document.body?.innerText ?? '',
    version: document.querySelector('.brand small')?.textContent ?? '',
    nav: Boolean(document.getElementById('nav')),
    market: Boolean(document.getElementById('marketJobCard')),
    dungeon: Boolean(document.getElementById('dungeonRunCard')),
    readyState: document.readyState
  }))()`;

  let snapshot = null;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    snapshot = await evaluateInPage(target.webSocketDebuggerUrl, expression);
    assert.ok(snapshot && typeof snapshot === 'object', 'Der gestartete Browser lieferte keinen auswertbaren DOM-Zustand.');
    assert.doesNotMatch(
      snapshot.bodyText,
      /Die NoBrainer-Runtime konnte nicht geladen werden/,
      `Die gebaute Anwendung fiel beim Browserstart in den Runtime-Fehlerzustand.\n${stderr}`
    );
    if (
      snapshot.version === `Prototype v${expectedVersion}` &&
      snapshot.nav &&
      snapshot.market &&
      snapshot.dungeon
    ) break;
    await delay(200);
  }

  assert.equal(snapshot.version, `Prototype v${expectedVersion}`, 'Die erwartete Versionsanzeige fehlt im gestarteten Build.');
  assert.equal(snapshot.nav, true, 'Die Navigation wurde beim Browserstart nicht aufgebaut.');
  assert.equal(snapshot.market, true, 'Der Markt wurde beim Browserstart nicht aufgebaut.');
  assert.equal(snapshot.dungeon, true, 'Der Dungeon wurde beim Browserstart nicht aufgebaut.');

  console.log(`Browser-Runtime-Smoke-Test: Prototype v${expectedVersion} startet aus dem finalen Angular-Build ohne Runtime-Fallback.`);
} finally {
  if (child) await stopBrowser(child);
  await new Promise(resolveClose => server.close(resolveClose));
}
